import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const LOJA_INTEGRADA_API_BASE = 'https://api.lojaintegrada.com.br/v1';
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
    const url = `${LOJA_INTEGRADA_API_BASE}${endpoint}`;
    console.log(`📡 Fetching from Loja Integrada API: ${url}`);

    const response = await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Authorization': `chave_api ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function',
        },
      }
    );

    const responseTime = Date.now() - startTime;
    console.log(`✅ API Response: ${response.status} (${responseTime}ms)`);

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
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Invalid content-type: ${contentType}`);
      updateCircuitBreaker(false);
      return {
        success: false,
        error: `API returned non-JSON response (${contentType}). The API may be returning HTML instead of JSON.`,
      };
    }

    const responseText = await response.text();
    
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
): Promise<{ success: boolean; data?: any; error?: string }> {
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
    return { success: true, data };
  } catch (error) {
    console.error('❌ Web scraping fallback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function mapAPIProductToRepository(apiProduct: ProductData): any {
  console.log(`🔍 Mapping product: "${apiProduct.nome}"`);
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
  const allCategories = apiProduct.categorias?.map(cat => ({
    name: cat.nome,
    level: cat.nivel
  })) || [];
  console.log(`📁 Categories mapped: ${allCategories.length} categories`);

  const mapped: any = {
    // Core fields from API
    name: apiProduct.nome,
    price: apiProduct.preco_cheio,
    promo_price: apiProduct.preco_promocional || null,
    description: apiProduct.descricao_completa || null,
    
    // Physical specifications from API
    weight: apiProduct.peso || null,
    width: apiProduct.largura || null,
    height: apiProduct.altura || null,
    depth: apiProduct.profundidade || null,
    
    // Identifiers from API
    sku: apiProduct.sku || null,
    mpn: apiProduct.mpn || null,
    ncm: apiProduct.ncm || null,
    
    // Brand and category from API
    brand: apiProduct.marca?.nome || null,
    category: apiProduct.categorias?.[0]?.nome || null,
    all_categories: allCategories,
    
    // Enhanced stock control
    condition: 'new',
    availability: availability,
    stock_available: apiProduct.estoque_gerenciado ? apiProduct.quantidade_disponivel : null,
    
    // Images - structured array with validation
    image_url: apiProduct.imagens?.[0]?.url || null,
    images_gallery: Array.isArray(apiProduct.imagens) 
      ? apiProduct.imagens
          .filter(img => img && (img.url || img.grande || img.media || img.thumbnail))
          .map((img, index) => ({
            url: img.url || img.grande || img.media || img.thumbnail || '',
            alt: apiProduct.nome || 'Product image',
            order: typeof img.ordem === 'number' ? img.ordem : index,
            is_main: index === 0,
          }))
      : [],
    
    // Variations - structured array with validation
    variations: Array.isArray(apiProduct.variacoes) 
      ? apiProduct.variacoes
          .filter(v => v && v.nome)
          .map((v) => ({
            name: v.nome,
            price: typeof v.preco === 'number' ? v.preco : null,
            stock: typeof v.quantidade_disponivel === 'number' ? v.quantidade_disponivel : null,
            sku: v.sku || null,
          }))
      : [],
    
    // Additional metadata from API
    video_url: apiProduct.url_video_youtube || null,
    tags: Array.isArray(apiProduct.tags) ? apiProduct.tags : [],
    created_at: apiProduct.data_criacao || new Date().toISOString(),
    updated_at: apiProduct.data_ultima_modificacao || new Date().toISOString(),
    
    // Flags
    is_under_consultation: apiProduct.sob_consulta || false,
    
    // Fields NOT available in Loja Integrada API - require manual input
    gtin: null,
    ean: null,
    color: null,
    size: null,
    material: null,
    google_product_category: null,
    package_size: null,
    
    // Data source tracking
    source_type: 'loja_integrada_api',
    original_data: apiProduct,
  };

  // Log fields that need manual input
  const manualInputFields = ['gtin', 'ean', 'color', 'size', 'material', 'google_product_category', 'package_size'];
  console.log(`✏️ Fields requiring manual input: ${manualInputFields.join(', ')}`);

  // Count extracted fields for quality metrics
  const totalFields = Object.keys(mapped).length;
  const filledFields = Object.values(mapped).filter(v => 
    v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;
  const nullFields = Object.entries(mapped)
    .filter(([_, v]) => v === null)
    .map(([k, _]) => k);

  console.log(`📊 Field extraction summary:`);
  console.log(`   ✅ Filled: ${filledFields}/${totalFields} (${((filledFields/totalFields)*100).toFixed(1)}%)`);
  console.log(`   ❌ Null fields: ${nullFields.join(', ')}`);
  console.log(`📦 Mapped product details:`, {
    name: mapped.name,
    price: mapped.price,
    promo_price: mapped.promo_price,
    availability: mapped.availability,
    categories: mapped.all_categories.length,
    images_count: mapped.images_gallery?.length || 0,
    variations_count: mapped.variations?.length || 0,
  });

  return mapped;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!lojaIntegradaApiKey) {
      throw new Error('LOJA_INTEGRADA_API_KEY not configured');
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

    // Try API first
    const apiResult = await fetchFromLojaIntegradaAPI(lojaIntegradaApiKey, endpoint);

    let finalData: any = null;
    let dataSource = 'api';
    let fallbackUsed = false;

    if (apiResult.success && apiResult.data) {
      console.log('✅ API data retrieved successfully');
      console.log('📄 Full API response:', JSON.stringify(apiResult.data, null, 2));
      
      // Validar que temos dados válidos antes de mapear
      if (!apiResult.data || typeof apiResult.data !== 'object') {
        console.error('❌ Invalid API data structure');
        throw new Error('Invalid data structure from API');
      }
      
      finalData = mapAPIProductToRepository(apiResult.data);
      
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
          finalData = scrapingResult.data;
          dataSource = 'web_scraping';
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
