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
  // ✨ NOVOS CAMPOS GOOGLE MERCHANT + SEO
  gtin?: string;
  ean?: string;
  mpn?: string;
  brand?: string;
  google_product_category?: string;
  condition?: string;
  availability?: string;
  color?: string;
  size?: string;
  material?: string;
  age_group?: string;
  gender?: string;
  seo_title_override?: string;
  seo_description_override?: string;
  canonical_url?: string;
  product_url?: string;
  variations?: Array<{ name: string; price?: number; stock?: number }>;
  // ✨ NOVOS CAMPOS PHASE 1 - UTILIZAÇÃO MÁXIMA DE DADOS
  technical_specifications?: Array<{ property: string; value: string }>;
  faq?: Array<{ question: string; answer: string }>;
  bot_trigger_words?: string[];
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
  // ✨ PHASE 1: Campos adicionais do perfil da empresa
  brand_values?: string;
  mission_statement?: string;
  vision_statement?: string;
  differentiators?: string;
  working_methodology?: string;
  company_culture?: string;
  institutional_links?: Array<{ name: string; url: string }>;
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

  // Gerar Schema de Produto único com TODOS os campos + GOOGLE MERCHANT
  const generateAdvancedProductSchema = useCallback((product: ProductData, companyData?: CompanyData) => {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "identifier": product.id,
      "description": product.seo_description_override || product.description || product.sales_pitch || `${product.name} - Solução de qualidade`
    };

    // 🔥 IDENTIFICADORES ÚNICOS SEPARADOS (GTIN, EAN, MPN)
    const identifiers: any[] = [];
    
    if (product.gtin) {
      schema.gtin = product.gtin;
      identifiers.push({
        "@type": "PropertyValue",
        "propertyID": "gtin",
        "value": product.gtin
      });
    }
    
    if (product.ean) {
      identifiers.push({
        "@type": "PropertyValue",
        "propertyID": "ean",
        "value": product.ean
      });
    }
    
    if (product.mpn) {
      schema.mpn = product.mpn;
      identifiers.push({
        "@type": "PropertyValue",
        "propertyID": "mpn",
        "value": product.mpn
      });
    }
    
    if (identifiers.length > 0) {
      schema.identifier = identifiers;
    }
    
    // 🔥 Variations como ofertas separadas
    if (product.variations && product.variations.length > 0) {
      schema.offers = product.variations.map((variation, index) => ({
        "@type": "Offer",
        "name": variation.name,
        "price": variation.price || product.price || 0,
        "priceCurrency": product.currency || "BRL",
        "availability": variation.stock && variation.stock > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "url": `${product.product_url || ''}#variation-${index}`
      }));
    }

    // ✨ Preço e ofertas comerciais COMPLETAS + DISPONIBILIDADE REAL
    if (product.price && product.price > 0) {
      const availabilityMap: Record<string, string> = {
        'in stock': 'https://schema.org/InStock',
        'out of stock': 'https://schema.org/OutOfStock',
        'preorder': 'https://schema.org/PreOrder'
      };
      
      schema.offers = {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": product.currency || "BRL",
        "availability": availabilityMap[product.availability || 'in stock'] || "https://schema.org/InStock",
        "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "itemCondition": product.condition === 'new' ? 'https://schema.org/NewCondition' : 
                        product.condition === 'used' ? 'https://schema.org/UsedCondition' : 
                        'https://schema.org/RefurbishedCondition'
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
    const additionalProperties = [];
    
    if (product.features && product.features.length > 0) {
      additionalProperties.push(...product.features.map(feature => ({
        "@type": "PropertyValue",
        "name": "Feature",
        "value": feature
      })));
    }

    // ✨ PHASE 1: Technical Specifications como PropertyValue
    if (product.technical_specifications && product.technical_specifications.length > 0) {
      additionalProperties.push(...product.technical_specifications.map(spec => ({
        "@type": "PropertyValue",
        "name": spec.property,
        "value": spec.value
      })));
    }

    if (additionalProperties.length > 0) {
      schema.additionalProperty = additionalProperties;
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

    // ✨ Vídeos associados com captions e descriptions
    const videos = [
      ...(product.youtube_videos || []),
      ...(product.instagram_videos || []),
      ...(product.technical_videos || []),
      ...(product.testimonial_videos || []),
      ...((product as any).tiktok_videos || [])
    ].filter(Boolean);

    if (videos.length > 0) {
      schema.video = videos.map((video, index) => {
        // Suportar vídeos como strings (URLs) ou objetos { url, description, title, thumbnail }
        const videoUrl = typeof video === 'string' ? video : video.url;
        const videoTitle = typeof video === 'object' ? video.title : null;
        const videoDescription = typeof video === 'object' ? video.description : null;
        const videoThumbnail = typeof video === 'object' ? video.thumbnail : null;
        const videoUploadDate = typeof video === 'object' ? video.uploadDate : null;
        
        const videoObj: any = {
          "@type": "VideoObject",
          "contentUrl": videoUrl,
          "name": videoTitle || `${product.name} - Vídeo Demonstrativo ${index + 1}`,
          // ✅ MELHORIA: incluir description com fallbacks inteligentes
          "description": videoDescription || product.sales_pitch || product.description || "",
          "thumbnailUrl": videoThumbnail || product.image_url,
          "uploadDate": videoUploadDate || (product as any).created_at
        };
        
        // ✨ Adicionar captions se disponíveis (acessibilidade)
        if (product.video_captions && typeof product.video_captions === 'object') {
          const caption = product.video_captions[videoUrl];
          if (caption) {
            videoObj.caption = caption;
            videoObj.accessibilityFeature = "captions";
          }
        }
        
        return videoObj;
      });
    }

    // ✨ Marca/Empresa (priorizar brand extraído)
    if (product.brand || companyData?.company_name) {
      schema.brand = {
        "@type": "Brand",
        "name": product.brand || companyData.company_name
      };
    }

    // ✨ ATRIBUTOS FÍSICOS DO PRODUTO
    if (product.color) {
      schema.color = product.color;
    }
    if (product.size) {
      schema.size = product.size;
    }
    if (product.material) {
      schema.material = product.material;
    }

    // ✨ CATEGORIA GOOGLE MERCHANT
    if (product.google_product_category) {
      schema.googleProductCategory = product.google_product_category;
    }

    // ✨ CONDIÇÃO E DISPONIBILIDADE
    if (product.condition) {
      schema.itemCondition = product.condition === 'new' ? 'https://schema.org/NewCondition' : 
                            product.condition === 'used' ? 'https://schema.org/UsedCondition' : 
                            'https://schema.org/RefurbishedCondition';
    }

    // ✨ SEGMENTAÇÃO DEMOGRÁFICA
    if (product.age_group || product.gender) {
      schema.audience = {
        "@type": "PeopleAudience",
        ...(product.age_group && { "suggestedMinAge": product.age_group === 'adult' ? 18 : 0 }),
        ...(product.gender && { "suggestedGender": product.gender })
      };
    }

    // ✨ PHASE 1: Keywords expandidas + bot_trigger_words
    const allKeywords = [
      ...(product.keywords || []),
      ...(product.market_keywords || []),
      ...(product.search_intent_keywords || []),
      ...(product.tags || []),
      ...(product.bot_trigger_words || []) // ✨ NOVO: palavras-gatilho para SEO
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

    // ✨ PHASE 1: Campos adicionais da empresa para SEO
    if (companyData.brand_values) {
      schema.slogan = companyData.brand_values;
    }

    if (companyData.mission_statement) {
      schema.mission = companyData.mission_statement;
    }

    if (companyData.seo_competitive_advantages) {
      schema.additionalProperty = schema.additionalProperty || [];
      schema.additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Diferenciais Competitivos",
        "value": companyData.seo_competitive_advantages
      });
    }

    // ✨ PHASE 1: Links institucionais como sameAs
    if (companyData.institutional_links && companyData.institutional_links.length > 0) {
      schema.sameAs = companyData.institutional_links.map(link => link.url);
    }

    return schema;
  }, []);

  // ✨ PHASE 1: Gerar Schema de FAQ para produtos individuais
  const generateProductFAQSchema = useCallback((productFaq: Array<{ question: string; answer: string }>, productName: string) => {
    if (!productFaq || productFaq.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "about": {
        "@type": "Product",
        "name": productName
      },
      "mainEntity": productFaq.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
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

    // Produtos individuais ou lista - TODOS os produtos com @id
    if (products && products.length > 0) {
      products.forEach((product, index) => {
        const productSchema = generateAdvancedProductSchema(product, companyData);
        productSchema["@id"] = `#product-${product.id}`;
        schemas.push(productSchema);

        // ✨ PHASE 1: FAQ individual por produto
        if (product.faq && product.faq.length > 0) {
          const productFaqSchema = generateProductFAQSchema(product.faq, product.name);
          if (productFaqSchema) {
            productFaqSchema["@id"] = `#faq-${product.id}`;
            schemas.push(productFaqSchema);
          }
        }
      });
      
      // Se múltiplos produtos, adicionar também ItemList
      if (products.length > 1) {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": pageTitle || "Nossos Produtos",
          "numberOfItems": products.length,
          "itemListElement": products.map((product, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": { "@id": `#product-${product.id}` }
          }))
        });
      }
    }

    // FAQ schema geral da página
    const faqSchema = generateFAQSchema(faqItems || []);
    if (faqSchema) schemas.push(faqSchema);

    // ✨ PHASE 1: Coletar FAQs de todos os produtos para schema consolidado
    const allProductFaqs = products?.flatMap(p => p.faq || []) || [];
    if (allProductFaqs.length > 0) {
      const consolidatedFaqSchema = generateFAQSchema(allProductFaqs);
      if (consolidatedFaqSchema) {
        consolidatedFaqSchema["@id"] = "#consolidated-product-faq";
        schemas.push(consolidatedFaqSchema);
      }
    }

    // Reviews schema
    const reviewsSchema = generateReviewsSchema(reviews || [], pageTitle);
    if (reviewsSchema) schemas.push(reviewsSchema);

    console.log('🎯 Schema JSON-LD COMPLETO gerado (PHASE 1):', {
      totalSchemas: schemas.length,
      types: schemas.map(s => s['@type']),
      productsCount: products?.length || 0,
      individualProductFaqs: products?.filter(p => p.faq?.length > 0).length || 0,
      allProductFaqsCount: allProductFaqs.length,
      faqCount: faqItems?.length || 0,
      reviewsCount: reviews?.length || 0,
      technicalSpecsProducts: products?.filter(p => p.technical_specifications?.length > 0).length || 0,
      botTriggerWordsProducts: products?.filter(p => p.bot_trigger_words?.length > 0).length || 0
    });

    return {
      schemas,
      formatted: JSON.stringify(schemas, null, 2),
      preview: `${schemas.length} schemas gerados: ${schemas.map(s => s['@type']).join(', ')}`
    };
  }, [generateAdvancedProductSchema, generateFAQSchema, generateReviewsSchema, generateLocalBusinessSchema, generateProductFAQSchema]);

  return {
    generateAdvancedProductSchema,
    generateFAQSchema,
    generateReviewsSchema,
    generateLocalBusinessSchema,
    generateCompletePageSchema,
    generateProductFAQSchema // ✨ PHASE 1: Nova função para FAQ de produtos
  };
};