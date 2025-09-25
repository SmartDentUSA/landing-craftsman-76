import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialContentRequest {
  type: 'whatsapp' | 'youtube';
  productId: string;
  customPrompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, productId, customPrompt }: SocialContentRequest = await req.json();

    console.log(`Generating ${type} content for product ${productId}`);

    // Buscar dados do produto
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Produto não encontrado: ${productError?.message}`);
    }

    // Buscar dados da empresa
    const { data: company, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Dados da empresa não encontrados:', companyError.message);
    }

    // Buscar configuração de prompt personalizado
    let finalPrompt: string = customPrompt || '';
    if (!finalPrompt) {
      const functionId = type === 'whatsapp' ? 'generate-whatsapp-messages' : 'generate-youtube-descriptions';
      const promptName = type === 'whatsapp' ? 'Mensagem Promocional WhatsApp' : 'Descrição Completa YouTube';
      
      const { data: promptConfig } = await supabase
        .from('prompts_configuration')
        .select('custom_prompt')
        .eq('edge_function_id', functionId)
        .eq('prompt_name', promptName)
        .single();

      if (promptConfig?.custom_prompt) {
        finalPrompt = promptConfig.custom_prompt;
      } else {
        finalPrompt = getDefaultPrompt(type);
      }
    }

    // Processar variáveis no prompt
    const processedPrompt = processPromptVariables(finalPrompt, product, company);

    // Gerar conteúdo com DeepSeek
    const generatedContent = await generateWithDeepSeek(deepseekApiKey, processedPrompt, type);

    // Salvar no banco
    const fieldName = type === 'whatsapp' ? 'whatsapp_messages' : 'youtube_descriptions';
    const currentData = product[fieldName] || { messages: [], descriptions: [], last_generated: null };
    
    if (type === 'whatsapp') {
      currentData.messages = currentData.messages || [];
      currentData.messages.unshift({
        id: crypto.randomUUID(),
        content: generatedContent,
        generated_at: new Date().toISOString(),
        editable: true
      });
      // Manter apenas os últimos 10
      currentData.messages = currentData.messages.slice(0, 10);
    } else {
      currentData.descriptions = currentData.descriptions || [];
      currentData.descriptions.unshift({
        id: crypto.randomUUID(),
        content: generatedContent,
        generated_at: new Date().toISOString(),
        editable: true
      });
      // Manter apenas os últimos 10
      currentData.descriptions = currentData.descriptions.slice(0, 10);
    }

    currentData.last_generated = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ [fieldName]: currentData })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar: ${updateError.message}`);
    }

    console.log(`${type} content generated and saved successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent,
        type: type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-social-content function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getDefaultPrompt(type: 'whatsapp' | 'youtube'): string {
  if (type === 'whatsapp') {
    return `Você é um especialista em marketing digital e comunicação para WhatsApp.

Crie uma mensagem promocional otimizada para WhatsApp que seja envolvente e gere conversões.

Informações do Produto:
- Nome: {product.name}
- Resumo Comercial: {product.sales_pitch}
- Benefícios: {product.benefits}
- URL do Produto: {product.product_url}
- Categoria: {product.category}

Template da Mensagem:
🔥 [NOME DO PRODUTO] 🔥

[RESUMO COMERCIAL EM 1-2 FRASES IMPACTANTES]

✅ PRINCIPAIS BENEFÍCIOS:
[LISTE ATÉ 10 BENEFÍCIOS COM EMOJIS RELEVANTES]

🛒 Saiba mais → [LINK DO PRODUTO]

#[EMPRESA] #[CATEGORIA]

Instruções:
1. Use emojis relevantes para cada benefício
2. Mantenha linguagem conversacional e persuasiva
3. Máximo 1000 caracteres (ideal para WhatsApp)
4. Inclua call-to-action claro
5. Use hashtags da empresa e categoria

Retorne apenas o texto da mensagem formatada, sem explicações.`;
  } else {
    return `Você é um especialista em criação de conteúdo para YouTube e SEO de vídeos.

Gere uma descrição completa para vídeo do YouTube que otimize o alcance e engajamento.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}

Informações da Empresa:
- Template de Rodapé: {company.youtube_company_footer}

Retorne no formato JSON:
{
  "title_suggestion": "Sugestão de título SEO otimizado",
  "description": "Descrição completa formatada incluindo o template de rodapé",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;
  }
}

function processPromptVariables(prompt: string, product: any, company: any): string {
  let processedPrompt = prompt;

  // Variáveis do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.sales_pitch}/g, product.sales_pitch || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.product_url}/g, product.product_url || '#');
  
  // Processar benefícios
  const benefitsArray = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefitsArray.join(', ') || 'Não informados';
  processedPrompt = processedPrompt.replace(/{product\.benefits}/g, benefitsText);

  // Variáveis da empresa
  if (company) {
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, company.company_name || 'Não informado');
    processedPrompt = processedPrompt.replace(/{company\.youtube_company_footer}/g, company.youtube_company_footer || '');
  } else {
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, 'Não informado');
    processedPrompt = processedPrompt.replace(/{company\.youtube_company_footer}/g, '');
  }

  return processedPrompt;
}

async function generateWithDeepSeek(apiKey: string, prompt: string, type: 'whatsapp' | 'youtube'): Promise<any> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: type === 'whatsapp' ? 500 : 1500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Para YouTube, tentar parsear como JSON
  if (type === 'youtube') {
    try {
      return JSON.parse(content);
    } catch {
      // Se não conseguir parsear, retornar como texto simples
      return {
        title_suggestion: "Título sugerido não disponível",
        description: content,
        tags: []
      };
    }
  }

  return content;
}