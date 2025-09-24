import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { landingPageId, dryRun = false } = await req.json();
    
    console.log(`Starting product migration for landing page: ${landingPageId || 'ALL'}`);
    
    // Fetch landing pages data
    const query = supabase
      .from('blog_posts')
      .select('*');
    
    if (landingPageId) {
      query.eq('landing_page_id', landingPageId);
    }
    
    const { data: landingPages, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch landing pages: ${fetchError.message}`);
    }

    let totalProducts = 0;
    let migratedProducts = 0;
    const migrationLog: any[] = [];

    for (const page of landingPages || []) {
      console.log(`Processing landing page: ${page.landing_page_id}`);
      
      // Try to parse the intelligent_links JSON to get page data
      let pageData: any = {};
      if (page.intelligent_links && typeof page.intelligent_links === 'object') {
        pageData = page.intelligent_links;
      }

      // Extract products from multiple possible locations
      let products: any[] = [];
      
      // Priority 1: schema.offers (current editor structure)
      if (pageData?.schema?.offers && Array.isArray(pageData.schema.offers)) {
        products = pageData.schema.offers;
        console.log(`Found ${products.length} products in schema.offers`);
      }
      // Priority 2: editor_data.products (legacy structure)
      else if (pageData?.editor_data?.products && Array.isArray(pageData.editor_data.products)) {
        products = pageData.editor_data.products;
        console.log(`Found ${products.length} products in editor_data.products`);
      }
      // Priority 3: Direct offers array
      else if (pageData?.offers && Array.isArray(pageData.offers)) {
        products = pageData.offers;
        console.log(`Found ${products.length} products in offers`);
      }

      totalProducts += products.length;

      for (const product of products) {
        const productData = {
          name: product.name || product.title || 'Produto sem nome',
          description: product.description || product.content || null,
          price: product.price ? parseFloat(product.price.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : null,
          currency: 'BRL',
          product_url: product.url || product.link || null,
          image_url: product.image || product.imageUrl || null,
          youtube_url: product.youtube_url || null,
          category: product.category || null,
          subcategory: product.subcategory || null,
          tags: product.tags ? (Array.isArray(product.tags) ? product.tags : [product.tags]) : [],
          keywords: product.keywords ? (Array.isArray(product.keywords) ? product.keywords : [product.keywords]) : [],
          target_audience: product.target_audience || null,
          benefits: product.benefits ? (Array.isArray(product.benefits) ? product.benefits : [product.benefits]) : [],
          features: product.features ? (Array.isArray(product.features) ? product.features : [product.features]) : [],
          source_type: 'landing_page_migration',
          source_landing_page_id: page.landing_page_id,
          original_data: product,
          approved: true
        };

        migrationLog.push({
          landing_page_id: page.landing_page_id,
          product_name: productData.name,
          action: dryRun ? 'would_migrate' : 'migrating'
        });

        if (!dryRun) {
          // Check if product already exists (by URL or name + landing page)
          const { data: existingProducts, error: checkError } = await supabase
            .from('products_repository')
            .select('id')
            .or(
              productData.product_url 
                ? `product_url.eq.${productData.product_url},and(name.eq.${productData.name},source_landing_page_id.eq.${page.landing_page_id})`
                : `name.eq.${productData.name},source_landing_page_id.eq.${page.landing_page_id}`
            );

          if (checkError) {
            console.error(`Error checking existing product: ${checkError.message}`);
            continue;
          }

          if (existingProducts && existingProducts.length > 0) {
            console.log(`Product "${productData.name}" already exists, skipping`);
            continue;
          }

          // Insert new product
          const { error: insertError } = await supabase
            .from('products_repository')
            .insert(productData);

          if (insertError) {
            console.error(`Error inserting product "${productData.name}": ${insertError.message}`);
            continue;
          }

          migratedProducts++;
          console.log(`Migrated product: ${productData.name}`);
        }
      }
    }

    console.log(`Migration completed. Total products found: ${totalProducts}, Migrated: ${migratedProducts}`);

    return new Response(JSON.stringify({
      success: true,
      totalProducts,
      migratedProducts,
      dryRun,
      migrationLog: migrationLog.slice(0, 50) // Limit log size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in migrate-products-to-repository function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});