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
  landingPageData?: any;
  selectedProductIds?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { landingPageId, config, landingPageData, selectedProductIds = [] }: ExportRequest = await req.json();

    console.log('📊 Iniciando export Google Ads CSV:', { landingPageId, config, selectedProductIds });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Collect data from existing tables
    const finalLandingPageData = landingPageData || await collectLandingPageData(supabase, landingPageId);
    const keywords = await collectKeywords(supabase, finalLandingPageData, config, selectedProductIds);
    const sitelinks = await collectSitelinks(finalLandingPageData, config, supabase);
    const videos = await collectVideos(supabase, landingPageId, config);

    // Generate ad copies using AI
    const adCopies = await generateAdCopies(finalLandingPageData, keywords);

    // Build CSV
    const csvData = buildGoogleAdsCSV({
      campaignName: `LP ${finalLandingPageData.name} - Search`,
      config,
      keywords,
      adCopies,
      sitelinks,
      videos,
      finalUrl: finalLandingPageData.canonical_url
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
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function collectLandingPageData(supabase: any, landingPageId: string) {
  try {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', landingPageId)
      .single();

    if (error) throw error;

    return {
      name: data.name || `Landing Page ${landingPageId}`,
      canonical_url: data.data?.seo?.canonical_url || `https://example.com/lp/${landingPageId}`,
      seo_title: data.data?.seo?.title || data.data?.banner?.title || 'SEO Title',
      seo_description: data.data?.seo?.description || data.data?.banner?.subtitle || 'SEO Description',
      ai_keywords: data.data?.seo?.ai_keywords || [],
      faq: data.data?.faq || [],
      intelligent_links: data.data?.intelligent_links || {}
    };
  } catch (error) {
    console.error('Error fetching landing page data:', error);
    return {
      name: `Landing Page ${landingPageId}`,
      canonical_url: `https://example.com/lp/${landingPageId}`,
      seo_title: 'SEO Title Example',
      seo_description: 'SEO Description Example',
      ai_keywords: [],
      faq: [],
      intelligent_links: {}
    };
  }
}

// Função de mapeamento semântico → Google Ads Match Types
function mapKeywordTypeToMatchType(
  keywordType: string | null,
  searchIntent: string | null,
  source: string
): 'BROAD' | 'PHRASE' | 'EXACT' {
  // Prioridade 1: keyword_type explícito
  if (keywordType) {
    switch (keywordType.toLowerCase()) {
      case 'primary':       return 'PHRASE';
      case 'secondary':     return 'PHRASE';
      case 'longtail':      return 'EXACT';
      case 'generic':       return 'BROAD';
      case 'brand':         return 'EXACT';
      case 'exact':         return 'EXACT';
      case 'phrase':        return 'PHRASE';
      case 'broad':         return 'BROAD';
    }
  }
  
  // Prioridade 2: search_intent
  if (searchIntent) {
    switch (searchIntent.toLowerCase()) {
      case 'commercial':    return 'PHRASE';
      case 'transactional': return 'EXACT';
      case 'informational': return 'BROAD';
      case 'navigational':  return 'EXACT';
    }
  }
  
  // Prioridade 3: Baseado na fonte
  switch (source) {
    case 'faq':            return 'PHRASE';
    case 'manual':         return 'EXACT';
    case 'review':         return 'PHRASE';
    case 'ai':             return 'PHRASE';
    case 'product':        return 'PHRASE';
    default:               return 'PHRASE';
  }
}

interface KeywordWithMatchType {
  text: string;
  match_type: 'BROAD' | 'PHRASE' | 'EXACT';
  source: string;
  keyword_type?: string;
}

async function collectKeywords(supabase: any, landingPageData: any, config: any, selectedProductIds: string[] = []): Promise<KeywordWithMatchType[]> {
  let keywords: KeywordWithMatchType[] = [];

  // ✅ PRIORIDADE 1: Buscar keywords do external_links COM keyword_type e search_intent
  try {
    const { data: externalLinks } = await supabase
      .from('external_links')
      .select('name, related_keywords, keyword_type, search_intent, monthly_searches, relevance_score')
      .eq('approved', true)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(100);
    
    if (externalLinks && externalLinks.length > 0) {
      externalLinks.forEach((link: any) => {
        if (link.name && typeof link.name === 'string') {
          keywords.push({
            text: link.name.trim().toLowerCase(),
            match_type: mapKeywordTypeToMatchType(link.keyword_type, link.search_intent, 'external_links'),
            source: 'external_links',
            keyword_type: link.keyword_type
          });
        }
        // related_keywords herdam o mesmo match_type
        if (link.related_keywords && Array.isArray(link.related_keywords)) {
          link.related_keywords
            .filter((k: any) => typeof k === 'string')
            .forEach((k: string) => {
              keywords.push({
                text: k.trim().toLowerCase(),
                match_type: mapKeywordTypeToMatchType(link.keyword_type, link.search_intent, 'external_links'),
                source: 'external_links',
                keyword_type: link.keyword_type
              });
            });
        }
      });
      
      console.log(`✅ ${keywords.length} keywords importadas do repositório com match types`);
    }
  } catch (error) {
    console.error('Error collecting keywords from external_links:', error);
  }

  // AI keywords = PHRASE por padrão
  if (config.include_ai_keywords && landingPageData.ai_keywords) {
    collectFromAI(landingPageData.ai_keywords).forEach(k => {
      keywords.push({ text: k, match_type: 'PHRASE', source: 'ai' });
    });
  }

  // FAQ keywords = PHRASE (perguntas específicas)
  if (config.include_faq_longtail && landingPageData.faq) {
    collectFromFAQ(landingPageData.faq).forEach(k => {
      keywords.push({ text: k, match_type: 'PHRASE', source: 'faq' });
    });
  }

  // Product keywords = PHRASE
  if (selectedProductIds.length > 0) {
    try {
      const { data: products } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', selectedProductIds)
        .eq('approved', true);

      if (products) {
        collectFromProducts(products).forEach(k => {
          keywords.push({ text: k, match_type: 'PHRASE', source: 'product' });
        });
      }
    } catch (error) {
      console.error('Error collecting product keywords:', error);
    }
  }
  
  // Review keywords = PHRASE (linguagem real)
  try {
    const { data: reviews } = await supabase
      .from('approved_reviews')
      .select('contextual_seo_info, raw_review:raw_reviews(review_text)')
      .limit(50);
    
    if (reviews && reviews.length > 0) {
      reviews.forEach((review: any) => {
        const text = review.contextual_seo_info || review.raw_review?.review_text || '';
        const extractedKeywords = text
          .toLowerCase()
          .split(/[.,\s]+/)
          .filter((word: string) => word.length > 4 && !word.match(/^(muito|sempre|nunca|todos|sobre|para|com|sem)$/))
          .slice(0, 10);
        
        extractedKeywords.forEach(k => {
          keywords.push({ text: k, match_type: 'PHRASE', source: 'review' });
        });
      });
      
      console.log(`✅ Keywords extraídas de ${reviews.length} reviews com match type PHRASE`);
    }
  } catch (error) {
    console.error('Error collecting keywords from reviews:', error);
  }

  // Manual keywords = EXACT (usuário escolheu)
  if (config.extra_keywords && Array.isArray(config.extra_keywords)) {
    config.extra_keywords
      .filter((k: any) => typeof k === 'string')
      .forEach((k: string) => {
        keywords.push({ text: k.trim().toLowerCase(), match_type: 'EXACT', source: 'manual' });
      });
  }

  console.log(`📊 Total keywords coletadas antes do filtro: ${keywords.length}`);
  const result = deduplicateKeywords(keywords);
  console.log(`✅ Keywords após deduplicateKeywords (com isValidKeyword): ${result.length}`);
  
  return result;
}

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

function deduplicateKeywords(keywords: KeywordWithMatchType[]): KeywordWithMatchType[] {
  const seen = new Map<string, KeywordWithMatchType>();
  
  for (const keyword of keywords) {
    const key = keyword.text.toLowerCase().trim();
    
    // ✅ FILTRO CRÍTICO: Validar keyword
    if (!isValidKeyword(key)) {
      console.warn(`⚠️ Keyword inválida filtrada: "${key}" (fonte: ${keyword.source || 'desconhecida'})`);
      continue;
    }
    
    if (!seen.has(key)) {
      seen.set(key, keyword);
    }
  }
  
  return Array.from(seen.values());
}

// Helper functions from KeywordCollector
function collectFromAI(aiKeywords: any[] = []): string[] {
  return aiKeywords
    .filter(k => typeof k === 'string' && k.trim().length > 0)
    .map(k => k.trim().toLowerCase())
    .filter(isCommercialKeyword);
}

function collectFromProducts(products: any[] = []): string[] {
  const keywords: string[] = [];
  
  for (const product of products) {
    if (product.keywords && Array.isArray(product.keywords)) {
      keywords.push(...product.keywords);
    }
    if (product.market_keywords && Array.isArray(product.market_keywords)) {
      keywords.push(...product.market_keywords);
    }
    if (product.search_intent_keywords && Array.isArray(product.search_intent_keywords)) {
      keywords.push(...product.search_intent_keywords);
    }
    if (product.category) {
      keywords.push(product.category);
    }
    if (product.subcategory) {
      keywords.push(product.subcategory);
    }
  }
  
  return keywords.filter(k => k && k.trim().length > 0);
}

function collectFromFAQ(faq: Array<{ question: string; answer: string }>): string[] {
  const keywords: string[] = [];
  
  for (const item of faq) {
    if (item.question) {
      const longTailKeywords = extractLongTailFromQuestion(item.question);
      keywords.push(...longTailKeywords);
    }
  }
  
  return keywords;
}

function extractLongTailFromQuestion(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[?!.]/g, '')
    .split(' ')
    .filter(word => word.length > 3)
    .slice(0, 5);
}

function isCommercialKeyword(keyword: string): boolean {
  const commercialTerms = [
    'preço', 'valor', 'custo', 'comprar', 'vender', 'orçamento',
    'promoção', 'desconto', 'oferta', 'melhor', 'qualidade',
    'serviço', 'produto', 'especialista', 'profissional'
  ];
  
  return commercialTerms.some(term => keyword.includes(term));
}


async function collectSitelinks(landingPageData: any, config: any, supabase?: any) {
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
  
  // ✅ PRIORIDADE 3: Adicionar sitelinks de video_testimonials
  if (supabase) {
    try {
      const { data: videoTestimonials } = await supabase
        .from('video_testimonials')
        .select('client_name, youtube_url')
        .eq('approved', true)
        .not('youtube_url', 'is', null)
        .limit(3);
      
      if (videoTestimonials && videoTestimonials.length > 0) {
        videoTestimonials.forEach((vt: any) => {
          sitelinks.push({
            label: `Depoimento: ${vt.client_name}`,
            url: vt.youtube_url
          });
        });
        
        console.log(`✅ ${videoTestimonials.length} sitelinks de depoimentos adicionados`);
      }
    } catch (error) {
      console.error('Error collecting video testimonial sitelinks:', error);
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

// ✅ FASE 3: buildGoogleAdsCSV modernizado (15 headlines + 4 descriptions)
function buildGoogleAdsCSV(params: any): string {
  const { campaignName, config, keywords, adCopies, sitelinks, videos, finalUrl } = params;

  function sanitizeForCSV(text: string, maxLength: number): string {
    if (!text || !text.trim()) return '';
    return text
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, maxLength);
  }

  function csvEscape(value: string): string {
    if (!value) return '';
    const escaped = value.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return escaped;
    }
    return escaped;
  }

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

  // ✅ Garantir fallbacks obrigatórios para 15 headlines + 4 descriptions
  const safeHeadlines = Array.from({ length: 15 }, (_, i) => {
    const h = adCopies.headlines?.[i];
    return csvEscape(sanitizeForCSV((h && h.trim()) ? h : `Headline ${i + 1}`, 30));
  });
  
  const safeDescriptions = Array.from({ length: 4 }, (_, i) => {
    const d = adCopies.descriptions?.[i];
    return csvEscape(sanitizeForCSV((d && d.trim()) ? d : `Descrição profissional ${i + 1}.`, 90));
  });

  const safePaths = [
    csvEscape(sanitizeForCSV(adCopies.paths?.[0] || 'produto', 15)),
    csvEscape(sanitizeForCSV(adCopies.paths?.[1] || 'loja', 15))
  ];

  // Build Ads section com 15 headlines + 4 descriptions
  const adsHeader = [
    'Campaign', 'Ad group', 'Ad type', 'Final URL', 'Path 1', 'Path 2',
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    'Description 1', 'Description 2', 'Description 3', 'Description 4'
  ].join(',');
  
  const adsRow = [
    `"${campaignName}"`,
    '"Geral"',
    '"Responsive search ad"',
    `"${finalUrl}"`,
    safePaths[0],
    safePaths[1],
    ...safeHeadlines,
    ...safeDescriptions
  ].join(',');
  
  const adsSection = `${adsHeader}\n${adsRow}`;

  // Build Keywords section com match types corretos
  const keywordsSection = [
    'Campaign,Ad group,Keyword,Match type',
    ...keywords.map((keyword: KeywordWithMatchType) => `"${campaignName}","Geral","${csvEscape(keyword.text)}",${keyword.match_type}`)
  ].join('\n');

  // Build Sitelinks section
  let sitelinksSection = '';
  if (sitelinks.length > 0) {
    sitelinksSection = [
      'Campaign,Ad extension type,Sitelink text,Sitelink final URL',
      ...sitelinks.map((sitelink: any) => `"${campaignName}",Sitelink,"${sitelink.label}","${sitelink.url}"`)
    ].join('\n');
  }

  // Combine all sections
  const sections = [campaignSection, adGroupSection, adsSection, keywordsSection];
  if (sitelinksSection) sections.push(sitelinksSection);

  return sections.join('\n\n');
}