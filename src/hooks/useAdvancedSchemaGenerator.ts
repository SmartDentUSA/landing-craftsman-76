import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProductData {
  id: string;
  name: string;
  description?: string;
  sales_pitch?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  category?: string;
  subcategory?: string;
  features?: string[];
  benefits?: string[];
  target_audience?: string[];
  tags?: string[];
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
  video_captions?: any;
  offer_discount_cta?: any;
  resource_cta1?: any;
  resource_cta2?: any;
  resource_cta3?: any;
  youtube_videos?: string[];
  instagram_videos?: string[];
  technical_videos?: string[];
  testimonial_videos?: string[];
}

interface CompanyData {
  company_name?: string;
  company_description?: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  seo_context_keywords?: string[];
  seo_market_positioning?: string;
  seo_competitive_advantages?: string;
  seo_technical_expertise?: string;
  seo_service_areas?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ReviewData {
  author_name: string;
  rating: number;
  review_text?: string;
}

export const useAdvancedSchemaGenerator = () => {
  const { toast } = useToast();

  // Gerar Schema de Produto único com TODOS os campos
  const generateAdvancedProductSchema = useCallback((product: ProductData, companyData?: CompanyData) => {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "identifier": product.id,
      "description": product.description || product.sales_pitch || `${product.name} - Solução de qualidade`
    };

    // ✨ Preço e ofertas comerciais COMPLETAS
    if (product.price && product.price > 0) {
      schema.offers = {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": product.currency || "BRL",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      // Oferta especial com desconto
      if (product.offer_discount_cta && typeof product.offer_discount_cta === 'object') {
        const cta = product.offer_discount_cta as any;
        if (cta.url) schema.offers.url = cta.url;
        if (cta.label) schema.offers.description = cta.label;
      }
    }

    // ✨ Imagem do produto
    if (product.image_url) {
      schema.image = product.image_url;
    }

    // ✨ Categoria hierárquica completa
    if (product.category) {
      schema.category = product.subcategory 
        ? `${product.category} > ${product.subcategory}`
        : product.category;
    }

    // ✨ Features como PropertyValue
    if (product.features && product.features.length > 0) {
      schema.additionalProperty = product.features.map(feature => ({
        "@type": "PropertyValue",
        "name": "Feature",
        "value": feature
      }));
    }

    // ✨ Benefits integrados na descrição
    if (product.benefits && product.benefits.length > 0) {
      schema.description += ` Principais benefícios: ${product.benefits.join(', ')}.`;
    }

    // ✨ Target audience
    if (product.target_audience && product.target_audience.length > 0) {
      schema.audience = {
        "@type": "Audience",
        "audienceType": product.target_audience.join(', ')
      };
    }

    // ✨ Vídeos associados
    const videos = [
      ...(product.youtube_videos || []),
      ...(product.instagram_videos || []),
      ...(product.technical_videos || []),
      ...(product.testimonial_videos || [])
    ].filter(Boolean);

    if (videos.length > 0) {
      schema.video = videos.map(url => ({
        "@type": "VideoObject",
        "contentUrl": url,
        "name": `${product.name} - Vídeo Demonstrativo`
      }));
    }

    // ✨ Marca/Empresa
    if (companyData?.company_name) {
      schema.brand = {
        "@type": "Brand",
        "name": companyData.company_name
      };
    }

    // ✨ Keywords como tags
    const allKeywords = [
      ...(product.keywords || []),
      ...(product.market_keywords || []),
      ...(product.search_intent_keywords || []),
      ...(product.tags || [])
    ].filter(Boolean);

    if (allKeywords.length > 0) {
      schema.keywords = allKeywords.join(', ');
    }

    return schema;
  }, []);

  // Gerar Schema de FAQ automático
  const generateFAQSchema = useCallback((faqItems: FAQItem[]) => {
    if (!faqItems || faqItems.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }, []);

  // Gerar Schema de Reviews automático
  const generateReviewsSchema = useCallback((reviews: ReviewData[], productName?: string) => {
    if (!reviews || reviews.length === 0) return null;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": productName || "Nossos Produtos",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": averageRating.toFixed(1),
        "reviewCount": reviews.length,
        "bestRating": "5",
        "worstRating": "1"
      },
      "review": reviews.slice(0, 10).map(review => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.author_name
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": "5"
        },
        "reviewBody": review.review_text || "Experiência positiva"
      }))
    };
  }, []);

  // Gerar Schema de LocalBusiness
  const generateLocalBusinessSchema = useCallback((companyData: CompanyData) => {
    if (!companyData.company_name) return null;

    const schema: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": companyData.company_name,
      "description": companyData.company_description || `${companyData.company_name} - Empresa especializada em soluções de qualidade`
    };

    if (companyData.location) {
      schema.address = {
        "@type": "PostalAddress",
        "addressLocality": companyData.location
      };
    }

    if (companyData.contact_phone) {
      schema.telephone = companyData.contact_phone;
    }

    if (companyData.contact_email) {
      schema.email = companyData.contact_email;
    }

    if (companyData.website_url) {
      schema.url = companyData.website_url;
    }

    // ✨ SEO Hidden fields para especialização
    if (companyData.seo_service_areas) {
      schema.areaServed = companyData.seo_service_areas;
    }

    if (companyData.seo_technical_expertise) {
      schema.knowsAbout = companyData.seo_technical_expertise;
    }

    return schema;
  }, []);

  // Combinar TODOS os schemas em um estruturado
  const generateCompletePageSchema = useCallback((
    products: ProductData[],
    companyData?: CompanyData,
    faqItems?: FAQItem[],
    reviews?: ReviewData[],
    pageTitle?: string,
    pageDescription?: string
  ) => {
    const schemas: any[] = [];

    // Schema da página principal
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": pageTitle || "Nossa Página",
      "description": pageDescription || "Página especializada em soluções de qualidade",
      "url": window.location.href
    });

    // LocalBusiness schema
    const businessSchema = generateLocalBusinessSchema(companyData || {});
    if (businessSchema) schemas.push(businessSchema);

    // Produtos individuais ou lista
    if (products && products.length > 0) {
      if (products.length === 1) {
        schemas.push(generateAdvancedProductSchema(products[0], companyData));
      } else {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": pageTitle || "Nossos Produtos",
          "numberOfItems": products.length,
          "itemListElement": products.map((product, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": generateAdvancedProductSchema(product, companyData)
          }))
        });
      }
    }

    // FAQ schema
    const faqSchema = generateFAQSchema(faqItems || []);
    if (faqSchema) schemas.push(faqSchema);

    // Reviews schema
    const reviewsSchema = generateReviewsSchema(reviews || [], pageTitle);
    if (reviewsSchema) schemas.push(reviewsSchema);

    console.log('🎯 Schema JSON-LD COMPLETO gerado:', {
      totalSchemas: schemas.length,
      types: schemas.map(s => s['@type']),
      productsCount: products?.length || 0,
      faqCount: faqItems?.length || 0,
      reviewsCount: reviews?.length || 0
    });

    return {
      schemas,
      formatted: JSON.stringify(schemas, null, 2),
      preview: `${schemas.length} schemas gerados: ${schemas.map(s => s['@type']).join(', ')}`
    };
  }, [generateAdvancedProductSchema, generateFAQSchema, generateReviewsSchema, generateLocalBusinessSchema]);

  return {
    generateAdvancedProductSchema,
    generateFAQSchema,
    generateReviewsSchema,
    generateLocalBusinessSchema,
    generateCompletePageSchema
  };
};