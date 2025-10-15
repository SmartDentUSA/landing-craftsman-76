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

  // ✅ 6. FASE 2: GERAR SCHEMAS DE PRODUTOS SELECIONADOS
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

  // ✅ 7. CONSOLIDAR SCHEMAS COM @graph PATTERN + VALIDAÇÃO DE TAMANHO
  let consolidatedSchemaJson = '';
  if (allSchemas.length > 0) {
    let schemaJson = consolidateSchemas(allSchemas);
    
    // FASE 2: Validar tamanho do schema (100KB limit)
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

  // ✅ 8. GERAR META TAGS COMPLETAS
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

  // ✅ 9. GERAR SEO DOMAIN TAGS (hreflang)
  const seoDomainTags = generateSEODomainTags(trackingConfig);

  // ✅ 10. INJETAR TRACKING PIXELS (apenas se NÃO for preview)
  const trackingPixelsHTML = preview ? '' : injectTrackingPixels(trackingConfig);
  const gtmNoScriptHTML = preview ? '' : injectGTMNoScript(trackingConfig);

  // ✅ 11. GERAR FOOTER MULTI-DOMAIN
  const multiDomainFooter = excludeFooter ? '' : generateFooterLinks(trackingConfig);

  // ✅ 12. GERAR HTML FINAL COMPLETO
  const htmlOutput = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalTitle}</title>
  ${metaTags}
  ${seoDomainTags}
  ${trackingPixelsHTML}
  ${consolidatedSchemaJson}
  
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.7;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    
    h1 {
      color: #1a1a1a;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    h2 {
      color: #2c3e50;
      font-size: 1.8rem;
      margin: 30px 0 15px 0;
      border-left: 4px solid #007bff;
      padding-left: 15px;
    }
    
    .blog-content p {
      margin-bottom: 18px;
      text-align: justify;
    }
    
    .blog-content a {
      color: #007bff;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.3s ease;
    }
    
    .blog-content a:hover {
      border-bottom-color: #007bff;
    }
    
    .institutional-links {
      margin: 20px 0;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    
    .institutional-links a {
      margin: 0 10px;
      color: #007bff;
      text-decoration: none;
    }
    
    .company-footer-info {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      h2 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  ${gtmNoScriptHTML}
  
  <main role="main" class="container">
    <header>
      <h1>${finalTitle}</h1>
      ${institutionalLinksHTML ? `<nav class="institutional-links">${institutionalLinksHTML}</nav>` : ''}
    </header>
    
    ${blogContents}
    
    ${!excludeFooter && companyFooterHTML ? `<section class="company-info">${companyFooterHTML}</section>` : ''}
  </main>
  
  ${multiDomainFooter}
  
  ${preview ? '<!-- PREVIEW MODE: noindex, sem tracking -->' : ''}
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
