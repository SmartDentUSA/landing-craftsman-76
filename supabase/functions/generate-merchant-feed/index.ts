import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    console.log('🛒 Generating Google Merchant feed...')

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch company profile
    const { data: companyData, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single()

    if (companyError) {
      console.error('❌ Error fetching company profile:', companyError)
    }

    const companyProfile = companyData || {}

    // Fetch approved products
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true })

    if (productsError) {
      console.error('❌ Error fetching products:', productsError)
      throw new Error('Failed to fetch products')
    }

    if (!products || !Array.isArray(products)) {
      throw new Error('No products found')
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

  // ✨ FASE 3: Processar produtos + variações
  const allItems: string[] = []
  
  products.forEach(product => {
    // Produto principal
    allItems.push(generateMerchantItem(product, baseUrl))
    
    // Variações (se existirem)
    if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
      product.variations.forEach((variation: any, index: number) => {
        allItems.push(generateVariationItem(product, variation, index, baseUrl))
      })
    }
  })

  const feedFooter = `
  </channel>
</rss>`

  return feedHeader + allItems.join('\n') + feedFooter
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

// ✨ FASE 3: Gerar item de variação do produto
function generateVariationItem(product: any, variation: any, index: number, baseUrl: string): string {
  const parentId = product.id
  const variationId = `${parentId}-var-${index}`
  const title = `${product.name} - ${variation.name || `Variação ${index + 1}`}`
  const description = product.description || product.sales_pitch || 'Variação do produto'
  const link = product.product_url || `${baseUrl}/produto/${parentId}#variation-${index}`
  const imageLink = variation.image_url || product.image_url || `${baseUrl}/images/placeholder.jpg`
  
  // Preço da variação (ou do produto pai)
  const price = variation.price || product.price || 0
  const promoPrice = variation.promo_price || product.promo_price
  
  // Disponibilidade baseada no estoque da variação
  const stock = variation.stock || 0
  const availabilityStatus = stock > 0 ? 'in_stock' : 'out_of_stock'
  
  // Atributos da variação
  const color = variation.color ? escapeXML(variation.color) : (product.color ? escapeXML(product.color) : '')
  const size = variation.size ? escapeXML(variation.size) : (product.size ? escapeXML(product.size) : '')
  const material = variation.material ? escapeXML(variation.material) : (product.material ? escapeXML(product.material) : '')
  
  // Herdar GTIN/MPN/Brand do produto pai
  const gtin = product.gtin || extractGTIN(product.original_data)
  const ean = product.ean || product.original_data?.ean
  const mpn = product.mpn || extractMPN(product.original_data) || parentId
  const brand = product.brand || extractBrandFromName(product.name) || 'Marca'
  const condition = product.condition || 'new'
  const category = product.category || 'Geral'
  const productType = `${product.category || 'Geral'}${product.subcategory ? ' > ' + product.subcategory : ''}`

  return `
    <item>
      <g:id>${escapeXML(variationId)}</g:id>
      <g:item_group_id>${escapeXML(parentId)}</g:item_group_id>
      <g:title>${escapeXML(title.substring(0, 150))}</g:title>
      <g:description>${escapeXML(description.substring(0, 5000))}</g:description>
      <g:link>${escapeXML(link)}</g:link>
      <g:image_link>${escapeXML(imageLink)}</g:image_link>
      <g:availability>${availabilityStatus}</g:availability>
      <g:price>${price} ${product.currency || 'BRL'}</g:price>
      ${promoPrice && promoPrice < price ? `<g:sale_price>${promoPrice} ${product.currency || 'BRL'}</g:sale_price>` : ''}
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