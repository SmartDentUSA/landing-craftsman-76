import { useState, useEffect, useCallback } from 'react';
import { useLinksRepository } from './useLinksRepository';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';

interface AutoLinkKeyword {
  keyword: string;
  url: string;
  source: 'product' | 'external' | 'internal';
  priority: number;
}

export function useAutoLinker() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLinksCount, setAutoLinksCount] = useState(0);
  const [keywords, setKeywords] = useState<AutoLinkKeyword[]>([]);
  const { allLinks, externalLinks, internalLinks, isLoading } = useLinksRepository();

  // Load all keywords from products and centralized repository
  const loadKeywords = useCallback(async () => {
    try {
      // Get product keywords
      const { data: products } = await supabase
        .from('products_repository')
        .select('name, keywords, search_intent_keywords, market_keywords, bot_trigger_words, product_url')
        .eq('approved', true)
        .eq('use_in_ai_generation', true);

      // Get centralized links
      const centralizedLinks = allLinks;
      
      const allKeywords: AutoLinkKeyword[] = [];

      // Priority 1: External links (highest priority)
      externalLinks.forEach(link => {
        allKeywords.push({
          keyword: link.name,
          url: link.url,
          source: 'external',
          priority: 1
        });
      });

      // Priority 2: Internal landing page links
      internalLinks.forEach(link => {
        allKeywords.push({
          keyword: link.name,
          url: link.url,
          source: 'internal',
          priority: 2
        });
      });

      // Priority 3: Product-based keywords
      products?.forEach(product => {
        const productUrl = product.product_url || '#';
        
        // Product name (highest product priority)
        allKeywords.push({
          keyword: product.name,
          url: productUrl,
          source: 'product',
          priority: 3
        });

        // Search intent keywords
        if (Array.isArray(product.search_intent_keywords)) {
          product.search_intent_keywords.forEach((keyword: string) => {
            if (keyword.trim()) {
              allKeywords.push({
                keyword: keyword.trim(),
                url: productUrl,
                source: 'product',
                priority: 4
              });
            }
          });
        }

        // Main keywords
        if (Array.isArray(product.keywords)) {
          product.keywords.forEach((keyword: string) => {
            if (keyword.trim()) {
              allKeywords.push({
                keyword: keyword.trim(),
                url: productUrl,
                source: 'product',
                priority: 5
              });
            }
          });
        }

        // Market keywords (lower priority)
        if (Array.isArray(product.market_keywords)) {
          product.market_keywords.forEach((keyword: string) => {
            if (keyword.trim()) {
              allKeywords.push({
                keyword: keyword.trim(),
                url: productUrl,
                source: 'product',
                priority: 6
              });
            }
          });
        }
      });

      // Sort by priority and length (longer keywords first within same priority)
      allKeywords.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.keyword.length - a.keyword.length;
      });

      setKeywords(allKeywords);
    } catch (error) {
      console.error('Error loading auto-link keywords:', error);
    }
  }, [allLinks, externalLinks, internalLinks]);

  useEffect(() => {
    if (!isLoading) {
      loadKeywords();
    }
  }, [loadKeywords, isLoading]);

  // Process content and add automatic links
  const processAutoLinks = useCallback((content: string, preserveExistingLinks: boolean = true): string => {
    if (!content || keywords.length === 0) return content;

    setIsProcessing(true);
    let processedContent = content;
    let linksAdded = 0;
    const maxLinksPerContent = 8;
    const maxLinksPerParagraph = 2;

    try {
      // Split into paragraphs
      const paragraphs = processedContent.split(/\n\s*\n/);
      
      const processedParagraphs = paragraphs.map(paragraph => {
        if (linksAdded >= maxLinksPerContent) return paragraph;
        
        let paragraphLinksCount = 0;
        let processedParagraph = paragraph;
        
        // Skip if paragraph already has links and we want to preserve them
        if (preserveExistingLinks && processedParagraph.includes('<a ')) {
          return processedParagraph;
        }

        keywords.forEach(({ keyword, url, source }) => {
          if (linksAdded >= maxLinksPerContent || paragraphLinksCount >= maxLinksPerParagraph) {
            return;
          }

          if (keyword && url && keyword.length >= 3) {
            // Create regex for exact word match (case insensitive)
            const regex = new RegExp(`\\b(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
            
            // Check if keyword exists and no link exists for this text
            if (regex.test(processedParagraph) && !processedParagraph.includes(`>${keyword}<`)) {
              const linkClass = source === 'external' ? 'external-auto-link' : 'internal-auto-link';
              
              processedParagraph = processedParagraph.replace(regex, (match) => {
                linksAdded++;
                paragraphLinksCount++;
                
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${linkClass}" style="color: hsl(var(--primary)); text-decoration: underline; font-weight: 500;" title="Saiba mais sobre ${keyword}">${match}</a>`;
              });
            }
          }
        });
        
        return processedParagraph;
      });

      processedContent = processedParagraphs.join('\n\n');
      setAutoLinksCount(linksAdded);
      
    } catch (error) {
      console.error('Error processing auto-links:', error);
    } finally {
      setIsProcessing(false);
    }

    return processedContent;
  }, [keywords]);

  // Real-time preview processing with debounce
  const debouncedPreviewLinks = useDebounce((content: string, callback: (processed: string, count: number) => void) => {
    const processed = processAutoLinks(content, false);
    const linkCount = (processed.match(/<a [^>]*class="[^"]*auto-link[^"]*"/g) || []).length;
    callback(processed, linkCount);
  }, 500);

  // Get links that would be applied to content (for preview)
  const getApplicableLinks = useCallback((content: string): AutoLinkKeyword[] => {
    if (!content) return [];
    
    return keywords.filter(({ keyword }) => {
      if (!keyword || keyword.length < 3) return false;
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(content);
    }).slice(0, 8); // Limit to max links
  }, [keywords]);

  return {
    processAutoLinks,
    debouncedPreviewLinks,
    getApplicableLinks,
    isProcessing,
    autoLinksCount,
    keywords: keywords.slice(0, 20), // Return limited keywords for display
    loadKeywords
  };
}