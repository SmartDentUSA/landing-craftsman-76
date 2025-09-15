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
    // Fazer request para a página do Google Maps
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('Não foi possível acessar a página do Google Maps');
    }

    const html = await response.text();
    
    // Extrair avaliação usando regex patterns
    const ratingMatch = html.match(/data-value="([\d,\.]+)"/);
    const reviewCountMatch = html.match(/"(\d{1,3}(?:[,\.]\d{3})*)\s*avaliações?"/) || 
                            html.match(/"(\d{1,3}(?:[,\.]\d{3})*)\s*reviews?"/) ||
                            html.match(/(\d{1,3}(?:[,\.]\d{3})*)\s*avaliações/);
    
    // Extrair nome do negócio
    const businessNameMatch = html.match(/<title[^>]*>([^<]+) - Google Maps<\/title>/) ||
                             html.match(/data-value="([^"]+)"\s+aria-label="[^"]*nome/);

    if (!ratingMatch) {
      throw new Error('Não foi possível extrair a avaliação. Verifique se o link está correto.');
    }

    const rating = parseFloat(ratingMatch[1].replace(',', '.'));
    const reviewCountStr = reviewCountMatch ? reviewCountMatch[1] : '0';
    const reviewCount = parseInt(reviewCountStr.replace(/[,\.]/g, ''));
    const businessName = businessNameMatch ? businessNameMatch[1].trim() : undefined;

    console.log('Parsed data:', { rating, reviewCount, businessName });

    return {
      rating: rating,
      reviewCount: reviewCount,
      businessName: businessName
    };

  } catch (error) {
    console.error('Error parsing Google reviews page:', error);
    throw new Error('Erro ao extrair dados das reviews. Tente novamente mais tarde.');
  }
}