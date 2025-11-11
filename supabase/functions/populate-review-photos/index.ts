import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: Populate Review Photos
 * 
 * Popula automaticamente o campo profile_photo_url para reviews existentes
 * que ainda não possuem foto, usando ui-avatars.com como fallback.
 * 
 * Modo de uso:
 * POST /populate-review-photos
 * Body: { "dry_run": false }
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dry_run = true } = await req.json();

    console.log(`🔄 Iniciando população de fotos de reviews (dry_run: ${dry_run})`);

    // 1. Popular fotos em raw_reviews (Google Reviews)
    const { data: rawReviews, error: rawError } = await supabase
      .from('raw_reviews')
      .select('id, author_name, profile_photo_url')
      .or('profile_photo_url.is.null,profile_photo_url.eq.');

    if (rawError) throw rawError;

    console.log(`📊 Encontrados ${rawReviews?.length || 0} reviews do Google sem foto`);

    let rawUpdated = 0;
    if (!dry_run && rawReviews) {
      for (const review of rawReviews) {
        const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.author_name)}&background=4285f4&color=fff&size=128`;
        
        const { error: updateError } = await supabase
          .from('raw_reviews')
          .update({ profile_photo_url: photoUrl })
          .eq('id', review.id);

        if (!updateError) {
          rawUpdated++;
        } else {
          console.error(`❌ Erro ao atualizar raw_review ${review.id}:`, updateError);
        }
      }
    }

    // 2. Popular fotos em company_profile.company_reviews.manual_reviews
    const { data: companyProfiles, error: profileError } = await supabase
      .from('company_profile')
      .select('id, company_reviews');

    if (profileError) throw profileError;

    let manualUpdated = 0;
    if (!dry_run && companyProfiles) {
      for (const profile of companyProfiles) {
        const companyReviews = profile.company_reviews as any;
        if (!companyReviews?.manual_reviews) continue;

        let needsUpdate = false;
        const updatedManualReviews = companyReviews.manual_reviews.map((review: any) => {
          if (!review.profile_photo_url || review.profile_photo_url.trim() === '') {
            needsUpdate = true;
            manualUpdated++;
            return {
              ...review,
              profile_photo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(review.author_name)}&background=4285f4&color=fff&size=128`
            };
          }
          return review;
        });

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('company_profile')
            .update({
              company_reviews: {
                ...companyReviews,
                manual_reviews: updatedManualReviews
              }
            })
            .eq('id', profile.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar company_profile ${profile.id}:`, updateError);
          }
        }
      }
    }

    const result = {
      success: true,
      dry_run,
      stats: {
        raw_reviews_without_photo: rawReviews?.length || 0,
        raw_reviews_updated: rawUpdated,
        manual_reviews_updated: manualUpdated,
        total_updated: rawUpdated + manualUpdated
      },
      message: dry_run 
        ? `Simulação concluída. ${rawReviews?.length || 0} reviews do Google e ${manualUpdated} reviews manuais seriam atualizados.`
        : `População concluída! ${rawUpdated} reviews do Google e ${manualUpdated} reviews manuais foram atualizados com fotos.`,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Resultado:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro na população de fotos:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
