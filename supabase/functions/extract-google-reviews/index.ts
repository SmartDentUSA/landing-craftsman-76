import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      url, 
      extract_individual_reviews = false,
      sync_to_company_profile = false,
      company_id = null
    } = await req.json();
    
    console.log('Extracting Google Reviews from URL:', url);

    if (!url || !isValidGoogleUrl(url)) {
      throw new Error('URL inválida. Use um link do Google Maps ou Google My Business.');
    }

    // Get auth header for OAuth credential lookup
    const authHeader = req.headers.get('Authorization');

    if (extract_individual_reviews) {
      // New functionality: extract individual reviews and save to database
      const extractionResult = await extractAndSaveReviews(
        url, 
        supabase, 
        authHeader,
        sync_to_company_profile,
        company_id
      );
      return new Response(JSON.stringify({
        success: true,
        data: extractionResult,
        extracted_at: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Original functionality: just get aggregate data
      const reviewsData = await extractReviewsData(url);
      
      console.log('Extracted reviews data:', reviewsData);

      return new Response(JSON.stringify({
        success: true,
        data: reviewsData,
        extracted_at: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error extracting Google reviews:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      extracted_at: new Date().toISOString()
    }), {
      status: 200,
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
              let tempRating = parseFloat(item.aggregateRating.ratingValue);
              let tempReviewCount = parseInt(item.aggregateRating.reviewCount);
              let tempBusinessName = item.name;
              
              if (tempRating > 0 && tempRating <= 5 && tempReviewCount > 0) {
                console.log('Successfully extracted from JSON-LD');
                return { rating: tempRating, reviewCount: tempReviewCount, businessName: tempBusinessName };
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
      
      // Return with partial data instead of throwing error
      return {
        rating: 0,
        reviewCount: reviewCount,
        businessName: businessName || 'Negócio não identificado'
      };
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

// Exchange refresh_token for access_token (Google OAuth 2.0)
async function getGoogleBusinessAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  let tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  let tokenData = await tokenResponse.json();

  // 🔥 FALLBACK: Se OAuth falhou com deleted_client ou invalid_grant, tentar env vars
  if (!tokenResponse.ok && (tokenData.error === 'deleted_client' || tokenData.error === 'invalid_grant')) {
    console.error(`❌ Token exchange failed (${tokenData.error}):`, tokenData);
    
    const envClientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
    const envClientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');
    const envRefreshToken = Deno.env.get('GOOGLE_BUSINESS_REFRESH_TOKEN');
    
    if (envClientId && envClientSecret && envRefreshToken) {
      console.log('🔄 Retrying token exchange with environment variables fallback...');
      
      tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: envClientId,
          client_secret: envClientSecret,
          refresh_token: envRefreshToken,
          grant_type: 'refresh_token',
        }),
      });
      
      tokenData = await tokenResponse.json();
      
      if (tokenResponse.ok) {
        console.log('✅ Access token obtained successfully with env vars fallback!');
        return tokenData.access_token;
      }
    }
  }

  if (!tokenResponse.ok) {
    console.error('❌ Token exchange failed:', tokenData);
    throw new Error(`Failed to exchange refresh token: ${tokenData.error_description || tokenData.error}`);
  }

  console.log('✅ Access token obtained successfully');
  return tokenData.access_token;
}

// Function to extract reviews from Google Business Profile API (Priority 1)
async function extractReviewsFromBusinessAPI(
  placeId: string,
  accessToken: string
): Promise<any[]> {
  console.log('🔵 Extracting reviews from Business Profile API...');
  
  try {
    // 1. Fetch accounts
    const accountsRes = await fetch('https://mybusiness.googleapis.com/v4/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const accountsData = await accountsRes.json();
    
    if (!accountsRes.ok || !accountsData.accounts?.length) {
      throw new Error('No Business Profile accounts found');
    }
    
    const accountId = accountsData.accounts[0].name;
    console.log('✅ Account found:', accountId);
    
    // 2. Fetch locations
    const locationsRes = await fetch(`https://mybusiness.googleapis.com/v4/${accountId}/locations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const locationsData = await locationsRes.json();
    
    if (!locationsRes.ok || !locationsData.locations?.length) {
      throw new Error('No locations found for this account');
    }
    
    const locationId = locationsData.locations[0].name;
    console.log('✅ Location found:', locationId);
    
    // 3. Fetch reviews
    const reviewsRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationId}/reviews`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const reviewsData = await reviewsRes.json();
    
    if (!reviewsRes.ok) {
      throw new Error('Failed to fetch reviews from Business API');
    }
    
    console.log(`✅ Fetched ${reviewsData.reviews?.length || 0} reviews from Business API`);
    
    return (reviewsData.reviews || []).map((r: any) => ({
      place_id: placeId,
      author_name: r.reviewer?.displayName || 'Anonymous',
      author_url: '',
      rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
      review_text: r.comment || '',
      review_date: r.createTime || new Date().toISOString(),
      relative_time: 'via Business API',
      profile_photo_url: r.reviewer?.profilePhotoUrl || '',
      response_from_owner: r.reviewReply?.comment || '',
      response_date: r.reviewReply?.updateTime || '',
      is_local_guide: false,
      review_likes: 0
    }));
  } catch (error) {
    console.error('❌ Business API extraction failed:', error);
    throw error;
  }
}

// Function to sync reviews to company_profile table
async function syncReviewsToCompanyProfile(
  supabase: any,
  userId: string,
  reviews: any[],
  placeId: string
) {
  console.log('💾 Syncing reviews to company_profile...');
  console.log(`User ID: ${userId}, Reviews: ${reviews.length}, PlaceID: ${placeId}`);
  
  const { data: profile, error: fetchError } = await supabase
    .from('company_profile')
    .select('company_reviews')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('❌ Error fetching company_profile:', fetchError);
    throw fetchError;
  }
  
  if (!profile) {
    console.error('❌ No company_profile found for user:', userId);
    throw new Error('Company profile not found');
  }
  
  const existingReviews = profile?.company_reviews || {
    manual_reviews: [],
    google_reviews_imported: false,
    google_place_id: null,
    last_google_sync: null
  };
  
  console.log('📊 Current state:', {
    manual_reviews_count: existingReviews.manual_reviews?.length || 0,
    google_imported: existingReviews.google_reviews_imported,
    place_id: existingReviews.google_place_id
  });
  
  // 🆕 SUBSTITUIR reviews do Google (não adicionar)
  const googleReviews = reviews.map(r => ({
    author_name: r.author_name,
    rating: r.rating,
    review_text: r.review_text,
    review_date: r.review_date
  }));
  
  const updatedReviews = {
    ...existingReviews,
    manual_reviews: googleReviews, // Substituir, não adicionar
    google_reviews_imported: true,
    google_place_id: placeId,
    last_google_sync: new Date().toISOString()
  };
  
  console.log('📤 Updating company_profile with:', {
    manual_reviews_count: updatedReviews.manual_reviews.length,
    place_id: updatedReviews.google_place_id
  });
  
  const { error: updateError } = await supabase
    .from('company_profile')
    .update({ company_reviews: updatedReviews })
    .eq('user_id', userId);
    
  if (updateError) {
    console.error('❌ Error updating company_profile:', updateError);
    throw updateError;
  }
  
  console.log('✅ Reviews synced to company_profile successfully');
}

// New function to extract individual reviews and save to database
async function extractAndSaveReviews(
  url: string, 
  supabase: any,
  authHeader: string | null,
  sync_to_company_profile: boolean = false,
  company_id: string | null = null
) {
  const normalizedUrl = normalizeGoogleMapsUrl(url);
  console.log('Using URL for individual extraction:', normalizedUrl);
  
  // Extract place_id from URL
  const placeIdMatch = normalizedUrl.match(/cid=([^&]+)/);
  const place_id = placeIdMatch ? placeIdMatch[1] : generatePlaceIdFromUrl(url);
  
  console.log('Extracted place_id:', place_id);

  // Create extraction job
  const { data: job, error: jobError } = await supabase
    .from('extraction_jobs')
    .insert({
      place_id,
      google_maps_url: url,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (jobError) {
    console.error('Error creating extraction job:', jobError);
    throw new Error('Falha ao criar job de extração');
  }

  console.log('Created extraction job:', job.id);

  try {
    let reviews: any[] = [];
    let businessName = '';
    
    // ✅ Try to get Google Business OAuth credentials from database first (per-user config)
    let clientId, clientSecret, refreshToken;
    let credData = null;
    let genericCred = null;
    let legacyToken = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Buscar Client ID e Secret de oauth_client_configs
        const { data: configData } = await supabase
          .from('oauth_client_configs')
          .select('client_id, client_secret')
          .eq('provider', 'googleBusiness')
          .maybeSingle();

        // Buscar Refresh Token de oauth_credentials
        const { data: credDataTemp } = await supabase
          .from('oauth_credentials')
          .select('refresh_token')
          .eq('user_id', user.id)
          .eq('provider', 'googleBusiness')
          .maybeSingle();
        
        credData = credDataTemp;

        if (configData && credData) {
          clientId = configData.client_id;
          clientSecret = configData.client_secret;
          refreshToken = credData.refresh_token;
          console.log('✅ Using Google Business credentials from database for user:', user.id);
        } else if (!credData && configData) {
          // FALLBACK 1: OAuth Google genérico (oauth_credentials)
          const { data: genericCredTemp } = await supabase
            .from('oauth_credentials')
            .select('refresh_token')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .maybeSingle();
          
          genericCred = genericCredTemp;
            
          if (genericCred) {
            clientId = configData.client_id;
            clientSecret = configData.client_secret;
            refreshToken = genericCred.refresh_token;
            console.log('⚠️ Using generic Google OAuth (not Business-specific) for user:', user.id);
          } else {
            // FALLBACK 2: Arquitetura antiga (google_oauth_tokens)
            const { data: legacyTokenTemp } = await supabase
              .from('google_oauth_tokens')
              .select('provider_refresh_token')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            legacyToken = legacyTokenTemp;
              
            if (legacyToken) {
              clientId = configData.client_id;
              clientSecret = configData.client_secret;
              refreshToken = legacyToken.provider_refresh_token;
              console.log('⚠️ Using legacy google_oauth_tokens for user:', user.id);
            }
          }
        }
      }
    }

    // Fallback to environment variables if not in database
    if (!clientId) clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    if (!clientSecret) clientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');
    if (!refreshToken) refreshToken = Deno.env.get('GOOGLE_BUSINESS_REFRESH_TOKEN');
    
    console.log('🔍 OAuth credentials check:', {
      has_client_id: !!clientId,
      has_client_secret: !!clientSecret,
      has_refresh_token: !!refreshToken,
      token_source: refreshToken ? (credData ? 'oauth_credentials_business' : (genericCred ? 'oauth_credentials_generic' : (legacyToken ? 'google_oauth_tokens_legacy' : 'env_vars'))) : 'none',
      user_id: user?.id || 'no user',
      auth_header_present: !!authHeader
    });
    
    // PRIORITY 1: Try Business Profile API (OAuth)
    if (clientId && clientSecret && refreshToken) {
      try {
        console.log('🥇 Attempting Business Profile API extraction...');
        const accessToken = await getGoogleBusinessAccessToken(clientId, clientSecret, refreshToken);
        reviews = await extractReviewsFromBusinessAPI(place_id, accessToken);
        console.log('✅ Business API extraction successful');
      } catch (error) {
        console.log('⚠️ Business API failed, trying fallback methods...', error);
      }
    } else {
      console.log('ℹ️ Google Business OAuth credentials not configured, using web scraping');
    }
    
    // PRIORITY 2 & 3: Fallback to web scraping if Business API failed
    if (reviews.length === 0) {
      console.log('🥈 Attempting web scraping extraction...');
      
      // User-Agents rotativos para melhorar scraping
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': randomUA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate'
      }
    });

    if (!response.ok) {
      throw new Error(`Falha ao acessar a página: ${response.status}`);
    }

      const html = await response.text();
      console.log('Fetched page, HTML length:', html.length);

      // Extract business name using existing logic
      const businessNamePatterns = [
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)</i
      ];

      for (const pattern of businessNamePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          businessName = match[1].trim();
          console.log('Business name extracted:', businessName);
          break;
        }
      }

      // Extract individual reviews from the current page
      reviews = extractIndividualReviews(html, place_id);
      console.log(`Extracted ${reviews.length} individual reviews`);
    }

    // Save reviews to database
    let savedCount = 0;
    for (const review of reviews) {
      try {
        const { error: reviewError } = await supabase
          .from('raw_reviews')
          .insert(review);

        if (!reviewError) {
          savedCount++;
        } else {
          console.error('Error saving review:', reviewError);
        }
      } catch (e) {
        console.error('Error processing review:', e);
      }
    }

    // Sync to company_profile if requested
    console.log('🔍 DEBUG - Sync check:', {
      sync_to_company_profile,
      company_id,
      reviews_count: reviews.length,
      will_sync: !!(sync_to_company_profile && company_id)
    });

    if (sync_to_company_profile && company_id) {
      console.log('✅ Starting sync to company_profile...');
      await syncReviewsToCompanyProfile(supabase, company_id, reviews, place_id);
      console.log('✅ Sync completed successfully');
    }

    // Update extraction job
    await supabase
      .from('extraction_jobs')
      .update({
        business_name: businessName,
        total_reviews_found: reviews.length,
        reviews_extracted: savedCount,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    return {
      place_id,
      business_name: businessName,
      reviews_extracted: savedCount,
      total_found: reviews.length,
      extraction_job_id: job.id
    };

  } catch (error) {
    console.error('Error in extraction:', error);
    
    // Update job with error
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'failed',
        error_message: (error as Error).message,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    throw error;
  }
}

// Extract individual reviews from HTML
function extractIndividualReviews(html: string, place_id: string) {
  const reviews = [];
  
  try {
    // Try to extract real reviews from Google Maps HTML
    // Look for review data in JSON-LD or data attributes
    const jsonLdMatches = html.match(/"@type":"Review"[^}]*}(?:[^}]*})*}/g);
    
    if (jsonLdMatches && jsonLdMatches.length > 0) {
      console.log(`Found ${jsonLdMatches.length} potential JSON-LD reviews`);
      
      for (const match of jsonLdMatches.slice(0, 20)) { // Limit to 20 reviews
        try {
          const reviewData = JSON.parse(`{${match}}`);
          if (reviewData.author && reviewData.reviewRating) {
            reviews.push({
              place_id,
              author_name: reviewData.author.name || 'Usuário anônimo',
              author_url: reviewData.author.url || '',
              rating: reviewData.reviewRating.ratingValue || 5,
              review_text: reviewData.reviewBody || '',
              review_date: reviewData.datePublished || new Date().toISOString(),
              relative_time: reviewData.datePublished ? getRelativeTime(reviewData.datePublished) : 'recente',
              profile_photo_url: reviewData.author.image || '',
              response_from_owner: '',
              response_date: '',
              is_local_guide: false,
              review_likes: 0
            });
          }
        } catch (e) {
          console.log('Error parsing review JSON:', e);
        }
      }
    }
    
    // If no JSON-LD reviews found, try alternative extraction methods
    if (reviews.length === 0) {
      // Look for review containers in HTML
      const reviewRegex = /<div[^>]*data-review-id[^>]*>.*?<\/div>/gs;
      const reviewMatches = html.match(reviewRegex);
      
      if (reviewMatches) {
        console.log(`Found ${reviewMatches.length} review containers`);
        
        for (const reviewHtml of reviewMatches.slice(0, 20)) {
          const authorMatch = reviewHtml.match(/aria-label="([^"]*?)"/);
          const ratingMatch = reviewHtml.match(/aria-label="([^"]*?)\s*estrelas?"/i);
          const textMatch = reviewHtml.match(/<span[^>]*>(.*?)<\/span>/s);
          
          if (authorMatch) {
            reviews.push({
              place_id,
              author_name: authorMatch[1] || 'Usuário anônimo',
              author_url: '',
              rating: ratingMatch ? parseInt(ratingMatch[1]) || 5 : 5,
              review_text: textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '',
              review_date: new Date().toISOString(),
              relative_time: 'recente',
              profile_photo_url: '',
              response_from_owner: '',
              response_date: '',
              is_local_guide: false,
              review_likes: 0
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.log('Error extracting real reviews:', error);
  }
  
  console.log(`Extracted ${reviews.length} reviews for place_id: ${place_id}`);
  return reviews;
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'hoje';
    if (diffInDays === 1) return 'há 1 dia';
    if (diffInDays < 7) return `há ${diffInDays} dias`;
    if (diffInDays < 30) return `há ${Math.floor(diffInDays / 7)} semana${Math.floor(diffInDays / 7) > 1 ? 's' : ''}`;
    return `há ${Math.floor(diffInDays / 30)} mês${Math.floor(diffInDays / 30) > 1 ? 'es' : ''}`;
  } catch (e) {
    return 'recente';
  }
}

function generatePlaceIdFromUrl(url: string): string {
  // Create a consistent place_id from URL if CID is not available
  const hash = url.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `generated_${Math.abs(hash)}`;
}