import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
      .single();

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

      return new Response(
        JSON.stringify({ csv, campaign }),
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

      // ✅ GERAR STORYTELLING COM IA REAL (Lovable AI Gateway)
      let storytelling = '';

      try {
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (!lovableApiKey) {
          throw new Error('LOVABLE_API_KEY não configurada');
        }

        const prompt = `Você é um copywriter especializado em vendas SPIN. Crie um storytelling persuasivo (máx 200 caracteres) para WhatsApp sobre:

SOLUÇÃO: ${solution.title}
PITCH COMERCIAL: ${solution.sales_pitch || 'Não fornecido'}
PRODUTOS: ${products.map(p => p.name).join(', ')}
DESCRIÇÕES: ${products.map(p => p.description).join(' | ')}
BENEFÍCIOS: ${products.flatMap(p => p.benefits || []).join(', ')}

O storytelling deve:
- Começar com um gancho emocional
- Conectar problemas reais à solução
- Usar linguagem conversacional
- Integrar informações do pitch comercial quando relevante
- Ter no máximo 200 caracteres`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.7
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI API error: ${errorText}`);
        }

        const aiData = await aiResponse.json();
        storytelling = aiData.choices[0].message.content.trim();
        
        console.log('✅ Storytelling gerado com IA:', storytelling);
      } catch (error) {
        console.error('⚠️ Falha na IA, usando fallback:', error);
        // Fallback se IA falhar
        storytelling = `${solution.title}: ${products.map(p => p.description).join('. ').substring(0, 150)}...`;
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

      let message = `*🎯 ${solution.title.toUpperCase()}*\n\n`;

      // Storytelling IA
      message += `*📖 História de Transformação:*\n${storytelling}\n\n`;

      // Caso Real
      message += `*✅ CASO REAL: ${firstCase.client_name}*\n`;
      message += `📍 ${firstCase.city}/${firstCase.state}\n`;
      message += `🎯 ${firstCase.specialty} - ${firstCase.area}\n`;
      if (firstCase.instagram) {
        message += `📱 Instagram: @${firstCase.instagram}\n`;
      }
      message += `\n*Resultados Alcançados:*\n${firstCase.results_achieved}\n\n`;

      // Jornada SPIN (personalizada)
      if (firstQuote) {
        message += `*${sectionTitles.journey_title}*\n`;
        if (sectionTitles.journey_subtitle) {
          message += `${sectionTitles.journey_subtitle}\n`;
        }
        message += `${journeyLabels.desire_label} ${firstQuote.desire}\n`;
        message += `${journeyLabels.pain_label} ${firstQuote.pain}\n`;
        message += `${journeyLabels.result_label} ${firstQuote.expected_result}\n\n`;
      }

      // Métricas (humanizadas e ordenadas)
      if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
        message += `*${sectionTitles.metrics_title}*\n`;
        if (sectionTitles.metrics_subtitle) {
          message += `${sectionTitles.metrics_subtitle}\n`;
        }
        const metricLines = formatPainMetrics(solution.pain_metrics);
        message += metricLines.join('\n') + '\n\n';
      }

      // CTA
      message += `*🚀 SAIBA MAIS:*\n${finalUrl}\n\n`;
      message += `*💬 Quer saber como implementar essa solução?*\nResponda esta mensagem!`;

      // Salvar no banco
      await supabase
        .from('spin_selling_solutions')
        .update({ 
          whatsapp_complete_message: message,
          storytelling_auto_generated: storytelling
        })
        .eq('id', solutionId);

      return new Response(
        JSON.stringify({ message, storytelling }),
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
