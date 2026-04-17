import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import {
  validateGoogleAdsHeadline,
  validateGoogleAdsDescription,
  validateGoogleAdsPath,
  applyFallback
} from "../_shared/content-validators.ts";
import { buildFullPrompt, mapProductToContext } from '../_shared/clinical-brain-guard.ts';
import { PROMPTS } from '../_shared/prompt-templates.ts';
import { intelligentTruncate, normalize } from '../_shared/text-utils.ts';

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
        .maybeSingle();
      
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
      // Usar prompt padrão com Clinical Brain Guard
      const productCtx = mapProductToContext({
        ...{ name: seoTitle, description: seoDescription, keywords: [primaryKeyword], target_audience: [targetAudience] },
      });
      prompt = buildFullPrompt(productCtx, PROMPTS.google_ads.rsa_headlines + `\n\nAdicione também:\n` + PROMPTS.google_ads.rsa_descriptions + `\n\nPaths: 2 caminhos, máximo 15 caracteres cada.\n\nRetorne APENAS um JSON válido no formato:\n{\n  "headlines": ["headline1", "headline2", ...],\n  "descriptions": ["desc1", "desc2", ...],\n  "paths": ["path1", "path2"]\n}`);
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
    
    // Track AI token usage
    const { trackFromResponse } = await import('../_shared/track-ai-usage.ts');
    await trackFromResponse(aiResponse, 'generate-ad-copies', 'Cópias Google Ads');
    
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

    // 🛡️ VALIDAÇÃO PROGRAMÁTICA + REGENERAÇÃO AUTOMÁTICA (v3: passa context explicitamente)
    const validatedCopies = await validateAndEnhanceCopies(
      adCopies,
      deepseekApiKey,
      prompt,
      { seoTitle, primaryKeyword, targetAudience }
    );

    console.log('✅ Cópias validadas:', {
      headlines: validatedCopies.headlines.length,
      descriptions: validatedCopies.descriptions.length,
      paths: validatedCopies.paths.length,
      qualityScore: validatedCopies.quality_report.score,
      requiresRevision: validatedCopies.quality_report.requires_prompt_revision
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
// 🛡️ VALIDAÇÃO PROGRAMÁTICA + REGENERAÇÃO (v3: floor+cap, temperatura invertida, quality_report)
interface QualityBreakdown {
  headlines_truncated: { count: number; penalty: number };
  headlines_duplicated: { count: number; penalty: number };
  descriptions_truncated: { count: number; penalty: number };
  paths_invalid: { count: number; penalty: number };
}

interface QualityReport {
  score: number;
  breakdown: QualityBreakdown;
  warnings: string[];
  validation_errors: string[];
  requires_prompt_revision: boolean;
}

async function validateAndEnhanceCopies(
  copies: AdCopies,
  apiKey: string,
  prompt: string,
  context: { seoTitle: string; primaryKeyword: string; targetAudience: string }
): Promise<AdCopies & { quality_report: QualityReport }> {
  let attempts = 0;
  const maxAttempts = 3;
  const minQualityScore = 70;
  // v3: temperatura DECRESCENTE — regras rígidas precisam de menos criatividade após falha
  const temperatures = [0.5, 0.3, 0.1];

  let currentCopies = copies;
  let validationErrors: string[] = [];
  let qualityScore = 0;
  let breakdown: QualityBreakdown = {
    headlines_truncated: { count: 0, penalty: 0 },
    headlines_duplicated: { count: 0, penalty: 0 },
    descriptions_truncated: { count: 0, penalty: 0 },
    paths_invalid: { count: 0, penalty: 0 }
  };
  let requiresPromptRevision = false;

  // ✅ v3: contexto explícito (não mais ReferenceError)
  currentCopies = ensureMinimumAssets(currentCopies, {
    productName: context.seoTitle?.substring(0, 25) || context.primaryKeyword?.substring(0, 25) || 'Produto',
    category: context.targetAudience?.split(' ')[0] || 'Profissional'
  });

  while (attempts < maxAttempts) {
    attempts++;
    validationErrors = [];
    let totalScore = 100; // começa em 100, penalties subtraem
    let headlinesTruncated = 0;
    let headlinesDuplicated = 0;
    let descriptionsTruncated = 0;
    let pathsInvalid = 0;

    // Validar Headlines (com tracking de truncate)
    const validHeadlines = currentCopies.headlines.map((h, i) => {
      const validation = validateGoogleAdsHeadline(h);
      if (!validation.isValid) {
        validationErrors.push(`Headline ${i + 1}: ${validation.errors.join(', ')}`);
      }
      if (h && h.length > 30) {
        headlinesTruncated++;
        const truncated = intelligentTruncate(h, 30);
        console.warn(`[Validator] Headline ${i + 1} truncado: "${h}" → "${truncated}"`);
        return truncated;
      }
      validation.warnings.forEach(w => console.warn(`[Validator] Headline ${i + 1} warning: ${w}`));
      return h;
    });

    // Validar Descriptions
    const validDescriptions = currentCopies.descriptions.map((d, i) => {
      const validation = validateGoogleAdsDescription(d);
      if (!validation.isValid) {
        validationErrors.push(`Description ${i + 1}: ${validation.errors.join(', ')}`);
      }
      if (d && d.length > 90) {
        descriptionsTruncated++;
        const truncated = intelligentTruncate(d, 90);
        console.warn(`[Validator] Description ${i + 1} truncado: "${d}" → "${truncated}"`);
        return truncated;
      }
      validation.warnings.forEach(w => console.warn(`[Validator] Description ${i + 1} warning: ${w}`));
      return d;
    });

    // Validar Paths
    const validPaths = currentCopies.paths.map((p, i) => {
      const validation = validateGoogleAdsPath(p);
      if (!validation.isValid) {
        pathsInvalid++;
        validationErrors.push(`Path ${i + 1}: ${validation.errors.join(', ')}`);
        return validation.metadata.cleaned.substring(0, 15);
      }
      return validation.metadata.cleaned;
    });

    // ✅ v3: dedup case + accent insensitive APÓS truncate
    const seen = new Set<string>();
    const dedupedHeadlines: string[] = [];
    for (const h of validHeadlines) {
      const key = normalize(h);
      if (!key) continue;
      if (seen.has(key)) {
        headlinesDuplicated++;
        continue;
      }
      seen.add(key);
      dedupedHeadlines.push(h);
    }

    // ✅ v3: penalty floor + cap
    const truncatePenalty = Math.min(headlinesTruncated, 5) * -5; // cap -25
    const dupPenalty = Math.min(headlinesDuplicated, 5) * -5;     // cap -25
    const descPenalty = Math.min(descriptionsTruncated, 4) * -5;  // cap -20
    const pathPenalty = Math.min(pathsInvalid, 2) * -5;           // cap -10

    qualityScore = Math.max(0, totalScore + truncatePenalty + dupPenalty + descPenalty + pathPenalty);

    breakdown = {
      headlines_truncated: { count: headlinesTruncated, penalty: truncatePenalty },
      headlines_duplicated: { count: headlinesDuplicated, penalty: dupPenalty },
      descriptions_truncated: { count: descriptionsTruncated, penalty: descPenalty },
      paths_invalid: { count: pathsInvalid, penalty: pathPenalty }
    };

    // ✅ v3: count > 5 → flag para regeneração com prompt mais específico
    requiresPromptRevision = headlinesTruncated > 5;

    console.log(`[Validator] Tentativa ${attempts}/${maxAttempts}:`, {
      qualityScore,
      breakdown,
      requiresPromptRevision,
      validationErrors: validationErrors.length
    });

    // Recompletar headlines se dedup deixou abaixo de 15
    let finalHeadlines = dedupedHeadlines;
    if (finalHeadlines.length < 15) {
      const padded = ensureMinimumAssets(
        { headlines: finalHeadlines, descriptions: validDescriptions, paths: validPaths },
        {
          productName: context.seoTitle?.substring(0, 25) || context.primaryKeyword?.substring(0, 25) || 'Produto',
          category: context.targetAudience?.split(' ')[0] || 'Profissional'
        }
      );
      finalHeadlines = padded.headlines;
    }

    if (qualityScore >= minQualityScore && validationErrors.length === 0 && !requiresPromptRevision) {
      const warnings: string[] = [];
      if (headlinesTruncated > 0) warnings.push(`${headlinesTruncated} headlines truncados, considere revisar`);
      if (headlinesDuplicated > 0) warnings.push(`${headlinesDuplicated} headlines duplicados removidos`);
      return {
        headlines: finalHeadlines,
        descriptions: validDescriptions,
        paths: validPaths,
        quality_report: {
          score: qualityScore,
          breakdown,
          warnings,
          validation_errors: validationErrors,
          requires_prompt_revision: false
        }
      };
    }

    // Regenerar com temperatura DECRESCENTE
    if (attempts < maxAttempts) {
      const nextTemp = temperatures[attempts] ?? 0.1;
      console.log(`[Validator] Score ${qualityScore} < ${minQualityScore} (revision=${requiresPromptRevision}). Regenerando com temp=${nextTemp}...`);
      try {
        // ✅ v3: prompt enriquecido quando count > 5
        const enrichedPrompt = requiresPromptRevision
          ? `${prompt}\n\n⚠️ ATENÇÃO: o limite de 30 caracteres por headline é RÍGIDO. Conte os caracteres antes de retornar cada headline. NUNCA ultrapasse 30 chars. Descriptions: máximo 90 chars.`
          : prompt;

        const retryResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'Você é um copywriter especialista em Google Ads. Sempre retorne JSON válido e siga rigorosamente os limites de caracteres.' },
              { role: 'user', content: enrichedPrompt }
            ],
            temperature: nextTemp,
            max_tokens: 1000
          })
        });

        if (!retryResponse.ok) throw new Error(`Retry failed: ${retryResponse.status}`);

        const retryData = await retryResponse.json();
        const retryText = retryData.choices[0].message.content;
        const jsonMatch = retryText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          currentCopies = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        // ✅ v3: log explícito do erro (não engolir silenciosamente)
        console.error(`[Validator] Erro ao regenerar (tentativa ${attempts}):`, error);
        break;
      }
    }
  }

  // Fallback final
  console.warn(`[Validator] ⚠️ Entregando resultado com score ${qualityScore} (abaixo de ${minQualityScore})`);
  const warnings: string[] = [`Score abaixo do mínimo após ${maxAttempts} tentativas`];
  if (requiresPromptRevision) warnings.push('Recomenda-se revisão do prompt gerador');

  return {
    headlines: currentCopies.headlines.map(h => h && h.length > 30 ? intelligentTruncate(h, 30) : h),
    descriptions: currentCopies.descriptions.map(d => d && d.length > 90 ? intelligentTruncate(d, 90) : d),
    paths: currentCopies.paths.map(p => (p ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)),
    quality_report: {
      score: qualityScore,
      breakdown,
      warnings,
      validation_errors: validationErrors,
      requires_prompt_revision: requiresPromptRevision
    }
  };
}

// ✅ v3: Padding com substituição de strings vazias (mantido)
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
  
  if (!adCopies.headlines) adCopies.headlines = [];
  if (!adCopies.descriptions) adCopies.descriptions = [];
  if (!adCopies.paths) adCopies.paths = [];
  
  // Substituir strings vazias por fallbacks
  adCopies.headlines = adCopies.headlines.map((h, i) => 
    (h && h.trim().length > 0) ? h : (fallbackHeadlines[i] || `Headline ${i + 1}`)
  );
  
  adCopies.descriptions = adCopies.descriptions.map((d, i) => 
    (d && d.trim().length > 0) ? d : (fallbackDescriptions[i] || `Descrição profissional ${i + 1}.`)
  );
  
  // ✅ v3: Padding com checagem de duplicata via normalize()
  const existingKeys = new Set(adCopies.headlines.map(h => normalize(h)));
  let fallbackIdx = 0;
  while (adCopies.headlines.length < MIN_HEADLINES && fallbackIdx < fallbackHeadlines.length * 2) {
    const candidate = fallbackHeadlines[fallbackIdx % fallbackHeadlines.length] || `Headline ${adCopies.headlines.length + 1}`;
    const key = normalize(candidate);
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      adCopies.headlines.push(candidate);
    }
    fallbackIdx++;
  }
  // Se ainda faltarem, força com sufixo numérico
  while (adCopies.headlines.length < MIN_HEADLINES) {
    adCopies.headlines.push(`Oferta ${adCopies.headlines.length + 1}`);
  }
  
  while (adCopies.descriptions.length < MIN_DESCRIPTIONS) {
    const idx = adCopies.descriptions.length;
    adCopies.descriptions.push(fallbackDescriptions[idx] || `Descrição ${idx + 1}.`.substring(0, 90));
  }
  
  if (adCopies.paths.length < 2) {
    adCopies.paths = [
      context.productName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15) || 'produto',
      context.category.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15) || 'loja'
    ];
  }
  
  return adCopies;
}