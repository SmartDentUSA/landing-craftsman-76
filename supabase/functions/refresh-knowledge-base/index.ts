import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 [refresh-knowledge-base] Starting cache refresh...');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch data directly from tables (faster than RPC)
    console.log('📊 Fetching knowledge base data directly from tables...');

    // Fetch company profile
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    // Fetch products (approved only, key fields for RAG)
    const { data: products } = await supabase
      .from('products_repository')
      .select(`
        id, name, description, category, subcategory, price, promo_price, 
        product_url, image_url, keywords, benefits, features, target_audience,
        faq, technical_specifications, anti_hallucination_rules, brand
      `)
      .eq('approved', true)
      .order('name');

    // Fetch categories config
    const { data: categoriesConfig } = await supabase
      .from('categories_config')
      .select('*')
      .eq('is_active', true);

    // Fetch external links (top 100)
    const { data: externalLinks } = await supabase
      .from('external_links')
      .select('id, name, url, category, subcategory, description')
      .eq('approved', true)
      .limit(100);

    // Fetch SPIN solutions
    const { data: spinSolutions } = await supabase
      .from('spin_selling_solutions')
      .select('id, title, pain_type, product_ids')
      .eq('active', true);

    // Fetch KOLs
    const { data: kols } = await supabase
      .from('key_opinion_leaders')
      .select('id, full_name, specialty, mini_cv')
      .eq('approved', true);

    const productsCount = products?.length || 0;
    console.log(`✅ Fetched: ${productsCount} products, ${categoriesConfig?.length || 0} categories`);

    // Build KB data
    const kbData = {
      company_profile: companyProfile,
      products: products || [],
      categories_config: categoriesConfig || [],
      external_links: externalLinks || [],
      spin_solutions: spinSolutions || [],
      kols: kols || []
    };

    // Format for RAG (token-optimized)
    const ragData = formatForRAG(kbData);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours

    // Save RAG cache
    console.log('💾 Saving RAG cache...');
    
    const { error: ragError } = await supabase
      .from('knowledge_base_cache')
      .upsert({
        format: 'rag',
        data: ragData,
        products_count: productsCount,
        updated_at: now,
        expires_at: expiresAt
      }, { onConflict: 'format' });

    if (ragError) {
      console.error('❌ Error saving RAG cache:', ragError);
      throw ragError;
    }
    
    console.log('✅ RAG cache saved successfully');

    // Save JSON cache (simplified version)
    console.log('💾 Saving JSON cache...');
    
    const { error: jsonError } = await supabase
      .from('knowledge_base_cache')
      .upsert({
        format: 'json',
        data: {
          api_version: '1.0.0',
          timestamp: now,
          data: kbData
        },
        products_count: productsCount,
        updated_at: now,
        expires_at: expiresAt
      }, { onConflict: 'format' });

    if (jsonError) {
      console.error('⚠️ Error saving JSON cache:', jsonError);
      // Non-fatal, continue
    } else {
      console.log('✅ JSON cache saved successfully');
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ [refresh-knowledge-base] Cache refreshed in ${elapsed}ms. Products: ${productsCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Knowledge Base cache refreshed',
      products_count: productsCount,
      elapsed_ms: elapsed,
      next_refresh: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [refresh-knowledge-base] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified RAG formatter (token-optimized)
function formatForRAG(data: any): any {
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const omitEmpty = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => 
        v !== null && v !== undefined && v !== '' && 
        !(Array.isArray(v) && v.length === 0) &&
        !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
      )
    );
  };

  const result: any = {
    _meta: {
      generated_at: new Date().toISOString(),
      format: 'rag_optimized',
      version: '2.0'
    }
  };

  // Company Profile (simplified)
  if (data.company_profile) {
    const cp = data.company_profile;
    result.company = omitEmpty({
      name: cp.company_name,
      description: stripHtml(cp.company_description),
      sector: cp.business_sector,
      mission: cp.mission_statement,
      vision: cp.vision_statement,
      values: cp.brand_values,
      website: cp.website_url,
      contact: {
        email: cp.contact_email,
        phone: cp.contact_phone
      },
      location: cp.city ? `${cp.city}, ${cp.state}` : cp.location,
      social: cp.social_media_links
    });
  }

  // Products (optimized)
  if (data.products && Array.isArray(data.products)) {
    result.products = data.products.map((p: any) => {
      return omitEmpty({
        id: p.id,
        name: p.name,
        description: stripHtml(p.description),
        category: p.category,
        subcategory: p.subcategory,
        price: p.price,
        promo_price: p.promo_price,
        url: p.product_url,
        image: p.image_url,
        brand: p.brand,
        keywords: p.keywords,
        benefits: p.benefits,
        features: p.features,
        target_audience: p.target_audience,
        faq: p.faq,
        specs: p.technical_specifications,
        anti_hallucination: p.anti_hallucination_rules
      });
    });
  }

  // Categories
  if (data.categories_config) {
    result.categories = data.categories_config;
  }

  // Links/Keywords
  if (data.external_links) {
    result.keywords_repository = data.external_links;
  }

  // SPIN Solutions
  if (data.spin_solutions) {
    result.solutions = data.spin_solutions.map((s: any) => omitEmpty({
      id: s.id,
      title: s.title,
      pain_type: s.pain_type,
      product_ids: s.product_ids
    }));
  }

  // KOLs
  if (data.kols) {
    result.experts = data.kols.map((k: any) => omitEmpty({
      name: k.full_name,
      specialty: k.specialty,
      cv: k.mini_cv
    }));
  }

  return result;
}
