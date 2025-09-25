import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KeywordAggregation {
  allKeywords: string[];
  formattedForBlog: string;
  keywordsBySource: {
    keywords: string[];
    marketKeywords: string[];
    searchIntentKeywords: string[];
    categories: string[];
    salesPitchKeywords: string[];
    featuresKeywords: string[];
    benefitsKeywords: string[];
    targetAudienceKeywords: string[];
    tags: string[];
    videoCaptionsKeywords: string[];
  };
  productCount: number;
  commercialData: {
    ctaUrls: string[];
    offerLabels: string[];
    priceRanges: string[];
  };
}

export const useProductKeywordsAggregator = () => {
  const { toast } = useToast();

  const aggregateKeywordsFromProducts = useCallback(async (productIds: string[]): Promise<KeywordAggregation> => {
    if (!productIds || productIds.length === 0) {
        return {
          allKeywords: [],
          formattedForBlog: '',
          keywordsBySource: {
            keywords: [],
            marketKeywords: [],
            searchIntentKeywords: [],
            categories: [],
            salesPitchKeywords: [],
            featuresKeywords: [],
            benefitsKeywords: [],
            targetAudienceKeywords: [],
            tags: [],
            videoCaptionsKeywords: []
          },
          productCount: 0,
          commercialData: {
            ctaUrls: [],
            offerLabels: [],
            priceRanges: []
          }
        };
    }

    try {
      // Buscar produtos selecionados com TODOS os campos
      const { data: products, error } = await supabase
        .from('products_repository')
        .select(`
          name,
          category,
          subcategory,
          keywords,
          market_keywords,
          search_intent_keywords,
          sales_pitch,
          features,
          benefits,
          target_audience,
          tags,
          video_captions,
          offer_discount_cta,
          resource_cta1,
          resource_cta2,
          resource_cta3,
          resource_descriptions,
          testimonial_videos,
          technical_videos,
          youtube_videos,
          instagram_videos,
          price,
          currency
        `)
        .in('id', productIds)
        .eq('approved', true);

      if (error) throw error;

      if (!products || products.length === 0) {
        toast({
          title: "Produtos não encontrados",
          description: "Nenhum produto válido encontrado para agregação de keywords",
          variant: "destructive"
        });
        return {
          allKeywords: [],
          formattedForBlog: '',
          keywordsBySource: {
            keywords: [],
            marketKeywords: [],
            searchIntentKeywords: [],
            categories: [],
            salesPitchKeywords: [],
            featuresKeywords: [],
            benefitsKeywords: [],
            targetAudienceKeywords: [],
            tags: [],
            videoCaptionsKeywords: []
          },
          productCount: 0,
          commercialData: {
            ctaUrls: [],
            offerLabels: [],
            priceRanges: []
          }
        };
      }

      // Extrair keywords de TODAS as fontes disponíveis
      const keywordsBySource = {
        keywords: [] as string[],
        marketKeywords: [] as string[],
        searchIntentKeywords: [] as string[],
        categories: [] as string[],
        salesPitchKeywords: [] as string[],
        featuresKeywords: [] as string[],
        benefitsKeywords: [] as string[],
        targetAudienceKeywords: [] as string[],
        tags: [] as string[],
        videoCaptionsKeywords: [] as string[]
      };

      const commercialData = {
        ctaUrls: [] as string[],
        offerLabels: [] as string[],
        priceRanges: [] as string[]
      };

      products.forEach(product => {
        // Keywords diretas
        if (product.keywords && Array.isArray(product.keywords)) {
          keywordsBySource.keywords.push(...(product.keywords as string[]));
        }

        // Market keywords
        if (product.market_keywords && Array.isArray(product.market_keywords)) {
          keywordsBySource.marketKeywords.push(...(product.market_keywords as string[]));
        }

        // Search intent keywords
        if (product.search_intent_keywords && Array.isArray(product.search_intent_keywords)) {
          keywordsBySource.searchIntentKeywords.push(...(product.search_intent_keywords as string[]));
        }

        // Categories
        if (product.category) {
          keywordsBySource.categories.push(product.category);
        }
        if (product.subcategory) {
          keywordsBySource.categories.push(product.subcategory);
        }

        // ✨ NOVOS CAMPOS: Extrair keywords de sales_pitch
        if (product.sales_pitch) {
          const pitchKeywords = extractKeywordsFromText(product.sales_pitch);
          keywordsBySource.salesPitchKeywords.push(...pitchKeywords);
        }

        // ✨ Features como keywords
        if (product.features && Array.isArray(product.features)) {
          keywordsBySource.featuresKeywords.push(...(product.features as string[]));
        }

        // ✨ Benefits como keywords
        if (product.benefits && Array.isArray(product.benefits)) {
          keywordsBySource.benefitsKeywords.push(...(product.benefits as string[]));
        }

        // ✨ Target audience como keywords
        if (product.target_audience && Array.isArray(product.target_audience)) {
          keywordsBySource.targetAudienceKeywords.push(...(product.target_audience as string[]));
        }

        // ✨ Tags órfãs agora conectadas
        if (product.tags && Array.isArray(product.tags)) {
          keywordsBySource.tags.push(...(product.tags as string[]));
        }

        // ✨ Extrair keywords de video_captions
        if (product.video_captions && typeof product.video_captions === 'object') {
          const captionKeywords = extractKeywordsFromVideoCaptions(product.video_captions);
          keywordsBySource.videoCaptionsKeywords.push(...captionKeywords);
        }

        // ✨ Extrair keywords de descrições de vídeos
        const videoDescriptions = extractKeywordsFromVideoDescriptions(product);
        keywordsBySource.videoCaptionsKeywords.push(...videoDescriptions);

        // ✨ Extrair keywords de descrições de recursos
        const resourceDescriptions = extractKeywordsFromResourceDescriptions(product);
        keywordsBySource.salesPitchKeywords.push(...resourceDescriptions);

        // ✨ Coletar dados comerciais (com type safety)
        if (product.offer_discount_cta && typeof product.offer_discount_cta === 'object') {
          const cta = product.offer_discount_cta as any;
          if (cta.url && typeof cta.url === 'string') {
            commercialData.ctaUrls.push(cta.url);
          }
          if (cta.label && typeof cta.label === 'string') {
            commercialData.offerLabels.push(cta.label);
          }
        }

        // CTAs de recursos (com type safety)
        [product.resource_cta1, product.resource_cta2, product.resource_cta3].forEach(cta => {
          if (cta && typeof cta === 'object') {
            const ctaObj = cta as any;
            if (ctaObj.url && typeof ctaObj.url === 'string') {
              commercialData.ctaUrls.push(ctaObj.url);
            }
            if (ctaObj.label && typeof ctaObj.label === 'string') {
              commercialData.offerLabels.push(ctaObj.label);
            }
          }
        });

        // Preços para schema
        if (product.price && product.currency) {
          commercialData.priceRanges.push(`${product.price} ${product.currency}`);
        }
      });

      // Compilar TODAS as keywords de TODAS as fontes
      const allKeywords = [
        ...keywordsBySource.keywords,
        ...keywordsBySource.marketKeywords,
        ...keywordsBySource.searchIntentKeywords,
        ...keywordsBySource.categories,
        ...keywordsBySource.salesPitchKeywords,
        ...keywordsBySource.featuresKeywords,
        ...keywordsBySource.benefitsKeywords,
        ...keywordsBySource.targetAudienceKeywords,
        ...keywordsBySource.tags,
        ...keywordsBySource.videoCaptionsKeywords
      ];

      // Normalizar e remover duplicatas
      const normalizedKeywords = Array.from(new Set(
        allKeywords
          .filter(keyword => keyword && typeof keyword === 'string')
          .map(keyword => keyword.trim().toLowerCase())
          .filter(keyword => keyword.length > 2) // Remover keywords muito curtas
      )).sort();

      // Formatar para inserção no blog
      const formattedForBlog = normalizedKeywords.join(', ');

      console.log('📊 Keywords COMPLETAS agregadas dos produtos:', {
        productCount: products.length,
        totalKeywords: normalizedKeywords.length,
        newFieldsUsed: {
          salesPitch: keywordsBySource.salesPitchKeywords.length,
          features: keywordsBySource.featuresKeywords.length,
          benefits: keywordsBySource.benefitsKeywords.length,
          targetAudience: keywordsBySource.targetAudienceKeywords.length,
          tags: keywordsBySource.tags.length,
          videoCaptions: keywordsBySource.videoCaptionsKeywords.length
        },
        commercialData,
        sample: normalizedKeywords.slice(0, 10)
      });

      return {
        allKeywords: normalizedKeywords,
        formattedForBlog,
        keywordsBySource,
        productCount: products.length,
        commercialData
      };

    } catch (error) {
      console.error('Erro ao agregar keywords dos produtos:', error);
      toast({
        title: "Erro na agregação",
        description: "Erro ao compilar keywords dos produtos selecionados",
        variant: "destructive"
      });
      
      return {
        allKeywords: [],
        formattedForBlog: '',
        keywordsBySource: {
          keywords: [],
          marketKeywords: [],
          searchIntentKeywords: [],
          categories: [],
          salesPitchKeywords: [],
          featuresKeywords: [],
          benefitsKeywords: [],
          targetAudienceKeywords: [],
          tags: [],
          videoCaptionsKeywords: []
        },
        productCount: 0,
        commercialData: {
          ctaUrls: [],
          offerLabels: [],
          priceRanges: []
        }
      };
    }
  }, [toast]);

  const aggregateFromCategoriesConfig = useCallback(async (categories: string[]): Promise<string[]> => {
    if (!categories || categories.length === 0) return [];

    try {
      const { data: categoriesConfig, error } = await supabase
        .from('categories_config')
        .select('keywords, market_keywords, search_intent_keywords')
        .in('category', categories);

      if (error) throw error;

      const configKeywords: string[] = [];
      
      categoriesConfig?.forEach(config => {
        if (config.keywords && Array.isArray(config.keywords)) {
          configKeywords.push(...(config.keywords as string[]));
        }
        if (config.market_keywords && Array.isArray(config.market_keywords)) {
          configKeywords.push(...(config.market_keywords as string[]));
        }
        if (config.search_intent_keywords && Array.isArray(config.search_intent_keywords)) {
          configKeywords.push(...(config.search_intent_keywords as string[]));
        }
      });

      return Array.from(new Set(configKeywords));
    } catch (error) {
      console.error('Erro ao buscar keywords das categorias:', error);
      return [];
    }
  }, []);

  const enrichKeywordsWithCategories = useCallback(async (productKeywords: KeywordAggregation): Promise<string[]> => {
    const uniqueCategories = Array.from(new Set(productKeywords.keywordsBySource.categories));
    const categoryKeywords = await aggregateFromCategoriesConfig(uniqueCategories);
    
    // Combinar keywords dos produtos com keywords das configurações de categoria
    const enrichedKeywords = Array.from(new Set([
      ...productKeywords.allKeywords,
      ...categoryKeywords
    ]));

    console.log('🔗 Keywords enriquecidas com configurações de categoria:', {
      originalCount: productKeywords.allKeywords.length,
      categoryKeywordsCount: categoryKeywords.length,
      enrichedCount: enrichedKeywords.length
    });

    return enrichedKeywords;
  }, [aggregateFromCategoriesConfig]);

  return {
    aggregateKeywordsFromProducts,
    aggregateFromCategoriesConfig,
    enrichKeywordsWithCategories
  };
};

// ✨ FUNÇÕES AUXILIARES PARA EXTRAIR KEYWORDS

// Extrair keywords de texto livre (sales_pitch, descriptions)
function extractKeywordsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  // Remove pontuação e quebra em palavras
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3) // Palavras com mais de 3 caracteres
    .filter(word => !['para', 'com', 'que', 'uma', 'por', 'seu', 'sua', 'mais', 'como', 'onde', 'quando'].includes(word)); // Remove stop words
  
  // Extrair bi-gramas e tri-gramas relevantes
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  
  return [...words, ...phrases].slice(0, 20); // Limitar a 20 keywords por texto
}

/**
 * Helper function to extract keywords from video caption data
 */
function extractKeywordsFromVideoCaptions(videoCaptions: any): string[] {
  if (!videoCaptions || typeof videoCaptions !== 'object') return [];
  
  const keywords: string[] = [];
  
  Object.values(videoCaptions).forEach((captionData: any) => {
    if (Array.isArray(captionData)) {
      captionData.forEach((caption: any) => {
        if (caption?.text) {
          keywords.push(...extractKeywordsFromText(caption.text));
        }
        
        // If captions have AI analysis
        if (caption?.ai_analysis?.keywords && Array.isArray(caption.ai_analysis.keywords)) {
          keywords.push(...caption.ai_analysis.keywords);
        }
      });
    }
  });
  
  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Helper function to extract keywords from video descriptions
 */
function extractKeywordsFromVideoDescriptions(product: any): string[] {
  const keywords: string[] = [];
  
  // Process testimonial videos descriptions
  if (product.testimonial_videos && Array.isArray(product.testimonial_videos)) {
    product.testimonial_videos.forEach((video: any) => {
      if (video.description) {
        keywords.push(...extractKeywordsFromText(video.description));
      }
    });
  }
  
  // Process technical videos descriptions
  if (product.technical_videos && Array.isArray(product.technical_videos)) {
    product.technical_videos.forEach((video: any) => {
      if (video.description) {
        keywords.push(...extractKeywordsFromText(video.description));
      }
    });
  }
  
  // Process YouTube videos descriptions
  if (product.youtube_videos && Array.isArray(product.youtube_videos)) {
    product.youtube_videos.forEach((video: any) => {
      if (video.description) {
        keywords.push(...extractKeywordsFromText(video.description));
      }
    });
  }
  
  // Process Instagram videos descriptions
  if (product.instagram_videos && Array.isArray(product.instagram_videos)) {
    product.instagram_videos.forEach((video: any) => {
      if (video.description) {
        keywords.push(...extractKeywordsFromText(video.description));
      }
    });
  }
  
  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Helper function to extract keywords from resource descriptions
 */
function extractKeywordsFromResourceDescriptions(product: any): string[] {
  const keywords: string[] = [];
  
  if (product.resource_descriptions && typeof product.resource_descriptions === 'object') {
    Object.values(product.resource_descriptions).forEach((description: any) => {
      if (typeof description === 'string' && description.trim()) {
        keywords.push(...extractKeywordsFromText(description));
      }
    });
  }
  
  return [...new Set(keywords)]; // Remove duplicates
}