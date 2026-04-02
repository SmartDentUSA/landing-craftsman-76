import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getValidGoogleToken } from '../_shared/google-auth.ts'
import { mapProductToContext, buildFullPrompt } from '../_shared/clinical-brain-guard.ts'

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
    const { mode = 'generate', video_id, limit = 5 } = body

    let result: any = {}

    if (mode === 'generate' || mode === 'both') {
      result.generate = await generateMetadata(supabase, limit, video_id)
    }

    if (mode === 'update' || mode === 'both') {
      result.update = await updateMetadata(supabase, limit)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('update-youtube-metadata error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateMetadata(supabase: any, limit: number, videoId?: string) {
  let query = supabase
    .from('youtube_metadata_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(limit)

  if (videoId) {
    query = query.eq('video_id', videoId)
  }

  const { data: items, error } = await query
  if (error) throw new Error(`Failed to fetch queue: ${error.message}`)
  if (!items || items.length === 0) return { processed: 0, items: [] }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured')

  const processed: any[] = []

  for (const item of items) {
    if (!item.product_id && !item.product_name) {
      console.error('[YT] Skipping video', item.video_id, '— no product linked')
      await supabase
        .from('youtube_metadata_queue')
        .update({
          status: 'error',
          error_message: 'product_id ausente — vincule um produto antes de gerar metadados',
        })
        .eq('id', item.id)
      continue
    }

    let productContext = null
    if (item.product_id) {
      const { data: prod } = await supabase
        .from('products_repository')
        .select('name, category, price, description, benefits, features, keywords, technical_specifications, sales_pitch, target_audience, impact_metrics, clinical_brain')
        .eq('id', item.product_id)
        .single()
      if (prod) productContext = mapProductToContext(prod)
    }

    const ytPrompt = `Otimize os metadados deste vídeo odontológico para YouTube SEO em português:
Título atual: ${item.current_title || 'Não informado'}
Descrição atual: ${item.current_description || 'Não informada'}
Tags atuais: ${(item.current_tags || []).join(', ') || 'Nenhuma'}

Retorne APENAS um JSON válido (sem markdown) com:
{
  "title": "título otimizado (máx 100 chars)",
  "description": "descrição otimizada (máx 5000 chars, inclua timestamps se possível, links da empresa, hashtags odontológicas)",
  "tags": ["array de 15 strings, mix PT+EN"],
  "chapters": "00:00 Introdução\\n02:30 ... (se identificar seções)"
}`

    const prompt = productContext
      ? buildFullPrompt(productContext, ytPrompt)
      : ytPrompt

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
        console.error('AI Gateway error for video:', item.video_id, aiRes.status, await aiRes.text())
        continue
      }

      const aiData = await aiRes.json()
      const rawText = aiData?.choices?.[0]?.message?.content
      if (!rawText) continue

      const jsonStr = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(jsonStr)

      await supabase
        .from('youtube_metadata_queue')
        .update({
          suggested_title: parsed.title,
          suggested_description: parsed.description,
          suggested_tags: parsed.tags,
          suggested_chapters: parsed.chapters,
          ai_model: 'gemini-2.5-flash',
          status: 'pending',
        })
        .eq('id', item.id)

      processed.push({ video_id: item.video_id, suggested_title: parsed.title })
    } catch (err) {
      console.error('Gemini error for video:', item.video_id, err)
    }
  }

  return { processed: processed.length, items: processed }
}

async function updateMetadata(supabase: any, limit: number) {
  const { data: items, error } = await supabase
    .from('youtube_metadata_queue')
    .select('*')
    .eq('status', 'approved')
    .limit(limit)

  if (error) throw new Error(`Failed to fetch approved items: ${error.message}`)
  if (!items || items.length === 0) return { updated: 0, failed: 0 }

  // Use unified token resolver
  const token = await getValidGoogleToken(supabase, 'youtube')
  if (!token) {
    console.error('[YT] No valid YouTube token found')
    for (const item of items) {
      await supabase
        .from('youtube_metadata_queue')
        .update({ status: 'failed', error_message: 'YouTube OAuth não configurado — reconecte via Configurações' })
        .eq('id', item.id)
    }
    return { updated: 0, failed: items.length, error: 'OAuth não configurado' }
  }

  let updated = 0
  let failed = 0

  for (const item of items) {
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: item.video_id,
            snippet: {
              title: item.suggested_title,
              description: item.suggested_description,
              tags: item.suggested_tags,
              categoryId: '22',
            },
          }),
        }
      )

      if (ytRes.ok) {
        await supabase
          .from('youtube_metadata_queue')
          .update({ status: 'done', processed_at: new Date().toISOString() })
          .eq('id', item.id)
        updated++
      } else {
        const errBody = await ytRes.text()
        await supabase
          .from('youtube_metadata_queue')
          .update({ status: 'failed', error_message: errBody.substring(0, 500) })
          .eq('id', item.id)
        failed++
      }
    } catch (err) {
      await supabase
        .from('youtube_metadata_queue')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', item.id)
      failed++
    }
  }

  return { updated, failed }
}
