import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { target_id, batch = false, limit = 3 } = body

    let query = supabase
      .from('local_seo_targets')
      .select('*')
      .eq('status', 'approved')
      .eq('html_generated', false)
      .order('priority', { ascending: false })
      .limit(limit)

    if (target_id) {
      query = supabase
        .from('local_seo_targets')
        .select('*')
        .eq('id', target_id)
        .limit(1)
    }

    const { data: targets, error } = await query
    if (error) throw new Error(`Failed to fetch targets: ${error.message}`)
    if (!targets || targets.length === 0) {
      return new Response(JSON.stringify({ generated: 0, targets: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured')

    // Fetch company profile
    const { data: company } = await supabase
      .from('company_profile')
      .select('company_name, company_description, contact_phone, website_url, google_aggregate_rating')
      .limit(1)
      .single()

    // Fetch top reviews
    const { data: topReviews } = await supabase
      .from('raw_reviews')
      .select('author_name, rating, review_text')
      .not('review_text', 'is', null)
      .order('rating', { ascending: false })
      .limit(3)

    const reviewsText = (topReviews || [])
      .map((r: any) => `- ${r.author_name} (${r.rating}★): "${r.review_text?.substring(0, 200)}"`)
      .join('\n')

    const results: any[] = []

    for (const target of targets) {
      // Fetch related products
      const { data: products } = await supabase
        .from('products_repository')
        .select('name, description, price, image_url, product_url')
        .eq('category', target.category_name)
        .eq('approved', true)
        .limit(3)

      const productsText = (products || [])
        .map((p: any) => `- ${p.name}: ${p.description?.substring(0, 150)} | R$${p.price} | ${p.product_url || ''}`)
        .join('\n')

      const prompt = `Gere HTML completo de landing page SEO para venda online de ${target.category_name || 'equipamentos odontológicos'} para ${target.specialty} em ${target.city || ''}/${target.state_uf}.
EMPRESA: ${company?.company_name || 'Smart Dent'} — tecnologia odontológica digital, vende online para todo Brasil.
NÃO há loja física. FOCO: entrega rápida nacional, suporte técnico, autoridade técnica.
KEYWORD PRINCIPAL: ${target.focus_keyword || target.specialty}
PRODUTO: ${target.product_name || target.category_name}
ESPECIALIDADE ALVO: ${target.specialty}
TELEFONE: ${company?.contact_phone || ''}
SITE: ${company?.website_url || 'https://smartdent.com.br'}

PRODUTOS DISPONÍVEIS:
${productsText || 'Sem produtos cadastrados'}

DEPOIMENTOS:
${reviewsText || 'Sem depoimentos'}

Estrutura obrigatória:
- <head> com title='${target.page_title || target.focus_keyword}', meta description='${target.meta_description || ''}', canonical
- Schema.org: Product + Offer com shippingDetails para ${target.state_uf} + AggregateRating ratingValue=4.8 reviewCount=30
- <h1>: ${target.h1_text || target.focus_keyword}
- Seção hero: headline impactante para ${target.specialty}, subtítulo mencionando entrega em ${target.state_uf}
- Seção 'Por que a Smart Dent': 3 diferenciais (suporte técnico especializado, entrega rápida, treinamento incluso)
- Seção produtos: cards dos produtos fornecidos com benefícios técnicos
- Seção depoimentos: usar os depoimentos fornecidos
- Seção FAQ: 5 perguntas específicas para ${target.specialty} sobre ${target.category_name}
- CTA final com WhatsApp link
- Design: Tailwind CSS via CDN, cores #0ea5e9 (azul) e #1e293b (dark), mobile-first
- NÃO incluir Google Maps embed (sem loja física)
- SIM incluir: número WhatsApp, link para site principal
Retorne APENAS o HTML completo, sem markdown.`

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
          console.error('AI Gateway error for target:', target.id, aiRes.status, await aiRes.text())
          continue
        }

        const aiData = await aiRes.json()
        let html = aiData?.choices?.[0]?.message?.content
        if (!html) {
          console.error('Empty Gemini response for target:', target.id)
          continue
        }

        // Remove markdown code fences if present
        html = html.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim()

        await supabase
          .from('local_seo_targets')
          .update({
            html_content: html,
            html_generated: true,
            last_refreshed: new Date().toISOString(),
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', target.id)

        results.push({
          id: target.id,
          page_slug: target.page_slug,
          state_uf: target.state_uf,
          city: target.city,
          specialty: target.specialty,
        })
      } catch (err) {
        console.error('Gemini error for target:', target.id, err)
      }
    }

    return new Response(JSON.stringify({ generated: results.length, targets: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-local-seo-page error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
