import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialContentRequest {
  type: 'whatsapp' | 'youtube' | 'instagram' | 'whatsapp_sequence' | 'whatsapp_promo_variation';
  productId: string;
  customPrompt?: string;
  instagramType?: 'feed' | 'reels' | 'carousel';
  priceInfo?: {
    price?: number;
    promo_price?: number;
    savings?: number;
    discount_percent?: number;
    currency?: string;
  };
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

    const { type, productId, customPrompt, instagramType, priceInfo }: SocialContentRequest = await req.json();

    console.log(`Generating ${type} content for product ${productId}`);

    // Buscar dados do produto incluindo bot_trigger_words
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Produto não encontrado: ${productError?.message}`);
    }

    console.log('Product data loaded:', {
      name: product.name,
      benefits: Array.isArray(product.benefits) ? product.benefits.length : 0,
      keywords: Array.isArray(product.keywords) ? product.keywords.length : 0,
      bot_trigger_words: Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words.length : 0
    });

    // Buscar dados da empresa
    const { data: company, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Dados da empresa não encontrados:', companyError.message);
    }

    // Buscar links externos aprovados para WhatsApp
    const { data: externalLinks, error: linksError } = await supabase
      .from('external_links')
      .select('name, url, category')
      .eq('approved', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (linksError) {
      console.warn('Erro ao carregar links externos:', linksError.message);
    }

    // Buscar landing pages publicadas para links internos
    const { data: landingPages, error: landingPagesError } = await supabase
      .from('landing_pages')
      .select('id, name, data')
      .eq('status', 'published')
      .order('name', { ascending: true });

    if (landingPagesError) {
      console.warn('Erro ao carregar landing pages:', landingPagesError.message);
    }

    // Tratamento PRIORITÁRIO para whatsapp_promo_variation (early return)
    if (type === 'whatsapp_promo_variation') {
      console.log('💰 Gerando mensagem WhatsApp Promo (De/Por)...');
      
      const formatCurrency = (value?: number) => {
        if (!value) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: priceInfo?.currency || 'BRL'
        }).format(value);
      };

      const promoPrompt = `Você é um especialista em marketing digital e comunicação para WhatsApp.

Crie uma mensagem promocional EXCLUSIVA destacando a variação de preço (De/Por).

Informações do Produto:
- Nome: ${product.name}
- Preço Original: ${formatCurrency(priceInfo?.price)}
- Preço Promocional: ${formatCurrency(priceInfo?.promo_price)}
- Economia: ${formatCurrency(priceInfo?.savings)}
- Desconto: ${priceInfo?.discount_percent}%
- Resumo Comercial: ${product.sales_pitch || 'N/A'}
- Benefícios: ${Array.isArray(product.benefits) ? product.benefits.join(', ') : 'N/A'}
- URL do Produto: ${product.product_url || ''}

Template da Mensagem:
🎁 PROMOÇÃO ESPECIAL! 🎁

[NOME DO PRODUTO]

💸 De: [PREÇO ORIGINAL]
💰 Por: [PREÇO PROMOCIONAL]
🔥 Economia de [VALOR] ([PERCENTUAL]% OFF)

✅ PRINCIPAIS BENEFÍCIOS:
[LISTE ATÉ 10 BENEFÍCIOS COM EMOJIS RELEVANTES]

💬 Responda 'QUERO' que envio mais detalhes!

🛒 Garanta já → [LINK DO PRODUTO]

⏰ OFERTA POR TEMPO LIMITADO!

Instruções:
1. Use emojis relevantes e atrativos
2. Destaque a economia e o percentual de desconto
3. Crie senso de urgência ("Oferta limitada", "Aproveite agora")
4. Máximo 1000 caracteres
5. Linguagem persuasiva e direta
6. Foque na transformação/resultado que o produto traz

Retorne apenas o texto da mensagem formatada, sem explicações.

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO:**
- Use APENAS informações do produto fornecidas
- NÃO invente benefícios ou características
- Descontos e preços devem ser baseados em dados reais`;

      const promoContent = await generateWithDualAI(deepseekApiKey, promoPrompt, 'whatsapp', product);

      return new Response(
        JSON.stringify({ 
          success: true, 
          content: promoContent,
          type: 'whatsapp_promo_variation'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tratamento PRIORITÁRIO para whatsapp_sequence (early return)
    if (type === 'whatsapp_sequence') {
      console.log('🔄 Gerando sequência de 7 mensagens WhatsApp...');
      
      const sequencePrompt = getSequencePrompt(product, company, externalLinks || [], landingPages || []);
      const sequenceContent = await generateSequenceWithDualAI(deepseekApiKey, sequencePrompt);
      
      const newGeneration = {
        id: crypto.randomUUID(),
        generated_at: new Date().toISOString(),
        messages: sequenceContent.map((msg: any, index: number) => ({
          id: crypto.randomUUID(),
          number: index + 1,
          content: msg.content,
          editable: true,
          approach: msg.approach
        }))
      };
      
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('whatsapp_sequences')
        .eq('id', productId)
        .single();
      
      const existingSequences = existingData?.whatsapp_sequences?.sequences || [];
      
      const updatedSequences = {
        sequences: [newGeneration, ...existingSequences].slice(0, 10),
        last_generated: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('products_repository')
        .update({ whatsapp_sequences: updatedSequences })
        .eq('id', productId);
        
      if (updateError) throw updateError;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          sequence: newGeneration,
          type: 'whatsapp_sequence'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tratamento para múltiplas variações de Instagram (Feed e Reels)
    if (type === 'instagram' && (instagramType === 'feed' || instagramType === 'reels')) {
      console.log(`🎨 Gerando 4 variações para ${instagramType}...`);
      
      const variations = await generateMultipleVariations(
        productId,
        instagramType,
        deepseekApiKey,
        supabase
      );
      
      // Salvar as variações no banco
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();
      
      const existingCopies = existingData?.instagram_copies || {};
      
      const fieldName = instagramType === 'feed' ? 'feed_copies' : 'reels_copies';
      
      const updatedCopies = {
        ...existingCopies,
        [fieldName]: variations,
        last_generated: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('products_repository')
        .update({ instagram_copies: updatedCopies })
        .eq('id', productId);
        
      if (updateError) throw updateError;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          content: { [fieldName]: variations },
          message: `4 variações de ${instagramType} geradas com sucesso!`,
          type: 'instagram'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração de prompt personalizado
    let finalPrompt: string = customPrompt || '';
    if (!finalPrompt) {
      let functionId: string = '';
      let promptName: string = '';
      
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
        .maybeSingle();
      
      if (promptConfig?.custom_prompt) {
        finalPrompt = promptConfig.custom_prompt;
      } else {
        finalPrompt = getDefaultPrompt(type as 'whatsapp' | 'youtube' | 'instagram', instagramType);
      }
    }

    // whatsapp_sequence é tratado anteriormente via early return

    // Processar variáveis no prompt
    const processedPrompt = processPromptVariables(finalPrompt, product, company, externalLinks || [], landingPages || []);

    // Adicionar instruções anti-alucinação
    const finalPromptWithProtection = `${processedPrompt}

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO:**
- Use APENAS informações do produto e empresa fornecidas
- NÃO invente características, benefícios ou especificações
- Se dados estiverem ausentes, seja genérico mas honesto
- Evite termos técnicos não mencionados nos dados
- Base todo conteúdo em informações reais do contexto`;

    // Gerar conteúdo com Dual-AI Competition
    const generatedContent = await generateWithDualAI(deepseekApiKey, finalPromptWithProtection, type, product);

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
      
      // Carregar histórico existente
      const existingCopies = product[fieldName] || { copies: [] };
      const existingHistory = existingCopies.copies || [];
      
      // Criar nova versão
      const newVersion = {
        id: crypto.randomUUID(),
        ...generatedContent,
        generated_at: new Date().toISOString(),
        ai_source: "deepseek-chat"
      };
      
      // Adicionar ao histórico (últimas 10 versões)
      const updatedHistory = [newVersion, ...existingHistory].slice(0, 10);
      
      // Atualizar com histórico + campos de compatibilidade
      currentData = {
        copies: updatedHistory,
        // Campos de compatibilidade (última versão)
        feed_copy: newVersion.feed_copy,
        story_copy: newVersion.story_copy,
        reels_copy: newVersion.reels_copy,
        feed_link: newVersion.feed_link || '',
        story_link: newVersion.story_link || '',
        reels_link: newVersion.reels_link || '',
        hashtags: newVersion.hashtags,
        call_to_action: newVersion.call_to_action,
        last_generated: newVersion.generated_at
      };
      
      console.log(`✅ Instagram copies saved with version history: ${updatedHistory.length} versions`);
    }

    currentData.last_generated = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ [fieldName]: currentData })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar: ${updateError.message}`);
    }

    // Verificação pós-salvamento - buscar dados salvos para confirmar
    const { data: savedProduct } = await supabase
      .from('products_repository')
      .select(fieldName)
      .eq('id', productId)
      .single();

    console.log(`${type} content generated and saved successfully`);
    console.log('Saved data verification:', savedProduct?.[fieldName as keyof typeof savedProduct]);

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

// Função para gerar múltiplas variações com diferentes abordagens
async function generateMultipleVariations(
  productId: string,
  type: 'feed' | 'reels',
  deepseekApiKey: string,
  supabaseClient: any
): Promise<Array<{ variation: number; approach: string; copy: string; hashtags?: string[]; call_to_action?: string }>> {
  
  const approaches = type === 'feed' 
    ? ['storytelling', 'benefits', 'problem_solution', 'urgency']
    : ['educational', 'trending', 'behind_scenes', 'demonstration'];
  
  const variations = [];
  
  for (let i = 0; i < 4; i++) {
    console.log(`🎨 Gerando variação ${i+1}/4 para ${type} - Abordagem: ${approaches[i]}`);
    
    try {
      // Gerar conteúdo com a abordagem específica
      const result = await generateVariationWithApproach(
        productId,
        type,
        approaches[i],
        deepseekApiKey,
        supabaseClient
      );
      
      variations.push({
        variation: i + 1,
        approach: approaches[i],
        copy: result.copy,
        hashtags: result.hashtags,
        call_to_action: result.call_to_action
      });
      
      // Delay entre variações para evitar rate limit
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Erro ao gerar variação ${i+1}:`, error);
      // Continuar mesmo se uma variação falhar
      variations.push({
        variation: i + 1,
        approach: approaches[i],
        copy: `Erro ao gerar esta variação. Tente novamente.`,
        hashtags: [],
        call_to_action: ''
      });
    }
  }
  
  return variations;
}

// Função para gerar uma variação com abordagem específica
async function generateVariationWithApproach(
  productId: string,
  type: 'feed' | 'reels',
  approach: string,
  deepseekApiKey: string,
  supabaseClient: any
): Promise<{ copy: string; hashtags?: string[]; call_to_action?: string }> {
  
  // Buscar dados do produto
  const { data: product, error: productError } = await supabaseClient
    .from('products_repository')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    throw new Error(`Produto não encontrado: ${productError?.message}`);
  }

  // Buscar dados da empresa
  const { data: company } = await supabaseClient
    .from('company_profile')
    .select('*')
    .limit(1)
    .single();

  // Construir prompt com a abordagem específica
  const prompt = buildPromptWithApproach(product, company, type, approach);
  
  // Gerar conteúdo com Dual-AI
  const result = await generateWithDualAI(deepseekApiKey, prompt, 'instagram', product);
  
  return {
    copy: result.feed_copy || result.content || '',
    hashtags: result.hashtags || [],
    call_to_action: result.call_to_action || ''
  };
}

// Construir prompt com abordagem específica
function buildPromptWithApproach(
  product: any,
  company: any,
  type: 'feed' | 'reels',
  approach: string
): string {
  const approachGuides: Record<string, string> = {
    storytelling: '📖 STORYTELLING: Conte uma história envolvente que conecte emocionalmente. Use narrativa pessoal, jornada do cliente, transformação.',
    benefits: '✨ BENEFÍCIOS: Foque nos benefícios práticos e transformação que o produto oferece. Destaque resultados concretos.',
    problem_solution: '💡 PROBLEMA/SOLUÇÃO: Identifique um problema específico do público e apresente o produto como solução ideal.',
    urgency: '⏰ URGÊNCIA: Crie senso de urgência (oferta limitada, escassez, FOMO). Use gatilhos de ação imediata.',
    educational: '🎓 EDUCATIVA: Ensine algo novo, dê dica valiosa, seja instrutivo. Agregue valor com conhecimento.',
    trending: '🔥 TRENDING: Use trends atuais, sons populares, formatos virais. Adapte para o produto de forma criativa.',
    behind_scenes: '🎬 BASTIDORES: Mostre os bastidores, processo, autenticidade. Humanize a marca e produto.',
    demonstration: '🎯 DEMONSTRAÇÃO: Demonstre o produto em uso, mostre resultados práticos. Prova social e evidências.'
  };

  const baseInfo = `
Informações do Produto:
- Nome: ${product.name || 'N/A'}
- Descrição: ${product.description || 'N/A'}
- Categoria: ${product.category || 'N/A'}
- Preço: ${product.price ? `R$ ${product.price}` : 'N/A'}
- Benefícios: ${Array.isArray(product.benefits) ? product.benefits.join(', ') : 'N/A'}
- Público-alvo: ${Array.isArray(product.target_audience) ? product.target_audience.join(', ') : 'N/A'}

Informações da Empresa:
- Nome: ${company?.company_name || 'N/A'}
- Mention: @smartdentoficial

PALAVRAS GATILHO BOT: ${Array.isArray(product.bot_trigger_words) && product.bot_trigger_words.length > 0 
  ? product.bot_trigger_words.join(', ') 
  : 'QUERO'}`;

  if (type === 'feed') {
    return `Você é um especialista em marketing digital no Instagram especializado em posts de Feed.

${baseInfo}

🎯 ABORDAGEM CRIATIVA OBRIGATÓRIA:
${approachGuides[approach]}

Crie uma copy ÚNICA e ORIGINAL seguindo EXCLUSIVAMENTE a abordagem "${approach}".
NÃO misture outras abordagens. Seja criativo e autêntico.

INSTRUÇÕES ESPECÍFICAS PARA FEED:
1. Copy Principal: Máximo 2200 caracteres
2. Hook inicial: Pare o scroll nos primeiros 2 segundos
3. Estrutura: Introdução > Desenvolvimento > Call-to-action
4. Hashtags: 5-10 hashtags relevantes (inclua sempre #dentala #eodonto quando apropriado)
5. Call-to-Action OBRIGATÓRIO: Use uma palavra gatilho BOT

TEMPLATES OBRIGATÓRIOS PARA A ÚLTIMA FRASE (escolha 1):
- "💬 Comenta '{random_trigger_word}' que te explico tudo!"
- "💬 Manda '{random_trigger_word}' no direct para mais informações!"
- "💬 Deixa '{random_trigger_word}' nos comentários!"

Se não houver palavras gatilho, use: "💬 Comenta 'QUERO' que te mando mais informações!"

CRÍTICO: Retorne APENAS um JSON válido sem blocos de código markdown.

Formato JSON obrigatório:
{
  "feed_copy": "Copy completa para feed seguindo a abordagem ${approach}",
  "hashtags": ["#tag1", "#tag2"],
  "call_to_action": "Frase final com palavra gatilho"
}

⚠️ INSTRUÇÕES ANTI-ALUCINAÇÃO:
- Use APENAS informações fornecidas
- NÃO invente características ou benefícios
- Mantenha-se fiel à abordagem ${approach}`;
  } else {
    return `Você é um estrategista de conteúdo para Instagram, especialista em Reels virais para o nicho de tecnologia odontológica.

${baseInfo}

🎯 ABORDAGEM CRIATIVA OBRIGATÓRIA:
${approachGuides[approach]}

Crie uma copy ÚNICA e ORIGINAL seguindo EXCLUSIVAMENTE a abordagem "${approach}".
Aplique a estrutura "Loop e Engajamento" abaixo com o ângulo da abordagem "${approach}".

📋 ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

A) **Headline (O Gancho de 3 segundos)**: Comece com uma frase curta que gere curiosidade extrema ou identifique um erro comum (ex: "O erro que está travando sua clínica" ou "Impressão 3D sem ser engenheiro?").

B) **O Conflito**: Exponha a frustração do dentista com o método antigo ou complexo em 2 frases rápidas.

C) **A Solução (O "Clímax")**: Apresente o produto como o herói que simplifica a vida, usando **negrito** no nome dele.

D) **Bullet Points de Desejo**: Liste 3 benefícios que poupam TEMPO ou DINHEIRO do dentista (use emojis 💸, ⏳, ✅).

E) **A Chamada para Ação (CTA de Engajamento)**: Use uma estratégia de "Isca Digital". Peça para o usuário comentar uma palavra específica das PALAVRAS GATILHO BOT para receber algo. Isso é crucial para o algoritmo entender que o post é relevante.

F) **Hashtags**: Sugira 5 hashtags estratégicas (sendo 2 amplas e 3 específicas do nicho).

📐 DIRETRIZES DE ALGORITMO:
- Sem paredes de texto: Máximo 2 frases por parágrafo
- Linguagem: Use termos como "mudar o jogo", "próximo nível", "sem perrengue"
- Tom: Dinâmico, viral, energético

CRÍTICO: Retorne APENAS um JSON válido sem blocos de código markdown.

Formato JSON obrigatório:
{
  "feed_copy": "Copy completa para Reels seguindo a estrutura Loop e Engajamento com abordagem ${approach}. Inclua Headline > Conflito > Solução > Bullet Points > CTA tudo no texto.",
  "hashtags": ["#hashtag_ampla1", "#hashtag_ampla2", "#hashtag_nicho1", "#hashtag_nicho2", "#hashtag_nicho3"],
  "call_to_action": "Frase de CTA com palavra gatilho BOT (isca digital)"
}

⚠️ INSTRUÇÕES ANTI-ALUCINAÇÃO:
- Use APENAS informações fornecidas
- NÃO invente características ou benefícios
- Mantenha-se fiel à abordagem ${approach}`;
  }
}

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

💬 Responda com '{random_trigger_word}' para receber mais informações!

🛒 Saiba mais → [LINK DO PRODUTO]

#[EMPRESA] #[CATEGORIA]

Instruções:
1. Use emojis relevantes para cada benefício
2. Mantenha linguagem conversacional e persuasiva
3. Máximo 1000 caracteres (ideal para WhatsApp)
4. Inclua call-to-action claro
5. Use hashtags da empresa e categoria
6. Palavras Gatilho: Use palavras gatilho configuradas: {trigger_word_examples}
   - Se configuradas, inclua frases como: "💬 Responda com '{random_trigger_word}' que envio mais detalhes!"
7. Links Personalizados: {available_links}
   - Inclua links relevantes quando apropriado para enriquecer a mensagem
   - Use os links com moderação, apenas quando agregarem valor real

Retorne apenas o texto da mensagem formatada, sem explicações.`;
  } else if (type === 'youtube') {
    return `Você é um especialista em criação de conteúdo para YouTube e SEO de vídeos.

Gere uma descrição completa para vídeo do YouTube baseada EXCLUSIVAMENTE nos dados fornecidos abaixo.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}
- Características: {product.features}
- Aplicações: {product.applications}
- Público-alvo: {product.target_audience}
- Keywords SEO: {product.keywords}

Informações da Empresa:
- Nome: {company.company_name}
- Template de Rodapé: {company.youtube_company_footer}

REGRAS ANTI-ALUCINAÇÃO (OBRIGATÓRIO):
- Use APENAS dados presentes acima. NÃO invente especificações, números ou benefícios
- NÃO faça promessas clínicas ou regulatórias não documentadas
- NÃO mencione produtos ou marcas que não estejam nos dados
- Se um campo diz "Não informado", NÃO invente conteúdo para ele
- Tags devem ser baseadas nas keywords reais do produto

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown, sem texto adicional.

Formato JSON esperado:
{
  "title_suggestion": "Título SEO baseado no nome real do produto",
  "description": "Descrição factual com dados reais do produto",
  "tags": ["tags", "baseadas", "nas", "keywords", "reais"]
}

IMPORTANTE: Não use blocos de código markdown, retorne apenas o JSON puro.`;
  } else if (type === 'instagram') {
    if (instagramType === 'reels') {
      return `Você é um estrategista de conteúdo para Instagram, especialista em Reels virais para o nicho de tecnologia odontológica.

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

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

📋 ESTRUTURA OBRIGATÓRIA DA RESPOSTA (Loop e Engajamento):

A) **Headline (O Gancho de 3 segundos)**: Comece com uma frase curta que gere curiosidade extrema ou identifique um erro comum (ex: "O erro que está travando sua clínica" ou "Impressão 3D sem ser engenheiro?").

B) **O Conflito**: Exponha a frustração do dentista com o método antigo ou complexo em 2 frases rápidas.

C) **A Solução (O "Clímax")**: Apresente o produto como o herói que simplifica a vida, usando **negrito** no nome dele.

D) **Bullet Points de Desejo**: Liste 3 benefícios que poupam TEMPO ou DINHEIRO do dentista (use emojis 💸, ⏳, ✅).

E) **A Chamada para Ação (CTA de Engajamento)**: Use uma estratégia de "Isca Digital". Peça para o usuário comentar uma palavra específica das PALAVRAS GATILHO BOT para receber algo. Isso é crucial para o algoritmo.

F) **Hashtags**: Sugira 5 hashtags estratégicas (sendo 2 amplas e 3 específicas do nicho).

📐 DIRETRIZES DE ALGORITMO:
- Sem paredes de texto: Máximo 2 frases por parágrafo
- Linguagem: Use termos como "mudar o jogo", "próximo nível", "sem perrengue"
- Tom: Dinâmico, viral, energético

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.
IMPORTANTE: As hashtags DEVEM estar sempre entre aspas. Exemplo CORRETO: ["#reels", "#viral"]

Formato JSON obrigatório:
{
  "feed_copy": "Copy completa para Reels seguindo a estrutura Loop e Engajamento: Headline > Conflito > Solução > Bullet Points > CTA. Linguagem energética e casual.",
  "story_copy": "Versão para Stories - máximo 160 caracteres",
  "hashtags": ["#hashtag_ampla1", "#hashtag_ampla2", "#hashtag_nicho1", "#hashtag_nicho2", "#hashtag_nicho3"],
  "call_to_action": "Frase de CTA com palavra gatilho BOT (isca digital)",
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

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

INSTRUÇÕES ESPECÍFICAS PARA CARROSSEL:
1. Copy Principal: Máximo 2200 caracteres, estruturada para múltiplas imagens
2. Narrativa sequencial: Conte uma história que se desenvolve através dos slides
3. Ganchos para deslizar: Crie curiosidade para o próximo slide
4. Numeração: Use "1/5", "Slide 2:", etc. quando apropriado
5. Informação progressiva: Cada slide adiciona valor ao anterior
6. Call-to-Action OBRIGATÓRIO: A última frase DEVE usar uma palavra gatilho BOT para incentivar comentários

TEMPLATES OBRIGATÓRIOS PARA A ÚLTIMA FRASE (escolha 1):
- "💬 Salva o post + comenta '{random_trigger_word}' que te envio mais informações!"
- "💬 Marca um amigo + comenta '{random_trigger_word}' para saber mais!"
- "💬 Deixa '{random_trigger_word}' nos comentários que te mando os detalhes!"

Se não houver palavras gatilho configuradas, use: "💬 Comenta 'QUERO' que te mando mais informações!"

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.
IMPORTANTE: As hashtags DEVEM estar sempre entre aspas. Exemplo CORRETO: ["#carrossel", "#educativo"]

Formato JSON obrigatório:
{
  "feed_copy": "Copy educativa para carrossel (DEVE terminar com frase usando palavra gatilho) \\n\\nSlide 1: Introdução \\nSlide 2: Desenvolvimento...",
  "story_copy": "Versão para Stories destacando valor educativo",
  "hashtags": ["#carrossel", "#educativo", "#dicas"],
  "call_to_action": "Frase de call-to-action educativa com palavra gatilho",
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

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

INSTRUÇÕES ESPECÍFICAS PARA POST ESTÁTICO:
1. Copy Principal: Máximo 2200 caracteres, foque em storytelling envolvente
2. Início impactante: Hook que prenda a atenção nos primeiros segundos
3. Desenvolvimento: História que conecte emocionalmente com o público
4. Narrativa visual: Descreva como o produto se encaixa na vida do usuário
5. Copy para Stories: Versão resumida de até 160 caracteres
6. Call-to-action OBRIGATÓRIO: A última frase DEVE usar uma palavra gatilho BOT para incentivar comentários

TEMPLATES OBRIGATÓRIOS PARA A ÚLTIMA FRASE (escolha 1):
- "💬 Comenta '{random_trigger_word}' nos comentários que te mando mais detalhes!"
- "💬 Deixa '{random_trigger_word}' aqui em baixo que te envio as informações!"
- "💬 Escreve '{random_trigger_word}' nos comentários para saber mais!"

Se não houver palavras gatilho configuradas, use: "💬 Comenta 'QUERO' que te mando mais informações!"

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.
IMPORTANTE: As hashtags DEVEM estar sempre entre aspas. Exemplo CORRETO: ["#hashtag1", "#hashtag2"]

Formato JSON obrigatório:
{
  "feed_copy": "Copy principal para feed com storytelling envolvente (DEVE terminar com frase usando palavra gatilho) \\n\\nIncluir quebras de linha",
  "story_copy": "Versão resumida para Stories - máximo 160 caracteres",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "Frase final de call-to-action com palavra gatilho",
  "post_type": "feed"
}`;
    }
  }
  
  throw new Error(`Tipo não suportado: ${type}`);
}

function processPromptVariables(prompt: string, product: any, company: any, externalLinks: any[] = [], landingPages: any[] = []): string {
  let processedPrompt = prompt;

  // Variáveis do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.sales_pitch}/g, product.sales_pitch || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.applications}/g, product.applications || 'Não informado');
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

  // Processar features/características
  const featuresArray = Array.isArray(product.features) ? product.features : [];
  const featuresText = featuresArray.join(', ') || 'Não informadas';
  processedPrompt = processedPrompt.replace(/{product\.features}/g, featuresText);

  // Processar aplicações
  const applicationsText = product.applications || 'Não informadas';
  processedPrompt = processedPrompt.replace(/{product\.applications}/g, applicationsText);

  // Processar palavras gatilho BOT
  const botTriggerWordsArray = Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : [];
  const botTriggerWordsText = botTriggerWordsArray.length > 0 ? botTriggerWordsArray.join(', ') : '';
  const randomTriggerWord = botTriggerWordsArray.length > 0 ? botTriggerWordsArray[Math.floor(Math.random() * botTriggerWordsArray.length)] : '';
  
  processedPrompt = processedPrompt.replace(/{product\.bot_trigger_words}/g, botTriggerWordsText);
  processedPrompt = processedPrompt.replace(/{random_trigger_word}/g, randomTriggerWord);
  
  // Criar exemplos formatados de palavras gatilho
  const triggerWordExamples = botTriggerWordsArray.length > 0 
    ? `Exemplos de palavras gatilho configuradas: ${botTriggerWordsArray.slice(0, 3).map((word: string) => `"${word}"`).join(', ')}`
    : '';
  processedPrompt = processedPrompt.replace(/{trigger_word_examples}/g, triggerWordExamples);

  // Processar links disponíveis
  const availableLinks: string[] = [];
  
  // Adicionar links externos
  if (externalLinks?.length > 0) {
    externalLinks.forEach(link => {
      availableLinks.push(`• ${link.name}: ${link.url} (categoria: ${link.category})`);
    });
  }
  
  // Adicionar links internos (landing pages)
  if (landingPages?.length > 0) {
    landingPages.forEach(page => {
      const pageData = page.data as any;
      const url = pageData?.seo?.canonical_url || `/${page.id}`;
      availableLinks.push(`• ${page.name}: ${url} (página interna)`);
    });
  }
  
  const linksText = availableLinks.length > 0 
    ? `\n\nLINKS DISPONÍVEIS PARA INCLUIR NA MENSAGEM:\n${availableLinks.join('\n')}\n`
    : '';
  
  processedPrompt = processedPrompt.replace(/{available_links}/g, linksText);

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
  console.log('Original content to clean:', content);
  
  // Remove blocos de código markdown
  let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove texto adicional antes e depois do JSON
  const jsonStart = cleanContent.indexOf('{');
  const jsonEnd = cleanContent.lastIndexOf('}') + 1;
  
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    cleanContent = cleanContent.substring(jsonStart, jsonEnd);
  }
  
  // Multiple passes of hashtag fixing with more robust patterns
  
  // Fix hashtags without quotes in arrays: #hashtag -> "#hashtag"
  cleanContent = cleanContent.replace(/(\[\s*"[^"]*"),\s*(#[^,\]"]+)/g, '$1", "$2"');
  cleanContent = cleanContent.replace(/(\[\s*)(#[^,\]"]+)(\s*[,\]])/g, '$1"$2"$3');
  cleanContent = cleanContent.replace(/(,\s*)(#[^,\]"]+)(\s*[,\]])/g, '$1"$2"$3');
  
  // Fix hashtags with quotes inside: #"hashtag" -> "#hashtag"
  cleanContent = cleanContent.replace(/#"([^"]+)"/g, '"#$1"');
  
  // Fix broken quotes around hashtags: "#hashtag", -> "#hashtag",
  cleanContent = cleanContent.replace(/"\s*(#[^"]+)\s*"/g, '"$1"');
  
  // Fix trailing commas in arrays
  cleanContent = cleanContent.replace(/,(\s*[\]\}])/g, '$1');
  
  // Fix multiple spaces
  cleanContent = cleanContent.replace(/\s+/g, ' ');
  
  console.log('Cleaned content result:', cleanContent);
  return cleanContent.trim();
}

function createIntelligentFallback(type: string, product: any): any {
  console.log('Creating intelligent fallback for type:', type);
  
  const productName = product?.name || 'Produto Inovador';
  const productCategory = product?.category || 'tecnologia';
  const categoryHashtag = productCategory.toLowerCase().replace(/\s+/g, '').substring(0, 15);
  
  if (type === 'instagram') {
    return {
      feed_copy: `🔥 Conheça o ${productName}! 💡\n\nUma solução inovadora que vai transformar sua experiência. Descubra todos os benefícios que esse produto pode oferecer!\n\n💬 Comenta 'QUERO' que te mando mais informações!`,
      story_copy: `${productName} - Inovação que faz a diferença! 🚀`,
      hashtags: ["#inovacao", "#tecnologia", "#qualidade", `#${categoryHashtag}`],
      call_to_action: "💬 Comenta 'QUERO' que te mando mais informações!",
      post_type: "feed"
    };
  } else {
    return {
      title_suggestion: `${productName} - Conheça os Benefícios`,
      description: `Descubra tudo sobre este produto incrível!\n\nNome: ${productName}\nCategoria: ${productCategory}`,
      tags: ["produto", "inovacao", "tecnologia", "qualidade", "beneficios"]
    };
  }
}

async function generateWithDualAI(apiKey: string, prompt: string, type: 'whatsapp' | 'youtube' | 'instagram', product?: any): Promise<any> {
  const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
  
  const systemPrompt = type === 'whatsapp' 
    ? 'Você é especialista em WhatsApp marketing. Retorne mensagens persuasivas e naturais.'
    : type === 'youtube'
    ? 'Você é especialista em SEO para YouTube com foco em PRECISÃO FACTUAL. Use EXCLUSIVAMENTE os dados do produto fornecidos. JAMAIS invente especificações, benefícios ou claims não documentados. Sempre retorne apenas JSON válido, sem markdown.'
    : 'Você é especialista em Instagram marketing. Sempre retorne apenas JSON válido, sem markdown.';
  
  console.log(`🏁 Dual-AI: Generating ${type} content...`);
  const result = await compareAndSelectBest(systemPrompt, prompt, {
    contentType: 'social',
    minLength: type === 'whatsapp' ? 100 : 200,
    maxLength: type === 'whatsapp' ? 300 : 1500,
    requiredKeywords: Array.isArray(product?.keywords) ? product.keywords : []
  }, { edgeFunctionId: 'generate-social-content', actionName: `Conteúdo ${type}`, productName: product?.name });
  
  console.log(`✅ Social ${type} winner: ${result.winner} (score: ${result.score.toFixed(1)})`);
  
  let content = result.content;

  console.log(`Raw content from Dual-AI (${result.winner}):`, content);

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
      
      // Tentar correções mais agressivas
      let fixedContent = content;
      
      // Fix multiple patterns of malformed hashtags
      fixedContent = fixedContent.replace(/(\[\s*"[^"]*"),\s*(#[^,\]"]+),/g, '$1", "$2",');
      fixedContent = fixedContent.replace(/(\[\s*"[^"]*"),\s*(#[^,\]"]+)(\s*\])/g, '$1", "$2"$3');
      fixedContent = fixedContent.replace(/,\s*(#[^,\]"\s]+)(\s*[\],])/g, ', "$1"$2');
      fixedContent = fixedContent.replace(/#"([^"]+)"/g, '"#$1"');
      
      try {
        const retryParsed = JSON.parse(fixedContent);
        console.log('Successfully parsed after fixing:', JSON.stringify(retryParsed, null, 2));
        
        // Converter \n em quebras de linha reais
        if (retryParsed.description) {
          retryParsed.description = retryParsed.description.replace(/\\n/g, '\n');
        }
        if (retryParsed.feed_copy) {
          retryParsed.feed_copy = retryParsed.feed_copy.replace(/\\n/g, '\n');
        }
        if (retryParsed.story_copy) {
          retryParsed.story_copy = retryParsed.story_copy.replace(/\\n/g, '\n');
        }
        
        return retryParsed;
      } catch (retryError) {
        console.error('Retry parse error:', retryError);
        
        // Fallback inteligente usando dados do produto
        console.error('Creating intelligent fallback after parsing failures');
        return createIntelligentFallback(type, product);
      }
    }
  }

  return content;
}

function getSequencePrompt(product: any, company: any, externalLinks: any[] = [], landingPages: any[] = []): string {
  const linksText = formatLinksForPrompt(externalLinks, landingPages);
  
  return `Você é um especialista em marketing digital e automação de campanhas WhatsApp.

Gere uma sequência de 7 mensagens promocionais para uma campanha agendada de WhatsApp, cada uma com foco e abordagem DIFERENTES para evitar repetição.

INFORMAÇÕES DO PRODUTO:
- Nome: ${product.name}
- Resumo Comercial: ${product.sales_pitch || 'Não informado'}
- Benefícios: ${Array.isArray(product.benefits) ? product.benefits.join(', ') : 'Não informados'}
- URL do Produto: ${product.product_url || '#'}
- Categoria: ${product.category || 'Não informada'}
- Preço: ${product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Consultar'}

INFORMAÇÕES DA EMPRESA:
- Nome: ${company?.company_name || 'Empresa'}

${linksText}

ESTRUTURA DAS 7 MENSAGENS:

**MENSAGEM 1 - BENEFÍCIO**
Foco: Apresentar os principais benefícios do produto
Objetivo: Despertar interesse inicial
Formato: Lista de benefícios com emojis + CTA suave

**MENSAGEM 2 - PROVA SOCIAL**
Foco: Credibilidade e confiança (mencionar clientes satisfeitos, resultados)
Objetivo: Reduzir objeções
Formato: Testemunho fictício realista + estatísticas + CTA

**MENSAGEM 3 - URGÊNCIA**
Foco: Senso de escassez ou oportunidade limitada
Objetivo: Acelerar decisão
Formato: Oferta limitada + countdown fictício + CTA forte

**MENSAGEM 4 - TÉCNICA**
Foco: Especificações técnicas e diferenciais únicos
Objetivo: Educar e impressionar
Formato: Detalhes técnicos + comparação com alternativas + CTA

**MENSAGEM 5 - CURIOSIDADE**
Foco: Criar curiosidade sobre algo não revelado antes
Objetivo: Reengajar quem parou de interagir
Formato: Pergunta intrigante + revelação parcial + CTA

**MENSAGEM 6 - GARANTIA**
Foco: Eliminar riscos percebidos (garantia, devolução, suporte)
Objetivo: Remover última objeção
Formato: Garantias + política de devolução + CTA de segurança

**MENSAGEM 7 - ÚLTIMA CHAMADA**
Foco: Urgência final + recap dos benefícios
Objetivo: Conversão final
Formato: Resumo + última oportunidade + CTA urgente

REGRAS OBRIGATÓRIAS:
1. Cada mensagem DEVE ter NO MÁXIMO 1000 caracteres
2. SEMPRE incluir o link do produto de forma natural e estratégica: ${product.product_url || '#'}
3. Incluir até 3 emojis relevantes por mensagem
4. Variar o formato do CTA (ex: "Confira aqui", "Veja todos os detalhes", "Acesse agora", "Saiba mais")
5. Fechar com hashtags: #${company?.company_name?.replace(/\s+/g, '')} #${product.category?.replace(/\s+/g, '')}
6. VARIAR a estrutura e tom entre as mensagens (não repetir fórmulas)
7. Usar links externos disponíveis de forma estratégica quando relevante

IMPORTANTE: Retorne APENAS um JSON válido sem blocos de código markdown.

FORMATO DE SAÍDA (JSON):
[
  {
    "number": 1,
    "approach": "beneficio",
    "content": "🔥 [NOME PRODUTO] 🔥\\n\\n[Mensagem dia 1 completa com emojis, benefícios, link do produto e hashtags]"
  },
  {
    "number": 2,
    "approach": "prova_social",
    "content": "⭐ [Mensagem dia 2 completa...]"
  },
  {
    "number": 3,
    "approach": "urgencia",
    "content": "⏰ [Mensagem dia 3 completa...]"
  },
  {
    "number": 4,
    "approach": "tecnica",
    "content": "🔧 [Mensagem dia 4 completa...]"
  },
  {
    "number": 5,
    "approach": "curiosidade",
    "content": "🤔 [Mensagem dia 5 completa...]"
  },
  {
    "number": 6,
    "approach": "garantia",
    "content": "🛡️ [Mensagem dia 6 completa...]"
  },
  {
    "number": 7,
    "approach": "ultima_chamada",
    "content": "🔥 [Mensagem dia 7 completa...]"
  }
]`;
}

function formatLinksForPrompt(externalLinks: any[], landingPages: any[]): string {
  const availableLinks: string[] = [];
  
  if (externalLinks?.length > 0) {
    externalLinks.forEach(link => {
      availableLinks.push(`• ${link.name}: ${link.url} (categoria: ${link.category})`);
    });
  }
  
  if (landingPages?.length > 0) {
    landingPages.forEach(page => {
      const pageData = page.data as any;
      const url = pageData?.seo?.canonical_url || `/${page.id}`;
      availableLinks.push(`• ${page.name}: ${url} (página interna)`);
    });
  }
  
  return availableLinks.length > 0 
    ? `\n\nLINKS DISPONÍVEIS PARA INCLUIR NAS MENSAGENS:\n${availableLinks.join('\n')}\n`
    : '';
}

async function generateSequenceWithDualAI(apiKey: string, prompt: string): Promise<Array<{number: number, approach: string, content: string}>> {
  try {
    console.log('🏁 Dual-AI: Gerando sequência WhatsApp...');
    
    const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
    
    const systemPrompt = 'Você é um especialista em marketing digital para WhatsApp. Sempre retorne apenas JSON válido, sem markdown.';
    
    const result = await compareAndSelectBest(systemPrompt, prompt, {
      contentType: 'social',
      minLength: 500,
      maxLength: 3000,
      requiredKeywords: []
    });
    
    console.log(`✅ Sequence winner: ${result.winner} (score: ${result.score.toFixed(1)})`);
    
    let content = result.content.trim();
    
    // Limpar markdown
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    const sequence = JSON.parse(content);
    
    if (!Array.isArray(sequence) || sequence.length !== 7) {
      throw new Error('Sequência inválida: deve conter 7 mensagens');
    }
    
    console.log('Sequência gerada com sucesso:', sequence.length, 'mensagens');
    return sequence;
    
  } catch (error) {
    console.error('Erro ao gerar sequência:', error);
    return generateFallbackSequence();
  }
}

function generateFallbackSequence(): Array<{number: number, approach: string, content: string}> {
  const triggerWords = ['QUERO', 'INFO', 'DETALHES', 'SIM', 'MAIS', 'QUERO SABER', 'INTERESSE'];
  const approaches = ['beneficio', 'prova_social', 'urgencia', 'tecnica', 'curiosidade', 'garantia', 'ultima_chamada'];
  
  return Array.from({ length: 7 }, (_, i) => ({
    number: i + 1,
    approach: approaches[i],
    content: `🔥 Mensagem ${i + 1} 🔥\n\n📅 Esta é a mensagem número ${i + 1} da sequência de 7 mensagens.\n\n[Conteúdo gerado automaticamente em modo fallback]\n\n💬 Responda com '${triggerWords[i]}' para mais informações!\n\n#Marketing #Produto`
  }));
}