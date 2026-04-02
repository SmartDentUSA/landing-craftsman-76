import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { injectClinicalBrainGuard, mapProductToContext } from '../_shared/clinical-brain-guard.ts'
import {
  expandFounderSameAs,
  generateHasCredential,
  generateHreflangHTML,
  deduplicateKeywords
} from '../_shared/seo-fine-tuning.ts'

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

    // Fetch full company profile
    const { data: company } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single()

    // Fetch top reviews
    const { data: topReviews } = await supabase
      .from('raw_reviews')
      .select('author_name, rating, review_text')
      .not('review_text', 'is', null)
      .gte('rating', 4)
      .order('rating', { ascending: false })
      .limit(6)

    // Fetch KOLs for E-E-A-T
    const { data: kols } = await supabase
      .from('key_opinion_leaders')
      .select('full_name, specialty, mini_cv, photo_url')
      .eq('approved', true)
      .limit(3)

    const results: any[] = []

    for (const target of targets) {
      const categoryKeyword = extractCategoryKeyword(target.category_name || '')
      
      // Fuzzy product matching
      let products: any[] = []
      if (categoryKeyword) {
        const { data: fuzzyProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, promo_price, image_url, product_url, technical_specifications, benefits, features, sales_pitch, keywords, target_audience, slug, brand, gtin, certifications, category')
          .eq('approved', true)
          .ilike('category', `%${categoryKeyword}%`)
          .limit(6)
        products = fuzzyProducts || []
      }

      if (products.length === 0 && target.product_name) {
        const { data: nameProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, promo_price, image_url, product_url, technical_specifications, benefits, features, sales_pitch, keywords, target_audience, slug, brand, gtin, certifications, category')
          .eq('approved', true)
          .ilike('name', `%${target.product_name.split(' ')[0]}%`)
          .limit(6)
        products = nameProducts || []
      }

      // Fallback: get any approved products
      if (products.length === 0) {
        const { data: anyProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, promo_price, image_url, product_url, technical_specifications, benefits, features, sales_pitch, keywords, target_audience, slug, brand, gtin, certifications, category')
          .eq('approved', true)
          .limit(4)
        products = anyProducts || []
      }

      const companyName = company?.company_name || 'Smart Dent'
      const logoUrl = company?.company_logo_url || 'https://smartdent.com.br/logo.png'
      const phone = company?.contact_phone || '(16) 99383-1794'
      const siteUrl = company?.website_url || 'https://smartdent.com.br'
      const whatsappLink = `https://wa.me/5516993831794?text=Olá! Vi a página sobre ${target.category_name || 'equipamentos'} para ${target.specialty} em ${target.city || target.state_uf} e gostaria de mais informações.`
      const instagram = company?.instagram_profile || 'https://www.instagram.com/smartdentoficial/'
      const youtube = company?.youtube_channel || 'https://www.youtube.com/@smartdentcadcam'
      const canonicalUrl = `${siteUrl}/${target.page_slug || ''}`

      // E-E-A-T data
      const sameAs = expandFounderSameAs(company || {})
      const credentials = generateHasCredential(company?.certifications || 'ANVISA, ISO 13485')
      const hreflangHtml = generateHreflangHTML(canonicalUrl)
      const allKeywords = deduplicateKeywords([
        target.focus_keyword || '',
        target.specialty,
        target.category_name || '',
        target.city || '',
        ...(target.secondary_keywords || []),
        ...products.flatMap((p: any) => p.keywords || [])
      ])

      // Build context for Clinical Brain Guard
      const firstProduct = products[0] ? mapProductToContext(products[0]) : {
        name: target.product_name || target.category_name || 'Equipamento odontológico',
        category: target.category_name || '',
      }

      const prompt = `Gere APENAS os textos em JSON para preencher um template HTML fixo de landing page SEO Local.
O template já está pronto com header SmartDent, cards de produto reais, reviews reais, seção de autoridade E-E-A-T e CTA.
Você deve gerar APENAS o conteúdo textual.

CONTEXTO:
- Empresa: ${companyName} — tecnologia odontológica digital (scanners 3D, impressoras 3D, resinas, softwares CAD/CAM)
- Sede: ${company?.city || 'Ribeirão Preto'}/${company?.state || 'SP'}
- Fundador: ${company?.founder_name || ''} (${company?.founder_title || ''})
- Categoria: ${target.category_name || 'equipamentos odontológicos'}
- Especialidade alvo: ${target.specialty}
- Cidade/UF: ${target.city || 'Todo Brasil'}/${target.state_uf}
- Keyword principal: ${target.focus_keyword || target.specialty}
- Diferenciais: ${company?.differentiators || 'Suporte técnico especializado, treinamento personalizado, entrega para todo Brasil'}
- Produtos REAIS disponíveis: ${products.map(p => `${p.name} (${p.category})`).join(', ') || 'Nenhum específico'}
- Reviews reais: ${(topReviews || []).length} avaliações positivas
- Nota Google: ${company?.google_aggregate_rating?.ratingValue || '4.8'}/5

REGRAS ABSOLUTAS:
- NUNCA inventar nomes de produtos, preços ou especificações
- NUNCA citar marcas concorrentes
- Use tom profissional focado em ${target.specialty}
- Mencione entrega para ${target.city || target.state_uf} quando relevante
- Hero headline DEVE conter "${target.specialty}" e "${target.city || target.state_uf}"

Retorne APENAS JSON válido (sem markdown, sem \`\`\`):
{
  "hero_headline": "Headline (máx 80 chars, DEVE incluir ${target.specialty} e ${target.city || target.state_uf})",
  "hero_subheadline": "Subtítulo (máx 150 chars, mencionar benefícios e cidade)",
  "hero_cta": "Texto CTA (máx 30 chars)",
  "differentials": [
    { "icon": "🔬", "title": "Diferencial 1", "description": "Descrição curta" },
    { "icon": "🚀", "title": "Diferencial 2", "description": "Descrição curta" },
    { "icon": "🛡️", "title": "Diferencial 3", "description": "Descrição curta" },
    { "icon": "📦", "title": "Diferencial 4 (entrega)", "description": "Entrega para ${target.city || target.state_uf}" }
  ],
  "faq": [
    { "question": "Pergunta relevante para ${target.specialty} em ${target.city || target.state_uf}?", "answer": "Resposta informativa" },
    { "question": "Pergunta 2?", "answer": "Resposta 2" },
    { "question": "Pergunta 3?", "answer": "Resposta 3" },
    { "question": "Pergunta 4?", "answer": "Resposta 4" },
    { "question": "Pergunta 5?", "answer": "Resposta 5" }
  ],
  "meta_description": "Meta description SEO (130-155 chars, incluir keyword e CTA)",
  "about_section": "Parágrafo sobre a Smart Dent e sua atuação em ${target.category_name} para ${target.specialty} (máx 300 chars)",
  "geo_section": "Texto sobre atendimento em ${target.city || target.state_uf} (máx 200 chars)"
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

        // Build E-E-A-T compliant HTML
        const html = buildSemanticHtml({
          target,
          content,
          products,
          reviews: topReviews || [],
          kols: kols || [],
          company: company || {},
          companyName,
          logoUrl,
          phone,
          whatsappLink,
          instagram,
          youtube,
          siteUrl,
          canonicalUrl,
          sameAs,
          credentials,
          hreflangHtml,
          allKeywords,
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
            page_title: content.hero_headline,
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

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function extractCategoryKeyword(categoryName: string): string {
  if (!categoryName) return ''
  const lower = categoryName.toLowerCase()
  if (lower.includes('scanner') || lower.includes('intraoral')) return 'SCANNER'
  if (lower.includes('impressora') || lower.includes('impress')) return 'IMPRESS'
  if (lower.includes('resina')) return 'RESINA'
  if (lower.includes('software') || lower.includes('cad') || lower.includes('cam')) return 'SOFTWARE'
  if (lower.includes('caracteriza')) return 'CARACTERIZA'
  if (lower.includes('insumo')) return 'INSUMO'
  if (lower.includes('cura') || lower.includes('wash')) return 'IMPRESS'
  if (lower.includes('dent')) return 'DENT'
  if (lower.includes('curso') || lower.includes('trein')) return 'CURSO'
  if (lower.includes('fresa') || lower.includes('fresagem')) return 'FRESA'
  if (lower.includes('forno') || lower.includes('sinteriza')) return 'FORNO'
  return categoryName.split(' ')[0]
}

// ═══════════════════════════════════════════
// SEMANTIC HTML BUILDER (E-E-A-T + GEO + SEO)
// ═══════════════════════════════════════════

interface SemanticHtmlParams {
  target: any
  content: any
  products: any[]
  reviews: any[]
  kols: any[]
  company: any
  companyName: string
  logoUrl: string
  phone: string
  whatsappLink: string
  instagram: string
  youtube: string
  siteUrl: string
  canonicalUrl: string
  sameAs: string[]
  credentials: any
  hreflangHtml: string
  allKeywords: string[]
  ratingValue: string
  reviewCount: string
}

function buildSemanticHtml(p: SemanticHtmlParams): string {
  const { target, content, products, reviews, kols, company, companyName, logoUrl, phone, whatsappLink, instagram, youtube, siteUrl, canonicalUrl, sameAs, credentials, hreflangHtml, allKeywords, ratingValue, reviewCount } = p

  const pageTitle = content.hero_headline || target.page_title || target.focus_keyword
  const metaDesc = content.meta_description || target.meta_description || ''
  const founderName = company?.founder_name || ''
  const founderTitle = company?.founder_title || ''
  const founderLinkedin = company?.founder_linkedin || ''
  const wikidataId = company?.wikidata_id || 'Q138636902'
  const city = target.city || company?.city || ''
  const stateUf = target.state_uf || company?.state || 'SP'

  // ═══ JSON-LD @graph ═══
  const jsonLd = buildJsonLdGraph(p)

  // ═══ Product cards ═══
  const productCardsHtml = products.map((prod, i) => {
    const price = prod.promo_price || prod.price
    const originalPrice = prod.promo_price && prod.price ? prod.price : null
    const specs = Array.isArray(prod.technical_specifications)
      ? prod.technical_specifications.slice(0, 3).map((s: any) =>
          typeof s === 'object' ? `${Object.keys(s)[0]}: ${Object.values(s)[0]}` : String(s)
        )
      : []
    const benefits = Array.isArray(prod.benefits) ? prod.benefits.slice(0, 3) : []
    const imgUrl = prod.image_url || ''
    const productUrl = prod.product_url || `${siteUrl}/produto/${prod.slug || ''}`

    return `
      <div class="product-card bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300" itemscope itemtype="https://schema.org/Product">
        ${imgUrl ? `<div class="aspect-[4/3] bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-6">
          <img src="${imgUrl}" alt="${prod.name}" class="max-h-48 w-auto object-contain drop-shadow-md" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} itemprop="image" />
        </div>` : ''}
        <div class="p-6">
          <h3 class="text-lg font-bold text-slate-900 mb-2" itemprop="name">${prod.name}</h3>
          <p class="text-slate-600 text-sm mb-3 line-clamp-2" itemprop="description">${(prod.description || '').substring(0, 150)}</p>
          ${specs.length ? `<div class="space-y-1.5 mb-3">${specs.map((s: string) => `<div class="text-xs text-slate-500 flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-sky-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg><span>${s}</span></div>`).join('')}</div>` : ''}
          ${benefits.length ? `<div class="flex flex-wrap gap-1.5 mb-4">${benefits.map((b: string) => `<span class="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-full font-medium">${b}</span>`).join('')}</div>` : ''}
          <div class="flex items-center justify-between pt-4 border-t border-gray-100" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <meta itemprop="priceCurrency" content="BRL">
            <div>
              ${originalPrice ? `<span class="text-sm text-gray-400 line-through block">R$ ${Number(originalPrice).toLocaleString('pt-BR')}</span>` : ''}
              ${price ? `<span class="text-xl font-extrabold text-sky-600" itemprop="price" content="${price}">R$ ${Number(price).toLocaleString('pt-BR')}</span>` : '<span class="text-base font-semibold text-sky-600">Consulte</span>'}
            </div>
            <a href="${productUrl}" target="_blank" rel="noopener" class="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm" itemprop="url">Ver Produto</a>
          </div>
        </div>
      </div>`
  }).join('\n')

  // ═══ Reviews section ═══
  const reviewsHtml = reviews.map(r => `
    <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100" itemprop="review" itemscope itemtype="https://schema.org/Review">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm">${(r.author_name || 'A')[0].toUpperCase()}</div>
        <div>
          <span class="font-semibold text-slate-900 text-sm block" itemprop="author">${r.author_name}</span>
          <div class="flex text-amber-400 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        </div>
      </div>
      <p class="text-slate-600 text-sm leading-relaxed" itemprop="reviewBody">"${(r.review_text || '').substring(0, 200)}"</p>
      <meta itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating" content="">
    </div>
  `).join('\n')

  // ═══ FAQ section ═══
  const faqHtml = (content.faq || []).map((f: any, i: number) => `
    <details class="group border-b border-gray-200 last:border-0" ${i === 0 ? 'open' : ''}>
      <summary class="flex justify-between items-center py-5 px-6 cursor-pointer text-slate-900 font-semibold hover:text-sky-600 transition-colors text-[15px]">
        ${f.question}
        <svg class="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </summary>
      <p class="pb-5 px-6 text-slate-600 text-sm leading-relaxed">${f.answer}</p>
    </details>
  `).join('')

  // ═══ Differentials ═══
  const diffsHtml = (content.differentials || []).map((d: any) => `
    <div class="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div class="w-14 h-14 bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">${d.icon || '✓'}</div>
      <h3 class="font-bold text-slate-900 mb-2 text-base">${d.title}</h3>
      <p class="text-slate-600 text-sm leading-relaxed">${d.description}</p>
    </div>
  `).join('')

  // ═══ KOL / Authority section ═══
  const kolsHtml = kols.length > 0 ? kols.map(k => `
    <div class="flex items-start gap-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      ${k.photo_url ? `<img src="${k.photo_url}" alt="${k.full_name}" class="w-16 h-16 rounded-full object-cover border-2 border-sky-100" loading="lazy">` : `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">${(k.full_name || 'E')[0]}</div>`}
      <div>
        <h4 class="font-bold text-slate-900">${k.full_name}</h4>
        <p class="text-sky-600 text-sm font-medium">${k.specialty || 'Especialista'}</p>
        <p class="text-slate-600 text-xs mt-1 line-clamp-2">${(k.mini_cv || '').substring(0, 120)}</p>
      </div>
    </div>
  `).join('') : ''

  return `<!DOCTYPE html>
<html lang="pt-BR" data-semantic-enhanced="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} | ${companyName}</title>
  <meta name="description" content="${metaDesc}">
  <meta name="keywords" content="${allKeywords.join(', ')}">
  <meta name="robots" content="index, follow">
  <meta name="author" content="${companyName}">
  <meta name="geo.region" content="BR-${stateUf}">
  <meta name="geo.placename" content="${city || stateUf}">
  <link rel="canonical" href="${canonicalUrl}">
  ${hreflangHtml}

  <!-- Open Graph -->
  <meta property="og:title" content="${pageTitle} | ${companyName}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="${companyName}">
  ${products[0]?.image_url ? `<meta property="og:image" content="${products[0].image_url}">` : `<meta property="og:image" content="${logoUrl}">`}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${metaDesc}">

  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .hero-gradient { background: linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0c4a6e 100%); }
    .glass-card { background: rgba(255,255,255,0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12); }
    .cta-pulse { animation: pulse-ring 2s ease-out infinite; }
    @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); } 70% { box-shadow: 0 0 0 12px rgba(34,197,94,0); } }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  </style>

  <script type="application/ld+json">
  ${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">

  <!-- HEADER -->
  <header class="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between" aria-label="Navegação principal">
      <a href="${siteUrl}" class="flex items-center gap-3" aria-label="${companyName} - Página inicial">
        <img src="${logoUrl}" alt="${companyName}" class="h-10 object-contain" fetchpriority="high" width="160" height="40" />
        <span class="text-lg font-bold text-slate-900 hidden sm:inline tracking-tight">${companyName}</span>
      </a>
      <div class="flex items-center gap-3">
        <a href="tel:${phone.replace(/\D/g, '')}" class="text-sm text-slate-600 hover:text-sky-600 hidden md:flex items-center gap-1.5 transition-colors" aria-label="Ligar para ${companyName}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          ${phone}
        </a>
        <a href="${whatsappLink}" target="_blank" rel="noopener" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 cta-pulse" aria-label="Falar pelo WhatsApp">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
          WhatsApp
        </a>
      </div>
    </nav>
  </header>

  <main>
    <article class="indexable-content" itemscope itemtype="https://schema.org/WebPage">

      <!-- HERO -->
      <section class="hero-gradient text-white py-20 md:py-28 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.15&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"></div>
        <div class="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div class="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 text-sm backdrop-blur-sm border border-white/10">
            <div class="flex text-amber-400 text-sm tracking-tight">★★★★★</div>
            <span class="text-sky-200">${ratingValue}/5 — ${reviewCount} avaliações no Google</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight tracking-tight" itemprop="headline">${content.hero_headline || target.h1_text || target.focus_keyword}</h1>
          <p class="text-lg md:text-xl text-sky-200/90 mb-10 max-w-3xl mx-auto leading-relaxed">${content.hero_subheadline || ''}</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="${whatsappLink}" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white text-lg px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-green-500/25 hover:shadow-green-400/30 hover:-translate-y-0.5 cta-pulse">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
              ${content.hero_cta || 'Fale com um Especialista'}
            </a>
            <a href="tel:${phone.replace(/\D/g, '')}" class="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-lg px-8 py-4 rounded-2xl font-semibold transition-all border border-white/20 backdrop-blur-sm">
              📞 Ligar Agora
            </a>
          </div>
        </div>
      </section>

      <!-- TRUST BAR -->
      <section class="bg-white border-b border-gray-100 py-4" aria-label="Indicadores de confiança">
        <div class="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-slate-600">
          <div class="flex items-center gap-2"><svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg><span>Registro ANVISA</span></div>
          <div class="flex items-center gap-2"><svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg><span>Entrega para ${city || 'todo Brasil'}</span></div>
          <div class="flex items-center gap-2"><svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg><span>Suporte Técnico Especializado</span></div>
          <div class="flex items-center gap-2"><svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg><span>Treinamento Incluso</span></div>
        </div>
      </section>

      <!-- DIFERENCIAIS -->
      <section class="py-16 md:py-20 bg-slate-50" aria-label="Diferenciais">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Por que escolher a ${companyName}?</h2>
            <p class="text-slate-600 max-w-2xl mx-auto leading-relaxed">${content.about_section || ''}</p>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${diffsHtml}
          </div>
        </div>
      </section>

      <!-- PRODUTOS REAIS -->
      ${productCardsHtml ? `
      <section class="py-16 md:py-20 bg-white" aria-label="Produtos">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="text-center mb-12">
            <span class="inline-block bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">Produtos Reais</span>
            <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">${target.category_name || 'Nossos Produtos'} para ${target.specialty}</h2>
            <p class="text-slate-500">Equipamentos disponíveis com entrega para ${city || target.state_uf || 'todo Brasil'}</p>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            ${productCardsHtml}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- REVIEWS REAIS -->
      ${reviewsHtml ? `
      <section class="py-16 md:py-20 bg-slate-50" aria-label="Avaliações de clientes" itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating">
        <meta itemprop="ratingValue" content="${ratingValue}">
        <meta itemprop="reviewCount" content="${reviewCount}">
        <meta itemprop="bestRating" content="5">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="text-center mb-12">
            <div class="flex items-center justify-center gap-2 mb-3">
              <div class="flex text-amber-400 text-xl">★★★★★</div>
              <span class="text-slate-600 font-medium">${ratingValue}/5</span>
            </div>
            <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Avaliações Reais de Clientes</h2>
            <p class="text-slate-500">${reviewCount} avaliações verificadas no Google</p>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${reviewsHtml}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- E-E-A-T AUTHORITY -->
      ${kolsHtml ? `
      <section class="py-16 md:py-20 bg-white" aria-label="Especialistas">
        <div class="max-w-4xl mx-auto px-4 sm:px-6">
          <div class="text-center mb-10">
            <span class="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">Autoridade E-E-A-T</span>
            <h2 class="text-3xl font-extrabold text-slate-900 mb-3">Especialistas que Confiam na ${companyName}</h2>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${kolsHtml}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- FAQ -->
      ${faqHtml ? `
      <section class="py-16 md:py-20 bg-slate-50" aria-label="Perguntas frequentes">
        <div class="max-w-3xl mx-auto px-4 sm:px-6">
          <div class="text-center mb-10">
            <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Perguntas Frequentes</h2>
            <p class="text-slate-500">${target.specialty} em ${city || target.state_uf}</p>
          </div>
          <div class="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            ${faqHtml}
          </div>
        </div>
      </section>
      ` : ''}

      <!-- GEO SECTION -->
      <section class="py-12 bg-white border-t border-gray-100" aria-label="Cobertura geográfica">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div class="inline-flex items-center gap-2 text-sky-600 mb-4">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="font-semibold text-sm uppercase tracking-wider">${city ? `${city} — ${stateUf}` : stateUf}</span>
          </div>
          <p class="text-slate-600 leading-relaxed max-w-2xl mx-auto">${content.geo_section || `A ${companyName} atende profissionais de ${target.specialty} em ${city || target.state_uf} com entrega expressa, suporte técnico local e treinamento personalizado.`}</p>
        </div>
      </section>

      <!-- CTA FINAL -->
      <section class="py-20 md:py-24 hero-gradient text-white relative overflow-hidden">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">Pronto para transformar seu consultório?</h2>
          <p class="text-sky-200/90 text-lg mb-10 max-w-2xl mx-auto">Fale agora com nossos especialistas e receba uma consultoria personalizada para ${target.specialty}${city ? ` em ${city}` : ''}.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="${whatsappLink}" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-green-500/25 cta-pulse">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
              💬 Chamar no WhatsApp
            </a>
            <a href="tel:${phone.replace(/\D/g, '')}" class="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all border border-white/20">
              📞 Ligar: ${phone}
            </a>
          </div>
        </div>
      </section>

      <!-- AI READINESS (hidden, for crawlers + LLMs) -->
      <div class="ai-readiness-block" style="display:none" aria-hidden="true">
        <div class="ai-summary" data-ai-type="page-summary">
          Esta página contém informações sobre ${target.category_name || 'equipamentos odontológicos'} para ${target.specialty} ${city ? `em ${city}/${stateUf}` : `no ${stateUf}`}, fornecidos pela ${companyName}. ${products.length} produtos reais listados com preços e especificações técnicas verificadas.
        </div>
        <div class="llm-knowledge" data-ai-type="knowledge-base">
          Empresa: ${companyName} | Segmento: Odontologia Digital CAD/CAM | Produtos: ${products.map(p => p.name).join(', ')} | Cidade: ${city || 'Ribeirão Preto'} | Estado: ${stateUf} | Avaliação: ${ratingValue}/5 (${reviewCount} reviews)
        </div>
        <div class="entity-index" data-ai-type="entity-map">
          Wikidata: ${wikidataId} | Tipo: DentalSupplyCompany | Fundador: ${founderName} | Especialidade da página: ${target.specialty}
        </div>
      </div>

    </article>
  </main>

  <!-- FOOTER -->
  <footer class="bg-slate-900 text-gray-400 py-12 border-t border-slate-800">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="grid md:grid-cols-3 gap-8 mb-8">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <img src="${logoUrl}" alt="${companyName}" class="h-8 object-contain brightness-0 invert" loading="lazy" />
            <span class="text-white font-bold text-lg">${companyName}</span>
          </div>
          <p class="text-sm leading-relaxed">${company?.company_description ? company.company_description.substring(0, 150) + '...' : 'Tecnologia odontológica digital de ponta para profissionais exigentes.'}</p>
        </div>
        <div>
          <h4 class="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Contato</h4>
          <div class="space-y-2 text-sm">
            <a href="tel:${phone.replace(/\D/g, '')}" class="block hover:text-white transition-colors">${phone}</a>
            ${company?.contact_email ? `<a href="mailto:${company.contact_email}" class="block hover:text-white transition-colors">${company.contact_email}</a>` : ''}
            ${company?.street_address ? `<p>${company.street_address}${company?.city ? `, ${company.city}/${company.state}` : ''}</p>` : ''}
          </div>
        </div>
        <div>
          <h4 class="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Redes Sociais</h4>
          <div class="flex gap-4">
            <a href="${instagram}" target="_blank" rel="noopener" class="hover:text-white transition-colors" aria-label="Instagram">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="${youtube}" target="_blank" rel="noopener" class="hover:text-white transition-colors" aria-label="YouTube">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="${whatsappLink}" target="_blank" rel="noopener" class="hover:text-white transition-colors" aria-label="WhatsApp">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="text-center text-xs text-gray-500 pt-6 border-t border-slate-800">
        © ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados. Entrega para todo o Brasil.
      </div>
    </div>
  </footer>

</body>
</html>`
}

// ═══════════════════════════════════════════
// JSON-LD @graph Builder
// ═══════════════════════════════════════════

function buildJsonLdGraph(p: SemanticHtmlParams): object {
  const { target, content, products, reviews, company, companyName, logoUrl, phone, siteUrl, canonicalUrl, sameAs, credentials, ratingValue, reviewCount } = p

  const wikidataId = company?.wikidata_id || 'Q138636902'
  const city = target.city || company?.city || ''
  const stateUf = target.state_uf || company?.state || 'SP'

  const graph: any[] = []

  // 1. Organization with sameAs + hasCredential
  const org: any = {
    "@type": ["Organization", "LocalBusiness", "DentalSupplyCompany"],
    "@id": `${siteUrl}/#organization`,
    "name": companyName,
    "url": siteUrl,
    "logo": { "@type": "ImageObject", "url": logoUrl },
    "telephone": phone,
    "email": company?.contact_email || '',
    "sameAs": [
      `https://www.wikidata.org/wiki/${wikidataId}`,
      ...sameAs
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ratingValue,
      "reviewCount": reviewCount,
      "bestRating": "5"
    }
  }

  if (company?.street_address) {
    org.address = {
      "@type": "PostalAddress",
      "streetAddress": company.street_address,
      "addressLocality": company.city || '',
      "addressRegion": company.state || stateUf,
      "addressCountry": "BR",
      "postalCode": company.postal_code || ''
    }
  }

  if (company?.latitude && company?.longitude) {
    org.geo = {
      "@type": "GeoCoordinates",
      "latitude": company.latitude,
      "longitude": company.longitude
    }
  }

  if (credentials && credentials.length > 0) {
    org.hasCredential = credentials
  }

  if (company?.founder_name) {
    org.founder = {
      "@type": "Person",
      "name": company.founder_name,
      "jobTitle": company.founder_title || 'CEO',
      ...(company.founder_linkedin ? { "sameAs": [company.founder_linkedin] } : {})
    }
  }

  graph.push(org)

  // 2. WebPage
  graph.push({
    "@type": "WebPage",
    "@id": canonicalUrl,
    "url": canonicalUrl,
    "name": content.hero_headline || target.page_title,
    "description": content.meta_description || '',
    "isPartOf": { "@id": `${siteUrl}/#website` },
    "about": { "@id": `${siteUrl}/#organization` },
    "inLanguage": "pt-BR"
  })

  // 3. BreadcrumbList
  graph.push({
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": target.category_name || 'Produtos', "item": `${siteUrl}/produtos` },
      { "@type": "ListItem", "position": 3, "name": `${target.specialty}${city ? ` em ${city}` : ''}`, "item": canonicalUrl }
    ]
  })

  // 4. Products
  for (const prod of products) {
    const productSchema: any = {
      "@type": "Product",
      "name": (prod.name || '').replace(/"/g, '\\"'),
      "description": (prod.description || '').substring(0, 200).replace(/"/g, '\\"'),
      "brand": { "@type": "Brand", "name": prod.brand || companyName },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock",
        "seller": { "@id": `${siteUrl}/#organization` }
      }
    }
    if (prod.image_url) productSchema.image = prod.image_url
    if (prod.price) productSchema.offers.price = String(prod.price)
    if (prod.gtin) productSchema.gtin = prod.gtin
    if (prod.product_url) productSchema.url = prod.product_url

    graph.push(productSchema)
  }

  // 5. FAQPage
  if (content.faq && content.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "mainEntity": content.faq.map((f: any) => ({
        "@type": "Question",
        "name": (f.question || '').replace(/"/g, '\\"'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": (f.answer || '').replace(/"/g, '\\"')
        }
      }))
    })
  }

  // 6. GeoTargeting - AreaServed
  if (city || stateUf) {
    graph.push({
      "@type": "Service",
      "name": `${target.category_name || 'Equipamentos Odontológicos'} para ${target.specialty}`,
      "provider": { "@id": `${siteUrl}/#organization` },
      "areaServed": city ? {
        "@type": "City",
        "name": city,
        "containedInPlace": { "@type": "State", "name": stateUf }
      } : {
        "@type": "State",
        "name": stateUf,
        "containedInPlace": { "@type": "Country", "name": "Brasil" }
      },
      "serviceType": "Odontologia Digital"
    })
  }

  return { "@context": "https://schema.org", "@graph": graph }
}
