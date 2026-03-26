import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  type: 'products' | 'reviews' | 'testimonials' | 'kols' | 'company' | 'all'
  landingPageId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { type, landingPageId }: ExportRequest = await req.json()
    
    let csvContent = ''
    const timestamp = new Date().toISOString().split('T')[0]

    console.log(`📊 Exportando dados do tipo: ${type}`)

    switch (type) {
      case 'products':
        csvContent = await exportProducts(supabaseClient)
        break
      case 'reviews':
        csvContent = await exportReviews(supabaseClient, landingPageId)
        break
      case 'testimonials':
        csvContent = await exportTestimonials(supabaseClient, landingPageId)
        break
      case 'kols':
        csvContent = await exportKOLs(supabaseClient)
        break
      case 'company':
        csvContent = await exportCompanyProfile(supabaseClient)
        break
      case 'all':
        csvContent = await exportAll(supabaseClient, landingPageId)
        break
      default:
        throw new Error('Tipo de exportação inválido')
    }

    const filename = `${type}_repository_${timestamp}.csv`

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('❌ Erro na exportação:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function exportProducts(supabase: any): Promise<string> {
  console.log('📦 Exportando produtos...')
  
  const { data: products, error } = await supabase
    .from('products_repository')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  const headers = [
    'ID', 'Nome', 'Descrição', 'Preço', 'Moeda', 'Categoria', 'Subcategoria',
    'URL Produto', 'URL Imagem', 'Tags', 'Keywords', 'Benefits', 'Features',
    'Público Alvo', 'Search Intent Keywords', 'Market Keywords', 'Sales Pitch',
    'YouTube Videos', 'Instagram Videos', 'Technical Videos', 'Testimonial Videos',
    'Video Captions', 'Dados Originais', 'IA Categoria Gerada', 'IA Keywords Geradas', 
    'IA Benefits Gerados', 'Aprovado', 'Usar na IA', 'Ordem Exibição', 'Tipo Fonte', 
    'Landing Page Origem', 'Data Criação', 'Data Atualização',
    'E-commerce HTML Gerado', 'E-commerce Benefits IA', 'E-commerce Data Geração',
    'E-commerce Última Edição', 'E-commerce Opções Geração', 'E-commerce Modelo IA', 'E-commerce Versão'
  ]

  const rows = products.map((product: any) => [
    escapeCSV(product.id),
    escapeCSV(product.name),
    escapeCSV(product.description),
    product.price || '',
    escapeCSV(product.currency),
    escapeCSV(product.category),
    escapeCSV(product.subcategory),
    escapeCSV(product.product_url),
    escapeCSV(product.image_url),
    formatArray(product.tags),
    formatArray(product.keywords),
    formatArray(product.benefits),
    formatArray(product.features),
    formatArray(product.target_audience),
    formatArray(product.search_intent_keywords),
    formatArray(product.market_keywords),
    escapeCSV(product.sales_pitch),
    formatArray(product.youtube_videos),
    formatArray(product.instagram_videos),
    formatArray(product.technical_videos),
    formatArray(product.testimonial_videos),
    formatObject(product.video_captions),
    formatObject(product.original_data),
    product.ai_generated_category ? 'Sim' : 'Não',
    product.ai_generated_keywords ? 'Sim' : 'Não',
    product.ai_generated_benefits ? 'Sim' : 'Não',
    product.approved ? 'Sim' : 'Não',
    product.use_in_ai_generation ? 'Sim' : 'Não',
    product.display_order || '',
    escapeCSV(product.source_type),
    escapeCSV(product.source_landing_page_id),
    formatDate(product.created_at),
    formatDate(product.updated_at),
    // E-commerce fields
    product.ecommerce_html?.html_content ? 'Sim' : 'Não',
    formatArray(product.ecommerce_html?.generated_benefits),
    formatDate(product.ecommerce_html?.generated_at),
    formatDate(product.ecommerce_html?.last_edited_at),
    formatObject(product.ecommerce_html?.generation_options),
    escapeCSV(product.ecommerce_html?.ai_model_used),
    product.ecommerce_html?.version || ''
  ])

  return buildCSV(headers, rows)
}

async function exportReviews(supabase: any, landingPageId?: string): Promise<string> {
  console.log('⭐ Exportando reviews...')
  
  let query = supabase
    .from('manual_reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (landingPageId && landingPageId !== 'repository') {
    query = query.eq('landing_page_id', landingPageId)
  }

  const { data: reviews, error } = await query

  if (error) throw error

  const headers = [
    'ID', 'Landing Page', 'Nome Autor', 'Avaliação', 'Texto Review',
    'Aprovado', 'Data Criação', 'Data Atualização'
  ]

  const rows = reviews.map((review: any) => [
    escapeCSV(review.id),
    escapeCSV(review.landing_page_id),
    escapeCSV(review.author_name),
    review.rating,
    escapeCSV(review.review_text),
    review.approved ? 'Sim' : 'Não',
    formatDate(review.created_at),
    formatDate(review.updated_at)
  ])

  return buildCSV(headers, rows)
}

async function exportTestimonials(supabase: any, landingPageId?: string): Promise<string> {
  console.log('🎥 Exportando depoimentos...')
  
  let query = supabase
    .from('video_testimonials')
    .select('*')
    .order('created_at', { ascending: false })

  if (landingPageId && landingPageId !== 'repository') {
    query = query.eq('landing_page_id', landingPageId)
  }

  const { data: testimonials, error } = await query

  if (error) throw error

  const headers = [
    'ID', 'Landing Page', 'Nome Cliente', 'Profissão', 'Localização', 'Estado',
    'URL YouTube', 'URL Instagram', 'Texto Depoimento', 'Especialidade',
    'Keywords AI', 'Benefits AI', 'Score Sentimento', 'Aprovado', 'Ordem Exibição',
    'Data Criação', 'Data Atualização'
  ]

  const rows = testimonials.map((testimonial: any) => [
    escapeCSV(testimonial.id),
    escapeCSV(testimonial.landing_page_id),
    escapeCSV(testimonial.client_name),
    escapeCSV(testimonial.profession),
    escapeCSV(testimonial.location),
    escapeCSV(testimonial.state),
    escapeCSV(testimonial.youtube_url),
    escapeCSV(testimonial.instagram_url),
    escapeCSV(testimonial.testimonial_text),
    escapeCSV(testimonial.specialty),
    formatArray(testimonial.ai_keywords),
    formatArray(testimonial.ai_extracted_benefits),
    testimonial.sentiment_score || '',
    testimonial.approved ? 'Sim' : 'Não',
    testimonial.display_order || '',
    formatDate(testimonial.created_at),
    formatDate(testimonial.updated_at)
  ])

  return buildCSV(headers, rows)
}

async function exportKOLs(supabase: any): Promise<string> {
  console.log('👨‍⚕️ Exportando KOLs...')
  
  const { data: kols, error } = await supabase
    .from('key_opinion_leaders')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false })

  if (error) throw error

  const headers = [
    'ID', 'Nome Completo', 'URL Foto', 'Mini CV', 'Especialidade',
    'URL Lattes', 'Website', 'Instagram', 'YouTube',
    'Aprovado', 'Ordem Exibição', 'Data Criação', 'Data Atualização'
  ]

  const rows = kols.map((kol: any) => [
    escapeCSV(kol.id),
    escapeCSV(kol.full_name),
    escapeCSV(kol.photo_url),
    escapeCSV(kol.mini_cv),
    escapeCSV(kol.specialty),
    escapeCSV(kol.lattes_url),
    escapeCSV(kol.website_url),
    escapeCSV(kol.instagram_url),
    escapeCSV(kol.youtube_url),
    kol.approved ? 'Sim' : 'Não',
    kol.display_order || '',
    formatDate(kol.created_at),
    formatDate(kol.updated_at)
  ])

  return buildCSV(headers, rows)
}

async function exportCompanyProfile(supabase: any): Promise<string> {
  console.log('🏢 Exportando perfil da empresa...')
  
  const { data: company, error } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const headers = [
    'ID', 'User ID', 'Nome da Empresa', 'Descrição', 'Setor', 'Missão', 'Visão', 'Valores',
    'Público Alvo', 'Diferenciais', 'Website', 'Ano Fundação', 'Tamanho Equipe', 
    'Principais Produtos/Serviços', 'Email Contato', 'Telefone Contato',
    'Endereço', 'Número', 'Cidade', 'Estado', 'CEP', 'País', 'Localização Legado',
    'YouTube Verificado', 'Instagram Verificado', 'Metodologia Trabalho', 
    'Abordagem Entrega', 'Cultura Empresa',
    'SEO Posicionamento Mercado', 'SEO Vantagens Competitivas', 'SEO Expertise Técnica',
    'SEO Áreas Serviço', 'SEO Keywords Contexto', 'SEO Domínios',
    'Rodapé YouTube', 'Redes Sociais', 'Hashtags Redes Sociais', 'Handles Redes Sociais',
    'Tags YouTube', 'Links Institucionais', 'Vídeos Empresa', 'Reviews Empresa',
    'GTM ID', 'Meta Pixel ID', 'TikTok Pixel ID', 'Google Analytics ID',
    'Logo URL', 'Logo Supabase Path',
    'Data Criação', 'Data Atualização'
  ]

  const row = [
    escapeCSV(company.id),
    escapeCSV(company.user_id),
    escapeCSV(company.company_name),
    escapeCSV(company.company_description),
    escapeCSV(company.business_sector),
    escapeCSV(company.mission_statement),
    escapeCSV(company.vision_statement),
    escapeCSV(company.brand_values),
    escapeCSV(company.target_audience),
    escapeCSV(company.differentiators),
    escapeCSV(company.website_url),
    company.founded_year || '',
    escapeCSV(company.team_size),
    escapeCSV(company.main_products_services),
    escapeCSV(company.contact_email),
    escapeCSV(company.contact_phone),
    escapeCSV(company.street_address),
    escapeCSV(company.address_number),
    escapeCSV(company.city),
    escapeCSV(company.state),
    escapeCSV(company.postal_code),
    escapeCSV(company.country),
    escapeCSV(company.location),
    company.youtube_verified ? 'Sim' : 'Não',
    company.instagram_verified ? 'Sim' : 'Não',
    escapeCSV(company.working_methodology),
    escapeCSV(company.delivery_approach),
    escapeCSV(company.company_culture),
    escapeCSV(company.seo_market_positioning),
    escapeCSV(company.seo_competitive_advantages),
    escapeCSV(company.seo_technical_expertise),
    escapeCSV(company.seo_service_areas),
    formatArray(company.seo_context_keywords),
    formatArray(company.seo_domains),
    escapeCSV(company.youtube_company_footer),
    formatObject(company.social_media_links),
    formatArray(company.social_media_hashtags),
    formatArray(company.social_media_handles),
    formatArray(company.youtube_tags),
    formatObject(company.institutional_links),
    formatObject(company.company_videos),
    formatObject(company.company_reviews),
    escapeCSV(company.tracking_pixels?.google_tag_manager_id),
    escapeCSV(company.tracking_pixels?.meta_pixel_id),
    escapeCSV(company.tracking_pixels?.tiktok_pixel_id),
    escapeCSV(company.tracking_pixels?.google_analytics_id),
    escapeCSV(company.company_logo_url),
    escapeCSV(company.company_logo_supabase_path),
    formatDate(company.created_at),
    formatDate(company.updated_at)
  ]

  return buildCSV(headers, [row])
}

async function exportAll(supabase: any, landingPageId?: string): Promise<string> {
  console.log('📊 Exportando todos os dados...')
  
  const [company, products, reviews, testimonials, kols] = await Promise.all([
    exportCompanyProfile(supabase),
    exportProducts(supabase),
    exportReviews(supabase, landingPageId),
    exportTestimonials(supabase, landingPageId),
    exportKOLs(supabase)
  ])

  return [
    '=== PERFIL DA EMPRESA ===',
    company,
    '',
    '=== PRODUTOS ===',
    products,
    '',
    '=== REVIEWS ===',
    reviews,
    '',
    '=== DEPOIMENTOS ===',
    testimonials,
    '',
    '=== ESPECIALISTAS (KOLs) ===',
    kols
  ].join('\n')
}

function buildCSV(headers: string[], rows: any[][]): string {
  const csvRows = [headers, ...rows]
  return '\ufeff' + csvRows.map(row => row.join(',')).join('\n')
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatArray(arr: any): string {
  if (!arr || !Array.isArray(arr)) return ''
  return escapeCSV(arr.join('; '))
}

function formatObject(obj: any): string {
  if (!obj || typeof obj !== 'object') return ''
  if (Array.isArray(obj)) return formatArray(obj)
  return escapeCSV(JSON.stringify(obj, null, 0))
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('pt-BR')
}