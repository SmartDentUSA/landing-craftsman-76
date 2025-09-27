// Advanced intelligent links system extracted from generate-product-blog
// Provides sophisticated link generation with priority levels and context awareness

interface IntelligentLinksOptions {
  content: string;
  customLinks?: Record<string, string>;
  landingPagesData?: any[];
  productUrl?: string;
  relatedProducts?: any[];
  productKeywords?: string[];
  productCategories?: string[];
}

export async function generateAdvancedIntelligentLinks({
  content,
  customLinks = {},
  landingPagesData = [],
  productUrl,
  relatedProducts = [],
  productKeywords = [],
  productCategories = []
}: IntelligentLinksOptions): Promise<Record<string, string>> {
  const intelligentLinks: Record<string, string> = {};
  
  // Priority 1: Custom links from user (highest priority)
  Object.entries(customLinks).forEach(([keyword, url]) => {
    if (keyword && url && isKeywordInContent(keyword, content)) {
      intelligentLinks[keyword] = url;
    }
  });
  
  // Priority 2: Links from landing pages that share this product
  landingPagesData.forEach((landingPage: any) => {
    if (landingPage.name && landingPage.domain && isKeywordInContent(landingPage.name, content)) {
      const landingUrl = `https://${landingPage.domain}/${landingPage.slug || landingPage.name.toLowerCase().replace(/\s+/g, '-')}`;
      if (!intelligentLinks[landingPage.name]) {
        intelligentLinks[landingPage.name] = landingUrl;
      }
    }
    
    // Add keywords from landing page
    if (landingPage.ai_keywords && Array.isArray(landingPage.ai_keywords)) {
      landingPage.ai_keywords.forEach((keyword: string) => {
        if (keyword && isKeywordInContent(keyword, content) && !intelligentLinks[keyword]) {
          const landingUrl = `https://${landingPage.domain}/${landingPage.slug || landingPage.name.toLowerCase().replace(/\s+/g, '-')}`;
          intelligentLinks[keyword] = landingUrl;
        }
      });
    }
  });
  
  // Priority 3: Product URL (if provided)
  if (productUrl) {
    productKeywords.forEach(keyword => {
      if (keyword && isKeywordInContent(keyword, content) && !intelligentLinks[keyword]) {
        intelligentLinks[keyword] = productUrl;
      }
    });
  }
  
  // Priority 4: Related products links
  relatedProducts.forEach((relatedProduct: any) => {
    if (relatedProduct.name && relatedProduct.url && isKeywordInContent(relatedProduct.name, content)) {
      if (!intelligentLinks[relatedProduct.name]) {
        intelligentLinks[relatedProduct.name] = relatedProduct.url;
      }
    }
    
    // Add keywords from related products
    const relatedKeywords = [
      ...(relatedProduct.keywords || []),
      ...(relatedProduct.market_keywords || []),
      ...(relatedProduct.search_intent_keywords || [])
    ];
    
    relatedKeywords.forEach(keyword => {
      if (keyword && isKeywordInContent(keyword, content) && !intelligentLinks[keyword]) {
        intelligentLinks[keyword] = relatedProduct.url;
      }
    });
  });
  
  // Priority 5: Product categories and keywords (lowest priority)
  productCategories.forEach(category => {
    if (category && isKeywordInContent(category, content) && !intelligentLinks[category]) {
      // Could link to category page if available
      intelligentLinks[category] = productUrl || '#';
    }
  });
  
  return intelligentLinks;
}

// Enhanced content processing with intelligent links
export function processContentWithAdvancedIntelligentLinks(
  content: string,
  intelligentLinks: Record<string, string> = {}
): string {
  if (!content || !intelligentLinks || Object.keys(intelligentLinks).length === 0) {
    return content;
  }
  
  let processedContent = content;
  let linksInserted = 0;
  const maxLinksPerContent = 8; // Limit total links
  const maxLinksPerParagraph = 2; // Increased from 1 for better linking
  
  // Split content into paragraphs to control link density
  const paragraphs = processedContent.split(/\n\s*\n/);
  
  const processedParagraphs = paragraphs.map(paragraph => {
    if (linksInserted >= maxLinksPerContent) return paragraph;
    
    let paragraphLinksCount = 0;
    let processedParagraph = paragraph;
    
    // Sort keywords by length (longer first) to avoid conflicts
    const sortedEntries = Object.entries(intelligentLinks)
      .sort(([a], [b]) => b.length - a.length);
    
    sortedEntries.forEach(([keyword, url]) => {
      if (linksInserted >= maxLinksPerContent || paragraphLinksCount >= maxLinksPerParagraph) {
        return;
      }
      
      if (keyword && url && url !== '#') {
        // Create regex to find the keyword (case insensitive, word boundary)
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedKeyword})\\b`, 'i');
        
        // Check if keyword exists in this paragraph and no link was already inserted
        if (regex.test(processedParagraph) && !processedParagraph.includes(`>${keyword}<`) && !processedParagraph.includes(`](${url})`)) {
          processedParagraph = processedParagraph.replace(regex, (match) => {
            linksInserted++;
            paragraphLinksCount++;
            
            // Generate contextual anchor text
            const anchorText = generateContextualAnchorText(match, keyword);
            
            // Return markdown link format for blog content
            return `[${anchorText}](${url})`;
          });
        }
      }
    });
    
    return processedParagraph;
  });
  
  return processedParagraphs.join('\n\n');
}

// Generate contextual anchor text variations
function generateContextualAnchorText(match: string, originalKeyword: string): string {
  const variations = [
    match, // Original match
    originalKeyword, // Original keyword
  ];
  
  // Add plural/singular variations
  if (originalKeyword.endsWith('s') && originalKeyword.length > 3) {
    variations.push(originalKeyword.slice(0, -1)); // Remove 's'
  } else {
    variations.push(originalKeyword + 's'); // Add 's'
  }
  
  // Return the most contextually appropriate variation
  return match; // For now, keep the exact match
}

// Utility function to check if keyword exists in content
function isKeywordInContent(keyword: string, content: string): boolean {
  if (!keyword || !content) return false;
  
  try {
    // Create a case-insensitive regex with word boundaries
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(content);
  } catch (error) {
    console.warn('Error checking keyword in content:', error);
    return false;
  }
}

// Cache for intelligent links to improve performance
const intelligentLinksCache = new Map<string, Record<string, string>>();

export function getCachedAdvancedIntelligentLinks(cacheKey: string): Record<string, string> | null {
  return intelligentLinksCache.get(cacheKey) || null;
}

export function cacheAdvancedIntelligentLinks(cacheKey: string, links: Record<string, string>): void {
  intelligentLinksCache.set(cacheKey, links);
  
  // Keep cache size manageable
  if (intelligentLinksCache.size > 100) {
    const firstKey = intelligentLinksCache.keys().next().value;
    intelligentLinksCache.delete(firstKey);
  }
}
