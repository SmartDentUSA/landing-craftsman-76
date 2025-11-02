import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration - Official Loja Integrada API (https://lojaintegrada.docs.apiary.io)
const LOJA_INTEGRADA_API_BASE = 'https://api.awsli.com.br/v1';
const RATE_LIMIT_DELAY = 800; // 800ms between requests
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 0.5; // 50% failure rate
const CIRCUIT_BREAKER_WINDOW = 10; // Last 10 requests

interface CircuitBreakerState {
  failures: number;
  successes: number;
  totalRequests: number;
  isOpen: boolean;
  openedAt?: number;
  resetTimeout: number; // 30 seconds
}

interface ProductData {
  id?: string;
  nome: string;
  descricao_completa?: string;
  preco_cheio: number;
  preco_promocional?: number;
  peso?: number;
  largura?: number;
  altura?: number;
  profundidade?: number;
  sku?: string;
  mpn?: string;
  ncm?: string;
  marca?: { nome: string };
  categorias?: Array<{ nome: string; nivel: number }>;
  imagens?: Array<{
    url: string;
    thumbnail?: string;
    media?: string;
    grande?: string;
    ordem?: number;
  }>;
  variacoes?: Array<{
    sku: string;
    nome: string;
    preco?: number;
    quantidade_disponivel?: number;
  }>;
  estoque_gerenciado: boolean;
  quantidade_disponivel?: number;
  disponivel: boolean;
  sob_consulta?: boolean;
  url_video_youtube?: string;
  tags?: string[];
  data_criacao?: string;
  data_ultima_modificacao?: string;
  tipo?: string; // 'produto' | 'atributo_opcao' (variação)
  pai?: string; // URI do produto pai (ex: /api/v1/produto/123)
}

// Circuit breaker state (in-memory, resets on cold start)
let circuitBreaker: CircuitBreakerState = {
  failures: 0,
  successes: 0,
  totalRequests: 0,
  isOpen: false,
  resetTimeout: 30000,
};

function updateCircuitBreaker(success: boolean) {
  circuitBreaker.totalRequests++;
  
  if (success) {
    circuitBreaker.successes++;
  } else {
    circuitBreaker.failures++;
  }

  // Keep only last N requests in calculation
  if (circuitBreaker.totalRequests > CIRCUIT_BREAKER_WINDOW) {
    circuitBreaker.totalRequests = CIRCUIT_BREAKER_WINDOW;
    circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
    circuitBreaker.successes = Math.max(0, circuitBreaker.successes - 1);
  }

  // Calculate failure rate
  const failureRate = circuitBreaker.failures / circuitBreaker.totalRequests;

  // Open circuit if failure rate exceeds threshold
  if (failureRate >= CIRCUIT_BREAKER_THRESHOLD && circuitBreaker.totalRequests >= 5) {
    circuitBreaker.isOpen = true;
    circuitBreaker.openedAt = Date.now();
    console.warn(`🔴 Circuit breaker OPENED - Failure rate: ${(failureRate * 100).toFixed(1)}%`);
  }

  // Try to close circuit after timeout
  if (circuitBreaker.isOpen && circuitBreaker.openedAt) {
    const timeOpen = Date.now() - circuitBreaker.openedAt;
    if (timeOpen > circuitBreaker.resetTimeout) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      circuitBreaker.successes = 0;
      circuitBreaker.totalRequests = 0;
      console.log('🟢 Circuit breaker CLOSED - Attempting recovery');
    }
  }
}

function isCircuitOpen(): boolean {
  // Check if we should attempt to close the circuit
  if (circuitBreaker.isOpen && circuitBreaker.openedAt) {
    const timeOpen = Date.now() - circuitBreaker.openedAt;
    if (timeOpen > circuitBreaker.resetTimeout) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      circuitBreaker.successes = 0;
      circuitBreaker.totalRequests = 0;
      console.log('🟢 Circuit breaker auto-reset after timeout');
      return false;
    }
  }
  return circuitBreaker.isOpen;
}

// Manual circuit breaker reset function
export function resetCircuitBreaker(): void {
  circuitBreaker.isOpen = false;
  circuitBreaker.failures = 0;
  circuitBreaker.successes = 0;
  circuitBreaker.totalRequests = 0;
  circuitBreaker.openedAt = undefined;
  console.log('🔄 Circuit breaker manually reset');
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Consider 429 (rate limit) as retriable
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_RETRY_DELAY * Math.pow(2, i);
        console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${retries}`);
        await delay(waitTime);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, i);
        console.log(`⚠️ Request failed. Retrying in ${waitTime}ms (${i + 1}/${retries})`);
        await delay(waitTime);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

async function fetchFromLojaIntegradaAPI(
  apiKey: string,
  appKey: string,
  endpoint: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Check circuit breaker
  if (isCircuitOpen()) {
    console.warn('⚠️ Circuit breaker is OPEN - Skipping API call');
    return {
      success: false,
      error: 'Circuit breaker is open. API temporarily disabled due to high failure rate.',
    };
  }

  const startTime = Date.now();

  try {
    // Build URL with authentication query parameters (as per Loja Integrada docs)
    const baseUrl = `${LOJA_INTEGRADA_API_BASE}${endpoint}`;
    const authParams = `chave_api=${encodeURIComponent(apiKey)}&chave_aplicacao=${encodeURIComponent(appKey)}`;
    const url = baseUrl.includes('?') ? `${baseUrl}&${authParams}` : `${baseUrl}?${authParams}`;
    
    console.log(`📡 API Base URL: ${LOJA_INTEGRADA_API_BASE}`);
    console.log(`📋 Endpoint: ${endpoint}`);
    console.log(`🔑 Auth: chave_api + chave_aplicacao`);

    const response = await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function',
        },
      }
    );

    const responseTime = Date.now() - startTime;
    console.log(`✅ API Response: ${response.status} (${responseTime}ms)`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📋 Request URL (sem chaves): ${LOJA_INTEGRADA_API_BASE}${endpoint}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      updateCircuitBreaker(false);
      return {
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
      };
    }

    // Validar content-type antes de fazer parse
    const contentType = response.headers.get('content-type');
    console.log(`📋 Response content-type: ${contentType}`);
    
    const responseText = await response.text();
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Invalid content-type: ${contentType}`);
      console.error(`📄 Response body preview: ${responseText.substring(0, 120)}...`);
      updateCircuitBreaker(false);
      return {
        success: false,
        error: `API returned non-JSON response (${contentType}). Preview: ${responseText.substring(0, 100)}`,
      };
    }
    
    // Validar se é JSON válido antes de fazer parse
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ JSON Parse Error:`, parseError);
      console.error(`Response text (first 500 chars):`, responseText.substring(0, 500));
      updateCircuitBreaker(false);
      return {
        success: false,
        error: `Invalid JSON response from API. Received: ${responseText.substring(0, 100)}...`,
      };
    }
    updateCircuitBreaker(true);

    return { success: true, data };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ API Request failed after ${responseTime}ms:`, error);
    updateCircuitBreaker(false);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function fallbackToWebScraping(
  supabaseUrl: string,
  supabaseKey: string,
  productUrl: string
): Promise<{ success: boolean; data?: any; error?: string; li_product_id?: string }> {
  console.log('🔄 Falling back to web scraping for URL:', productUrl);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase.functions.invoke('extract-product-data', {
      body: { url: productUrl },
    });

    if (error) {
      console.error('❌ Web scraping fallback failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Web scraping fallback successful');
    // Unwrap nested data structure if present and extract li_product_id
    const unwrappedData = data?.data ?? data;
    const li_product_id = data?.li_product_id;
    
    if (li_product_id) {
      console.log(`🆔 Extracted Loja Integrada product ID: ${li_product_id}`);
    }
    
    return { success: true, data: unwrappedData, li_product_id };
  } catch (error) {
    console.error('❌ Web scraping fallback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Extract product ID from Loja Integrada URI
function extractIdFromUri(uri: string): string | null {
  if (!uri) return null;
  // Match patterns like: /api/v1/produto/123456 or /produto/123456
  const match = uri.match(/\/produto\/(\d+)/);
  return match ? match[1] : null;
}

// Fetch parent product for variations
async function fetchParentProduct(
  apiKey: string,
  appKey: string,
  parentUri: string // Ex: "/api/v1/produto/351902699"
): Promise<ProductData | null> {
  try {
    // 🔧 Sanitize URI: remove /api/v1 e trailing slashes
    const endpoint = parentUri
      .replace(/^\/api\/v1\/?/, '/')  // Remove /api/v1 ou /api/v1/
      .replace(/\/$/, '');             // Remove trailing slash

    console.log(`📞 Fetching parent product`);
    console.log(`   Original URI: ${parentUri}`);
    console.log(`   Sanitized endpoint: ${endpoint}`);
    
    const result = await fetchFromLojaIntegradaAPI(apiKey, appKey, endpoint);
    
    if (result.success && result.data) {
      console.log(`✅ Parent product fetched successfully:`);
      console.log(`   Name: ${result.data.nome || 'NO NAME'}`);
      console.log(`   Variations: ${result.data.variacoes?.length || 0}`);
      console.log(`   Images: ${result.data.imagens?.length || 0}`);
      console.log(`   Categories: ${result.data.categorias?.length || 0}`);
      console.log(`   Has variacoes field: ${!!result.data.variacoes}`);
      return result.data;
    }
    
    // 🔍 Log detalhado da falha
    console.error(`❌ Failed to fetch parent product:`);
    console.error(`   URI: ${parentUri}`);
    console.error(`   Endpoint: ${endpoint}`);
    console.error(`   Success: ${result.success}`);
    console.error(`   Has data: ${!!result.data}`);
    console.error(`   Error: ${result.error || 'No error message'}`);
    return null;
  } catch (error) {
    console.error(`❌ Exception fetching parent product:`);
    console.error(`   URI: ${parentUri}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return null;
  }
}

// Extract visual attributes from variations array
function extractAttributesFromVariations(variacoes: any[]): {
  color: string | null;
  size: string | null;
  material: string | null;
} {
  if (!Array.isArray(variacoes) || variacoes.length === 0) {
    return { color: null, size: null, material: null };
  }

  // Search for variation patterns: "Cor: Azul", "Tamanho: G", etc.
  const colorMatch = variacoes.find(v => 
    v.nome?.toLowerCase().includes('cor') || 
    v.nome?.toLowerCase().includes('color')
  );
  const sizeMatch = variacoes.find(v => 
    v.nome?.toLowerCase().includes('tamanho') || 
    v.nome?.toLowerCase().includes('tam') ||
    v.nome?.toLowerCase().includes('size')
  );
  const materialMatch = variacoes.find(v => 
    v.nome?.toLowerCase().includes('material')
  );

  return {
    color: colorMatch?.nome?.split(':')[1]?.trim() || null,
    size: sizeMatch?.nome?.split(':')[1]?.trim() || null,
    material: materialMatch?.nome?.split(':')[1]?.trim() || null,
  };
}

async function mapAPIProductToRepository(apiProduct: ProductData, apiKey?: string, appKey?: string): Promise<any> {
  // Detect if this is a variation/child product
  const isVariation = !!apiProduct.pai; // Apenas verificar se tem pai, ignorar tipo
  const parentProductUri = apiProduct.pai;

  console.log(`🔍 Product type: ${apiProduct.tipo || 'not specified'}, Is variation: ${isVariation}`);
  if (isVariation && parentProductUri) {
    console.log(`👨‍👦 This is a child product. Parent: ${parentProductUri}`);
  }

  // ✅ BUSCAR PRODUTO PAI se existir (independente do tipo)
  let parentProduct: ProductData | null = null;
  if (parentProductUri && apiKey && appKey) {
    console.log(`🔄 Child product detected`);
    console.log(`   tipo: "${apiProduct.tipo || 'missing'}"`);
    console.log(`   pai: ${parentProductUri}`);
    
    parentProduct = await fetchParentProduct(apiKey, appKey, parentProductUri);
    
    if (parentProduct) {
      console.log(`✅ Parent product fetched successfully`);
      console.log(`   Name: ${parentProduct.nome}`);
      console.log(`   Variations: ${parentProduct.variacoes?.length || 0}`);
      
      // 🚨 CRITICAL: Se parent não trouxer variações, buscar explicitamente
      if (!parentProduct.variacoes || parentProduct.variacoes.length === 0) {
        const parentId = parentProduct.id || extractIdFromUri(parentProduct.resource_uri || parentProductUri);
        
        if (parentId) {
          console.log(`📞 Parent has no embedded variations, fetching /produto/${parentId}/variacao`);
          
          try {
            const variationsResult = await fetchFromLojaIntegradaAPI(
              apiKey,
              appKey,
              `/produto/${parentId}/variacao`
            );
            
            if (variationsResult.success && variationsResult.data?.objects) {
              parentProduct.variacoes = variationsResult.data.objects;
              console.log(`✅ Loaded ${variationsResult.data.objects.length} variations from dedicated endpoint`);
            } else {
              console.warn(`⚠️ Failed to fetch variations: ${variationsResult.error || 'Unknown error'}`);
            }
          } catch (e) {
            console.error(`❌ Exception fetching variations: ${e.message}`);
          }
        } else {
          console.warn(`⚠️ Could not extract parent ID from: ${parentProduct.resource_uri || parentProductUri}`);
        }
      } else {
        console.log(`✅ Parent already has ${parentProduct.variacoes.length} embedded variations`);
      }
      
      // Merge: pai tem prioritário para nome, descrição, categorias, imagens, variacoes
      // Filhos têm prioritário para preços e SKU
      apiProduct = {
        ...parentProduct,
        preco_cheio: apiProduct.preco_cheio ?? parentProduct.preco_cheio,
        preco_promocional: apiProduct.preco_promocional ?? parentProduct.preco_promocional,
        sku: apiProduct.sku,
        variacoes: parentProduct.variacoes, // ✅ Array completo de variações
        resource_uri: apiProduct.resource_uri,
        tipo: apiProduct.tipo,
        pai: apiProduct.pai,
      } as ProductData;
      
      console.log(`✅ Parent merge complete:`);
      console.log(`   Final name: ${apiProduct.nome || 'NO NAME'}`);
      console.log(`   Final variations: ${apiProduct.variacoes?.length || 0}`);
      console.log(`   Final images: ${apiProduct.imagens?.length || 0}`);
      console.log(`   Final categories: ${apiProduct.categorias?.length || 0}`);
    } else {
      console.error(`❌ Parent product fetch returned NULL for: ${parentProductUri}`);
    }
  }

  // Extract visual attributes from variations
  const extractedAttributes = extractAttributesFromVariations(apiProduct.variacoes);
  console.log(`🎨 Extracted attributes:`, extractedAttributes);

  // Safe fallbacks for potentially missing fields
  const name = apiProduct.nome?.trim() || 'Produto sem nome';
  const price = apiProduct.preco_cheio ?? apiProduct.preco_promocional ?? 0;
  const description = apiProduct.descricao_completa?.trim() || apiProduct.descricao?.trim() || '';
  const category = apiProduct.categorias?.[0]?.nome?.trim() || 'Sem categoria';
  const brand = apiProduct.marca?.nome?.trim() || '';
  
  console.log(`🔍 Mapping product: "${name}"`);
  
  // Ensure images and categories come from parent if this is a variation
  const images = Array.isArray(apiProduct.imagens) && apiProduct.imagens.length > 0
    ? apiProduct.imagens
    : [];
  const categories = Array.isArray(apiProduct.categorias) && apiProduct.categorias.length > 0
    ? apiProduct.categorias
    : [];
  console.log(`📊 API Product data available:`, {
    nome: !!apiProduct.nome,
    preco_cheio: !!apiProduct.preco_cheio,
    preco_promocional: !!apiProduct.preco_promocional,
    categorias: apiProduct.categorias?.length || 0,
    imagens: apiProduct.imagens?.length || 0,
    variacoes: apiProduct.variacoes?.length || 0,
    disponivel: apiProduct.disponivel,
    quantidade_disponivel: apiProduct.quantidade_disponivel
  });

  // Enhanced stock control - cross-check disponivel and quantidade_disponivel
  let availability = 'in_stock';
  if (!apiProduct.disponivel || (apiProduct.quantidade_disponivel !== undefined && apiProduct.quantidade_disponivel <= 0)) {
    availability = 'out_of_stock';
    console.log(`📦 Product out of stock - disponivel: ${apiProduct.disponivel}, quantidade: ${apiProduct.quantidade_disponivel}`);
  }

  // Multiple categories mapping
  const allCategories = categories.map(cat => ({
    name: cat.nome,
    level: cat.nivel
  }));
  console.log(`📁 Categories mapped: ${allCategories.length} categories`);

  // Log fields that need manual population
  const manualFields = [];
  if (!apiProduct.ncm) manualFields.push('EAN');
  manualFields.push('GTIN'); // Always manual
  manualFields.push('Categoria Google'); // Always manual
  if (!extractedAttributes.color) manualFields.push('Cor');
  if (!extractedAttributes.size) manualFields.push('Tamanho');
  if (!extractedAttributes.material) manualFields.push('Material');

  if (manualFields.length > 0) {
    console.log(`⚠️ Campos que precisam ser preenchidos manualmente: ${manualFields.join(', ')}`);
  }

  // ✅ FASE 2: Garantir que TODOS os campos do DB estejam presentes (mesmo que null)
  const mapped: any = {
    // Core fields from API (using safe fallbacks)
    name,
    price,
    promo_price: apiProduct.preco_promocional || null,
    description,
    currency: 'BRL',
    
    // Physical specifications from API
    weight: apiProduct.peso || null,
    width: apiProduct.largura || null,
    height: apiProduct.altura || null,
    depth: apiProduct.profundidade || null,
    
    // Identifiers from API
    sku: apiProduct.sku || null,
    mpn: apiProduct.mpn || null,
    ncm: apiProduct.ncm || null,
    ean: null, // API não fornece EAN - deve ser preenchido manualmente
    gtin: null, // API não fornece GTIN - deve ser preenchido manualmente
    
    // Brand and category from API (using safe fallbacks)
    brand,
    category,
    subcategory: null,
    all_categories: allCategories,
    store_category: null,
    google_product_category: null,
    
    // Enhanced stock control
    condition: 'new', // Fixo - API não informa condição do produto
    availability: availability,
    stock_available: apiProduct.estoque_gerenciado ? apiProduct.quantidade_disponivel : null,
    
    // ✅ NEW: Advanced Stock & Logistics from API
    stock_quantity: apiProduct.quantidade_disponivel || null,
    stock_managed: apiProduct.estoque_gerenciado || false,
    min_order_quantity: apiProduct.quantidade_minima || null,
    max_order_quantity: apiProduct.quantidade_maxima || null,
    multiple_order_quantity: apiProduct.multiplo_quantidade || null,
    unit_measure: apiProduct.unidade_medida || null,
    shipping_time: apiProduct.prazo_entrega || null,
    free_shipping: apiProduct.frete_gratis || false,
    shipping_type: apiProduct.tipo_frete || null,
    
    // ✅ NEW: Status & Flags from API
    active: apiProduct.disponivel !== false, // default true if not explicitly false
    featured: apiProduct.vitrine || false,
    launch: apiProduct.lancamento || false,
    promotion: !!apiProduct.preco_promocional, // true if has promotional price
    showcase: apiProduct.vitrine || false, // same as featured
    
    // ✅ NEW: Fiscal fields from API
    fiscal_class: apiProduct.classe_fiscal || null,
    tax_situation: apiProduct.situacao_tributaria || null,
    fiscal_origin: apiProduct.origem || null,
    
    // Images - structured array with validation (guaranteed from parent if variation)
    image_url: images?.[0]?.url || null,
    images_gallery: images
      .filter(img => img && (img.url || img.grande || img.media || img.thumbnail))
      .map((img, index) => ({
        url: img.url || img.grande || img.media || img.thumbnail || '',
        alt: name || 'Product image',
        order: typeof img.ordem === 'number' ? img.ordem : index,
        is_main: index === 0,
      })),
    
    // Variations - structured array with validation (aceita nome OU sku)
    variations: (() => {
      const rawVariations = apiProduct.variacoes;
      
      if (!Array.isArray(rawVariations)) {
        console.warn(`⚠️ apiProduct.variacoes is not an array: ${typeof rawVariations}`);
        return [];
      }
      
      console.log(`🔍 Mapping variations:`);
      console.log(`   Input count: ${rawVariations.length}`);
      
      const filtered = rawVariations.filter(v => v && (v.nome || v.sku));
      console.log(`   After filter (nome OR sku): ${filtered.length}`);
      
      const mapped = filtered.map((v, index) => {
        const variation = {
          name: v.nome || v.sku || '',
          price: typeof v.preco === 'number' ? v.preco : null,
          promo_price: null, // API não fornece preco promocional por variação
          stock: typeof v.quantidade_disponivel === 'number' ? v.quantidade_disponivel : null,
          sku: v.sku || null,
        };
        
        console.log(`   📌 Variation ${index + 1}: ${variation.name} (SKU: ${variation.sku || 'N/A'})`);
        return variation;
      });
      
      console.log(`✅ Mapped ${mapped.length} variations successfully`);
      return mapped;
    })(),
    
    // Additional metadata from API
    video_url: apiProduct.url_video_youtube || null,
    product_url: null, // API não fornece URL do produto
    tags: Array.isArray(apiProduct.tags) ? apiProduct.tags : [],
    
    // ✅ GARANTIR: Todos os campos JSONB inicializados como arrays vazios
    keywords: [],
    benefits: [],
    features: [],
    target_audience: [],
    market_keywords: [],
    search_intent_keywords: [],
    technical_specifications: [],
    faq: [],
    bot_trigger_words: [],
    
    // ✅ GARANTIR: Campos JSONB estruturados inicializados
    individual_blog_content: { technical: null, commercial: null, generated_at: null },
    whatsapp_messages: { messages: [], last_generated: null },
    youtube_descriptions: { descriptions: [], last_generated: null },
    instagram_copies: { copies: [], last_generated: null, template_config: {} },
    tiktok_content: { copies: [], last_generated: null },
    tiktok_videos: [],
    youtube_videos: [],
    instagram_videos: [],
    technical_videos: [],
    testimonial_videos: [],
    video_captions: {},
    
    // Resource CTAs
    resource_cta1: { url: '', label: '', visible: false },
    resource_cta2: { url: '', label: '', visible: false },
    resource_cta3: { url: '', label: '', visible: false },
    offer_discount_cta: { url: '', label: 'Comprar com Desconto', visible: false },
    resource_descriptions: { cta1: '', cta2: '', cta3: '' },
    
    // SEO fields
    canonical_url: apiProduct.url || null,
    slug: apiProduct.url?.split('/').pop() || apiProduct.nome?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null,
    seo_title_override: apiProduct.titulo_seo || null,
    seo_description_override: apiProduct.descricao_seo || null,
    seo_enhanced: false,
    
    // Control fields
    approved: true,
    use_in_ai_generation: true,
    show_in_resources: false,
    selected: false,
    display_order: null,
    
    // Visual attributes (extracted from variations or null)
    color: extractedAttributes.color,
    size: extractedAttributes.size,
    material: extractedAttributes.material,
    package_size: null, // Não disponível na API
    age_group: null, // Não disponível na API
    gender: null, // Não disponível na API
    sales_pitch: null, // Não disponível na API
    
    // Timestamps
    created_at: apiProduct.data_criacao || new Date().toISOString(),
    updated_at: apiProduct.data_ultima_modificacao || new Date().toISOString(),
    
    // Flags
    is_under_consultation: apiProduct.sob_consulta || false,
    ai_generated_category: false,
    ai_generated_keywords: false,
    ai_generated_benefits: false,
    
    // Data source tracking
    source_type: 'loja_integrada_api',
    source_landing_page_id: null,
    original_data: {
      ...apiProduct,
      li_product_id: apiProduct.id || extractIdFromUri(apiProduct.resource_uri) || null
    },
  };

  // ✅ FASE 3: Logs de validação completa
  console.info("🔍 Produto Final para DB:", {
    // Campos críticos
    name: mapped.name,
    price: mapped.price,
    promo_price: mapped.promo_price,
    brand: mapped.brand,
    currency: mapped.currency,
    
    // Arrays importantes  
    variations_count: mapped.variations?.length ?? 0,
    images_count: mapped.images_gallery?.length ?? 0,
    categories_count: mapped.all_categories?.length ?? 0,
    
    // Campos que podem estar missing
    has_ean: !!mapped.ean,
    has_gtin: !!mapped.gtin,
    has_product_url: !!mapped.product_url,
    availability: mapped.availability,
    
    // Validação de tipos
    price_type: typeof mapped.price,
    variations_type: typeof mapped.variations,
    images_type: typeof mapped.images_gallery,
  });

  // Log fields that need manual input
  const manualInputFields = ['gtin', 'product_url', 'color', 'size', 'material', 'google_product_category', 'package_size', 'sales_pitch'];
  console.log(`✏️ Fields requiring manual input: ${manualInputFields.join(', ')}`);

  // Count extracted fields for quality metrics
  const totalFields = Object.keys(mapped).length;
  const filledFields = Object.values(mapped).filter(v => 
    v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  console.log(`📊 Field extraction summary:`);
  console.log(`   ✅ Filled: ${filledFields}/${totalFields} (${((filledFields/totalFields)*100).toFixed(1)}%)`);
  console.log(`   Total DB fields mapped: ${totalFields}`);

  return mapped;
}

// Map scraped data to repository format
function mapScrapedDataToRepository(scrapedData: any, li_product_id?: string) {
  console.log('🔄 Mapping scraped data to repository format');
  console.log('📦 Raw scraped variations:', {
    count: scrapedData.variations?.length || 0,
    sample: scrapedData.variations?.[0] || null
  });

  return {
    name: scrapedData.name || scrapedData.title || 'Produto sem nome',
    ...scrapedData,
    variations: scrapedData.variations?.map((v: any) => ({
      name: v.name || v.sku || '',
      price: v.price || null,
      stock: v.stock !== undefined ? v.stock : null,
      sku: v.sku || ''
    })) || [],
    images_gallery: scrapedData.images_gallery || [],
    all_categories: scrapedData.all_categories || [],
    keywords: scrapedData.keywords || [],
    benefits: scrapedData.benefits || [],
    features: scrapedData.features || [],
    technical_specifications: scrapedData.technical_specifications || [],
    faq: scrapedData.faq || [],
    tags: scrapedData.tags || [],
    target_audience: scrapedData.target_audience || [],
    market_keywords: scrapedData.market_keywords || [],
    search_intent_keywords: scrapedData.search_intent_keywords || [],
    original_data: {
      ...(scrapedData.original_data || {}),
      li_product_id: li_product_id || null
    }
  };
}

async function logToMonitoring(
  supabase: any,
  eventType: string,
  eventData: any,
  severity: 'info' | 'warning' | 'error'
) {
  try {
    await supabase.from('system_monitoring').insert({
      event_type: eventType,
      component_name: 'import-loja-integrada-api',
      event_data: eventData,
      severity,
      tags: ['api', 'import', 'loja_integrada'],
    });
  } catch (error) {
    console.error('Failed to log to monitoring:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const lojaIntegradaApiKey = Deno.env.get('LOJA_INTEGRADA_API_KEY');
    const lojaIntegradaAppKey = Deno.env.get('LOJA_INTEGRADA_APP_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!lojaIntegradaApiKey || !lojaIntegradaAppKey) {
      throw new Error('LOJA_INTEGRADA_API_KEY and LOJA_INTEGRADA_APP_KEY are required');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { productId, productUrl, endpoint = '/produtos' } = await req.json();

    console.log('🚀 Starting product import:', { productId, productUrl, endpoint });

    // Log start of import
    await logToMonitoring(
      supabase,
      'import_started',
      {
        productId,
        productUrl,
        endpoint,
        circuit_breaker_status: isCircuitOpen() ? 'open' : 'closed',
      },
      'info'
    );

    // Try API first (if productId provided directly)
    let apiResult = { success: false, data: null };
    if (productId) {
      // Use singular endpoint /produto/{id} as per official docs
      apiResult = await fetchFromLojaIntegradaAPI(lojaIntegradaApiKey, lojaIntegradaAppKey, `/produto/${productId}`);
    } else if (!productUrl) {
      // Se não tem nem productId nem productUrl, tenta o endpoint genérico
      apiResult = await fetchFromLojaIntegradaAPI(lojaIntegradaApiKey, lojaIntegradaAppKey, endpoint);
    }

    let finalData: any = null;
    let dataSource = 'api';
    let fallbackUsed = false;
    let extractedProductId: string | undefined;

    if (apiResult.success && apiResult.data) {
      console.log('✅ API data retrieved successfully');
      console.log('📄 Full API response:', JSON.stringify(apiResult.data, null, 2));
      
      // Validar que temos dados válidos antes de mapear
      if (!apiResult.data || typeof apiResult.data !== 'object') {
        console.error('❌ Invalid API data structure');
        throw new Error('Invalid data structure from API');
      }
      
      // Handle API response structure
      // - For specific product requests (/produtos/{id}): returns product directly
      // - For list requests (/produtos): returns { meta: {...}, objects: [...] }
      let productData = apiResult.data;
      
      if (apiResult.data.objects && Array.isArray(apiResult.data.objects)) {
        console.log(`📦 Paginated response detected: ${apiResult.data.objects.length} products found`);
        productData = apiResult.data.objects[0]; // Use first product from list
        if (!productData) {
          throw new Error('No products found in API paginated response');
        }
      } else if (apiResult.data.resource_uri || apiResult.data.id) {
        // Direct product response - use as is
        console.log('📦 Direct product response detected');
        productData = apiResult.data;
      } else {
        console.error('❌ Unexpected API response structure:', Object.keys(apiResult.data));
        throw new Error('Unexpected API response structure');
      }
      
      // ✅ CORREÇÃO: Buscar produto pai se existir (independente do tipo)
      let productToMap = productData;
      
      if (productData.pai) {
        console.log(`🔄 Child product detected (tipo="${productData.tipo || 'missing'}"), fetching parent product...`);
        const parentProduct = await fetchParentProduct(
          lojaIntegradaApiKey,
          lojaIntegradaAppKey,
          productData.pai
        );
        
        if (parentProduct) {
          console.log(`✅ Parent product fetched:`, {
            name: parentProduct.nome,
            variations: parentProduct.variacoes?.length || 0,
            images: parentProduct.imagens?.length || 0,
            categories: parentProduct.categorias?.length || 0
          });
          
          // Merge data: parent (name, images, categories) + variation (price, SKU)
          productToMap = {
            ...parentProduct,                         // Parent data (name, images, categories)
            preco_cheio: productData.preco_cheio,     // Variation price
            preco_promocional: productData.preco_promocional,
            sku: productData.sku,                     // Variation SKU
            variacoes: parentProduct.variacoes,       // Keep parent variations array
            resource_uri: productData.resource_uri,   // Variation URI
            tipo: productData.tipo,                   // Keep variation type
            pai: productData.pai,                     // Keep parent reference
          };
          console.log(`✅ Merged parent + child data. Final variations: ${productToMap.variacoes?.length || 0}`);
        } else {
          console.warn(`⚠️ Could not fetch parent product for: ${productData.pai}`);
        }
      }
      
      finalData = await mapAPIProductToRepository(productToMap, lojaIntegradaApiKey, lojaIntegradaAppKey);
      
      // Save complete original_data with parent info if variation
      if (productData.tipo === 'atributo_opcao' && productData.pai) {
        finalData.original_data = {
          variation: productData,           // Original variation data
          parent: productToMap !== productData ? productToMap : null, // Parent data if fetched
          merged: productToMap              // Final merged data
        };
      }
      
      // Validar que o mapeamento produziu dados válidos
      if (!finalData || !finalData.name) {
        console.error('❌ Mapping failed - no product name');
        throw new Error('Failed to map API data to repository format');
      }
    } else {
      // Fallback to web scraping if API fails and we have a product URL
      if (productUrl) {
        console.log('⚠️ API failed, attempting web scraping fallback');
        fallbackUsed = true;
        
        const scrapingResult = await fallbackToWebScraping(supabaseUrl, supabaseKey, productUrl);
        
        if (scrapingResult.success && scrapingResult.data) {
          console.log('✅ Web scraping fallback successful');
          console.log('📋 Scraped data:', {
            has_name: !!scrapingResult.data.name,
            name_value: scrapingResult.data.name,
            has_price: !!scrapingResult.data.price,
            has_images: !!scrapingResult.data.images_gallery?.length,
            images_count: scrapingResult.data.images_gallery?.length || 0
          });
          extractedProductId = scrapingResult.li_product_id;
          
          // Se extraímos um ID e ainda não tentamos a API com ele, tentar agora
          if (extractedProductId && !productId) {
            console.log(`🔄 Trying API with extracted ID: ${extractedProductId}`);
            // Retry with API using extracted product ID
            const apiRetry = await fetchFromLojaIntegradaAPI(
              lojaIntegradaApiKey,
              lojaIntegradaAppKey,
              `/produto/${extractedProductId}`
            );
            
            if (apiRetry.success && apiRetry.data) {
              console.log('✅ API successful with extracted ID');
              
              // Handle response structure (direct or paginated)
              let retryProductData = apiRetry.data;
              if (apiRetry.data.objects && Array.isArray(apiRetry.data.objects)) {
                retryProductData = apiRetry.data.objects[0];
              }
              
              if (retryProductData) {
                finalData = mapAPIProductToRepository(retryProductData);
                dataSource = 'api_via_scraping';
              } else {
                // Fallback to scraping data
                finalData = mapScrapedDataToRepository(scrapingResult.data, extractedProductId);
                console.log(`🔍 Mapped scraped data with ${finalData.variations?.length || 0} variations`);
                dataSource = 'web_scraping';
              }
            } else {
              // Se API com ID falhar, usar dados do scraping
              finalData = mapScrapedDataToRepository(scrapingResult.data, extractedProductId);
              console.log(`🔍 Mapped scraped data with ${finalData.variations?.length || 0} variations`);
              dataSource = 'web_scraping';
            }
          } else {
            finalData = mapScrapedDataToRepository(scrapingResult.data, extractedProductId);
            console.log(`🔍 Mapped scraped data with ${finalData.variations?.length || 0} variations`);
            dataSource = 'web_scraping';
          }
        } else {
          throw new Error('Both API and web scraping failed');
        }
      } else {
        throw new Error('API failed and no product URL provided for fallback');
      }
    }

    const totalTime = Date.now() - startTime;

    // Log successful import
    await logToMonitoring(
      supabase,
      'import_completed',
      {
        productId,
        dataSource,
        fallbackUsed,
        totalTimeMs: totalTime,
        fieldsExtracted: Object.keys(finalData).length,
        circuit_breaker_failures: circuitBreaker.failures,
        circuit_breaker_successes: circuitBreaker.successes,
      },
      'info'
    );

    console.log(`✅ Import completed in ${totalTime}ms using ${dataSource}`);

    // 🤖 AUTO-SEO: Processar produto após importação
    if (finalData?.id) {
      try {
        console.log('🤖 Iniciando automação SEO pós-importação...');
        
        const seoResponse = await supabaseAdmin.functions.invoke('auto-seo-enhancer', {
          body: { productIds: [finalData.id], mode: 'import' }
        });
        
        if (seoResponse.data?.success) {
          console.log('✅ SEO automaticamente otimizado:', seoResponse.data.message);
        } else {
          console.warn('⚠️ Automação SEO falhou (não crítico):', seoResponse.error);
        }
      } catch (seoError) {
        console.warn('⚠️ Erro na automação SEO (não crítico):', seoError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: finalData,
        product: finalData, // Manter compatibilidade com código antigo
        metadata: {
          dataSource,
          fallbackUsed,
          totalTimeMs: totalTime,
          circuitBreakerStatus: isCircuitOpen() ? 'open' : 'closed',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Import failed:', error);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await logToMonitoring(
        supabase,
        'import_failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          totalTimeMs: totalTime,
        },
        'error'
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
