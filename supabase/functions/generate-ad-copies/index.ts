import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import {
  validateGoogleAdsHeadline,
  validateGoogleAdsDescription,
  validateGoogleAdsPath,
  applyFallback
} from "../_shared/content-validators.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  targetAudience?: string;
}

interface AdCopies {
  headlines: string[];
  descriptions: string[];
  paths: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seoTitle, seoDescription, primaryKeyword, targetAudience = 'profissionais de odontologia' }: GenerateRequest = await req.json();

    console.log('🎯 Gerando cópias para Google Ads:', { seoTitle, primaryKeyword });

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    // Verificar se há prompt customizado com campos selecionados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: promptConfig } = await supabase
      .from('prompts_configuration')
      .select('custom_prompt, selected_fields, selected_data_sources')
      .eq('edge_function_id', 'generate-ad-copies')
      .eq('prompt_name', 'Cópias Google Ads')
      .single();

    let prompt = '';

    if (promptConfig?.custom_prompt) {
      // Usar prompt customizado com seleção de campos
      const { extractSelectedData, processPromptWithSelectedData } = await import('../_shared/prompt-processor.ts');
      
      // Buscar dados da empresa para contexto adicional
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select('*')
        .limit(1)
        .single();
      
      const mockProduct = { 
        name: seoTitle, 
        description: seoDescription,
        applications: '',
        keywords: [primaryKeyword],
        market_keywords: [],
        target_audience: [targetAudience]
      };
      
      const selectedData = extractSelectedData(mockProduct, companyProfile, {
        selectedFields: promptConfig.selected_fields || {},
        selectedDataSources: promptConfig.selected_data_sources || []
      });
      
      prompt = processPromptWithSelectedData(promptConfig.custom_prompt, selectedData);
    } else {
      // Usar prompt padrão
      prompt = `Você é um especialista em copywriting para Google Ads com foco em campanhas para ${targetAudience}, PRIORIZANDO CATEGORIAS E SUBCATEGORIAS.

Gere cópias para um Responsive Search Ad (RSA) baseadas nas seguintes informações:
- SEO Title: ${seoTitle}
- SEO Description: ${seoDescription}
- Keyword Principal: ${primaryKeyword}
- Público-alvo: ${targetAudience}

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **PRIORIZE categoria e subcategoria nos títulos quando identificáveis**
2. **Use categorias para criar paths relevantes**
3. **Incorpore taxonomia de categorias nas descrições**

REGRAS OBRIGATÓRIAS:
1. Headlines: **EXATAMENTE 15 variações**, máximo 30 caracteres cada
2. Descriptions: **EXATAMENTE 4 variações**, máximo 90 caracteres cada
3. Paths: 2 caminhos, máximo 15 caracteres cada (use categorias se possível)
4. Linguagem: português brasileiro
5. Tom: profissional, confiável, sem sensacionalismo
6. Incluir keyword principal em pelo menos 2 headlines
7. Se categoria/subcategoria identificáveis no conteúdo, use nos headlines
8. EVITAR: alegações médicas proibidas, CAPSLOCK, termos como "cura", "milagre", "garantido"
9. INCLUIR: benefícios claros, chamadas para ação sutis
10. **PROIBIDO**: Quebras de linha (\n), aspas duplas não escapadas, truncamentos

🚨 **VALIDAÇÃO PRÉ-PROMPT CRÍTICA - FASE 3** 🚨

**HEADLINES (30 caracteres EXATOS):**
- Gere frases COMPLETAS que façam sentido ANTES do caractere 30
- Nunca truncar no meio de uma palavra
- Use CTAs curtos e impactantes: "Agende Já", "Confira", "Saiba Mais"
- Exemplo CORRETO: "Scanner Intraoral Premium" (27 chars)
- Exemplo ERRADO: "Scanner Intraoral de Alta Q..." (TRUNCADO!)

**DESCRIPTIONS (90 caracteres EXATOS):**
- Frases completas com início, meio e fim DENTRO de 90 chars
- Use verbos de ação + benefício claro
- Exemplo CORRETO: "Digitalize sorrisos com precisão milimétrica. Entrega rápida para todo Brasil." (80 chars)
- Exemplo ERRADO: "Digitalize sorrisos com precisão milimétrica e tecnologia de ponta que garante..." (TRUNCADO!)

**PATHS (15 caracteres EXATOS):**
- Palavras únicas ou compostas curtas
- Apenas letras minúsculas e números, sem espaços ou acentos
- Exemplo CORRETO: "scanner", "3d", "digital"
- Exemplo ERRADO: "scanner-3d-pro" (contém hífens!)

**PREENCHIMENTO CRIATIVO:**
Se tiver espaço sobrando (<30 chars para headlines), use:
- Emojis discretos: "✓", "→"
- Números: "24h", "50%", "3D"
- Destaque: "NOVO", "PRO"

Retorne APENAS um JSON válido no formato:
{
  "headlines": ["headline1", "headline2", ...],
  "descriptions": ["desc1", "desc2", ...],
  "paths": ["path1", "path2"]
}`;
    }

    // Função para processar variáveis nos prompts customizados
    function processPromptVariables(prompt: string, data: any): string {
      let processedPrompt = prompt;
      
      processedPrompt = processedPrompt.replace(/{seoTitle}/g, data.seoTitle || '');
      processedPrompt = processedPrompt.replace(/{seoDescription}/g, data.seoDescription || '');
      processedPrompt = processedPrompt.replace(/{primaryKeyword}/g, data.primaryKeyword || '');
      processedPrompt = processedPrompt.replace(/{targetAudience}/g, data.targetAudience || '');
      
      return processedPrompt;
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Você é um copywriter especialista em Google Ads. Sempre retorne JSON válido e siga rigorosamente os limites de caracteres.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API DeepSeek:', response.status, errorText);
      throw new Error(`Erro na API DeepSeek: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedText = aiResponse.choices[0].message.content;

    console.log('🤖 Resposta da IA:', generatedText);

    // Parse and validate the AI response
    let adCopies: AdCopies;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }
      
      adCopies = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta da IA:', parseError);
      
      // Fallback: generate basic copies
      adCopies = {
        headlines: [
          primaryKeyword.substring(0, 25),
          'Atendimento Especializado',
          'Agende sua Consulta',
          'Resultado de Qualidade',
          'Tecnologia Avançada',
          'Profissionais Experientes'
        ],
        descriptions: [
          'Atendimento personalizado com tecnologia de ponta.',
          'Agende sua consulta e descubra a diferença.',
        ],
        paths: ['consulta', 'qualidade']
      };
    }

    // 🛡️ VALIDAÇÃO PROGRAMÁTICA + REGENERAÇÃO AUTOMÁTICA
    const validatedCopies = await validateAndEnhanceCopies(
      adCopies,
      deepseekApiKey,
      prompt
    );

    console.log('✅ Cópias validadas:', {
      headlines: validatedCopies.headlines.length,
      descriptions: validatedCopies.descriptions.length,
      paths: validatedCopies.paths.length,
      qualityScore: validatedCopies.metadata.qualityScore
    });

    return new Response(JSON.stringify(validatedCopies), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na função generate-ad-copies:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 🛡️ VALIDAÇÃO PROGRAMÁTICA + REGENERAÇÃO (FASE 4)
async function validateAndEnhanceCopies(
  copies: AdCopies,
  apiKey: string,
  prompt: string
): Promise<AdCopies & { metadata: { qualityScore: number; validationErrors: string[] } }> {
  let attempts = 0;
  const maxAttempts = 3;
  const minQualityScore = 70;
  
  let currentCopies = copies;
  let validationErrors: string[] = [];
  let qualityScore = 0;

  // ✅ Aplicar ensureMinimumAssets antes da validação
  currentCopies = ensureMinimumAssets(currentCopies, {
    productName: 'Produto',
    category: 'Categoria'
  });

  while (attempts < maxAttempts) {
    attempts++;
    validationErrors = [];
    let totalScore = 0;
    let validationCount = 0;

    // Validar Headlines
    const validHeadlines = currentCopies.headlines.map((h, i) => {
      const validation = validateGoogleAdsHeadline(h);
      totalScore += validation.score;
      validationCount++;

      if (!validation.isValid) {
        validationErrors.push(`Headline ${i + 1}: ${validation.errors.join(', ')}`);
        if (h.length > 30) {
          const truncated = intelligentTruncate(h, 30);
          console.warn(`[Validator] Headline ${i + 1} truncado: "${h}" → "${truncated}"`);
          return truncated;
        }
      }

      validation.warnings.forEach(w => {
        console.warn(`[Validator] Headline ${i + 1} warning: ${w}`);
      });

      return h;
    });

    // Validar Descriptions
    const validDescriptions = currentCopies.descriptions.map((d, i) => {
      const validation = validateGoogleAdsDescription(d);
      totalScore += validation.score;
      validationCount++;

      if (!validation.isValid) {
        validationErrors.push(`Description ${i + 1}: ${validation.errors.join(', ')}`);
        if (d.length > 90) {
          const truncated = intelligentTruncate(d, 90);
          console.warn(`[Validator] Description ${i + 1} truncado: "${d}" → "${truncated}"`);
          return truncated;
        }
      }

      validation.warnings.forEach(w => {
        console.warn(`[Validator] Description ${i + 1} warning: ${w}`);
      });

      return d;
    });

    // Validar Paths
    const validPaths = currentCopies.paths.map((p, i) => {
      const validation = validateGoogleAdsPath(p);
      totalScore += validation.score;
      validationCount++;

      if (!validation.isValid) {
        validationErrors.push(`Path ${i + 1}: ${validation.errors.join(', ')}`);
        return validation.metadata.cleaned.substring(0, 15);
      }

      validation.warnings.forEach(w => {
        console.warn(`[Validator] Path ${i + 1} warning: ${w}`);
      });

      return validation.metadata.cleaned;
    });

    qualityScore = Math.round(totalScore / validationCount);

    console.log(`[Validator] Tentativa ${attempts}/${maxAttempts}:`, {
      qualityScore,
      validationErrors: validationErrors.length,
      minRequired: minQualityScore
    });

    // Se passou na validação, retornar
    if (qualityScore >= minQualityScore && validationErrors.length === 0) {
      return {
        headlines: validHeadlines,
        descriptions: validDescriptions,
        paths: validPaths,
        metadata: { qualityScore, validationErrors }
      };
    }

    // Se ainda há tentativas, regenerar
    if (attempts < maxAttempts) {
      console.log(`[Validator] Score ${qualityScore} < ${minQualityScore}. Regenerando...`);
      try {
        const retryResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'Você é um copywriter especialista em Google Ads. Sempre retorne JSON válido e siga rigorosamente os limites de caracteres.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
            max_tokens: 1000
          })
        });

        if (!retryResponse.ok) {
          throw new Error(`Retry failed: ${retryResponse.status}`);
        }

        const retryData = await retryResponse.json();
        const retryText = retryData.choices[0].message.content;
        const jsonMatch = retryText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          currentCopies = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error(`[Validator] Erro ao regenerar (tentativa ${attempts}):`, error);
        break;
      }
    }
  }

  // Fallback: retornar último resultado truncado
  console.warn(`[Validator] ⚠️ Usando resultado com score ${qualityScore} (abaixo de ${minQualityScore})`);
  
  return {
    headlines: currentCopies.headlines.map(h => h.length > 30 ? intelligentTruncate(h, 30) : h),
    descriptions: currentCopies.descriptions.map(d => d.length > 90 ? intelligentTruncate(d, 90) : d),
    paths: currentCopies.paths.map(p => p.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)),
    metadata: { qualityScore, validationErrors }
  };
}

// Truncamento inteligente
function intelligentTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace).trim() + '...';
  }
  
  return truncated.substring(0, maxLength - 3).trim() + '...';
}

// ✅ Função de padding de assets (FASE 8)
function ensureMinimumAssets(adCopies: AdCopies, context: { productName: string; category: string }): AdCopies {
  const MIN_HEADLINES = 15;
  const MIN_DESCRIPTIONS = 4;
  
  const fallbackHeadlines = [
    context.productName.substring(0, 30),
    `Comprar ${context.productName}`.substring(0, 30),
    `${context.category} Premium`.substring(0, 30),
    `Melhor ${context.productName}`.substring(0, 30),
    `${context.productName} Oferta`.substring(0, 30),
    'Qualidade Garantida',
    'Entrega Rápida Brasil',
    'Preço Especial Hoje',
    'Confira Agora',
    'Frete Grátis',
    'Atendimento 24h',
    'Parcelamos 12x',
    'Loja Oficial',
    'Top de Vendas',
    'Novidade 2025'
  ];
  
  const fallbackDescriptions = [
    `${context.productName} com qualidade e garantia. Entrega Brasil.`.substring(0, 90),
    `Confira ${context.category}. Atendimento especializado.`.substring(0, 90),
    `Compre ${context.productName} com segurança. Parcelamos 12x.`.substring(0, 90),
    `${context.category} profissional. Suporte técnico incluso.`.substring(0, 90)
  ];
  
  // Padding de headlines
  while (adCopies.headlines.length < MIN_HEADLINES) {
    const idx = adCopies.headlines.length;
    adCopies.headlines.push(fallbackHeadlines[idx] || `Headline ${idx + 1}`);
  }
  
  // Padding de descriptions
  while (adCopies.descriptions.length < MIN_DESCRIPTIONS) {
    const idx = adCopies.descriptions.length;
    adCopies.descriptions.push(fallbackDescriptions[idx] || `Descrição ${idx + 1}.`.substring(0, 90));
  }
  
  return adCopies;
}