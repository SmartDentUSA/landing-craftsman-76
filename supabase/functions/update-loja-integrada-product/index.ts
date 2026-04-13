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
const LOJA_INTEGRADA_API_BASE = "https://api.awsli.com.br/v1";

function buildLojaIntegradaProductUrl(liProductId: string) {
  return `${LOJA_INTEGRADA_API_BASE}/produto/${liProductId}?chave_api=${LOJA_INTEGRADA_API_KEY}&chave_aplicacao=${LOJA_INTEGRADA_APP_KEY}`;
}

function parseJsonResponse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw_response: text };
  }
}

function extractProductIdFromResourceUri(resourceUri?: string | null) {
  const match = resourceUri?.match(/\/produto\/(\d+)\/?$/);
  return match?.[1] ?? null;
}

function normalizeHtmlForComparison(html?: string | null) {
  return (html || '').replace(/\r\n/g, '\n').trim();
}

function sanitizeSlug(slug: string) {
  return slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function fetchLojaIntegradaProduct(liProductId: string) {
  const response = await fetch(buildLojaIntegradaProductUrl(liProductId), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const text = await response.text();
  return {
    response,
    body: parseJsonResponse(text),
  };
}

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
      .select('original_data, name')
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
    const { response: getResponse, body: currentProduct } = await fetchLojaIntegradaProduct(liProductId);

    if (!getResponse.ok) {
      const error = currentProduct;
      console.error(`❌ Erro ao buscar produto: ${getResponse.status}`, error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erro ao buscar produto: ${error.detail || error.message || getResponse.status}`,
        }),
        { status: getResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Produto atual obtido, preparando atualização...');

    let targetLiProductId = liProductId;
    let targetProduct = currentProduct;

    const parentLiProductId = extractProductIdFromResourceUri(currentProduct?.pai);
    if (currentProduct?.tipo === 'atributo_opcao' && parentLiProductId) {
      console.log('🔀 Produto de variação detectado, atualizando produto pai:', {
        requestedLiProductId: liProductId,
        parentLiProductId,
      });

      const { response: parentResponse, body: parentProduct } = await fetchLojaIntegradaProduct(parentLiProductId);

      if (!parentResponse.ok) {
        console.error(`❌ Erro ao buscar produto pai: ${parentResponse.status}`, parentProduct);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erro ao buscar produto pai: ${parentProduct.detail || parentProduct.message || parentResponse.status}`,
          }),
          { status: parentResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetLiProductId = parentLiProductId;
      targetProduct = parentProduct;
    }

    console.log('🎯 Produto alvo da atualização:', {
      requestedLiProductId: liProductId,
      targetLiProductId,
      requestedType: currentProduct?.tipo || null,
      targetType: targetProduct?.tipo || null,
    });

    // 🔄 Fallback robusto para garantir que 'nome' nunca seja null
    const productName = targetProduct?.nome 
                     || currentProduct?.nome
                     || currentProduct?.produto?.nome
                     || product?.name
                     || product?.original_data?.nome
                     || product?.original_data?.titulo
                     || product?.original_data?.name
                     || 'Produto';
    
    console.log('📝 Nome que será usado:', productName);

    // 2. Mesclar HTML atualizado com dados existentes
    const updatePayload = {
      ...targetProduct,
      descricao_completa: htmlContent,
      nome: productName,  // ← SEMPRE presente, sobrescreve null
    };

    // 3. Se tiver categoria no banco, usa ela (prioridade) - FORMATO: ARRAY de URIs
    if (categoryId) {
      updatePayload.categorias = [`/v1/categoria/${categoryId}/`];
      console.log('✅ Categoria do banco aplicada (array):', updatePayload.categorias);
    }

    // 4. Limpar campos que a API não aceita no PUT
    delete updatePayload.resource_uri;
    delete updatePayload.id;
    delete updatePayload.created_at;
    delete updatePayload.updated_at;
    delete updatePayload.data_criacao;
    delete updatePayload.data_modificacao;

    // 5. Sanitizar apelido (slug) - remover caracteres inválidos
    if (updatePayload.apelido) {
      updatePayload.apelido = sanitizeSlug(updatePayload.apelido);
      console.log('🔤 Slug sanitizado:', updatePayload.apelido);
    }
    
    // ✅ DEBUG: Mostrar exatamente o que vai ser enviado
    console.log('📦 Campos principais do payload:', {
      requestedLiProductId: liProductId,
      targetLiProductId,
      nome: updatePayload.nome,
      disponibilidade: updatePayload.disponibilidade,
      categoria: updatePayload.categorias,
      htmlSize: updatePayload.descricao_completa?.length
    });

    // Enviar PUT com payload completo
    console.log('📤 Enviando PUT para Loja Integrada...');
    const url = buildLojaIntegradaProductUrl(targetLiProductId);

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
        // Capturar tanto JSON quanto texto para debug completo
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { raw_response: errorText };
        }
        console.error(`❌ Erro HTTP ${response.status}:`, error);
        
        // ✅ RETURN imediato para evitar continuar processamento
        return new Response(
          JSON.stringify({
            success: false,
            message: error.detail || error.error_message || error.message || error.raw_response || `Erro ${response.status}`,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Processar resposta final
    const resultText = await response!.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      result = { raw_response: resultText };
    }
    
    if (!response!.ok) {
      console.error('❌ Resposta de erro da Loja Integrada:', result);
      return new Response(
        JSON.stringify({
          success: false,
          message: result.detail || result.message || result.raw_response || `Erro (${response!.status}) na API da Loja Integrada`,
        }),
        { status: response!.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Validando descrição após PUT...');
    const { response: verifyResponse, body: verifiedProduct } = await fetchLojaIntegradaProduct(targetLiProductId);

    if (!verifyResponse.ok) {
      console.error(`❌ Falha ao validar produto após PUT: ${verifyResponse.status}`, verifiedProduct);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Produto atualizado, mas não foi possível validar o resultado: ${verifiedProduct.detail || verifiedProduct.message || verifyResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedSentHtml = normalizeHtmlForComparison(htmlContent);
    const normalizedVerifiedHtml = normalizeHtmlForComparison(verifiedProduct?.descricao_completa);
    const htmlVerified = normalizedSentHtml === normalizedVerifiedHtml;

    console.log('🧪 Resultado da validação pós-PUT:', {
      requestedLiProductId: liProductId,
      targetLiProductId,
      updatedParentProduct: targetLiProductId !== liProductId,
      htmlVerified,
      sentLength: normalizedSentHtml.length,
      verifiedLength: normalizedVerifiedHtml.length,
    });

    if (!htmlVerified) {
      console.error('❌ A Loja Integrada respondeu OK, mas a descrição visível não foi atualizada como esperado');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Loja Integrada respondeu com sucesso, mas a descrição visível do produto não foi atualizada como esperado',
          requested_li_product_id: liProductId,
          target_li_product_id: targetLiProductId,
          updated_parent_product: targetLiProductId !== liProductId,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ HTML + Categoria atualizados com sucesso!');
    return new Response(
      JSON.stringify({
        success: true,
        li_product_id: liProductId,
        target_li_product_id: targetLiProductId,
        updated_parent_product: targetLiProductId !== liProductId,
        category_sent: !!categoryId,
        verified: true,
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
