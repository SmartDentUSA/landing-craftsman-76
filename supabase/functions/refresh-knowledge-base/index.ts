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

    // Fetch all KB data using the existing RPC function
    console.log('📊 Fetching knowledge base data...');
    const { data: kbData, error: kbError } = await supabase.rpc('get_complete_knowledge_base', {
      p_include_company: true,
      p_include_categories: true,
      p_include_links: true,
      p_include_products: true,
      p_include_video_testimonials: true,
      p_include_google_reviews: true,
      p_include_kols: true,
      p_include_spin_solutions: true,
      p_include_blog_posts: true,
      p_include_landing_pages: false,
      p_approved_only: true,
      p_limit: 500
    });

    if (kbError) {
      console.error('❌ Error fetching KB data:', kbError);
      throw kbError;
    }

    // Fetch external videos
    const { data: externalVideos } = await supabase
      .from('video_testimonials')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true });

    // Fetch technical documents from products
    const { data: techDocs } = await supabase
      .from('products_repository')
      .select('id, name, technical_documents, document_transcriptions')
      .eq('approved', true)
      .not('technical_documents', 'is', null);

    // Count products
    const productsCount = kbData?.products?.length || 0;

    // Build the complete KB object optimized for RAG
    const completeKB = {
      ...kbData,
      external_videos: externalVideos || [],
      technical_documents: techDocs?.filter(p => 
        (Array.isArray(p.technical_documents) && p.technical_documents.length > 0) ||
        (Array.isArray(p.document_transcriptions) && p.document_transcriptions.length > 0)
      ) || []
    };

    // Format for RAG (token-optimized)
    const ragData = formatForRAG(completeKB);

    // Upsert cache for RAG format
    console.log('💾 Saving RAG cache...');
    const { error: upsertError } = await supabase
      .from('knowledge_base_cache')
      .upsert({
        format: 'rag',
        data: ragData,
        products_count: productsCount,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 hours
      }, {
        onConflict: 'format'
      });

    if (upsertError) {
      console.error('❌ Error upserting cache:', upsertError);
      throw upsertError;
    }

    // Also cache JSON format
    console.log('💾 Saving JSON cache...');
    await supabase
      .from('knowledge_base_cache')
      .upsert({
        format: 'json',
        data: completeKB,
        products_count: productsCount,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'format'
      });

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
    result.products = data.products.map((item: any) => {
      const p = item.product || item;
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
    result.keywords_repository = data.external_links.slice(0, 100);
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

  return result;
}
