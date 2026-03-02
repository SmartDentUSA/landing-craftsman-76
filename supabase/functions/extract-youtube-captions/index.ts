import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptionRequest {
  // Legacy support
  productId?: string;
  
  // New generic approach
  entityType?: 'product' | 'company' | 'testimonial';
  entityId?: string;
  
  videoType: 'youtube_videos' | 'instagram_videos' | 'testimonial_videos' | 'technical_videos';
  videoIndex?: number;
  regenerateAnalysis?: {
    videoUrl: string;
    captionText: string;
  };
}

interface Caption {
  text: string;
  start: number;
  duration: number;
}

interface VideoCaption {
  url: string;
  captions: string;
  language: string;
  extracted_at: string;
  method: string;
  analysis?: {
    keywords: string[];
    sentiment: string;
    summary: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: CaptionRequest = await req.json();

    // Backward compatibility
    const entityType = request.entityType || 'product';
    const entityId = request.entityId || request.productId;

    if (!entityId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'entityId or productId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Extracting captions for ${entityType} ${entityId}, video type: ${request.videoType}`);

    // ✅ FASE 1: Modo de regeneração de análise
    if (request.regenerateAnalysis) {
      console.log('🔄 Modo de regeneração de análise ativado');
      
      if (!deepSeekApiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: 'DEEPSEEK_API_KEY não configurada'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Criar objeto de legenda temporário para análise
      const tempCaption: VideoCaption = {
        url: request.regenerateAnalysis.videoUrl,
        captions: request.regenerateAnalysis.captionText,
        language: 'auto',
        extracted_at: new Date().toISOString(),
        method: 'manual_edit'
      };
      
      try {
        const analysis = await analyzeCaptionsWithAI(
          deepSeekApiKey,
          request.regenerateAnalysis.captionText,
          request.videoType
        );
        
        console.log('✅ Análise regenerada com sucesso:', analysis);
        
        return new Response(JSON.stringify({
          success: true,
          analysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Erro ao regenerar análise:', error);
        return new Response(JSON.stringify({
          success: false,
          error: (error as Error).message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 🔥 PRIORIDADE 1: Environment Variables
    let youtubeClientId = Deno.env.get('YOUTUBE_CLIENT_ID');
    let youtubeClientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
    let youtubeRefreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');
    let tokenSource = 'environment_variables';

    // 🔄 FALLBACK: Database (oauth_credentials table only)
    if (!youtubeClientId || !youtubeClientSecret || !youtubeRefreshToken) {
      const authHeader = req.headers.get('Authorization');
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          // Buscar Client ID/Secret de oauth_client_configs
          const { data: configData } = await supabase
            .from('oauth_client_configs')
            .select('client_id, client_secret')
            .eq('provider', 'youtube')
            .maybeSingle();
          
          // Buscar Refresh Token em oauth_credentials
          const { data: credData } = await supabase
            .from('oauth_credentials')
            .select('refresh_token')
            .eq('user_id', user.id)
            .eq('provider', 'youtube')
            .maybeSingle();
          
          if (configData && credData) {
            if (!youtubeClientId) youtubeClientId = configData.client_id;
            if (!youtubeClientSecret) youtubeClientSecret = configData.client_secret;
            if (!youtubeRefreshToken) youtubeRefreshToken = credData.refresh_token;
            tokenSource = 'oauth_credentials_database';
            console.log('✅ Using YouTube credentials from oauth_credentials table');
          }
        }
      }
    }

    console.log('🔍 YouTube OAuth check:', {
      has_client_id: !!youtubeClientId,
      has_client_secret: !!youtubeClientSecret,
      has_refresh_token: !!youtubeRefreshToken,
      token_source: tokenSource
    });

    // Fetch entity data based on type
    let entityData: any;
    let currentUpdatedAt: string;
    let videoArray: any[];
    let captionsFieldPath: string;

    if (entityType === 'product') {
      const { data: product, error: productError } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', entityId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      entityData = product;
      currentUpdatedAt = product.updated_at;
      videoArray = Array.isArray(product[request.videoType]) ? product[request.videoType] : [];
      captionsFieldPath = 'video_captions';
    } else if (entityType === 'company') {
      const { data: company, error: companyError } = await supabase
        .from('company_profile')
        .select('*')
        .single();

      if (companyError || !company) {
        throw new Error('Company profile not found');
      }

      entityData = company;
      currentUpdatedAt = company.updated_at;
      const companyVideos = company.company_videos || {};
      videoArray = Array.isArray(companyVideos[request.videoType]) ? companyVideos[request.videoType] : [];
      captionsFieldPath = 'company_videos.captions';
    } else if (entityType === 'testimonial') {
      const { data: testimonial, error: testimonialError } = await supabase
        .from('video_testimonials')
        .select('*')
        .eq('id', entityId)
        .single();

      if (testimonialError || !testimonial) {
        throw new Error('Video testimonial not found');
      }

      entityData = testimonial;
      currentUpdatedAt = testimonial.updated_at;
      // For testimonials, we only have youtube_url
      videoArray = testimonial.youtube_url ? [{ url: testimonial.youtube_url }] : [];
      captionsFieldPath = 'caption_data';
    } else {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    const videosToProcess = request.videoIndex !== undefined 
      ? [videoArray[request.videoIndex]].filter(Boolean)
      : videoArray;

    if (videosToProcess.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `No videos found to process in ${request.videoType}`,
        extracted: 0,
        availableVideos: Object.keys(product)
          .filter(key => key.endsWith('_videos'))
          .reduce((acc, key) => {
            acc[key] = Array.isArray(product[key]) ? product[key].length : 0;
            return acc;
          }, {} as any)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extractedCaptions: VideoCaption[] = [];
    const errors: string[] = [];

    for (const video of videosToProcess) {
      if (!video?.url) continue;

      try {
        const captionResult = await extractCaptionsFromVideo(
          video.url,
          youtubeClientId,
          youtubeClientSecret,
          youtubeRefreshToken
        );
        
        if (captionResult) {
          let analysis;
          if (deepSeekApiKey && captionResult.captions) {
            try {
              analysis = await analyzeCaptionsWithAI(deepSeekApiKey, captionResult.captions, request.videoType);
            } catch (analysisError) {
              console.error('Failed to analyze captions with AI:', analysisError);
            }
          }
          
          // Truncate logs for security
          const truncatedCaptions = captionResult.captions.length > 200 
            ? captionResult.captions.substring(0, 200) + '... [truncated]'
            : captionResult.captions;
          console.log(`✅ Extracted ${captionResult.captions.length} chars: ${truncatedCaptions}`);
          
          extractedCaptions.push({ ...captionResult, analysis });
        }
      } catch (videoError) {
        console.error(`Failed to extract captions from ${video.url}:`, videoError);
        errors.push(`${video.url}: ${(videoError as Error).message}`);
      }
    }

    if (extractedCaptions.length === 0) {
      throw new Error(`No captions could be extracted. Errors: ${errors.join(', ')}`);
    }

    // ✅ Intelligent merge and save based on entity type
    let updatedRows: any;
    let updateError: any;

    if (entityType === 'product') {
      const currentCaptions = entityData.video_captions || {};
      const existingCaptions: VideoCaption[] = Array.isArray(currentCaptions[request.videoType])
        ? currentCaptions[request.videoType]
        : [];
      
      const mergedCaptions = mergeCaptionsByUrl(existingCaptions, extractedCaptions);
      
      const updatedCaptions = {
        ...currentCaptions,
        [request.videoType]: mergedCaptions
      };

      const result = await supabase
        .from('products_repository')
        .update({ 
          video_captions: updatedCaptions,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)
        .eq('updated_at', currentUpdatedAt)
        .select('id');

      updatedRows = result.data;
      updateError = result.error;
    } else if (entityType === 'company') {
      const companyVideos = entityData.company_videos || {};
      const currentCaptions = companyVideos.captions || {};
      const existingCaptions: VideoCaption[] = Array.isArray(currentCaptions[request.videoType])
        ? currentCaptions[request.videoType]
        : [];
      
      const mergedCaptions = mergeCaptionsByUrl(existingCaptions, extractedCaptions);
      
      const updatedCompanyVideos = {
        ...companyVideos,
        captions: {
          ...currentCaptions,
          [request.videoType]: mergedCaptions
        }
      };

      const result = await supabase
        .from('company_profile')
        .update({ 
          company_videos: updatedCompanyVideos,
          updated_at: new Date().toISOString()
        })
        .eq('updated_at', currentUpdatedAt)
        .select('id');

      updatedRows = result.data;
      updateError = result.error;
    } else if (entityType === 'testimonial') {
      // For testimonials, store caption in caption_data field
      const captionData = extractedCaptions[0] || null;

      const result = await supabase
        .from('video_testimonials')
        .update({ 
          caption_data: captionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)
        .eq('updated_at', currentUpdatedAt)
        .select('id');

      updatedRows = result.data;
      updateError = result.error;
    }

    if (updateError) throw updateError;
    
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} was modified by another request. Please retry.`);
    }

    return new Response(JSON.stringify({
      success: true,
      extracted: extractedCaptions.length,
      errors: errors.length > 0 ? errors : undefined,
      captions: extractedCaptions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-youtube-captions function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ✅ Helper: Merge captions by URL (intelligent merge)
function mergeCaptionsByUrl(existing: VideoCaption[], incoming: VideoCaption[]): VideoCaption[] {
  const byUrl = new Map<string, VideoCaption>();
  
  // Add existing captions
  for (const caption of existing) {
    byUrl.set(caption.url, caption);
  }
  
  // Override with incoming captions (same URL = update)
  for (const caption of incoming) {
    byUrl.set(caption.url, caption);
  }
  
  return Array.from(byUrl.values());
}

// ✅ Helper: Decode unicode escapes (\uXXXX)
function decodeUnicodeEscapes(input: string): string {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => 
    String.fromCharCode(parseInt(code, 16))
  );
}

// ✅ Helper: Decode HTML entities (named, decimal, hexadecimal)
function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
    'apos': "'"
  };
  
  return input
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
      if (entity[0] === '#') {
        const isHex = entity[1]?.toLowerCase() === 'x';
        const num = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        if (!isNaN(num)) return String.fromCodePoint(num);
        return match;
      } else {
        return named[entity] || match;
      }
    })
    .replace(/&#39;/g, "'");
}

/**
 * Trunca legendas para logs limpos (max 200 chars)
 */
function logCaptionPreview(captions: string, maxLength: number = 200): string {
  if (!captions || captions.length <= maxLength) {
    return captions;
  }
  return captions.substring(0, maxLength) + "... [truncated]";
}

/**
 * OAuth 2.0: Obtém access_token a partir do refresh_token
 */
async function getAccessTokenFromRefresh(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: 'unknown', error_description: errorText };
    }
    
    // 🔒 Criar erro tipado para detectar deleted_client/invalid_grant
    const error: any = new Error(`Failed to refresh access token: ${errorText}`);
    error.oauth_error = errorData.error;
    error.oauth_description = errorData.error_description;
    throw error;
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * OAuth 2.0: Download de legendas via captions.download endpoint
 * ✅ COM FALLBACK AUTOMÁTICO para env vars se OAuth falhar com deleted_client
 */
async function downloadCaptionsOAuth(
  videoId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ captions: string; language: string }> {
  try {
    // 1. Obter access token
    const accessToken = await getAccessTokenFromRefresh(clientId, clientSecret, refreshToken);

    // 2. Listar caption tracks
    const listUrl = `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet`;
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      throw new Error(`Failed to list captions: ${error}`);
    }

    const listData = await listResponse.json();
    const tracks = listData.items || [];

    if (tracks.length === 0) {
      throw new Error("No caption tracks available");
    }

    // 3. Priorizar legendas (pt-BR > pt > en > primeiro disponível)
    const prioritizedTrack =
      tracks.find((t: any) => t.snippet.language === "pt-BR") ||
      tracks.find((t: any) => t.snippet.language === "pt") ||
      tracks.find((t: any) => t.snippet.language === "en") ||
      tracks[0];

    const captionId = prioritizedTrack.id;
    const language = prioritizedTrack.snippet.language;

    console.info(`[Method 1] Selected track: ${language} (id: ${captionId})`);

    // 4. Download da legenda
    const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`;
    const downloadResponse = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!downloadResponse.ok) {
      const error = await downloadResponse.text();
      throw new Error(`Failed to download captions: ${error}`);
    }

    const captionsText = await downloadResponse.text();
    return { captions: captionsText, language };
    
  } catch (error: any) {
    // 🔥 FALLBACK: Se OAuth falhou com deleted_client ou invalid_grant, tentar env vars
    if (error.oauth_error === 'deleted_client' || error.oauth_error === 'invalid_grant') {
      console.log(`[Method 1] ⚠️ OAuth error (${error.oauth_error}), trying env vars fallback...`);
      
      const envClientId = Deno.env.get('YOUTUBE_CLIENT_ID');
      const envClientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
      const envRefreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');
      
      if (envClientId && envClientSecret && envRefreshToken) {
        console.log('[Method 1] 🔄 Retrying with environment variables...');
        
        // Tentar novamente com env vars
        const accessToken = await getAccessTokenFromRefresh(envClientId, envClientSecret, envRefreshToken);
        
        const listUrl = `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=snippet`;
        const listResponse = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!listResponse.ok) {
          const error = await listResponse.text();
          throw new Error(`Failed to list captions (env fallback): ${error}`);
        }

        const listData = await listResponse.json();
        const tracks = listData.items || [];

        if (tracks.length === 0) {
          throw new Error("No caption tracks available (env fallback)");
        }

        const prioritizedTrack =
          tracks.find((t: any) => t.snippet.language === "pt-BR") ||
          tracks.find((t: any) => t.snippet.language === "pt") ||
          tracks.find((t: any) => t.snippet.language === "en") ||
          tracks[0];

        const captionId = prioritizedTrack.id;
        const language = prioritizedTrack.snippet.language;

        console.info(`[Method 1 - ENV FALLBACK] ✅ Selected track: ${language}`);

        const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`;
        const downloadResponse = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!downloadResponse.ok) {
          const error = await downloadResponse.text();
          throw new Error(`Failed to download captions (env fallback): ${error}`);
        }

        const captionsText = await downloadResponse.text();
        console.log('[Method 1 - ENV FALLBACK] ✅ Captions downloaded successfully!');
        return { captions: captionsText, language };
      }
    }
    
    // Se não conseguiu fazer fallback, propagar erro original
    throw error;
  }
}

async function extractCaptionsFromVideo(
  url: string,
  youtubeClientId?: string,
  youtubeClientSecret?: string,
  youtubeRefreshToken?: string
): Promise<VideoCaption | null> {
  // Skip Instagram URLs
  if (url.includes('instagram.com')) {
    console.log(`[Skip] Instagram URL detected, skipping: ${url}`);
    return null;
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting caption extraction for videoId: ${videoId}`);

  // Method 1: YouTube OAuth 2.0 captions.download (official method)
  if (youtubeClientId && youtubeClientSecret && youtubeRefreshToken) {
    try {
      console.log(`[Method 1] Trying YouTube OAuth captions.download for videoId: ${videoId}`);
      
      const { captions: srtContent, language } = await downloadCaptionsOAuth(
        videoId,
        youtubeClientId,
        youtubeClientSecret,
        youtubeRefreshToken
      );
      
      // Clean SRT format
      const cleanText = srtContent
        .split('\n')
        .filter(line => !line.match(/^\d+$/) && !line.match(/\d{2}:\d{2}:\d{2}/))
        .join(' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length > 50) {
        console.log(`[Method 1] ✅ Success! Extracted ${cleanText.length} characters via OAuth`);
        console.log(`[Method 1] Preview: ${logCaptionPreview(cleanText)}`);
        
        return {
          url,
          captions: cleanText,
          language,
          extracted_at: new Date().toISOString(),
          method: 'youtube-oauth-captions'
        };
      }
    } catch (oauthError) {
      console.log(`[Method 1] ⚠️ OAuth error:`, (oauthError as Error).message);
    }
  }

  // ✅ Method 2: Direct extraction via ytInitialPlayerResponse + JSON.parse (robust)
  try {
    console.log(`[Method 2] Trying ytInitialPlayerResponse JSON parsing for videoId: ${videoId}`);
    
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch video page: ${pageResponse.status}`);
    }
    
    const html = await pageResponse.text();

    // Extract ytInitialPlayerResponse JSON
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!playerResponseMatch) {
      throw new Error("ytInitialPlayerResponse not found in page");
    }

    // ✅ Parse JSON instead of using regex
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    
    // Handle different caption renderer formats
    const captionsRoot = playerResponse?.captions?.playerCaptionsTracklistRenderer 
      ?? playerResponse?.captions?.playerCaptionsRenderer;
    
    const captionTracks: any[] = captionsRoot?.captionTracks ?? [];
    
    if (!captionTracks.length) {
      throw new Error("No caption tracks found in playerResponse");
    }

    console.log(`[Method 2] Found ${captionTracks.length} caption tracks`);

    // Prefer PT/pt-BR tracks
    let track = captionTracks.find((t) => 
      t?.languageCode === 'pt' || t?.languageCode === 'pt-BR'
    ) ?? captionTracks[0];

    if (!track?.baseUrl) {
      throw new Error("Caption track has no baseUrl");
    }

    // ✅ Decode unicode escapes comprehensively
    const cleanUrl = decodeUnicodeEscapes(String(track.baseUrl));
    
    console.log(`[Method 2] Fetching captions from: ${cleanUrl.substring(0, 100)}...`);

    const captionsResponse = await fetch(cleanUrl);
    if (!captionsResponse.ok) {
      throw new Error(`Failed to fetch captions XML: ${captionsResponse.status}`);
    }

    const captionsXml = await captionsResponse.text();

    // ✅ Robust XML parsing with multiline support
    const textMatches = captionsXml.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
    const texts: string[] = [];

    for (const match of textMatches) {
      let raw = match[1] ?? '';
      // ✅ Decode HTML entities (named, decimal, hexadecimal)
      let text = decodeHtmlEntities(raw).replace(/\n/g, ' ').trim();

      // Ignore markers like [Music], [Applause]
      if (text && !/^\[.*\]$/.test(text)) {
        texts.push(text);
      }
    }

    const fullText = texts.join(' ').replace(/\s+/g, ' ').trim();

    if (fullText.length > 50) {
      console.log(`[Method 2] ✅ Success! Extracted ${fullText.length} characters`);
      console.log(`[Method 2] Preview: ${logCaptionPreview(fullText)}`);
      
      return {
        url,
        captions: fullText,
        language: track.languageCode || 'auto',
        extracted_at: new Date().toISOString(),
        method: 'direct-playerResponse-json',
      };
    } else {
      throw new Error("Extracted text too short");
    }
  } catch (error) {
    console.error(`[Method 2] ❌ Failed:`, (error as Error).message);
  }

  // Method 3: Fallback (doesn't extract, but doesn't break flow)
  console.log(`[Method 3] ❌ All methods failed for videoId: ${videoId}`);
  return {
    url,
    captions: 'Legendas não puderam ser extraídas automaticamente. Considere usar a API do YouTube.',
    language: 'unknown',
    extracted_at: new Date().toISOString(),
    method: 'direct-extraction-fallback'
  };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function analyzeCaptionsWithAI(apiKey: string, captions: string, videoType: string): Promise<any> {
  const contextMap: Record<string, string> = {
    'youtube_videos': 'vídeo promocional do produto',
    'testimonial_videos': 'depoimento de cliente',
    'technical_videos': 'vídeo técnico/educativo',
    'instagram_videos': 'vídeo de mídia social'
  };
  
  const context = contextMap[videoType] || 'vídeo';

  const prompt = `Analise o seguinte texto de legendas de um ${context}:

"${captions}"

Extraia e retorne APENAS um JSON válido com:
{
  "keywords": ["palavra-chave1", "palavra-chave2", ...],
  "sentiment": "positive|negative|neutral",
  "summary": "resumo em até 100 palavras"
}`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
  }

  // Track AI token usage
  try {
    const { trackFromResponse } = await import('../_shared/track-ai-usage.ts');
    await trackFromResponse(data, 'extract-youtube-captions', `Análise ${videoType}`);
  } catch (trackErr) {
    console.warn('[extract-youtube-captions] Tracking error:', trackErr);
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  
  let parsed: any;
  try {
    let clean = content.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    parsed = JSON.parse(clean);
  } catch {
    parsed = {};
  }

  // ✅ Validate and sanitize AI response
  const keywords = Array.isArray(parsed.keywords) 
    ? parsed.keywords.filter((x: any) => typeof x === 'string')
    : [];
  
  const sentimentRaw = (parsed.sentiment || 'neutral').toString().toLowerCase();
  const sentiment: 'positive' | 'negative' | 'neutral' = 
    sentimentRaw === 'positive' || sentimentRaw === 'negative' 
      ? sentimentRaw 
      : 'neutral';
  
  const summary = typeof parsed.summary === 'string'
    ? parsed.summary.trim().slice(0, 1000)
    : 'Análise não pôde ser processada';

  return { keywords, sentiment, summary };
}
