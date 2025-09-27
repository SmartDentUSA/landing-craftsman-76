import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log('🛒 Generating Google Merchant feed...')

    // Buscar dados da empresa
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .single()

    // Buscar produtos aprovados
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true })

    if (productsError) {
      console.error('Error fetching products:', productsError)
      throw productsError
    }

    console.log(`📦 Found ${products?.length || 0} approved products`)

    const baseUrl = companyProfile?.website_url || 'https://example.com'
    const companyName = companyProfile?.company_name || 'Loja'
    const companyDescription = companyProfile?.company_description || 'Produtos de qualidade'

    // Gerar feed XML
    const xmlFeed = generateMerchantFeed(products || [], baseUrl, companyName, companyDescription)

    console.log('✅ Google Merchant feed generated successfully')

    return new Response(xmlFeed, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="merchant-feed.xml"'
      }
    })

  } catch (error) {
    console.error('❌ Error generating merchant feed:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate merchant feed', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateMerchantFeed(products: any[], baseUrl: string, companyName: string, companyDescription: string): string {
  const feedHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXML(companyName)} - Google Merchant Feed</title>
    <link>${escapeXML(baseUrl)}</link>
    <description>${escapeXML(companyDescription)}</description>`

  const items = products.map(product => generateMerchantItem(product, baseUrl)).join('\n')

  const feedFooter = `
  </channel>
</rss>`

  return feedHeader + items + feedFooter
}

function generateMerchantItem(product: any, baseUrl: string): string {
  const productId = product.id
  const title = product.name || 'Produto'
  const description = product.description || product.sales_pitch || 'Produto de qualidade'
  const link = product.product_url || `${baseUrl}/produto/${productId}`
  const imageLink = product.image_url || `${baseUrl}/images/placeholder.jpg`
  const availability = 'in stock'
  const price = product.price ? `${product.price} ${product.currency || 'BRL'}` : '0 BRL'
  const brand = extractBrandFromName(product.name) || 'Marca'
  const condition = 'new'
  const category = product.category || 'Geral'
  const productType = `${product.category || 'Geral'}${product.subcategory ? ' > ' + product.subcategory : ''}`

  // Extrair GTIN/UPC se disponível nos dados originais
  const gtin = extractGTIN(product.original_data)
  const mpn = extractMPN(product.original_data) || productId

  return `
    <item>
      <g:id>${escapeXML(productId)}</g:id>
      <g:title>${escapeXML(title.substring(0, 150))}</g:title>
      <g:description>${escapeXML(description.substring(0, 5000))}</g:description>
      <g:link>${escapeXML(link)}</g:link>
      <g:image_link>${escapeXML(imageLink)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${escapeXML(price)}</g:price>
      <g:brand>${escapeXML(brand)}</g:brand>
      <g:condition>${condition}</g:condition>
      <g:google_product_category>${escapeXML(mapToGoogleCategory(category))}</g:google_product_category>
      <g:product_type>${escapeXML(productType)}</g:product_type>
      ${gtin ? `<g:gtin>${escapeXML(gtin)}</g:gtin>` : ''}
      <g:mpn>${escapeXML(mpn)}</g:mpn>
      ${product.features && product.features.length > 0 ? 
        product.features.slice(0, 3).map((feature: string) => 
          `<g:custom_label_${product.features.indexOf(feature)}>${escapeXML(feature.substring(0, 100))}</g:custom_label_${product.features.indexOf(feature)}>`
        ).join('\n      ') : ''
      }
    </item>`
}

function escapeXML(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function extractBrandFromName(name: string): string {
  if (!name) return 'Marca'
  
  // Tentar extrair marca do nome do produto
  const words = name.split(' ')
  return words[0] || 'Marca'
}

function extractGTIN(originalData: any): string | null {
  if (!originalData) return null
  
  // Buscar por GTIN, EAN, UPC nos dados originais
  const data = typeof originalData === 'string' ? JSON.parse(originalData) : originalData
  
  return data?.gtin || data?.ean || data?.upc || null
}

function extractMPN(originalData: any): string | null {
  if (!originalData) return null
  
  const data = typeof originalData === 'string' ? JSON.parse(originalData) : originalData
  
  return data?.mpn || data?.sku || data?.model || null
}

function mapToGoogleCategory(category: string): string {
  // Mapeamento básico para Google Product Categories
  const categoryMap: { [key: string]: string } = {
    'odontologia': 'Health & Beauty > Health Care',
    'equipamentos': 'Business & Industrial > Medical',
    'instrumentos': 'Business & Industrial > Medical',
    'materiais': 'Health & Beauty > Health Care',
    'consumo': 'Health & Beauty > Health Care',
    'higiene': 'Health & Beauty > Personal Care',
    'beleza': 'Health & Beauty > Personal Care',
    'tecnologia': 'Electronics',
    'software': 'Software',
    'cursos': 'Media > Books',
    'treinamento': 'Media > Books'
  }

  const lowerCategory = category.toLowerCase()
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerCategory.includes(key)) {
      return value
    }
  }
  
  return 'Health & Beauty > Health Care' // Default para odontologia
}