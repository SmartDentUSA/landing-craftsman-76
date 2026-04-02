import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getValidGoogleToken } from '../_shared/google-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { mode = 'generate', limit = 10, review_id } = body

    if (mode === 'generate' || mode === 'batch') {
      const result = await generateResponses(supabase, limit, review_id)
      if (mode === 'batch') {
        const postResult = await postResponses(supabase, 5)
        return new Response(JSON.stringify({ ...result, post_result: postResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (mode === 'post') {
      const result = await postResponses(supabase, limit)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('respond-review-ai error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateResponses(supabase: any, limit: number, reviewId?: string) {
  // Find reviews without responses
  let query = supabase
    .from('raw_reviews')
    .select('id, author_name, rating, review_text')
    .is('response_from_owner', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (reviewId) {
    query = query.eq('id', reviewId)
  }

  const { data: reviews, error: reviewsError } = await query

  if (reviewsError) throw new Error(`Failed to fetch reviews: ${reviewsError.message}`)
  if (!reviews || reviews.length === 0) return { generated: 0, responses: [] }

  // Filter out reviews that already have responses
  const reviewIds = reviews.map((r: any) => r.id)
  const { data: existingResponses } = await supabase
    .from('review_responses')
    .select('raw_review_id')
    .in('raw_review_id', reviewIds)
    .in('status', ['pending', 'posted'])

  const existingIds = new Set((existingResponses || []).map((r: any) => r.raw_review_id))
  const newReviews = reviews.filter((r: any) => !existingIds.has(r.id))

  if (newReviews.length === 0) return { generated: 0, responses: [] }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured')

  const responses: any[] = []

  for (const review of newReviews) {
    const prompt = `Você é o atendimento da Smart Dent, empresa de tecnologia odontológica.
Escreva uma resposta profissional, calorosa e em português para esta avaliação Google:
Autor: ${review.author_name} | Nota: ${review.rating}/5 | Texto: ${review.review_text || 'Sem texto'}
Regras: máximo 150 palavras, mencione o nome do autor, agradeça especificamente,
se nota < 4 demonstre empatia e ofereça solução, NÃO mencione preços nem concorrentes,
termine convidando para contato via WhatsApp.`

    try {
      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })

      if (!aiRes.ok) {
        console.error('AI Gateway error:', aiRes.status, await aiRes.text())
        continue
      }

      const aiData = await aiRes.json()
      const responseText = aiData?.choices?.[0]?.message?.content

      if (!responseText) {
        console.error('Empty Gemini response for review:', review.id)
        continue
      }

      const { data: inserted, error: insertError } = await supabase
        .from('review_responses')
        .insert({
          raw_review_id: review.id,
          author_name: review.author_name,
          original_rating: review.rating,
          original_text: review.review_text,
          response_text: responseText.trim(),
          ai_model: 'gemini-2.5-flash',
          status: 'pending',
        })
        .select('id, author_name, response_text')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        continue
      }

      responses.push(inserted)
    } catch (err) {
      console.error('Gemini call error for review:', review.id, err)
    }
  }

  return { generated: responses.length, responses }
}

async function postResponses(supabase: any, limit: number) {
  const { data: pending, error } = await supabase
    .from('review_responses')
    .select('id, raw_review_id, response_text')
    .eq('status', 'pending')
    .limit(limit)

  if (error) throw new Error(`Failed to fetch pending responses: ${error.message}`)
  if (!pending || pending.length === 0) return { posted: 0, failed: 0 }

  const token = await getValidGoogleToken(supabase, 'business')
  if (!token) {
    // Mark all as failed
    for (const resp of pending) {
      await supabase
        .from('review_responses')
        .update({ status: 'failed', error_message: 'OAuth não configurado' })
        .eq('id', resp.id)
    }
    return { posted: 0, failed: pending.length, error: 'OAuth não configurado' }
  }

  const accountId = Deno.env.get('GOOGLE_BUSINESS_ACCOUNT_ID')
  const locationId = Deno.env.get('GOOGLE_BUSINESS_LOCATION_ID')

  if (!accountId || !locationId) {
    throw new Error('GOOGLE_BUSINESS_ACCOUNT_ID ou GOOGLE_BUSINESS_LOCATION_ID não configurados')
  }

  let posted = 0
  let failed = 0

  for (const resp of pending) {
    // Get place_id / review name from raw_reviews
    const { data: rawReview } = await supabase
      .from('raw_reviews')
      .select('place_id, id')
      .eq('id', resp.raw_review_id)
      .single()

    if (!rawReview) {
      await supabase
        .from('review_responses')
        .update({ status: 'failed', error_message: 'Review original não encontrada' })
        .eq('id', resp.id)
      failed++
      continue
    }

    try {
      const replyRes = await fetch(
        `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${rawReview.place_id}/reply`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment: resp.response_text }),
        }
      )

      if (replyRes.ok) {
        await supabase
          .from('review_responses')
          .update({ status: 'posted', posted_at: new Date().toISOString() })
          .eq('id', resp.id)
        posted++
      } else {
        const errBody = await replyRes.text()
        await supabase
          .from('review_responses')
          .update({ status: 'failed', error_message: errBody.substring(0, 500) })
          .eq('id', resp.id)
        failed++
      }
    } catch (err) {
      await supabase
        .from('review_responses')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', resp.id)
      failed++
    }
  }

  return { posted, failed }
}
