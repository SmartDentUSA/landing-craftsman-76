/**
 * Helper para buscar dados de AggregateRating do banco de dados
 * PRIORIZA dados do Google (google_aggregate_rating) quando disponíveis
 * Fallback: calcula de approved_reviews, raw_reviews e video_testimonials
 */

export interface AggregateRatingData {
  ratingValue: string;  // Ex: "5.0"
  reviewCount: number;  // Ex: 150
  bestRating: number;   // 5
  worstRating: number;  // 1
}

// Valores padrão baseados nos dados REAIS do Google Smart Dent
const DEFAULT_RATING: AggregateRatingData = {
  ratingValue: "5.0",
  reviewCount: 698,  // ✅ CORRIGIDO: 698 avaliações reais do Google
  bestRating: 5,
  worstRating: 1
};

/**
 * Busca dados de rating agregados do banco de dados
 * PRIORIDADE:
 * 1. google_aggregate_rating do company_profile (dados do Google)
 * 2. Cálculo interno de approved_reviews + video_testimonials
 * 3. Valores padrão
 */
export async function fetchAggregateRating(supabase: any): Promise<AggregateRatingData> {
  try {
    // ✅ PRIORIDADE 1: Verificar se há dados diretos do Google no company_profile
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profile')
      .select('google_aggregate_rating, company_reviews')
      .limit(1)
      .single();

    // Se tem dados do Google configurados, usar eles
    if (!companyError && companyProfile?.google_aggregate_rating) {
      const googleData = companyProfile.google_aggregate_rating;
      if (googleData.ratingValue && googleData.reviewCount) {
        console.log(`✅ [AggregateRating] Usando dados do Google: ${googleData.ratingValue} (${googleData.reviewCount} avaliações)`);
        return {
          ratingValue: String(googleData.ratingValue),
          reviewCount: Number(googleData.reviewCount),
          bestRating: 5,
          worstRating: 1
        };
      }
    }

    // ✅ PRIORIDADE 2: Calcular de fontes internas
    const ratings: number[] = [];

    // 2a. Buscar ratings de approved_reviews via raw_reviews
    const { data: approvedReviews, error: reviewsError } = await supabase
      .from('approved_reviews')
      .select('raw_review_id, raw_reviews(rating)')
      .not('raw_reviews.rating', 'is', null);

    if (!reviewsError && approvedReviews) {
      approvedReviews.forEach((ar: any) => {
        if (ar.raw_reviews?.rating) {
          ratings.push(ar.raw_reviews.rating);
        }
      });
    }

    // 2b. FALLBACK: Se approved_reviews não retornou nada, buscar diretamente de raw_reviews
    if (ratings.length === 0) {
      const googlePlaceId = companyProfile?.company_reviews?.google_place_id;
      
      // Tentar com place_id primeiro
      if (googlePlaceId) {
        const { data: rawByPlaceId } = await supabase
          .from('raw_reviews')
          .select('rating')
          .eq('place_id', googlePlaceId)
          .not('rating', 'is', null);
        
        if (rawByPlaceId && rawByPlaceId.length > 0) {
          rawByPlaceId.forEach((r: any) => ratings.push(r.rating));
          console.log(`✅ [AggregateRating] ${rawByPlaceId.length} ratings de raw_reviews (place_id=${googlePlaceId})`);
        }
      }

      // Fallback final: todos os raw_reviews
      if (ratings.length === 0) {
        const { data: allRawReviews } = await supabase
          .from('raw_reviews')
          .select('rating')
          .not('rating', 'is', null)
          .order('extracted_at', { ascending: false })
          .limit(50);
        
        if (allRawReviews && allRawReviews.length > 0) {
          allRawReviews.forEach((r: any) => ratings.push(r.rating));
          console.log(`✅ [AggregateRating] Fallback: ${allRawReviews.length} ratings de raw_reviews (sem filtro place_id)`);
        }
      }
    }

    // 2c. Buscar video_testimonials aprovados (implícito 5 estrelas)
    const { data: videoTestimonials, error: videosError } = await supabase
      .from('video_testimonials')
      .select('id')
      .eq('approved', true);

    if (!videosError && videoTestimonials) {
      videoTestimonials.forEach(() => {
        ratings.push(5);
      });
    }

    // 2d. Buscar reviews manuais da company_profile
    if (!companyError && companyProfile?.company_reviews?.manual_reviews) {
      const manualReviews = companyProfile.company_reviews.manual_reviews;
      if (Array.isArray(manualReviews)) {
        manualReviews
          .filter((r: any) => r.approved !== false && r.rating)
          .forEach((r: any) => {
            ratings.push(r.rating);
          });
      }
    }

    // Calcular média se tiver dados
    if (ratings.length === 0) {
      console.log('ℹ️ [AggregateRating] Sem ratings no banco, usando defaults do Google (5.0 / 150)');
      return DEFAULT_RATING;
    }

    const sum = ratings.reduce((a, b) => a + b, 0);
    const avgRating = (sum / ratings.length).toFixed(1);

    console.log(`✅ [AggregateRating] ${ratings.length} ratings internos, média: ${avgRating}`);

    return {
      ratingValue: avgRating,
      reviewCount: ratings.length,
      bestRating: 5,
      worstRating: 1
    };
  } catch (error) {
    console.error('❌ [AggregateRating] Erro ao buscar ratings:', error);
    return DEFAULT_RATING;
  }
}

/**
 * Gera o objeto AggregateRating no formato Schema.org
 */
export function generateAggregateRatingSchema(data: AggregateRatingData): Record<string, any> {
  return {
    "@type": "AggregateRating",
    "ratingValue": data.ratingValue,
    "reviewCount": data.reviewCount,
    "bestRating": data.bestRating,
    "worstRating": data.worstRating
  };
}
