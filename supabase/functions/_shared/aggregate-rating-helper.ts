/**
 * Helper para buscar dados de AggregateRating do banco de dados
 * Consolida ratings de approved_reviews, raw_reviews e video_testimonials
 */

export interface AggregateRatingData {
  ratingValue: string;  // Ex: "4.8"
  reviewCount: number;  // Ex: 30
  bestRating: number;   // 5
  worstRating: number;  // 1
}

// Valores padrão caso não haja dados no banco
const DEFAULT_RATING: AggregateRatingData = {
  ratingValue: "4.8",
  reviewCount: 30,
  bestRating: 5,
  worstRating: 1
};

/**
 * Busca dados de rating agregados do banco de dados
 * Combina: approved_reviews + video_testimonials (implícito 5 estrelas)
 */
export async function fetchAggregateRating(supabase: any): Promise<AggregateRatingData> {
  try {
    const ratings: number[] = [];

    // 1. Buscar ratings de approved_reviews via raw_reviews
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

    // 2. Buscar video_testimonials aprovados (implícito 5 estrelas)
    const { data: videoTestimonials, error: videosError } = await supabase
      .from('video_testimonials')
      .select('id')
      .eq('approved', true);

    if (!videosError && videoTestimonials) {
      // Video testimonials contam como 5 estrelas
      videoTestimonials.forEach(() => {
        ratings.push(5);
      });
    }

    // 3. Buscar reviews manuais da company_profile
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profile')
      .select('company_reviews')
      .limit(1)
      .single();

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

    // Calcular média
    if (ratings.length === 0) {
      console.log('ℹ️ [AggregateRating] Sem ratings no banco, usando defaults');
      return DEFAULT_RATING;
    }

    const sum = ratings.reduce((a, b) => a + b, 0);
    const avgRating = (sum / ratings.length).toFixed(1);

    console.log(`✅ [AggregateRating] ${ratings.length} ratings encontrados, média: ${avgRating}`);

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
