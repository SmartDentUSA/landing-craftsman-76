/**
 * Serviço responsável pela geração de HTML de blogs
 * ✅ COMPLETO: Markdown, Schemas, Intelligent Links, KOL Author
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
import { marked } from 'marked';
import { sanitizeBlogContent } from '@/utils/sanitize-html';
import { supabase } from '@/integrations/supabase/client';

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
  preview?: boolean;
  ogImage?: string;
  keywords?: string[];
  cssUrl?: string;
  validateSchema?: boolean;
  authorKolId?: string; // ✅ FASE 3: ID do autor KOL
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

  // ✅ 5. PROCESSAR CONTEÚDO DOS BLOGS COM MARKDOWN → HTML + INTELLIGENT LINKS
  const blogContents = blogs.map((blog, index) => {
    let content = blog.content;
    
    // ✅ FASE 1: Converter Markdown → HTML
    const htmlContent = marked.parse(content) as string;
    
    // ✅ FASE 4: Aplicar intelligent links (após conversão markdown)
    const contentWithLinks = Object.keys(intelligentLinks).length > 0
      ? processContentWithAdvancedIntelligentLinks(htmlContent, intelligentLinks)
      : htmlContent;
    
    // ✅ Sanitizar HTML final
    const sanitizedContent = sanitizeBlogContent(contentWithLinks);
    
    return `
      <article class="blog-post" data-index="${index}" itemscope itemtype="https://schema.org/Article">
        <h2 itemprop="headline">${blog.title}</h2>
        <div class="blog-content" itemprop="articleBody">
          ${sanitizedContent}
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
      // ✅ FASE 2: Adicionar campos obrigatórios
      "image": product.image_url || "https://via.placeholder.com/800x600?text=Produto",
      "brand": {
        "@type": "Brand",
        "name": product.brand || "Smart Dent"
      },
      "offers": {
        "@type": "Offer",
        "price": product.price || 0,
        "priceCurrency": product.currency || "BRL",
        "availability": `https://schema.org/${product.availability === 'in stock' ? 'InStock' : 'OutOfStock'}`,
        "url": product.product_url || product.canonical_url
      },
      ...(product.gtin && { "gtin": product.gtin }),
      ...(product.mpn && { "mpn": product.mpn })
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

  // ✅ 13. GERAR ASSINATURA DO AUTOR KOL (FASE 3)
  let authorSignatureHTML = '';
  if (options.authorKolId) {
    authorSignatureHTML = await generateAuthorSignatureHTML(options.authorKolId);
  }

  // ✅ 14. GERAR FOOTER MULTI-DOMAIN
  const multiDomainFooter = excludeFooter ? '' : generateFooterLinks(trackingConfig);

  // ✅ 15. PREPARAR CSS (Critical Inline + External)
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
    
    ${authorSignatureHTML}
    
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
    hasIntelligentLinks: Object.keys(intelligentLinks).length > 0,
    hasAuthorSignature: authorSignatureHTML.length > 0
  });

  return htmlOutput;
}

/**
 * ✅ FASE 3: Gera HTML da assinatura do autor KOL
 */
async function generateAuthorSignatureHTML(authorKolId: string): Promise<string> {
  try {
    const { data: kol, error } = await supabase
      .from('key_opinion_leaders')
      .select('*')
      .eq('id', authorKolId)
      .eq('approved', true)
      .single();
    
    if (error || !kol) {
      console.warn('⚠️ KOL não encontrado:', authorKolId);
      return '';
    }
    
    console.log('✅ Gerando assinatura do autor:', kol.full_name);
    
    return `
    <section class="author-signature" aria-label="Sobre o autor" style="margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; border-left: 4px solid #007bff;">
      <div style="display: flex; gap: 20px; align-items: start; flex-wrap: wrap;">
        ${kol.photo_url ? `
          <img 
            src="${kol.photo_url}" 
            alt="Foto de ${kol.full_name}" 
            style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
            loading="lazy"
          />
        ` : ''}
        <div style="flex: 1; min-width: 280px;">
          <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1.5rem;">
            Sobre o Autor
          </h3>
          <p style="margin: 0 0 12px 0; font-size: 1.1rem; font-weight: 600; color: #007bff;">
            ${kol.full_name}${kol.specialty ? ` - ${kol.specialty}` : ''}
          </p>
          ${kol.mini_cv ? `
            <p style="margin: 0 0 15px 0; line-height: 1.6; color: #555;">
              ${kol.mini_cv}
            </p>
          ` : ''}
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            ${kol.lattes_url ? `
              <a href="${kol.lattes_url}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9rem; transition: background 0.3s;">
                📄 Currículo Lattes
              </a>
            ` : ''}
            ${kol.website_url ? `
              <a href="${kol.website_url}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9rem; transition: background 0.3s;">
                🌐 Website
              </a>
            ` : ''}
            ${kol.instagram_url ? `
              <a href="${kol.instagram_url}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #E1306C; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9rem; transition: background 0.3s;">
                📸 Instagram
              </a>
            ` : ''}
            ${kol.youtube_url ? `
              <a href="${kol.youtube_url}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #FF0000; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9rem; transition: background 0.3s;">
                ▶️ YouTube
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    </section>
    `;
  } catch (error) {
    console.error('❌ Erro ao gerar assinatura do autor:', error);
    return '';
  }
}
