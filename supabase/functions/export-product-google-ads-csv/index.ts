import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

// Import SitelinksCollector functionality (copied to avoid module import issues)
class SitelinksCollector {
  static async collectFromCompanyProfile(): Promise<any[]> {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data, error } = await supabase
        .from('company_profile')
        .select('institutional_links, website_url, social_media_links, youtube_channel, instagram_profile')
        .maybeSingle();

      if (error || !data) {
        return [];
      }

      const sitelinks: any[] = [];

      // Add institutional links
      if (data.institutional_links && Array.isArray(data.institutional_links)) {
        data.institutional_links.forEach((link: any) => {
          if (link.label && link.url) {
            sitelinks.push({
              label: this.formatSitelinkLabel(link.label),
              url: this.ensureHttps(link.url)
            });
          }
        });
      }

      // Add main website
      if (data.website_url) {
        sitelinks.push({
          label: 'Website',
          url: this.ensureHttps(data.website_url)
        });
      }

      // Add social media links
      if (data.social_media_links && Array.isArray(data.social_media_links)) {
        data.social_media_links.forEach((social: any) => {
          if (social.platform && social.url) {
            sitelinks.push({
              label: this.formatSitelinkLabel(social.platform),
              url: this.ensureHttps(social.url)
            });
          }
        });
      }

      // Add YouTube channel
      if (data.youtube_channel) {
        sitelinks.push({
          label: 'YouTube',
          url: this.ensureHttps(data.youtube_channel)
        });
      }

      // Add Instagram profile
      if (data.instagram_profile) {
        sitelinks.push({
          label: 'Instagram',
          url: this.ensureHttps(data.instagram_profile)
        });
      }

      return sitelinks.filter(sitelink => this.isValidSitelink(sitelink)).slice(0, 6);
    } catch (error) {
      console.error('Error collecting company sitelinks:', error);
      return [];
    }
  }

  static collectBrandPolicies(baseUrl: string, landingPageUrl?: string): any[] {
    const extractedBaseUrl = this.extractBaseUrl(baseUrl);
    const normalizedLandingUrl = landingPageUrl ? this.normalizeBaseUrl(landingPageUrl) : null;
    
    const brandSitelinks = [
      { 
        label: 'Sobre Nós', 
        path: '/sobre',
        useCampaignPath: true
      },
      { 
        label: 'Contato', 
        path: '/contato',
        useCampaignPath: false
      },
      { 
        label: 'Política de Privacidade', 
        path: '/privacidade',
        useCampaignPath: false
      },
      { 
        label: 'Termos de Uso', 
        path: '/termos',
        useCampaignPath: false
      }
    ];
    
    return brandSitelinks.map(({ label, path, useCampaignPath }) => {
      const baseUrlToUse = useCampaignPath && normalizedLandingUrl ? normalizedLandingUrl : extractedBaseUrl;
      return {
        label,
        url: `${baseUrlToUse}${path}`
      };
    });
  }

  private static extractBaseUrl(url: string): string {
    try {
      const urlObj = new URL(this.ensureHttps(url));
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return this.normalizeBaseUrl(url).split('/').slice(0, 3).join('/');
    }
  }

  private static formatSitelinkLabel(label: string): string {
    let formatted = label
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
    
    if (formatted.length > 25) {
      formatted = formatted.substring(0, 22) + '...';
    }
    
    return formatted;
  }
  
  private static ensureHttps(url: string): string {
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    
    return url;
  }
  
  private static normalizeBaseUrl(url: string): string {
    const httpsUrl = this.ensureHttps(url);
    return httpsUrl.endsWith('/') ? httpsUrl.slice(0, -1) : httpsUrl;
  }
  
  private static isValidSitelink(sitelink: any): boolean {
    try {
      new URL(sitelink.url);
    } catch {
      return false;
    }
    
    return sitelink.label.length > 0 && 
           sitelink.label.length <= 30 && 
           sitelink.url.startsWith('https://');
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, config, productData } = await req.json();
    console.log('📊 Iniciando export Google Ads CSV para produto:', { productId, config: config?.utm });

    if (!productId || !config || !productData) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Produto não encontrado:', { productId, error: productError });
      throw new Error('Product not found');
    }

    console.log('✅ Produto encontrado:', { name: product.name, category: product.category });

    // Collect keywords specific to product
    const keywords = collectProductKeywords(product, productData);
    
    // Collect sitelinks specific to product
    const sitelinks = await collectProductSitelinks(product, config);
    
    // Collect videos specific to product
    const videos = collectProductVideos(product);

    // Generate ad copies using AI
    const adCopies = await generateProductAdCopies(productData, keywords);

    // Build CSV using the standardized GoogleAdsCSVBuilder
    const finalUrl = applyUTM(product.product_url || 'https://example.com', config.utm);
    const campaignName = `Campaign_${product.name.replace(/\s+/g, '_')}`;
    
    const adGroups = [{
      name: `AG_${product.category || 'Product'}_${product.name}`.replace(/\s+/g, '_'),
      keywords: keywords.map(kw => ({
        text: kw.text,
        match_type: kw.match_type,  // ✅ USA MATCH TYPE CALCULADO
        theme: product.category || 'product'
      })),
      theme: product.category || 'product'
    }];

    const csv = GoogleAdsCSVBuilder.buildFullCSV({
      campaignName,
      campaignConfig: config,
      adGroups,
      adCopies,
      sitelinks,
      videos,
      finalUrl
    });

    // Save campaign configuration
    await supabase
      .from('google_ads_campaigns')
      .upsert({
        product_id: productId,
        campaign_type: 'product',
        config,
        last_exported: new Date().toISOString()
      });

    console.log('✅ CSV gerado com sucesso para produto:', product.name);

    return new Response(
      JSON.stringify({ 
        csv,
        warnings: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in export-product-google-ads-csv:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ✅ FASE 1: Filtro de keywords válidas
function isValidKeyword(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  if (text.length < 3 || text.length > 80) return false;
  if (text.includes('://') || text.includes('[object')) return false;
  if (text.startsWith('http') || text.startsWith('/')) return false;
  if (text.includes('.com') || text.includes('.br') || text.includes('.net')) return false;
  if (text.match(/^[\d\s\-\/]+$/)) return false; // Apenas números/símbolos
  return true;
}

function collectProductKeywords(product: any, productData: any): Array<{ text: string, match_type: 'BROAD' | 'PHRASE' | 'EXACT' }> {
  const keywords: Array<{ text: string, match_type: 'BROAD' | 'PHRASE' | 'EXACT' }> = [];
  
  // Product name = PHRASE (controle médio)
  keywords.push({ text: product.name, match_type: 'PHRASE' });
  
  // Category = PHRASE
  if (product.category) keywords.push({ text: product.category, match_type: 'PHRASE' });
  if (product.subcategory) keywords.push({ text: product.subcategory, match_type: 'PHRASE' });
  
  // Keywords from product configuration = PHRASE
  product.keywords?.forEach((k: string) => keywords.push({ text: k, match_type: 'PHRASE' }));
  product.market_keywords?.forEach((k: string) => keywords.push({ text: k, match_type: 'PHRASE' }));
  
  // Search intent keywords = EXACT (alta intenção)
  product.search_intent_keywords?.forEach((k: string) => keywords.push({ text: k, match_type: 'EXACT' }));
  
  // Commercial intent keywords = EXACT (alta intenção de compra)
  keywords.push({ text: `comprar ${product.name}`, match_type: 'EXACT' });
  keywords.push({ text: `${product.name} preço`, match_type: 'PHRASE' });
  keywords.push({ text: `${product.name} oferta`, match_type: 'PHRASE' });
  keywords.push({ text: `melhor ${product.name}`, match_type: 'PHRASE' });
  
  if (product.category) {
    keywords.push({ text: `${product.category} ${product.name}`, match_type: 'PHRASE' });
    keywords.push({ text: `${product.category} preço`, match_type: 'BROAD' });
  }
  
  // Remover duplicatas baseado no text
  const seen = new Map();
  const deduped: Array<{ text: string, match_type: 'BROAD' | 'PHRASE' | 'EXACT' }> = [];
  
  for (const kw of keywords) {
    const key = kw.text.toLowerCase();
    if (!seen.has(key) && kw.text.length > 2) {
      seen.set(key, true);
      deduped.push(kw);
    }
  }
  
  console.log(`📊 Keywords brutas coletadas: ${deduped.length}`);
  
  // ✅ FILTRO FINAL: Remover URLs e keywords inválidas
  const validKeywords = deduped.filter(kw => {
    const valid = isValidKeyword(kw.text);
    if (!valid) {
      console.warn(`⚠️ Keyword produto filtrada: "${kw.text}"`);
    }
    return valid;
  });
  
  console.log(`✅ Keywords válidas após filtro: ${validKeywords.length}`);
  return validKeywords;
}

async function collectProductSitelinks(product: any, config: any) {
  const sitelinks = [];
  
  console.log('🔗 Coletando sitelinks para produto:', product.name);
  
  // Product URL as primary sitelink
  if (product.product_url) {
    sitelinks.push({
      label: `Ver ${product.name}`,
      url: product.product_url
    });
  }
  
  // Collect real company sitelinks
  try {
    const companySitelinks = await SitelinksCollector.collectFromCompanyProfile();
    console.log('✅ Company sitelinks coletados:', companySitelinks.length);
    sitelinks.push(...companySitelinks);
  } catch (error) {
    console.error('❌ Erro ao coletar company sitelinks:', error);
  }
  
  // Custom institutional links from config
  if (config.custom_institutional_links) {
    sitelinks.push(...config.custom_institutional_links);
  }
  
  // Brand policy links if enabled - use real base URL
  if (config.include_brand_policies) {
    try {
      // Get base URL from company profile or use product URL as fallback
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: companyData } = await supabase
        .from('company_profile')
        .select('website_url')
        .maybeSingle();
      
      const baseUrl = companyData?.website_url || product.product_url || 'https://example.com';
      console.log('🌐 Base URL para brand policies:', baseUrl);
      
      const brandSitelinks = SitelinksCollector.collectBrandPolicies(baseUrl);
      sitelinks.push(...brandSitelinks);
    } catch (error) {
      console.error('❌ Erro ao coletar brand policies:', error);
      // Fallback para URLs genéricas apenas em caso de erro
      sitelinks.push(
        { label: 'Sobre Nós', url: 'https://example.com/sobre' },
        { label: 'Contato', url: 'https://example.com/contato' },
        { label: 'Garantia', url: 'https://example.com/garantia' }
      );
    }
  }
  
  console.log('📊 Total sitelinks coletados:', sitelinks.length);
  return sitelinks.slice(0, 6); // Google Ads limit
}

function collectProductVideos(product: any): any[] {
  const videos: any[] = [];
  
  // Technical videos
  if (product.technical_videos?.length) {
    product.technical_videos.forEach((video: any) => {
      if (video.youtube_id) {
        videos.push({
          youtube_id: video.youtube_id,
          label: video.title || 'Vídeo Técnico'
        });
      }
    });
  }
  
  // Testimonial videos
  if (product.testimonial_videos?.length) {
    product.testimonial_videos.forEach((video: any) => {
      if (video.youtube_id) {
        videos.push({
          youtube_id: video.youtube_id,
          label: video.title || 'Depoimento'
        });
      }
    });
  }
  
  // YouTube videos
  if (product.youtube_videos?.length) {
    product.youtube_videos.forEach((video: any) => {
      if (video.youtube_id) {
        videos.push({
          youtube_id: video.youtube_id,
          label: video.title || 'Vídeo do Produto'
        });
      }
    });
  }
  
  return videos.slice(0, 5); // Google Ads video extension limit
}

async function generateProductAdCopies(productData: any, keywords: string[]) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase.functions.invoke('ai-content-generator', {
      body: {
        type: 'google_ads',
        productData,
        keywords
      }
    });

    if (error) throw error;

    if (data?.adCopies) {
      return data.adCopies;
    }
  } catch (error) {
    console.error('AI generation failed, using fallback:', error);
  }

  // Fallback ad copies
  const product = productData.productDetails;
  return {
    headlines: [
      product.name,
      `Comprar ${product.name}`,
      `${product.category || 'Produto'} de Qualidade`,
      `Melhor ${product.name}`,
      `${product.name} em Oferta`
    ],
    descriptions: [
      product.description || `${product.name} com melhor preço e qualidade`,
      product.salesPitch || `Confira nossa linha de ${product.category || 'produtos'}`,
      `Entrega rápida e segura. Compre ${product.name} agora!`
    ],
    paths: [
      product.category?.toLowerCase().replace(/\s+/g, '-') || 'produto',
      product.name.toLowerCase().replace(/\s+/g, '-').substring(0, 15)
    ]
  };
}

// Standardized Google Ads CSV Builder (copied from lib/google-ads/csv-builder.ts)
class GoogleAdsCSVBuilder {
  static buildFullCSV(params: {
    campaignName: string;
    campaignConfig: any;
    adGroups: any[];
    adCopies: any;
    sitelinks: any[];
    videos: any[];
    finalUrl: string;
  }): string {
    const sections = [
      this.buildCampaignsSection(params.campaignName, params.campaignConfig),
      this.buildAdGroupsSection(params.adGroups, params.campaignName),
      this.buildAdsSection(params.adGroups, params.adCopies, params.campaignName, params.finalUrl),
      this.buildKeywordsSection(params.adGroups, params.campaignName),
      this.buildSitelinksSection(params.sitelinks, params.campaignName),
      this.buildVideoExtensionsSection(params.videos, params.campaignName)
    ];

    return sections.filter(section => section.trim()).join('\n\n');
  }

  private static buildCampaignsSection(campaignName: string, config: any): string {
    let csv = 'Campaign,Status,Budget,Bid Strategy,Location,Language\n';
    csv += `${this.csvEscape(campaignName)},Active,${config.daily_budget_brl || 30},${config.bidding?.strategy || 'MAX_CONV'},"${config.locations?.join(', ') || 'Brazil'}","${config.languages?.join(', ') || 'pt-BR'}"\n`;
    return csv;
  }

  private static buildAdGroupsSection(adGroups: any[], campaignName: string): string {
    let csv = 'Campaign,Ad Group,Status\n';
    for (const adGroup of adGroups) {
      csv += `${this.csvEscape(campaignName)},${this.csvEscape(adGroup.name)},Active\n`;
    }
    return csv;
  }

  private static buildAdsSection(adGroups: any[], adCopies: any, campaignName: string, finalUrl: string): string {
    let csv = 'Campaign,Ad Group,Ad Type,Final URL,Path 1,Path 2,Headline 1,Headline 2,Headline 3,Headline 4,Headline 5,Headline 6,Headline 7,Headline 8,Headline 9,Headline 10,Headline 11,Headline 12,Headline 13,Headline 14,Headline 15,Description 1,Description 2,Description 3,Description 4\n';
    
    // ✅ FALLBACKS OBRIGATÓRIOS: Garantir 15 headlines e 4 descriptions antes de construir CSV
    const fallbackHeadlines = [
      'Qualidade Garantida',
      'Entrega Rápida',
      'Preço Especial',
      'Confira Agora',
      'Frete Grátis',
      'Atendimento 24h',
      'Parcelamos 12x',
      'Loja Oficial',
      'Top de Vendas',
      'Novidade 2025',
      'Ofertas Exclusivas',
      'Compre Agora',
      'Melhor Preço',
      'Satisfação Total',
      'Garanta o Seu'
    ];

    const fallbackDescriptions = [
      'Qualidade garantida. Entrega para todo o Brasil.',
      'Atendimento especializado. Solicite seu orçamento.',
      'Compre com segurança. Parcelamos em até 12x.',
      'Produtos de alta qualidade. Satisfação garantida.'
    ];

    const fallbackPaths = ['produtos', 'ofertas'];

    for (const adGroup of adGroups) {
      // ✅ GARANTIR 15 HEADLINES COM FALLBACK
      const safeHeadlines = Array.from({ length: 15 }, (_, i) => {
        const h = adCopies.headlines?.[i];
        const fallback = fallbackHeadlines[i] || `Headline ${i + 1}`;
        const text = (h && typeof h === 'string' && h.trim()) ? h : fallback;
        return this.csvEscape(this.sanitizeForCSV(text, 30));
      });

      // ✅ GARANTIR 4 DESCRIPTIONS COM FALLBACK
      const safeDescriptions = Array.from({ length: 4 }, (_, i) => {
        const d = adCopies.descriptions?.[i];
        const fallback = fallbackDescriptions[i] || `Descrição ${i + 1}.`;
        const text = (d && typeof d === 'string' && d.trim()) ? d : fallback;
        return this.csvEscape(this.sanitizeForCSV(text, 90));
      });

      // ✅ GARANTIR 2 PATHS COM FALLBACK
      const safePaths = Array.from({ length: 2 }, (_, i) => {
        const p = adCopies.paths?.[i];
        const fallback = fallbackPaths[i] || `path${i + 1}`;
        const text = (p && typeof p === 'string' && p.trim()) ? p : fallback;
        return this.csvEscape(this.sanitizeForCSV(text, 15));
      });
      
      csv += `${this.csvEscape(campaignName)},${this.csvEscape(adGroup.name)},Responsive Search Ad,${this.csvEscape(finalUrl)},${safePaths[0]},${safePaths[1]},${safeHeadlines.join(',')},${safeDescriptions.join(',')}\n`;
    }
    return csv;
  }

  private static sanitizeForCSV(text: string, maxLength: number): string {
    if (!text) return '';
    return text
      .replace(/\n/g, ' ')        // ✅ Remove quebras de linha
      .replace(/\r/g, '')         // ✅ Remove carriage returns
      .replace(/\s+/g, ' ')       // ✅ Múltiplos espaços → um
      .trim()
      .substring(0, maxLength);
  }

  private static buildKeywordsSection(adGroups: any[], campaignName: string): string {
    let csv = 'Campaign,Ad Group,Keyword,Match Type\n';
    for (const adGroup of adGroups) {
      for (const keyword of adGroup.keywords) {
        csv += `${this.csvEscape(campaignName)},${this.csvEscape(adGroup.name)},${this.csvEscape(keyword.text)},${keyword.match_type}\n`;
      }
    }
    return csv;
  }

  private static buildSitelinksSection(sitelinks: any[], campaignName: string): string {
    if (!sitelinks.length) return '';
    
    let csv = 'Campaign,Sitelink Text,Sitelink URL\n';
    for (const sitelink of sitelinks.slice(0, 6)) {
      csv += `${this.csvEscape(campaignName)},${this.csvEscape(sitelink.label)},${this.csvEscape(sitelink.url)}\n`;
    }
    return csv;
  }

  private static buildVideoExtensionsSection(videos: any[], campaignName: string): string {
    if (!videos.length) return '';
    
    let csv = 'Campaign,Video Extension,YouTube Video ID\n';
    for (const video of videos.slice(0, 5)) {
      csv += `${this.csvEscape(campaignName)},${this.csvEscape(video.label || 'Video')},${this.csvEscape(video.youtube_id)}\n`;
    }
    return csv;
  }

  private static csvEscape(value: string): string {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

function applyUTM(url: string, utm: any): string {
  if (!utm || !url) return url;
  
  const urlObj = new URL(url);
  if (utm.source) urlObj.searchParams.set('utm_source', utm.source);
  if (utm.medium) urlObj.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) urlObj.searchParams.set('utm_campaign', utm.campaign);
  if (utm.content) urlObj.searchParams.set('utm_content', utm.content);
  if (utm.term) urlObj.searchParams.set('utm_term', utm.term);
  
  return urlObj.toString();
}