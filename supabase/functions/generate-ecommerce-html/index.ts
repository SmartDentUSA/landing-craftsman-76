import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { fetchAggregateRating, type AggregateRatingData } from "../_shared/aggregate-rating-helper.ts";
import { fetchLocalBusinessData, generateLocalBusinessSchema, generateGeoContextHTML, type LocalBusinessData } from "../_shared/local-business-helper.ts";
import { generateHowToSchema, generateHowToMicrodataHTML, type ProductWithWorkflow } from "../_shared/howto-schema-helper.ts";
// ✅ FASE 6: FAQ Schema Helper centralizado
import { generateFAQPageSchemaString, type FAQItem } from "../_shared/faq-schema-helper.ts";
// ✅ FASE 7: ItemList Schema Helper centralizado
import { generateProductItemListSchemaString, convertToItemListProducts } from "../_shared/itemlist-schema-helper.ts";
// ✅ FASE 8: Video Schema Helper centralizado
import { generateProductVideoSchemas, generateVideoItemListSchema, extractProductVideos } from "../_shared/video-schema-helper.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ FASE 1: Variável de módulo para AggregateRating dinâmico
let currentAggregateRating: AggregateRatingData = {
  ratingValue: "4.8",
  reviewCount: 30,
  bestRating: 5,
  worstRating: 1
};

// ✅ FASE 2: Variável de módulo para LocalBusiness
let currentLocalBusinessData: LocalBusinessData = {
  company_name: "Smart Dent",
  website_url: "https://smartdent.com.br",
  latitude: -23.5505,
  longitude: -46.6333
};

interface GenerateEcommerceRequest {
  productId: string;
  options: {
    includeBenefits: boolean;
    includeFAQ: boolean;
    includeVideoCollections: boolean;
    faqLimit: number;
    regenerateBenefits: boolean;
    forceSpinStyles?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🛒 [E-commerce Generator] Iniciando geração de HTML...');

  try {
    const { productId, options } = await req.json() as GenerateEcommerceRequest;
    
    // VALIDAÇÃO DE ENTRADA
    if (!productId || typeof productId !== 'string') {
      console.error('❌ productId inválido ou ausente');
      throw new Error('productId é obrigatório e deve ser uma string');
    }
    
    if (!options || typeof options !== 'object') {
      console.error('❌ options inválido');
      throw new Error('options deve ser um objeto');
    }
    
    console.log(`📦 Product ID: ${productId}`);
    console.log(`⚙️ Options:`, JSON.stringify(options, null, 2));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // ✅ FASE 1: Buscar AggregateRating dinâmico com fallback seguro
    let aggregateRating: AggregateRatingData;
    try {
      aggregateRating = await fetchAggregateRating(supabase);
      console.log(`✅ [E-commerce] AggregateRating dinâmico: ${aggregateRating.ratingValue} (${aggregateRating.reviewCount} reviews)`);
    } catch (error) {
      console.error('⚠️ [E-commerce] Erro ao buscar AggregateRating, usando fallback:', error);
      aggregateRating = {
        ratingValue: "4.8",
        reviewCount: 30,
        bestRating: 5,
        worstRating: 1
      };
    }
    // ✅ Atualizar variável de módulo para uso em generateProductSchema
    currentAggregateRating = aggregateRating;

    // ✅ FASE 2: Buscar LocalBusiness data para GEO Local SEO
    try {
      currentLocalBusinessData = await fetchLocalBusinessData(supabase);
      console.log(`✅ [E-commerce] LocalBusiness: ${currentLocalBusinessData.company_name} (${currentLocalBusinessData.city}/${currentLocalBusinessData.state})`);
    } catch (error) {
      console.error('⚠️ [E-commerce] Erro ao buscar LocalBusiness, usando fallback:', error);
    }
    
    // 1. Buscar produto
    console.log('🔍 Buscando produto no banco...');
    const { data: product, error: fetchError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('❌ Erro ao buscar produto:', fetchError);
      throw fetchError;
    }
    
    if (!product) {
      console.error('❌ Produto não encontrado');
      throw new Error(`Produto com ID ${productId} não existe`);
    }
    
    console.log(`✅ Produto encontrado: ${product.name}`);
    console.log(`📊 Dados do produto:`, {
      id: product.id,
      name: product.name,
      category: product.category,
      hasTechnicalSpecs: !!product.technical_specifications,
      specsCount: Array.isArray(product.technical_specifications) ? product.technical_specifications.length : 0,
      hasFAQ: !!product.faq,
      faqCount: Array.isArray(product.faq) ? product.faq.length : 0,
      hasYouTubeVideos: !!product.youtube_videos?.length,
      hasInstagramVideos: !!product.instagram_videos?.length
    });
    
    // 1.5. Buscar perfil da empresa (FASE 2)
    console.log('🏢 Buscando perfil da empresa...');
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profile')
      .select(`
        company_name,
        company_description,
        company_logo_url,
        mission_statement,
        vision_statement,
        differentiators,
        founded_year,
        website_url,
        contact_phone,
        location,
        youtube_company_footer
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (companyError) {
      console.warn('⚠️ Erro ao buscar company_profile:', companyError);
    }

    if (companyProfile) {
      console.log(`✅ Perfil da empresa carregado: ${companyProfile.company_name}`);
    } else {
      console.warn('⚠️ Nenhum perfil de empresa cadastrado');
    }
    
    // 2. Gerar benefícios via IA (se necessário)
    let generatedBenefits: string[] = [];
    try {
      if (options.regenerateBenefits || !product.ecommerce_html?.generated_benefits) {
        console.log('🤖 Gerando benefícios com IA...');
        generatedBenefits = await generateBenefitsWithAI(product);
        console.log(`✅ Benefícios gerados: ${generatedBenefits.length} itens`, generatedBenefits);
      } else {
        console.log('♻️ Usando benefícios existentes');
        generatedBenefits = product.ecommerce_html.generated_benefits;
      }
    } catch (aiError) {
      console.error('⚠️ Erro ao gerar benefícios com IA:', aiError);
      console.log('📝 Usando benefícios existentes como fallback');
      generatedBenefits = product.ecommerce_html?.generated_benefits || product.benefits || [];
    }
    
    // 3. Gerar descrições de documentos técnicos com IA
    let technicalDocsWithDescriptions = product.technical_documents || [];
    if (technicalDocsWithDescriptions.length > 0) {
      try {
        console.log('📄 Processando descrições de documentos técnicos com IA...');
        technicalDocsWithDescriptions = await generateDocumentDescriptionsWithAI(
          technicalDocsWithDescriptions,
          product
        );
      } catch (docError) {
        console.error('⚠️ Erro ao gerar descrições de documentos:', docError);
        console.log('📝 Usando descrições originais como fallback');
      }
    }
    
    // 🏆 DUAL-AI COMPETITIVE: Refinamento de Descrição com Lovable AI + Deepseek
    let aiWinner = 'none';
    let lovableScore = 0;
    let deepseekScore = 0;
    
    if (product.faq && Array.isArray(product.faq) && product.faq.length > 0) {
      const faqAnswers = product.faq
        .map((f: any) => f.answer.replace(/<[^>]+>/g, '').trim()) // Remove HTML tags
        .join(' | ');
      
      console.log(`🏁 Iniciando refinamento Dual-AI com ${product.faq.length} FAQs (${faqAnswers.length} chars de contexto)`);

      try {
        const { description, winner, lovableScore: lScore, deepseekScore: dScore } = 
          await refineDescriptionWithDualAI(product, faqAnswers);

        product.processed_description = description;
        aiWinner = winner;
        lovableScore = lScore;
        deepseekScore = dScore;
        
        console.log(`✅ Descrição refinada pelo vencedor: ${winner.toUpperCase()}`);
        console.log(`📊 Scores: Lovable ${lScore.toFixed(1)} vs Deepseek ${dScore.toFixed(1)}`);
      } catch (refineError) {
        console.error('⚠️ Erro no refinamento Dual-AI:', refineError);
        console.log('📝 Mantendo descrição original como fallback');
        product.processed_description = product.description;
        aiWinner = 'error';
      }
    } else {
      console.log('ℹ️ Produto sem FAQs, pulando refinamento de descrição');
      product.processed_description = product.description;
    }
    
    // 3. Montar HTML
    console.log('🏗️ Construindo HTML com:', {
      productName: product.name,
      benefitsCount: generatedBenefits.length,
      technicalSpecsCount: Array.isArray(product.technical_specifications) ? product.technical_specifications.length : 0,
      faqCount: Array.isArray(product.faq) ? product.faq.length : 0,
      options
    });
    const htmlContent = buildEcommerceHTML(
      product, 
      generatedBenefits, 
      options, 
      companyProfile,
      technicalDocsWithDescriptions
    );
    console.log(`✅ HTML gerado: ${htmlContent.length} caracteres`);
    
    // 4. Salvar no banco
    console.log('💾 Salvando no banco de dados...');
    const ecommerceData = {
      html_content: htmlContent,
      generated_at: new Date().toISOString(),
      generated_benefits: generatedBenefits,
      generation_options: options,
      ai_model_used: 'dual-ai-competitive',
      ai_winner: aiWinner,
      ai_scores: { lovable: lovableScore, deepseek: deepseekScore },
      version: (product.ecommerce_html?.version || 0) + 1
    };
    
    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ ecommerce_html: ecommerceData })
      .eq('id', productId);
    
    if (updateError) {
      console.error('❌ Erro ao salvar no banco:', updateError);
      throw updateError;
    }
    
    console.log('✅ HTML salvo com sucesso!');
    console.log(`📊 Versão: ${ecommerceData.version}`);
    
    // 5. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        html_content: htmlContent,
        metadata: ecommerceData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ [ERRO CRÍTICO] Falha ao gerar e-commerce HTML:', error);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * NORMALIZAÇÃO TÉCNICA: Converte specs de múltiplos formatos para string legível.
 * Suporta: string, array, object, array de objetos {label, value}
 */
function stringifyTechnicalSpecs(specs: any): string {
  if (!specs || specs === null || specs === undefined) return 'N/A';
  if (typeof specs === 'string') return specs;
  
  if (Array.isArray(specs)) {
    // Array de objetos {label, value}
    if (specs.length > 0 && typeof specs[0] === 'object' && (specs[0] as any).label) {
      return specs.map((s: any) => `${s.label}: ${s.value}`).join(', ');
    }
    // Array simples de strings
    return specs.join(', ');
  }

  if (typeof specs === 'object') {
    return Object.entries(specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }

  return 'N/A';
}

/**
 * LÓGICA ADAPTATIVA: Detecta se o produto tem dados ricos (≥3 fontes de dados técnicos).
 * Usado para adaptar o número de benefícios (5 vs 8).
 */
function hasRichData(product: any): boolean {
  const dataSources = [
    product.technical_specifications,
    product.features,
    product.benefits,
    product.warranty_info,
    product.certifications 
  ];
  const dataScore = dataSources.filter(Boolean).length;
  console.log(`📊 Data richness score: ${dataScore}/5 (threshold: 3)`);
  return dataScore >= 3;
}

/**
 * 🏆 DUAL-AI COMPETITIVE SYSTEM: Gera com Lovable AI + Deepseek em paralelo
 * Seleciona automaticamente a melhor descrição refinada baseada em critérios de qualidade
 */
async function refineDescriptionWithDualAI(
  product: any,
  faqAnswers: string
): Promise<{ description: string; winner: string; lovableScore: number; deepseekScore: number }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

  // Fallback 1: Se não tem FAQs suficientes para contexto
  if (!faqAnswers || faqAnswers.trim().length < 50) {
    console.log('ℹ️ Sem FAQs suficientes para contexto, usando descrição original');
    return { 
      description: product.description || '', 
      winner: 'original', 
      lovableScore: 0, 
      deepseekScore: 0 
    };
  }

  const prompt = `Você é um editor técnico de e-commerce. Sua missão é reescrever a 'DESCRIÇÃO ORIGINAL' e o 'PITCH DE VENDAS' em um texto único e coeso (máximo 200 palavras).

REQUISITO CRÍTICO DE DIVERSIDADE E NÃO-REPETIÇÃO:
O novo texto DEVE evitar usar como FOCO PRINCIPAL as informações já detalhadas nas 'RESPOSTAS DE FAQ'. 

✅ PRIORIZE (Alto Nível - Introdução Narrativa):
• Aplicações práticas no dia a dia (ex: "Ideal para clínicas que buscam agilizar o fluxo de trabalho")
• Experiência do usuário e facilidade de uso (ex: "Aplicação intuitiva, sem necessidade de treinamento especializado")
• Promessa de valor e diferencial competitivo (ex: "Reconhecido por profissionais como a melhor alternativa no mercado")
• Para quem é indicado e em quais cenários (ex: "Perfeito para procedimentos estéticos em pacientes sensíveis")

❌ EVITE (Detalhes Técnicos - já cobertos nas FAQs):
• Certificações específicas (ex: "ISO 10993", "FDA aprovado")
• Especificações numéricas (ex: "viscosidade de 3000 mPa·s")
• Composição química detalhada
• Dados de performance quantificados

EXEMPLO DE TRANSFORMAÇÃO:
❌ ERRADO: "Este produto possui certificação ISO 10993 e viscosidade de 3000 mPa·s, garantindo resistência de 50 MPa."
✅ CORRETO: "Desenvolvido para profissionais que buscam resultados previsíveis e duradouros, este produto combina facilidade de aplicação com desempenho superior em restaurações estéticas."

REQUISITO DE FORMATAÇÃO DO TEXTO NARRATIVO:
Utilize a tag <strong> para:
✓ Enfatizar no máximo **3 palavras-chave de valor por parágrafo** (ex: "segurança", "excelência", "confiança", "longevidade").
✓ **PROIBIDO** usar <strong> em números, especificações técnicas, certificações ou unidades de medida (estes são o foco das FAQs).

EXEMPLO DE APLICAÇÃO:
"Este produto oferece <strong>segurança</strong> e <strong>durabilidade</strong> inigualáveis, garantindo a <strong>tranquilidade</strong> do seu consultório."

DADOS DO PRODUTO:
* DESCRIÇÃO ORIGINAL: ${product.description || 'N/A'}
* PITCH DE VENDAS: ${product.sales_pitch || 'N/A'}
* ARGUMENTOS A EVITAR (Detalhes de FAQ): ${faqAnswers}

Retorne APENAS o texto reescrito, sem títulos, markdown, ou JSON. O texto deve ser coeso, persuasivo e pronto para HTML.`;

  const systemPrompt = 'Você é um copywriter especializado em e-commerce. Retorna APENAS o texto solicitado, sem explicações ou formatação adicional.';

  console.log('🏁 Iniciando Sistema Dual-AI Competitivo...');

  // 🔄 Gerar com ambas as AIs em PARALELO
  const [lovableResult, deepseekResult] = await Promise.allSettled([
    // Lovable AI
    (async () => {
      if (!lovableApiKey) throw new Error('LOVABLE_API_KEY não configurada');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_completion_tokens: 500
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Lovable AI erro ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    })(),
    
    // Deepseek
    (async () => {
      if (!deepSeekApiKey) throw new Error('DEEPSEEK_API_KEY não configurada');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepSeekApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Deepseek erro ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    })()
  ]);

  // 📊 Processar resultados
  const lovableContent = lovableResult.status === 'fulfilled' ? lovableResult.value : '';
  const deepseekContent = deepseekResult.status === 'fulfilled' ? deepseekResult.value : '';

  if (lovableResult.status === 'rejected') {
    console.error('❌ Lovable AI falhou:', lovableResult.reason);
  }
  if (deepseekResult.status === 'rejected') {
    console.error('❌ Deepseek falhou:', deepseekResult.reason);
  }

  // Fallback 2: Se ambas falharam
  if (!lovableContent && !deepseekContent) {
    console.warn('⚠️ Ambas as AIs falharam, usando descrição original');
    return { 
      description: product.description || '', 
      winner: 'original', 
      lovableScore: 0, 
      deepseekScore: 0 
    };
  }

  // Fallback 3: Se apenas uma gerou
  if (!lovableContent) {
    console.log('⚠️ Lovable AI falhou - usando Deepseek');
    return { 
      description: deepseekContent, 
      winner: 'deepseek', 
      lovableScore: 0, 
      deepseekScore: 100 
    };
  }
  if (!deepseekContent) {
    console.log('⚠️ Deepseek falhou - usando Lovable AI');
    return { 
      description: lovableContent, 
      winner: 'lovable', 
      lovableScore: 100, 
      deepseekScore: 0 
    };
  }

  // 🎯 AVALIAR QUALIDADE - Critérios específicos para descrições de produto
  function evaluateDescription(content: string, faqContext: string): number {
    let score = 0;
    
    // 1. Estrutura Narrativa (30 pts) - Deve ser texto corrido, não lista
    if (!content.match(/^[-•*]/m)) score += 15; // Não começa com bullet
    if (content.split('\n\n').length >= 2) score += 10; // Tem parágrafos
    if (content.length >= 150 && content.length <= 400) score += 5; // Tamanho ideal
    
    // 2. Legibilidade (25 pts)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWords = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    if (avgWords >= 10 && avgWords <= 20) score += 15; // Frases médias
    if (!content.includes('```') && !content.includes('"title":')) score += 10; // Não é código/JSON
    
    // 3. Anti-Repetição de FAQs (25 pts) - CRÍTICO
    const faqKeywords = faqContext.toLowerCase().match(/\b\w{6,}\b/g) || [];
    const uniqueKeywords = new Set(faqKeywords);
    const contentLower = content.toLowerCase();
    const repeatedCount = Array.from(uniqueKeywords).filter(kw => contentLower.includes(kw)).length;
    const repetitionRatio = repeatedCount / (uniqueKeywords.size || 1);
    score += Math.max(0, 25 - Math.floor(repetitionRatio * 50)); // Penaliza repetição
    
    // 4. Engajamento (20 pts)
    if (/\b(ideal|perfeito|desenvolvido|reconhecido|facilita)\b/i.test(content)) score += 10; // Palavras persuasivas
    if (/\b(profissionais|clínicas|pacientes|resultados)\b/i.test(content)) score += 5; // Foco no público
    if (!content.includes('ISO') && !content.includes('FDA')) score += 5; // Evitou detalhes técnicos
    
    return Math.min(100, score);
  }

  const lovableScore = evaluateDescription(lovableContent, faqAnswers);
  const deepseekScore = evaluateDescription(deepseekContent, faqAnswers);

  console.log('📊 Resultados da Competição:');
  console.log(`   🔵 Lovable AI (Gemini 2.5 Flash): ${lovableScore.toFixed(1)} pts`);
  console.log(`   🟠 Deepseek: ${deepseekScore.toFixed(1)} pts`);

  const winner = lovableScore >= deepseekScore ? 'lovable' : 'deepseek';
  const winningContent = winner === 'lovable' ? lovableContent : deepseekContent;
  const winningScore = winner === 'lovable' ? lovableScore : deepseekScore;

  console.log(`✅ Vencedor: ${winner.toUpperCase()} (${winningScore.toFixed(1)} pts)`);
  console.log(`📝 Preview: ${winningContent.substring(0, 100)}...`);

  return { 
    description: winningContent, 
    winner, 
    lovableScore, 
    deepseekScore 
  };
}

async function generateBenefitsWithAI(product: any): Promise<string[]> {
  const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepSeekApiKey) {
    console.warn('⚠️ DEEPSEEK_API_KEY não configurada, usando benefits existentes');
    return product.benefits || [];
  }

  // ✅ USAR 100% DOS BENEFÍCIOS EXISTENTES SE JÁ CADASTRADOS
  if (product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0) {
    console.log(`✅ Usando ${product.benefits.length} benefícios cadastrados (100%)`);
    return product.benefits;
  }

  // ❌ Se não houver benefícios, gerar com IA
  // Calcular número adaptativo de benefícios baseado na riqueza de dados
  const benefitsCount = hasRichData(product) ? 8 : 5;
  console.log(`🎯 Gerando ${benefitsCount} benefícios (adaptativo baseado em data richness)`);
  
  const prompt = `Analise o seguinte produto e gere EXATAMENTE ${benefitsCount} benefícios objetivos e altamente persuasivos para a descrição de e-commerce. Priorize dados quantificáveis (ex: resistência, certificações, economia de tempo) no foco principal de cada benefício:

Produto: ${product.name}
Descrição: ${product.description || 'N/A'}
Categoria: ${product.category || 'N/A'}
Especificações Técnicas: ${stringifyTechnicalSpecs(product.technical_specifications)}
Recursos e Vantagens Chave: ${product.features?.join(', ') || 'N/A'}
Certificações: ${product.certifications || 'N/A'}
Garantia: ${product.warranty_info || 'N/A'}
${product.applications ? `Aplicações: ${product.applications}` : ''}
${product.sales_pitch ? `Pitch de Vendas: ${product.sales_pitch}` : ''}
${product.target_audience && product.target_audience.length > 0 ? `Público-Alvo: ${product.target_audience.join(', ')}` : ''}

🎯 REQUISITO CRÍTICO DE FORMATAÇÃO - REGRA DA TAG <strong>:
Em cada um dos ${benefitsCount} benefícios, você DEVE utilizar a tag HTML <strong></strong> EXCLUSIVAMENTE sobre o dado quantificável, certificação, ou USP (Unique Selling Point) que for o FOCO PRINCIPAL da frase.

✅ EXEMPLOS OBRIGATÓRIOS DE USO CORRETO:
- Se o foco for longevidade: "Testado em casos clínicos comprovados por mais de <strong>5 anos</strong> de uso contínuo."
- Se o foco for resistência mecânica: "Resistência Flexural de <strong>147 MPa</strong>, superior à maioria dos concorrentes."
- Se o foco for segurança regulatória: "<strong>Certificação ISO 10993</strong> completa para biocompatibilidade."
- Se o foco for durabilidade comparativa: "Oferece o dobro da <strong>durabilidade</strong> esperada em condições normais."
- Se o foco for eficiência: "Reduz em até <strong>40% o tempo</strong> de trabalho clínico."

❌ NÃO USE <strong> EM:
- Palavras genéricas como "produto", "qualidade", "profissional"
- Frases inteiras (use apenas na PALAVRA/DADO específico)
- Repetições decorativas (máximo 1 tag <strong> por benefício)

IMPORTANTE: O dado destacado pode ser repetido em FAQs ou outros benefícios - a repetição é permitida quando o contexto for diferente. O critério é: "Este é o ponto focal mais importante desta frase específica?"

Retorne APENAS o array JSON puro sem markdown:
${JSON.stringify(Array(benefitsCount).fill('benefício X'))}`;

  console.log('🔑 API Key presente, chamando Deepseek...');
  
  try {
    // Timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: hasRichData(product)
            ? 'Você extrai dados e retorna APENAS JSON puro. Priorize DIVERSIDADE nos benefícios: cada um deve destacar um aspecto técnico ÚNICO (certificação, especificação, uso prático). SEMPRE use a tag <strong> no dado quantificável/factual mais importante de cada benefício.'
            : 'Você extrai dados e retorna APENAS JSON puro. SEMPRE use a tag <strong> no dado quantificável/factual mais importante de cada benefício.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Deepseek API erro ${response.status}:`, errorText);
      throw new Error(`Deepseek API retornou status ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Resposta da API recebida');
    
    const content = data.choices?.[0]?.message?.content || '[]';
    console.log('📝 Conteúdo bruto:', content.substring(0, 200));
    
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed)) {
      console.warn('⚠️ Resposta não é um array, usando fallback');
      return product.benefits || [];
    }
    
    console.log(`✅ ${parsed.length} benefícios parseados com sucesso`);
    const benefitsCount = hasRichData(product) ? 8 : 5;
    return parsed.slice(0, benefitsCount);
    
  } catch (error) {
    console.error('❌ Erro ao chamar Deepseek API:', error);
    console.log('♻️ Usando benefits existentes como fallback');
    return product.benefits || [];
  }
}

/**
 * 📄 Gera descrições inteligentes de documentos técnicos usando IA
 * Foco: Propósito clínico, concisão (30 palavras), E-E-A-T
 */
async function generateDocumentDescriptionsWithAI(
  documents: any[], 
  product: any
): Promise<any[]> {
  if (!documents || documents.length === 0) {
    console.log('📋 Nenhum documento técnico para processar');
    return documents;
  }

  console.log(`📄 Gerando descrições para ${documents.length} documentos técnicos...`);
  
  const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️ DEEPSEEK_API_KEY não encontrada, usando descrições originais');
    return documents;
  }

  const processedDocs = [];

  for (const doc of documents) {
    const docName = doc.nome || doc.nome_arquivo || 'Documento Técnico';
    const originalDescription = doc.descricao || 'N/A';
    
    const prompt = `Você é um editor técnico de e-commerce e um especialista em simplificação de informações científicas para profissionais. Sua missão é gerar a descrição mais clara e concisa para a tabela de prova factual do produto.

REQUISITOS CRÍTICOS DE SÍNTESE E E-E-A-T:
1. **Síntese e Jargão:** Converta o nome do documento em uma frase que o profissional de odontologia entenda rapidamente, focando no **resultado** e **propósito clínico** (ex: "garante longevidade" ou "avalia a segurança biológica").
2. **Concisão Estrita:** A descrição deve ter no máximo **30 palavras** para garantir que caiba perfeitamente na coluna da tabela.
3. **Formato:** A tag <strong> deve ser usada APENAS para destacar o nome do TESTE (ex: Teste do Micronúcleo) ou a NORMA REGULATÓRIA (ex: ISO 10993).

DADOS DE ENTRADA:
* NOME DO DOCUMENTO: ${docName}
* CONTEXTO DO PRODUTO: ${product.name || 'Produto'} - ${product.category || 'Material'} (${product.description?.substring(0, 100) || 'Produto técnico'})
${product.certifications ? `* CERTIFICAÇÕES DO PRODUTO: ${product.certifications}` : ''}
* DESCRIÇÃO ORIGINAL: ${originalDescription}

✅ EXEMPLOS DE CLAREZA IDEAL (SEU OBJETIVO):
- Se o documento for sobre Mutagênese: "Teste que avalia se o material pode causar dano ao DNA, crucial para a **segurança biológica** de longo prazo."
- Se o documento for sobre Resistência Flexural: "Ensaio que comprova a **alta resistência mecânica** do material contra as forças de mastigação e desgaste."

❌ NÃO USE <strong> EM: Palavras genéricas, frases completas ou resultados numéricos.
Retorne APENAS a descrição sintetizada (sem aspas, sem título, sem explicações).`;

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Você gera descrições técnicas concisas, priorizando a clareza do propósito clínico. Use a tag <strong> APENAS no nome do teste ou norma para o E-E-A-T. Retorna APENAS o texto gerado.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 120
        }),
      });

      if (!response.ok) {
        console.error(`❌ Erro na API Deepseek para documento "${docName}":`, response.status);
        processedDocs.push(doc); // Mantém descrição original
        continue;
      }

      const data = await response.json();
      const generatedDescription = data.choices[0]?.message?.content?.trim() || '';

      if (generatedDescription) {
        console.log(`✅ Descrição gerada para "${docName}": ${generatedDescription.substring(0, 50)}...`);
        processedDocs.push({
          ...doc,
          descricao: generatedDescription,
          ai_generated_description: true
        });
      } else {
        console.warn(`⚠️ Descrição vazia para "${docName}", mantendo original`);
        processedDocs.push(doc);
      }

    } catch (error) {
      console.error(`❌ Erro ao gerar descrição para "${docName}":`, error);
      processedDocs.push(doc); // Fallback para descrição original
    }
  }

  console.log(`📄 ${processedDocs.length} documentos processados`);
  return processedDocs;
}

function isURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * ✅ Detecta se HTML já está pré-formatado (validado anteriormente)
 * Previne duplicação de conteúdo ao re-empacotar HTML completo
 */
function isPreformattedHTML(html: string): boolean {
  if (!html) return false;
  return /<(section|html|body)\b/i.test(html);
}

/**
 * 🎨 SPIN Design System CSS - Injetado no fragmento HTML
 * ✨ Sistema Responsivo Padronizado:
 * - Desktop: 16px base (títulos 20px/18px/16px)
 * - Tablet: 15px base (títulos 19px/17px/15px)
 * - Mobile: 14px base (títulos 16px/15px/14px)
 */
function getSpinStylesCSS(): string {
  return `<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
  /* ========== BASE DESKTOP (16px) ========== */
  .spin-ecom {
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    color: #333333;
    line-height: 1.6;
    font-size: 16px;
  }
  
  .spin-ecom h1 {
    color: #3E4B5E;
    font-weight: 800;
    letter-spacing: -0.8px;
    margin: 0 !important;
    font-size: 20px;
  }
  
  .spin-ecom h2 {
    color: #3E4B5E;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0 !important;
    font-size: 18px;
  }
  
  .spin-ecom h3 {
    color: #3E4B5E;
    font-weight: 700;
    margin: 0 !important;
    font-size: 16px;
    letter-spacing: -0.3px;
  }
  
  .spin-ecom h4 {
    color: #3E4B5E;
    font-weight: 600;
    margin: 0 !important;
    font-size: 16px;
  }
  
  .spin-ecom p {
    margin: 0 !important;
    line-height: 1.7;
    white-space: normal;
    font-size: 16px;
  }
  
  .spin-ecom li {
    margin: 0 !important;
    font-size: 16px;
  }
  
  .spin-ecom a {
    color: #EE7A3E;
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }
  
  .spin-ecom a:hover {
    opacity: 0.8;
  }
  
  .spin-ecom .badge {
    background: #EE7A3E;
    color: white;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 0.85em;
    font-weight: 600;
  }
  
  .spin-ecom .panel {
    background: #f8fafc;
    border-radius: 10px;
    padding: 20px;
    margin: 0 !important;
  }
  
  .spin-ecom table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 0 !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .spin-ecom table th {
    background: linear-gradient(135deg, #3E4B5E 0%, #2d3748 100%);
    color: white;
    font-weight: 700;
    padding: 12px 16px;
    text-align: left;
    border: none;
    letter-spacing: -0.3px;
    font-size: 12px;
  }

  .spin-ecom table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    background: white;
    transition: background 0.2s;
    font-size: 12px;
  }
  
  .spin-ecom table tbody tr:hover td {
    background: #f8fafc;
  }
  
  /* SPIN Landing Page Tech Table Styles */
  .spin-ecom .tech-table-wrapper {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
    margin: 0 auto 25px auto;
    max-width: 1100px;
  }
  
  .spin-ecom .tech-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .spin-ecom .tech-table thead {
    background: linear-gradient(135deg, #3E4B5E 0%, #2a3442 100%);
  }
  
  .spin-ecom .tech-table th {
    padding: 1.5rem 1rem;
    text-align: left;
    font-weight: 700;
    font-size: 12px;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 3px solid #EE7A3E;
  }
  
  .spin-ecom .tech-table td {
    padding: 1.25rem 1rem;
    text-align: left;
    font-size: 12px;
    color: #333;
    border-bottom: 1px solid #e8e8e8;
    transition: background 0.2s;
  }
  
  .spin-ecom .tech-table tbody tr:hover {
    background: #f8f9fa;
  }
  
  .spin-ecom .tech-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .spin-ecom .tech-table td:nth-child(2) {
    background: linear-gradient(135deg, rgba(238, 122, 62, 0.08) 0%, rgba(255, 155, 103, 0.05) 100%);
    font-weight: 600;
    color: #3E4B5E;
  }
  
  .spin-ecom .tech-table tbody tr:hover td:nth-child(2) {
    background: linear-gradient(135deg, rgba(238, 122, 62, 0.12) 0%, rgba(255, 155, 103, 0.08) 100%);
  }
  
  .spin-ecom .check {
    color: #EE7A3E;
    font-weight: 700;
  }
  
  .spin-ecom ul {
    margin: 0 !important;
    padding-left: 20px;
  }
  
  .spin-ecom strong {
    color: #3E4B5E;
    font-weight: 600;
  }
  
  /* ========== TABLET (768px - 1024px) - 15px base ========== */
  @media (min-width: 768px) and (max-width: 1024px) {
    .spin-ecom {
      font-size: 15px;
    }
    
    .spin-ecom h1 {
      font-size: 19px;
      letter-spacing: -0.6px;
    }
    
    .spin-ecom h2 {
      font-size: 17px;
    }
    
    .spin-ecom h3 {
      font-size: 15px;
    }
    
    .spin-ecom h4 {
      font-size: 15px;
    }
    
    .spin-ecom p,
    .spin-ecom li,
    .spin-ecom table td,
    .spin-ecom table th {
      font-size: 15px;
    }
    
    .spin-ecom .tech-table th {
      font-size: 11px;
      padding: 1.25rem 0.875rem;
    }
    
    .spin-ecom .tech-table td {
      font-size: 11px;
      padding: 1.1rem 0.875rem;
    }
  }
  
  /* ========== MOBILE (< 768px) - 14px base ========== */
  @media (max-width: 767px) {
  .spin-ecom {
    padding: 0;
    font-size: 14px;
  }
    
    .spin-ecom h1 {
      font-size: 16px;
      letter-spacing: -0.5px;
      margin-bottom: 1rem;
    }
    
    .spin-ecom h2 {
      font-size: 15px;
      margin-top: 1.5rem;
    }
    
    .spin-ecom h3 {
      font-size: 14px;
      margin-top: 1rem;
    }
    
    .spin-ecom h4 {
      font-size: 14px;
    }
    
    .spin-ecom p,
    .spin-ecom li {
      font-size: 14px;
    }
    
    .spin-ecom table th,
    .spin-ecom table td {
      padding: 10px 4px;
      font-size: 12px;
    }
    
    .spin-ecom table {
      min-width: 100%;
      border-radius: 0 !important;
    }
    
    /* Painel de Benefícios - Remove padding lateral */
    .spin-ecom > div[style*="background-color: #f8fafc"] {
      padding: 20px 0 !important;
      border-radius: 0 !important;
    }
    
    /* Containers de Tabelas - Remove arredondamento e margem lateral */
    .spin-ecom > div[style*="border-radius:12px"] {
      border-radius: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    
    /* Containers com scroll - Remove margem lateral */
    .spin-ecom > div[style*="overflow-x:auto"] {
      margin: 0 !important;
    }
    
    /* CTAs e Divs com padding - Mantém padding mínimo para legibilidade */
    .spin-ecom > div[style*="padding:"] {
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
    
    .spin-ecom .tech-table th {
      padding: 12px 8px;
      font-size: 12px;
    }
    
    .spin-ecom .tech-table td {
      padding: 10px 8px;
      font-size: 12px;
    }
    
    .spin-ecom .panel {
      padding: 12px;
      margin: 0.75rem 0;
    }
    
    .spin-ecom ul {
      padding-left: 1.2rem;
    }
  }
</style>`;
}

function buildPackagingInfo(product: any): string {
  const dimensions = [];
  
  // Coletar dimensões existentes
  if (product.height) dimensions.push(`<strong>Altura:</strong> ${product.height} cm`);
  if (product.width) dimensions.push(`<strong>Largura:</strong> ${product.width} cm`);
  if (product.depth) dimensions.push(`<strong>Profundidade:</strong> ${product.depth} cm`);
  
  // Montar HTML com dimensões e package_size
  let html = '<p style="margin: 0 0 10px 0; line-height: 1.5;">';
  
  if (dimensions.length > 0) {
    html += `<span style="display: block; margin-bottom: 8px;">${dimensions.join(' × ')}</span>`;
  }
  
  // Adicionar package_size (se existir) abaixo das dimensões
  if (product.package_size) {
    html += `<span style="display: block; color: #666;">${product.package_size}</span>`;
  } else if (dimensions.length === 0) {
    // Fallback apenas se não houver nem dimensões nem package_size
    html += '<span style="color: #999;">Informações de embalagem não disponíveis</span>';
  }
  
  html += '</p>';
  return html;
}

/**
 * ✅ FASE 2: Header com branding da empresa (logo + missão)
 */
function buildCompanyHeader(company: any): string {
  if (!company) return '';
  
  return `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 20px; margin-bottom: 25px; border-radius: 8px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
  ${company.company_logo_url ? `
    <img 
      src="${company.company_logo_url}" 
      alt="Logo ${company.company_name}" 
      style="max-height: 60px; width: auto; background: white; padding: 8px; border-radius: 6px;"
    />
  ` : ''}
  <div style="flex: 1; color: white;">
    <h3 style="margin: 0; font-size: 1.2em; font-weight: 600;">${company.company_name}</h3>
    ${company.mission_statement ? `
      <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.95; line-height: 1.4;">
        ${company.mission_statement}
      </p>
    ` : ''}
    ${company.founded_year ? `
      <p style="margin: 5px 0 0 0; font-size: 0.85em; opacity: 0.85;">
        🏆 Desde ${company.founded_year}
      </p>
    ` : ''}
  </div>
</div>`;
}

/**
 * Gera alt text semântico a partir do nome do arquivo ou URL
 * Utiliza sanitização para criar descrições SEO-friendly
 */
function generateImageAlt(imageUrl: string, productName: string, index: number = 0): string {
  if (!imageUrl) return productName;
  
  // Extrai nome do arquivo da URL
  const fileName = imageUrl.split('/').pop() || '';
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Sanitiza o nome do arquivo (remove _-, caracteres especiais, capitaliza)
  let alt = nameWithoutExt
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Se o alt gerado estiver vazio ou muito curto, usa o nome do produto
  if (!alt || alt.length < 3) {
    alt = index === 0 ? productName : `${productName} - Imagem ${index + 1}`;
  }
  
  // Valida comprimento (máximo 125 chars para Google)
  if (alt.length > 125) {
    alt = alt.substring(0, 122) + '...';
  }
  
  return alt;
}

/**
 * Constrói galeria de imagens com miniaturas 80x80px no final do HTML
 */
function buildImageGallery(product: any): string {
  const images: string[] = [];
  
  // Adiciona imagem principal se existir
  if (product.image_url) {
    images.push(product.image_url);
  }
  
  // Adiciona imagens da galeria
  if (product.images_gallery && Array.isArray(product.images_gallery)) {
    product.images_gallery.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img.url;
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }
  
  if (images.length === 0) {
    return '';
  }
  
  // ✅ MINIATURAS COMPACTAS (80x80px)
  let galleryHTML = `
<div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
  <h3 style="color: #666; font-size: 0.95em; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">📎 Imagens Adicionais</h3>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">`;
  
  images.forEach((imageUrl, index) => {
    const alt = generateImageAlt(imageUrl, product.name, index);
    
    galleryHTML += `
    <div style="border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; background: #f9f9f9; width: 80px; height: 80px;">
      <img 
        src="${imageUrl}" 
        alt="${alt}"
        loading="lazy"
        style="width: 100%; height: 100%; display: block; object-fit: cover;"
      />
    </div>`;
  });
  
  galleryHTML += `
  </div>
</div>`;
  
  return galleryHTML;
}

// Truncate text to a maximum number of words
function truncateToWords(text: string, maxWords: number): string {
  if (!text || text.trim() === '') return '';
  
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + '...';
}

// Format file size from bytes to human-readable format
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate Product Schema.org JSON-LD with LocalBusiness, HowTo and ItemList
function generateProductSchema(product: any): string {
  // ✅ FASE 2: Gerar LocalBusiness Schema para inclusão
  const localBusinessSchema = generateLocalBusinessSchema(currentLocalBusinessData);
  
  // ✅ FASE 4: Gerar HowTo Schema para workflow_stages
  const howToSchema = generateHowToSchema(product as ProductWithWorkflow, {
    includeSupplies: true,
    includeTips: true,
    includeImages: true,
    companyName: currentLocalBusinessData.company_name,
    websiteUrl: currentLocalBusinessData.website_url
  });
  
  if (howToSchema) {
    console.log(`✅ [E-commerce] HowTo Schema gerado para ${product.name} com ${Object.values(product.workflow_stages || {}).filter((s: any) => s?.applicable).length} etapas`);
  }

  // ✅ FASE 7: Gerar ItemList Schema para o produto
  const itemListProducts = convertToItemListProducts([product], product.product_url || product.canonical_url);
  const itemListSchema = itemListProducts.length > 0 ? {
    '@type': 'ItemList',
    name: `Produto: ${product.name}`,
    numberOfItems: 1,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: [{
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Product',
        name: product.name,
        description: (product.description || '').substring(0, 200).replace(/<[^>]*>/g, ''),
        image: product.image_url,
        url: product.product_url || product.canonical_url,
        ...(product.brand && { brand: { '@type': 'Brand', name: product.brand } }),
        ...(product.price && {
          offers: {
            '@type': 'Offer',
            price: product.promo_price || product.price,
            priceCurrency: product.currency || 'BRL',
            availability: 'https://schema.org/InStock'
          }
        })
      }
    }]
  } : null;

  if (itemListSchema) {
    console.log(`✅ [E-commerce] ItemList Schema gerado para ${product.name}`);
  }

  // ✅ FASE 8: Gerar VideoObject Schemas para vídeos do produto
  const productVideos = extractProductVideos(product, { maxVideos: 4 });
  const videoSchemas = generateProductVideoSchemas(product, {
    maxVideos: 4,
    includeTranscript: true,
    includeAboutProduct: true,
    creatorName: currentLocalBusinessData.company_name,
    creatorUrl: currentLocalBusinessData.website_url
  });
  
  // Gerar VideoGallery ItemList se houver múltiplos vídeos
  const videoGallerySchema = productVideos.length > 1 
    ? generateVideoItemListSchema(productVideos, `Vídeos: ${product.name}`)
    : null;

  if (videoSchemas.length > 0) {
    console.log(`✅ [E-commerce] ${videoSchemas.length} VideoObject Schemas gerados para ${product.name}`);
  }
  if (videoGallerySchema) {
    console.log(`✅ [E-commerce] VideoGallery ItemList gerado com ${productVideos.length} vídeos`);
  }
  
  const schema: any = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "#product",
        "name": product.name,
        "description": product.description || '',
        "sku": product.id,
        "image": product.image_url || (product.images_gallery?.[0] || ''),
        "brand": {
          "@type": "Brand",
          "name": product.brand || "Smartdent"
        },
        // ✅ AggregateRating para Rich Snippets com estrelas no Google (dinâmico)
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": currentAggregateRating.ratingValue,
          "reviewCount": currentAggregateRating.reviewCount,
          "bestRating": currentAggregateRating.bestRating,
          "worstRating": currentAggregateRating.worstRating
        }
      },
      localBusinessSchema,
      howToSchema, // ✅ FASE 4: Adicionar HowTo ao @graph
      itemListSchema, // ✅ FASE 7: Adicionar ItemList ao @graph
      ...videoSchemas, // ✅ FASE 8: Adicionar VideoObjects ao @graph
      videoGallerySchema // ✅ FASE 8: Adicionar VideoGallery ao @graph
    ].filter(Boolean) // Remove nulls
  };
  
  const productSchema = schema["@graph"][0];

  // Add GTIN if available
  if (product.gtin) {
    productSchema.gtin = product.gtin;
  }

  // Add MPN if available
  if (product.mpn) {
    productSchema.mpn = product.mpn;
  }

  // Add category if available
  if (product.category) {
    productSchema.category = product.category;
  }

  // Add offers with price
  if (product.price || product.promo_price) {
    productSchema.offers = {
      "@type": "Offer",
      "priceCurrency": product.currency || "BRL",
      "price": (product.promo_price || product.price || 0).toString(),
      "availability": "https://schema.org/InStock",
      "url": product.product_url || ''
    };
  }

  // ✅ FASE 2: Adicionar variações como hasVariant
  if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
    productSchema.hasVariant = product.variations.map((v: any) => ({
      "@type": "Product",
      "name": `${product.name} - ${v.name}`,
      "sku": v.sku || `${product.id}-${v.name.toLowerCase().replace(/\s+/g, '-')}`,
      ...(v.price && {
        "offers": {
          "@type": "Offer",
          "priceCurrency": product.currency || "BRL",
          "price": v.price.toString(),
          "availability": (v.stock && v.stock > 0) 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock"
        }
      })
    }));
  }

  return JSON.stringify(schema, null, 2);
}

// ✅ FASE 6: Função refatorada para usar helper centralizado
function generateFAQSchema(product: any): string | null {
  if (!product.faq || !Array.isArray(product.faq)) {
    return null;
  }

  // Usa o helper centralizado com opções específicas para e-commerce
  return generateFAQPageSchemaString(product.faq as FAQItem[], {
    minAnswerLength: 100,  // Apenas FAQs ricas (>100 chars)
    minFaqCount: 5,        // Mínimo 5 FAQs para e-commerce
    stripHtml: true
  });
}

// Build SEO Head section with meta tags
function buildSEOHead(product: any): string {
  const title = product.seo_title_override || `${product.name} | Smartdent`;
  
  // ✅ Meta Description Otimizada: Keywords nos primeiros 160 caracteres
  let description = '';
  if (product.seo_description_override) {
    description = product.seo_description_override;
  } else {
    const primaryKeyword = (product.keywords?.[0] || product.market_keywords?.[0] || product.name);
    const secondaryKeyword = (product.keywords?.[1] || product.market_keywords?.[1] || '');
    const keywordsPrefix = `${primaryKeyword}${secondaryKeyword ? ' | ' + secondaryKeyword : ''}`;
    const maxDescLength = 155 - keywordsPrefix.length - 2;
    const truncatedDesc = (product.description || product.short_description || '').substring(0, maxDescLength);
    description = `${keywordsPrefix}: ${truncatedDesc}...`;
  }
  const canonicalUrl = product.canonical_url || product.product_url || '';
  const imageUrl = product.image_url || (product.images_gallery?.[0] || '');
  
  // ✅ FASE 2: Expandir keywords com search_intent e bot_trigger_words
  const keywords = [
    ...(product.keywords || []),
    ...(product.market_keywords || []),
    ...(product.search_intent_keywords || []),
    ...(product.bot_trigger_words || [])
  ]
    .filter(Boolean)
    .slice(0, 15)
    .join(', ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  <meta name="robots" content="index, follow">
  ${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : ''}
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  ${canonicalUrl ? `<meta property="og:url" content="${canonicalUrl}">` : ''}
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Smartdent">
  ${product.price || product.promo_price ? `<meta property="product:price:amount" content="${product.promo_price || product.price}">` : ''}
  ${product.currency ? `<meta property="product:price:currency" content="${product.currency}">` : '<meta property="product:price:currency" content="BRL">'}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  
  <!-- Google Fonts Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Product Schema JSON-LD -->
  <script type="application/ld+json">
  ${generateProductSchema(product)}
  </script>
  
  <!-- FAQPage Schema JSON-LD -->
  ${(() => {
    const faqSchema = generateFAQSchema(product);
    return faqSchema ? `<script type="application/ld+json">\n  ${faqSchema}\n  </script>` : '';
  })()}
</head>
<body>`;
}

/**
 * 🧹 Remove HTML do Google Docs (spans, atributos data-*, inline styles)
 */
function cleanGoogleDocsHTML(html: string): string {
  if (!html) return '';
  
  return html
    // Remove comentários HTML
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove tags style e script
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove todos os <span> mantendo apenas o conteúdo
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    // Remove tabelas HTML completas (incluindo contêineres de editores)
    .replace(/<div[^>]*class="[^"]*(?:_tableContainer|_tableWrapper|tableContainer|tableWrapper)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<table[\s\S]*?<\/table>/gi, '')
    // Remove tags <p> e <h2> do Google Docs (parseRichDescription recria)
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<\/?h[1-6][^>]*>/gi, '\n')
    // Remove <ul>, <li>, <strong> do Google Docs
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?strong[^>]*>/gi, '')
    .replace(/<\/?em[^>]*>/gi, '')
    // Remove quebras <br /> ou <br> múltiplas
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove <hr> e <div> soltos que possam restar
    .replace(/<\/?:?hr[^>]*>/gi, '\n')
    .replace(/<\/?:?div[^>]*>/gi, '\n')
    // Remove atributos data-*, class, style
    .replace(/\s*data-[^=]*="[^"]*"/gi, '')
    .replace(/\s*class="[^"]*"/gi, '')
    .replace(/\s*style="[^"]*"/gi, '')
    // Substituir entidades HTML
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    // Remover quaisquer tags HTML restantes
    .replace(/<[^>]+>/g, '')
    // Remove espaços múltiplos em branco (mas preserva quebras de linha)
    .replace(/ {2,}/g, ' ')
    // Limpa quebras de linha múltiplas (máximo 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 🔍 Parse inteligente do description com formatação estruturada e detecção automática de parágrafos
 */
function parseRichDescription(text: string): string {
  if (!text) return '';
  
  // ✅ PROTEÇÃO SELETIVA: Preservar tags de formatação seguras (<strong>, <em>, <u>)
  // Remove apenas tags perigosas ou não desejadas
  text = text.replace(/<(?!\/?(?:strong|em|u|b|i)\b)[^>]+>/gi, '');
  
  // ✅ DETECÇÃO INTELIGENTE: Inserir quebras de parágrafo automaticamente
  // Detectar padrões como: emoji + título, final de frase longa + início maiúsculo
  text = text
    // Quebra antes de emoji seguido de texto em maiúscula (ex: 🔬 O Poder)
    .replace(/([.!?])\s*([🔬🛡️🔑💎✨🌟⭐🎯📊🏆💼🔥⚡🎨🌈]+)\s*([A-Z])/g, '$1\n\n$2 $3')
    // Quebra antes de títulos óbvios que começam com maiúscula após ponto
    .replace(/([.!?])\s+([A-Z][a-zà-ú]{2,}\s+[A-Z])/g, '$1\n\n$2')
    // Quebra antes de frases que começam com palavras contextuais
    .replace(/([.!?])\s+(A |O |Com |Para |Além |Esta |Este |Estes |Estas |Nossa |Nosso )/g, '$1\n\n$2');
  
  let html = '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let bulletBuffer: string[] = [];
  
  // ✅ SPIN IDÊNTICO: Flush bullets com tipografia exata do SPIN
  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      html += '<ul style="list-style: none; padding: 0; margin: 12px 0;">';
      bulletBuffer.forEach(content => {
        html += `<li style="padding: 8px 0 8px 24px; position: relative; line-height: 1.6; font-family: Inter, system-ui, sans-serif;"><span style="color: #EE7A3E; font-weight: 700; position: absolute; left: 0;">✓</span>${content}</li>`;
      });
      html += '</ul>';
      bulletBuffer = [];
    }
  };
  
  for (const line of lines) {
    // Detectar bullets (• ou -)
    if (/^[•\-]\s+/.test(line)) {
      const content = line.replace(/^[•\-]\s+/, '');
      bulletBuffer.push(content);
      continue;
    }
    
    // Se não é bullet, esvaziar buffer
    flushBullets();
    
    // Detectar títulos em MAIÚSCULAS
    if (line === line.toUpperCase() && line.length > 5 && !/^[0-9️⃣⏱🦷]/.test(line)) {
      html += `<h3 style="color: #3E4B5E; font-size: 1.25em; font-weight: 700; margin: 16px 0 12px 0; letter-spacing: -0.3px; font-family: Inter, system-ui, sans-serif;">${line}</h3>`;
      continue;
    }
    
    // Detectar listas numeradas com emojis (transformar em bullets também)
    if (/^[0-9️⃣🔟]+\s*[–—-]\s*/.test(line)) {
      const content = line.replace(/^[0-9️⃣🔟]+\s*[–—-]\s*/, '');
      bulletBuffer.push(content);
      continue;
    }
    
    // Detectar tempo de impressão
    if (/^⏱️🦷/.test(line)) {
      const content = line.replace(/^⏱️🦷\s*/, '');
      html += `<div style="background: linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 3px solid #EE7A3E;"><strong style="color: #3E4B5E;">⏱️ ${content}</strong></div>`;
      continue;
    }
    
    // ✅ SPIN IDÊNTICO: Parágrafos com margem menor e line-height preciso
    html += `<p style="margin: 0 0 20px 0; line-height: 1.8; color: #333; font-family: Inter, system-ui, sans-serif;">${line}</p>`;
  }
  
  // Esvaziar buffer final
  flushBullets();
  
  return html;
}

function buildEcommerceHTML(
  product: any, 
  benefits: string[], 
  options: any, 
  company: any,
  technicalDocsWithDescriptions: any[] = []
): string {
  const desc = product.description || '';
  
  // ✅ SEMPRE REGENERAR (remover bypass de pré-formatado)
  console.log('🔄 Regenerando HTML com SPIN Design System (bypass desabilitado)');
  
  if (options.forceSpinStyles) {
    console.log('⚡ Forçando layout SPIN (override de pré-formatado ativo)');
  }
  
  console.log('🎨 Aplicando SPIN Design System ao HTML E-commerce');
  
  // ✅ PRIORIZAR DESCRIÇÃO REFINADA (Anti-Repetição com FAQs)
  let enrichedDescription = '';

  if (product.processed_description) {
    // Nível 1: Usar descrição refinada pela IA (já veio limpa e otimizada)
    console.log('✅ Usando descrição refinada (Anti-Repetição ativado)');
    enrichedDescription = product.processed_description;
  } else {
    // Nível 2: Fallback - Pipeline original (description + sales_pitch + limpezas)
    console.log('ℹ️ Usando descrição original (Fallback - sem refinamento)');
    enrichedDescription = cleanGoogleDocsHTML(desc)
      .replace(/\n{3,}/g, '\n\n')  // Máximo 2 quebras consecutivas
      .trim();
    
    // 🧹 Remover seção duplicada de "Características Técnicas" do description
    enrichedDescription = enrichedDescription.replace(
      /<hr[^>]*>\s*<h3[^>]*>\s*<strong[^>]*>Características Técnicas<\/strong>\s*<\/h3>[\s\S]*?(<hr[^>]*>|$)/gi,
      ''
    );
    
    // 🧹 Remover títulos órfãos de seções técnicas que vinham antes das tabelas coladas
    enrichedDescription = enrichedDescription
      .replace(/📏[^\n<]*Propriedades[^\n<]*(\n|$)/gi, '')
      .replace(/Testes de Segurança[^\n<]*(\n|$)/gi, '')
      .replace(/Certificação & Conformidade[^\n<]*(\n|$)/gi, '')
      .replace(/Graças à sua composição[^\n<]*(\n|$)/gi, '');
    
    // 🧹 Remover seção duplicada de "Principais Benefícios" do description
    enrichedDescription = enrichedDescription.replace(
      /(?:💡\s*)?(?:principais\s+)?benef[íi]cios[:\s]*\n(?:[-•✓]\s*[^\n]+\n?)+/gi,
      ''
    );
    
    // 🧹 Remover títulos de benefícios isolados
    enrichedDescription = enrichedDescription
      .replace(/💡[^\n<]*benef[íi]cios[^\n<]*(\n|$)/gi, '')
      .replace(/principais\s+benef[íi]cios[^\n<]*(\n|$)/gi, '');
    
    console.log('🧹 Sanitizando seção "Características Técnicas" duplicada do description');
    
    // ✅ Enriquecer descrição com Sales Pitch (APENAS NO FALLBACK)
    if (product.sales_pitch && !enrichedDescription.includes(product.sales_pitch)) {
      enrichedDescription += `\n\n🎯 **Por que escolher este produto?**\n${product.sales_pitch}`;
    }
  }

  const faq = options.includeFAQ && product.faq ? product.faq.slice(0, options.faqLimit) : [];
  const technicalSpecs = product.technical_specifications || [];
  
  // Coletar vídeos por categoria
  // ✅ FASE 3: Normalizar vídeos e adicionar youtube_company_footer como fallback
  const normalizeVideos = (videos: any[] = [], defaultDescription: string = '') => {
    return videos.map(v => {
      if (typeof v === 'string') {
        return { url: v, description: defaultDescription };
      }
      return { 
        ...v, 
        description: v.description || defaultDescription 
      };
    });
  };
  
  const videoDefaultDescription = company?.youtube_company_footer || product.sales_pitch || product.description || '';
  
  const videoCollections = {
    youtube: normalizeVideos(product.youtube_videos, videoDefaultDescription),
    instagram: normalizeVideos(product.instagram_videos, videoDefaultDescription),
    testimonials: normalizeVideos(product.testimonial_videos, videoDefaultDescription),
    technical: normalizeVideos(product.technical_videos, videoDefaultDescription),
    tiktok: normalizeVideos(product.tiktok_videos, videoDefaultDescription),
    tutorials: normalizeVideos(product.tutorial_resources?.tutorials, videoDefaultDescription)
  };
  
  const hasVideos = options.includeVideoCollections && Object.values(videoCollections).some((v: any) => v.length > 0);
  
  // ✅ Iniciar com SPIN Design System CSS
  let html = getSpinStylesCSS();
  
  // ✅ Conteúdo principal em <section> com classe SPIN
  html += `
<section class="spin-ecom" style="max-width: 1200px; margin: 0 auto; padding: 20px; font-family: Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #333333; line-height: 1.6;">`;

  // 🗑️ Banner roxo da empresa removido - conteúdo inicia direto no título do produto
  // html += buildCompanyHeader(company);

  html += `
<h1 style="color: #3E4B5E; font-size: 2em; font-weight: 800; letter-spacing: -0.8px; text-align: center; margin-bottom: 20px;">${product.name}</h1>`;

  html += `
<div style="font-size: 1.05em; margin-bottom: 25px;">${parseRichDescription(enrichedDescription)}</div>`;

  // ✅ Benefícios IA (inline styles)
  if (options.includeBenefits && benefits.length > 0) {
    html += `
<div style="background-color: #f8fafc; padding: 20px 12px; border-radius: 0; margin-bottom: 25px;">
  <h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; margin-top: 0;">Principais Benefícios</h2>
  <ul style="list-style: none; padding: 0; margin: 0;">
    ${benefits.map(b => `<li style="padding: 8px 0 8px 24px; position: relative;"><span style="color: #EE7A3E; font-weight: bold; position: absolute; left: 0;">✓</span>${b}</li>`).join('\n    ')}
  </ul>
</div>`;
  }

  // ✅ Especificações Técnicas (SPIN Landing Page Style)
  if (technicalSpecs.length > 0) {
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-top: 25px; margin-bottom: 10px;">Especificações Técnicas</h2>
      <div style="background:#fff; border:1px solid #e0e0e0; border-radius:0; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:0 10px 30px rgba(0,0,0,0.1); margin:0 0 25px 0;">
  <table style="width:100%; border-collapse:separate; border-spacing:0;">
    <thead>
      <tr style="background: linear-gradient(135deg, #3E4B5E 0%, #2d3748 100%);">
        <th style="padding:16px; text-align:left; font-weight:700; font-size:16px; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:3px solid #EE7A3E;">Especificação</th>
        <th style="padding:16px; text-align:left; font-weight:700; font-size:16px; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:3px solid #EE7A3E;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${technicalSpecs.map((spec, i) => {
        const zebraBackground = i % 2 === 0 ? '#FFFFFF' : '#FCFCFD';
        const valueCell = isURL(spec.value)
          ? `<a href="${spec.value}" target="_blank" rel="noopener" style="display:inline-block; text-decoration:none;">
               <span style="background:#EE7A3E; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:600; box-shadow:0 2px 6px rgba(238,122,62,0.3);">📥 Download</span>
             </a>`
          : spec.value;
        return `<tr>
          <td style="padding:14px 16px; border-bottom:1px solid #e8e8e8; background:${zebraBackground}; color:#111; line-height:1.6; word-break:break-word; overflow-wrap:anywhere;">${spec.label}</td>
          <td style="padding:14px 16px; border-bottom:1px solid #e8e8e8; background:linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); color:#2f3a4a; line-height:1.6; font-weight:600; word-break:break-word; overflow-wrap:anywhere;">${valueCell}</td>
        </tr>`;
      }).join('\n      ')}
    </tbody>
  </table>
</div>`;
  }

  // ✅ Documentos Técnicos (SPIN Landing Page Style - com descrições geradas pela IA)
  // Fallback defensivo: usar technicalDocsWithDescriptions ou product.technical_documents
  console.log('📄 Docs param status:', {
    passed: Array.isArray(technicalDocsWithDescriptions) ? technicalDocsWithDescriptions.length : 'undefined',
    fromProduct: Array.isArray(product.technical_documents) ? product.technical_documents.length : 0
  });
  
  const docsSource = Array.isArray(technicalDocsWithDescriptions) && technicalDocsWithDescriptions.length > 0
    ? technicalDocsWithDescriptions
    : Array.isArray(product.technical_documents)
      ? product.technical_documents
      : [];
  
  const technicalDocsRaw = docsSource
    .filter((doc: any) => doc.ativo !== false)
    .sort((a: any, b: any) => (a.ordem_exibicao || 0) - (b.ordem_exibicao || 0));

  // Filtra documentos válidos para exibição (com nome ou nome_arquivo)
  const technicalDocs = technicalDocsRaw.filter((doc: any) => {
    const nome = typeof doc.nome === 'string' ? doc.nome.trim() : '';
    const nomeArquivo = typeof doc.nome_arquivo === 'string' ? doc.nome_arquivo.trim() : '';
    const isPlaceholder = (v: string) => /^documento sem nome$/i.test(v);
    return (!!nome && !isPlaceholder(nome)) || !!nomeArquivo;
  });

  if (technicalDocs.length > 0) {
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; margin-top: 25px;">Documentos Técnicos</h2>
<div style="background:#fff; border:1px solid #e0e0e0; border-radius:0; overflow-x:auto; -webkit-overflow-scrolling:touch; box-shadow:0 10px 30px rgba(0,0,0,0.1); margin:0 0 25px 0;">
  <table style="width:100%; border-collapse:separate; border-spacing:0;">
    <thead>
      <tr style="background: linear-gradient(135deg, #3E4B5E 0%, #2d3748 100%);">
        <th style="padding:16px; text-align:left; font-weight:700; font-size:16px; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:3px solid #EE7A3E;">Descrição</th>
        <th style="padding:16px; text-align:center; font-weight:700; font-size:16px; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:3px solid #EE7A3E; width:90px;">Download</th>
      </tr>
    </thead>
    <tbody>
      ${technicalDocs.map((doc: any, i: number) => {
        const zebraBackground = i % 2 === 0 ? '#FFFFFF' : '#FCFCFD';
        
        const nome = typeof doc.nome === 'string' ? doc.nome.trim() : '';
        const nomeArquivo = typeof doc.nome_arquivo === 'string' ? doc.nome_arquivo.trim() : '';
        const isPlaceholder = (v: string) => /^documento sem nome$/i.test(v);
        
        const docName = nome && !isPlaceholder(nome) ? nome : nomeArquivo;
        
        // ✅ Usar descrição gerada pela IA (sem truncamento)
        const description = doc.descricao || '';
        
        return `<tr>
          <td style="padding:14px 16px; border-bottom:1px solid #e8e8e8; background:${zebraBackground}; color:#2f3a4a; line-height:1.6; word-break:break-word; overflow-wrap:anywhere;">
            ${description || '<span style="color:#999;">Sem descrição</span>'}
          </td>
          <td style="padding:14px 16px; border-bottom:1px solid #e8e8e8; background:linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); text-align:center;">
            <a href="${doc.url_download}" target="_blank" rel="noopener" download 
               style="display:inline-block; text-decoration:none; font-size:24px; cursor:pointer; transition: transform 0.2s ease;" 
               onmouseover="this.style.transform='scale(1.3)';" 
               onmouseout="this.style.transform='scale(1)';"
               title="Visualizar documento">
              👁️
            </a>
          </td>
        </tr>`;
      }).join('\n      ')}
    </tbody>
  </table>
</div>`;
  }

  // ✅ Cards Empilhados (sem CSS Grid, inline styles)
  html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-top: 25px; margin-bottom: 10px;">Recursos e Informações</h2>
<div style="margin: 20px 0;">
  <!-- Card de Aplicações -->
  <div style="
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    background: #fff;
    margin-bottom: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-left: 3px solid #EE7A3E;
  ">
    <h3 style="margin-top: 0; color: #3E4B5E; font-size: 1.2em; font-weight: 700; letter-spacing: -0.3px;">Aplicações</h3>
    <p style="margin: 0; line-height: 1.7; color: #333;">${
      product.applications 
        ? product.applications 
        : '<span style="background: linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); padding: 8px 12px; border-radius: 6px; display: inline-block; color: #3E4B5E; font-weight: 500;">ℹ️ Nenhuma informação de aplicação cadastrada. Preencha o campo "Aplicações do Produto" no editor.</span>'
    }</p>
  </div>
  
  <!-- Card de Embalagem -->
  <div style="
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    background: #fff;
    margin-bottom: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-left: 3px solid #EE7A3E;
  ">
    <h3 style="margin-top: 0; color: #3E4B5E; font-size: 1.2em; font-weight: 700; letter-spacing: -0.3px;">Embalagem</h3>
    ${buildPackagingInfo(product)}
  </div>
</div>`;

  // ✅ FASE 2: Variações do Produto (cores, tamanhos, modelos)
  if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
    html += `
<div style="margin: 25px 0; padding: 20px; background: #f8fafc; border-left: 4px solid #EE7A3E; border-radius: 8px;">
  <h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-top: 0; margin-bottom: 15px;">
    Variações Disponíveis
  </h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">`;
    
    product.variations.forEach((variation: any) => {
      const hasPrice = variation.price && variation.price > 0;
      const hasStock = variation.stock !== undefined && variation.stock !== null;
      const isInStock = !hasStock || variation.stock > 0;
      
      html += `
    <div style="padding: 15px; background: white; border: 1px solid #e0e0e0; border-radius: 6px; ${!isInStock ? 'opacity: 0.6;' : ''}">
      <h4 style="margin: 0 0 8px 0; color: #3E4B5E; font-size: 1em; font-weight: 600;">
        ${variation.name || 'Variação sem nome'}
      </h4>
      ${hasPrice ? `
        <p style="margin: 4px 0; color: #EE7A3E; font-weight: 600; font-size: 1.1em;">
          R$ ${variation.price.toFixed(2)}
        </p>
      ` : ''}
      ${hasStock ? `
        <p style="margin: 4px 0; font-size: 0.9em; color: ${isInStock ? '#666' : '#e74c3c'};">
          ${isInStock ? `✅ ${variation.stock} em estoque` : '❌ Fora de estoque'}
        </p>
      ` : ''}
      ${variation.sku ? `
        <p style="margin: 4px 0; font-size: 0.85em; color: #999;">
          SKU: ${variation.sku}
        </p>
      ` : ''}
    </div>`;
    });
    
    html += `
  </div>
</div>`;
  }

  // ✅ FAQ (details/summary inline) com Keywords
  if (faq.length > 0) {
    // Filtrar keywords genéricas/placeholder indesejadas
    const blacklist = ['palavras-chave', 'produto', 'prompt', 'palavra-chave'];
    const topKeywords = [
      ...(product.keywords || []),
      ...(product.market_keywords || [])
    ]
      .filter(kw => !blacklist.includes(kw.toLowerCase().trim()))
      .slice(0, 3)
      .join(' | ');
    
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-top: 25px; margin-bottom: 10px;">Perguntas Frequentes</h2>`;
    faq.forEach(item => {
      // Substituir placeholder "Produto sem nome" pelo nome real do produto
      const cleanQuestion = item.question.replace(/produto sem nome/gi, product.name);
      const cleanAnswer = item.answer.replace(/Produto sem nome/g, product.name);
      
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
    transition: background 0.2s ease;
  " onmouseover="this.style.background='linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%)'" onmouseout="this.style.background='linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%)'">
    ${cleanQuestion}
  </summary>
  <p style="
    padding: 14px 16px;
    margin: 0;
    line-height: 1.7;
    color: #333;
    background: #FCFCFD;
    border-radius: 0 0 8px 8px;
  ">${cleanAnswer}</p>
</details>`;
    });
  }

  // ✅ Coleções de Vídeos (details/summary inline) com Keywords
  if (hasVideos) {
    const topKeywords = [
      ...(product.keywords || []),
      ...(product.market_keywords || [])
    ].slice(0, 3).join(' | ');
    
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-top: 25px; margin-bottom: 10px;">🎥 Recursos de Vídeo</h2>`;
    
    if (videoCollections.youtube.length > 0) {
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
  ">
    Vídeos YouTube${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #EE7A3E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; font-weight: 600;">${videoCollections.youtube.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px; padding: 10px; background: #FCFCFD; border-radius: 0 0 8px 8px;">
    ${videoCollections.youtube.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="
        margin: 12px 0;
        padding: 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      ">
        <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 6px; font-size: 1.05em;">📹 Vídeo ${i + 1}</a>
        ${description ? `<p style="margin: 4px 0 0 0; color: #333; font-size: 0.95em; line-height: 1.6;">${description}</p>` : ''}
      </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.instagram.length > 0) {
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
  ">
    Vídeos Instagram<span style="background: #EE7A3E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; font-weight: 600;">${videoCollections.instagram.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px; padding: 10px; background: #FCFCFD; border-radius: 0 0 8px 8px;">
    ${videoCollections.instagram.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="
        margin: 12px 0;
        padding: 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      ">
        <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 6px; font-size: 1.05em;">📹 Vídeo ${i + 1}</a>
        ${description ? `<p style="margin: 4px 0 0 0; color: #333; font-size: 0.95em; line-height: 1.6;">${description}</p>` : ''}
      </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.testimonials.length > 0) {
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
  ">
    Depoimentos em Vídeo<span style="background: #EE7A3E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; font-weight: 600;">${videoCollections.testimonials.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px; padding: 10px; background: #FCFCFD; border-radius: 0 0 8px 8px;">
    ${videoCollections.testimonials.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="
        margin: 12px 0;
        padding: 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      ">
        <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 6px; font-size: 1.05em;">📹 Depoimento ${i + 1}</a>
        ${description ? `<p style="margin: 4px 0 0 0; color: #333; font-size: 0.95em; line-height: 1.6;">${description}</p>` : ''}
      </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.technical.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 4px; font-weight: bold; color: #3E4B5E;">
    Explicações Técnicas${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #EE7A3E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.technical.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.technical.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">📹 Explicação ${i + 1}</a>
      ${description ? `<p style="margin: 4px 0 0 0; color: #333333; font-size: 0.9em; line-height: 1.4;">${description}</p>` : ''}
    </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.tiktok.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 4px; font-weight: bold; color: #3E4B5E;">
    Vídeos TikTok${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #EE7A3E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.tiktok.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.tiktok.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">📹 Vídeo ${i + 1}</a>
      ${description ? `<p style="margin: 4px 0 0 0; color: #666; font-size: 0.9em; line-height: 1.4;">${description}</p>` : ''}
    </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.tutorials.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Tutoriais${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.tutorials.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.tutorials.map((t, i) => {
      const description = truncateToWords(t.description || '', 50);
      return `<div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <a href="${t.course_url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">📹 Tutorial ${i + 1}</a>
      ${description ? `<p style="margin: 4px 0 0 0; color: #666; font-size: 0.9em; line-height: 1.4;">${description}</p>` : ''}
    </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
  }

  // ✅ Galeria de Miniaturas 80x80px no Final (após vídeos)
  html += buildImageGallery(product);

  // ✅ CTA Natural Semântico com Keywords e URL de Desconto
  const primaryKeyword = (product.keywords?.[0] || product.market_keywords?.[0] || product.name);
  const secondaryKeyword = (product.keywords?.[1] || product.market_keywords?.[1] || '');
  const firstBenefit = product.benefits?.[0] || 'Qualidade garantida';
  
  // ✅ PRIORIZAR LABEL DE DESCONTO (mesmo se visible=false ou url vazia)
  const ctaLabel = (product.offer_discount_cta?.label && product.offer_discount_cta.label.trim() !== '')
    ? product.offer_discount_cta.label
    : 'Comprar com Desconto';

  // ✅ URL: usar offer_discount_cta.url se preenchida, senão product_url
  const ctaUrl = (product.offer_discount_cta?.url && product.offer_discount_cta.url.trim() !== '')
    ? product.offer_discount_cta.url
    : (product.product_url || '#');
  
  html += `
<div style="margin: 30px 0; padding: 25px; background: #f8fafc; border-left: 4px solid #EE7A3E; border-radius: 8px;">
  <h3 style="color: #3E4B5E; margin-top: 0; font-size: 1.3em; font-weight: 700;">
    Garanta agora o seu <strong style="color: #3E4B5E;">${primaryKeyword}</strong>
  </h3>
  <p style="color: #555; line-height: 1.7; margin: 15px 0;">
    ${secondaryKeyword ? `Explore nossas opções de <strong>${secondaryKeyword}</strong> e ` : ''}Descubra por que <a href="${ctaUrl}" style="color: #EE7A3E; text-decoration: underline; font-weight: 600;">${product.name}</a> é a escolha ideal para seu consultório. 
    <strong>${firstBenefit}</strong> com entrega rápida em todo Brasil.
  </p>
  <div style="margin-top: 20px;">
    <a href="${ctaUrl}" 
       style="display: inline-block; padding: 12px 30px; background: #EE7A3E; color: white; font-weight: bold; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 15px rgba(238, 122, 62, 0.3); transition: all 0.3s;">
      ${ctaLabel} →
    </a>
  </div>
</div>
`;

  // ✅ CTA Final (gradiente inline com cores SPIN)
  html += `
<div style="background: linear-gradient(135deg, #3E4B5E 0%, #EE7A3E 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
  <h2 style="color: white; margin-top: 0; font-size: 1.5em; font-weight: 700;">Parametrize a sua impressora</h2>
  <p style="margin: 15px 0; line-height: 1.6;">Utilize nosso seletor de parâmetros, parâmetros e indicações para que sua impressão seja perfeita</p>
  <a href="https://parametros.smartdent.com.br/" target="_blank" rel="noopener noreferrer" style="background: #EE7A3E; color: white; padding: 15px 40px; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: bold; margin-top: 10px; box-shadow: 0 4px 15px rgba(238, 122, 62, 0.3);">Parametrize sua Impressora</a>
</div>

</section>`;

  console.log('✅ SPIN Design System aplicado ao HTML final');
  return html;
}
