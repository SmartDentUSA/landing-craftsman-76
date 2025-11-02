import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  productId: string;
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

    const { productId, htmlContent }: RequestBody = await req.json();
    console.log('📥 Request recebido:', { productId, htmlSize: htmlContent?.length || 0 });

    if (!productId || !htmlContent) {
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

    // Fetch li_product_id from database
    console.log('🔍 Buscando li_product_id para productId:', productId);
    const { data, error } = await supabase
      .from("products_repository")
      .select("source_data")
      .eq("id", productId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar produto no banco:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erro ao buscar produto: ${error.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Dados encontrados:', data?.source_data);
    const li_product_id = data?.source_data?.li_product_id;

    if (!li_product_id) {
      console.warn('⚠️ Produto não possui li_product_id');
      return new Response(
        JSON.stringify({
          success: false,
          message: "Produto não vinculado à Loja Integrada. Importe o produto via URL primeiro.",
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 li_product_id extraído:', li_product_id);
    console.log('📤 Enviando HTML para Loja Integrada...');

    // PUT request to Loja Integrada API
    const url = `https://api.awsli.com.br/v1/produto/${li_product_id}?chave_api=${LOJA_INTEGRADA_API_KEY}&chave_aplicacao=${LOJA_INTEGRADA_APP_KEY}`;

    let attempt = 0;
    let response;
    
    while (attempt < 3) {
      console.log(`🔄 Tentativa ${attempt + 1}/3`);
      
      response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao_completa: htmlContent }),
      });

      if (response.ok) {
        console.log('✅ PUT bem-sucedido');
        break;
      }
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limit atingido, aguardando 800ms...');
        await new Promise((r) => setTimeout(r, 800));
        attempt++;
        continue;
      } else {
        console.error(`❌ Erro HTTP ${response.status}`);
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

    console.log('✅ Descrição atualizada com sucesso!');
    return new Response(
      JSON.stringify({
        success: true,
        li_product_id,
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
