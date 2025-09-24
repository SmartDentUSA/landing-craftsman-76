import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting video data migration...');

    // Get all products that might have video URLs in old fields
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('*');

    if (productsError) {
      throw productsError;
    }

    let migratedCount = 0;
    const migrationResults = [];

    for (const product of products) {
      let needsUpdate = false;
      const updates: any = {};

      // Initialize video collections if empty
      const youtubeVideos = product.youtube_videos || [];
      const instagramVideos = product.instagram_videos || [];

      // Check features array for video URLs
      if (product.features && Array.isArray(product.features)) {
        for (const feature of product.features) {
          if (typeof feature === 'string') {
            if (isYouTubeUrl(feature)) {
              if (!youtubeVideos.some((v: any) => v.url === feature)) {
                youtubeVideos.push({
                  url: feature,
                  description: 'Migrado de features'
                });
                needsUpdate = true;
              }
            } else if (isInstagramUrl(feature)) {
              if (!instagramVideos.some((v: any) => v.url === feature)) {
                instagramVideos.push({
                  url: feature,
                  description: 'Migrado de features'
                });
                needsUpdate = true;
              }
            }
          }
        }
      }

      // Check benefits array for video URLs
      if (product.benefits && Array.isArray(product.benefits)) {
        for (const benefit of product.benefits) {
          if (typeof benefit === 'string') {
            if (isYouTubeUrl(benefit)) {
              if (!youtubeVideos.some((v: any) => v.url === benefit)) {
                youtubeVideos.push({
                  url: benefit,
                  description: 'Migrado de benefits'
                });
                needsUpdate = true;
              }
            } else if (isInstagramUrl(benefit)) {
              if (!instagramVideos.some((v: any) => v.url === benefit)) {
                instagramVideos.push({
                  url: benefit,
                  description: 'Migrado de benefits'
                });
                needsUpdate = true;
              }
            }
          }
        }
      }

      // Check original_data for video URLs
      if (product.original_data && typeof product.original_data === 'object') {
        const originalData = product.original_data as any;
        
        // Check various potential fields in original_data
        const fieldsToCheck = ['youtube_url', 'instagram_url', 'video_url', 'promotional_video'];
        
        for (const field of fieldsToCheck) {
          if (originalData[field] && typeof originalData[field] === 'string') {
            const url = originalData[field];
            if (isYouTubeUrl(url)) {
              if (!youtubeVideos.some((v: any) => v.url === url)) {
                youtubeVideos.push({
                  url: url,
                  description: `Migrado de ${field}`
                });
                needsUpdate = true;
              }
            } else if (isInstagramUrl(url)) {
              if (!instagramVideos.some((v: any) => v.url === url)) {
                instagramVideos.push({
                  url: url,
                  description: `Migrado de ${field}`
                });
                needsUpdate = true;
              }
            }
          }
        }
      }

      if (needsUpdate) {
        updates.youtube_videos = youtubeVideos;
        updates.instagram_videos = instagramVideos;
        updates.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('products_repository')
          .update(updates)
          .eq('id', product.id);

        if (updateError) {
          console.error(`Failed to update product ${product.id}:`, updateError);
          migrationResults.push({
            productId: product.id,
            productName: product.name,
            success: false,
            error: updateError.message
          });
        } else {
          migratedCount++;
          migrationResults.push({
            productId: product.id,
            productName: product.name,
            success: true,
            youtubeVideosAdded: youtubeVideos.length - (product.youtube_videos?.length || 0),
            instagramVideosAdded: instagramVideos.length - (product.instagram_videos?.length || 0)
          });
          console.log(`Successfully migrated videos for product: ${product.name}`);
        }
      }
    }

    console.log(`Migration completed. ${migratedCount} products updated.`);

    return new Response(JSON.stringify({
      success: true,
      message: `Video data migration completed`,
      totalProductsChecked: products.length,
      productsUpdated: migratedCount,
      results: migrationResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in migrate-video-data function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function isYouTubeUrl(url: string): boolean {
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
    /youtube\.com/
  ];
  
  return youtubePatterns.some(pattern => pattern.test(url));
}

function isInstagramUrl(url: string): boolean {
  const instagramPatterns = [
    /instagram\.com\/reel\//,
    /instagram\.com\/p\//,
    /instagram\.com\/tv\//,
    /instagram\.com/
  ];
  
  return instagramPatterns.some(pattern => pattern.test(url));
}