import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  landingPageId: string;
  config: any; // GoogleAdsCampaignConfig
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { landingPageId, config }: ExportRequest = await req.json();

    console.log('📊 Iniciando export Google Ads CSV:', { landingPageId, config });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Collect data from existing tables
    const landingPageData = await collectLandingPageData(supabase, landingPageId);
    const keywords = await collectKeywords(supabase, landingPageData, config);
    const sitelinks = await collectSitelinks(landingPageData, config);
    const videos = await collectVideos(supabase, landingPageId, config);

    // Generate ad copies using AI
    const adCopies = await generateAdCopies(landingPageData, keywords);

    // Build CSV
    const csvData = buildGoogleAdsCSV({
      campaignName: `LP ${landingPageData.name} - Search`,
      config,
      keywords,
      adCopies,
      sitelinks,
      videos,
      finalUrl: landingPageData.canonical_url
    });

    // Save configuration to database
    await supabase.from('google_ads_campaigns').upsert({
      landing_page_id: landingPageId,
      config,
      last_exported: new Date().toISOString()
    });

    console.log('✅ CSV gerado com sucesso');

    return new Response(JSON.stringify({ 
      csv: csvData,
      warnings: [] // TODO: Implement validation warnings
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na função export-google-ads-csv:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function collectLandingPageData(supabase: any, landingPageId: string) {
  // This is a placeholder - we need to implement the actual data collection
  // based on your existing landing page structure
  return {
    name: `Landing Page ${landingPageId}`,
    canonical_url: `https://example.com/lp/${landingPageId}`,
    seo_title: 'SEO Title Example',
    seo_description: 'SEO Description Example',
    ai_keywords: ['keyword1', 'keyword2'],
    intelligent_links: {
      'Comprar Produto': 'https://loja.example.com/produto',
      'Catálogo': 'https://loja.example.com/catalogo'
    }
  };
}

async function collectKeywords(supabase: any, landingPageData: any, config: any): Promise<string[]> {
  let keywords: string[] = [];

  // Collect from AI keywords
  if (config.include_ai_keywords && landingPageData.ai_keywords) {
    keywords.push(...landingPageData.ai_keywords);
  }

  // Collect from FAQ (if enabled)
  if (config.include_faq_longtail) {
    // TODO: Fetch FAQ data and extract long-tail keywords
    keywords.push('como funciona', 'qual o preço', 'onde comprar');
  }

  // Add manual keywords
  if (config.extra_keywords) {
    keywords.push(...config.extra_keywords);
  }

  return [...new Set(keywords)]; // Remove duplicates
}

async function collectSitelinks(landingPageData: any, config: any) {
  const sitelinks = [];

  // Add e-commerce links
  if (config.ecommerce_links && config.ecommerce_links.length > 0) {
    sitelinks.push(...config.ecommerce_links);
  } else if (landingPageData.intelligent_links) {
    // Fallback to intelligent_links
    for (const [label, url] of Object.entries(landingPageData.intelligent_links)) {
      sitelinks.push({ label, url });
    }
  }

  // Add brand policy links
  if (config.include_brand_policies) {
    const baseUrl = new URL(landingPageData.canonical_url).origin;
    sitelinks.push(
      { label: 'Sobre Nós', url: `${baseUrl}/sobre` },
      { label: 'Contato', url: `${baseUrl}/contato` },
      { label: 'Privacidade', url: `${baseUrl}/privacidade` }
    );
  }

  return sitelinks.slice(0, 6); // Google Ads limit
}

async function collectVideos(supabase: any, landingPageId: string, config: any) {
  const videos = [];

  // Collect from manual config
  if (config.youtube_videos) {
    videos.push(...config.youtube_videos.map((v: any) => ({
      youtube_id: extractYouTubeId(v.url),
      label: v.label || 'Vídeo'
    })).filter((v: any) => v.youtube_id));
  }

  // Collect from video testimonials
  const { data: testimonials } = await supabase
    .from('video_testimonials')
    .select('youtube_url')
    .eq('landing_page_id', landingPageId)
    .eq('approved', true)
    .not('youtube_url', 'is', null);

  if (testimonials) {
    for (const testimonial of testimonials) {
      const youtubeId = extractYouTubeId(testimonial.youtube_url);
      if (youtubeId) {
        videos.push({ youtube_id: youtubeId, label: 'Depoimento' });
      }
    }
  }

  // Collect from products repository (video collections)
  const { data: products } = await supabase
    .from('products_repository')
    .select('youtube_videos, testimonial_videos, technical_videos, name')
    .eq('source_landing_page_id', landingPageId)
    .eq('approved', true);

  if (products) {
    for (const product of products) {
      // Process YouTube videos
      if (product.youtube_videos && Array.isArray(product.youtube_videos)) {
        product.youtube_videos.forEach((video: any, index: number) => {
          const youtubeId = extractYouTubeId(video.url);
          if (youtubeId) {
            videos.push({ 
              youtube_id: youtubeId, 
              label: `${product.name || 'Produto'} - YouTube ${index + 1}` 
            });
          }
        });
      }

      // Process testimonial videos
      if (product.testimonial_videos && Array.isArray(product.testimonial_videos)) {
        product.testimonial_videos.forEach((video: any, index: number) => {
          const youtubeId = extractYouTubeId(video.url);
          if (youtubeId) {
            videos.push({ 
              youtube_id: youtubeId, 
              label: `${product.name || 'Produto'} - Depoimento ${index + 1}` 
            });
          }
        });
      }

      // Process technical videos
      if (product.technical_videos && Array.isArray(product.technical_videos)) {
        product.technical_videos.forEach((video: any, index: number) => {
          const youtubeId = extractYouTubeId(video.url);
          if (youtubeId) {
            videos.push({ 
              youtube_id: youtubeId, 
              label: `${product.name || 'Produto'} - Técnico ${index + 1}` 
            });
          }
        });
      }
    }
  }

  return videos.slice(0, 20); // Google Ads limit
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

async function generateAdCopies(landingPageData: any, keywords: string[]) {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-ad-copies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        seoTitle: landingPageData.seo_title,
        seoDescription: landingPageData.seo_description,
        primaryKeyword: keywords[0] || 'atendimento'
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Erro ao gerar cópias:', error);
  }

  // Fallback copies
  return {
    headlines: ['Atendimento Especializado', 'Agende sua Consulta', 'Qualidade Garantida'],
    descriptions: ['Atendimento personalizado para suas necessidades.', 'Entre em contato e agende.'],
    paths: ['atendimento', 'consulta']
  };
}

function buildGoogleAdsCSV(params: any): string {
  const { campaignName, config, keywords, adCopies, sitelinks, videos, finalUrl } = params;

  // Build Campaign section
  const campaignSection = [
    'Campaign,Campaign type,Daily budget,Languages,Locations,Bidding strategy',
    `"${campaignName}",Search,${config.daily_budget_brl},"${config.languages.join(';')}","${config.locations.join(';')}",${config.bidding.strategy}`
  ].join('\n');

  // Build Ad Groups section
  const adGroupSection = [
    'Campaign,Ad group,Ad group type,Default max. CPC',
    `"${campaignName}","Geral",Search,1.00`
  ].join('\n');

  // Build Ads section
  const adsSection = [
    'Campaign,Ad group,Ad type,Final URL,Path 1,Path 2,Headline 1,Headline 2,Headline 3,Description 1,Description 2',
    `"${campaignName}","Geral","Responsive search ad","${finalUrl}","${adCopies.paths[0] || ''}","${adCopies.paths[1] || ''}","${adCopies.headlines[0] || ''}","${adCopies.headlines[1] || ''}","${adCopies.headlines[2] || ''}","${adCopies.descriptions[0] || ''}","${adCopies.descriptions[1] || ''}"`
  ].join('\n');

  // Build Keywords section
  const keywordsSection = [
    'Campaign,Ad group,Keyword,Match type',
    ...keywords.map(keyword => `"${campaignName}","Geral","${keyword}",Phrase`)
  ].join('\n');

  // Build Sitelinks section
  let sitelinksSection = '';
  if (sitelinks.length > 0) {
    sitelinksSection = [
      'Campaign,Ad extension type,Sitelink text,Sitelink final URL',
      ...sitelinks.map(sitelink => `"${campaignName}",Sitelink,"${sitelink.label}","${sitelink.url}"`)
    ].join('\n');
  }

  // Combine all sections
  const sections = [campaignSection, adGroupSection, adsSection, keywordsSection];
  if (sitelinksSection) sections.push(sitelinksSection);

  return sections.join('\n\n');
}