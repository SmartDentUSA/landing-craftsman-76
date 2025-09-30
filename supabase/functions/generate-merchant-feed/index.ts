const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use native fetch instead of Supabase client to avoid dependency issues
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    console.log('🛒 Generating Google Merchant feed...')

    // Fetch company profile
    const companyResponse = await fetch(`${supabaseUrl}/rest/v1/company_profile?select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    })

    const companyData = await companyResponse.json()
    const companyProfile = companyData?.[0] || {}

    // Fetch approved products
    const productsResponse = await fetch(`${supabaseUrl}/rest/v1/products_repository?approved=eq.true&order=display_order.asc&select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    })

    const products = await productsResponse.json()

    if (!Array.isArray(products)) {
      throw new Error('Failed to fetch products')
    }

    console.log(`📦 Found ${products.length} approved products`)

    const baseUrl = companyProfile?.website_url || 'https://example.com'
    const companyName = companyProfile?.company_name || 'Loja'
    const companyDescription = companyProfile?.company_description || 'Produtos de qualidade'

    // Generate XML feed
    const xmlFeed = generateMerchantFeed(products, baseUrl, companyName, companyDescription)

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Failed to generate merchant feed', details: errorMessage }),
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
  const availability = product.availability || 'in stock'
  const price = product.price ? `${product.price} ${product.currency || 'BRL'}` : '0 BRL'
  const promoPrice = product.promo_price
  const brand = product.brand || extractBrandFromName(product.name) || 'Marca'
  const condition = product.condition || 'new'
  const category = product.category || 'Geral'
  const productType = `${product.category || 'Geral'}${product.subcategory ? ' > ' + product.subcategory : ''}`

  // 🔥 PRIORIZAR campos dedicados > original_data
  const gtin = product.gtin || extractGTIN(product.original_data)
  const ean = product.ean || product.original_data?.ean
  const mpn = product.mpn || extractMPN(product.original_data) || productId
  const color = product.color ? escapeXML(product.color) : ''
  const size = product.size ? escapeXML(product.size) : ''
  const material = product.material ? escapeXML(product.material) : ''

  const availabilityStatus = availability.includes('stock') ? 'in_stock' : 'out_of_stock'

  return `
    <item>
      <g:id>${escapeXML(productId)}</g:id>
      <g:title>${escapeXML(title.substring(0, 150))}</g:title>
      <g:description>${escapeXML(description.substring(0, 5000))}</g:description>
      <g:link>${escapeXML(link)}</g:link>
      <g:image_link>${escapeXML(imageLink)}</g:image_link>
      <g:availability>${availabilityStatus}</g:availability>
      <g:price>${escapeXML(price)}</g:price>
      ${promoPrice && promoPrice < product.price ? `<g:sale_price>${promoPrice} ${product.currency || 'BRL'}</g:sale_price>` : ''}
      <g:brand>${brand}</g:brand>
      <g:condition>${condition}</g:condition>
      ${gtin ? `<g:gtin>${escapeXML(gtin)}</g:gtin>` : ''}
      ${ean ? `<g:ean>${escapeXML(ean)}</g:ean>` : ''}
      <g:mpn>${escapeXML(mpn)}</g:mpn>
      ${color ? `<g:color>${color}</g:color>` : ''}
      ${size ? `<g:size>${size}</g:size>` : ''}
      ${material ? `<g:material>${material}</g:material>` : ''}
      <g:google_product_category>${escapeXML(mapToGoogleCategory(category))}</g:google_product_category>
      <g:product_type>${escapeXML(productType)}</g:product_type>
      ${product.features && product.features.length > 0 ? 
        product.features.slice(0, 3).map((feature: string, index: number) => 
          `<g:custom_label_${index}>${escapeXML(feature.substring(0, 100))}</g:custom_label_${index}>`
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
  
  // Try to extract brand from product name
  const words = name.split(' ')
  return words[0] || 'Marca'
}

function extractGTIN(originalData: any): string | null {
  if (!originalData) return null
  
  try {
    // Search for GTIN, EAN, UPC in original data
    const data = typeof originalData === 'string' ? JSON.parse(originalData) : originalData
    return data?.gtin || data?.ean || data?.upc || null
  } catch {
    return null
  }
}

function extractMPN(originalData: any): string | null {
  if (!originalData) return null
  
  try {
    const data = typeof originalData === 'string' ? JSON.parse(originalData) : originalData
    return data?.mpn || data?.sku || data?.model || null
  } catch {
    return null
  }
}

function mapToGoogleCategory(category: string): string {
  // Basic mapping to Google Product Categories
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
  
  return 'Health & Beauty > Health Care' // Default for dentistry
}