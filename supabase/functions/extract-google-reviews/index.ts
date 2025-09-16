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

async function extractReviewsData(url: string): Promise<GoogleReviewsData> {
  try {
    console.log('Fetching Google Maps page...');
    
    // Fazer request para a página do Google Maps
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch page, status:', response.status);
      throw new Error('Não foi possível acessar a página do Google Maps');
    }

    const html = await response.text();
    console.log('Page fetched successfully, HTML length:', html.length);
    
    // Múltiplos padrões para extrair a avaliação
    const ratingPatterns = [
      // Padrão aria-label
      /aria-label="([^"]*?)(\d+,\d+|\d+\.\d+|\d+)\s*estrelas?[^"]*"/i,
      /aria-label="[^"]*?(\d+,\d+|\d+\.\d+|\d+)\s*de\s*5[^"]*"/i,
      // Padrão data-value
      /data-value="([\d,\.]+)"/,
      // Padrão JSON-LD
      /"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/,
      /"aggregateRating"[^}]*"ratingValue"\s*:\s*"?(\d+\.?\d*)"?/,
      // Padrões de texto visível
      /(\d+,\d+|\d+\.\d+|\d+)\s*de\s*5\s*estrelas?/i,
      /Avaliação:\s*(\d+,\d+|\d+\.\d+|\d+)/i,
      // Padrão span com rating
      /<span[^>]*>(\d+,\d+|\d+\.\d+|\d+)<\/span>[^<]*estrelas?/i
    ];

    // Múltiplos padrões para extrair o número de reviews
    const reviewCountPatterns = [
      // Padrões em português
      /"?(\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?"[^a-zA-Z]/i,
      /(\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?\s*\)/i,
      /\((\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?\)/i,
      // Padrões em inglês
      /"?(\d{1,3}(?:[,\.]\d{3})*)\s*reviews?"[^a-zA-Z]/i,
      /(\d{1,3}(?:[,\.]\d{3})*)\s*reviews?\s*\)/i,
      /\((\d{1,3}(?:[,\.]\d{3})*)\s*reviews?\)/i,
      // Padrões JSON-LD
      /"reviewCount"\s*:\s*"?(\d+)"?/,
      /"ratingCount"\s*:\s*"?(\d+)"?/
    ];

    // Padrões para nome do negócio
    const businessNamePatterns = [
      /<title[^>]*>([^<]+?)\s*[-–]\s*Google Maps<\/title>/i,
      /"name"\s*:\s*"([^"]+)"/,
      /data-value="([^"]+)"\s+aria-label="[^"]*nome/i,
      /<h1[^>]*>([^<]+)<\/h1>/
    ];

    let rating: number | null = null;
    let reviewCount: number = 0;
    let businessName: string | undefined = undefined;

    // Tentar extrair avaliação
    console.log('Attempting to extract rating...');
    for (const pattern of ratingPatterns) {
      const match = html.match(pattern);
      if (match) {
        const ratingStr = match[1] || match[2];
        if (ratingStr) {
          const parsedRating = parseFloat(ratingStr.replace(',', '.'));
          if (!isNaN(parsedRating) && parsedRating > 0 && parsedRating <= 5) {
            rating = parsedRating;
            console.log('Rating extracted:', rating, 'using pattern:', pattern.source);
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
      // Log a sample of the HTML for debugging
      const htmlSample = html.substring(0, 2000);
      console.log('HTML sample for debugging:', htmlSample);
      throw new Error('Não foi possível extrair a avaliação. Verifique se o link está correto.');
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