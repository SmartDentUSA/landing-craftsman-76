// Shared utility for processing intelligent links in blog content
export function processContentWithIntelligentLinks(
  content: string,
  intelligentLinks: Record<string, string> = {}
): string {
  if (!content || !intelligentLinks || Object.keys(intelligentLinks).length === 0) {
    return content;
  }
  
  let processedContent = content;
  
  // Apply each intelligent link
  Object.entries(intelligentLinks).forEach(([keyword, url]) => {
    if (keyword && url) {
      // Create regex to find the keyword (case insensitive, word boundary)
      const regex = new RegExp(`\\b(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      
      // Replace only the first occurrence to avoid excessive links
      let replaced = false;
      processedContent = processedContent.replace(regex, (match) => {
        if (!replaced) {
          replaced = true;
          // Add 🔗 emoji to indicate intelligent link
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-weight: 500;">🔗 ${match}</a>`;
        }
        return match;
      });
    }
  });
  
  return processedContent;
}

// Load intelligent links from Supabase
export async function loadIntelligentLinksFromDatabase(): Promise<Record<string, string>> {
  // This could be enhanced to load from a dedicated table
  // For now, we'll return an empty object as links come from landing page data
  return {};
}

// Cache for intelligent links to improve performance
const intelligentLinksCache = new Map<string, Record<string, string>>();

export function getCachedIntelligentLinks(landingPageId: string): Record<string, string> | null {
  return intelligentLinksCache.get(landingPageId) || null;
}

export function cacheIntelligentLinks(landingPageId: string, links: Record<string, string>): void {
  intelligentLinksCache.set(landingPageId, links);
}