import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  productId: string;
  liProductId: string;
  htmlContent: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOJA_INTEGRADA_API_KEY = Deno.env.get("LOJA_INTEGRADA_API_KEY")!;
const LOJA_INTEGRADA_APP_KEY = Deno.env.get("LOJA_INTEGRADA_APP_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, message: "Método não permitido" }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials
    if (!LOJA_INTEGRADA_API_KEY || !LOJA_INTEGRADA_APP_KEY) {
      console.error('❌ Credenciais da Loja Integrada não configuradas');
      return new Response(
        JSON.stringify({
          success: false,
          message: "Credenciais da Loja Integrada não configuradas",
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { productId, liProductId, htmlContent }: RequestBody = await req.json();
    console.log('📥 Request recebido:', { productId, liProductId, htmlSize: htmlContent?.length || 0 });

    if (!productId || !liProductId || !htmlContent) {
      return new Response(
        JSON.stringify({ success: false, message: "Parâmetros inválidos" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate HTML size
    if (htmlContent.length > 500_000) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "HTML muito grande (máx: 500KB)",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar categoria do banco
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('original_data')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('❌ Erro ao buscar produto:', productError);
    }

    // Extrair categoria ID do original_data
    let categoryId = null;

    if (product?.original_data?.categorias) {
      const cats = product.original_data.categorias;
      
      // Formato 1: ID direto
      if (typeof cats === 'number') {
        categoryId = cats;
      }
      // Formato 2: Objeto { id: X }
      else if (cats.id) {
        categoryId = cats.id;
      }
      // Formato 3: Array [{ id: X }, ...]
      else if (Array.isArray(cats) && cats.length > 0 && cats[0]?.id) {
        categoryId = cats[0].id;
      }
    }

    console.log('📂 Categoria extraída do banco:', categoryId);

    // 1. Buscar dados atuais do produto via GET
    console.log('📥 Buscando dados atuais do produto via API...');
    const getUrl = `https://api.awsli.com.br/v1/produto/${liProductId}?chave_api=${LOJA_INTEGRADA_API_KEY}&chave_aplicacao=${LOJA_INTEGRADA_APP_KEY}`;

    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: { "Accept": "application/json" },
    });

    if (!getResponse.ok) {
      const error = await getResponse.json().catch(() => ({}));
      console.error(`❌ Erro ao buscar produto: ${getResponse.status}`, error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erro ao buscar produto: ${error.detail || error.message || getResponse.status}`,
        }),
        { status: getResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentProduct = await getResponse.json();
    console.log('✅ Produto atual obtido, preparando atualização...');

    // 2. Mesclar HTML atualizado com dados existentes
    const updatePayload = {
      ...currentProduct,
      descricao_completa: htmlContent,
    };

    // 3. Se tiver categoria no banco, usa ela (prioridade)
    if (categoryId) {
      updatePayload.categorias = `/v1/categoria/${categoryId}/`;
      console.log('✅ Categoria do banco aplicada:', updatePayload.categorias);
    }

    // 4. Limpar campos que a API não aceita no PUT
    delete updatePayload.resource_uri;
    delete updatePayload.id;
    delete updatePayload.created_at;
    delete updatePayload.updated_at;

    // Enviar PUT com payload completo
    console.log('📤 Enviando PUT para Loja Integrada...');
    const url = `https://api.awsli.com.br/v1/produto/${liProductId}?chave_api=${LOJA_INTEGRADA_API_KEY}&chave_aplicacao=${LOJA_INTEGRADA_APP_KEY}`;

    let attempt = 0;
    let response;
    
    while (attempt < 3) {
      console.log(`🔄 Tentativa ${attempt + 1}/3 (PUT)`);
      
      response = await fetch(url, {
        method: 'PUT',
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        console.log('✅ PUT bem-sucedido');
        break;
      }
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limit, aguardando 800ms...');
        await new Promise((r) => setTimeout(r, 800));
        attempt++;
      } else {
        const error = await response.json().catch(() => ({}));
        console.error(`❌ Erro HTTP ${response.status}:`, error);
        break;
      }
    }

    const result = await response!.json().catch(() => ({}));
    
    if (!response!.ok) {
      console.error('❌ Resposta de erro da Loja Integrada:', result);
      return new Response(
        JSON.stringify({
          success: false,
          message: result.detail || result.message || `Erro (${response!.status}) na API da Loja Integrada`,
        }),
        { status: response!.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ HTML + Categoria atualizados com sucesso!');
    return new Response(
      JSON.stringify({
        success: true,
        li_product_id: liProductId,
        category_sent: !!categoryId,
        updated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err: any) {
    console.error("❌ Erro geral:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
