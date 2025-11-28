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

// ✅ buildGoogleAdsCSV - Row Type Format with COL Constants
function buildGoogleAdsCSV(params: any): string {
  const { campaignName, config, keywords, adCopies, sitelinks, videos, finalUrl } = params;

  function sanitizeText(text: string, maxLength: number): string {
    if (!text || !text.trim()) return '';
    return text
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, maxLength);
  }

  function csvEscape(value: string | number): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // ✅ HEADER COMPLETO com colunas obrigatórias do Google Ads Editor
  const headers = [
    'Row Type',
    'Campaign',
    'Campaign type',      // ✅ OBRIGATÓRIO
    'Campaign status',    // ✅ RECOMENDADO
    'Ad Group',
    'Keyword',
    'Match Type',
    'Final URL',
    'Path 1',
    'Path 2',
    // 15 Headlines
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    // 4 Descriptions
    'Description 1', 'Description 2', 'Description 3', 'Description 4',
    // Sitelinks (nomes corretos do Google Ads)
    'Sitelink text',
    'Final URL (sitelink)',
    // Campaign Config (nomes corretos do Google Ads)
    'Campaign daily budget',
    'Bid strategy type',
    'Location',
    'Languages'
  ];

  // ✅ CONSTANTES COL calculadas dinamicamente
  const COL = {
    ROW_TYPE: 0,
    CAMPAIGN: 1,
    CAMPAIGN_TYPE: 2,
    CAMPAIGN_STATUS: 3,
    AD_GROUP: 4,
    KEYWORD: 5,
    MATCH_TYPE: 6,
    FINAL_URL: 7,
    PATH_1: 8,
    PATH_2: 9,
    HEADLINE_START: 10,      // Headlines: 10-24 (15 headlines)
    DESC_START: 25,           // Descriptions: 25-28 (4 descriptions)
    SITELINK_TEXT: 29,
    SITELINK_URL: 30,
    BUDGET: 31,
    BID_STRATEGY: 32,
    LOCATION: 33,
    LANGUAGES: 34
  };

  const rows: string[][] = [];

  // 1. Campaign Row
  const campaignRow = new Array(35).fill('');
  campaignRow[COL.ROW_TYPE] = 'Campaign';
  campaignRow[COL.CAMPAIGN] = csvEscape(campaignName);
  campaignRow[COL.CAMPAIGN_TYPE] = 'Search';  // ✅ OBRIGATÓRIO
  campaignRow[COL.CAMPAIGN_STATUS] = 'Enabled';  // ✅ RECOMENDADO
  campaignRow[COL.BUDGET] = String(config.daily_budget_brl || 30);
  campaignRow[COL.BID_STRATEGY] = config.bidding?.strategy || 'Maximize conversions';
  campaignRow[COL.LOCATION] = csvEscape(config.locations?.join(';') || 'Brazil');
  campaignRow[COL.LANGUAGES] = csvEscape(config.languages?.join(';') || 'pt');
  rows.push(campaignRow);

  // 2. Ad Group Row
  const adGroupRow = new Array(35).fill('');
  adGroupRow[COL.ROW_TYPE] = 'Ad group';
  adGroupRow[COL.CAMPAIGN] = csvEscape(campaignName);
  adGroupRow[COL.AD_GROUP] = 'Geral';
  rows.push(adGroupRow);

  // 3. Ad Row (RSA)
  const adRow = new Array(35).fill('');
  adRow[COL.ROW_TYPE] = 'Responsive search ad';
  adRow[COL.CAMPAIGN] = csvEscape(campaignName);
  adRow[COL.AD_GROUP] = 'Geral';
  adRow[COL.FINAL_URL] = csvEscape(finalUrl);
  adRow[COL.PATH_1] = csvEscape(sanitizeText(adCopies.paths?.[0] || 'produtos', 15));
  adRow[COL.PATH_2] = csvEscape(sanitizeText(adCopies.paths?.[1] || 'ofertas', 15));

  // ✅ Fallbacks contextualizados
  const fallbackHeadlines = [
    'Qualidade Garantida',
    'Entrega Rápida Brasil',
    'Preço Especial Hoje',
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

  // Headlines (COL.HEADLINE_START até COL.HEADLINE_START + 14)
  for (let i = 0; i < 15; i++) {
    const h = adCopies.headlines?.[i];
    const fallback = fallbackHeadlines[i] || `Headline ${i + 1}`;
    const text = (h && typeof h === 'string' && h.trim()) ? h : fallback;
    adRow[COL.HEADLINE_START + i] = csvEscape(sanitizeText(text, 30));
  }

  // Descriptions (COL.DESC_START até COL.DESC_START + 3)
  for (let i = 0; i < 4; i++) {
    const d = adCopies.descriptions?.[i];
    const fallback = fallbackDescriptions[i] || `Descrição profissional ${i + 1}.`;
    const text = (d && typeof d === 'string' && d.trim()) ? d : fallback;
    adRow[COL.DESC_START + i] = csvEscape(sanitizeText(text, 90));
  }

  rows.push(adRow);

  // 4. Keyword Rows
  for (const keyword of keywords) {
    const keywordRow = new Array(35).fill('');
    keywordRow[COL.ROW_TYPE] = 'Keyword';
    keywordRow[COL.CAMPAIGN] = csvEscape(campaignName);
    keywordRow[COL.AD_GROUP] = 'Geral';
    keywordRow[COL.KEYWORD] = csvEscape(keyword.text);
    keywordRow[COL.MATCH_TYPE] = keyword.match_type || 'PHRASE';
    rows.push(keywordRow);
  }

  // 5. Sitelink Rows
  for (const sitelink of sitelinks.slice(0, 6)) {
    const sitelinkRow = new Array(35).fill('');
    sitelinkRow[COL.ROW_TYPE] = 'Sitelink';
    sitelinkRow[COL.CAMPAIGN] = csvEscape(campaignName);
    sitelinkRow[COL.SITELINK_TEXT] = csvEscape(sitelink.label);
    sitelinkRow[COL.SITELINK_URL] = csvEscape(sitelink.url);
    rows.push(sitelinkRow);
  }

  // Construir CSV
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];

  console.log(`✅ CSV gerado com Row Type format: ${rows.length} linhas, ${headers.length} colunas`);
  return csvLines.join('\n');
}