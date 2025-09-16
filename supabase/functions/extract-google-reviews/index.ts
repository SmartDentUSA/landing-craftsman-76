import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleReviewsData {
  rating: number;
  reviewCount: number;
  businessName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    console.log('Extracting Google Reviews from URL:', url);

    if (!url || !isValidGoogleUrl(url)) {
      throw new Error('URL inválida. Use um link do Google Maps ou Google My Business.');
    }

    const reviewsData = await extractReviewsData(url);
    
    console.log('Extracted reviews data:', reviewsData);

    return new Response(JSON.stringify({
      success: true,
      data: reviewsData,
      extracted_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error extracting Google reviews:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      extracted_at: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function isValidGoogleUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('google.com') || 
           urlObj.hostname.includes('maps.google.com') ||
           urlObj.hostname.includes('goo.gl');
  } catch {
    return false;
  }
}

function normalizeGoogleMapsUrl(url: string): string {
  try {
    console.log('Original URL:', url);
    
    // Extract CID from various Google Maps URL formats
    const cidMatch = url.match(/!1s(0x[a-fA-F0-9]+:[a-fA-F0-9x]+)/);
    if (cidMatch) {
      const cid = cidMatch[1];
      const normalizedUrl = `https://www.google.com/maps?cid=${cid}&hl=pt-BR&gl=BR`;
      console.log('Normalized URL with CID:', normalizedUrl);
      return normalizedUrl;
    }
    
    // If no CID found, try to clean up the URL
    const urlObj = new URL(url);
    if (urlObj.pathname.includes('/place/')) {
      // Keep the place URL but add language parameters
      urlObj.searchParams.set('hl', 'pt-BR');
      urlObj.searchParams.set('gl', 'BR');
      const cleanedUrl = urlObj.toString();
      console.log('Cleaned place URL:', cleanedUrl);
      return cleanedUrl;
    }
    
    console.log('Using original URL as fallback');
    return url;
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url;
  }
}

async function extractReviewsData(url: string): Promise<GoogleReviewsData> {
  try {
    // Normalize the URL for better extraction
    const normalizedUrl = normalizeGoogleMapsUrl(url);
    
    console.log('Fetching Google Maps page...');
    console.log('Using URL:', normalizedUrl);
    
    // Fazer request para a página do Google Maps com headers robustos
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch page, status:', response.status);
      throw new Error('Não foi possível acessar a página do Google Maps');
    }

    const html = await response.text();
    console.log('Page fetched successfully, HTML length:', html.length);
    
    // Tentar extrair dados do JSON-LD primeiro
    console.log('Attempting to extract from JSON-LD...');
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);
          
          // Handle array of structured data
          const items = Array.isArray(data) ? data : [data];
          
          for (const item of items) {
            if (item.aggregateRating?.ratingValue && item.aggregateRating?.reviewCount) {
              console.log('Found data in JSON-LD:', item.aggregateRating);
              rating = parseFloat(item.aggregateRating.ratingValue);
              reviewCount = parseInt(item.aggregateRating.reviewCount);
              businessName = item.name || businessName;
              
              if (rating > 0 && rating <= 5 && reviewCount > 0) {
                console.log('Successfully extracted from JSON-LD');
                return { rating, reviewCount, businessName };
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
    }

    // Múltiplos padrões para extrair a avaliação (expandidos)
    const ratingPatterns = [
      // Padrões JSON-LD diretos
      /"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/,
      /"aggregateRating"[^}]*"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/,
      // Padrões aria-label PT/BR
      /aria-label="[^"]*?(\d+,\d+|\d+\.\d+|\d+)\s*de\s*5[^"]*"/i,
      /aria-label="[^"]*?(\d+,\d+|\d+\.\d+|\d+)\s*estrelas?[^"]*"/i,
      // Padrões aria-label EN
      /aria-label="[^"]*?(\d+\.\d+|\d+)\s*out\s*of\s*5[^"]*"/i,
      /aria-label="[^"]*?(\d+\.\d+|\d+)\s*stars?[^"]*"/i,
      // Padrão data-value
      /data-value="([\d,\.]+)"/,
      // Padrões de texto visível
      /(\d+,\d+|\d+\.\d+|\d+)\s*de\s*5\s*estrelas?/i,
      /(\d+\.\d+|\d+)\s*out\s*of\s*5\s*stars?/i,
      /Avaliação:\s*(\d+,\d+|\d+\.\d+|\d+)/i,
      // Padrão span com rating
      /<span[^>]*>(\d+,\d+|\d+\.\d+|\d+)<\/span>[^<]*(?:estrelas?|stars?)/i,
      // Padrões mais gerais
      /"(\d+\.\d+|\d+,\d+)"\s*:\s*"rating"/i
    ];

    // Múltiplos padrões para extrair o número de reviews (expandidos)
    const reviewCountPatterns = [
      // Padrões JSON-LD diretos
      /"reviewCount"\s*:\s*"?(\d+)"?/,
      /"ratingCount"\s*:\s*"?(\d+)"?/,
      // Padrões em português
      /"?(\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?"[^a-zA-Z]/i,
      /(\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?\s*\)/i,
      /\((\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?\)/i,
      // Padrões em inglês
      /"?(\d{1,3}(?:[,\.]\d{3})*)\s*reviews?"[^a-zA-Z]/i,
      /(\d{1,3}(?:[,\.]\d{3})*)\s*reviews?\s*\)/i,
      /\((\d{1,3}(?:[,\.]\d{3})*)\s*reviews?\)/i,
      // Padrões mais específicos
      /baseado em (\d{1,3}(?:[,\.]\d{3})*) avaliações/i,
      /based on (\d{1,3}(?:[,\.]\d{3})*) reviews/i,
      // Padrões aria-label
      /aria-label="[^"]*?(\d{1,3}(?:[,\.]\d{3})*)\s*(?:avaliações?|reviews?)/i
    ];

    // Padrões para nome do negócio (expandidos)
    const businessNamePatterns = [
      // Title tag
      /<title[^>]*>([^<]+?)\s*[-–]\s*Google Maps<\/title>/i,
      // JSON-LD name
      /"name"\s*:\s*"([^"]+)"/,
      // Open Graph
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      // H1 tags
      /<h1[^>]*>([^<]+)<\/h1>/,
      // Data attributes
      /data-value="([^"]+)"\s+aria-label="[^"]*nome/i,
      // Alternative title patterns
      /<title[^>]*>([^<]+?)\s*\|\s*Google Maps<\/title>/i
    ];

    let rating: number | null = null;
    let reviewCount: number = 0;
    let businessName: string | undefined = undefined;

    // Tentar extrair avaliação
    console.log('Attempting to extract rating from HTML patterns...');
    for (const pattern of ratingPatterns) {
      const match = html.match(pattern);
      if (match) {
        const ratingStr = match[1] || match[2];
        if (ratingStr) {
          const parsedRating = parseFloat(ratingStr.replace(',', '.'));
          if (!isNaN(parsedRating) && parsedRating > 0 && parsedRating <= 5) {
            rating = parsedRating;
            console.log('Rating extracted:', rating, 'using pattern:', pattern.source.substring(0, 50) + '...');
            break;
          }
        }
      }
    }

    // Tentar extrair número de reviews
    console.log('Attempting to extract review count...');
    for (const pattern of reviewCountPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const countStr = match[1].replace(/[,\.]/g, '');
        const parsedCount = parseInt(countStr);
        if (!isNaN(parsedCount) && parsedCount > 0) {
          reviewCount = parsedCount;
          console.log('Review count extracted:', reviewCount, 'using pattern:', pattern.source);
          break;
        }
      }
    }

    // Tentar extrair nome do negócio
    console.log('Attempting to extract business name...');
    for (const pattern of businessNamePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name && name.length > 0 && name !== 'Google Maps') {
          businessName = name;
          console.log('Business name extracted:', businessName, 'using pattern:', pattern.source);
          break;
        }
      }
    }

    if (rating === null) {
      console.error('Could not extract rating from HTML');
      console.log('HTML length:', html.length);
      console.log('Title found:', html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'No title');
      
      // Log a sample of the HTML for debugging (first 1000 chars)
      const htmlSample = html.substring(0, 1000);
      console.log('HTML sample for debugging:', htmlSample);
      
      // Also log if we find any rating-related content
      const ratingHints = html.match(/(\d+[,\.]\d+|\d+)\s*(?:de\s*5|out\s*of\s*5|estrelas?|stars?|avaliações?|reviews?)/gi);
      if (ratingHints) {
        console.log('Rating hints found in HTML:', ratingHints.slice(0, 5));
      }
      
      throw new Error('Não foi possível extrair a avaliação. O Google Maps pode estar carregando dinamicamente. Tente um link direto do Google My Business.');
    }

    const result = {
      rating: rating,
      reviewCount: reviewCount,
      businessName: businessName
    };

    console.log('Final extracted data:', result);
    return result;

  } catch (error) {
    console.error('Error parsing Google reviews page:', error);
    throw new Error('Erro ao extrair dados das reviews. Tente novamente mais tarde.');
  }
}