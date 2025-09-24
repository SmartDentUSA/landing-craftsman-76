// Shared utility for processing intelligent links in blog content
export function processContentWithIntelligentLinks(
  content: string,
  intelligentLinks: Record<string, string> = {}
): string {
  if (!content || !intelligentLinks || Object.keys(intelligentLinks).length === 0) {
    return content;
  }
  
  let processedContent = content;
  let linksInserted = 0;
  const maxLinksPerContent = 8; // Limit total links
  const maxLinksPerParagraph = 1; // Limit links per paragraph
  
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
      
      if (keyword && url) {
        // Create regex to find the keyword (case insensitive, word boundary)
        const regex = new RegExp(`\\b(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
        
        // Check if keyword exists in this paragraph and no link was already inserted
        if (regex.test(processedParagraph) && !processedParagraph.includes(`>${keyword}<`)) {
          processedParagraph = processedParagraph.replace(regex, (match) => {
            linksInserted++;
            paragraphLinksCount++;
            
            // Generate varied anchor text based on context
            const anchorText = generateContextualAnchorText(match, keyword);
            
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: hsl(var(--primary)); text-decoration: underline; font-weight: 500;" title="Saiba mais sobre ${keyword}">🔗 ${anchorText}</a>`;
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