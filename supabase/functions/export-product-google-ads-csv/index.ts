import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

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
    const sitelinks = collectProductSitelinks(product, config);
    
    // Collect videos specific to product
    const videos = collectProductVideos(product);

    // Generate ad copies using AI
    const adCopies = await generateProductAdCopies(productData, keywords);

    // Build CSV using the standardized GoogleAdsCSVBuilder
    const finalUrl = applyUTM(product.product_url || 'https://example.com', config.utm);
    const campaignName = `Campaign_${product.name.replace(/\s+/g, '_')}`;
    
    const adGroups = [{
      name: `AG_${product.category || 'Product'}_${product.name}`.replace(/\s+/g, '_'),
      keywords: keywords.map(keyword => ({
        text: keyword,
        match_type: 'BROAD' as const,
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

function collectProductKeywords(product: any, productData: any): string[] {
  const keywords = new Set<string>();
  
  // Product-specific keywords
  keywords.add(product.name);
  if (product.category) keywords.add(product.category);
  if (product.subcategory) keywords.add(product.subcategory);
  
  // Keywords from product configuration
  product.keywords?.forEach((k: string) => keywords.add(k));
  product.market_keywords?.forEach((k: string) => keywords.add(k));
  product.search_intent_keywords?.forEach((k: string) => keywords.add(k));
  
  // Commercial intent keywords
  keywords.add(`comprar ${product.name}`);
  keywords.add(`${product.name} preço`);
  keywords.add(`${product.name} oferta`);
  keywords.add(`melhor ${product.name}`);
  
  if (product.category) {
    keywords.add(`${product.category} ${product.name}`);
    keywords.add(`${product.category} preço`);
  }
  
  return Array.from(keywords).filter(k => k && k.length > 2);
}

function collectProductSitelinks(product: any, config: any) {
  const sitelinks = [];
  
  // Product URL as primary sitelink
  if (product.product_url) {
    sitelinks.push({
      label: `Ver ${product.name}`,
      url: product.product_url
    });
  }
  
  // Category sitelinks
  if (product.category) {
    sitelinks.push({
      label: `Todos ${product.category}`,
      url: `https://example.com/categoria/${product.category.toLowerCase()}`
    });
  }
  
  // Custom institutional links from config
  if (config.custom_institutional_links) {
    sitelinks.push(...config.custom_institutional_links);
  }
  
  // Brand policy links if enabled
  if (config.include_brand_policies) {
    sitelinks.push(
      { label: 'Sobre Nós', url: 'https://example.com/sobre' },
      { label: 'Contato', url: 'https://example.com/contato' },
      { label: 'Garantia', url: 'https://example.com/garantia' }
    );
  }
  
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
    let csv = 'Campaign,Ad Group,Headlines,Descriptions,Paths,Final URL\n';
    
    for (const adGroup of adGroups) {
      if (adCopies.headlines && adCopies.descriptions) {
        const headlines = adCopies.headlines.slice(0, 15).map((h: string) => this.csvEscape(h)).join('|');
        const descriptions = adCopies.descriptions.slice(0, 4).map((d: string) => this.csvEscape(d)).join('|');
        const paths = (adCopies.paths || []).slice(0, 2).map((p: string) => this.csvEscape(p)).join('|');
        
        csv += `${this.csvEscape(campaignName)},${this.csvEscape(adGroup.name)},"${headlines}","${descriptions}","${paths}",${this.csvEscape(finalUrl)}\n`;
      }
    }
    return csv;
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