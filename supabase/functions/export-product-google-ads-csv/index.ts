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
      throw new Error('Product not found');
    }

    // Collect keywords specific to product
    const keywords = collectProductKeywords(product, productData);
    
    // Collect sitelinks specific to product
    const sitelinks = collectProductSitelinks(product, config);
    
    // Collect videos specific to product
    const videos = collectProductVideos(product);

    // Generate ad copies using AI
    const adCopies = await generateProductAdCopies(productData, keywords);

    // Build CSV for Google Ads Editor
    const finalUrl = product.product_url || 'https://example.com';
    const csv = buildGoogleAdsCSV({
      campaignName: `Campaign_${product.name.replace(/\s+/g, '_')}`,
      campaignConfig: config,
      adGroups: [{
        name: `AG_${product.category || 'Product'}_${product.name}`.replace(/\s+/g, '_'),
        keywords: keywords.map(keyword => ({
          text: keyword,
          match_type: 'BROAD',
          theme: product.category || 'product'
        })),
        theme: product.category || 'product'
      }],
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

// Simple CSV builder for product campaigns
function buildGoogleAdsCSV(params: any): string {
  const { campaignName, campaignConfig, adGroups, adCopies, sitelinks, videos, finalUrl } = params;
  
  let csv = '';
  
  // Campaign section
  csv += `Campaign,Ad Group,Keyword,Match Type,Max CPC,Ad Title,Description Line 1,Description Line 2,Display URL,Final URL,Sitelink,Sitelink URL,Video URL\n`;
  
  // Add campaign data
  for (const adGroup of adGroups) {
    for (const keyword of adGroup.keywords) {
      // Add keyword row
      csv += `${campaignName},${adGroup.name},${csvEscape(keyword.text)},${keyword.match_type},,,,,${csvEscape(finalUrl)},${csvEscape(finalUrl)},,\n`;
    }
    
    // Add ad copies
    if (adCopies.headlines && adCopies.descriptions) {
      for (let i = 0; i < Math.min(adCopies.headlines.length, 3); i++) {
        for (let j = 0; j < Math.min(adCopies.descriptions.length, 2); j++) {
          csv += `${campaignName},${adGroup.name},,,,${csvEscape(adCopies.headlines[i] || '')},${csvEscape(adCopies.descriptions[j] || '')},${csvEscape(adCopies.descriptions[j+1] || '')},${csvEscape(finalUrl)},${csvEscape(finalUrl)},,\n`;
        }
      }
    }
    
    // Add sitelinks
    for (const sitelink of sitelinks.slice(0, 6)) {
      csv += `${campaignName},${adGroup.name},,,,,,,,${csvEscape(finalUrl)},${csvEscape(sitelink.label)},${csvEscape(sitelink.url)},\n`;
    }
  }
  
  return csv;
}

function csvEscape(value: string): string {
  if (!value) return '';
  
  // Convert to string and handle quotes/commas/newlines
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}