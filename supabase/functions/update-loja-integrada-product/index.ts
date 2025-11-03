import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
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

    const { liProductId, htmlContent }: RequestBody = await req.json();
    console.log('📥 Request recebido:', { liProductId, htmlSize: htmlContent?.length || 0 });

    if (!liProductId || !htmlContent) {
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

    console.log('🔑 li_product_id recebido do frontend:', liProductId);
    
    // Step 1: GET current product data to preserve all fields
    console.log('📥 Buscando dados atuais do produto...');
    const getUrl = `https://api.awsli.com.br/v1/produto/${liProductId}?chave_api=${LOJA_INTEGRADA_API_KEY}&chave_aplicacao=${LOJA_INTEGRADA_APP_KEY}`;
    
    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!getResponse.ok) {
      const getError = await getResponse.json().catch(() => ({}));
      console.error('❌ Erro ao buscar produto:', getError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erro ao buscar produto: ${getError.message || getResponse.status}`,
        }),
        { status: getResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentProduct = await getResponse.json();
    console.log('✅ Produto encontrado, preparando atualização...');

    // Step 2: Clean problematic fields that cause 400/405 errors
    const cleanedProduct = { ...currentProduct };
    delete cleanedProduct.categorias; // Remove categoria (vem como ID mas API espera objeto)
    delete cleanedProduct.imagens; // Remove imagens (podem ter formato incompatível)
    delete cleanedProduct.variacoes; // Remove variações (estrutura complexa)
    console.log('🧹 Campos problemáticos removidos (categorias, imagens, variacoes)');

    // Step 3: Try updating with cleaned product data
    console.log('📤 Enviando HTML atualizado para Loja Integrada...');
    const url = `https://api.awsli.com.br/v1/produto/${liProductId}?chave_api=${LOJA_INTEGRADA_API_KEY}&chave_aplicacao=${LOJA_INTEGRADA_APP_KEY}`;

    let attempt = 0;
    let response;
    let usedMethod = 'PUT';
    
    while (attempt < 3) {
      console.log(`🔄 Tentativa ${attempt + 1}/3 (método: ${usedMethod})`);
      
      // Prepare payload
      const updatePayload = usedMethod === 'PUT' 
        ? { ...cleanedProduct, descricao_completa: htmlContent }
        : { descricao_completa: htmlContent };
      
      response = await fetch(url, {
        method: usedMethod,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        console.log(`✅ ${usedMethod} bem-sucedido`);
        break;
      }
      
      // Se PUT retornar 405 (Method Not Allowed), tenta PATCH
      if (response.status === 405 && usedMethod === 'PUT') {
        console.warn('⚠️ PUT não permitido (405), tentando PATCH...');
        usedMethod = 'PATCH';
        continue;
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
        li_product_id: liProductId,
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
