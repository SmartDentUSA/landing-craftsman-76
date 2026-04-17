import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { isValidKeyword as sharedIsValidKeyword, filterKeywordsWithSamples } from '../_shared/keyword-validators.ts';
import { normalize } from '../_shared/text-utils.ts';

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
    const adCopies = await generateAdCopies(finalLandingPageData, keywords.map(k => k.text));

    // ✅ NOVO: Criar múltiplos Ad Groups por intenção
    const adGroups = createSmartAdGroups(keywords, finalLandingPageData.name);
    
    // Build CSV with multiple Ad Groups
    const csvData = buildGoogleAdsCSV({
      campaignName: `Campaign_${finalLandingPageData.name.replace(/\s+/g, '_')}`,
      config,
      adGroups, // ✅ NOVO: Passar Ad Groups em vez de keywords
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

    // Gerar estatísticas do CSV
    const stats = {
      adGroupsCount: adGroups.length,
      totalKeywords: keywords.length,
      matchTypeDistribution: {
        exact: keywords.filter(k => k.match_type === 'EXACT').length,
        phrase: keywords.filter(k => k.match_type === 'PHRASE').length,
        broad: keywords.filter(k => k.match_type === 'BROAD').length
      }
    };
    
    console.log('✅ CSV gerado com sucesso:', stats);

    return new Response(JSON.stringify({ 
      csv: csvData,
      stats,
      warnings: []
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
  search_intent?: 'commercial' | 'informational' | 'product' | 'general';
}

interface AdGroup {
  name: string;
  theme: 'commercial' | 'informational' | 'product' | 'general';
  keywords: KeywordWithMatchType[];
}

// ✅ NOVO: Lista padrão de keywords negativas
const DEFAULT_NEGATIVE_KEYWORDS = [
  'usada', 'usado', 'olx', 'mercado livre', 'ml',
  'caseira', 'caseiro', 'grátis', 'gratuito', 'free',
  'como fazer', 'diy', 'pdf', 'download',
  'curso', 'tutorial', 'emprego', 'vaga',
  'reclamação', 'reclamar', 'problema',
  'defeito', 'quebrado', 'conserto', 'reparo'
];

// ✅ NOVO: Gerar variações curtas de keywords
function generateShortKeywordVariations(productName: string, category?: string): KeywordWithMatchType[] {
  const shortVariations: KeywordWithMatchType[] = [];
  if (!productName) return shortVariations;
  
  const words = productName.split(/\s+/).filter(w => w.length > 2);
  
  // Variação 1: Apenas marca + modelo (máx 3 palavras)
  if (words.length >= 2) {
    const shortName = words.slice(0, 3).join(' ').toLowerCase();
    shortVariations.push({
      text: shortName,
      match_type: 'PHRASE',
      source: 'short_variation',
      search_intent: 'product'
    });
  }
  
  // Variação 2: "preço [produto curto]"
  if (words.length >= 2) {
    const priceVariation = `preço ${words.slice(0, 2).join(' ')}`.toLowerCase();
    if (priceVariation.length <= 50) {
      shortVariations.push({
        text: priceVariation,
        match_type: 'PHRASE',
        source: 'short_variation',
        search_intent: 'commercial'
      });
    }
  }
  
  // Variação 3: "[categoria] [marca]" genérico
  if (category && words.length >= 1) {
    const categoryVariation = `${category} ${words[0]}`.toLowerCase();
    if (categoryVariation.length <= 50) {
      shortVariations.push({
        text: categoryVariation,
        match_type: 'PHRASE',
        source: 'short_variation',
        search_intent: 'product'
      });
    }
  }
  
  // Variação 4: Apenas marca principal
  if (words.length >= 1) {
    shortVariations.push({
      text: words[0].toLowerCase(),
      match_type: 'BROAD',
      source: 'short_variation',
      search_intent: 'product'
    });
  }
  
  console.log(`✅ ${shortVariations.length} variações curtas geradas para "${productName}"`);
  return shortVariations;
}

// ✅ NOVO: Detectar intenção de busca da keyword
function detectSearchIntent(keyword: string): 'commercial' | 'informational' | 'product' | 'general' {
  const commercialTerms = ['comprar', 'preço', 'valor', 'custo', 'oferta', 'promoção', 'desconto', 'loja', 'venda', 'onde comprar', 'melhor preço'];
  const informationalTerms = ['como', 'o que é', 'qual', 'porque', 'quando', 'para que serve', 'benefícios', 'vantagens', 'diferença'];
  
  const lowerKeyword = keyword.toLowerCase();
  
  if (commercialTerms.some(term => lowerKeyword.includes(term))) {
    return 'commercial';
  }
  if (informationalTerms.some(term => lowerKeyword.includes(term))) {
    return 'informational';
  }
  
  // Keywords de produto: contém nome de marca/modelo específico
  if (/rayshape|medit|3shape|exocad|scanner|impressora/i.test(keyword)) {
    return 'product';
  }
  
  return 'general';
}

// ✅ NOVO: Criar múltiplos Ad Groups por intenção
function createSmartAdGroups(keywords: KeywordWithMatchType[], productName: string): AdGroup[] {
  const sanitizedName = productName.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 30);
  
  const adGroups: AdGroup[] = [
    {
      name: `AG_COMERCIAL_${sanitizedName}`.replace(/\s+/g, '_'),
      theme: 'commercial' as const,
      keywords: keywords.filter(k => k.search_intent === 'commercial')
    },
    {
      name: `AG_INFORMACIONAL_${sanitizedName}`.replace(/\s+/g, '_'),
      theme: 'informational' as const,
      keywords: keywords.filter(k => k.search_intent === 'informational')
    },
    {
      name: `AG_PRODUTO_${sanitizedName}`.replace(/\s+/g, '_'),
      theme: 'product' as const,
      keywords: keywords.filter(k => k.search_intent === 'product')
    }
  ].filter(ag => ag.keywords.length > 0);
  
  // Se nenhum grupo foi criado, criar um grupo geral
  if (adGroups.length === 0) {
    adGroups.push({
      name: `AG_GERAL_${sanitizedName}`.replace(/\s+/g, '_'),
      theme: 'general' as const,
      keywords: keywords
    });
  }
  
  console.log(`✅ ${adGroups.length} Ad Groups criados:`, adGroups.map(ag => `${ag.name} (${ag.keywords.length} keywords)`));
  
  return adGroups;
}

// ✅ v3: Match type adaptativo ao budget diário
function getMatchTypeRatio(dailyBudgetBRL: number): { EXACT: number; PHRASE: number; BROAD: number } {
  if (!dailyBudgetBRL || dailyBudgetBRL < 300) return { EXACT: 0.80, PHRASE: 0.20, BROAD: 0 };
  if (dailyBudgetBRL < 1000) return { EXACT: 0.50, PHRASE: 0.40, BROAD: 0.10 };
  return { EXACT: 0.30, PHRASE: 0.50, BROAD: 0.20 };
}

// ✅ v3: Balancear match types em função do budget
function balanceMatchTypes(keywords: KeywordWithMatchType[], dailyBudgetBRL: number = 50): KeywordWithMatchType[] {
  const ratio = getMatchTypeRatio(dailyBudgetBRL);
  const totalKeywords = keywords.length;
  const targetExact = Math.ceil(totalKeywords * ratio.EXACT);
  const targetBroad = Math.ceil(totalKeywords * ratio.BROAD);

  if (ratio.BROAD === 0) {
    console.warn(`[MatchType] Budget R$${dailyBudgetBRL}/dia: BROAD desabilitado (insuficiente para volume).`);
  }

  let exactCount = 0;
  let broadCount = 0;

  return keywords.map(k => {
    if (k.source === 'manual' || k.keyword_type === 'brand') return k;

    if (k.keyword_type === 'longtail' || k.text.split(' ').length >= 4) {
      return { ...k, match_type: 'EXACT' };
    }

    if (k.search_intent === 'commercial' && exactCount < targetExact) {
      exactCount++;
      return { ...k, match_type: 'EXACT' };
    }

    if (k.search_intent === 'informational' && ratio.BROAD > 0 && broadCount < targetBroad) {
      broadCount++;
      return { ...k, match_type: 'BROAD' };
    }

    // Fallback PHRASE quando BROAD está bloqueado
    return { ...k, match_type: ratio.BROAD === 0 ? 'PHRASE' : k.match_type };
  });
}

// ✅ NOVO: Expandir keywords com variações
function expandKeywords(baseKeywords: KeywordWithMatchType[], productName: string, category?: string): KeywordWithMatchType[] {
  const expanded: KeywordWithMatchType[] = [...baseKeywords];
  const existingTexts = new Set(baseKeywords.map(k => k.text.toLowerCase()));
  
  // Gerar variações comerciais
  const commercialPrefixes = ['comprar', 'preço', 'onde comprar', 'melhor'];
  const commercialSuffixes = ['oferta', 'promoção', 'preço baixo'];
  
  // Adicionar variações de produto
  if (productName && !existingTexts.has(productName.toLowerCase())) {
    expanded.push({
      text: productName.toLowerCase(),
      match_type: 'EXACT',
      source: 'expanded',
      search_intent: 'product'
    });
    
    // Variações comerciais do produto
    commercialPrefixes.forEach(prefix => {
      const variation = `${prefix} ${productName}`.toLowerCase();
      if (!existingTexts.has(variation) && variation.length <= 80) {
        expanded.push({
          text: variation,
          match_type: 'PHRASE',
          source: 'expanded',
          search_intent: 'commercial'
        });
        existingTexts.add(variation);
      }
    });
  }
  
  // Adicionar variações de categoria
  if (category && !existingTexts.has(category.toLowerCase())) {
    expanded.push({
      text: category.toLowerCase(),
      match_type: 'BROAD',
      source: 'expanded',
      search_intent: 'informational'
    });
    
    commercialPrefixes.slice(0, 2).forEach(prefix => {
      const variation = `${prefix} ${category}`.toLowerCase();
      if (!existingTexts.has(variation) && variation.length <= 80) {
        expanded.push({
          text: variation,
          match_type: 'PHRASE',
          source: 'expanded',
          search_intent: 'commercial'
        });
        existingTexts.add(variation);
      }
    });
  }
  
  console.log(`✅ Keywords expandidas: ${baseKeywords.length} → ${expanded.length}`);
  return expanded;
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
          const text = link.name.trim().toLowerCase();
          keywords.push({
            text,
            match_type: mapKeywordTypeToMatchType(link.keyword_type, link.search_intent, 'external_links'),
            source: 'external_links',
            keyword_type: link.keyword_type,
            search_intent: detectSearchIntent(text)
          });
        }
        // related_keywords herdam o mesmo match_type
        if (link.related_keywords && Array.isArray(link.related_keywords)) {
          link.related_keywords
            .filter((k: any) => typeof k === 'string')
            .forEach((k: string) => {
              const text = k.trim().toLowerCase();
              keywords.push({
                text,
                match_type: mapKeywordTypeToMatchType(link.keyword_type, link.search_intent, 'external_links'),
                source: 'external_links',
                keyword_type: link.keyword_type,
                search_intent: detectSearchIntent(text)
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
      keywords.push({ 
        text: k, 
        match_type: 'PHRASE', 
        source: 'ai',
        search_intent: detectSearchIntent(k)
      });
    });
  }

  // FAQ keywords = PHRASE (perguntas específicas)
  if (config.include_faq_longtail && landingPageData.faq) {
    collectFromFAQ(landingPageData.faq).forEach(k => {
      keywords.push({ 
        text: k, 
        match_type: 'PHRASE', 
        source: 'faq',
        search_intent: 'informational'
      });
    });
  }

  // Product keywords = PHRASE
  let productName = '';
  let productCategory = '';
  if (selectedProductIds.length > 0) {
    try {
      const { data: products } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', selectedProductIds)
        .eq('approved', true);

      if (products && products.length > 0) {
        productName = products[0].name || '';
        productCategory = products[0].category || '';
        
        collectFromProducts(products).forEach(k => {
          keywords.push({ 
            text: k, 
            match_type: 'PHRASE', 
            source: 'product',
            search_intent: detectSearchIntent(k)
          });
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
        
        extractedKeywords.forEach((k: string) => {
          keywords.push({ 
            text: k, 
            match_type: 'PHRASE', 
            source: 'review',
            search_intent: 'general'
          });
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
        keywords.push({ 
          text: k.trim().toLowerCase(), 
          match_type: 'EXACT', 
          source: 'manual',
          search_intent: detectSearchIntent(k)
        });
      });
  }

  console.log(`📊 Total keywords coletadas antes do filtro: ${keywords.length}`);
  
  // Deduplicate e validar
  let result = deduplicateKeywords(keywords);
  
  // ✅ NOVO: Expandir keywords
  const lpName = landingPageData.name || productName || '';
  result = expandKeywords(result, lpName, productCategory);
  
  // ✅ NOVO: Adicionar variações curtas para evitar volume baixo
  const shortVariations = generateShortKeywordVariations(lpName, productCategory);
  const existingTexts = new Set(result.map(k => k.text.toLowerCase()));
  shortVariations.forEach(sv => {
    if (!existingTexts.has(sv.text)) {
      result.push(sv);
      existingTexts.add(sv.text);
    }
  });
  
  // ✅ v3: Balancear match types em função do budget
  result = balanceMatchTypes(result, config?.daily_budget_brl ?? 50);
  
  // ✅ NOVO: Mesclar negativas padrão com negativas do usuário
  const userNegatives = config.negatives || [];
  const allNegatives = [...new Set([...DEFAULT_NEGATIVE_KEYWORDS, ...userNegatives])];
  config.negatives = allNegatives;
  console.log(`✅ ${allNegatives.length} keywords negativas configuradas (${DEFAULT_NEGATIVE_KEYWORDS.length} padrão + ${userNegatives.length} customizadas)`);
  
  console.log(`✅ Keywords após processamento completo: ${result.length}`);
  
  return result;
}

// ✅ Função para sanitizar keywords - remove caracteres especiais
function sanitizeKeyword(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[%!*.,;:()[\]{}@#$&+=<>|\\/"'`~^]/g, ' ')  // Remove caracteres especiais
    .replace(/\s+/g, ' ')                                  // Múltiplos espaços → um
    .trim()                                                // Remove espaços início/fim
    .replace(/[,;.!?]+$/g, '');                            // Remove pontuação final
}

// ✅ v3: isValidKeyword agora vive em _shared/keyword-validators.ts
// (mantida re-export local apenas para compatibilidade interna)

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

// ✅ Função de classificação de headlines para pinning
function classifyHeadline(headline: string): 'product' | 'technical' | 'benefit' | 'cta' | 'offer' | 'general' {
  const lowerHeadline = headline.toLowerCase();
  
  // CTAs e Ofertas (prioridade para posição 3)
  const ctaTerms = ['compre', 'agende', 'confira', 'saiba', 'garanta', 'aproveite', 'clique', 'agora', 'já'];
  const offerTerms = ['desconto', 'oferta', 'promoção', 'grátis', 'frete', 'parcel', 'preço', '12x', 'exclusiv'];
  
  if (ctaTerms.some(term => lowerHeadline.includes(term))) return 'cta';
  if (offerTerms.some(term => lowerHeadline.includes(term))) return 'offer';
  
  // Técnicos (prioridade para posição 2)
  const technicalTerms = ['4k', '3d', 'digital', 'tecnologia', 'precisão', 'alta', 'scanner', 'resolução', 'qualidade'];
  if (technicalTerms.some(term => lowerHeadline.includes(term))) return 'technical';
  
  // Benefícios
  const benefitTerms = ['melhor', 'ideal', 'perfeito', 'solução', 'resultado', 'rápid', 'fácil', 'profissional'];
  if (benefitTerms.some(term => lowerHeadline.includes(term))) return 'benefit';
  
  // Produto/Categoria (prioridade para posição 1) - geralmente são os primeiros
  const productTerms = ['impressora', 'scanner', 'rayshape', 'medit', 'odontolog', 'dental', 'clínica', 'consultório'];
  if (productTerms.some(term => lowerHeadline.includes(term))) return 'product';
  
  return 'general';
}

// ✅ Determinar posição de pinning inteligente
function determinePinningPosition(headlines: string[]): Record<number, number> {
  const pinning: Record<number, number> = {};
  
  // Analisar todos os headlines para encontrar os melhores para cada posição
  const classified = headlines.map((h, i) => ({ index: i, text: h, type: classifyHeadline(h) }));
  
  // Posição 1: Produto/Categoria (máximo relevância com a busca)
  const productHeadlines = classified.filter(h => h.type === 'product');
  if (productHeadlines.length > 0) {
    pinning[productHeadlines[0].index] = 1;
    if (productHeadlines.length > 1) {
      pinning[productHeadlines[1].index] = 1; // Alternativa na posição 1
    }
  } else {
    // Fallback: usar primeiro headline para posição 1
    pinning[0] = 1;
  }
  
  // Posição 2: Técnico/Diferencial
  const technicalHeadlines = classified.filter(h => h.type === 'technical');
  if (technicalHeadlines.length > 0) {
    pinning[technicalHeadlines[0].index] = 2;
  }
  
  // Posição 3: CTA ou Oferta
  const ctaHeadlines = classified.filter(h => h.type === 'cta' || h.type === 'offer');
  if (ctaHeadlines.length > 0) {
    pinning[ctaHeadlines[0].index] = 3;
    if (ctaHeadlines.length > 1) {
      pinning[ctaHeadlines[1].index] = 3; // Alternativa na posição 3
    }
  }
  
  console.log('📌 Pinning strategy:', Object.entries(pinning).map(([i, pos]) => 
    `H${parseInt(i) + 1} → Pos ${pos}`
  ).join(', '));
  
  return pinning;
}

// ✅ buildGoogleAdsCSV - Row Type Format with Multiple Ad Groups + PINNING
function buildGoogleAdsCSV(params: any): string {
  const { campaignName, config, adGroups, adCopies, sitelinks, videos, finalUrl } = params;

  function sanitizeText(text: string, maxLength: number): string {
    if (!text || !text.trim()) return '';
    return text
      .replace(/<[^>]*>/g, ' ')       // Remove tags HTML
      .replace(/&nbsp;/gi, ' ')        // Remove &nbsp;
      .replace(/&amp;/gi, '&')         // Decodifica &amp;
      .replace(/&lt;/gi, '<')          // Decodifica &lt;
      .replace(/&gt;/gi, '>')          // Decodifica &gt;
      .replace(/&quot;/gi, '"')        // Decodifica &quot;
      .replace(/&#39;/gi, "'")         // Decodifica &#39;
      .replace(/\n/g, ' ')             // Remove \n
      .replace(/\r/g, '')              // Remove \r
      .replace(/\s+/g, ' ')            // Consolida espaços múltiplos
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

  // ✅ HEADER CORRETO - Google Ads Editor com suporte a PINNING
  const headers = [
    'Campaign',
    'Campaign type',
    'Campaign status',
    'Budget',
    'Bid strategy type',
    'Location',
    'Language',
    'EU political ads',
    'Ad Group',
    'Keyword',
    'Type',
    'Ad type',
    'Final URL',
    'Path 1',
    'Path 2',
    // 15 Headlines + 15 Headline Positions (para pinning)
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1} position`),
    // 4 Descriptions + 4 Description Positions (para pinning)
    'Description 1', 'Description 2', 'Description 3', 'Description 4',
    'Description 1 position', 'Description 2 position', 'Description 3 position', 'Description 4 position'
  ];

  // ✅ CONSTANTES COL - 53 colunas totais (com posições de pinning)
  const COL = {
    CAMPAIGN: 0,
    CAMPAIGN_TYPE: 1,
    CAMPAIGN_STATUS: 2,
    BUDGET: 3,
    BID_STRATEGY: 4,
    LOCATION: 5,
    LANGUAGE: 6,
    EU_POLITICAL: 7,
    AD_GROUP: 8,
    KEYWORD: 9,
    TYPE: 10,
    AD_TYPE: 11,
    FINAL_URL: 12,
    PATH_1: 13,
    PATH_2: 14,
    HEADLINE_START: 15,        // Headlines 1-15 (índices 15-29)
    HEADLINE_POS_START: 30,    // Headline positions 1-15 (índices 30-44)
    DESC_START: 45,            // Descriptions 1-4 (índices 45-48)
    DESC_POS_START: 49         // Description positions 1-4 (índices 49-52)
  };

  const TOTAL_COLS = 53;

  const rows: string[][] = [];

  // ✅ Mapeamento de Bid Strategy
  const bidStrategyMap: Record<string, string> = {
    'MAX_CONV': 'Maximize conversions',
    'MAX_CLICKS': 'Maximize clicks',
    'MANUAL_CPC': 'Manual CPC',
    'TARGET_CPA': 'Target CPA',
    'TARGET_ROAS': 'Target ROAS',
    'Maximize conversions': 'Maximize conversions',
    'Maximize clicks': 'Maximize clicks'
  };

  // ✅ Mapeamento de Match Type em Português
  const matchTypeMap: Record<string, string> = {
    'BROAD': 'Ampla',
    'PHRASE': 'Frase',
    'EXACT': 'Exata',
    'Broad': 'Ampla',
    'Phrase': 'Frase',
    'Exact': 'Exata',
    'Ampla': 'Ampla',
    'Frase': 'Frase',
    'Exata': 'Exata'
  };

  // 1. Campaign Row
  const campaignRow = new Array(TOTAL_COLS).fill('');
  campaignRow[COL.CAMPAIGN] = csvEscape(campaignName);
  campaignRow[COL.CAMPAIGN_TYPE] = 'Search';
  campaignRow[COL.CAMPAIGN_STATUS] = 'Enabled';
  campaignRow[COL.BUDGET] = String(config.daily_budget_brl || 30);
  
  const rawStrategy = config.bidding?.strategy || 'Maximize conversions';
  campaignRow[COL.BID_STRATEGY] = bidStrategyMap[rawStrategy] || 'Maximize conversions';
  
  campaignRow[COL.LOCATION] = csvEscape(config.locations?.join(';') || 'Brazil');
  campaignRow[COL.LANGUAGE] = 'pt';
  campaignRow[COL.EU_POLITICAL] = 'Não';
  rows.push(campaignRow);

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

  // ✅ Preparar headlines para pinning
  const finalHeadlines: string[] = [];
  for (let i = 0; i < 15; i++) {
    const h = adCopies.headlines?.[i];
    const fallback = fallbackHeadlines[i] || `Headline ${i + 1}`;
    const text = (h && typeof h === 'string' && h.trim()) ? h : fallback;
    finalHeadlines.push(sanitizeText(text, 30));
  }
  
  // ✅ Calcular pinning baseado no conteúdo dos headlines
  const headlinePinning = determinePinningPosition(finalHeadlines);

  // ✅ NOVO: Iterar sobre múltiplos Ad Groups
  for (const adGroup of adGroups) {
    // 2. Ad Group Row
    const adGroupRow = new Array(TOTAL_COLS).fill('');
    adGroupRow[COL.CAMPAIGN] = csvEscape(campaignName);
    adGroupRow[COL.AD_GROUP] = csvEscape(adGroup.name);
    rows.push(adGroupRow);

    // 3. Ad Row (RSA) para cada Ad Group COM PINNING
    const adRow = new Array(TOTAL_COLS).fill('');
    adRow[COL.CAMPAIGN] = csvEscape(campaignName);
    adRow[COL.AD_GROUP] = csvEscape(adGroup.name);
    adRow[COL.AD_TYPE] = 'Anúncio responsivo de pesquisa';
    adRow[COL.FINAL_URL] = csvEscape(finalUrl);
    adRow[COL.PATH_1] = csvEscape(sanitizeText(adCopies.paths?.[0] || 'produtos', 15));
    adRow[COL.PATH_2] = csvEscape(sanitizeText(adCopies.paths?.[1] || 'ofertas', 15));
    
    // Headlines (COL.HEADLINE_START até COL.HEADLINE_START + 14)
    for (let i = 0; i < 15; i++) {
      adRow[COL.HEADLINE_START + i] = csvEscape(finalHeadlines[i]);
      
      // ✅ NOVO: Aplicar pinning position se definido
      if (headlinePinning[i] !== undefined) {
        adRow[COL.HEADLINE_POS_START + i] = String(headlinePinning[i]);
      }
    }

    // Descriptions (COL.DESC_START até COL.DESC_START + 3)
    for (let i = 0; i < 4; i++) {
      const d = adCopies.descriptions?.[i];
      const fallback = fallbackDescriptions[i] || `Descrição profissional ${i + 1}.`;
      const text = (d && typeof d === 'string' && d.trim()) ? d : fallback;
      adRow[COL.DESC_START + i] = csvEscape(sanitizeText(text, 90));
      
      // ✅ NOVO: Pinning de descriptions
      // D1 na posição 1, D2 na posição 2 (garantir mensagens-chave)
      if (i === 0) adRow[COL.DESC_POS_START + i] = '1';
      if (i === 1) adRow[COL.DESC_POS_START + i] = '2';
    }

    rows.push(adRow);
    
    console.log(`📢 Ad Group "${adGroup.name}" (${adGroup.theme}): ${adGroup.keywords.length} keywords`);

    // 4. Keyword Rows para este Ad Group
    for (const keyword of adGroup.keywords) {
      const keywordRow = new Array(TOTAL_COLS).fill('');
      keywordRow[COL.CAMPAIGN] = csvEscape(campaignName);
      keywordRow[COL.AD_GROUP] = csvEscape(adGroup.name);
      keywordRow[COL.KEYWORD] = csvEscape(sanitizeKeyword(keyword.text));
      keywordRow[COL.TYPE] = matchTypeMap[keyword.match_type] || 'Frase';
      rows.push(keywordRow);
    }
  }

  // Construir CSV
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];

  // Log de pinning aplicado
  const pinnedCount = Object.keys(headlinePinning).length;
  console.log(`✅ CSV gerado: ${adGroups.length} Ad Groups, ${rows.length} linhas, ${pinnedCount} headlines com pinning`);
  
  return csvLines.join('\n');
}