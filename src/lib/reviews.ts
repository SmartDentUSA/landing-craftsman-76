/**
 * Reviews Data Consolidation
 * Busca consolidada de reviews de todas as fontes para geração de schema
 */

import { supabase } from "@/integrations/supabase/client";
import type { UnifiedReview, ReviewSource } from "@/types/reviews";
import { sanitizeReviewData } from "./validate-jsonld";

export interface ConsolidatedReviews {
  all_reviews: UnifiedReview[];
  stats: {
    total: number;
    google_approved: number;
    manual: number;
    video_testimonial: number;
    company_manual: number;
    average_rating: number;
  };
}

/**
 * Busca todos os reviews de todas as fontes e retorna consolidado
 * @param landingPageId ID da landing page (opcional, para reviews específicos)
 * @returns Objeto com reviews consolidados e estatísticas
 */
export async function fetchAllReviewsForSchema(
  landingPageId?: string
): Promise<ConsolidatedReviews> {
  const allReviews: UnifiedReview[] = [];
  
  try {
    // 1. Buscar Google Reviews aprovados (se existir landingPageId)
    if (landingPageId) {
      const { data: googleReviews, error: googleError } = await supabase
        .from("approved_reviews")
        .select("*")
        .eq("landing_page_id", landingPageId);

      if (googleError) {
        console.error("Erro ao buscar Google reviews:", googleError);
      } else if (googleReviews) {
        googleReviews.forEach((review) => {
          const sanitized = sanitizeReviewData({
            author_name: review.raw_review_id || 'Cliente Google',
            rating: 5, // Assume 5 estrelas se aprovado
            review_text: review.notes || '',
            review_date: review.approved_at
          });
          
          allReviews.push({
            type: "google_approved",
            ...sanitized
          });
        });
      }
    }

    // 2. Buscar Reviews Manuais (se existir landingPageId)
    if (landingPageId) {
      const { data: manualReviews, error: manualError } = await supabase
        .from("manual_reviews")
        .select("*")
        .eq("landing_page_id", landingPageId)
        .eq("approved", true);

      if (manualError) {
        console.error("Erro ao buscar reviews manuais:", manualError);
      } else if (manualReviews) {
        manualReviews.forEach((review) => {
          const sanitized = sanitizeReviewData({
            author_name: review.author_name,
            rating: review.rating,
            review_text: review.review_text,
            review_date: review.created_at
          });
          
          allReviews.push({
            type: "manual",
            ...sanitized
          });
        });
      }
    }

    // 3. Buscar Video Testimonials (se existir landingPageId)
    if (landingPageId) {
      const { data: videoTestimonials, error: videoError } = await supabase
        .from("video_testimonials")
        .select("*")
        .eq("landing_page_id", landingPageId)
        .eq("approved", true);

      if (videoError) {
        console.error("Erro ao buscar vídeo depoimentos:", videoError);
      } else if (videoTestimonials) {
        videoTestimonials.forEach((testimonial) => {
          const sanitized = sanitizeReviewData({
            author_name: testimonial.client_name,
            rating: 5, // Vídeo depoimentos são sempre 5 estrelas
            review_text: testimonial.testimonial_text,
            review_date: testimonial.created_at
          });
          
          allReviews.push({
            type: "video_testimonial",
            ...sanitized,
            profession: testimonial.profession || undefined,
            location: testimonial.location || undefined,
            state: testimonial.state || undefined,
            specialty: testimonial.specialty || undefined,
            youtube_url: testimonial.youtube_url || undefined,
            instagram_url: testimonial.instagram_url || undefined
          });
        });
      }
    }

    // 4. Buscar Reviews Globais da Empresa (company_profile.company_reviews)
    const { data: companyProfile, error: companyError } = await supabase
      .from("company_profile")
      .select("company_reviews")
      .single();

    if (companyError) {
      console.error("Erro ao buscar company reviews:", companyError);
    } else if (companyProfile?.company_reviews) {
      const companyReviews = companyProfile.company_reviews as any;
      
      // Reviews manuais globais
      if (Array.isArray(companyReviews.manual_reviews)) {
        companyReviews.manual_reviews.forEach((review: any) => {
          const sanitized = sanitizeReviewData({
            author_name: review.author_name,
            rating: review.rating,
            review_text: review.review_text,
            review_date: review.review_date
          });
          
          allReviews.push({
            type: "manual",
            ...sanitized
          });
        });
      }
    }

    // Calcular estatísticas
    const stats = {
      total: allReviews.length,
      google_approved: allReviews.filter(r => r.type === "google_approved").length,
      manual: allReviews.filter(r => r.type === "manual").length,
      video_testimonial: allReviews.filter(r => r.type === "video_testimonial").length,
      company_manual: allReviews.filter(r => r.type === "manual").length,
      average_rating: allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0
    };

    console.log("✅ Reviews consolidados:", {
      total: stats.total,
      breakdown: {
        google: stats.google_approved,
        manual: stats.manual,
        video: stats.video_testimonial
      },
      avgRating: stats.average_rating.toFixed(2)
    });

    return { all_reviews: allReviews, stats };
    
  } catch (error) {
    console.error("❌ Erro ao consolidar reviews:", error);
    return {
      all_reviews: [],
      stats: {
        total: 0,
        google_approved: 0,
        manual: 0,
        video_testimonial: 0,
        company_manual: 0,
        average_rating: 0
      }
    };
  }
}
