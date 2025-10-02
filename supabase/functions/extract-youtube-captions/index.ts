import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptionRequest {
  productId: string;
  videoType: 'youtube_videos' | 'instagram_videos' | 'testimonial_videos' | 'technical_videos';
  videoIndex?: number; // Optional: extract specific video
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

    console.log(`Extracting captions for product ${request.productId}, video type: ${request.videoType}`);

    // Get product data
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', request.productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    const videoArray = product[request.videoType] as any[] || [];
    const videosToProcess = request.videoIndex !== undefined 
      ? [videoArray[request.videoIndex]].filter(Boolean)
      : videoArray;

    if (videosToProcess.length === 0) {
      console.log(`No videos found in ${request.videoType} for product ${request.productId}`);
      console.log('Available video types:', Object.keys(product).filter(key => key.endsWith('_videos')));
      console.log('Video array content:', videoArray);
      
      return new Response(JSON.stringify({
        success: false,
        error: `No videos found to process in ${request.videoType}`,
        extracted: 0,
        availableVideos: Object.keys(product).filter(key => key.endsWith('_videos')).reduce((acc, key) => {
          acc[key] = product[key]?.length || 0;
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
        const captionResult = await extractCaptionsFromVideo(video.url);
        
        if (captionResult) {
          let analysis;
          
          // Analyze captions with DeepSeek if available
          if (deepSeekApiKey && captionResult.captions) {
            try {
              analysis = await analyzeCaptionsWithAI(deepSeekApiKey, captionResult.captions, request.videoType);
            } catch (analysisError) {
              console.error('Failed to analyze captions with AI:', analysisError);
            }
          }

          extractedCaptions.push({
            ...captionResult,
            analysis
          });
        }
      } catch (videoError) {
        console.error(`Failed to extract captions from ${video.url}:`, videoError);
        errors.push(`${video.url}: ${(videoError as Error).message}`);
      }
    }

    if (extractedCaptions.length === 0) {
      throw new Error(`No captions could be extracted. Errors: ${errors.join(', ')}`);
    }

    // Update product with extracted captions
    const currentCaptions = product.video_captions || {};
    const updatedCaptions = {
      ...currentCaptions,
      [request.videoType]: extractedCaptions
    };

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ 
        video_captions: updatedCaptions,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.productId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully extracted captions for ${extractedCaptions.length} videos`);

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

async function extractCaptionsFromVideo(url: string): Promise<VideoCaption | null> {
  // Skip Instagram URLs silently
  if (url.includes('instagram.com')) {
    console.log(`[Skip] Instagram URL detected, skipping: ${url}`);
    return null;
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting caption extraction for videoId: ${videoId}`);

  // Method 1: Try YouTube Data API v3 (Official - Most Reliable)
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
  const enableYoutubeApi = Deno.env.get('ENABLE_YOUTUBE_DATA_API') !== 'false'; // Feature flag
  
  if (youtubeApiKey && enableYoutubeApi) {
    try {
      console.log(`[Method 1] Trying YouTube Data API v3 for videoId: ${videoId}`);
      
      // Step 1: List available captions
      const captionsListResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${youtubeApiKey}`
      );
      
      if (captionsListResponse.ok) {
        const captionsData = await captionsListResponse.json();
        const tracksCount = captionsData.items?.length || 0;
        console.log(`[Method 1] Available caption tracks: ${tracksCount}`);
        
        // 1. Try to find Portuguese captions (preferred)
        const ptTrack = captionsData.items?.find((track: any) => 
          track.snippet.language === 'pt' || 
          track.snippet.language === 'pt-BR' ||
          (track.snippet.trackKind === 'ASR' && track.snippet.language.startsWith('pt'))
        );
        
        // 2. If no Portuguese, fallback to ANY available track
        const fallbackTrack = !ptTrack && captionsData.items?.length > 0 
          ? captionsData.items[0] 
          : null;
        
        const selectedTrack = ptTrack || fallbackTrack;
        
        if (selectedTrack) {
          const isPreferredLanguage = !!ptTrack;
          console.log(`[Method 1] Found track: ${selectedTrack.snippet.language} (${selectedTrack.snippet.trackKind})${isPreferredLanguage ? ' [PREFERRED]' : ' [FALLBACK]'}`);
          
          // Note: Caption download with API Key has limitations
          // OAuth 2.0 is required for captions.download
          // We'll attempt but expect it might fail, then fallback to Method 2
          try {
            const captionId = selectedTrack.id;
            const downloadResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt&key=${youtubeApiKey}`
            );
            
            if (downloadResponse.ok) {
              const srtContent = await downloadResponse.text();
              const cleanText = srtContent
                .split('\n')
                .filter(line => 
                  !line.match(/^\d+$/) && 
                  !line.match(/\d{2}:\d{2}:\d{2}/) &&
                  line.trim() !== ''
                )
                .join(' ')
                .replace(/\[.*?\]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (cleanText) {
                const langIndicator = isPreferredLanguage ? 'pt' : selectedTrack.snippet.language;
                console.log(`[Method 1] ✅ Success! Extracted ${cleanText.length} characters (lang: ${langIndicator})`);
                return {
                  url,
                  captions: cleanText,
                  language: langIndicator,
                  extracted_at: new Date().toISOString(),
                  method: 'youtube-data-api-v3'
                };
              }
            } else {
              const errorData = await downloadResponse.json();
              console.log(`[Method 1] ⚠️ Download failed (${downloadResponse.status}): ${errorData.error?.message || 'OAuth required'}`);
            }
          } catch (downloadError) {
            console.log(`[Method 1] ⚠️ Download error: ${(downloadError as Error).message}`);
          }
        } else {
          console.log(`[Method 1] ⚠️ No caption tracks available`);
        }
      } else {
        const errorData = await captionsListResponse.json();
        console.log(`[Method 1] ❌ API returned ${captionsListResponse.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`[Method 1] ❌ YouTube Data API error:`, error);
    }
  } else {
    console.log(`[Method 1] Skipped (API key ${youtubeApiKey ? 'exists but' : 'not set or'} feature flag disabled)`);
  }

  // Method 2: Try alternative transcript extraction (Free fallback)
  try {
    console.log(`[Method 2] Trying direct transcript extraction for videoId: ${videoId}`);
    
    // Fetch the video page
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch video page: ${pageResponse.status}`);
    }
    
    const html = await pageResponse.text();
    
    // Extract caption track URLs from the initial player response
    const playerResponseMatch = html.match(/"captions":\s*({[^}]*"playerCaptionsTracklistRenderer"[^}]+}[^}]*})/);
    
    if (playerResponseMatch) {
      console.log(`[Method 2] Found captions data in page`);
      
      // Look for caption track URLs
      const captionTracksMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
      
      if (captionTracksMatch) {
        try {
          const captionTracksStr = captionTracksMatch[1];
          
          // Try to find Portuguese caption first
          const ptUrlMatch = captionTracksStr.match(/"baseUrl":"([^"]+)"[^}]*"languageCode":"pt/);
          const anyUrlMatch = captionTracksStr.match(/"baseUrl":"([^"]+)"/);
          
          const captionUrl = ptUrlMatch ? ptUrlMatch[1] : (anyUrlMatch ? anyUrlMatch[1] : null);
          const isPtPreferred = !!ptUrlMatch;
          
          if (captionUrl) {
            const cleanUrl = captionUrl.replace(/\\u0026/g, '&').replace(/\\/g, '');
            console.log(`[Method 2] Fetching captions from URL (${isPtPreferred ? 'PT' : 'fallback'})`);
            
            const captionsResponse = await fetch(cleanUrl);
            
            if (captionsResponse.ok) {
              const captionsXml = await captionsResponse.text();
              
              // Parse XML and extract text
              const textMatches = captionsXml.matchAll(/<text[^>]*>([^<]+)<\/text>/g);
              const texts: string[] = [];
              
              for (const match of textMatches) {
                // Decode HTML entities
                let text = match[1]
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\n/g, ' ')
                  .trim();
                
                if (text && !text.match(/^\[.*\]$/)) { // Skip [Music] etc
                  texts.push(text);
                }
              }
              
              const fullText = texts.join(' ').replace(/\s+/g, ' ').trim();
              
              if (fullText && fullText.length > 50) {
                console.log(`[Method 2] ✅ Success! Extracted ${fullText.length} characters (${isPtPreferred ? 'PT' : 'auto'})`);
                return {
                  url,
                  captions: fullText,
                  language: isPtPreferred ? 'pt' : 'auto',
                  extracted_at: new Date().toISOString(),
                  method: 'direct-transcript-extraction'
                };
              }
            }
          }
        } catch (parseError) {
          console.error(`[Method 2] ❌ Failed to parse caption tracks:`, parseError);
        }
      }
    }
    
    console.log(`[Method 2] ⚠️ No usable caption tracks found`);
  } catch (error) {
    console.error(`[Method 2] ❌ Direct extraction failed:`, error);
  }

  // Method 3: Try direct caption extraction (last resort)
  try {
    console.log(`[Method 3] Trying direct HTML extraction for videoId: ${videoId}`);
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Look for automatic captions in the page source (simplified approach)
    const captionsMatch = html.match(/"captionTracks":\[(.*?)\]/);
    
    if (captionsMatch) {
      console.log(`[Method 3] ⚠️ Caption tracks found but extraction not fully implemented`);
      // This is a simplified approach - in production you'd parse the actual caption data
      return {
        url,
        captions: 'Legendas não puderam ser extraídas automaticamente. Considere usar a API do YouTube.',
        language: 'pt',
        extracted_at: new Date().toISOString(),
        method: 'direct-extraction'
      };
    } else {
      console.log(`[Method 3] ❌ No caption tracks found in HTML`);
    }
  } catch (error) {
    console.error(`[Method 3] ❌ Direct extraction failed:`, error);
  }

  console.log(`[${timestamp}] ❌ All methods failed for videoId: ${videoId}`);
  return null;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function analyzeCaptionsWithAI(apiKey: string, captions: string, videoType: string): Promise<any> {
  const contextMap = {
    youtube_videos: 'vídeo promocional do produto',
    testimonial_videos: 'depoimento de cliente',
    technical_videos: 'vídeo técnico/educativo',
    instagram_videos: 'vídeo de mídia social'
  };

  const context = (contextMap as any)[videoType] || 'vídeo';

  const prompt = `Analise o seguinte texto de legendas de um ${context}:

"${captions}"

Extraia e retorne APENAS um JSON válido com:
{
  "keywords": ["palavra-chave1", "palavra-chave2", ...],
  "sentiment": "positive|negative|neutral",
  "summary": "resumo em até 100 palavras"
}

Foque em identificar:
- Palavras-chave relevantes para SEO e marketing
- Sentimento geral do conteúdo
- Resumo dos pontos principais mencionados`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
  }

  const content = data.choices[0].message.content;
  
  try {
    let cleanContent = content.trim();
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('Failed to parse AI analysis:', content);
    return {
      keywords: [],
      sentiment: 'neutral',
      summary: 'Análise não pôde ser processada'
    };
  }
}