import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { injectClinicalBrainGuard, mapProductToContext } from '../_shared/clinical-brain-guard.ts'

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

    const { data: company } = await supabase
      .from('company_profile')
      .select('company_name, company_description, company_logo_url, contact_phone, contact_email, website_url, google_aggregate_rating, differentiators, delivery_approach, target_audience, brand_values, social_media_links, instagram_profile, youtube_channel, city, state, street_address')
      .limit(1)
      .single()

    const { data: topReviews } = await supabase
      .from('raw_reviews')
      .select('author_name, rating, review_text')
      .not('review_text', 'is', null)
      .gte('rating', 4)
      .order('rating', { ascending: false })
      .limit(5)

    const results: any[] = []

    for (const target of targets) {
      const categoryKeyword = extractCategoryKeyword(target.category_name || '')
      
      let products: any[] = []
      if (categoryKeyword) {
        const { data: fuzzyProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, promo_price, image_url, product_url, technical_specifications, benefits, features, sales_pitch, keywords, target_audience, slug')
          .eq('approved', true)
          .ilike('category', `%${categoryKeyword}%`)
          .limit(5)
        products = fuzzyProducts || []
      }

      if (products.length === 0 && target.product_name) {
        const { data: nameProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, promo_price, image_url, product_url, technical_specifications, benefits, features, sales_pitch, keywords, target_audience, slug')
          .eq('approved', true)
          .ilike('name', `%${target.product_name.split(' ')[0]}%`)
          .limit(5)
        products = nameProducts || []
      }

      // Build branded HTML template with product cards
      const productCardsHtml = buildProductCards(products, company?.website_url || 'https://smartdent.com.br')
      const reviewsHtml = buildReviewsSection(topReviews || [])
      const logoUrl = company?.company_logo_url || 'https://smartdent.com.br/logo.png'
      const companyName = company?.company_name || 'Smart Dent'
      const phone = company?.contact_phone || '(16) 99383-1794'
      const whatsappLink = `https://wa.me/5516993831794?text=Olá! Vi a página sobre ${target.category_name || 'equipamentos'} para ${target.specialty} e gostaria de mais informações.`
      const instagram = company?.instagram_profile || 'https://www.instagram.com/smartdentoficial/'
      const youtube = company?.youtube_channel || 'https://www.youtube.com/@smartdentcadcam'
      const siteUrl = company?.website_url || 'https://smartdent.com.br'

      // Build context for Clinical Brain Guard
      const firstProduct = products[0] ? mapProductToContext(products[0]) : {
        name: target.product_name || target.category_name || 'Equipamento odontológico',
        category: target.category_name || '',
      }

      const prompt = `Gere APENAS os textos em JSON para preencher um template HTML fixo de landing page SEO.
O template já está pronto com header SmartDent, cards de produto, reviews e CTA.
Você deve gerar APENAS o conteúdo textual.

CONTEXTO:
- Empresa: ${companyName} — tecnologia odontológica digital, vende online para todo Brasil
- Categoria: ${target.category_name || 'equipamentos odontológicos'}
- Especialidade alvo: ${target.specialty}
- Cidade/UF: ${target.city || 'Todo Brasil'}/${target.state_uf}
- Keyword principal: ${target.focus_keyword || target.specialty}
- Diferenciais: ${company?.differentiators || 'Suporte técnico, treinamento, entrega rápida'}
- Produtos disponíveis: ${products.map(p => p.name).join(', ') || 'Nenhum específico'}

REGRAS:
- NUNCA inventar nomes de produtos, preços ou especificações
- NUNCA citar marcas concorrentes
- Texto profissional, focado em ${target.specialty}
- Mencionar entrega para ${target.state_uf} quando relevante

Retorne APENAS um JSON válido (sem markdown):
{
  "hero_headline": "Headline principal (máx 80 chars, incluir ${target.specialty})",
  "hero_subheadline": "Subtítulo (máx 150 chars, mencionar ${target.city || target.state_uf})",
  "hero_cta": "Texto do botão CTA (máx 30 chars)",
  "differentials": [
    { "title": "Diferencial 1", "description": "Descrição curta (máx 80 chars)" },
    { "title": "Diferencial 2", "description": "Descrição curta" },
    { "title": "Diferencial 3", "description": "Descrição curta" }
  ],
  "faq": [
    { "question": "Pergunta relevante para ${target.specialty}?", "answer": "Resposta informativa (máx 150 chars)" },
    { "question": "Pergunta 2?", "answer": "Resposta 2" },
    { "question": "Pergunta 3?", "answer": "Resposta 3" },
    { "question": "Pergunta 4?", "answer": "Resposta 4" },
    { "question": "Pergunta 5?", "answer": "Resposta 5" }
  ],
  "meta_description": "Meta description SEO (130-155 chars, incluir keyword e CTA)",
  "about_section": "Parágrafo sobre a Smart Dent e sua atuação em ${target.category_name} (máx 200 chars)"
}`

      const fullPrompt = injectClinicalBrainGuard(prompt, firstProduct)

      try {
        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: fullPrompt }],
            temperature: 0.7,
          }),
        })

        if (!aiRes.ok) {
          console.error('AI Gateway error for target:', target.id, aiRes.status)
          continue
        }

        const aiData = await aiRes.json()
        let rawText = aiData?.choices?.[0]?.message?.content
        if (!rawText) continue

        rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const content = JSON.parse(rawText)

        // Build the final branded HTML
        const html = buildBrandedHtml({
          target,
          content,
          productCardsHtml,
          reviewsHtml,
          logoUrl,
          companyName,
          phone,
          whatsappLink,
          instagram,
          youtube,
          siteUrl,
          products,
          ratingValue: company?.google_aggregate_rating?.ratingValue || '4.8',
          reviewCount: company?.google_aggregate_rating?.reviewCount || '30',
        })

        await supabase
          .from('local_seo_targets')
          .update({
            html_content: html,
            html_generated: true,
            last_refreshed: new Date().toISOString(),
            status: 'published',
            published_at: new Date().toISOString(),
            meta_description: content.meta_description,
          })
          .eq('id', target.id)

        results.push({
          id: target.id,
          page_slug: target.page_slug,
          state_uf: target.state_uf,
          city: target.city,
          specialty: target.specialty,
          products_matched: products.length,
        })
      } catch (err) {
        console.error('Error for target:', target.id, err)
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

function extractCategoryKeyword(categoryName: string): string {
  if (!categoryName) return ''
  const lower = categoryName.toLowerCase()
  if (lower.includes('scanner') || lower.includes('intraoral')) return 'SCANNER'
  if (lower.includes('impressora') || lower.includes('impress')) return 'IMPRESS'
  if (lower.includes('resina')) return 'RESINA'
  if (lower.includes('software')) return 'SOFTWARE'
  if (lower.includes('caracteriza')) return 'CARACTERIZA'
  if (lower.includes('insumo')) return 'INSUMO'
  if (lower.includes('cura') || lower.includes('wash')) return 'IMPRESS'
  if (lower.includes('dent')) return 'DENT'
  if (lower.includes('curso')) return 'CURSO'
  return categoryName.split(' ')[0]
}

function buildProductCards(products: any[], siteUrl: string): string {
  if (!products.length) return ''
  
  return products.map(p => {
    const price = p.promo_price || p.price
    const originalPrice = p.promo_price && p.price ? p.price : null
    const specs = Array.isArray(p.technical_specifications)
      ? p.technical_specifications.slice(0, 3).map((s: any) => 
          typeof s === 'object' ? `${Object.keys(s)[0]}: ${Object.values(s)[0]}` : String(s)
        )
      : []
    const benefits = Array.isArray(p.benefits) ? p.benefits.slice(0, 3) : []
    const imgUrl = p.image_url || ''
    const productUrl = p.product_url || `${siteUrl}/produto/${p.slug || ''}`
    
    return `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow">
      ${imgUrl ? `<div class="aspect-video bg-gray-50 flex items-center justify-center p-4">
        <img src="${imgUrl}" alt="${p.name}" class="max-h-48 object-contain" loading="lazy" />
      </div>` : ''}
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-900 mb-2">${p.name}</h3>
        <p class="text-gray-600 text-sm mb-4 line-clamp-3">${(p.description || '').substring(0, 180)}</p>
        ${specs.length ? `<div class="space-y-1 mb-4">${specs.map((s: string) => `<div class="text-xs text-gray-500 flex items-center gap-1"><span class="text-sky-500">✓</span> ${s}</div>`).join('')}</div>` : ''}
        ${benefits.length ? `<div class="flex flex-wrap gap-1 mb-4">${benefits.map((b: string) => `<span class="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-full">${b}</span>`).join('')}</div>` : ''}
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            ${originalPrice ? `<span class="text-sm text-gray-400 line-through">R$ ${Number(originalPrice).toLocaleString('pt-BR')}</span>` : ''}
            ${price ? `<span class="text-2xl font-bold text-sky-600">R$ ${Number(price).toLocaleString('pt-BR')}</span>` : '<span class="text-lg font-semibold text-sky-600">Consulte</span>'}
          </div>
          <a href="${productUrl}" target="_blank" rel="noopener" class="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Ver Detalhes</a>
        </div>
      </div>
    </div>`
  }).join('\n')
}

function buildReviewsSection(reviews: any[]): string {
  if (!reviews.length) return ''
  return reviews.map(r => `
    <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div class="flex items-center gap-2 mb-2">
        <div class="flex text-amber-400">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <span class="font-semibold text-gray-900 text-sm">${r.author_name}</span>
      </div>
      <p class="text-gray-600 text-sm italic">"${(r.review_text || '').substring(0, 200)}"</p>
    </div>
  `).join('\n')
}

interface BrandedHtmlParams {
  target: any
  content: any
  productCardsHtml: string
  reviewsHtml: string
  logoUrl: string
  companyName: string
  phone: string
  whatsappLink: string
  instagram: string
  youtube: string
  siteUrl: string
  products: any[]
  ratingValue: string
  reviewCount: string
}

function buildBrandedHtml(p: BrandedHtmlParams): string {
  const { target, content, productCardsHtml, reviewsHtml, logoUrl, companyName, phone, whatsappLink, instagram, youtube, siteUrl, products, ratingValue, reviewCount } = p

  const faqHtml = (content.faq || []).map((f: any, i: number) => `
    <details class="group border-b border-gray-200 last:border-0" ${i === 0 ? 'open' : ''}>
      <summary class="flex justify-between items-center py-4 cursor-pointer text-gray-900 font-medium hover:text-sky-600 transition-colors">
        ${f.question}
        <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </summary>
      <p class="pb-4 text-gray-600 text-sm">${f.answer}</p>
    </details>
  `).join('')

  const diffsHtml = (content.differentials || []).map((d: any) => `
    <div class="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">✓</div>
      <h3 class="font-bold text-gray-900 mb-1">${d.title}</h3>
      <p class="text-gray-600 text-sm">${d.description}</p>
    </div>
  `).join('')

  const productSchemas = products.map(prod => `{
    "@type": "Product",
    "name": "${(prod.name || '').replace(/"/g, '\\"')}",
    "description": "${(prod.description || '').substring(0, 200).replace(/"/g, '\\"')}",
    ${prod.image_url ? `"image": "${prod.image_url}",` : ''}
    "brand": {"@type": "Brand", "name": "${companyName}"},
    "offers": {
      "@type": "Offer",
      "priceCurrency": "BRL",
      ${prod.price ? `"price": "${prod.price}",` : ''}
      "availability": "https://schema.org/InStock",
      "seller": {"@type": "Organization", "name": "${companyName}"}
    }
  }`).join(',\n')

  const faqSchema = (content.faq || []).map((f: any) => `{
    "@type": "Question",
    "name": "${(f.question || '').replace(/"/g, '\\"')}",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "${(f.answer || '').replace(/"/g, '\\"')}"
    }
  }`).join(',\n')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${target.page_title || content.hero_headline || target.focus_keyword}</title>
  <meta name="description" content="${content.meta_description || target.meta_description || ''}">
  <link rel="canonical" href="${siteUrl}/${target.page_slug || ''}">
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "name": "${companyName}",
        "url": "${siteUrl}",
        "logo": "${logoUrl}",
        "telephone": "${phone}",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "${ratingValue}",
          "reviewCount": "${reviewCount}",
          "bestRating": "5"
        }
      }
      ${productSchemas ? `,${productSchemas}` : ''}
      ${faqSchema ? `,{"@type": "FAQPage", "mainEntity": [${faqSchema}]}` : ''}
    ]
  }
  </script>
</head>
<body class="bg-gray-50 text-gray-900 antialiased">

  <!-- HEADER -->
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="${siteUrl}" class="flex items-center gap-3">
        <img src="${logoUrl}" alt="${companyName}" class="h-10 object-contain" />
        <span class="text-xl font-bold text-gray-900 hidden sm:inline">${companyName}</span>
      </a>
      <div class="flex items-center gap-4">
        <a href="tel:${phone.replace(/\D/g, '')}" class="text-sm text-gray-600 hover:text-sky-600 hidden md:inline">${phone}</a>
        <a href="${whatsappLink}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
          WhatsApp
        </a>
      </div>
    </div>
  </header>

  <!-- HERO -->
  <section class="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white py-20">
    <div class="max-w-5xl mx-auto px-4 text-center">
      <div class="flex items-center justify-center gap-2 mb-4">
        <div class="flex text-amber-400 text-lg">★★★★★</div>
        <span class="text-sky-300 text-sm">${ratingValue}/5 — ${reviewCount} avaliações</span>
      </div>
      <h1 class="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">${content.hero_headline || target.h1_text || target.focus_keyword}</h1>
      <p class="text-xl text-sky-200 mb-8 max-w-3xl mx-auto">${content.hero_subheadline || ''}</p>
      <a href="${whatsappLink}" target="_blank" class="inline-block bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-4 rounded-xl font-bold transition-colors shadow-lg shadow-green-500/30">
        ${content.hero_cta || 'Fale com um Especialista'}
      </a>
    </div>
  </section>

  <!-- DIFERENCIAIS -->
  <section class="py-16 bg-gray-50">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-4">Por que escolher a ${companyName}?</h2>
      <p class="text-gray-600 text-center mb-10 max-w-2xl mx-auto">${content.about_section || ''}</p>
      <div class="grid md:grid-cols-3 gap-6">
        ${diffsHtml}
      </div>
    </div>
  </section>

  <!-- PRODUTOS -->
  ${productCardsHtml ? `
  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-10">${target.category_name || 'Nossos Produtos'} para ${target.specialty}</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${productCardsHtml}
      </div>
    </div>
  </section>
  ` : ''}

  <!-- REVIEWS -->
  ${reviewsHtml ? `
  <section class="py-16 bg-gray-50">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-10">O que dizem nossos clientes</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${reviewsHtml}
      </div>
    </div>
  </section>
  ` : ''}

  <!-- FAQ -->
  ${faqHtml ? `
  <section class="py-16 bg-white">
    <div class="max-w-3xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-10">Perguntas Frequentes</h2>
      <div class="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        ${faqHtml}
      </div>
    </div>
  </section>
  ` : ''}

  <!-- CTA FINAL -->
  <section class="py-20 bg-gradient-to-r from-sky-600 to-sky-700 text-white">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <h2 class="text-3xl md:text-4xl font-extrabold mb-4">Pronto para transformar seu consultório?</h2>
      <p class="text-sky-100 text-lg mb-8">Fale agora com nossos especialistas e receba uma consultoria personalizada.</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="${whatsappLink}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg">
          💬 Chamar no WhatsApp
        </a>
        <a href="tel:${phone.replace(/\D/g, '')}" class="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors border border-white/30">
          📞 Ligar Agora
        </a>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="bg-slate-900 text-gray-400 py-12">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-3">
          <img src="${logoUrl}" alt="${companyName}" class="h-8 object-contain brightness-0 invert" />
          <span class="text-white font-bold">${companyName}</span>
        </div>
        <div class="flex gap-6 text-sm">
          <a href="${siteUrl}" class="hover:text-white transition-colors">Site</a>
          <a href="${instagram}" target="_blank" class="hover:text-white transition-colors">Instagram</a>
          <a href="${youtube}" target="_blank" class="hover:text-white transition-colors">YouTube</a>
          <a href="${whatsappLink}" target="_blank" class="hover:text-white transition-colors">WhatsApp</a>
        </div>
      </div>
      <div class="text-center text-xs text-gray-500 mt-8 pt-6 border-t border-gray-800">
        © ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados. Entrega para todo o Brasil.
      </div>
    </div>
  </footer>

</body>
</html>`
}
