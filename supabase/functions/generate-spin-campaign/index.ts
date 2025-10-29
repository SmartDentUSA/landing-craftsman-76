import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        throw new Error('Adicione pelo menos 1 caso de sucesso antes de gerar a mensagem');
      }

      const firstCase = successCases[0];
      const firstQuote = realQuotes[0];

      // Gerar storytelling automático usando sales_pitch dos produtos
      const salesPitches = products
        .map(p => p.sales_pitch)
        .filter(sp => sp)
        .join(' ');

      const storytelling = `${solution.title}: ${salesPitches.substring(0, 200)}...`;

      // Construir mensagem WhatsApp
      let message = `*🎯 ${solution.title.toUpperCase()}*\n\n`;

      // Storytelling
      message += `*📖 História de Transformação:*\n${storytelling}\n\n`;

      // Caso Real
      message += `*✅ CASO REAL: ${firstCase.client_name}*\n`;
      message += `📍 ${firstCase.city}/${firstCase.state}\n`;
      message += `🎯 ${firstCase.specialty} - ${firstCase.area}\n`;
      if (firstCase.instagram) {
        message += `📱 Instagram: ${firstCase.instagram}\n`;
      }
      message += `\n*Resultados Alcançados:*\n${firstCase.results_achieved}\n\n`;

      // Jornada SPIN (se existir)
      if (firstQuote) {
        message += `*💬 Jornada do Cliente:*\n`;
        message += `🎯 *Desejo:* ${firstQuote.desire}\n`;
        message += `⚠️ *Dor:* ${firstQuote.pain}\n`;
        message += `✅ *Resultado Esperado:* ${firstQuote.expected_result}\n\n`;
      }

      // Métricas
      if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
        message += `*📊 Métricas de Impacto:*\n`;
        Object.entries(solution.pain_metrics).forEach(([key, value]) => {
          message += `• ${key}: ${value}\n`;
        });
        message += `\n`;
      }

      // CTA
      message += `*🚀 ${ctaLabel.toUpperCase()}:*\n${finalUrl}\n\n`;
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
