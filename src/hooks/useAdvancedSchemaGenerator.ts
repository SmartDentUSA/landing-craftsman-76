import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { validateSchemaOrg } from '@/lib/seo-validators';

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
  // 🔥 FASE 3: NOVOS CAMPOS PARA SCHEMA ENRIQUECIDO
  images_gallery?: Array<{ url: string; alt?: string }> | string[];
  technical_documents?: Array<{ nome: string; url: string }>;
  document_transcriptions?: Array<{ extracted_data?: { summary?: string } }>;
  tutorial_resources?: { tutorials?: Array<{ title: string; url: string; description?: string }> };
}

interface CompanyData {
  company_name?: string;
  company_description?: string;
  location?: string;
  
  // ✨ NOVOS CAMPOS ESTRUTURADOS
  country?: string;
  state?: string;
  city?: string;
  street_address?: string;
  address_number?: string;
  postal_code?: string;
  
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
  // ✅ FASE 1: Campos críticos para SEO/SGE
  founded_year?: number;
  team_size?: string;
  company_logo_url?: string;
  institutional_links?: Array<{ name: string; url: string }>;
  // ✅ FASE 3: Campo para rodapé padrão em vídeos do YouTube
  youtube_company_footer?: string;
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

    // 🔥 FASE 3: Adicionar document_transcriptions ao description
    if (product.document_transcriptions && Array.isArray(product.document_transcriptions) && product.document_transcriptions.length > 0) {
      const firstDoc = product.document_transcriptions[0];
      if (firstDoc?.extracted_data?.summary) {
        schema.description += ` ${firstDoc.extracted_data.summary}`;
      }
    }

    // 🔥 FASE 3: Adicionar technical_documents como associatedMedia
    if (product.technical_documents && Array.isArray(product.technical_documents) && product.technical_documents.length > 0) {
      schema.associatedMedia = product.technical_documents.map((doc: any) => ({
        "@type": "MediaObject",
        "contentUrl": doc.url,
        "name": doc.nome,
        "encodingFormat": "application/pdf"
      }));
    }

    // 🔥 FASE 3: Adicionar images_gallery completa (múltiplas imagens)
    if (product.images_gallery && Array.isArray(product.images_gallery) && product.images_gallery.length > 1) {
      schema.image = product.images_gallery.map((img: any) => 
        typeof img === 'string' ? img : img.url
      );
    } else if (product.image_url) {
      // Fallback para imagem única
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
          // ✅ FASE 3: Incluir youtube_company_footer como fallback final
          "description": videoDescription || product.sales_pitch || product.description || companyData?.youtube_company_footer || "",
          "thumbnailUrl": videoThumbnail || product.image_url,
          "uploadDate": videoUploadDate || (product as any).created_at
        };
        
        // ✨ Adicionar captions + análise AI se disponíveis (SEO + acessibilidade)
        if (product.video_captions && typeof product.video_captions === 'object') {
          const caption = product.video_captions[videoUrl];
          if (caption) {
            // Texto bruto das legendas
            videoObj.caption = typeof caption === 'string' ? caption : caption.text || caption.captions || caption;
            videoObj.accessibilityFeature = "captions";
            
            // ✅ MELHORIA SEO #1: Adicionar análise AI ao schema VideoObject
            if (typeof caption === 'object' && caption.analysis) {
              // Keywords extraídas por AI → melhora relevância semântica
              if (caption.analysis.keywords && caption.analysis.keywords.length > 0) {
                videoObj.keywords = caption.analysis.keywords.join(', ');
              }
              
              // Resumo gerado por AI → aparece em rich snippets de vídeo
              if (caption.analysis.summary) {
                videoObj.abstract = caption.analysis.summary;
              }
              
              // Sentimento → sinaliza qualidade do conteúdo (proxy de engajamento)
              if (caption.analysis.sentiment) {
                videoObj.commentCount = caption.analysis.sentiment === 'positive' ? 100 : 
                                        caption.analysis.sentiment === 'neutral' ? 50 : 25;
              }
            }
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
  const generateLocalBusinessSchema = useCallback((companyData: CompanyData, seoDomains?: Array<any>) => {
    if (!companyData.company_name) return null;

    const schema: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": companyData.company_name,
      "description": companyData.company_description || `${companyData.company_name} - Empresa especializada em soluções de qualidade`
    };
    
    // ✅ ADICIONAR DOMÍNIOS SEO AO sameAs
    if (seoDomains && seoDomains.length > 0) {
      const schemaEnabled = seoDomains
        .filter((d: any) => d.enabled && d.use_in_schema)
        .sort((a: any, b: any) => a.priority - b.priority);
      
      if (schemaEnabled.length > 0) {
        schema.sameAs = schemaEnabled.map((d: any) => `https://${d.domain}`);
      }
    }

    // ✨ ENDEREÇO ESTRUTURADO (prioridade) ou location (fallback)
    const hasStructuredAddress = 
      companyData.street_address || 
      companyData.city || 
      companyData.state;
    
    if (hasStructuredAddress) {
      schema.address = {
        "@type": "PostalAddress",
        "streetAddress": [companyData.street_address, companyData.address_number]
          .filter(Boolean)
          .join(', '),
        "addressLocality": companyData.city || '',
        "addressRegion": companyData.state || '',
        "postalCode": companyData.postal_code || '',
        "addressCountry": companyData.country || 'BR'
      };
    } else if (companyData.location) {
      // Fallback para location legado
      schema.address = {
        "@type": "PostalAddress",
        "streetAddress": companyData.location
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

    // ✅ FASE 1: Adicionar seo_market_positioning à descrição
    if (companyData.seo_market_positioning) {
      schema.description = schema.description 
        ? `${schema.description} ${companyData.seo_market_positioning}`
        : companyData.seo_market_positioning;
    }

    // ✅ FASE 1: Mover seo_competitive_advantages e seo_technical_expertise para knowsAbout
    const knowsAboutItems: string[] = [];
    
    if (companyData.seo_technical_expertise) {
      knowsAboutItems.push(companyData.seo_technical_expertise);
    }
    
    if (companyData.seo_competitive_advantages) {
      const advantages = companyData.seo_competitive_advantages
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
      knowsAboutItems.push(...advantages);
    }
    
    // ✅ FASE 1: Enriquecer knowsAbout com company_culture
    if (companyData.company_culture) {
      knowsAboutItems.push(companyData.company_culture);
    }
    
    // ✅ FASE 1: Adicionar working_methodology ao knowsAbout
    if (companyData.working_methodology) {
      knowsAboutItems.push(companyData.working_methodology);
    }
    
    // ✅ FASE 1: Adicionar differentiators ao knowsAbout
    if (companyData.differentiators) {
      const diffs = companyData.differentiators
        .split(',')
        .map(d => d.trim())
        .filter(Boolean);
      knowsAboutItems.push(...diffs);
    }
    
    if (knowsAboutItems.length > 0) {
      schema.knowsAbout = knowsAboutItems;
    }

    // ✨ PHASE 1: Campos adicionais da empresa para SEO
    if (companyData.brand_values) {
      schema.slogan = companyData.brand_values;
    }

    if (companyData.mission_statement) {
      schema.mission = companyData.mission_statement;
    }
    
    // ✅ FASE 1: Ano de fundação (CRÍTICO Schema.org)
    if (companyData.founded_year) {
      schema.foundingDate = companyData.founded_year.toString();
    }
    
    // ✅ FASE 1: Logo da empresa (CRÍTICO Schema.org)
    if (companyData.company_logo_url) {
      schema.logo = {
        "@type": "ImageObject",
        "url": companyData.company_logo_url,
        "caption": `Logo oficial ${companyData.company_name}`
      };
    }
    
    // ✅ FASE 1: Tamanho da equipe
    if (companyData.team_size) {
      schema.numberOfEmployees = {
        "@type": "QuantitativeValue",
        "value": companyData.team_size
      };
    }

    // ✅ FASE 1: Adicionar vision_statement como PropertyValue
    if (companyData.vision_statement) {
      schema.additionalProperty = schema.additionalProperty || [];
      schema.additionalProperty.push({
        "@type": "PropertyValue",
        "name": "Visão da Empresa",
        "value": companyData.vision_statement
      });
    }

    // ✨ PHASE 1: Links institucionais como sameAs
    if (companyData.institutional_links && companyData.institutional_links.length > 0) {
      schema.sameAs = companyData.institutional_links.map(link => link.url);
    }

    // ✅ FASE 3: Adicionar vídeos da empresa ao schema LocalBusiness (CORRIGIDO)
    const companyVideos = (companyData as any).company_videos;
    
    if (companyVideos && typeof companyVideos === 'object') {
      const allCompanyVideos: any[] = [];
      
      // Processar cada tipo de vídeo com melhor tratamento
      const videoTypes = [
        { key: 'youtube_videos', label: 'YouTube' },
        { key: 'instagram_videos', label: 'Instagram' },
        { key: 'technical_videos', label: 'Técnico' },
        { key: 'testimonial_videos', label: 'Depoimento' }
      ];
      
      videoTypes.forEach(({ key, label }) => {
        if (Array.isArray(companyVideos[key]) && companyVideos[key].length > 0) {
          companyVideos[key].forEach((video: any, idx: number) => {
            // Suportar tanto string (URL) quanto objeto { url, title, description, thumbnail }
            const videoUrl = typeof video === 'string' ? video : video.url;
            const videoTitle = typeof video === 'object' && video.title 
              ? video.title 
              : `${companyData.company_name} - Vídeo ${label} ${idx + 1}`;
            const videoDesc = typeof video === 'object' && video.description
              ? video.description
              : (label === 'Técnico' ? companyData.seo_technical_expertise : companyData.company_description) || '';
            const videoThumb = typeof video === 'object' && video.thumbnail
              ? video.thumbnail
              : (companyData as any).company_logo_url;
            
            if (videoUrl) {
              allCompanyVideos.push({
                "@type": "VideoObject",
                "contentUrl": videoUrl,
                "name": videoTitle,
                "description": videoDesc,
                "thumbnailUrl": videoThumb || '',
                "uploadDate": (companyData as any).created_at || new Date().toISOString()
              });
            }
          });
        }
      });
      
      if (allCompanyVideos.length > 0) {
        schema.video = allCompanyVideos;
        console.log(`✅ FASE 3: ${allCompanyVideos.length} vídeos adicionados ao Schema LocalBusiness`);
      }
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

  // 🔥 FASE 3: NOVO - Schema HowTo para tutoriais
  const generateTutorialSchema = useCallback((product: ProductData) => {
    if (!product.tutorial_resources?.tutorials?.length) return [];

    return product.tutorial_resources.tutorials.map(tutorial => ({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": tutorial.title,
      "description": tutorial.description || `Tutorial sobre ${product.name}`,
      "video": {
        "@type": "VideoObject",
        "name": tutorial.title,
        "contentUrl": tutorial.url,
        "thumbnailUrl": product.image_url,
        "description": tutorial.description || `Aprenda a usar ${product.name}`
      },
      "about": {
        "@type": "Product",
        "name": product.name
      },
      "step": tutorial.description?.split('.').filter(Boolean).map((step, idx) => ({
        "@type": "HowToStep",
        "position": idx + 1,
        "name": `Passo ${idx + 1}`,
        "text": step.trim()
      })) || []
    }));
  }, []);

  // 🔥 FASE 3: NOVO - Schema ImageGallery para múltiplas imagens
  const generateImageGallerySchema = useCallback((product: ProductData) => {
    if (!product.images_gallery?.length || product.images_gallery.length <= 1) return null;

    return {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      "about": {
        "@type": "Product",
        "name": product.name
      },
      "image": product.images_gallery.map((img: any) => ({
        "@type": "ImageObject",
        "contentUrl": typeof img === 'string' ? img : img.url,
        "name": typeof img === 'object' ? img.alt : `${product.name} - Imagem`,
        "caption": typeof img === 'object' ? img.alt : undefined
      }))
    };
  }, []);

  // 🔥 FASE 3: NOVO - Schema DigitalDocument para manuais técnicos
  const generateTechnicalDocsSchema = useCallback((product: ProductData) => {
    if (!product.technical_documents?.length) return [];

    return product.technical_documents.map((doc: any) => ({
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      "name": doc.nome || `Manual de ${product.name}`,
      "url": doc.url,
      "encodingFormat": "application/pdf",
      "about": {
        "@type": "Product",
        "name": product.name
      }
    }));
  }, []);

  // ✅ AUTHOR SCHEMA (E-E-A-T for Google)
  const generateAuthorSchema = useCallback((author: {
    id: string;
    full_name: string;
    photo_url?: string;
    mini_cv?: string;
    specialty?: string;
    lattes_url?: string;
    website_url?: string;
    instagram_url?: string;
    youtube_url?: string;
  }) => {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": author.full_name,
      "@id": `#author-${author.id}`
    };

    if (author.photo_url) {
      schema.image = author.photo_url;
    }

    if (author.mini_cv) {
      schema.description = author.mini_cv;
    }

    if (author.specialty) {
      schema.jobTitle = author.specialty;
    }

    // ✅ sameAs for E-E-A-T (critical for authority)
    const socialLinks = [
      author.lattes_url,
      author.website_url,
      author.instagram_url,
      author.youtube_url
    ].filter(Boolean);

    if (socialLinks.length > 0) {
      schema.sameAs = socialLinks;
    }

    return schema;
  }, []);

  // Combinar TODOS os schemas em um estruturado
  const generateCompletePageSchema = useCallback(async (
    products: ProductData[],
    companyData?: CompanyData,
    faqItems?: FAQItem[],
    reviews?: ReviewData[],
    pageTitle?: string,
    pageDescription?: string,
    authorKol?: any // ✨ NEW: E-E-A-T author data
  ) => {
    const schemas: any[] = [];

    // Schema da página principal
    const pageSchema: any = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": pageTitle || "Nossa Página",
      "description": pageDescription || "Página especializada em soluções de qualidade",
      "url": window.location.href
    };

    // ✨ Add author reference to page (E-E-A-T)
    if (authorKol) {
      pageSchema.author = { "@id": `#author-${authorKol.id}` };
    }

    schemas.push(pageSchema);

    // ✨ Add Person schema for author (E-E-A-T)
    if (authorKol) {
      const authorSchema = generateAuthorSchema(authorKol);
      schemas.push(authorSchema);
    }

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

        // 🔥 FASE 3: HowTo schemas para tutoriais
        const tutorialSchemas = generateTutorialSchema(product);
        tutorialSchemas.forEach((tutorialSchema, tutIdx) => {
          tutorialSchema["@id"] = `#tutorial-${product.id}-${tutIdx}`;
          schemas.push(tutorialSchema);
        });

        // 🔥 FASE 3: ImageGallery schema
        const imageGallerySchema = generateImageGallerySchema(product);
        if (imageGallerySchema) {
          imageGallerySchema["@id"] = `#gallery-${product.id}`;
          schemas.push(imageGallerySchema);
        }

        // 🔥 FASE 3: DigitalDocument schemas para manuais técnicos
        const technicalDocsSchemas = generateTechnicalDocsSchema(product);
        technicalDocsSchemas.forEach((docSchema, docIdx) => {
          docSchema["@id"] = `#document-${product.id}-${docIdx}`;
          schemas.push(docSchema);
        });
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

    console.log('🎯 Schema JSON-LD COMPLETO gerado (FASE 3):', {
      totalSchemas: schemas.length,
      types: schemas.map(s => s['@type']),
      productsCount: products?.length || 0,
      individualProductFaqs: products?.filter(p => p.faq?.length > 0).length || 0,
      allProductFaqsCount: allProductFaqs.length,
      faqCount: faqItems?.length || 0,
      reviewsCount: reviews?.length || 0,
      technicalSpecsProducts: products?.filter(p => p.technical_specifications?.length > 0).length || 0,
      botTriggerWordsProducts: products?.filter(p => p.bot_trigger_words?.length > 0).length || 0,
      // 🔥 FASE 3: Novos contadores
      howToTutorials: schemas.filter(s => s['@type'] === 'HowTo').length,
      imageGalleries: schemas.filter(s => s['@type'] === 'ImageGallery').length,
      digitalDocuments: schemas.filter(s => s['@type'] === 'DigitalDocument').length,
      productsWithMultipleImages: products?.filter(p => p.images_gallery && p.images_gallery.length > 1).length || 0,
      productsWithTutorials: products?.filter(p => p.tutorial_resources?.tutorials?.length).length || 0,
      productsWithTechnicalDocs: products?.filter(p => p.technical_documents?.length).length || 0
    });
    
    // ✅ VALIDAR SCHEMAS CONSOLIDADOS
    const allSchemasValid = await validateSchemaOrg(schemas);
    
    if (!allSchemasValid.valid) {
      console.warn('⚠️ Schemas com avisos (não crítico):', allSchemasValid.errors);
      // Validação explícita será feita no botão "Aprovar" do Editor
    }
    
    if (allSchemasValid.warnings.length > 0) {
      console.warn('⚠️ Schema warnings:', allSchemasValid.warnings);
    }

    return {
      schemas,
      formatted: JSON.stringify(schemas, null, 2),
      preview: `${schemas.length} schemas gerados: ${schemas.map(s => s['@type']).join(', ')}`,
      validation: allSchemasValid
    };
  }, [generateAdvancedProductSchema, generateFAQSchema, generateReviewsSchema, generateLocalBusinessSchema, generateProductFAQSchema, generateTutorialSchema, generateImageGallerySchema, generateTechnicalDocsSchema, toast]);

  // 🆕 FASE SEO ENTERPRISE: Funções para IA-readiness
  const generateSpeakableSpecification = (cssSelectors?: string[]): object => {
    return {
      "@type": "SpeakableSpecification",
      "cssSelector": cssSelectors || [".hero h1", "article h1", ".blog-content h2", "h1", "h2"]
    };
  };

  const generateArticleSchemaWithAI = (articleData: {
    title: string;
    description: string;
    author?: { name: string; url?: string };
    datePublished: string;
    dateModified?: string;
    image?: string;
    url: string;
  }, companyProfile?: any): object => {
    return {
      "@type": "Article",
      "headline": articleData.title,
      "description": articleData.description,
      "author": articleData.author ? {
        "@type": "Person",
        "name": articleData.author.name,
        "url": articleData.author.url
      } : undefined,
      "datePublished": articleData.datePublished,
      "dateModified": articleData.dateModified || articleData.datePublished,
      "image": articleData.image,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": articleData.url
      },
      "speakable": generateSpeakableSpecification(),
      "about": companyProfile ? {
        "@type": "Thing",
        "name": companyProfile.business_sector || "Tecnologia"
      } : undefined
    };
  };

  return {
    generateAdvancedProductSchema,
    generateFAQSchema,
    generateReviewsSchema,
    generateLocalBusinessSchema,
    generateCompletePageSchema,
    generateProductFAQSchema, // ✨ PHASE 1: Nova função para FAQ de produtos
    // 🔥 FASE 3: Novos geradores de schema
    generateTutorialSchema,
    generateImageGallerySchema,
    generateTechnicalDocsSchema,
    // 🆕 FASE SEO ENTERPRISE: IA-readiness
    generateSpeakableSpecification,
    generateArticleSchemaWithAI
  };
};