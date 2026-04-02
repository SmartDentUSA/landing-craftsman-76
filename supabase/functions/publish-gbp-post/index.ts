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
    const {
      source_type = 'manual',
      source_id,
      title,
      summary,
      cta_type = 'LEARN_MORE',
      cta_url,
      image_url,
      post_type = 'STANDARD',
      schedule_for,
    } = body

    if (!summary || summary.length === 0) {
      return new Response(JSON.stringify({ error: 'summary é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (summary.length > 1500) {
      return new Response(JSON.stringify({ error: 'summary deve ter no máximo 1500 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If scheduled for future, just save
    if (schedule_for && new Date(schedule_for) > new Date()) {
      const { data: logEntry, error: logError } = await supabase
        .from('gbp_posts_log')
        .insert({
          post_type,
          source_type,
          source_id,
          title,
          summary,
          cta_type: cta_url ? cta_type : null,
          cta_url,
          image_url,
          status: 'scheduled',
          scheduled_for: schedule_for,
        })
        .select('id')
        .single()

      if (logError) throw new Error(`Failed to save scheduled post: ${logError.message}`)

      return new Response(JSON.stringify({ success: true, scheduled: true, log_id: logEntry.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Publish now
    const token = await getValidGoogleToken(supabase, 'business')
    if (!token) {
      const { data: logEntry } = await supabase
        .from('gbp_posts_log')
        .insert({
          post_type, source_type, source_id, title, summary,
          cta_type: cta_url ? cta_type : null, cta_url, image_url,
          status: 'failed', error_message: 'OAuth não configurado',
        })
        .select('id')
        .single()

      return new Response(JSON.stringify({ success: false, error: 'OAuth não configurado', log_id: logEntry?.id }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accountId = Deno.env.get('GOOGLE_BUSINESS_ACCOUNT_ID')
    const locationId = Deno.env.get('GOOGLE_BUSINESS_LOCATION_ID')

    if (!accountId || !locationId) {
      throw new Error('GOOGLE_BUSINESS_ACCOUNT_ID ou GOOGLE_BUSINESS_LOCATION_ID não configurados')
    }

    const payload: any = {
      languageCode: 'pt-BR',
      summary,
      topicType: post_type,
    }

    if (cta_url) {
      payload.callToAction = { actionType: cta_type, url: cta_url }
    }

    if (image_url) {
      payload.media = [{ mediaFormat: 'PHOTO', sourceUrl: image_url }]
    }

    const postRes = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (postRes.ok) {
      const postData = await postRes.json()
      const { data: logEntry } = await supabase
        .from('gbp_posts_log')
        .insert({
          post_type, source_type, source_id, title, summary,
          cta_type: cta_url ? cta_type : null, cta_url, image_url,
          google_post_id: postData.name,
          status: 'published', published_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      return new Response(JSON.stringify({
        success: true,
        post_id: postData.name,
        log_id: logEntry?.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      const errBody = await postRes.text()
      const { data: logEntry } = await supabase
        .from('gbp_posts_log')
        .insert({
          post_type, source_type, source_id, title, summary,
          cta_type: cta_url ? cta_type : null, cta_url, image_url,
          status: 'failed', error_message: errBody.substring(0, 500),
        })
        .select('id')
        .single()

      return new Response(JSON.stringify({
        success: false,
        error: errBody.substring(0, 500),
        log_id: logEntry?.id,
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('publish-gbp-post error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
