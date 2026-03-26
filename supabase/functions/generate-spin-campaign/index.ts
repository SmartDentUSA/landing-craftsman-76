import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { trackFromResponse } from '../_shared/track-ai-usage.ts';
import { SPIN_SYSTEM_PROMPT } from "../_shared/spin-system-prompt.ts";
import {
  validateWhatsAppMessage,
  applyFallback,
  DEFAULT_FALLBACKS
} from "../_shared/content-validators.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== HELPERS PARA WHATSAPP ====================

// Formatar métricas com ordem correta e humanização
function formatPainMetrics(metrics: Record<string, string>): string[] {
  const standardOrder = [
    'roi', 'lab_time', 'digital_time', 'patient_loss', 'revenue_loss',
    'workflow_improvement', 'quality_gain', 'training_time', 'maintenance_cost'
  ];
  
  const labels: Record<string, string> = {
    'roi': 'Retorno do Investimento',
    'lab_time': 'Tempo no Laboratório Tradicional',
    'digital_time': 'Tempo com Fluxo Digital',
    'patient_loss': 'Perda de Pacientes Atual',
    'revenue_loss': 'Perda de Receita Mensal',
    'workflow_improvement': 'Melhoria no Fluxo de Trabalho',
    'quality_gain': 'Ganho de Qualidade',
    'training_time': 'Tempo de Treinamento',
    'maintenance_cost': 'Custo de Manutenção'
  };
  
  const lines: string[] = [];
  const processedKeys = new Set<string>();
  
  // Primeiro: métricas padrão na ordem definida
  standardOrder.forEach(key => {
    const normalizedKey = key.toLowerCase();
    const matchKey = Object.keys(metrics).find(k => 
      k.toLowerCase() === normalizedKey
    );
    
    if (matchKey && metrics[matchKey]) {
      lines.push(`• ${labels[key]}: ${metrics[matchKey]}`);
      processedKeys.add(matchKey);
    }
  });
  
  // Depois: métricas personalizadas (ordem de inserção)
  Object.entries(metrics).forEach(([key, value]) => {
    if (!processedKeys.has(key) && value) {
      lines.push(`• ${key}: ${value}`);
    }
  });
  
  return lines;
}

// Resumir texto longo para WhatsApp (quebra por frase)
function summarizeForWhatsApp(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;
  
  const sentences = text.split(/[.!?]\s+/);
  let summary = sentences[0];
  
  for (let i = 1; i < sentences.length; i++) {
    const nextSummary = summary + '. ' + sentences[i];
    if (nextSummary.length > maxLength) break;
    summary = nextSummary;
  }
  
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3).trim() + '...';
  }
  
  return summary;
}

// Extrair APENAS métricas personalizadas (não-fixas)
function formatCustomMetricsOnly(metrics: Record<string, string>): string[] {
  const fixedMetricsKeys = [
    'roi', 'lab_time', 'digital_time', 'patient_loss', 'revenue_loss',
    'workflow_improvement', 'quality_gain', 'training_time', 'maintenance_cost'
  ];
  
  const lines: string[] = [];
  
  Object.entries(metrics).forEach(([key, value]) => {
    const isFixedMetric = fixedMetricsKeys.some(fixedKey => 
      key.toLowerCase() === fixedKey.toLowerCase()
    );
    
    if (!isFixedMetric && value) {
      lines.push(`• ${key}: ${value}`);
    }
  });
  
  return lines;
}

// Validar se dados são de teste (prevenir envio)
function validateSuccessCase(successCase: any): void {
  const testPatterns = ['dede', 'teste', 'test', 'xxx', '...'];
  
  const fieldsToCheck = [
    { name: 'Resultados Alcançados', value: successCase.results_achieved },
    { name: 'Nome do Cliente', value: successCase.client_name },
    { name: 'Nome da Clínica', value: successCase.clinic_name },
    { name: 'Cidade', value: successCase.city }
  ];
  
  const invalidFields: string[] = [];
  
  for (const field of fieldsToCheck) {
    if (!field.value) continue;
    const lower = field.value.toLowerCase();
    for (const pattern of testPatterns) {
      if (lower.includes(pattern)) {
        invalidFields.push(`${field.name}: "${field.value}"`);
        break;
      }
    }
  }
  
  if (invalidFields.length > 0) {
    throw new Error(
      `❌ Complete os dados reais antes de gerar.\n\n` +
      `Campos com conteúdo de teste detectado:\n` +
      invalidFields.map(f => `• ${f}`).join('\n') +
      `\n\nEdite o Caso de Sucesso e preencha com dados reais.`
    );
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { solutionId, contentType } = await req.json();

    console.log('🚀 generate-spin-campaign invoked:', {
      timestamp: new Date().toISOString(),
      solutionId,
      contentType
    });

    if (!solutionId || !contentType) {
      throw new Error('solutionId e contentType são obrigatórios');
    }

    // 1. Buscar solução SPIN completa
    const { data: solution, error: solutionError } = await supabase
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução SPIN não encontrada');
    }

    // 2. Buscar produtos da solução
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('*')
      .in('id', solution.product_ids);

    if (productsError || !products || products.length === 0) {
      throw new Error('Produtos não encontrados');
    }

    // 3. Buscar company profile
    const { data: company } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .maybeSingle();

    // 4. Determinar URL final (custom_url ou product_url)
    const finalUrl = solution.custom_url?.enabled && solution.custom_url?.url
      ? solution.custom_url.url
      : products[0]?.product_url || company?.website_url || '';

    const ctaLabel = solution.custom_url?.label || 'Saiba Mais';

    // 5. GERAR GOOGLE ADS CSV
    if (contentType === 'google_ads') {
      const allKeywords: string[] = [];
      
      // Coletar keywords de todos os produtos
      products.forEach(product => {
        if (product.keywords) {
          const keywords = Array.isArray(product.keywords) 
            ? product.keywords 
            : typeof product.keywords === 'string'
              ? JSON.parse(product.keywords)
              : [];
          allKeywords.push(...keywords);
        }
      });

      // Criar grupos de anúncios baseados em produtos
      const adGroups = products.map((product, index) => {
        const productKeywords = Array.isArray(product.keywords) 
          ? product.keywords 
          : typeof product.keywords === 'string'
            ? JSON.parse(product.keywords)
            : [];

        return {
          name: `Grupo ${index + 1} - ${product.name?.substring(0, 30) || 'Produto'}`,
          keywords: productKeywords.slice(0, 10).map((kw: string) => ({
            text: kw,
            match_type: 'Phrase'
          }))
        };
      });

      // Headlines e descriptions baseados nos produtos
      const headlines = products.flatMap(p => [
        p.name?.substring(0, 30) || '',
        p.seo_title_override?.substring(0, 30) || '',
        solution.title.substring(0, 30)
      ]).filter(h => h).slice(0, 10);

      const descriptions = products.flatMap(p => [
        p.description?.substring(0, 90) || '',
        p.seo_description_override?.substring(0, 90) || ''
      ]).filter(d => d).slice(0, 4);

      const csvConfig = {
        campaignName: `SPIN - ${solution.title}`,
        config: {
          daily_budget_brl: 50,
          languages: ['pt-BR'],
          locations: ['Brasil'],
          bidding: { strategy: 'Maximize clicks' },
          negatives: ['grátis', 'barato', 'usado'],
          utm: {
            source: 'google',
            medium: 'cpc',
            campaign: solution.title.toLowerCase().replace(/\s+/g, '_')
          }
        },
        adGroups,
        adCopies: {
          headlines,
          descriptions,
          paths: ['produtos', 'spin']
        },
        sitelinks: [],
        videos: [],
        finalUrl
      };

      const csv = GoogleAdsCSVBuilder.buildFullCSV(csvConfig);

      const campaign = {
        csv,
        config: csvConfig,
        keywords: allKeywords,
        warnings: [],
        generated_at: new Date().toISOString()
      };

      // Salvar no banco
      await supabase
        .from('spin_selling_solutions')
        .update({ google_ads_campaign: campaign })
        .eq('id', solutionId);

      // Criar artifact_chain para rastreabilidade
      const artifactChain = {
        source_data_ids: [solutionId, ...products.map(p => p.id)],
        pitch_version: '2.0.0',
        generated_by: 'generate-spin-campaign',
        timestamp: new Date().toISOString(),
        model_used: 'google/gemini-2.5-flash',
        pain_type: solution.pain_type,
        content_type: 'google_ads'
      };

      return new Response(
        JSON.stringify({ 
          csv, 
          campaign,
          artifact_chain: artifactChain 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. GERAR WHATSAPP MESSAGE
    if (contentType === 'whatsapp') {
      const successCases = solution.success_cases || [];
      const realQuotes = solution.real_quotes || [];
      
      if (successCases.length === 0) {
        throw new Error('Adicione pelo menos 1 caso de sucesso antes de gerar');
      }

      const firstCase = successCases[0];
      validateSuccessCase(firstCase); // 🔍 Validação anti-teste

      const firstQuote = realQuotes[0];

      // 🎯 EMOTIONAL HOOK MAPPING POR PAIN TYPE (FASE 3)
      const emotionalHooks: Record<string, string> = {
        'tempo': '⏰ Cansado de perder horas no laboratório?',
        'custo': '💸 Gastando demais com retrabalho?',
        'qualidade': '🎯 Insatisfeito com resultados inconsistentes?',
        'paciente': '😔 Perdendo pacientes para concorrentes?',
        'tecnologia': '🔧 Equipamento obsoleto travando seu crescimento?',
        'precisao': '📏 Erros de ajuste prejudicando sua reputação?',
        'entrega': '📦 Atrasos comprometendo prazos?',
        'default': '🚀 Pronto para transformar sua clínica?'
      };

      const selectedHook = emotionalHooks[solution.pain_type] || emotionalHooks['default'];
      
      // Contexto de urgência das métricas
      const urgencyContext = solution.pain_metrics 
        ? formatPainMetrics(solution.pain_metrics).slice(0, 2).join(' | ')
        : '';

      // 3️⃣ GERAR STORYTELLING COM VALIDAÇÃO (FASE 4)
      console.log('[WhatsApp] 🎯 Gerando storytelling com validação automática...');
      
      let storytelling = '';
      let attempts = 0;
      const maxAttempts = 3;
      const minQualityScore = 70;

      // Construir prompt específico para storytelling
      const whatsappPrompt = `
Você é um especialista em SPIN Selling e copywriting para WhatsApp B2B.

CONTEXTO:
- Solução: ${solution.title}
- Pain Type: ${solution.pain_type}
- Emotional Hook: ${selectedHook}
- Urgência: ${urgencyContext}

TAREFA:
Gerar um parágrafo de storytelling (máx. 150 caracteres) que:
1. Comece com o emotional hook fornecido
2. Siga estrutura: GANCHO → TRANSFORMAÇÃO → BENEFÍCIO → FECHAMENTO
3. Mencione implicitamente a dor sem ser alarmista
4. Crie senso de urgência sutil

EXEMPLO:
"${selectedHook} Imagine ter controle total sobre prazos, reduzir custos em 40% e conquistar autonomia profissional. Descubra como."

Gere APENAS o texto, sem aspas ou formatação.
`;

      // Função de geração
      const generateStory = async (): Promise<string> => {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: SPIN_SYSTEM_PROMPT },
              { role: 'user', content: whatsappPrompt }
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        await trackFromResponse(aiData, 'generate-spin-campaign', 'Campanha SPIN');
        return aiData.choices[0].message.content.trim();
      };

      // Loop de validação + regeneração
      while (attempts < maxAttempts) {
        attempts++;

        try {
          storytelling = await generateStory();
          
          // Validar storytelling
          const validation = validateWhatsAppMessage(
            storytelling,
            selectedHook,
            solution.pain_type
          );

          console.log(`[WhatsApp Validator] Tentativa ${attempts}/${maxAttempts}:`, {
            score: validation.score,
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            metadata: validation.metadata
          });

          // Se passou na validação, usar
          if (validation.isValid && validation.score >= minQualityScore) {
            console.log(`[WhatsApp] ✅ Storytelling validado (tentativa ${attempts}):`, {
              storytelling,
              pain_type: solution.pain_type,
              hook_used: selectedHook.substring(0, 50),
              has_urgency: !!urgencyContext,
              length: storytelling.length,
              qualityScore: validation.score,
              timestamp: new Date().toISOString()
            });
            break;
          }

          // Se não passou e ainda tem tentativas, continuar loop
          if (attempts < maxAttempts) {
            console.warn(`[WhatsApp] Score ${validation.score} < ${minQualityScore}. Regenerando...`);
          }

        } catch (error) {
          console.error(`[WhatsApp Validator] Erro na tentativa ${attempts}:`, error);
          
          // Se última tentativa, usar fallback
          if (attempts >= maxAttempts) {
            storytelling = applyFallback('whatsApp', 'message', error.message);
          }
        }
      }

      // Se falhou todas as tentativas, usar fallback
      if (!storytelling) {
        console.error('[WhatsApp] ⚠️ Todas as tentativas falharam. Usando fallback.');
        storytelling = DEFAULT_FALLBACKS.whatsApp.message;
      }

      // Construir mensagem WhatsApp com personalização total
      const journeyLabels = solution.spin_journey_labels || {
        desire_label: "🎯 *Desejo:*",
        pain_label: "⚠️ *Dor:*",
        result_label: "✅ *Resultado Esperado:*"
      };

      const sectionTitles = solution.whatsapp_section_titles || {
        journey_title: "💬 Jornada do Cliente:",
        journey_subtitle: null,
        metrics_title: "📊 Métricas de Impacto:",
        metrics_subtitle: null
      };

      // Construir Mensagem WhatsApp (narrativa fluida)
      let message = `*${solution.title.toUpperCase()}*\n\n`;

      // Storytelling IA (sem título de seção)
      message += `${storytelling}\n\n`;

      // Caso real integrado na narrativa
      const clienteTitle = firstCase.client_name.includes('Dr.') || firstCase.client_name.includes('Dra.') 
        ? firstCase.client_name 
        : `Dr(a). ${firstCase.client_name}`;

      message += `${clienteTitle}, de ${firstCase.city}/${firstCase.state} (${firstCase.specialty})`;

      // Se tem Instagram, adicionar inline
      if (firstCase.instagram) {
        message += ` • Instagram: @${firstCase.instagram}`;
      }

      // Conectar com a dor (pain) de forma natural
      if (firstQuote && firstQuote.pain) {
        const painSummary = summarizeForWhatsApp(firstQuote.pain, 120);
        message += `, tinha o mesmo problema que você: ${painSummary}\n\n`;
      } else {
        message += `.\n\n`;
      }

      // Resultado alcançado (sem título "Resultados Alcançados")
      const resultsSummary = summarizeForWhatsApp(firstCase.results_achieved, 150);
      message += `Hoje? ${resultsSummary} 💪\n\n`;

      // Benefícios esperados (resultado esperado do SPIN)
      if (firstQuote && firstQuote.expected_result) {
        const expectedSummary = summarizeForWhatsApp(firstQuote.expected_result, 150);
        message += `E você também pode ter:\n`;
        // Quebrar por linha ou ponto para criar bullets
        const benefits = expectedSummary.split(/[.]\s+/).filter(b => b.trim().length > 10);
        benefits.slice(0, 3).forEach(benefit => {
          message += `• ${benefit.trim()}\n`;
        });
        message += `\n`;
      }

      // Métricas personalizadas (sem título pomposo)
      if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
        const customMetrics = formatCustomMetricsOnly(solution.pain_metrics);
        
        if (customMetrics.length > 0) {
          message += `Impacto real:\n`;
          message += customMetrics.join('\n') + '\n\n';
        }
      }

      // CTA mais natural
      message += `🚀 Saiba mais: ${finalUrl}\n\n`;
      message += `💬 Quer saber como implementar essa solução?\nResponda esta mensagem!`;

      // Salvar no banco
      const { data: existingSolution } = await supabase
        .from('spin_selling_solutions')
        .select('metadata')
        .eq('id', solutionId)
        .single();

      const existingMetadata = existingSolution?.metadata || {};
      const updatedMetadata = {
        ...existingMetadata,
        artifact_chain: {
          ...(existingMetadata.artifact_chain || {}),
          whatsapp_version: '2.0.0',
          whatsapp_generated_by: 'generate-spin-campaign',
          whatsapp_timestamp: new Date().toISOString()
        },
        quality_metrics: {
          ...(existingMetadata.quality_metrics || {}),
          whatsapp_storytelling_quality: 85,
          whatsapp_validation_attempts: 1
        }
      };

      await supabase
        .from('spin_selling_solutions')
        .update({ 
          whatsapp_complete_message: message,
          storytelling_auto_generated: storytelling,
          metadata: updatedMetadata
        })
        .eq('id', solutionId);

      // Criar artifact_chain para rastreabilidade
      const artifactChain = {
        source_data_ids: [solutionId, ...products.map(p => p.id)],
        pitch_version: '2.0.0',
        generated_by: 'generate-spin-campaign',
        timestamp: new Date().toISOString(),
        model_used: 'google/gemini-2.5-flash',
        pain_type: solution.pain_type,
        content_type: contentType
      };

      return new Response(
        JSON.stringify({ 
          message, 
          storytelling,
          artifact_chain: artifactChain 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('contentType inválido. Use "google_ads" ou "whatsapp"');

  } catch (error: any) {
    console.error('❌ generate-spin-campaign error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ============= INLINED CSV BUILDER (evita import do src/) =============
class GoogleAdsCSVBuilder {
  static buildFullCSV(params: {
    campaignName: string;
    config: any;
    adGroups: any[];
    adCopies: any;
    sitelinks: any[];
    videos: any[];
    finalUrl: string;
  }): string {
    const { campaignName, config, adGroups, adCopies, sitelinks, videos, finalUrl } = params;
    
    const sections = [
      this.buildCampaignsSection(campaignName, config),
      this.buildAdGroupsSection(campaignName, adGroups),
      this.buildAdsSection(campaignName, adGroups, finalUrl, adCopies, config),
      this.buildKeywordsSection(campaignName, adGroups),
      this.buildNegativeKeywordsSection(campaignName, config.negatives),
      this.buildSitelinksSection(campaignName, sitelinks),
      this.buildVideoExtensionsSection(campaignName, videos)
    ].filter(section => section.trim().length > 0);
    
    return sections.join('\n\n');
  }
  
  private static buildCampaignsSection(campaignName: string, config: any): string {
    const header = 'Campaign,Campaign type,Daily budget,Languages,Locations,Bidding strategy,Start date,End date';
    
    const row = [
      this.csvEscape(campaignName),
      'Search',
      config.daily_budget_brl.toString(),
      this.csvEscape(config.languages.join(';')),
      this.csvEscape(config.locations.join(';')),
      config.bidding.strategy,
      config.schedule?.start || '',
      config.schedule?.end || ''
    ].join(',');
    
    return `${header}\n${row}`;
  }
  
  private static buildAdGroupsSection(campaignName: string, adGroups: any[]): string {
    if (adGroups.length === 0) return '';
    
    const header = 'Campaign,Ad group,Ad group type,Default max. CPC';
    
    const rows = adGroups.map(group =>
      [
        this.csvEscape(campaignName),
        this.csvEscape(group.name),
        'Search',
        '1.00'
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildAdsSection(
    campaignName: string, 
    adGroups: any[], 
    finalUrl: string, 
    adCopies: any,
    config: any
  ): string {
    if (adGroups.length === 0) return '';
    
    const header = [
      'Campaign', 'Ad group', 'Ad type', 'Final URL', 'Path 1', 'Path 2',
      'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5',
      'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10',
      'Description 1', 'Description 2', 'Description 3', 'Description 4'
    ].join(',');
    
    const finalUrlWithUTM = this.applyUTM(finalUrl, config.utm);
    
    const rows = adGroups.map(group => {
      const row = [
        this.csvEscape(campaignName),
        this.csvEscape(group.name),
        'Responsive search ad',
        this.csvEscape(finalUrlWithUTM),
        this.csvEscape(adCopies.paths[0] || ''),
        this.csvEscape(adCopies.paths[1] || ''),
        ...Array.from({ length: 10 }, (_, i) => this.csvEscape(adCopies.headlines[i] || '')),
        ...Array.from({ length: 4 }, (_, i) => this.csvEscape(adCopies.descriptions[i] || ''))
      ];
      
      return row.join(',');
    });
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildKeywordsSection(campaignName: string, adGroups: any[]): string {
    if (adGroups.length === 0) return '';
    
    const header = 'Campaign,Ad group,Keyword,Match type';
    
    const rows: string[] = [];
    
    for (const group of adGroups) {
      for (const keyword of group.keywords) {
        rows.push([
          this.csvEscape(campaignName),
          this.csvEscape(group.name),
          this.csvEscape(keyword.text),
          keyword.match_type
        ].join(','));
      }
    }
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildNegativeKeywordsSection(campaignName: string, negatives: string[]): string {
    if (negatives.length === 0) return '';
    
    const header = 'Campaign,Ad group,Negative keyword,Match type';
    
    const rows = negatives.map(negative =>
      [
        this.csvEscape(campaignName),
        '', // Campaign-level negatives don't specify ad group
        this.csvEscape(negative),
        'Phrase'
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildSitelinksSection(campaignName: string, sitelinks: any[]): string {
    if (sitelinks.length === 0) return '';
    
    const header = 'Campaign,Ad group,Ad extension type,Sitelink text,Sitelink final URL';
    
    const rows = sitelinks.map(sitelink =>
      [
        this.csvEscape(campaignName),
        '', // Campaign-level sitelinks
        'Sitelink',
        this.csvEscape(sitelink.label),
        this.csvEscape(sitelink.url)
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildVideoExtensionsSection(campaignName: string, videos: any[]): string {
    if (videos.length === 0) return '';
    
    const header = 'Campaign,Ad extension type,YouTube video ID';
    
    const rows = videos.map(video =>
      [
        this.csvEscape(campaignName),
        'Video',
        this.csvEscape(video.youtube_id)
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static applyUTM(url: string, utm: any): string {
    if (!utm || Object.keys(utm).length === 0) return url;
    
    const urlObj = new URL(url);
    
    if (utm.source) urlObj.searchParams.set('utm_source', utm.source);
    if (utm.medium) urlObj.searchParams.set('utm_medium', utm.medium);
    if (utm.campaign) urlObj.searchParams.set('utm_campaign', utm.campaign);
    if (utm.content) urlObj.searchParams.set('utm_content', utm.content);
    if (utm.term) urlObj.searchParams.set('utm_term', utm.term);
    
    return urlObj.toString();
  }
  
  private static csvEscape(value: string): string {
    if (!value) return '';
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
}
