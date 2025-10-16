import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 get-product-data: Iniciando requisição');

    // Parse query parameters
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const product_id = url.searchParams.get('product_id');
    const category = url.searchParams.get('category');
    const approved = url.searchParams.get('approved') === 'false' ? false : true;

    console.log('📋 Parâmetros recebidos:', { slug, product_id, category, approved });

    // Validate that at least one search parameter is provided
    if (!slug && !product_id && !category) {
      console.error('❌ Nenhum parâmetro de busca fornecido');
      return new Response(
        JSON.stringify({ 
          error: 'É necessário fornecer ao menos um parâmetro de busca: slug, product_id ou category' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('✅ Cliente Supabase inicializado');

    // Build query
    let query = supabase
      .from('products_repository')
      .select('*')
      .eq('approved', approved);

    // Add filters based on provided parameters
    if (product_id) {
      query = query.eq('id', product_id);
    }
    if (slug) {
      // Extrai slug de URL completa se necessário
      const cleanSlug = slug.includes('://') 
        ? slug.split('/').pop() || slug
        : slug;
      
      console.log('🔍 Slug limpo para busca:', cleanSlug);
      
      // Busca flexível com ILIKE para aceitar slug parcial
      query = query.ilike('slug', `%${cleanSlug}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }

    console.log('🔎 Executando busca no banco de dados...');

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      throw error;
    }

    console.log(`✅ Busca concluída. ${data?.length || 0} produto(s) encontrado(s)`);

    // Return results
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum produto encontrado com os critérios fornecidos');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Nenhum produto encontrado',
          data: null 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If searching by slug or product_id, return single product
    const result = (slug || product_id) ? data[0] : data;

    console.log('✅ Retornando dados do produto');

    return new Response(
      JSON.stringify({ 
        success: true,
        data: result,
        count: Array.isArray(result) ? result.length : 1
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro não tratado:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro interno do servidor',
        data: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
