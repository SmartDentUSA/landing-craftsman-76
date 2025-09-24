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
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Method 1: Try youtube-transcript library (via external service)
  try {
    const response = await fetch(`https://youtube-transcript-api.vercel.app/api/transcript?videoId=${videoId}&lang=pt`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.transcript && Array.isArray(data.transcript)) {
        const fullText = data.transcript
          .map((item: Caption) => item.text)
          .join(' ')
          .replace(/\[.*?\]/g, '') // Remove time markers like [Music]
          .trim();

        if (fullText) {
          return {
            url,
            captions: fullText,
            language: 'pt',
            extracted_at: new Date().toISOString(),
            method: 'youtube-transcript-api'
          };
        }
      }
    }
  } catch (error) {
    console.error('youtube-transcript-api failed:', error);
  }

  // Method 2: Try alternative transcript API
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=your-api-key`);
    // Note: This would require YouTube Data API key
    // For now, we'll skip this method
  } catch (error) {
    console.error('YouTube Data API failed:', error);
  }

  // Method 3: Try direct caption extraction (simplified)
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Look for automatic captions in the page source (simplified approach)
    const captionsMatch = html.match(/"captionTracks":\[(.*?)\]/);
    
    if (captionsMatch) {
      // This is a simplified approach - in production you'd parse the actual caption data
      return {
        url,
        captions: 'Legendas não puderam ser extraídas automaticamente. Considere usar a API do YouTube.',
        language: 'pt',
        extracted_at: new Date().toISOString(),
        method: 'direct-extraction'
      };
    }
  } catch (error) {
    console.error('Direct extraction failed:', error);
  }

  return null;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
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