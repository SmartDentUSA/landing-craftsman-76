import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialContentRequest {
  type: 'whatsapp' | 'youtube' | 'instagram';
  productId: string;
  customPrompt?: string;
  instagramType?: 'feed' | 'reels' | 'carousel';
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

    const { type, productId, customPrompt, instagramType }: SocialContentRequest = await req.json();

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
      let functionId: string;
      let promptName: string;
      
      if (type === 'whatsapp') {
        functionId = 'generate-whatsapp-messages';
        promptName = 'Mensagem Promocional WhatsApp';
      } else if (type === 'youtube') {
        functionId = 'generate-youtube-descriptions';
        promptName = 'Descrição Completa YouTube';
      } else if (type === 'instagram') {
        functionId = 'generate-instagram-copy';
        if (instagramType === 'reels') {
          promptName = 'Copy Vídeo Reels';
        } else if (instagramType === 'carousel') {
          promptName = 'Copy Carrossel';
        } else {
          promptName = 'Copy Feed (post estático)';
        }
      } else {
        throw new Error(`Tipo inválido: ${type}`);
      }
      
      const { data: promptConfig } = await supabase
        .from('prompts_configuration')
        .select('custom_prompt')
        .eq('edge_function_id', functionId)
        .eq('prompt_name', promptName)
        .single();

      if (promptConfig?.custom_prompt) {
        finalPrompt = promptConfig.custom_prompt;
      } else {
        finalPrompt = getDefaultPrompt(type, instagramType);
      }
    }

    // Processar variáveis no prompt
    const processedPrompt = processPromptVariables(finalPrompt, product, company);

    // Gerar conteúdo com DeepSeek
    const generatedContent = await generateWithDeepSeek(deepseekApiKey, processedPrompt, type);

    // Salvar no banco
    let fieldName: string = '';
    let currentData: any = {};

    if (type === 'whatsapp') {
      fieldName = 'whatsapp_messages';
      currentData = product[fieldName] || { messages: [], last_generated: null };
      currentData.messages = currentData.messages || [];
      currentData.messages.unshift({
        id: crypto.randomUUID(),
        content: generatedContent,
        generated_at: new Date().toISOString(),
        editable: true
      });
      // Manter apenas os últimos 10
      currentData.messages = currentData.messages.slice(0, 10);
    } else if (type === 'youtube') {
      fieldName = 'youtube_descriptions';
      currentData = product[fieldName] || { descriptions: [], last_generated: null };
      currentData.descriptions = currentData.descriptions || [];
      currentData.descriptions.unshift({
        id: crypto.randomUUID(),
        content: generatedContent,
        generated_at: new Date().toISOString(),
        editable: true
      });
      // Manter apenas os últimos 10
      currentData.descriptions = currentData.descriptions.slice(0, 10);
    } else if (type === 'instagram') {
      fieldName = 'instagram_copies';
      currentData = product[fieldName] || { copies: [], last_generated: null };
      currentData.copies = currentData.copies || [];
      currentData.copies.unshift({
        id: crypto.randomUUID(),
        ...generatedContent,
        generated_at: new Date().toISOString(),
        editable: true
      });
      // Manter apenas os últimos 10
      currentData.copies = currentData.copies.slice(0, 10);
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

function getDefaultPrompt(type: 'whatsapp' | 'youtube' | 'instagram', instagramType?: 'feed' | 'reels' | 'carousel'): string {
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
  } else if (type === 'youtube') {
    return `Você é um especialista em criação de conteúdo para YouTube e SEO de vídeos.

Gere uma descrição completa para vídeo do YouTube que otimize o alcance e engajamento.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}

Informações da Empresa:
- Template de Rodapé: {company.youtube_company_footer}

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown, sem texto adicional.
Use quebras de linha (\\n) que serão convertidas automaticamente para quebras reais na exibição.

Exemplo do formato JSON esperado:
{
  "title_suggestion": "Sugestão de título SEO otimizado",
  "description": "Descrição completa formatada incluindo o template de rodapé com quebras de linha usando \\n",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANTE: Não use blocos de código markdown (\`\`\`json), retorne apenas o JSON puro.`;
  } else if (type === 'instagram') {
    if (instagramType === 'reels') {
      return `Você é um especialista em marketing digital no Instagram especializado em conteúdo para Reels. Crie uma copy otimizada para vídeos Reels.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

INSTRUÇÕES ESPECÍFICAS PARA REELS:
1. Copy Principal: Máximo 2200 caracteres, mas mais dinâmica e energética
2. Hook inicial: Muito impactante, cause curiosidade nos primeiros 3 segundos
3. Linguagem: Mais casual, use gírias quando apropriado ao público
4. Timing: Pense na sincronização com as cenas do vídeo
5. Interação: Incentive likes, shares, comentários e saves
6. Copy para Stories: Versão para republicar nos Stories
7. Hashtags: Foque em hashtags de Reels e tendências
8. Call-to-Action: CTAs específicos para vídeo ("Assista até o final", "Duplo toque se concorda")

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

{
  "feed_copy": "Copy dinâmica para Reels com hooks impactantes \\n\\nLinguagem energética e casual",
  "story_copy": "Versão para Stories - máximo 160 caracteres",
  "hashtags": ["#reels", "#viral", "#trending"],
  "call_to_action": "Assista até o final! Duplo toque se concorda 🔥",
  "post_type": "reels"
}`;
    } else if (instagramType === 'carousel') {
      return `Você é um especialista em marketing digital no Instagram especializado em posts em carrossel. Crie uma copy estratégica para carrossel com múltiplas imagens.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

INSTRUÇÕES ESPECÍFICAS PARA CARROSSEL:
1. Copy Principal: Máximo 2200 caracteres, estruturada para múltiplas imagens
2. Narrativa sequencial: Conte uma história que se desenvolve através dos slides
3. Ganchos para deslizar: Crie curiosidade para o próximo slide
4. Numeração: Use "1/5", "Slide 2:", etc. quando apropriado
5. Informação progressiva: Cada slide adiciona valor ao anterior
6. Call-to-Action: CTAs que incentivem deslizar e salvar

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

{
  "feed_copy": "Copy educativa para carrossel com narrativa sequencial \\n\\nSlide 1: Introdução \\nSlide 2: Desenvolvimento...",
  "story_copy": "Versão para Stories destacando valor educativo",
  "hashtags": ["#carrossel", "#educativo", "#dicas"],
  "call_to_action": "Salve este post para não esquecer! Deslize para ver tudo →",
  "post_type": "carousel"
}`;
    } else {
      return `Você é um especialista em marketing digital no Instagram. Crie uma copy envolvente e otimizada para posts estáticos de feed do Instagram.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}

Informações da Empresa:
- Nome: {company.company_name}
- Mention: @smartdentoficial

INSTRUÇÕES ESPECÍFICAS PARA POST ESTÁTICO:
1. Copy Principal: Máximo 2200 caracteres, foque em storytelling envolvente
2. Início impactante: Hook que prenda a atenção nos primeiros segundos
3. Desenvolvimento: História que conecte emocionalmente com o público
4. Narrativa visual: Descreva como o produto se encaixa na vida do usuário
5. Copy para Stories: Versão resumida de até 160 caracteres

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

{
  "feed_copy": "Copy principal para feed com storytelling envolvente \\n\\nIncluir quebras de linha",
  "story_copy": "Versão resumida para Stories - máximo 160 caracteres",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "Link na bio para saber mais! 👆",
  "post_type": "feed"
}`;
    }
  }
  
  throw new Error(`Tipo não suportado: ${type}`);
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

  // Processar keywords
  const keywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  const keywordsText = keywordsArray.join(', ') || 'Não informadas';
  processedPrompt = processedPrompt.replace(/{product\.keywords}/g, keywordsText);

  // Processar target audience
  const targetAudienceArray = Array.isArray(product.target_audience) ? product.target_audience : [];
  const targetAudienceText = targetAudienceArray.join(', ') || 'Não informado';
  processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, targetAudienceText);

  // Processar preço
  const priceText = product.price ? `${product.currency || 'R$'} ${product.price}` : 'Não informado';
  processedPrompt = processedPrompt.replace(/{product\.price}/g, priceText);

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

function cleanJsonResponse(content: string): string {
  // Remove blocos de código markdown
  let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove texto adicional antes e depois do JSON
  const jsonStart = cleanContent.indexOf('{');
  const jsonEnd = cleanContent.lastIndexOf('}') + 1;
  
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    cleanContent = cleanContent.substring(jsonStart, jsonEnd);
  }
  
  return cleanContent.trim();
}

async function generateWithDeepSeek(apiKey: string, prompt: string, type: 'whatsapp' | 'youtube' | 'instagram'): Promise<any> {
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
  let content = data.choices[0].message.content;

  console.log('Raw content from DeepSeek:', content);

  // Para YouTube e Instagram, tentar parsear como JSON
  if (type === 'youtube' || type === 'instagram') {
    try {
      // Limpar resposta antes de parsear
      const cleanedContent = cleanJsonResponse(content);
      console.log('Cleaned content:', cleanedContent);
      
      const parsed = JSON.parse(cleanedContent);
      
      // Converter \n em quebras de linha reais
      if (parsed.description) {
        parsed.description = parsed.description.replace(/\\n/g, '\n');
      }
      if (parsed.feed_copy) {
        parsed.feed_copy = parsed.feed_copy.replace(/\\n/g, '\n');
      }
      if (parsed.story_copy) {
        parsed.story_copy = parsed.story_copy.replace(/\\n/g, '\n');
      }
      
      return parsed;
    } catch (error) {
      console.error('JSON parse error:', error);
      console.log('Failed to parse content:', content);
      
      // Se não conseguir parsear, retornar como texto simples com fallback
      return {
        title_suggestion: "Título sugerido não disponível",
        description: content.replace(/\\n/g, '\n'),
        tags: []
      };
    }
  }

  return content;
}