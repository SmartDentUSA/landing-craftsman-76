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

    // Fetch company profile (full)
    const { data: company } = await supabase
      .from('company_profile')
      .select('company_name, company_description, contact_phone, website_url, google_aggregate_rating, differentiators, delivery_approach, target_audience, brand_values, social_media_links, instagram_profile, youtube_channel')
      .limit(1)
      .single()

    // Fetch top reviews
    const { data: topReviews } = await supabase
      .from('raw_reviews')
      .select('author_name, rating, review_text')
      .not('review_text', 'is', null)
      .order('rating', { ascending: false })
      .limit(5)

    const reviewsText = (topReviews || [])
      .map((r: any) => `- ${r.author_name} (${r.rating}★): "${r.review_text?.substring(0, 200)}"`)
      .join('\n')

    const results: any[] = []

    for (const target of targets) {
      // Fuzzy match products using ILIKE with category keyword extraction
      const categoryKeyword = extractCategoryKeyword(target.category_name || '')
      
      let products: any[] = []
      if (categoryKeyword) {
        const { data: fuzzyProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, image_url, product_url, technical_specifications, benefits, features, competitive_advantages, sales_pitch, keywords, target_audience')
          .eq('approved', true)
          .ilike('category', `%${categoryKeyword}%`)
          .limit(5)
        products = fuzzyProducts || []
      }

      // Fallback: try product_name match
      if (products.length === 0 && target.product_name) {
        const { data: nameProducts } = await supabase
          .from('products_repository')
          .select('name, description, price, image_url, product_url, technical_specifications, benefits, features, competitive_advantages, sales_pitch, keywords, target_audience')
          .eq('approved', true)
          .ilike('name', `%${target.product_name.split(' ')[0]}%`)
          .limit(5)
        products = nameProducts || []
      }

      // Build rich product text with real specs
      const productsText = products.map((p: any) => {
        const specs = p.technical_specifications
          ? Object.entries(p.technical_specifications)
              .filter(([_, v]) => v && v !== 'N/A' && v !== 'null')
              .map(([k, v]) => `  • ${k}: ${v}`)
              .join('\n')
          : ''
        const benefits = Array.isArray(p.benefits) ? p.benefits.slice(0, 4).join(', ') : ''
        return `PRODUTO: ${p.name}
Descrição: ${p.description?.substring(0, 250) || ''}
Preço: R$${p.price || 'Consulte'}
URL: ${p.product_url || ''}
Imagem: ${p.image_url || ''}
${specs ? `Especificações:\n${specs}` : ''}
${benefits ? `Benefícios: ${benefits}` : ''}
${p.competitive_advantages ? `Diferenciais: ${p.competitive_advantages.substring(0, 200)}` : ''}`
      }).join('\n\n')

      // Build context for Clinical Brain Guard
      const firstProduct = products[0] ? mapProductToContext(products[0]) : {
        name: target.product_name || target.category_name || 'Equipamento odontológico',
        category: target.category_name || '',
      }

      const basePrompt = `Gere HTML completo de landing page SEO para venda online de ${target.category_name || 'equipamentos odontológicos'} para ${target.specialty} em ${target.city || ''}/${target.state_uf}.

EMPRESA: ${company?.company_name || 'Smart Dent'} — tecnologia odontológica digital, vende online para todo Brasil.
NÃO há loja física. FOCO: entrega rápida nacional, suporte técnico, autoridade técnica.
KEYWORD PRINCIPAL: ${target.focus_keyword || target.specialty}
ESPECIALIDADE ALVO: ${target.specialty}
TELEFONE: ${company?.contact_phone || ''}
SITE: ${company?.website_url || 'https://smartdent.com.br'}
INSTAGRAM: ${company?.instagram_profile || 'https://www.instagram.com/smartdentoficial/'}
YOUTUBE: ${company?.youtube_channel || 'https://www.youtube.com/@smartdentcadcam'}
DIFERENCIAIS EMPRESA: ${company?.differentiators || 'Suporte técnico especializado, treinamento incluso, entrega rápida'}
ENTREGA: ${company?.delivery_approach || 'Envio para todo Brasil com rastreamento'}

════════════════════════════════════
PRODUTOS REAIS DISPONÍVEIS (usar APENAS estes dados — NUNCA inventar produtos):
${productsText || 'NENHUM PRODUTO ENCONTRADO — usar apenas informações genéricas da categoria sem inventar specs'}
════════════════════════════════════

DEPOIMENTOS REAIS:
${reviewsText || 'Sem depoimentos disponíveis'}

REGRAS ABSOLUTAS:
- Usar APENAS os produtos listados acima com seus preços e specs EXATOS
- NUNCA inventar nomes de produtos, preços ou especificações
- NUNCA citar marcas concorrentes
- Se não há produtos listados, fazer uma página institucional SEM cards de produto
- Imagens: usar APENAS as URLs fornecidas acima em image_url

Estrutura obrigatória:
- <head> com title='${target.page_title || target.focus_keyword}', meta description='${target.meta_description || ''}', canonical
- Schema.org JSON-LD: Organization + Product (se houver produtos reais) + FAQPage
- <h1>: ${target.h1_text || target.focus_keyword}
- Seção hero: headline para ${target.specialty}, mencionando entrega em ${target.state_uf}
- Seção 'Por que a Smart Dent': 3 diferenciais reais (suporte técnico, entrega rápida, treinamento incluso)
- Seção produtos: cards com dados REAIS dos produtos fornecidos (nome, preço, specs, imagem real)
- Seção depoimentos: usar os depoimentos fornecidos acima
- Seção FAQ: 5 perguntas específicas para ${target.specialty} sobre ${target.category_name}
- CTA final com WhatsApp link (https://wa.me/5516993831794)
- Design: Tailwind CSS via CDN, cores #0ea5e9 (azul) e #1e293b (dark), mobile-first, responsivo
- NÃO incluir Google Maps embed (sem loja física)
- Links reais: Instagram, YouTube, site principal
Retorne APENAS o HTML completo, sem markdown.`

      // Inject Clinical Brain Guard
      const prompt = injectClinicalBrainGuard(basePrompt, firstProduct)

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
          products_matched: products.length,
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

/**
 * Extract a fuzzy keyword from category_name to match against products_repository.category
 * e.g. "Scanners Intraorais" → "scanner", "Impressoras 3D" → "impress"
 */
function extractCategoryKeyword(categoryName: string): string {
  if (!categoryName) return ''
  const lower = categoryName.toLowerCase()
  // Map known category names to DB category keywords
  const mappings: Record<string, string> = {
    'scanner': 'SCANNER',
    'impressora': 'IMPRESSÃO',
    'resina': 'RESINA',
    'software': 'SOFTWARE',
    'caracterização': 'CARACTERIZAÇÃO',
    'insumo': 'INSUMO',
    'pós-impressão': 'PÓS-IMPRESSÃO',
    'dentística': 'DENTÍSTICA',
    'curso': 'CURSO',
  }
  for (const [key, value] of Object.entries(mappings)) {
    if (lower.includes(key)) return value
  }
  // Fallback: first 4+ chars
  return categoryName.substring(0, Math.min(categoryName.length, 6))
}
