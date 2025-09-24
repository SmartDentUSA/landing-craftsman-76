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
  };
  productCount: number;
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
          categories: []
        },
        productCount: 0
      };
    }

    try {
      // Buscar produtos selecionados
      const { data: products, error } = await supabase
        .from('products_repository')
        .select(`
          name,
          category,
          subcategory,
          keywords,
          market_keywords,
          search_intent_keywords
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
            categories: []
          },
          productCount: 0
        };
      }

      // Extrair keywords de diferentes fontes
      const keywordsBySource = {
        keywords: [] as string[],
        marketKeywords: [] as string[],
        searchIntentKeywords: [] as string[],
        categories: [] as string[]
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
      });

      // Compilar todas as keywords e remover duplicatas
      const allKeywords = [
        ...keywordsBySource.keywords,
        ...keywordsBySource.marketKeywords,
        ...keywordsBySource.searchIntentKeywords,
        ...keywordsBySource.categories
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

      console.log('📊 Keywords agregadas dos produtos:', {
        productCount: products.length,
        totalKeywords: normalizedKeywords.length,
        keywordsBySource,
        sample: normalizedKeywords.slice(0, 10)
      });

      return {
        allKeywords: normalizedKeywords,
        formattedForBlog,
        keywordsBySource,
        productCount: products.length
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
          categories: []
        },
        productCount: 0
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