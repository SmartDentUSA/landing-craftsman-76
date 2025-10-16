/**
 * Serviço responsável pela geração de HTML de blogs
 * ✅ FASE 1 + FASE 2: Implementação COMPLETA com todos os módulos SEO
 */

import { buildMetaTags } from './metaTagsBuilder';
import { consolidateSchemas } from '@/lib/schema-consolidator';
import { processContentWithAdvancedIntelligentLinks } from '@/lib/intelligent-links-advanced';
import { 
  injectTrackingPixels, 
  injectGTMNoScript, 
  generateSEODomainTags,
  generateFooterLinks,
  type TrackingConfig 
} from '@/lib/tracking-injector';
import { 
  getCompanyProfileForSEO, 
  buildSEOMetaFromCompany 
} from '@/lib/company-profile-helper';
import { 
  validateMetaDescription, 
  validateCanonicalURL 
} from '@/lib/seo-validators';
import { 
  validateJsonLdSize, 
  truncateReviewsForSize, 
  estimateJsonSizeKB 
} from '@/lib/validate-jsonld';
import { 
  inlineCriticalCSS, 
  generateCSSLinks, 
  FULL_CSS 
} from './criticalCSS';
import { 
  optimizeContentImages, 
  generateImagePreloadHints,
  markLCPImage 
} from './imageOptimizer';
import { 
  validateConsolidatedSchemas, 
  generateSchemaErrorAlert 
} from './schemaValidator';

export interface BlogHTMLOptions {
  // Dados dos blogs
  blogs: Array<{
    title: string;
    content: string;
    meta_description?: string;
    keywords?: string[];
  }>;
  
  // SEO básico
  domain: string;
  canonicalUrl: string;
  finalTitle: string;
  finalDescription: string;
  
  // Dados adicionais
  selectedProducts?: any[];
  intelligentLinks?: Record<string, string>;
  schemas?: any[]; // Schemas já gerados (Product, FAQ, Review, etc.)
  
  // Configurações
  excludeFooter?: boolean;
  companySEO?: any;
  trackingConfig?: TrackingConfig | null;
  preview?: boolean; // FASE 1: Flag de preview (noindex, sem tracking)
  ogImage?: string;
  keywords?: string[];
  cssUrl?: string; // URL do CSS externo (opcional, se não fornecido usa inline)
  validateSchema?: boolean; // Validar schemas antes de gerar HTML (default: true)
}

export async function generateBlogHTML(options: BlogHTMLOptions): Promise<string> {
  const {
    blogs,
    domain,
    canonicalUrl,
    finalTitle,
    finalDescription,
    selectedProducts = [],
    intelligentLinks = {},
    schemas = [],
    excludeFooter = false,
    companySEO,
    trackingConfig = null,
    preview = false,
    ogImage,
    keywords = []
  } = options;

  console.log('🚀 Gerando HTML completo com:', {
    blogsCount: blogs.length,
    productsCount: selectedProducts.length,
    schemasCount: schemas.length,
    hasTracking: !!trackingConfig,
    previewMode: preview
  });

  // ✅ 1. VALIDAR E NORMALIZAR META DESCRIPTION
  let validatedDescription = finalDescription;
  const descValidation = validateMetaDescription(finalDescription);
  
  if (!descValidation.valid) {
    console.warn('⚠️ Meta description inválida, gerando fallback:', descValidation.warnings);
    validatedDescription = `${finalTitle.substring(0, 100)}. Saiba mais sobre ${keywords[0] || 'nossos produtos'} e descubra as melhores soluções.`;
  }

  // ✅ 2. VALIDAR E NORMALIZAR CANONICAL URL
  let validatedCanonical = canonicalUrl;
  if (!preview) {
    const canonicalValidation = await validateCanonicalURL(canonicalUrl, domain);
    if (!canonicalValidation.valid) {
      console.error('❌ Canonical URL inválida:', canonicalValidation.errors);
      validatedCanonical = `https://${domain}`;
    } else {
      validatedCanonical = canonicalValidation.normalized;
    }
  }

  // ✅ 3. BUSCAR COMPANY SEO CONTEXT
  const companyProfile = await getCompanyProfileForSEO();
  let companySEOData: any = {};
  let companyFooterHTML = '';
  let institutionalLinksHTML = '';
  
  if (companyProfile) {
    companySEOData = buildSEOMetaFromCompany(companyProfile, keywords);
    companyFooterHTML = companySEOData.companyFooter;
    institutionalLinksHTML = companySEOData.institutionalLinksHtml;
    
    // Adicionar keywords do perfil da empresa
    if (companySEOData.additionalKeywords?.length > 0) {
      keywords.push(...companySEOData.additionalKeywords);
    }
    
    console.log('✅ Company SEO Context carregado:', {
      additionalKeywords: companySEOData.additionalKeywords?.length || 0,
      hasFooter: !!companyFooterHTML
    });
  }

  // ✅ 4. CONSOLIDAR KEYWORDS (remover duplicatas)
  const uniqueKeywords = [...new Set(keywords)].slice(0, 50);

  // ✅ 5. PROCESSAR CONTEÚDO DOS BLOGS COM INTELLIGENT LINKS
  const blogContents = blogs.map((blog, index) => {
    let content = blog.content;
    
    // Aplicar intelligent links
    if (Object.keys(intelligentLinks).length > 0) {
      content = processContentWithAdvancedIntelligentLinks(content, intelligentLinks);
    }
    
    return `
      <article class="blog-post" data-index="${index}" itemscope itemtype="https://schema.org/Article">
        <h2 itemprop="headline">${blog.title}</h2>
        <div class="blog-content" itemprop="articleBody">
          ${content}
        </div>
      </article>
    `;
  }).join('\n');

  // ✅ 6. OTIMIZAR IMAGENS NO CONTEÚDO
  const blogContentsOptimized = optimizeContentImages(blogContents);
  const blogContentsWithLCP = markLCPImage(blogContentsOptimized);
  
  // ✅ 7. GERAR SCHEMAS DE PRODUTOS SELECIONADOS
  const allSchemas = [...schemas];
  
  if (selectedProducts && selectedProducts.length > 0) {
    const productSchemas = selectedProducts.map(product => ({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.seo_description_override || product.description,
      "image": product.image_url,
      "offers": {
        "@type": "Offer",
        "price": product.price || 0,
        "priceCurrency": product.currency || "BRL",
        "availability": `https://schema.org/${product.availability === 'in stock' ? 'InStock' : 'OutOfStock'}`,
        "url": product.product_url || product.canonical_url
      },
      ...(product.gtin && { "gtin": product.gtin }),
      ...(product.mpn && { "mpn": product.mpn }),
      ...(product.brand && { "brand": { "@type": "Brand", "name": product.brand } })
    }));
    
    allSchemas.push(...productSchemas);
    console.log(`✅ ${productSchemas.length} product schemas adicionados`);
  }

  // ✅ 8. CONSOLIDAR E VALIDAR SCHEMAS
  let consolidatedSchemaJson = '';
  let schemaValidationAlert = '';
  
  if (allSchemas.length > 0) {
    let schemaJson = consolidateSchemas(allSchemas);
    
    // VALIDAÇÃO DE SCHEMA (apenas se não for preview)
    if (options.validateSchema !== false && !preview) {
      const validation = await validateConsolidatedSchemas(
        allSchemas, 
        validatedCanonical
      );
      
      if (!validation.isValid) {
        console.error('❌ Schema inválido:', validation.errors);
        schemaValidationAlert = generateSchemaErrorAlert(validation);
      } else {
        console.log('✅ Schema validado com sucesso');
      }
    }
    
    // Validar tamanho do schema (100KB limit)
    if (!validateJsonLdSize(schemaJson)) {
      console.warn('⚠️ Schema muito grande, truncando reviews...');
      
      // Encontrar schema de reviews e truncar
      const reviewSchemaIndex = allSchemas.findIndex(s => 
        s['@type'] === 'Product' && s.review && Array.isArray(s.review)
      );
      
      if (reviewSchemaIndex >= 0 && allSchemas[reviewSchemaIndex].review) {
        const reviews = allSchemas[reviewSchemaIndex].review;
        const truncatedReviews = truncateReviewsForSize(reviews, 10);
        allSchemas[reviewSchemaIndex].review = truncatedReviews;
        
        // Reconsolidar
        schemaJson = consolidateSchemas(allSchemas);
        
        console.log(`✅ Reviews truncadas: ${reviews.length} → ${truncatedReviews.length}`);
        
        if (!validateJsonLdSize(schemaJson)) {
          console.error('❌ Schema ainda muito grande após truncamento');
        }
      }
    }
    
    consolidatedSchemaJson = `
    <script type="application/ld+json">
    ${schemaJson}
    </script>`;
    
    console.log('✅ Schemas consolidados:', {
      count: allSchemas.length,
      sizeKB: estimateJsonSizeKB(JSON.parse(schemaJson))
    });
  }

  // ✅ 9. GERAR META TAGS COMPLETAS
  const metaTags = buildMetaTags({
    title: finalTitle,
    description: validatedDescription,
    canonicalUrl: preview ? '' : validatedCanonical, // Sem canonical em preview
    domain: domain,
    ogImage: ogImage,
    ogType: 'article',
    twitterCard: 'summary_large_image',
    keywords: uniqueKeywords,
    robots: preview ? 'noindex, nofollow' : 'index, follow' // PREVIEW MODE
  });

  // ✅ 10. GERAR RESOURCE HINTS PARA IMAGENS
  const heroImages = selectedProducts
    .filter(p => p.image_url)
    .map(p => p.image_url)
    .slice(0, 2);
  const imagePreloadHints = generateImagePreloadHints(heroImages);

  // ✅ 11. GERAR SEO DOMAIN TAGS (hreflang)
  const seoDomainTags = generateSEODomainTags(trackingConfig);

  // ✅ 12. INJETAR TRACKING PIXELS (apenas se NÃO for preview)
  const trackingPixelsHTML = preview ? '' : injectTrackingPixels(trackingConfig);
  const gtmNoScriptHTML = preview ? '' : injectGTMNoScript(trackingConfig);

  // ✅ 13. GERAR FOOTER MULTI-DOMAIN
  const multiDomainFooter = excludeFooter ? '' : generateFooterLinks(trackingConfig);

  // ✅ 14. PREPARAR CSS (Critical Inline + External)
  const cssUrl = options.cssUrl || '';
  const criticalCSS = inlineCriticalCSS();
  const externalCSSLinks = cssUrl ? generateCSSLinks(cssUrl) : '';

  // ✅ 15. GERAR HTML FINAL COMPLETO COM OTIMIZAÇÕES SEO
  const htmlOutput = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  
  <!-- Preconnect para recursos externos -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://www.google-analytics.com">
  
  ${imagePreloadHints}
  
  <title>${finalTitle}</title>
  ${metaTags}
  ${seoDomainTags}
  ${trackingPixelsHTML}
  ${consolidatedSchemaJson}
  
  <!-- Critical CSS Inline (First Paint) -->
  ${criticalCSS}
  
  <!-- External CSS com Preload (Non-blocking) -->
  ${externalCSSLinks || `<style>${FULL_CSS}</style>`}
</head>
<body>
  ${gtmNoScriptHTML}
  
  <!-- Skip Link para Acessibilidade -->
  <a href="#main-content" class="skip-link">Pular para conteúdo principal</a>
  
  <main role="main" id="main-content" class="container">
    <header>
      <h1>${finalTitle}</h1>
      ${institutionalLinksHTML ? `<nav aria-label="Links institucionais" class="institutional-links">${institutionalLinksHTML}</nav>` : ''}
    </header>
    
    ${schemaValidationAlert}
    
    ${blogContentsWithLCP}
    
    ${!excludeFooter && companyFooterHTML ? `<section aria-label="Informações da empresa" class="company-info">${companyFooterHTML}</section>` : ''}
  </main>
  
  ${multiDomainFooter}
  
  ${preview ? '<!-- PREVIEW MODE: noindex, sem tracking, sem validação de schema -->' : ''}
</body>
</html>`;

  console.log('✅ HTML gerado com sucesso:', {
    htmlSize: htmlOutput.length,
    hasTracking: !preview && trackingPixelsHTML.length > 0,
    hasSchemas: consolidatedSchemaJson.length > 0,
    hasIntelligentLinks: Object.keys(intelligentLinks).length > 0
  });

  return htmlOutput;
}
