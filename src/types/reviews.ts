/**
 * Reviews Types
 * Tipos para o sistema unificado de reviews (Google, Manuais, Vídeo Depoimentos)
 */

/**
 * Fontes possíveis de reviews para o sistema
 */
export type ReviewSource = "google_approved" | "manual" | "video_testimonial";

/**
 * Interface unificada para reviews de qualquer fonte
 * Usada para consolidação e geração de schema JSON-LD
 */
export interface UnifiedReview {
  type: ReviewSource;
  author_name: string;
  rating: number; // 1..5
  review_text?: string;
  review_date?: string; // ISO 8601
  
  // Campos extras para video_testimonial
  profession?: string;
  location?: string;
  state?: string;
  specialty?: string;
  youtube_url?: string;
  instagram_url?: string;
}

/**
 * Estrutura da coluna JSONB company_reviews no Supabase
 */
export interface CompanyReviewsJSONB {
  manual_reviews: Array<{
    author_name: string;
    rating: number;
    review_text: string;
    review_date?: string;
  }>;
  google_reviews_imported: boolean;
  google_place_id: string | null;
  last_google_sync: string | null; // ISO 8601
}
