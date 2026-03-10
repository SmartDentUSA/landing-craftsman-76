/**
 * Reviews Schema Generator
 * Gera JSON-LD LocalBusiness + AggregateRating + Reviews
 */

import type { UnifiedReview } from "@/types/reviews";
import type { CompanyProfileData } from "./company-profile-helper";
import { sanitizeReviewRating, truncateReviewsForSize, validateJsonLdSize } from "./validate-jsonld";
import { generateSchemaSameAs, getTrackingConfig } from "./tracking-injector";

interface ReviewsSchemaOptions {
  company_name: string;
  company_description?: string;
  website_url?: string;
  contact_phone?: string;
  contact_email?: string;
  location?: string;
  instagram_profile?: string;
  youtube_channel?: string;
  wikidata_id?: string;
  reviews: UnifiedReview[];
  maxReviews?: number;
}

/**
 * Gera schema LocalBusiness + AggregateRating + Reviews para footer
 * Função assíncrona que integra domínios SEO ao sameAs
 */
export async function generateReviewsAndLocalBusinessForFooter(
  options: ReviewsSchemaOptions
): Promise<string | null> {
  const {
    company_name,
    company_description,
    website_url,
    contact_phone,
    contact_email,
    location,
    instagram_profile,
    youtube_channel,
    reviews,
    maxReviews = 15
  } = options;

  // Validação básica
  if (!company_name || reviews.length === 0) {
    console.warn("⚠️ Schema de reviews não gerado: company_name ou reviews vazios");
    return null;
  }

  // Limitar quantidade de reviews (ordenar por rating)
  const limitedReviews = truncateReviewsForSize(reviews, maxReviews);

  // Calcular aggregate rating
  const totalRating = limitedReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = sanitizeReviewRating(totalRating / limitedReviews.length);

  // Montar schema LocalBusiness
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company_name,
  };

  // Campos opcionais
  if (company_description) schema.description = company_description;
  if (website_url) schema.url = website_url;
  if (contact_phone) schema.telephone = contact_phone;
  if (contact_email) schema.email = contact_email;
  if (location) schema.address = { "@type": "PostalAddress", addressLocality: location };

  // Same As (redes sociais + domínios SEO)
  const sameAs: string[] = [];
  if (instagram_profile) sameAs.push(instagram_profile);
  if (youtube_channel) sameAs.push(youtube_channel);
  
  // ✅ Adicionar domínios SEO ao sameAs
  try {
    const trackingConfig = await getTrackingConfig();
    const seoDomains = generateSchemaSameAs(trackingConfig);
    sameAs.push(...seoDomains);
  } catch (error) {
    console.warn('⚠️ Não foi possível carregar domínios SEO para sameAs:', error);
  }
  
  if (sameAs.length > 0) schema.sameAs = sameAs;

  // AggregateRating
  schema.aggregateRating = {
    "@type": "AggregateRating",
    ratingValue: avgRating.toFixed(1),
    reviewCount: limitedReviews.length,
    bestRating: "5",
    worstRating: "1"
  };

  // Reviews individuais com fotos
  schema.review = limitedReviews.map((review) => {
    const reviewSchema: any = {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author_name
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: sanitizeReviewRating(review.rating).toString(),
        bestRating: "5",
        worstRating: "1"
      },
      reviewBody: review.review_text || "",
      datePublished: review.review_date || new Date().toISOString()
    };
    
    // Adicionar foto do autor se disponível (melhora SEO)
    if (review.profile_photo_url && review.profile_photo_url.trim() !== '') {
      try {
        new URL(review.profile_photo_url); // Validar URL
        reviewSchema.author.image = review.profile_photo_url;
      } catch (e) {
        console.warn(`⚠️ URL de foto inválida para ${review.author_name}:`, review.profile_photo_url);
      }
    }
    
    return reviewSchema;
  });

  // Converter para JSON string
  const jsonString = JSON.stringify(schema, null, 0); // Sem indentação para economizar espaço

  // Validar tamanho
  if (!validateJsonLdSize(jsonString)) {
    console.warn("⚠️ Schema muito grande, reduzindo para 10 reviews...");
    
    // Tentar novamente com menos reviews
    const reducedReviews = truncateReviewsForSize(reviews, 10);
    schema.review = reducedReviews.map((review) => {
      const reviewSchema: any = {
        "@type": "Review",
        author: { "@type": "Person", name: review.author_name },
        reviewRating: {
          "@type": "Rating",
          ratingValue: sanitizeReviewRating(review.rating).toString(),
          bestRating: "5",
          worstRating: "1"
        },
        reviewBody: review.review_text || "",
        datePublished: review.review_date || new Date().toISOString()
      };
      
      // Adicionar foto se disponível
      if (review.profile_photo_url && review.profile_photo_url.trim() !== '') {
        try {
          new URL(review.profile_photo_url);
          reviewSchema.author.image = review.profile_photo_url;
        } catch (e) {
          // Ignorar URL inválida silenciosamente
        }
      }
      
      return reviewSchema;
    });
    
    schema.aggregateRating.reviewCount = reducedReviews.length;
    
    const reducedJsonString = JSON.stringify(schema, null, 0);
    
    if (!validateJsonLdSize(reducedJsonString)) {
      console.error("❌ Impossível gerar schema < 100KB mesmo com 10 reviews");
      return null;
    }
    
    return reducedJsonString;
  }

  console.log("✅ Schema LocalBusiness + Reviews gerado:", {
    reviewCount: limitedReviews.length,
    avgRating: avgRating.toFixed(1),
    sizeKB: (new Blob([jsonString]).size / 1024).toFixed(2)
  });

  return jsonString;
}

/**
 * Helper para gerar schema a partir de CompanyProfileData
 */
export async function generateSchemaFromCompanyProfile(
  companyData: CompanyProfileData,
  reviews: UnifiedReview[],
  maxReviews?: number
): Promise<string | null> {
  return await generateReviewsAndLocalBusinessForFooter({
    company_name: companyData.company_name,
    company_description: companyData.company_description,
    website_url: companyData.website_url,
    contact_phone: companyData.contact_phone,
    contact_email: companyData.contact_email,
    location: companyData.location,
    instagram_profile: companyData.instagram_profile,
    youtube_channel: companyData.youtube_channel,
    reviews,
    maxReviews
  });
}
