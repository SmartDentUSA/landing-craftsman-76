// ═══════════════════════════════════════════════════════════
// 🎯 GERADOR DE SCHEMAS JSON-LD PARA SGE/AEO
// ═══════════════════════════════════════════════════════════

// ✅ FASE 3.1: Importar processamento de intelligent links
import { buildIntelligentLinksMap, applyIntelligentLinks } from '../_shared/intelligent-links-processor.ts';
// ✅ INTEGRAÇÃO SISTEMA B: Schemas de vídeos e documentos
import { generateVideoObjectSchemas, generateDocumentSchemas, type SystemBEnrichment } from './systemBIntegration.ts';
// ✅ FASE 4: HowTo Schema para workflow_stages
import { generateHowToSchema, type ProductWithWorkflow } from '../_shared/howto-schema-helper.ts';
// ✅ FASE 3: Person Schema para E-E-A-T
import { generatePersonSchema, type PersonSchemaData } from '../_shared/person-schema-helper.ts';
// ✅ FASE 6: FAQ Schema Helper centralizado
import { generateFAQPageSchema, type FAQItem } from '../_shared/faq-schema-helper.ts';
// ✅ FASE 7: ItemList Schema Helper centralizado
import { generateProductItemListSchema, convertToItemListProducts, type ItemListProduct } from '../_shared/itemlist-schema-helper.ts';
// ✅ FASE 8: Video Schema Helper - re-export do systemBIntegration usa este helper
// ✅ FASE 9: BreadcrumbList Schema Helper centralizado
import { generateSolutionBreadcrumbs } from '../_shared/breadcrumb-schema-helper.ts';
// ✅ TRACKING: GTM, GA4, Meta Pixel, TikTok Pixel
import { generateTrackingHeadScripts, generateGTMNoScript, getTrackingSummary, type TrackingPixels } from '../_shared/tracking-injector.ts';
// ✅ FASE 10: Authority Data Helper completo
import { 
  type AuthorityData,
  type VideoTestimonial,
  generateAuthorityContextHTML,
  generateAuthorityMetaTags,
  generateCompanyVideoSchemas,
  generateVideoTestimonialSchemas,
  generateVideoGallerySchema,
  generateSameAsSchema,
  generateReviewsSchema  // ✅ CORREÇÃO: Import para gerar reviews individuais
} from '../_shared/authority-data-helper.ts';
// ✅ CORREÇÃO: Import AggregateRatingData para tipagem
import { type AggregateRatingData } from '../_shared/aggregate-rating-helper.ts';
// ✅ SEO Fine-Tuning 10/10 - Shared Module
import { 
  expandFounderSameAs,
  generateServiceSchemas,
  generateHasCredential,
  deduplicateKeywords,
  aggregateFAQsFromProducts as seoAggregateFAQs,
  generateHreflangHTML
} from '../_shared/seo-fine-tuning.ts';

// ═══════════════════════════════════════════════════════════
// 🛡️ SANITIZAÇÃO DE NOME DA EMPRESA
// ═══════════════════════════════════════════════════════════
const GENERIC_COMPANY_NAMES = ['Nova Empresa', 'Empresa', 'Company', 'Test Company', 'Minha Empresa', ''];
const DEFAULT_COMPANY_NAME = 'Smart Dent';

function sanitizeCompanyName(name: string | null | undefined): string {
  const normalized = (name || '').trim();
  if (GENERIC_COMPANY_NAMES.includes(normalized) || !normalized) {
    return DEFAULT_COMPANY_NAME;
  }
  return normalized;
}

function generateSPINSchemas(
  solution: any,
  products: any[],
  company: any,
  faqs: any[],
  successCases: any[],
  canonicalUrl: string,
  authorKOL?: PersonSchemaData | null,
  aggregateRating?: AggregateRatingData | null,
  authorityData?: AuthorityData | null  // ✅ CORREÇÃO: Novo parâmetro para reviews
): any[] {
  const schemas: any[] = [];

  // 1. Organization Schema
  if (company) {
    const orgSchema: any = {
      '@type': 'Organization',
      name: sanitizeCompanyName(company.company_name),
      // ✅ CORREÇÃO: usar website_url em vez de website
      url: company.website_url || company.website || canonicalUrl,
      
      // ✅ FASE 1: Logo CRÍTICO (priorizar company_logo_url)
      logo: company.company_logo_url || company.logo_url || '',
      
      contactPoint: {
        '@type': 'ContactPoint',
        // ✅ CORREÇÃO: usar contact_phone em vez de phone_number
        telephone: company.contact_phone || company.phone_number,
        contactType: 'customer service',
        // ✅ CORREÇÃO: usar contact_email em vez de email
        email: company.contact_email || company.email,
        areaServed: 'BR',
        availableLanguage: 'pt-BR'
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${company.street_address || ''}, ${company.address_number || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
        addressLocality: company.city,
        addressRegion: company.state,
        postalCode: company.postal_code,
        addressCountry: 'BR'
      }
    };
    
    // ✅ FASE 1: Ano de fundação (CRÍTICO Schema.org)
    if (company.founded_year) {
      orgSchema.foundingDate = company.founded_year.toString();
    }
    
    // ✅ FASE 1: Missão da empresa (SGE prioriza)
    if (company.mission_statement) {
      orgSchema.mission = company.mission_statement;
    }
    
    // ✅ FASE 1: Visão como slogan (SGE prioriza)
    if (company.vision_statement) {
      orgSchema.slogan = company.vision_statement;
    }
    
    // ✅ FASE 1: Tamanho da equipe
    if (company.team_size) {
      orgSchema.numberOfEmployees = {
        "@type": "QuantitativeValue",
        "value": company.team_size
      };
    }
    
    // ✅ FASE 1: Expertise expandido com company_culture, working_methodology, differentiators
    if (company.seo_technical_expertise) {
      const knowsAboutItems = [company.seo_technical_expertise];
      
      if (company.company_culture) {
        knowsAboutItems.push(company.company_culture);
      }
      
      if (company.working_methodology) {
        knowsAboutItems.push(company.working_methodology);
      }
      
      if (company.differentiators) {
        const diffs = company.differentiators.split(',').map((d: string) => d.trim()).filter(Boolean);
        knowsAboutItems.push(...diffs);
      }
      
      orgSchema.knowsAbout = knowsAboutItems.filter(Boolean);
    }
    
    // ✅ NOVO: sameAs EXPANDIDO com redes sociais para SEO/GEO (usando módulo compartilhado)
    const sameAsLinks = expandFounderSameAs(company);
    
    if (sameAsLinks.length > 0) {
      orgSchema.sameAs = sameAsLinks;
    }
    
    // ✅ SEO 10/10: hasCredential para certificações (ANVISA, ISO, FDA)
    const credentials = generateHasCredential(company.certifications);
    if (credentials && credentials.length > 0) {
      orgSchema.hasCredential = credentials;
      console.log(`🏅 [SCHEMA] Organization hasCredential: ${credentials.length} certificações`);
    }
    
    schemas.push(orgSchema);
  }
  
  // ✅ SEO 10/10: Service Schemas para serviços de consultoria
  const websiteUrl = company?.website_url || company?.website || canonicalUrl;
  const serviceSchemas = generateServiceSchemas(
    company?.main_products_services,
    company,
    { websiteUrl, businessSector: company?.business_sector }
  );
  if (serviceSchemas.length > 0) {
    schemas.push(...serviceSchemas);
    console.log(`🛠️ [SCHEMA] ${serviceSchemas.length} Service schemas adicionados`);
  }

  // 2. WebPage Schema + SpeakableSpecification (GEO/Voice SEO)
  schemas.push({
    '@type': 'WebPage',
    name: solution.title,
    description: solution.sales_pitch?.substring(0, 160)?.replace(/<[^>]*>/g, '') || solution.pain_description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    
    // ✅ GEO: SpeakableSpecification para Voice SEO e assistentes de voz
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: [
        '.hero-section h1',
        '.lead-text',
        '.content-block h3',
        '.content-block p',
        '.faq-item summary',
        '.entity-definition p'
      ]
    },
    
    // ✅ GEO: Definir entidade principal
    mainEntity: products[0] ? {
      '@type': 'Product',
      name: products[0].name,
      brand: { '@type': 'Brand', name: products[0].brand || sanitizeCompanyName(company?.company_name) }
    } : undefined,
    
    // ✅ AI-READINESS: about semântico (pain_type + setor)
    about: [
      ...(solution.pain_type ? [{ '@type': 'Thing', name: solution.pain_type }] : []),
      { '@type': 'Thing', name: company?.business_sector || 'Odontologia Digital' },
      ...(company?.seo_technical_expertise ? [{ '@type': 'Thing', name: company.seo_technical_expertise }] : [])
    ],
    
    // ✅ AI-READINESS: mentions (produtos da solução + Organization)
    mentions: [
      ...products.slice(0, 5).map((p: any) => ({
        '@type': 'Product',
        name: p.name,
        ...(p.brand && { brand: { '@type': 'Brand', name: p.brand } })
      })),
      ...(company?.company_name ? [{
        '@type': 'Organization',
        name: company.company_name,
        '@id': `${company?.website_url || ''}/#organization`
      }] : [])
    ]
  });

  // ✅ FASE 7: ItemList Schema usando helper centralizado
  if (products && products.length > 0) {
    const itemListProducts = convertToItemListProducts(products, canonicalUrl);
    const itemListSchema = generateProductItemListSchema(itemListProducts, {
      listName: `Produtos - ${solution.title}`,
      includeOffers: true,
      includeBrand: true,
      listOrder: 'ascending',
      baseUrl: canonicalUrl
    });
    if (itemListSchema) {
      schemas.push(itemListSchema);
      console.log(`✅ [SCHEMA] ItemList Schema gerado com ${products.length} produtos`);
    }
  }

  // 4. Product Schemas (detalhados)
products.forEach(product => {
    const productSchema: any = {
      '@type': 'Product',
      name: product.name,
      description: product.description || product.name,
      image: product.image_url
    };

    if (product.brand) {
      productSchema.brand = { '@type': 'Brand', name: product.brand };
    }

    if (product.price) {
      productSchema.offers = {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url: product.product_url
      };
    }

    // ✅ AggregateRating para Rich Snippets com estrelas no Google
    // DINÂMICO: usa dados do Google via aggregateRating passado como parâmetro
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating?.ratingValue || '5.0',
      reviewCount: aggregateRating?.reviewCount || 30,  // ✅ CORRIGIDO: fallback seguro (mínimo real)
      bestRating: 5,
      worstRating: 1
    };

    // ✅ CORREÇÃO: Adicionar Reviews individuais ao Product Schema (Rich Snippets Google)
    if (authorityData && authorityData.reviews && authorityData.reviews.length > 0) {
      const reviewsSchema = generateReviewsSchema(authorityData.reviews, 5);
      if (reviewsSchema.length > 0) {
        productSchema.review = reviewsSchema;
      }
    }

    if (product.gtin) productSchema.gtin = product.gtin;
    if (product.mpn) productSchema.mpn = product.mpn;

    schemas.push(productSchema);
  });

  // ✅ FASE 6: FAQPage Schema usando helper centralizado
  if (faqs && faqs.length > 0) {
    const faqSchema = generateFAQPageSchema(faqs as FAQItem[], {
      minFaqCount: 2,
      minAnswerLength: 20,
      stripHtml: true
    });
    if (faqSchema) {
      schemas.push(faqSchema);
      console.log(`✅ [SCHEMA] FAQPage Schema gerado com ${faqs.length} perguntas`);
    }
  }

  // 6. Review Schemas (success cases)
  successCases.forEach(testimonial => {
    if (testimonial.client_name && testimonial.result_achieved) {
      schemas.push({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: testimonial.client_name
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 5,
          bestRating: 5
        },
        reviewBody: testimonial.result_achieved
      });
    }
  });

  // 7. BreadcrumbList Schema (FASE 9 - Helper Centralizado)
  const breadcrumbSchema = generateSolutionBreadcrumbs(
    {
      title: solution.title,
      category: solution.category,
      painType: solution.pain_type,
      canonicalUrl
    },
    {
      websiteUrl: company?.website || 'https://smartdent.com.br',
      websiteName: 'Home'
    }
  );
  schemas.push(breadcrumbSchema);
  console.log(`✅ [SCHEMA] BreadcrumbList gerado para solução: ${solution.title}`);

  // ✅ FASE 4: HowTo Schemas para produtos com workflow_stages
  const howToSchemas = products
    .filter((p: any) => p.workflow_stages && Object.values(p.workflow_stages).some((s: any) => s?.applicable))
    .map((product: any) => generateHowToSchema(product as ProductWithWorkflow, {
      includeSupplies: true,
      includeTips: true,
      includeImages: true,
      companyName: sanitizeCompanyName(company?.company_name),
      websiteUrl: company?.website_url || company?.website || canonicalUrl
    }))
    .filter(Boolean);

  if (howToSchemas.length > 0) {
    schemas.push(...howToSchemas);
    console.log(`✅ [SCHEMA] ${howToSchemas.length} HowTo schemas gerados para produtos com workflow_stages`);
  }

  // ✅ FASE 3: Person Schema para E-E-A-T (autor/KOL)
  if (authorKOL) {
    const personSchema = generatePersonSchema(authorKOL);
    schemas.push(personSchema);
    console.log(`✅ [SCHEMA] Person Schema (E-E-A-T) gerado para ${authorKOL.full_name}`);
  }

  return schemas;
}

// ═══════════════════════════════════════════════════════════
// 🎨 GERADOR DE HTML DA LANDING PAGE
// ═══════════════════════════════════════════════════════════

// Função auxiliar para escape HTML
function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Função para gerar embed de vídeo
function generateVideoEmbed(url: string): string {
  if (!url) return '';
  
  // YouTube (incluindo Shorts)
  if (url.includes('youtube.com/watch') || url.includes('youtu.be') || url.includes('youtube.com/shorts/')) {
    let videoId: string | null = null;
    
    if (url.includes('youtube.com/shorts/')) {
      // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
      videoId = url.split('/shorts/')[1]?.split('?')[0] || null;
    } else if (url.includes('youtu.be')) {
      // youtu.be/VIDEO_ID
      videoId = url.split('/').pop()?.split('?')[0] || null;
    } else {
      // youtube.com/watch?v=VIDEO_ID
      try {
        videoId = new URL(url).searchParams.get('v');
      } catch { videoId = null; }
    }
    
    if (!videoId) return '';
    
    return `
      <iframe 
        class="video-iframe"
        width="100%"
        height="100%"
        src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
        loading="lazy"
        title="Vídeo de Demonstração"
      ></iframe>
    `;
  }
  
  // Instagram
  if (url.includes('instagram.com')) {
    return `
      <div class="instagram-wrapper">
        <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin: 0 auto;">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver no Instagram</a>
        </blockquote>
        <script async src="//www.instagram.com/embed.js"></script>
      </div>
    `;
  }
  
  // TikTok
  if (url.includes('tiktok.com')) {
    const videoId = url.split('/video/')[1]?.split('?')[0] || url.split('/').pop();
    return `
      <div class="tiktok-wrapper">
        <blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="margin: 0 auto;">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver no TikTok</a>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>
      </div>
    `;
  }
  
  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('/').filter(Boolean).pop();
    if (!videoId) return '';
    
    return `
      <iframe 
        class="video-iframe"
        src="https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479" 
        width="100%"
        height="100%"
        frameborder="0" 
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write" 
        title="Vídeo de Demonstração"
        loading="lazy"
      ></iframe>
    `;
  }
  
  // Fallback: link direto
  return `
    <div class="video-fallback">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="video-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Assistir Vídeo</span>
      </a>
    </div>
  `;
}

/**
 * Enriquece keywords extraídas com benefits e features dos produtos
 */
function enrichKeywordsWithProductData(
  baseKeywords: string[],
  products: any[]
): string[] {
  const enrichedKeywords = [...baseKeywords];
  
  products.forEach(product => {
    // Adicionar top 3 benefits
    if (product.benefits && Array.isArray(product.benefits)) {
      const topBenefits = product.benefits.slice(0, 3);
      topBenefits.forEach((benefit: any) => {
        const benefitText = typeof benefit === 'string' 
          ? benefit 
          : benefit.title || benefit.text || '';
        
        if (benefitText && benefitText.length > 5) {
          enrichedKeywords.push(benefitText);
        }
      });
    }
    
    // Adicionar top 3 features
    if (product.features && Array.isArray(product.features)) {
      const topFeatures = product.features.slice(0, 3);
      topFeatures.forEach((feature: any) => {
        const featureText = typeof feature === 'string'
          ? feature
          : feature.title || feature.text || '';
        
        if (featureText && featureText.length > 5) {
          enrichedKeywords.push(featureText);
        }
      });
    }
  });
  
  // Remover duplicatas e limitar a 20 keywords
  return [...new Set(enrichedKeywords)]
    .filter(k => k && k.length > 0)
    .slice(0, 20);
}

// Função auxiliar para gerar o HTML da Landing Page com CSS padronizado
export function generateLandingPageHTML(
  solution: any, 
  products: any[], 
  company: any, 
  aiContent?: any,
  preview: boolean = false,
  authorityData?: AuthorityData | null,
  videoTestimonials?: VideoTestimonial[],
  aggregateRating?: AggregateRatingData | null
): string {
  const mainProduct = products[0] || {};
  const successCases = solution.success_cases || [];
  const pain_metrics = solution.pain_metrics || {};
  const faqs = solution.faq || [];
  
  // ✅ Usar textos customizados ou gerados por IA
  const customText = solution.landing_page_custom_text || {};
  
  console.log('🎨 [HTML] CustomText recebido:', Object.keys(customText));
  console.log('🤖 [HTML] AI Content recebido:', aiContent ? Object.keys(aiContent) : 'nenhum');
  
  // ✅ TÍTULO HERO: SEMPRE ESTÁTICO (manual ou solution.title)
  const finalHeroTitle = customText.hero_title || solution.title;
  
  // ✅ SUBTÍTULO HERO: PRIORIDADE - customText (manual) > aiContent (IA) > default (sales_pitch)
  const finalHeroSubtitle = customText.hero_subtitle || aiContent?.hero?.subtitle || 
    (solution.sales_pitch ? solution.sales_pitch.substring(0, 120) + '...' : `Solução completa com ${products.map(p => p.name).join(', ')}`);
  
  // ✅ MÉTRICAS: IA ou defaults
  const finalMetricsTitle = customText.metrics_title || aiContent?.metrics?.title || 'Transformação Real em Clínicas';
  const finalMetricsSubtitle = customText.metrics_subtitle || aiContent?.metrics?.subtitle ||
    `Imagine sua clínica entregando resultados no mesmo dia, sem retrabalho e sem depender de laboratórios externos. Hoje, muitos perdem pacientes pela demora e complexidade. Com ${products.slice(0, 2).map(p => p.name).join(' e ')}, clínicas parceiras eliminam gargalos críticos e se tornam referência em agilidade e previsibilidade.`;
  
  // ✅ FAQ: sempre estático (não gerado por IA nesta função)
  const finalFaqTitle = customText.faq_title || 'Perguntas Frequentes';
  
  // ✅ CTA: IA ou defaults
  const finalCtaText = customText.cta_text || aiContent?.cta?.text || 'Fale agora com nossos especialistas e transforme sua clínica';
  const finalCtaButtonText = customText.cta_button_text || aiContent?.cta?.buttonText || 'SOLICITAR DEMONSTRAÇÃO E PREÇO';
  
  console.log('🎨 [HTML] Texto final do hero subtitle:', finalHeroSubtitle.substring(0, 100));
  console.log('🎨 [HTML] Texto final metrics title:', finalMetricsTitle);
  
  // ✅ FASE 3.1: Aplicar Intelligent Links nos textos SPIN
  const canonicalUrl = solution.custom_url?.url || 'https://smartdent.com.br';
  const intelligentLinks = buildIntelligentLinksMap(products, canonicalUrl);
  
  // Enriquecer textos com links inteligentes
  const enrichedHeroSubtitle = applyIntelligentLinks(finalHeroSubtitle, intelligentLinks);
  const enrichedMetricsSubtitle = applyIntelligentLinks(finalMetricsSubtitle, intelligentLinks);
  const enrichedSalesPitch = solution.sales_pitch ? applyIntelligentLinks(solution.sales_pitch, intelligentLinks) : '';
  const enrichedPainDescription = solution.pain_description ? applyIntelligentLinks(solution.pain_description, intelligentLinks) : '';
  
  console.log('🔗 [INTELLIGENT LINKS] Links aplicados:', Object.keys(intelligentLinks).length);
  
  // HERO IMAGE (prioridade CORRETA: manual > IA > NADA)
  let heroImageSrc = '';
  let heroImageAlt = 'Banner hero';

  // 1️⃣ PRIORIDADE MÁXIMA: Upload Manual
  if (solution.ai_generated_images?.hero_banner?.mode === 'manual_upload') {
    const manualUpload = solution.ai_generated_images.hero_banner.manual_upload;
    if (manualUpload?.src) {
      heroImageSrc = manualUpload.src;
      heroImageAlt = manualUpload.alt || 'Banner hero personalizado';
    }
  }

  // 2️⃣ SEGUNDA PRIORIDADE: Imagem Gerada por IA
  else if (solution.ai_generated_images?.hero_banner?.mode === 'ai_generated') {
    const aiGenerated = solution.ai_generated_images.hero_banner.ai_generated;
    if (aiGenerated?.src) {
      heroImageSrc = aiGenerated.src;
      heroImageAlt = `Banner hero - ${solution.title}`;
    }
  }

  // ❌ REMOVIDO: Fallbacks para produto e placeholder
  // Se não configurou banner (mode === null ou 'none'), heroImageSrc fica vazio


  // Formatação do tipo de dor como badge
  const painTypeLabels: Record<string, string> = {
    delivery_speed: 'Velocidade de Entrega',
    competitive_edge: 'Vantagem Competitiva',
    patient_loss: 'Retenção de Pacientes',
    training_fear: 'Capacitação Profissional',
    high_lab_costs: 'Redução de Custos',
    lab_dependency: 'Independência Operacional',
    financial_roi: 'Retorno Financeiro',
    quality_durability: 'Qualidade Premium'
  };
  const badge = painTypeLabels[solution.pain_type] || 'SOLUÇÃO ODONTOLÓGICA';

  // 🔍 DEBUG: Verificar dados da tabela de comparação
  console.log('🔍 [COMPARISON TABLE DEBUG]', {
    enabled: solution.competitor_comparison?.enabled,
    title: solution.competitor_comparison?.title,
    headers: solution.competitor_comparison?.table_headers,
    headersLength: solution.competitor_comparison?.table_headers?.length,
    data: solution.competitor_comparison?.table_data,
    dataLength: solution.competitor_comparison?.table_data?.length,
    firstRow: solution.competitor_comparison?.table_data?.[0],
    willRender: !!(solution.competitor_comparison?.enabled && 
                   solution.competitor_comparison.table_headers?.length > 0 && 
                   solution.competitor_comparison.table_data?.length > 0)
  });

  // Lista de chaves das métricas recomendadas (padrão do sistema)
  const RECOMMENDED_METRIC_KEYS = [
    'ROI',
    'patient_loss',
    'revenue_loss',
    'lab_time',
    'digital_time',
    'learning_curve',
    'satisfaction_rate',
    'production_capacity',
    'delivery_time'
  ];

  // ═══════════════════════════════════════════════════════════
  // 🎯 ESTRATÉGIA DE MÉTRICAS (CORRIGIDA):
  // 
  // 1. MÉTRICAS PERSONALIZADAS (NÃO na lista RECOMMENDED):
  //    - Enviadas para a IA no prompt
  //    - Usadas NO SUBTÍTULO da seção de métricas
  //    - Exibidas NOS CARDS ANIMADOS (top 3) ✅ CORRIGIDO
  //
  // 2. MÉTRICAS RECOMENDADAS (na lista RECOMMENDED):
  //    - Usadas APENAS no subtítulo da IA
  //    - NÃO aparecem nos cards animados
  //
  // Objetivo: Evitar repetição e maximizar uso de dados personalizados
  // ═══════════════════════════════════════════════════════════

  const allMetrics = Object.entries(pain_metrics);

  // 🎯 CLASSIFICAÇÃO POR ORIGEM (chave), NÃO POR FORMATO
  const recommendedMetrics = allMetrics.filter(([key]) => RECOMMENDED_METRIC_KEYS.includes(key));
  const customMetrics = allMetrics.filter(([key]) => !RECOMMENDED_METRIC_KEYS.includes(key));

  // 🎯 Cards animados: APENAS métricas personalizadas (top 3)
  const selectedMetrics = customMetrics.slice(0, 3);

  const metricsArray = selectedMetrics.map(([key, value]) => {
    let displayValue = value;
    let numericValue = 0;
    let label = key.replace(/_/g, ' ');
    
    // 🔥 FORMATO 1: Objeto { label, value, unit }
    if (typeof value === 'object' && value !== null && 'label' in value) {
      label = value.label;
      numericValue = parseFloat(value.value) || 0;
      displayValue = `${value.value}${value.unit || ''}`;
    }
    // 🔥 FORMATO 2: String com número ("12 meses", "R$ 1.800,00", "30%")
    else if (typeof value === 'string') {
      // Remover símbolos de moeda e separadores
      const cleanValue = value.replace(/[R$\s]/g, '').replace(/\./g, '');
      const match = cleanValue.match(/(\d+(?:,\d+)?)/);
      
      if (match) {
        numericValue = parseFloat(match[1].replace(',', '.'));
      }
      
      displayValue = value;
    }
    // 🔥 FORMATO 3: Número puro
    else if (typeof value === 'number') {
      numericValue = value;
      displayValue = value.toString();
    }
    
    return [key, displayValue, numericValue, label];
  });
  
  console.log('📊 [HTML] Métricas classificadas:', {
    total: allMetrics.length,
    recommended: recommendedMetrics.length,
    custom: customMetrics.length,
    selected_for_cards: selectedMetrics.map(([k]) => k)
  });
  console.log('📊 [HTML] Métricas processadas (com labels):', metricsArray);

  // Links institucionais do rodapé
  const institutionalLinks = company?.institutional_links || [];

  // ═══════════════════════════════════════════════════════════
  // 🔍 SEO/GEO OTIMIZADO (v2.0)
  // ═══════════════════════════════════════════════════════════
  
  // 1️⃣ TÍTULO SEO-OTIMIZADO: Produto | Categoria | Marca
  const mainProductName = products[0]?.name || '';
  const mainBrand = products[0]?.brand || '';
  const companyName = sanitizeCompanyName(company?.company_name);
  const painLabel = painTypeLabels[solution.pain_type] || '';
  
  const rawSeoTitle = mainProductName 
    ? `${mainProductName}${mainBrand ? ` ${mainBrand}` : ''} | ${painLabel || solution.title} | ${companyName}`
    : `${solution.title} | ${companyName}`;
  
  // Limitar a 60 caracteres
  const seoTitle = rawSeoTitle.length > 60 
    ? rawSeoTitle.substring(0, 57) + '...'
    : rawSeoTitle;
  
  // 2️⃣ META DESCRIPTION: PRIMEIRO remover HTML, DEPOIS truncar
  const cleanHeroText = (enrichedHeroSubtitle || '').replace(/<[^>]*>/g, '').trim();
  const seoDescription = cleanHeroText.length > 20 
    ? cleanHeroText.substring(0, 155) + '...'
    : (solution.sales_pitch?.replace(/<[^>]*>/g, '').substring(0, 155) || 
       `Solução completa de ${products[0]?.name || 'odontologia'} para ${painLabel || 'sua clínica'}.`);
  
  // 3️⃣ KEYWORDS HUMANAS: Extrair LABELS das métricas (não chaves técnicas)
  const metricsLabels = Object.entries(pain_metrics)
    .map(([key, value]) => {
      if (typeof value === 'object' && (value as any)?.label) return (value as any).label;
      return null;
    })
    .filter(Boolean);
  
  // Keywords semânticas humanas
  const baseKeywords = [
    // Labels das métricas (ex: "tempo de laboratório")
    ...metricsLabels,
    // Nomes dos produtos
    ...products.map(p => p.name).filter(Boolean),
    // Marcas dos produtos
    ...products.map(p => p.brand).filter(Boolean),
    // Keywords de mercado dos produtos
    ...(products.flatMap(p => p.market_keywords || [])),
    // Keywords de intenção de busca
    ...(products.flatMap(p => p.search_intent_keywords || [])),
    // Label do tipo de dor
    painLabel
  ]
    .filter((k, i, arr) => arr.indexOf(k) === i) // unique
    .map(k => typeof k === 'string' ? k : (k as any)?.keyword || (k as any)?.name || '')
    .filter(k => k && k.length > 0);

  // 🎯 ENRIQUECIMENTO: Adicionar benefits e features
  const extractedKeywords = enrichKeywordsWithProductData(baseKeywords, products);

  console.log(`✅ [KEYWORDS] Enriquecidas: base=${baseKeywords.length}, final=${extractedKeywords.length}`);

  // ✅ FASE 3: Extrair authorKOL do aiContent
  const authorKOL = aiContent?.authorKOL || null;

  // Gerar schemas consolidados
  const schemas = generateSPINSchemas(
    solution,
    products,
    company,
    faqs,
    successCases,
    canonicalUrl,
    authorKOL, // ✅ FASE 3: Passar KOL para Person Schema
    aggregateRating, // ✅ CORREÇÃO: Passar aggregateRating para Product schemas
    authorityData  // ✅ CORREÇÃO: Passar authorityData para reviews individuais
  );

  // 🔗 INTEGRAÇÃO SISTEMA B: Adicionar VideoObject e DigitalDocument schemas
  const systemBResources: SystemBEnrichment | undefined = aiContent?.systemBResources;
  
  if (systemBResources?.videos?.length) {
    const videoSchemas = generateVideoObjectSchemas(systemBResources.videos);
    schemas.push(...videoSchemas);
    console.log(`✅ [SCHEMA] ${videoSchemas.length} VideoObject schemas adicionados`);
  }
  
  if (systemBResources?.documents?.length) {
    const documentSchemas = generateDocumentSchemas(systemBResources.documents);
    schemas.push(...documentSchemas);
    console.log(`✅ [SCHEMA] ${documentSchemas.length} DigitalDocument schemas adicionados`);
  }

  // ✅ FASE 10: Adicionar Authority Data schemas (VideoObjects empresa + testimonials)
  if (authorityData) {
    // 1. Company Video Schemas (até 10)
    const companyVideoSchemas = generateCompanyVideoSchemas(authorityData, { maxVideos: 10 });
    if (companyVideoSchemas.length > 0) {
      schemas.push(...companyVideoSchemas);
      console.log(`✅ [SCHEMA] ${companyVideoSchemas.length} VideoObject schemas (company videos)`);
    }
    
    // 2. Video Testimonial Schemas (até 15)
    const testimonialSchemas = generateVideoTestimonialSchemas(videoTestimonials || [], { maxVideos: 15 });
    if (testimonialSchemas.length > 0) {
      schemas.push(...testimonialSchemas);
      console.log(`✅ [SCHEMA] ${testimonialSchemas.length} VideoObject schemas (testimonials)`);
    }
    
    // 3. Video Gallery ItemList
    const videoGallery = generateVideoGallerySchema(authorityData, videoTestimonials || [], {
      galleryName: `Video Library - ${sanitizeCompanyName(company?.company_name)}`,
      maxVideos: 25
    });
    if (videoGallery) {
      schemas.push(videoGallery);
      console.log(`✅ [SCHEMA] VideoGallery ItemList schema gerado`);
    }
    
    // 4. Enrich Organization with sameAs
    const sameAsLinks = generateSameAsSchema(authorityData);
    const orgSchema = schemas.find((s: any) => s['@type'] === 'Organization');
    if (orgSchema && sameAsLinks.length > 0) {
      orgSchema.sameAs = [...new Set([...(orgSchema.sameAs || []), ...sameAsLinks])];
      if (authorityData.corporateIdentity?.brandValues) {
        orgSchema.ethicsPolicy = authorityData.corporateIdentity.brandValues;
      }
      if (authorityData.corporateIdentity?.missionStatement) {
        orgSchema.foundingPrinciples = authorityData.corporateIdentity.missionStatement;
      }
    }
  }

  // ✅ VALIDAÇÃO DE SCHEMAS OBRIGATÓRIOS
  const schemaTypes = schemas.map((s: any) => s['@type']);
  console.log(`✅ [SCHEMA] Total de schemas no @graph: ${schemas.length}`);
  console.log(`✅ [SCHEMA] Tipos: ${schemaTypes.join(', ')}`);
  
  const requiredTypes = ['Organization', 'WebPage', 'Product'];
  const missingTypes = requiredTypes.filter(t => !schemaTypes.includes(t));
  if (missingTypes.length > 0) {
    console.warn(`⚠️ [SCHEMA] Tipos obrigatórios faltantes: ${missingTypes.join(', ')}`);
  }
  
  // Consolidar schemas em @graph (Google recomenda)
  const consolidatedSchema = {
    '@context': 'https://schema.org',
    '@graph': schemas
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SEO BÁSICO -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="keywords" content="${escapeHtml(deduplicateKeywords(extractedKeywords, 20).join(', '))}">
  <meta name="author" content="${escapeHtml(sanitizeCompanyName(company?.company_name))}">
  <!-- Keywords enriquecidas com benefits e features dos produtos -->
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- META TAGS PARA IA GENERATIVA (SGE/AEO) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="ai-content-type" content="landingpage">
  <meta name="ai-topic" content="${escapeHtml(extractedKeywords.slice(0, 3).join(', ') || solution.title)}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- GEO TAGS (Localização para SEO Local) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="geo.region" content="BR-${company?.state || 'SP'}">
  <meta name="geo.placename" content="${escapeHtml(company?.city || 'São Carlos')}">
  <meta name="geo.position" content="${company?.latitude && company?.longitude ? `${company.latitude};${company.longitude}` : '-22.0087;-47.8909'}">
  <meta name="ICBM" content="${company?.latitude && company?.longitude ? `${company.latitude}, ${company.longitude}` : '-22.0087, -47.8909'}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SITEMAP REFERENCE -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link rel="sitemap" type="application/xml" href="${escapeHtml(canonicalUrl.split('/').slice(0, 3).join('/'))}/sitemap.xml">
  
  <!-- ✅ FASE 4.2: Metadados de Rastreabilidade -->
  ${solution.metadata?.artifact_chain?.pitch_version ? `<meta name="content-version" content="${solution.metadata.artifact_chain.pitch_version}">` : ''}
  ${solution.metadata?.quality_metrics?.data_quality_score ? `<meta name="content-quality" content="${solution.metadata.quality_metrics.data_quality_score}">` : ''}
  ${solution.metadata?.quality_metrics?.confidence_score ? `<meta name="content-confidence" content="${solution.metadata.quality_metrics.confidence_score}">` : ''}
  ${solution.metadata?.artifact_chain?.timestamp ? `<meta name="content-generated" content="${solution.metadata.artifact_chain.timestamp}">` : ''}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta name="robots" content="index, follow">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- OPEN GRAPH (Facebook, LinkedIn) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escapeHtml(sanitizeCompanyName(company?.company_name))}">
  <meta property="og:locale" content="pt_BR">
  ${(() => {
    // ✅ FASE 5: Múltiplas og:image da galeria de imagens dos produtos
    const galleryImages = products
      .filter(p => p.images_gallery && Array.isArray(p.images_gallery) && p.images_gallery.length > 0)
      .flatMap(p => p.images_gallery.map((img: any) => ({
        url: img.url || img.image_url,
        alt: img.alt || img.description || p.name,
        width: img.width || 1200,
        height: img.height || 630,
        is_main: img.is_main || false
      })))
      .filter(img => img.url)
      .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0)); // Priorizar is_main
    
    if (galleryImages.length > 0) {
      console.log(`✅ FASE 5 (SPIN): ${galleryImages.length} imagens adicionadas às meta tags OG`);
      return galleryImages.map((img, index) => `
  <meta property="og:image" content="${escapeHtml(img.url)}">
  <meta property="og:image:alt" content="${escapeHtml(img.alt)}">
  <meta property="og:image:width" content="${img.width}">
  <meta property="og:image:height" content="${img.height}">
  ${index === 0 ? `<meta name="twitter:image" content="${escapeHtml(img.url)}">
  <meta name="twitter:image:alt" content="${escapeHtml(img.alt)}">` : ''}`).join('');
    } else {
      // Fallback: usar heroImageSrc ou logo
      return `<meta property="og:image" content="${escapeHtml(heroImageSrc || company?.company_logo_url || '')}">
  <meta name="twitter:image" content="${escapeHtml(heroImageSrc || company?.company_logo_url || '')}">`;
    }
  })()}
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- TWITTER CARDS -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  
  <!-- ✅ FASE 10: Authority Meta Tags (Twitter, Facebook, Expertise) -->
  ${authorityData ? generateAuthorityMetaTags(authorityData) : ''}
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- HREFLANG (Multi-idioma Internacional) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${generateHreflangHTML(canonicalUrl)}
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- RESOURCE HINTS (Performance) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  ${heroImageSrc && !heroImageSrc.startsWith('data:') && heroImageSrc.startsWith('http') 
    ? `<link rel="preload" as="image" href="${escapeHtml(heroImageSrc)}" fetchpriority="high">` : ''}
  ${products[0]?.image_url && !products[0].image_url.startsWith('data:') 
    ? `<link rel="preload" as="image" href="${escapeHtml(products[0].image_url)}">` : ''}
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SCHEMA.ORG JSON-LD (@graph consolidado) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <script type="application/ld+json">
${JSON.stringify(consolidatedSchema, null, 2)}
  </script>
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- FONTS & ICONS -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- TRACKING PIXELS (GTM, GA4, Meta Pixel, TikTok) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${generateTrackingHeadScripts(company?.tracking_pixels as TrackingPixels, { preview })}
  
  <style>
    /* ===== ACCESSIBILITY: SKIP LINK ===== */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #3E4B5E;
      color: white;
      padding: 8px 16px;
      z-index: 100000;
      transition: top 0.3s;
      text-decoration: none;
      font-weight: 600;
    }
    .skip-link:focus {
      top: 0;
    }
    
    /* ===== DESIGN SYSTEM GEMINI V4.5 ===== */
    :root {
      /* Cores do Logo Smart Dent */
      --primary-dark: #3E4B5E;
      --primary-gradient-dark: #1e293b;
      --cta-bg-color: #3E4B5E;
      --accent-tech: #EE7A3E;
      --accent-glow: #FF9B67;
      
      /* Cores de Uso Geral */
      --text-color: #333333;
      --muted: #64748b;
      --card-bg: #ffffff;
      --background-color: #f8fafc;
      --section-light-bg: #fdfdfd;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      scroll-behavior: smooth;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .section-padding {
      padding: 4rem 0;
    }

    h1, h2, h3 {
      color: var(--primary-dark);
      font-weight: 800;
      letter-spacing: -0.8px;
    }

    /* ===== HEADER COM MENU ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 0;
      position: relative;
      z-index: 10;
    }

    .banner {
      width: 180px;
      height: auto;
    }

    .main-nav a {
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 600;
      font-size: 11px;
      margin-left: 1.5rem;
      transition: color 0.2s;
    }

    .main-nav a:hover {
      color: var(--accent-tech);
    }

    /* ===== INTERNAL NAV (SPIN Page sections) ===== */
    .internal-nav {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-left: 1rem;
    }

    .internal-nav a {
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 600;
      font-size: 10px;
      padding: 0.4rem 0.8rem;
      border-radius: 999px;
      background: rgba(62, 75, 94, 0.08);
      transition: all 0.2s;
      white-space: nowrap;
    }

    .internal-nav a:hover {
      background: var(--accent-tech);
      color: white;
    }

    @media screen and (max-width: 768px) {
      .main-nav {
        display: none;
      }
      .internal-nav {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        padding: 0.3rem 0;
        margin-left: 0;
        flex: 1;
        justify-content: flex-end;
      }
      .internal-nav::-webkit-scrollbar {
        display: none;
      }
      .header {
        flex-wrap: nowrap;
        gap: 0.5rem;
      }
      .banner {
        width: 120px;
        flex-shrink: 0;
      }
    }

    /* ===== HERO IMAGE - MODERN GLOSSY ===== */
        .image1-container {
          position: relative;
          width: 100%;
          min-height: 400px;
          aspect-ratio: 16 / 9;
          background: #000000;
          overflow: hidden;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          margin-top: -1rem;
        }

        .image1-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 1;
        }

        .text-overlay {
          position: absolute;
          top: 50%;
          left: 7%;
          transform: translateY(-50%);
          max-width: 50%;
          background: rgba(62, 75, 94, 0.85);
          padding: 32px 40px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

    .text-overlay small {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-glow);
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(255, 155, 103, 0.3);
      border: 1px solid var(--accent-tech);
    }

    .text-overlay h1 {
      font-size: 34px;
      line-height: 1.1;
      font-weight: 900;
      color: white;
      margin: 16px 0;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
      background: none;
      -webkit-text-fill-color: unset;
    }

    .text-overlay p {
      font-size: 14px;
      line-height: 1.7;
      color: #e0e0e0;
      margin: 0;
      font-weight: 500;
    }

    /* ===== SEÇÃO DE DEPOIMENTOS - CARROSSEL ===== */
    .testimonials-section {
      background: var(--section-light-bg);
      padding: 4rem 0;
      border-top: 1px solid #eee;
    }

    .testimonials-section h2 {
      font-size: 32px;
      margin-bottom: 3rem;
      text-align: center;
    }

    /* ===== ANIMAÇÃO INFINITE SCROLL (MARQUEE CONTÍNUO) ===== */
    @keyframes infinite-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .testimonials-carousel {
      display: flex;
      overflow: hidden; /* ✅ hidden ao invés de auto */
      gap: 1.5rem;
      padding: 0 0 1.5rem;
      width: 100%;
      margin: 0 auto;
      position: relative;
    }

    .testimonials-track {
      display: flex;
      gap: 1.5rem;
      animation: infinite-scroll 30s linear infinite; /* ✅ NOVA ANIMAÇÃO */
      will-change: transform;
    }

    .testimonials-track:hover {
      animation-play-state: paused; /* ✅ PAUSAR AO HOVER */
    }

    .testimonial-card {
      background: var(--card-bg);
      min-width: 320px;
      max-width: 380px;
      height: auto;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      scroll-snap-align: center;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .rating {
      color: var(--accent-tech);
      font-size: 16px;
      margin-bottom: 0.75rem;
    }

    .rating i {
      margin-right: 2px;
    }

    .testimonial-card p {
      font-size: 16px;
      line-height: 1.5;
      color: var(--text-color);
      margin-bottom: 1.5rem;
      font-style: italic;
      max-height: 120px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
    }

    .profile-info {
      display: flex;
      align-items: center;
      margin-top: auto;
    }

    .profile-info img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 1rem;
      border: 2px solid var(--accent-tech);
    }

    .details strong {
      display: block;
      font-size: 16px;
      color: var(--primary-dark);
      font-weight: 700;
    }

    .details small {
      display: block;
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }

    .instagram-link {
      margin-left: auto;
      color: var(--accent-tech);
      font-size: 14px;
      text-decoration: none;
      display: flex;
      align-items: center;
      font-weight: 600;
    }

    .instagram-link i {
      margin-left: 0.4rem;
      font-size: 18px;
    }

    /* ===== NARRATIVA SPIN CONTEXTUAL ===== */
    .spin-context {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 3rem 2rem;
      border-radius: 12px;
      text-align: center;
    }

    .spin-narrative {
      font-size: 1.15rem;
      line-height: 1.9;
      color: #495057;
      text-align: justify;
      max-width: 900px;
      margin: 0 auto;
      font-weight: 400;
    }

    .spin-narrative strong {
      color: #007bff;
      font-weight: 600;
    }

    /* ===== SEÇÃO DE MÉTRICAS ===== */
    .metrics-section {
      text-align: center;
      background: var(--section-light-bg);
      padding: 4rem 0;
      border-bottom: 1px solid #eee;
    }

    .metrics-section h2 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .metrics-section > p {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .metrics-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1000px;
      margin: 0 auto;
      padding: 0;
    }

    .metric-card {
      background: var(--card-bg);
      height: 250px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 12px;
      text-align: center;
      flex-direction: column;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e0e0e0;
      transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
      padding: 2rem;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 0 20px var(--accent-glow);
      border-color: var(--accent-tech);
    }

    .metrics-cards > div:first-child {
      background: linear-gradient(135deg, var(--primary-dark) 0%, #2a3442 100%);
      border: 1px solid var(--accent-tech);
      box-shadow: 0 0 40px rgba(238, 122, 62, 0.4), 0 15px 50px rgba(0, 0, 0, 0.4);
    }

    .metrics-cards > div:first-child .count {
      color: var(--accent-glow);
      text-shadow: 0 0 15px rgba(255, 155, 103, 0.8);
    }

    .metrics-cards > div:first-child span {
      color: #f0f0f0;
    }

    .metric-card .count {
      font-family: 'Montserrat', sans-serif;
      font-size: 64px;
      font-weight: 900;
      color: var(--accent-tech);
      display: block;
      margin-bottom: 4px;
      line-height: 1;
    }

    .metric-card .count {
      display: inline-flex;
      align-items: flex-start;
      line-height: 1;
      margin-bottom: 4px;
    }

    .metric-card .count .number {
      font-size: 64px;
      font-weight: 900;
      color: var(--accent-tech);
    }

    .metric-card .count .unit {
      font-size: 28px;
      font-weight: 600;
      color: var(--accent-tech);
      margin-left: 4px;
      opacity: 0.9;
      line-height: 1.1;
      vertical-align: super;
    }

    .metric-card span:not(.count):not(.number):not(.unit) {
      font-size: 16px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    /* ===== TABELA DE COMPARAÇÃO COM CONCORRENTES ===== */
    .comparison-section {
      text-align: center;
      padding: 4rem 0;
      background: var(--section-light-bg);
    }

    .comparison-section h2 {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 1rem;
      color: var(--primary-dark);
    }

    .comparison-section .subtitle {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
      font-weight: 500;
    }

    .desktop-table {
      max-width: 1100px;
      margin: 0 auto;
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }

    .desktop-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .desktop-table thead {
      background: linear-gradient(135deg, var(--primary-dark) 0%, #2a3442 100%);
    }

    .desktop-table th {
      padding: 1.5rem 1rem;
      text-align: left;
      font-weight: 700;
      font-size: 16px;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 3px solid var(--accent-tech);
    }

    .desktop-table th:first-child {
      border-top-left-radius: 12px;
    }

    .desktop-table th:last-child {
      border-top-right-radius: 12px;
    }

    .desktop-table td {
      padding: 1.25rem 1rem;
      text-align: left;
      font-size: 15px;
      color: var(--text-color);
      border-bottom: 1px solid #e8e8e8;
      transition: background 0.2s;
    }

    .desktop-table tbody tr:hover {
      background: #f8f9fa;
    }

    .desktop-table tbody tr:last-child td {
      border-bottom: none;
    }

    /* Destaque para a coluna "Nossa Solução" (segunda coluna) */
    .desktop-table td:nth-child(2) {
      background: linear-gradient(135deg, rgba(238, 122, 62, 0.08) 0%, rgba(255, 155, 103, 0.05) 100%);
      font-weight: 600;
      color: var(--primary-dark);
    }

    .desktop-table tbody tr:hover td:nth-child(2) {
      background: linear-gradient(135deg, rgba(238, 122, 62, 0.12) 0%, rgba(255, 155, 103, 0.08) 100%);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .desktop-table {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .desktop-table table {
        min-width: 600px;
      }

      .desktop-table th,
      .desktop-table td {
        padding: 1rem 0.75rem;
        font-size: 14px;
      }
    }

    /* ===== FAQ - ESTILO GEMINI ===== */
    .faq {
      text-align: center;
      padding: 4rem 0;
      background: var(--section-light-bg);
    }

    .faq h3 {
      font-size: 32px;
      margin-bottom: 3rem;
    }

    .faq details {
      background: var(--card-bg);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid #e2e8f0;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
      text-align: left;
    }

    .faq details[open] {
      background: #fefefe;
      border-color: var(--accent-tech);
      box-shadow: 0 8px 25px rgba(238, 122, 62, 0.1);
    }

    .faq summary {
      font-weight: 700;
      font-size: 18px;
      color: var(--primary-dark);
      cursor: pointer;
      list-style: none;
      user-select: none;
      transition: color 0.2s;
    }

    .faq summary:hover {
      color: var(--accent-tech);
    }

    .faq summary::-webkit-details-marker {
      display: none;
    }

    .faq summary::before {
      content: "▶";
      display: inline-block;
      margin-right: 12px;
      font-size: 12px;
      color: var(--accent-tech);
      font-weight: 900;
      transition: transform 0.2s, color 0.2s;
    }

    .faq details[open] summary::before {
      transform: rotate(90deg);
    }

    .faq details p {
      font-size: 16px;
      line-height: 1.7;
      color: var(--text-color);
      padding-top: 1rem;
      border-top: 1px dashed #e2e8f0;
      margin-top: 1rem;
    }

    /* ===== SEÇÃO DE VÍDEO DE DEMONSTRAÇÃO ===== */
    .video-demo-section {
      text-align: center;
      padding: 4rem 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 20px;
      margin-bottom: 3rem;
    }

    .video-container {
      position: relative;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .video-container:hover {
      transform: translateY(-5px);
      box-shadow: 0 25px 80px rgba(0,0,0,0.3) !important;
    }

    .video-iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
    }

    .instagram-wrapper,
    .tiktok-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 500px;
    }

    .instagram-media,
    .tiktok-embed {
      max-width: 540px !important;
      width: 100% !important;
      margin: 0 auto !important;
    }

    .video-fallback {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4rem 2rem;
      background: #f8f9fa;
      border-radius: 16px;
      border: 3px dashed #dee2e6;
      min-height: 300px;
    }

    .video-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 24px;
      color: #EE7A3E;
      text-decoration: none;
      font-weight: 700;
      padding: 1.5rem 3rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }

    .video-link:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      text-decoration: none;
      color: #d66a30;
    }

    .video-link svg {
      flex-shrink: 0;
    }

    .video-caption {
      margin-top: 1.5rem;
      font-size: 18px;
      color: #6b7280;
      font-style: italic;
      text-align: center;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }

    /* Responsivo - Vídeo */
    @media (max-width: 768px) {
      .video-demo-section {
        padding: 3rem 1rem;
      }
      
      .video-demo-section .section-title {
        font-size: 28px !important;
      }
      
      .video-container {
        aspect-ratio: 16/10 !important;
        border-radius: 12px !important;
      }
      
      .video-caption {
        font-size: 16px !important;
        padding: 0 1rem;
      }
      
      .instagram-wrapper,
      .tiktok-wrapper {
        min-height: 400px;
      }
    }

    .faq details p * {
      all: unset;
      display: inline;
    }

    .biocompatible-note {
      margin-top: 1.5rem;
      padding: 1rem;
      border-left: 4px solid var(--accent-tech);
      background: #fffaf5;
      font-style: italic;
      color: var(--primary-dark);
      font-weight: 600;
      border-radius: 4px;
    }

    /* ===== RECURSOS TÉCNICOS SISTEMA B ===== */
    .technical-resources-section {
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      padding: 4rem 0;
      text-align: center;
    }

    .technical-resources-section h2 {
      font-size: 32px;
      margin-bottom: 0.75rem;
      color: var(--primary-dark);
    }

    .technical-resources-section h2 i {
      color: var(--accent-tech);
      margin-right: 0.5rem;
    }

    .technical-resources-section .subtitle {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
    }

    .videos-gallery, .documents-gallery {
      margin-bottom: 3rem;
    }

    .videos-gallery h3, .documents-gallery h3 {
      font-size: 22px;
      margin-bottom: 1.5rem;
      color: var(--primary-dark);
      text-align: left;
    }

    .videos-gallery h3 i, .documents-gallery h3 i {
      color: var(--accent-tech);
      margin-right: 0.5rem;
    }

    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .video-card {
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      text-align: left;
    }

    .video-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.15);
    }

    .video-thumbnail-wrapper {
      position: relative;
      aspect-ratio: 16/9;
      background: #000;
    }

    .video-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.8);
      color: white;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .play-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 48px;
      opacity: 0.9;
      transition: opacity 0.2s, transform 0.2s;
    }

    .video-card:hover .play-overlay {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }

    .video-info {
      padding: 1rem;
    }

    .video-info h4 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: var(--primary-dark);
      line-height: 1.3;
    }

    .video-info p {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 0.75rem;
      line-height: 1.4;
    }

    .product-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 12px;
      color: var(--accent-tech);
      background: rgba(238, 122, 62, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
    }

    /* ===== DOCUMENTOS EM LISTA COMPACTA ===== */
    .documents-list {
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .documents-list-header {
      display: grid;
      grid-template-columns: 40px 1fr 180px 70px 40px;
      gap: 12px;
      padding: 10px 16px;
      background: #f8fafc;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      border-bottom: 1px solid #e2e8f0;
    }

    .documents-list-item {
      display: grid;
      grid-template-columns: 40px 1fr 180px 70px 40px;
      gap: 12px;
      padding: 12px 16px;
      align-items: center;
      text-decoration: none;
      color: inherit;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;
    }

    .documents-list-item:last-child {
      border-bottom: none;
    }

    .documents-list-item:hover {
      background: rgba(238, 122, 62, 0.04);
    }

    .documents-list-item .col-icon {
      font-size: 18px;
      color: var(--accent-tech);
    }

    .documents-list-item .col-name {
      min-width: 0;
    }

    .documents-list-item .col-name strong {
      display: block;
      font-weight: 600;
      font-size: 14px;
      color: var(--primary-dark);
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .documents-list-item .col-name small {
      display: block;
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .documents-list-item .col-product .product-badge {
      background: linear-gradient(135deg, rgba(238, 122, 62, 0.1) 0%, rgba(249, 168, 38, 0.1) 100%);
      color: var(--accent-tech);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      display: inline-block;
    }

    .documents-list-item .col-size {
      font-size: 12px;
      color: var(--muted);
      text-align: right;
    }

    .documents-list-item .col-download {
      color: var(--muted);
      font-size: 14px;
      text-align: center;
      transition: color 0.2s;
    }

    .documents-list-item:hover .col-download {
      color: var(--accent-tech);
    }

    @media (max-width: 768px) {
      .videos-grid {
        grid-template-columns: 1fr;
      }
      .documents-list-header {
        display: none;
      }
      .documents-list-item {
        grid-template-columns: 36px 1fr 36px;
        gap: 10px;
        padding: 14px 12px;
      }
      .documents-list-item .col-product,
      .documents-list-item .col-size {
        display: none;
      }
      .technical-resources-section h2 {
        font-size: 26px;
      }
    }

    /* ===== CTA - GRADIENTE GEMINI ===== */
    .cta {
      text-align: center;
      padding: 4rem 0;
      background: linear-gradient(135deg, var(--accent-tech) 0%, var(--accent-glow) 100%);
      color: white;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.1);
    }

    .cta p {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 2rem;
      line-height: 1.3;
      color: white;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.3);
    }

    .cta button {
      background: linear-gradient(to top, var(--primary-dark), #4a5c73);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 22px;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), inset 0 2px 5px rgba(255,255,255,0.2);
      transition: all 0.1s ease;
    }

    .cta button:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255,255,255,0.3);
    }

    .sticky-cta {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 10px 20px;
      background: var(--primary-dark);
      color: white;
      box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      text-align: center;
    }

    .sticky-cta button {
      width: 90%;
      padding: 14px 20px;
      font-size: 18px;
      background: var(--accent-tech);
      color: white;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    /* ===== FOOTER - SMART DENT COLORS ===== */
    footer {
      background: #3E4B5E !important;
      padding: 0 !important;
    }

    .footer-top-bar {
      background: #EE7A3E !important;
      height: 6px !important;
      width: 100% !important;
    }

    .footer-content {
      padding: 2.5rem 0 1.5rem !important;
    }

    .footer-columns {
      display: grid !important;
      grid-template-columns: 2fr 1fr !important;
      gap: 2rem !important;
    }

    .footer-locations-grid {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 1.5rem !important;
    }

    .footer-location-card {
      display: block !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .footer-location-card strong {
      display: block !important;
      font-weight: 700 !important;
      font-size: 16px !important;
      color: #EE7A3E !important;
      margin-bottom: 8px !important;
    }

    .footer-location-card p {
      display: block !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
      color: #ccc !important;
      margin: 0 !important;
    }

    .footer-location-card i {
      color: #EE7A3E !important;
      margin-right: 6px !important;
    }

    .footer-links-column {
      display: flex !important;
      flex-direction: column !important;
    }

    .footer-links-column strong {
      font-weight: 700 !important;
      display: block !important;
      margin-bottom: 0.75rem !important;
      font-size: 16px !important;
      color: #EE7A3E !important;
    }

    .footer-links-column a {
      color: #b0c4de !important;
      text-decoration: none !important;
      font-size: 14px !important;
      display: block !important;
      margin: 0.4rem 0 !important;
      transition: color 0.2s !important;
    }

    .footer-links-column a:hover {
      color: #EE7A3E !important;
      text-decoration: underline !important;
    }

    /* ===== SOCIAL ICONS - HORIZONTAL ROW ===== */
    .footer-social-inline {
      margin-top: 1.5rem !important;
      padding-top: 1rem !important;
      border-top: 1px solid rgba(255,255,255,0.1) !important;
    }

    .footer-social-links {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 10px !important;
      margin-top: 0.5rem !important;
    }

    .footer-social-links a {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 36px !important;
      height: 36px !important;
      background: rgba(255, 255, 255, 0.15) !important;
      border-radius: 50% !important;
      margin: 0 !important;
      transition: all 0.3s ease !important;
    }

    .footer-social-links a:hover {
      background: #EE7A3E !important;
      transform: translateY(-3px) !important;
      text-decoration: none !important;
    }

    .footer-social-links a i {
      font-size: 16px !important;
      color: #fff !important;
    }

    .footer-copyright {
      text-align: center !important;
      padding: 1rem 0 !important;
      border-top: 1px solid rgba(255,255,255,0.1) !important;
      margin-top: 1.5rem !important;
      color: #999 !important;
      font-size: 13px !important;
    }

    /* ===== RESPONSIVO TABLET ===== */
    @media screen and (max-width: 1024px) {
      .text-overlay {
        max-width: 65%;
        padding: 28px 32px;
      }
      .text-overlay h1 {
        font-size: 27px;
      }
      .image1-container {
        aspect-ratio: 4 / 3;
      }
    }

    /* ===== RESPONSIVO MOBILE ===== */
    @media screen and (max-width: 768px) {
      .main-nav {
        display: none;
      }
      .header {
        justify-content: center;
      }

      .image1-container {
        min-height: 300px;
        border-radius: 0;
        aspect-ratio: unset;
      }
      
      .text-overlay {
        position: static;
        transform: none;
        max-width: 100%;
        padding: 24px;
        border-radius: 0;
        box-shadow: none;
        border: none;
        background: var(--primary-dark);
        backdrop-filter: none;
      }

      .text-overlay h1 {
        font-size: 21px;
        margin-top: 0;
        color: white;
      }
      
      .text-overlay p {
        color: #e0e0e0;
      }
      
      .metrics-section {
        padding: 3rem 0;
      }
      
      .cta {
        padding: 3rem 0;
      }
      
      .cta p {
        font-size: 22px;
        margin-bottom: 1.5rem;
      }
      
      .faq {
        padding: 3rem 0;
      }
      
      .testimonials-section {
        padding: 3rem 0;
      }

      /* MANTÉM OS 3 CARDS DE MÉTRICAS EM LINHA */
      .metrics-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        padding: 0 0.75rem;
      }
      
      .metric-card {
        min-width: unset;
        height: auto;
        min-height: 180px;
        padding: 1rem 0.75rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
      }
      
      .metric-card .count .number {
        font-size: 48px;
      }
      
      .metric-card .count .unit {
        font-size: 21px;
        margin-left: 2px;
      }
      
      .metric-card span:not(.count):not(.number):not(.unit) {
        font-size: 13px;
        line-height: 1.2;
        min-height: 35px;
        text-align: center;
        word-break: normal;
        overflow-wrap: break-word;
        hyphens: auto;
        display: block;
        width: 100%;
      }

      /* Carrossel de Depoimentos Mobile */
      .testimonials-carousel {
        overflow-x: auto; /* ✅ SCROLL MANUAL NO MOBILE */
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 0 1.5rem 1rem;
        gap: 1rem;
      }
      
      .testimonials-track {
        animation: none; /* ✅ DESABILITAR ANIMAÇÃO NO MOBILE */
      }
      
      .testimonial-card {
        min-width: 85vw;
        height: auto;
        scroll-snap-align: start;
      }

      .sticky-cta {
        display: block;
      }
      
      .cta .container {
        display: none;
      }
      
      .footer-columns {
        flex-direction: column;
        gap: 2rem;
      }
    }

    /* ===== HERO SEM IMAGEM (texto em fundo sólido) ===== */
    .hero-text-only {
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-gradient-dark) 100%);
      padding: 4rem 2rem;
      text-align: center;
      color: white;
    }

    .hero-text-only small {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-glow);
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(255, 155, 103, 0.3);
      border: 1px solid var(--accent-tech);
    }

    .hero-text-only h1 {
      font-size: 48px;
      line-height: 1.2;
      font-weight: 900;
      color: white;
      margin: 16px 0;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
    }

    .hero-text-only p {
      font-size: 20px;
      line-height: 1.7;
      color: #e0e0e0;
      margin: 0;
      max-width: 700px;
      margin: 0 auto;
      font-weight: 500;
    }

    /* ===== SEÇÃO DE CONTEÚDO INDEXÁVEL (GEO) ===== */
    .indexable-content {
      padding: 60px 0;
      background: var(--section-light-bg);
    }

    .content-header {
      margin-bottom: 40px;
      text-align: center;
    }

    .content-header h2 {
      font-size: 32px;
      color: var(--primary-dark);
      margin-bottom: 16px;
    }

    .lead-text {
      font-size: 18px;
      line-height: 1.8;
      color: var(--muted);
      max-width: 800px;
      margin: 0 auto;
    }

    .article-body {
      max-width: 900px;
      margin: 0 auto;
    }

    .content-block {
      margin-bottom: 32px;
      padding: 24px;
      background: var(--card-bg);
      border-radius: 12px;
      border-left: 4px solid var(--accent-tech);
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .content-block h3 {
      font-size: 22px;
      color: var(--primary-dark);
      margin-bottom: 16px;
    }

    .content-block p {
      font-size: 16px;
      line-height: 1.8;
      color: var(--text-color);
    }

    .benefits-list {
      list-style: disc;
      padding-left: 24px;
    }

    .benefits-list li {
      margin-bottom: 8px;
      line-height: 1.6;
      color: var(--text-color);
    }

    .entity-definition {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-left-color: var(--primary-dark);
    }
  </style>
</head>
<body>
  <!-- Skip Link for Accessibility -->
  <a href="#main-content" class="skip-link">Pular para o conteúdo principal</a>
  ${generateGTMNoScript(company?.tracking_pixels as TrackingPixels, { preview })}
  
  <!-- Header com Logo e Menu -->
  <div class="container">
    <div class="header">
      <!-- Logo com fallback robusto -->
      <a href="${escapeHtml(company?.website_url || '/')}" class="logo-link">
        <img src="${escapeHtml(company?.company_logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sanitizeCompanyName(company?.company_name))}&size=180&background=3E4B5E&color=fff`)}" 
             alt="Logo ${escapeHtml(sanitizeCompanyName(company?.company_name))}" 
             class="banner" width="180" height="60" loading="eager"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(sanitizeCompanyName(company?.company_name))}&size=180&background=3E4B5E&color=fff'">
      </a>
      
      <!-- Navegação Externa (site principal) -->
      <nav class="main-nav" aria-label="Navegação principal">
        ${(() => {
          const navConfig = company?.navigation_footer_config;
          const menuItems = navConfig?.navigation_menu || [];
          
          if (menuItems && menuItems.length > 0) {
            return menuItems
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((item: any) => `<a href="${escapeHtml(item.href)}"${item.openInNewTab ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(item.label)}</a>`)
              .join('');
          }
          
          return `
            <a href="https://loja.smartdent.com.br/">Loja</a>
            <a href="https://parametros.smartdent.com.br/base-conhecimento">Blog</a>
            <a href="https://api.whatsapp.com/send/?phone=5516993831794" target="_blank" rel="noopener">Fale conosco</a>
          `;
        })()}
      </nav>
      
      <!-- Navegação Interna (seções da página SPIN) -->
      <nav class="internal-nav" aria-label="Navegação da página">
        <a href="#main-content">Sobre</a>
        <a href="#produtos">Produtos</a>
        ${faqs?.length ? '<a href="#faq">FAQ</a>' : ''}
        ${solution.selected_video_url ? '<a href="#video-demo">Vídeo</a>' : ''}
        <a href="#cta">Contato</a>
      </nav>
    </div>
  </div>

  <!-- Hero Image com Texto Sobreposto -->
  <div class="container">
    ${heroImageSrc ? `
    <!-- Hero com imagem de fundo -->
    <div class="image1-container">
      <img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(heroImageAlt)}" width="1200" height="675" loading="eager" fetchpriority="high">
      <div class="text-overlay">
        <small><i class="fas fa-microchip"></i> ${escapeHtml(badge)}</small>
        <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
        <p data-editable="true" data-field="hero_subtitle">${enrichedHeroSubtitle}</p>
      </div>
    </div>
    ` : `
    <!-- Hero sem imagem (apenas texto em fundo sólido) -->
    <div class="hero-text-only">
      <small><i class="fas fa-microchip"></i> ${escapeHtml(badge)}</small>
      <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
      <p data-editable="true" data-field="hero_subtitle">${enrichedHeroSubtitle}</p>
    </div>
    `}
    </div>
  </div>

  ${aiContent?.spinNarrative ? `
  <!-- Contexto Narrativo SPIN -->
  <div class="container section-padding">
    <section class="spin-context">
      <p class="spin-narrative" data-editable="true" data-field="spin_narrative">
        ${escapeHtml(aiContent.spinNarrative)}
      </p>
    </section>
  </div>
  ` : ''}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 📝 SEÇÃO DE CONTEÚDO INDEXÁVEL (GEO/SGE) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <main id="main-content" class="indexable-content container section-padding">
    <article itemscope itemtype="https://schema.org/Article">
      <header class="content-header">
        <h2 itemprop="headline">${escapeHtml(solution.title)}</h2>
        <p itemprop="description" class="lead-text">
          ${escapeHtml((solution.pain_description || solution.sales_pitch || '').replace(/<[^>]*>/g, '').substring(0, 300))}
        </p>
      </header>
      
      <section itemprop="articleBody" class="article-body">
        ${solution.sales_pitch ? `
        <div class="content-block">
          <h3>Por que escolher esta solução?</h3>
          <p>${escapeHtml(solution.sales_pitch.replace(/<[^>]*>/g, ''))}</p>
        </div>
        ` : ''}
        
        ${products.length > 0 && products.some((p: any) => p.benefits?.length > 0) ? `
        <div class="content-block">
          <h3>Principais Benefícios</h3>
          <ul class="benefits-list">
            ${products
              .flatMap((p: any) => (p.benefits || []).slice(0, 3))
              .slice(0, 6)
              .map((b: any) => `<li>${escapeHtml(typeof b === 'string' ? b : b.title || b.text || '')}</li>`)
              .join('')}
          </ul>
        </div>
        ` : ''}
        
        <div class="content-block entity-definition">
          <h3>Sobre ${escapeHtml(sanitizeCompanyName(company?.company_name))}</h3>
          <p>
            ${escapeHtml(company?.seo_technical_expertise || 
              `${sanitizeCompanyName(company?.company_name)} é especialista em ${painTypeLabels[solution.pain_type] || 'soluções odontológicas'}, oferecendo produtos de alta qualidade para profissionais da odontologia.`)}
          </p>
          ${company?.mission_statement ? `<p><strong>Missão:</strong> ${escapeHtml(company.mission_statement)}</p>` : ''}
        </div>
      </section>
      
      <meta itemprop="author" content="${escapeHtml(sanitizeCompanyName(company?.company_name))}">
      <meta itemprop="datePublished" content="${new Date().toISOString().split('T')[0]}">
    </article>
  </main>

  ${solution.selected_video_url ? `
  <!-- ========== SEÇÃO DE VÍDEO DE DEMONSTRAÇÃO ========== -->
  <div class="container section-padding" id="video-demo" style="padding-top: 3rem; padding-bottom: 3rem;">
    <section class="video-demo-section">
      <h2 class="section-title" data-editable="true" data-field="video_demo_title" style="font-size: 36px; font-weight: 800; text-align: center; margin-bottom: 2rem; color: var(--primary-dark);">
        ${escapeHtml(customText.video_demo_title || '🎬 Veja na prática')}
      </h2>
      
      <div class="video-container" style="max-width: 1000px; margin: 0 auto; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); background: #000;">
        ${generateVideoEmbed(solution.selected_video_url)}
      </div>
    </section>
  </div>
  ` : ''}

  ${metricsArray.length > 0 ? `
  <!-- Seção de Métricas -->
  <div class="container section-padding" id="produtos">
    <section class="metrics-section">
      <h2 data-editable="true" data-field="metrics_title">${escapeHtml(finalMetricsTitle)}</h2>
      <p data-editable="true" data-field="metrics_subtitle">${enrichedMetricsSubtitle}</p>
      <div class="metrics-cards" id="metrics-counter">
        ${metricsArray.map(([key, displayValue, numericValue, label]) => {
          // 🔥 Aplicar edições do customText aos rótulos das métricas
          const labelKey = `metric_label_${key}`;
          const finalLabel = (customText && customText[labelKey]) || label;
          
          // 🔥 Extrair unidade de medida do displayValue
          const unit = String(displayValue).replace(/[\d\.,\s]+/g, '').trim();
          
          return `
          <div class="metric-card">
            <span class="count" data-target="${numericValue || 0}" data-unit="${unit}">
              <span class="number">0</span><span class="unit">${escapeHtml(unit)}</span>
            </span>
            <span data-editable="true" data-field="metric_label_${escapeHtml(key)}">${escapeHtml(finalLabel)}</span>
          </div>
        `}).join('')}
      </div>
    </section>
  </div>
  ` : ''}

  ${solution.competitor_comparison?.enabled && 
    (!solution.competitor_comparison.table_headers?.length || !solution.competitor_comparison.table_data?.length) ? `
  <!-- AVISO: Tabela de comparação habilitada mas sem dados -->
  <div class="container section-padding">
    <section class="comparison-section">
      <p style="color: #999; font-style: italic; text-align: center;">
        ⚠️ Tabela de comparação habilitada mas sem dados preenchidos. Preencha os headers e dados da tabela no editor.
      </p>
    </section>
  </div>
  ` : ''}

  ${solution.competitor_comparison?.enabled && solution.competitor_comparison.table_headers?.length > 0 && solution.competitor_comparison.table_data?.length > 0 ? `
  <!-- ========== SEÇÃO: TABELA DE COMPARAÇÃO COM CONCORRENTES ========== -->
  <div class="container section-padding">
    <section class="comparison-section">
      <h2 data-editable="true" data-field="comparison_title">${escapeHtml(solution.competitor_comparison.title || 'Por que escolher nossa solução?')}</h2>
      ${solution.competitor_comparison.subtitle ? `<p class="subtitle" data-editable="true" data-field="comparison_subtitle">${escapeHtml(solution.competitor_comparison.subtitle)}</p>` : ''}
      
      <div class="desktop-table">
        <table>
          <thead>
            <tr>
              ${solution.competitor_comparison.table_headers.map((header: string, index: number) => `
                <th data-editable="true" data-field="comparison_header_${index}">${escapeHtml(header)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${solution.competitor_comparison.table_data.map((row: any, rowIndex: number) => `
              <tr>
                ${solution.competitor_comparison.table_headers.map((header: string, colIndex: number) => {
                  const cellValue = row[header];
                  const displayValue = (cellValue !== undefined && cellValue !== null && cellValue !== '') 
                    ? cellValue 
                    : '-';
                  
                  return `<td data-editable="true" data-field="comparison_cell_${rowIndex}_${colIndex}">${escapeHtml(displayValue)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  </div>
  ` : ''}

  ${(() => {
    // 🆕 TABELAS DE COMPARAÇÃO POR PRODUTO (vindas do products_repository)
    const productComparisons = aiContent?.productComparisonTables || [];
    const validComparisons = productComparisons.filter((item: any) => 
      item?.comparison?.enabled && 
      item?.comparison?.table_headers?.length > 0 && 
      item?.comparison?.table_data?.length > 0
    );
    
    if (validComparisons.length === 0) return '';
    
    console.log(`📊 [HTML] Renderizando ${validComparisons.length} tabelas de comparação de produtos`);
    
    return `
  <!-- ========== SEÇÃO: TABELAS DE COMPARAÇÃO POR PRODUTO ========== -->
  <div class="container section-padding">
    <section class="comparison-section">
      <h2>Comparativo Detalhado por Produto</h2>
      <p class="subtitle">Veja como cada produto se destaca frente aos concorrentes</p>
      
      ${validComparisons.map((item: any) => `
        <div style="margin-top: 3rem;">
          <h3 style="font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 1rem;">
            Comparativo: ${escapeHtml(item.productName)}
          </h3>
          ${item.comparison.subtitle ? `<p style="color: var(--muted); margin-bottom: 1.5rem;">${escapeHtml(item.comparison.subtitle)}</p>` : ''}
          <div class="desktop-table">
            <table>
              <thead>
                <tr>
                  ${item.comparison.table_headers.map((header: string) => `
                    <th>${escapeHtml(header)}</th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${item.comparison.table_data.map((row: any) => `
                  <tr>
                    ${item.comparison.table_headers.map((header: string) => {
                      const cellValue = row[header];
                      const displayValue = (cellValue !== undefined && cellValue !== null && cellValue !== '') 
                        ? cellValue 
                        : '-';
                      return `<td>${escapeHtml(displayValue)}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </section>
  </div>
    `;
  })()}

  ${(() => {
    // 🔗 INTEGRAÇÃO SISTEMA B: Seção de Recursos Técnicos (Vídeos + Documentos)
    const systemBResources: SystemBEnrichment | undefined = aiContent?.systemBResources;
    const hasVideos = systemBResources?.videos?.length > 0;
    const hasDocuments = systemBResources?.documents?.length > 0;
    
    if (!hasVideos && !hasDocuments) return '';
    
    console.log('🎬 [HTML] Renderizando seção de recursos técnicos:', {
      videos: systemBResources?.videos?.length || 0,
      documents: systemBResources?.documents?.length || 0
    });
    
    return `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🎬 SEÇÃO: RECURSOS TÉCNICOS DO SISTEMA B -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="container section-padding">
    <section class="technical-resources-section">
      <h2 data-editable="true" data-field="technical_resources_title">
        <i class="fas fa-play-circle"></i> Veja como funciona na prática
      </h2>
      
      ${(() => {
        // 🎬 Usar vídeos dos produtos selecionados (productVideos) em vez do Sistema B
        const productVideos = aiContent?.productVideos || [];
        if (productVideos.length === 0) return '';
        
        // Função para obter badge por tipo
        const getTypeBadge = (type: string) => {
          const badges: Record<string, { icon: string; label: string; color: string }> = {
            youtube: { icon: 'fab fa-youtube', label: 'YouTube', color: '#ff0000' },
            instagram: { icon: 'fab fa-instagram', label: 'Instagram', color: '#e4405f' },
            tiktok: { icon: 'fab fa-tiktok', label: 'TikTok', color: '#000000' },
            technical: { icon: 'fas fa-cog', label: 'Técnico', color: '#3498db' },
            testimonial: { icon: 'fas fa-comments', label: 'Depoimento', color: '#27ae60' }
          };
          return badges[type] || badges.youtube;
        };
        
        return `
      <!-- Galeria de Vídeos dos Produtos -->
      <div class="videos-gallery product-tutorials">
        <div class="videos-grid">
          ${productVideos.map((video: any, index: number) => {
            const badge = getTypeBadge(video.type);
            const truncatedDesc = video.description 
              ? (video.description.length > 100 ? video.description.substring(0, 100) + '...' : video.description)
              : '';
            
            return `
          <div class="video-card" data-index="${index}">
            <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="video-link">
              <div class="video-thumbnail-wrapper">
                ${video.thumbnail 
                  ? `<img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.title)}" loading="lazy" decoding="async" class="video-thumbnail">`
                  : `<div class="video-thumb-placeholder"><i class="fas fa-play-circle"></i></div>`
                }
                <div class="play-overlay">
                  <i class="fas fa-play-circle"></i>
                </div>
                <span class="video-type-badge" style="background-color: ${badge.color}">
                  <i class="${badge.icon}"></i> ${badge.label}
                </span>
              </div>
              <div class="video-info">
                <h4>${escapeHtml(video.title)}</h4>
                ${truncatedDesc ? `<p>${escapeHtml(truncatedDesc)}</p>` : ''}
                <span class="product-badge"><i class="fas fa-box"></i> ${escapeHtml(video.productName)}</span>
              </div>
            </a>
          </div>
            `;
          }).join('')}
        </div>
      </div>
        `;
      })()}
      
      ${hasDocuments ? `
      <!-- Downloads Técnicos -->
      <div class="documents-gallery">
        <h3><i class="fas fa-file-pdf"></i> Documentação Técnica</h3>
        <div class="documents-list">
          <div class="documents-list-header">
            <span></span>
            <span>Documento</span>
            <span>Produto</span>
            <span>Tamanho</span>
            <span></span>
          </div>
          ${systemBResources!.documents.map((doc, index) => {
            const fileSize = doc.tamanho_bytes > 0 
              ? doc.tamanho_bytes < 1024 * 1024 
                ? `${(doc.tamanho_bytes / 1024).toFixed(0)} KB`
                : `${(doc.tamanho_bytes / (1024 * 1024)).toFixed(1)} MB`
              : '—';
            const fileIcon = (doc.tipo_arquivo || 'pdf') === 'pdf' ? 'fa-file-pdf' : 'fa-file-alt';
            
            return `
          <a href="${escapeHtml(doc.url_download)}" target="_blank" rel="noopener noreferrer" class="documents-list-item" data-index="${index}">
            <span class="col-icon"><i class="fas ${fileIcon}"></i></span>
            <span class="col-name">
              <strong>${escapeHtml(doc.nome)}</strong>
              ${doc.descricao ? `<small>${escapeHtml(doc.descricao.substring(0, 60))}${doc.descricao.length > 60 ? '...' : ''}</small>` : ''}
            </span>
            <span class="col-product">${doc.produto_correlacionado ? `<span class="product-badge">${escapeHtml(doc.produto_correlacionado.nome)}</span>` : '—'}</span>
            <span class="col-size">${fileSize}</span>
            <span class="col-download"><i class="fas fa-download"></i></span>
          </a>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Metadados de sincronização (oculto, para rastreabilidade) -->
      <meta name="system-b-sync" content="${systemBResources?.syncedAt || new Date().toISOString()}">
      <meta name="technical-resources-count" content="${(systemBResources?.videos?.length || 0) + (systemBResources?.documents?.length || 0)}">
    </section>
  </div>
    `;
  })()}

  ${faqs.length > 0 ? `
  <!-- Seção de FAQs (Acordeão) -->
  <div class="container" id="faq">
    <section class="faq">
      <h3 data-editable="true" data-field="faq_title">${escapeHtml(finalFaqTitle)}</h3>
      ${(() => {
        // 🔥 Mudança 2B: Aplicar edições do customText à FAQ
        const effectiveFaqs = faqs.map((faq: any, index: number) => ({
          question: (customText && customText[`faq_question_${index}`]) || faq.question,
          answer: (customText && customText[`faq_answer_${index}`]) || faq.answer
        }));
        
        return effectiveFaqs.map((faq: any, index: number) => `
        <details>
          <summary data-editable="true" data-field="faq_question_${index}"><i class="fas fa-chart-line"></i> ${escapeHtml(faq.question)}</summary>
          <p data-editable="true" data-field="faq_answer_${index}">${escapeHtml(faq.answer)}</p>
        </details>
      `).join('');
      })()}
    </section>
  </div>
  ` : ''}

  ${/* Seção de vídeos dos produtos foi movida para "Veja como funciona na prática" acima */ ''}

  ${/* 📰 SEÇÃO: ÚLTIMAS PUBLICAÇÕES DO SISTEMA B */
  (() => {
    const publications = aiContent?.productPublications || [];
    if (publications.length === 0) return '';
    
    const escHtml = (str: string) => str?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';
    
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { return ''; }
    };
    
    const articleSchemas = publications.map((pub: any) => ({
      '@type': 'Article',
      'headline': pub.title,
      'description': pub.excerpt,
      'image': pub.image_url || company?.company_logo_url,
      'url': pub.url,
      'datePublished': pub.published_at,
      'author': { '@type': 'Organization', 'name': sanitizeCompanyName(company?.company_name) },
      'articleSection': pub.category?.name
    }));
    
    return `
  <!-- 📰 SEÇÃO: ÚLTIMAS PUBLICAÇÕES (SISTEMA B) -->
  <section class="latest-publications-section">
    <div class="container">
      <h2><i class="fas fa-newspaper"></i> Últimas Publicações</h2>
      <p class="section-subtitle">Conteúdos relacionados aos produtos selecionados nesta solução</p>
      
      <div class="publications-grid">
        ${publications.map((pub: any) => `
          <a href="${escHtml(pub.url)}" target="_blank" rel="noopener noreferrer" class="publication-card-link">
            <article class="publication-card">
              <div class="publication-image">
                ${pub.image_url 
                  ? `<img src="${escHtml(pub.image_url)}" alt="${escHtml(pub.title)}" loading="lazy" decoding="async">`
                  : `<div class="publication-placeholder"><i class="fas fa-file-alt"></i></div>`
                }
                <span class="publication-badge">${pub.category?.letter || '📄'} ${escHtml(pub.category?.name || 'Artigo')}</span>
              </div>
              <div class="publication-content">
                <h3>${escHtml(pub.title)}</h3>
                <p class="publication-excerpt">${escHtml(pub.excerpt)}</p>
                <div class="publication-meta">
                  <span class="publication-date"><i class="far fa-calendar"></i> ${formatDate(pub.published_at)}</span>
                  <span class="read-more">Ler artigo <i class="fas fa-arrow-right"></i></span>
                </div>
              </div>
            </article>
          </a>
        `).join('')}
      </div>
    </div>
    
    <script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':articleSchemas})}</script>
  </section>
  
  <style>
    .latest-publications-section { padding: 60px 0; background: #ffffff; }
    .latest-publications-section h2 { text-align: center; font-size: 2rem; margin-bottom: 0.5rem; color: var(--primary-color, #3E4B5E); }
    .latest-publications-section h2 i { color: #e74c3c; margin-right: 10px; }
    .latest-publications-section .section-subtitle { text-align: center; color: #6c757d; margin-bottom: 2rem; font-size: 1.1rem; }
    .publications-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    .publication-card-link { text-decoration: none; color: inherit; display: block; }
    .publication-card-link:hover .publication-card { transform: translateY(-8px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
    .publication-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: transform 0.3s ease, box-shadow 0.3s ease; border: 1px solid #f0f0f0; }
    .publication-image { position: relative; height: 180px; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .publication-image img { width: 100%; height: 100%; object-fit: cover; }
    .publication-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem; opacity: 0.6; }
    .publication-badge { position: absolute; top: 12px; right: 12px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: rgba(255,255,255,0.95); color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .publication-content { padding: 1.25rem; }
    .publication-card h3 { font-size: 1.1rem; margin: 0 0 0.75rem 0; line-height: 1.4; color: #2d3436; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .publication-excerpt { color: #636e72; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .publication-meta { display: flex; justify-content: space-between; align-items: center; }
    .publication-date { font-size: 0.8rem; color: #adb5bd; display: flex; align-items: center; gap: 5px; }
    .read-more { color: var(--primary-color, #3E4B5E); font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 5px; }
    .publication-card-link:hover .read-more { color: #e74c3c; }
    .publication-card-link:hover .read-more i { transform: translateX(3px); }
    .read-more i { transition: transform 0.2s ease; }
    @media (max-width: 768px) { .latest-publications-section { padding: 40px 0; } .latest-publications-section h2 { font-size: 1.5rem; } .publications-grid { grid-template-columns: 1fr; } }
  </style>
    `;
  })()}

  ${successCases.length > 0 ? `
  <!-- Seção de Depoimentos com Carrossel -->
  <section class="testimonials-section">
    <div class="container">
      <h2>O que nossos clientes dizem sobre a Solução</h2>
      <div class="testimonials-carousel">
        <div class="testimonials-track">
          ${(() => {
            const testimonials = aiContent?.testimonials || successCases;
            // ✅ Limitar a máximo 6 depoimentos para evitar carrossel infinito
            const limitedTestimonials = testimonials.slice(0, 6);
            // ✅ DUPLICAR ARRAY para efeito seamless (igual InfinitePartnersCarousel)
            const duplicatedTestimonials = [...limitedTestimonials, ...limitedTestimonials];
            
            return duplicatedTestimonials.map((testimonial, idx) => {
              const originalIndex = idx % limitedTestimonials.length;
              const originalCase = successCases[originalIndex] || {};
              
              // ✅ Truncar texto em 300 caracteres para evitar cards gigantes
              const rawQuote = testimonial.quote || originalCase.result_achieved || 'Resultado não especificado';
              const quote = rawQuote.length > 300 
                ? rawQuote.substring(0, 300) + '...' 
                : rawQuote;
              
              const clientName = testimonial.clientName || originalCase.client_name;
              const clientPhoto = originalCase.client_photo;
              
              return `
                <div class="testimonial-card">
                  <div class="rating">
                    <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                  </div>
                  <p>"${escapeHtml(quote)}"</p>
                  <div class="profile-info">
                    ${clientPhoto?.src 
                      ? `<img src="${escapeHtml(clientPhoto.src)}" alt="${escapeHtml(clientName)}" width="60" height="60" loading="lazy" decoding="async">` 
                      : `<img src="https://via.placeholder.com/80/${escapeHtml(company?.primary_color?.replace('#', '') || '3E4B5E')}/FFFFFF?text=${escapeHtml(clientName?.charAt(0) || '?')}" alt="${escapeHtml(clientName)}" width="60" height="60" loading="lazy" decoding="async">`
                    }
                    <div class="details">
                      <strong>${escapeHtml(clientName)}</strong>
                      <small>${escapeHtml(originalCase.specialty || 'Cliente')}${originalCase.city ? ' | ' + escapeHtml(originalCase.city) + '/' + escapeHtml(originalCase.state) : ''}</small>
                    </div>
                    ${originalCase.instagram 
                      ? `<a href="https://instagram.com/${escapeHtml(originalCase.instagram.replace('@', ''))}" target="_blank" class="instagram-link">
                           <i class="fab fa-instagram"></i>
                         </a>` 
                      : ''
                    }
                  </div>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  <!-- Sticky CTA Mobile -->
  <div class="sticky-cta">
    <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
      <i class="fas fa-bolt"></i> FALE CONOSCO E ACELERE SUA CLÍNICA
    </button>
  </div>

  <!-- Call to Action -->
  <div class="container" id="cta">
    <section class="cta">
      <p data-editable="true" data-field="cta_text">${escapeHtml(finalCtaText)}</p>
      <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
        <i class="fas fa-comment-alt"></i> ${escapeHtml(finalCtaButtonText)}
      </button>
    </section>
  </div>

  <!-- Footer -->
  <footer>
    <div class="footer-top-bar"></div>
    <div class="container footer-content">
      ${(() => {
        // ✅ NOVO: Usar navigation_footer_config se disponível
        const navConfig = company?.navigation_footer_config;
        const footerConfig = navConfig?.footer;
        const hasCustomFooter = footerConfig && (footerConfig.locations?.length > 0 || footerConfig.links?.length > 0 || footerConfig.social_links?.length > 0);
        
        // Deduplicate social links by platform, limit to 6
        const seenPlatforms = new Set<string>();
        const uniqueSocials = (footerConfig?.social_links || [])
          .filter((s: any) => {
            if (!s.platform || seenPlatforms.has(s.platform)) return false;
            seenPlatforms.add(s.platform);
            return true;
          })
          .slice(0, 6);
        
        if (hasCustomFooter) {
          // Footer dinâmico baseado em navigation_footer_config
          return `
            <div class="footer-columns">
              <!-- ÁREA 1: Locations em Grid 2x2 -->
              <div class="footer-locations-grid">
                ${footerConfig.locations && footerConfig.locations.length > 0 ? footerConfig.locations.map((loc: any) => `
                  <article class="footer-location-card" style="display: block !important;">
                    <strong style="display: block !important; font-weight: 700 !important; font-size: 16px !important; color: #EE7A3E !important; margin-bottom: 8px !important;">${escapeHtml(loc.title || loc.label || sanitizeCompanyName(company?.company_name))}</strong>
                    ${loc.address ? `<p style="display: block !important; font-size: 14px !important; color: #ccc !important; margin: 0 !important; line-height: 1.6 !important;"><i class="fas fa-map-marker-alt" style="color: #EE7A3E !important; margin-right: 6px !important;"></i> ${escapeHtml(loc.address)}</p>` : ''}
                  </article>
                `).join('') : ''}
              </div>
              
              <!-- ÁREA 2: Links + Sociais -->
              <div class="footer-links-column">
                ${footerConfig.links && footerConfig.links.length > 0 ? `
                  <strong>Links Úteis</strong>
                  ${footerConfig.links.slice(0, 6).map((link: any) => `
                    <a href="${escapeHtml(link.href)}" target="${link.openInNewTab ? '_blank' : '_self'}" rel="noopener">${escapeHtml(link.label)}</a>
                  `).join('')}
                ` : institutionalLinks.length > 0 ? `
                  <strong>Links Úteis</strong>
                  ${institutionalLinks.slice(0, 6).map((link: any) => `
                    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
                  `).join('')}
                ` : ''}
                
                ${uniqueSocials.length > 0 ? `
                  <div class="footer-social-inline">
                    <strong>Redes Sociais</strong>
                    <div class="footer-social-links" style="display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 10px !important;">
                      ${uniqueSocials.map((social: any) => `
                        <a href="${escapeHtml(social.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(social.icon_alt || social.platform || '')}" style="display: inline-flex !important; width: 36px !important; height: 36px !important; align-items: center !important; justify-content: center !important; background: rgba(255,255,255,0.15) !important; border-radius: 50% !important; margin: 0 !important;">
                          <i class="fab fa-${escapeHtml(social.platform || 'link')}" style="font-size: 16px !important; color: #fff !important;"></i>
                        </a>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div class="footer-copyright">
              © ${new Date().getFullYear()} ${escapeHtml(sanitizeCompanyName(company?.company_name))} - Todos os direitos reservados
            </div>
          `;
        } else {
          // Footer padrão (fallback)
          return `
            <div class="footer-columns">
              <div class="footer-locations-grid">
                <article class="footer-location-card">
                  <strong>${escapeHtml(sanitizeCompanyName(company?.company_name))} - Brasil</strong>
                  <p><i class="fas fa-phone"></i> ${escapeHtml(company?.contact_phone || '')}</p>
                  <p><i class="fas fa-envelope"></i> ${escapeHtml(company?.contact_email || '')}</p>
                  <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(company?.street_address || '')}${company?.address_number ? `, ${escapeHtml(company.address_number)}` : ''}</p>
                </article>
                ${company?.usa_address ? `
                <article class="footer-location-card">
                  <strong>${escapeHtml(sanitizeCompanyName(company?.company_name))} - USA</strong>
                  <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(company.usa_address)}</p>
                </article>
                ` : ''}
              </div>
              <div class="footer-links-column">
                ${institutionalLinks.length > 0 ? `
                  <strong>Links Úteis</strong>
                  ${institutionalLinks.slice(0, 6).map((link: any) => `
                    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
                  `).join('')}
                ` : ''}
              </div>
            </div>
            
            <div class="footer-copyright">
              © ${new Date().getFullYear()} ${escapeHtml(sanitizeCompanyName(company?.company_name))} - Todos os direitos reservados
            </div>
          `;
        }
      })()}
    </div>
  </footer>

  <!-- ✅ FASE 4.2: Metadados Ocultos para Analytics -->
  <script type="application/json" class="content-metadata" data-hidden="true">
  {
    "solution_id": "${solution.id}",
    "generated_at": "${solution.metadata?.artifact_chain?.timestamp || new Date().toISOString()}",
    "pitch_version": "${solution.metadata?.artifact_chain?.pitch_version || 'unknown'}",
    "data_quality_score": ${solution.metadata?.quality_metrics?.data_quality_score || 0},
    "confidence_score": ${solution.metadata?.quality_metrics?.confidence_score || 0},
    "model_used": "${solution.metadata?.artifact_chain?.model_used || 'unknown'}",
    "products_used": ${JSON.stringify(products.map(p => p.id))},
    "pain_type": "${solution.pain_type}",
    "success_cases_count": ${successCases.length},
    "faqs_count": ${faqs.length}
  }
  </script>

  <!-- Script para Contador Animado de Métricas -->
  <script>
    const counters = document.querySelectorAll('.count');
    const metricsSection = document.getElementById('metrics-counter');
    let hasCounted = false;

    function startCounter(counter) {
      const target = +counter.getAttribute('data-target');
      const numberEl = counter.querySelector('.number');
      const duration = 2000;
      let startTimestamp = null;

      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = timestamp - startTimestamp;
        const currentCount = Math.min(Math.floor(progress / duration * target), target);
        
        if (numberEl) numberEl.textContent = String(currentCount);

        if (progress < duration) {
          window.requestAnimationFrame(step);
        } else {
          if (numberEl) numberEl.textContent = String(target);
        }
      };

      window.requestAnimationFrame(step);
    }
    
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasCounted) {
          counters.forEach(startCounter);
          hasCounted = true;
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    if (metricsSection) {
      observer.observe(metricsSection);
    }
  </script>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🤖 GEO CONTEXT (Contexto para LLMs e Crawlers de IA) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="geo-context" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">
    <p>
      ${escapeHtml(sanitizeCompanyName(company?.company_name))} é especialista em
      ${escapeHtml(painTypeLabels[solution.pain_type] || 'soluções odontológicas')}.
      ${products.length > 0 ? `Principais produtos: ${products.map((p: any) => p.name).filter(Boolean).join(', ')}.` : ''}
      ${products[0]?.brand ? `Marca: ${escapeHtml(products[0].brand)}.` : ''}
      Localização: ${escapeHtml(company?.city || 'Brasil')}, ${escapeHtml(company?.state || 'BR')}.
    </p>
    <!-- ✅ NOVO: SEO Fields enriquecidos para GEO/SGE -->
    ${company?.seo_service_areas ? `<p>Áreas de atendimento: ${escapeHtml(company.seo_service_areas)}.</p>` : ''}
    ${company?.seo_market_positioning ? `<p>Posicionamento de mercado: ${escapeHtml(company.seo_market_positioning)}.</p>` : ''}
    ${company?.seo_competitive_advantages ? `<p>Diferenciais competitivos: ${escapeHtml(company.seo_competitive_advantages)}.</p>` : ''}
    ${company?.seo_technical_expertise ? `<p>Expertise técnica: ${escapeHtml(company.seo_technical_expertise)}.</p>` : ''}
    ${company?.differentiators ? `<p>Diferenciais: ${escapeHtml(company.differentiators)}.</p>` : ''}
  </div>
  
  <!-- ✅ FASE 10: Authority Context Completo (Parcerias, NPS, Videos, Testimonials) -->
  ${authorityData ? generateAuthorityContextHTML(authorityData, videoTestimonials || []) : ''}
</body>
</html>`;
}

