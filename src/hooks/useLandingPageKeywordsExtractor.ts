import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface KeywordMapping {
  keyword: string;
  url: string;
  source: 'product' | 'solution' | 'faq' | 'category' | 'banner';
  anchorText?: string;
}

interface KeywordExtractionResult {
  intelligentLinks: Record<string, string>;
  mappings: KeywordMapping[];
  totalKeywords: number;
}

export function useLandingPageKeywordsExtractor() {
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  const extractKeywordsFromLandingPage = async (
    landingPageData: any,
    selectedProductIds: string[] = []
  ): Promise<KeywordExtractionResult> => {
    setExtracting(true);
    
    try {
      const mappings: KeywordMapping[] = [];
      const landingPageUrl = `${window.location.origin}/lp/${landingPageData.id}`;
      
      // 1. Extract from banner/title
      if (landingPageData.data?.banner?.title) {
        const bannerKeywords = extractRelevantKeywords(landingPageData.data.banner.title);
        bannerKeywords.forEach(keyword => {
          mappings.push({
            keyword,
            url: landingPageUrl,
            source: 'banner',
            anchorText: keyword
          });
        });
      }

      // 2. Extract from solutions
      if (landingPageData.data?.solutions?.items) {
        landingPageData.data.solutions.items.forEach((solution: any, index: number) => {
          if (solution.text) {
            const solutionKeywords = extractRelevantKeywords(solution.text);
            solutionKeywords.forEach(keyword => {
              mappings.push({
                keyword,
                url: `${landingPageUrl}#solucao-${index}`,
                source: 'solution',
                anchorText: keyword
              });
            });
          }
        });
      }

      // 3. Extract from FAQ
      if (landingPageData.data?.faq?.items) {
        landingPageData.data.faq.items.forEach((faq: any, index: number) => {
          if (faq.question) {
            const faqKeywords = extractRelevantKeywords(faq.question);
            faqKeywords.forEach(keyword => {
              mappings.push({
                keyword,
                url: `${landingPageUrl}#faq-${index}`,
                source: 'faq',
                anchorText: keyword
              });
            });
          }
        });
      }

      // 4. Extract from products (if available)
      if (selectedProductIds.length > 0) {
        // Import the product keywords aggregator
        const { useProductKeywordsAggregator } = await import('./useProductKeywordsAggregator');
        // This would need to be called differently since it's a hook
        // For now, we'll handle this in the BlogGenerator component
      }

      // 5. Extract from categories and SEO content
      if (landingPageData.data?.seo?.description) {
        const seoKeywords = extractRelevantKeywords(landingPageData.data.seo.description);
        seoKeywords.forEach(keyword => {
          mappings.push({
            keyword,
            url: landingPageUrl,
            source: 'category',
            anchorText: keyword
          });
        });
      }

      // Remove duplicates and prepare intelligent links object
      const uniqueMappings = deduplicateMappings(mappings);
      const intelligentLinks: Record<string, string> = {};
      
      uniqueMappings.forEach(mapping => {
        intelligentLinks[mapping.keyword] = mapping.url;
      });

      return {
        intelligentLinks,
        mappings: uniqueMappings,
        totalKeywords: uniqueMappings.length
      };

    } catch (error) {
      console.error('Error extracting keywords from landing page:', error);
      toast({
        title: "Erro na Extração",
        description: "Erro ao extrair palavras-chave da landing page",
        variant: "destructive",
      });
      
      return {
        intelligentLinks: {},
        mappings: [],
        totalKeywords: 0
      };
    } finally {
      setExtracting(false);
    }
  };

  return {
    extractKeywordsFromLandingPage,
    extracting
  };
}

// Helper function to extract relevant keywords from text
function extractRelevantKeywords(text: string): string[] {
  if (!text) return [];
  
  // Remove common words and extract meaningful phrases
  const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'dos', 'das', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'sem', 'sobre', 'entre', 'até', 'desde', 'durante', 'perante', 'contra', 'segundo', 'conforme', 'e', 'ou', 'mas', 'porém', 'contudo', 'todavia', 'entretanto', 'no', 'entanto', 'que', 'se', 'quando', 'onde', 'como', 'porque', 'já', 'ainda', 'também', 'muito', 'mais', 'menos', 'bem', 'mal', 'melhor', 'pior', 'maior', 'menor'];
  
  // Extract words and phrases (2-4 words)
  const words = text.toLowerCase()
    .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  const keywords: string[] = [];
  
  // Single words
  words.forEach(word => {
    if (word.length > 4) {
      keywords.push(word);
    }
  });
  
  // Two-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length > 8) {
      keywords.push(phrase);
    }
  }
  
  // Three-word phrases (selected cases)
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (phrase.length > 12 && phrase.length < 35) {
      keywords.push(phrase);
    }
  }
  
  // Remove duplicates and return top 5 most relevant
  return [...new Set(keywords)].slice(0, 5);
}

// Helper function to remove duplicate mappings
function deduplicateMappings(mappings: KeywordMapping[]): KeywordMapping[] {
  const seen = new Set<string>();
  return mappings.filter(mapping => {
    const key = `${mapping.keyword.toLowerCase()}-${mapping.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}