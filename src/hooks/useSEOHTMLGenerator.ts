import { useCallback } from 'react';
import { useAdvancedSchemaGenerator } from './useAdvancedSchemaGenerator';
import { processContentWithAdvancedIntelligentLinks } from '@/lib/intelligent-links-advanced';
import { useLinksRepository } from './useLinksRepository';
import { isSEOContextEnabled, logSEODebug } from '@/config/feature-flags';
import { buildStrategicBlogInput } from '@/services/strategicBlogInput';
import { stripInternalLabels } from '@/lib/sanitize-internal-labels';
import { getDomainConfig } from '@/config/domain-config';

// Helper para truncar títulos SEO (≤60 caracteres)
const truncateSEOTitle = (title: string, maxLength = 60): string => {
  if (title.length <= maxLength) return title;
  
  // Truncar no último espaço antes do limite
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
};

// Função para converter markdown inline para HTML (para títulos e textos inline)
const convertInlineMarkdownToHTML = (content: string): string => {
  if (!content) return '';
  
  let processedContent = content;
  
  // Links markdown [texto](url "título") - com melhor handling
  processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+?)\s+"([^"]*)"\)/g, '<a href="$2" title="$3">$1</a>');
  processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Bold **texto**
  processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic *texto*
  processedContent = processedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return processedContent.trim();
};

// Função para sanitizar conteúdo do blog antes da conversão HTML
const sanitizeBlogContent = (content: string): string => {
  if (!content) return '';
  
  let sanitized = content;
  
  // Remove primeiro H1 (título principal que gera duplicação)
  sanitized = sanitized.replace(/^# .+\n+/m, '');
  
  // Remove seções com "Análise Técnica"
  sanitized = sanitized.replace(/^#+\s*.*Análise Técnica( Completa)?[^\n]*$/gmi, '');
  
  // Substitui "Introdução Técnica" por apenas "Introdução"
  sanitized = sanitized.replace(/^##\s*Introdução Técnica(?::)?/gmi, '## Introdução');
  
  // Remove linhas vazias excessivas
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  return sanitized.trim();
};

// Função para extrair título do markdown (com filtro de termos banidos)
const extractTitleFromMarkdown = (content: string): string => {
  if (!content) return '';
  
  const bannedTerms = ['análise técnica', 'introdução técnica', 'informativo técnico', 'informativo comercial'];
  const lines = content.split('\n');
  
  // Procurar por H1 válido
  for (const line of lines) {
    const h1Match = line.match(/^# (.+)$/);
    if (h1Match) {
      const title = h1Match[1].trim();
      const isBanned = bannedTerms.some(term => 
        title.toLowerCase().includes(term)
      );
      if (!isBanned) {
        return title;
      }
    }
  }
  
  // Procurar por H2 válido se H1 não encontrado ou é banido
  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      const title = h2Match[1].trim();
      const isBanned = bannedTerms.some(term => 
        title.toLowerCase().includes(term)
      );
      if (!isBanned) {
        return title;
      }
    }
  }
  
  return 'Especificações do Produto';
};

// Função para converter markdown para HTML completo
const convertMarkdownToHTML = (content: string): string => {
  if (!content) return '';

  // Sanitizar conteúdo antes da conversão
  const sanitizedContent = sanitizeBlogContent(content);
  
  // Processar conteúdo linha por linha para manter estrutura
  const lines = sanitizedContent.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const processLine = (line: string): string => {
    // Headers (processo com ordem correta para evitar conflitos)
    if (line.match(/^#### /)) {
      return `<h4>${convertInlineMarkdownToHTML(line.replace(/^#### /, '').trim())}</h4>`;
    }
    if (line.match(/^### /)) {
      return `<h3>${convertInlineMarkdownToHTML(line.replace(/^### /, '').trim())}</h3>`;
    }
    if (line.match(/^## /)) {
      return `<h2>${convertInlineMarkdownToHTML(line.replace(/^## /, '').trim())}</h2>`;
    }
    if (line.match(/^# /)) {
      return `<h1>${convertInlineMarkdownToHTML(line.replace(/^# /, '').trim())}</h1>`;
    }

    // Aplicar conversão inline para texto normal
    return convertInlineMarkdownToHTML(line);
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Lista com -
    if (trimmed.match(/^- /)) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(`<li>${convertInlineMarkdownToHTML(trimmed.replace(/^- /, ''))}</li>`);
      return;
    }
    
    // Finalizar lista se necessário
    if (inList && !trimmed.match(/^- /)) {
      processedLines.push(`<ul>${listItems.join('')}</ul>`);
      inList = false;
      listItems = [];
    }

    // Linha vazia
    if (trimmed === '') {
      if (!inList) {
        processedLines.push('');
      }
      return;
    }

    // Linha normal
    if (!trimmed.match(/^#/)) {
      processedLines.push(`<p>${processLine(trimmed)}</p>`);
    } else {
      processedLines.push(processLine(trimmed));
    }
  });

  // Finalizar lista pendente
  if (inList) {
    processedLines.push(`<ul>${listItems.join('')}</ul>`);
  }

  return processedLines.join('\n');
};

interface SEOHTMLOptions {
  title: string;
  description: string;
  keywords?: string[];
  content: string;
  domain?: string;
  canonicalUrl?: string;
  ogImage?: string;
  author?: {
    name: string;
    url?: string;
  };
  type?: 'article' | 'product' | 'landing-page' | 'email';
  products?: any[];
  includeSchema?: boolean;
}

interface ConsolidatedBlogOptions {
  title: string;
  description: string;
  domain: string;
  blogs: Array<{
    title: string;
    content: string;
    productName?: string;
    keywords?: string[];
  }>;
  landingPagesSEO?: Array<{
    id: string;
    name: string;
    seo_title: string;
    seo_description: string;
    ai_keywords: string[];
    selected_product_ids: string[];
    image1_url?: string;
  }>;
  selectedProducts?: Array<{
    id: string;
    name: string;
    description: string;
    price?: string | number;
    productUrl?: string;
    keywords?: string[];
    market_keywords?: string[];
    search_intent_keywords?: string[];
    category?: string;
    target_audience?: string[];
  }>;
  aggregatedKeywords?: string[];
  landingPageData?: any;
  includeOffers?: boolean;
  ogImage?: string;
  seoHiddenData?: {
    contextKeywords: string[];
    marketPositioning: string;
    competitiveAdvantages: string;
    technicalExpertise: string;
    serviceAreas: string;
  };
  landingPageIdForSEOContext?: string; // PATCH 3: ID para carregar SEO Context
  preview?: boolean; // PATCH 5: Flag de preview (noindex, sem canonical)
}

export const useSEOHTMLGenerator = () => {
  // Função helper para limpar tags HTML e markdown do texto (para JSON-LD)
  const stripHtmlTags = (html: string): string => {
    let clean = html;
    // Remover tags HTML
    clean = clean.replace(/<[^>]*>/g, '');
    // Remover markdown links [texto](url)
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remover markdown bold **texto**
    clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
    // Remover markdown italic *texto*
    clean = clean.replace(/\*([^*]+)\*/g, '$1');
    // Remover markdown headers
    clean = clean.replace(/^#+\s*/gm, '');
    return clean.trim();
  };

  const { generateAdvancedProductSchema, generateFAQSchema, generateCompletePageSchema } = useAdvancedSchemaGenerator();
  const { allLinks } = useLinksRepository();

  const generateOptimizedHTML = useCallback((options: SEOHTMLOptions): string => {
    const {
      title,
      description,
      keywords = [],
      content,
      domain = '',
      canonicalUrl,
      ogImage,
      author,
      type = 'article',
      products = [],
      includeSchema = true
    } = options;

    // ✨ APPLY SEO OVERRIDES FROM PRODUCTS
    const seoTitle = products.length > 0 && products[0].seo_title_override 
      ? products[0].seo_title_override 
      : title;
    const seoDescription = products.length > 0 && products[0].seo_description_override 
      ? products[0].seo_description_override 
      : description;
    const seoCanonicalUrl = products.length > 0 && products[0].canonical_url 
      ? products[0].canonical_url 
      : canonicalUrl;

    // Criar mapeamento de links inteligentes
    const intelligentLinks: Record<string, string> = {};
    allLinks.forEach(link => {
      if (link.name) {
        intelligentLinks[link.name.toLowerCase()] = link.url;
      }
    });

    // Converter markdown para HTML e processar com links inteligentes
    const htmlContent = convertMarkdownToHTML(content);
    const processedContent = processContentWithAdvancedIntelligentLinks(htmlContent, intelligentLinks);

    // Gerar Schema.org se solicitado
    let schemaJson = '';
    if (includeSchema) {
      if (type === 'product' && products.length > 0) {
        // ✨ GENERATE SCHEMA FOR MULTIPLE PRODUCTS
        if (products.length === 1) {
          const { schemas } = generateCompletePageSchema(products, undefined, undefined, undefined, seoTitle, seoDescription);
          schemaJson = `
          <script type="application/ld+json">
          ${JSON.stringify(schemas, null, 2)}
          </script>`;
        } else {
          // Generate ItemList schema for multiple products
          const itemListSchema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": seoTitle,
            "description": seoDescription,
            "numberOfItems": products.length,
            "itemListElement": products.map((product, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": product.name,
                "description": product.description,
                "image": product.image_url,
                ...(product.gtin && { "gtin": product.gtin }),
                ...(product.mpn && { "mpn": product.mpn }),
                ...(product.brand && { "brand": { "@type": "Brand", "name": product.brand } }),
                ...(product.technical_specifications && product.technical_specifications.length > 0 && {
                  "additionalProperty": product.technical_specifications.map((spec: any) => ({
                    "@type": "PropertyValue",
                    "name": spec.label || spec.name,
                    "value": spec.value || spec.description
                  }))
                }),
                "offers": {
                  "@type": "Offer",
                  "price": product.price,
                  "priceCurrency": product.currency || "BRL",
                  "availability": `https://schema.org/${product.availability === 'in stock' ? 'InStock' : 'OutOfStock'}`,
                  "itemCondition": `https://schema.org/${product.condition === 'new' ? 'NewCondition' : 'UsedCondition'}`
                }
              }
            }))
          };
          schemaJson = `
          <script type="application/ld+json">
          ${JSON.stringify(itemListSchema, null, 2)}
          </script>`;
        }
      } else if (type === 'article') {
        const articleSchema = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title,
          "description": description,
          "datePublished": new Date().toISOString(),
          "dateModified": new Date().toISOString(),
          "author": author ? {
            "@type": "Person",
            "name": author.name,
            "url": author.url
          } : undefined,
          "publisher": {
            "@type": "Organization",
            "name": domain || "Nossa Empresa"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl || window.location.href
          }
        };
        schemaJson = `
        <script type="application/ld+json">
        ${JSON.stringify(articleSchema, null, 2)}
        </script>`;
      }
    }

    // ✨ AGGREGATE KEYWORDS FROM PRODUCTS 
    const aggregatedKeywords = [...keywords];
    if (products.length > 0) {
      products.forEach(product => {
        if (product.keywords) aggregatedKeywords.push(...product.keywords);
        if (product.market_keywords) aggregatedKeywords.push(...product.market_keywords);
        if (product.search_intent_keywords) aggregatedKeywords.push(...product.search_intent_keywords);
      });
    }
    // Remove duplicates and limit to top 50 keywords
    const uniqueKeywords = [...new Set(aggregatedKeywords)].slice(0, 50);

    // URL canônica com SEO override
    const canonical = seoCanonicalUrl || (domain ? `https://${domain}` : window.location.href);

    // ✨ GENERATE GOOGLE MERCHANT META TAGS FOR ALL PRODUCTS
    const generateGoogleMerchantTags = () => {
      if (products.length === 0) return '';
      
      // For single product, use product:* tags
      if (products.length === 1) {
        const product = products[0];
        return `
  ${product.gtin ? `<meta property="product:retailer_item_id" content="${product.gtin}">` : ''}
  ${product.mpn ? `<meta property="product:sku" content="${product.mpn}">` : ''}
  ${product.brand ? `<meta property="product:brand" content="${product.brand}">` : ''}
  ${product.condition ? `<meta property="product:condition" content="${product.condition}">` : ''}
  ${product.availability ? `<meta property="product:availability" content="${product.availability}">` : ''}
  ${product.color ? `<meta property="product:color" content="${product.color}">` : ''}
  ${product.google_product_category ? `<meta property="product:category" content="${product.google_product_category}">` : ''}
  <meta property="product:price:amount" content="${product.price || 0}">
  <meta property="product:price:currency" content="${product.currency || 'BRL'}">`;
      }
      
      // For multiple products, generate tags for each
      return products.map((product, index) => `
  <!-- Product ${index + 1} -->
  ${product.gtin ? `<meta property="product:retailer_item_id:${index}" content="${product.gtin}">` : ''}
  ${product.mpn ? `<meta property="product:sku:${index}" content="${product.mpn}">` : ''}
  ${product.brand ? `<meta property="product:brand:${index}" content="${product.brand}">` : ''}
  ${product.condition ? `<meta property="product:condition:${index}" content="${product.condition}">` : ''}
  ${product.availability ? `<meta property="product:availability:${index}" content="${product.availability}">` : ''}
  ${product.color ? `<meta property="product:color:${index}" content="${product.color}">` : ''}
  ${product.google_product_category ? `<meta property="product:category:${index}" content="${product.google_product_category}">` : ''}
  <meta property="product:price:amount:${index}" content="${product.price || 0}">
  <meta property="product:price:currency:${index}" content="${product.currency || 'BRL'}">`).join('');
    };

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- SEO Meta Tags -->
  <title>${seoTitle}</title>
  <meta name="description" content="${seoDescription}">
  ${uniqueKeywords.length > 0 ? `<meta name="keywords" content="${uniqueKeywords.join(', ')}">` : ''}
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="robots" href="/robots.txt">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="${type === 'product' ? 'product' : 'article'}">
  <meta property="og:title" content="${seoTitle}">
  <meta property="og:description" content="${seoDescription}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${domain || 'Nossa Empresa'}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta property="og:locale" content="pt_BR">
  
  <!-- ✅ Video Meta Tags for Social Sharing -->
  ${(() => {
    if (!products || products.length === 0) return '';
    
    const allVideos = products.flatMap((product: any) => [
      ...(product.youtube_videos || []),
      ...(product.instagram_videos || []),
      ...(product.technical_videos || []),
      ...(product.testimonial_videos || []),
      ...((product as any).tiktok_videos || [])
    ].filter(Boolean));
    
    return allVideos.map((video: any, idx: number) => {
      const videoDescription = typeof video === 'object' 
        ? (video.description || products[0]?.sales_pitch || products[0]?.description || '')
        : (products[0]?.sales_pitch || products[0]?.description || '');
      
      return `<meta property="og:video:description" content="${videoDescription}">`;
    }).join('\n  ');
  })()}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seoTitle}">
  <meta name="twitter:description" content="${seoDescription}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="${author?.name || domain || 'Nossa Empresa'}">
  <meta name="generator" content="SEO Generator">
  <meta name="theme-color" content="#007bff">
  
  <!-- ✨ GOOGLE MERCHANT META TAGS FOR ALL PRODUCTS -->
  ${generateGoogleMerchantTags()}
  
  ${schemaJson}
  
  <!-- CSS Styling -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.7;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    
    header {
      margin-bottom: 40px;
      border-bottom: 3px solid #007bff;
      padding-bottom: 20px;
    }
    
    h1 {
      color: #1a1a1a;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .meta-info {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
    
    .content {
      font-size: 1.1rem;
      line-height: 1.7;
    }
    
    .content h2 {
      color: #2c3e50;
      font-size: 1.8rem;
      margin: 30px 0 15px 0;
      border-left: 4px solid #007bff;
      padding-left: 15px;
    }
    
    .content h3 {
      color: #34495e;
      font-size: 1.4rem;
      margin: 25px 0 12px 0;
    }
    
    .content p {
      margin-bottom: 18px;
      text-align: justify;
    }
    
    .content ul, .content ol {
      margin: 15px 0 15px 30px;
    }
    
    .content li {
      margin-bottom: 8px;
    }
    
    .content a {
      color: #007bff;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.3s ease;
    }
    
    .content a:hover {
      border-bottom-color: #007bff;
      text-decoration: none;
    }
    
    .content blockquote {
      background: #f8f9fa;
      border-left: 4px solid #007bff;
      margin: 20px 0;
      padding: 15px 20px;
      font-style: italic;
    }
    
    .content strong {
      color: #2c3e50;
    }
    
    footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    
    .keywords {
      margin-top: 30px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #28a745;
    }
    
    .keywords h4 {
      color: #28a745;
      margin-bottom: 10px;
    }
    
    .keywords .tag {
      display: inline-block;
      background: #e9ecef;
      color: #495057;
      padding: 4px 8px;
      margin: 2px;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      .content h2 {
        font-size: 1.5rem;
      }
      
      .content h3 {
        font-size: 1.2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="meta-info">
        ${author ? `Por ${author.name} • ` : ''}Publicado em ${new Date().toLocaleDateString('pt-BR')}
        ${domain ? ` • ${domain}` : ''}
      </div>
    </header>
    
    <main>
      <article class="content">
        ${processedContent}
      </article>
      
      ${keywords.length > 0 ? `
      <section class="keywords">
        <h4>Palavras-chave relacionadas:</h4>
        <div>
          ${keywords.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
        </div>
      </section>
      ` : ''}
    </main>
    
    <footer>
      <p>&copy; ${new Date().getFullYear()} ${domain || 'Nossa Empresa'}. Todos os direitos reservados.</p>
      ${canonical ? `<p><small>URL: ${canonical}</small></p>` : ''}
    </footer>
  </div>
</body>
</html>`;
  }, [generateCompletePageSchema]);

  const generateConsolidatedBlogHTML = useCallback(async (options: ConsolidatedBlogOptions): Promise<string> => {
    const { 
      title, 
      description, 
      domain, 
      blogs, 
      landingPagesSEO, 
      selectedProducts, 
      aggregatedKeywords, 
      landingPageData, 
      includeOffers = false, 
      ogImage, 
      seoHiddenData,
      landingPageIdForSEOContext,
      preview = false
    } = options;

    // Define canonical URL at the beginning
    const canonicalUrl = `https://${domain}.com.br`;

    // Use aggregated keywords from landing pages + products + blogs if provided
    const allKeywords = aggregatedKeywords && aggregatedKeywords.length > 0 
      ? aggregatedKeywords 
      : blogs.reduce((acc: string[], blog) => {
          if (blog.keywords) {
            acc.push(...blog.keywords);
          }
          return acc;
        }, []);

    // Remover duplicatas e limitar para melhor performance SEO
    const uniqueKeywords = [...new Set(allKeywords)].slice(0, 30);

    // Gerar schema para múltiplos artigos com relações para produtos
    const blogSchemas = blogs.map((blog, index) => {
      // Converter markdown para HTML inline e depois limpar para JSON-LD
      const htmlTitle = convertInlineMarkdownToHTML(blog.title);
      const cleanTitle = stripHtmlTags(htmlTitle);
      // Para descrição, primeiro converter markdown e depois limpar tags HTML
      const htmlContent = convertMarkdownToHTML(blog.content);
      const cleanDescription = stripHtmlTags(htmlContent.substring(0, 160));
      
      // Encontrar produto relacionado se existir
      let relatedProduct = null;
      if (selectedProducts && blog.productName) {
        relatedProduct = selectedProducts.find(product => 
          product.name.toLowerCase().includes(blog.productName.toLowerCase()) ||
          blog.productName.toLowerCase().includes(product.name.toLowerCase())
        );
      }
      
      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": cleanTitle,
        "description": cleanDescription,
        "datePublished": new Date().toISOString(),
        "position": index + 1,
        "author": {
          "@type": "Organization",
          "name": domain
        }
      };

      // Adicionar relação com produto se encontrado
      if (relatedProduct) {
        articleSchema["about"] = { "@id": `#product-${relatedProduct.id}` };
        articleSchema["mainEntity"] = { "@id": `#product-${relatedProduct.id}` };
      }
      
      return articleSchema;
    });

    // Generate complete schema including products for SEO
    let completeSchema;
    
    if (selectedProducts && selectedProducts.length > 0) {
      // Convert selectedProducts to ProductData format for advanced schema with @id
      const productDataArray = selectedProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: typeof product.price === 'number' ? product.price : parseFloat(product.price?.toString() || '0'),
        currency: 'BRL',
        category: product.category || '',
        brand: product.brand || '',
        image_url: product.image_url || '',
        product_url: product.productUrl || '',
        keywords: [...(product.keywords || []), ...(product.market_keywords || []), ...(product.search_intent_keywords || [])],
        availability: 'in stock',
        condition: 'new',
        gtin: product.gtin || '',
        mpn: product.mpn || ''
      }));

      // Use advanced schema generator for complete page schema
      const { schemas } = generateCompletePageSchema(
        productDataArray,
        undefined, // companyData
        undefined, // faqItems
        undefined, // reviewsData
        title,
        description
      );
      
      // Add blogs ItemList to the schema graph
      const blogsItemList = {
        "@type": "ItemList",
        "name": "Artigos Relacionados",
        "description": "Conteúdo informativo relacionado aos produtos",
        "numberOfItems": blogs.length,
        "itemListElement": blogSchemas.map((schema, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": schema
        }))
      };
      
      // Schemas já vem com @id correto do generateCompletePageSchema
      if (Array.isArray(schemas)) {
        completeSchema = [...schemas, blogsItemList];
      } else {
        completeSchema = [schemas, blogsItemList];
      }
    } else {
      // Only blogs schema
      completeSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": title,
        "description": description,
        "numberOfItems": blogs.length,
        "itemListElement": blogSchemas.map((schema, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": schema
        }))
      };
    }

    const schemaJson = `
    <script type="application/ld+json">
    ${JSON.stringify(completeSchema, null, 2)}
    </script>`;

    // Create intelligent links mapping from selected products
    const intelligentLinks: Record<string, string> = {};
    if (selectedProducts) {
      selectedProducts.forEach(product => {
        if (product.name) {
          intelligentLinks[product.name.toLowerCase()] = `${canonicalUrl}/produto/${product.id}`;
        }
        // Add keywords as links too
        [...(product.keywords || []), ...(product.market_keywords || [])].forEach(keyword => {
          if (keyword.length > 3) {
            intelligentLinks[keyword.toLowerCase()] = `${canonicalUrl}/produto/${product.id}`;
          }
        });
      });
    }

    // Processar conteúdo dos blogs com links clicáveis
    const blogContents = blogs.map((blog, index) => {
      const blogCanonicalUrl = `${canonicalUrl}/blog/${domain}-${index + 1}`;
      
      // Converter markdown para HTML primeiro
      const htmlContent = convertMarkdownToHTML(blog.content);
      // Depois aplicar links inteligentes
      const processedContent = processContentWithAdvancedIntelligentLinks(htmlContent, intelligentLinks);
      
      // Smart HTML-aware truncation for preview
      const previewLength = 300;
      let previewContent = processedContent;
      
      // Extract text content without HTML for length calculation
      const textContent = processedContent.replace(/<[^>]*>/g, '');
      
      if (textContent.length > previewLength) {
        // Find a good break point near the preview length
        const truncateAt = textContent.substring(0, previewLength).lastIndexOf(' ');
        const targetLength = truncateAt > 0 ? truncateAt : previewLength;
        
        // Smart truncation that preserves HTML structure
        let textCount = 0;
        let htmlIndex = 0;
        let insideTag = false;
        
        for (let i = 0; i < processedContent.length; i++) {
          const char = processedContent[i];
          
          if (char === '<') {
            insideTag = true;
          } else if (char === '>') {
            insideTag = false;
          } else if (!insideTag) {
            textCount++;
            if (textCount >= targetLength) {
              htmlIndex = i + 1;
              break;
            }
          }
        }
        
        if (htmlIndex > 0) {
          let truncatedHTML = processedContent.substring(0, htmlIndex);
          
          // Ensure all opened tags are properly closed
          const openTags: string[] = [];
          const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
          let match;
          
          while ((match = tagRegex.exec(truncatedHTML)) !== null) {
            const tagName = match[1].toLowerCase();
            if (match[0].startsWith('</')) {
              // Closing tag
              const lastOpenTag = openTags.lastIndexOf(tagName);
              if (lastOpenTag !== -1) {
                openTags.splice(lastOpenTag, 1);
              }
            } else if (!match[0].endsWith('/>') && !['br', 'hr', 'img', 'input'].includes(tagName)) {
              // Opening tag (not self-closing)
              openTags.push(tagName);
            }
          }
          
          // Close any remaining open tags
          for (let i = openTags.length - 1; i >= 0; i--) {
            truncatedHTML += `</${openTags[i]}>`;
          }
          
          previewContent = truncatedHTML + '...';
        }
      }
      
      // Extrair título sanitizado do conteúdo markdown
      const sanitizedTitle = extractTitleFromMarkdown(blog.content) || blog.title;
      const htmlTitle = convertInlineMarkdownToHTML(sanitizedTitle);
      const processedTitle = processContentWithAdvancedIntelligentLinks(htmlTitle, intelligentLinks);
      
      // Encontrar URL do produto relacionado
      let productUrl = '';
      let productName = '';
      if (blog.productName && selectedProducts) {
        const relatedProduct = selectedProducts.find((p: any) => 
          p.name.toLowerCase().includes(blog.productName.toLowerCase())
        );
        if (relatedProduct) {
          productUrl = `${canonicalUrl}/produto/${relatedProduct.id}`;
          productName = relatedProduct.name;
        }
      }

      return `
        <section class="blog-item">
          <h2>
            <a href="${blogCanonicalUrl}" class="blog-link">
              ${processedTitle}
            </a>
          </h2>
          ${productName ? `
            <p class="product-reference">
              <strong>Produto:</strong>
              <a href="${productUrl}" title="Saiba mais sobre ${productName}">
                ${productName}
              </a>
            </p>
          ` : ''}
          <div class="blog-content post-card-content">
            <div class="preview-content">
              ${previewContent}
            </div>
            ${previewContent !== processedContent ? `
              <button class="read-more-btn">Leia mais →</button>
              <div class="full-content">
                ${processedContent}
              </div>
            ` : ''}
          </div>
        </section>
      `;
    }).join('\n');
    
    // Add SEO summary from landing pages if available
    let seoSummary = '';
    if (landingPagesSEO && landingPagesSEO.length > 0) {
      seoSummary = `
        <section class="seo-summary">
          <h2>Contexto das Landing Pages</h2>
          ${landingPagesSEO.map(lp => `
            <div class="landing-page-context">
              <h3>${lp.seo_title}</h3>
              <p>${lp.seo_description}</p>
              ${lp.ai_keywords.length > 0 ? `<p><strong>Keywords:</strong> ${lp.ai_keywords.slice(0, 10).join(', ')}</p>` : ''}
            </div>
          `).join('')}
        </section>
      `;
    }
    
    // PATCH 3: Strategic Blog Input (SEO Context com auto-linking)
    let strategicBlock = '';
    if (isSEOContextEnabled() && landingPageIdForSEOContext) {
      logSEODebug('Tentando carregar SEO Context', { landingPageId: landingPageIdForSEOContext });
      try {
        const cfg = getDomainConfig(domain);
        const strategic = await buildStrategicBlogInput(landingPageIdForSEOContext, cfg.BASE_URL);
        if (strategic?.baseTextHTML) {
          logSEODebug('SEO Context carregado com sucesso', { keywordsCount: strategic.keywords.length });
          const previewStrategic = strategic.baseTextHTML.slice(0, 300);
          const hasMore = strategic.baseTextHTML.length > 300;
          
          strategicBlock = `
          <section class="blog-item strategic" id="blog-strategic">
            <h2>
              <a href="${cfg.BASE_URL}${cfg.BLOG_PATH}" class="blog-link">
                Insights Estratégicos
              </a>
            </h2>
            <div class="blog-content post-card-content">
              <div class="preview-content">
                ${previewStrategic}${hasMore ? '…' : ''}
              </div>
              ${hasMore ? `
                <button class="read-more-btn" aria-expanded="false" aria-controls="full-strategic">
                  Leia mais →
                </button>
                <div id="full-strategic" class="full-content" hidden>
                  ${strategic.baseTextHTML}
                </div>
              ` : ''}
            </div>
          </section>`;
        } else {
          logSEODebug('SEO Context vazio ou não encontrado');
        }
      } catch (err) {
        console.error('❌ Erro ao compor SEO Context:', err);
        logSEODebug('Erro ao compor SEO Context', err);
      }
    }

    const finalHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- SEO Meta Tags -->
  <title>${truncateSEOTitle(title)}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow'}">
  ${preview ? '' : `<link rel="canonical" href="${canonicalUrl}/blog">`}
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${truncateSEOTitle(title)}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}/blog">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : `<meta property="og:image" content="https://${domain}.com.br/static/og/blog.jpg">`}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${truncateSEOTitle(title)}">
  <meta name="twitter:description" content="${description}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : `<meta name="twitter:image" content="https://${domain}.com.br/static/og/blog.jpg">`}
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="${domain}">
  <meta name="generator" content="Blog Consolidado SEO">
  <meta name="theme-color" content="#007bff">
  
  <!-- WebPage JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Blog ${domain === 'dentala' ? 'Dentala' : 'Eodonto'} - Odontologia Digital",
    "description": "${description}",
    "url": "${canonicalUrl}/blog",
    "inLanguage": "pt-BR"
  }
  </script>
  
  ${schemaJson}
  
  <!-- CSS Styling -->
  <style>
    :root {
      --primary-color: hsl(221, 83%, 53%);
      --primary-hover: hsl(221, 83%, 43%);
      --secondary-color: hsl(215, 25%, 27%);
      --text-color: hsl(224, 71%, 4%);
      --text-muted: hsl(215, 16%, 47%);
      --background: hsl(0, 0%, 100%);
      --background-alt: hsl(210, 40%, 98%);
      --border-color: hsl(214, 32%, 91%);
      --card-background: hsl(0, 0%, 100%);
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --gradient-primary: linear-gradient(135deg, var(--primary-color), hsl(221, 83%, 63%));
      --gradient-soft: linear-gradient(135deg, var(--background-alt), hsl(210, 40%, 96%));
      --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      --border-radius: 0.75rem;
      --font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--font-family);
      background: var(--background-alt);
      color: var(--text-color);
      line-height: 1.6;
    }
    
    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 1rem;
    }
    
    .header {
      text-align: center;
      margin-bottom: 4rem;
      padding: 3rem 2rem;
      background: var(--card-background);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-primary);
    }
    
    .header h1 {
      color: var(--text-color);
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 700;
      margin-bottom: 1rem;
      line-height: 1.1;
    }
    
    .header .subtitle {
      color: var(--text-muted);
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      font-weight: 400;
    }
    
    .header .meta-info {
      color: var(--text-muted);
      font-size: 0.95rem;
      font-weight: 500;
    }
    
    .blog-section {
      display: grid;
      gap: 2rem;
    }
    
    .blog-item {
      background: var(--card-background);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      transition: var(--transition-smooth);
      border: 1px solid var(--border-color);
    }
    
    .blog-item:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
    }
    
    .blog-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    
    .blog-item h2 {
      color: var(--text-color);
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding: 2rem 2rem 0;
      transition: var(--transition-smooth);
    }
    
    .blog-link:hover h2 {
      color: var(--primary-color);
    }
    
    .product-reference {
      background: linear-gradient(135deg, hsl(221, 83%, 98%), hsl(221, 83%, 95%));
      padding: 0.875rem 1.25rem;
      margin: 0 2rem 1.5rem;
      border-radius: 0.5rem;
      border-left: 4px solid var(--primary-color);
      font-weight: 500;
      color: var(--secondary-color);
    }
    
    .blog-content {
      padding: 0 2rem 2rem;
      font-size: 1rem;
      line-height: 1.7;
      color: var(--text-color);
    }
    
    .post-card-content {
      padding: 0 2rem 2rem;
    }
    
    .blog-content h3 {
      color: var(--secondary-color);
      font-size: 1.375rem;
      font-weight: 600;
      margin: 2rem 0 1rem 0;
    }
    
    .blog-content h4 {
      color: var(--text-color);
      font-size: 1.125rem;
      font-weight: 600;
      margin: 1.5rem 0 0.75rem 0;
    }
    
    .blog-content p {
      margin-bottom: 1.25rem;
      text-align: justify;
    }
    
    .blog-content ul, .blog-content ol {
      margin: 1rem 0 1.25rem 2rem;
    }
    
    .blog-content li {
      margin-bottom: 0.5rem;
    }
    
    .blog-content a {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: var(--transition-smooth);
    }
    
    .blog-content a:hover {
      border-bottom-color: var(--primary-color);
    }
    
    .blog-content blockquote {
      background: var(--background-alt);
      border-left: 4px solid var(--primary-color);
      margin: 1.5rem 0;
      padding: 1.25rem 1.5rem;
      font-style: italic;
      border-radius: 0.5rem;
    }
    
    .blog-content strong {
      color: var(--secondary-color);
      font-weight: 600;
    }
    
    .read-more-btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      font-family: inherit;
      font-size: 0.95rem;
      transition: var(--transition-smooth);
      box-shadow: var(--shadow-sm);
    }
    
    .read-more-btn:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    .full-content {
      display: none;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }
    
    .full-content.expanded {
      display: block;
    }
    
    .preview-content {
      margin-bottom: 0;
    }
    
    .keywords-section {
      margin-top: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, hsl(142, 76%, 98%), hsl(142, 76%, 95%));
      border-radius: var(--border-radius);
      border-left: 4px solid hsl(142, 76%, 36%);
      box-shadow: var(--shadow-md);
    }
    
    .keywords-section h3 {
      color: hsl(142, 76%, 36%);
      margin-bottom: 1.25rem;
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .keywords-section .tag {
      display: inline-block;
      background: var(--card-background);
      color: var(--text-color);
      padding: 0.5rem 1rem;
      margin: 0.25rem;
      border-radius: 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-color);
      transition: var(--transition-smooth);
    }
    
    .keywords-section .tag:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    
    .seo-summary {
      background: linear-gradient(135deg, hsl(291, 64%, 98%), hsl(291, 64%, 95%));
      padding: 2rem;
      border-radius: var(--border-radius);
      margin: 3rem 0;
      border-left: 4px solid hsl(291, 64%, 42%);
      box-shadow: var(--shadow-md);
    }
    
    .seo-summary h2 {
      color: hsl(291, 64%, 42%);
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    
    .landing-page-context {
      margin-bottom: 1.5rem;
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }
    
    .landing-page-context h3 {
      color: var(--text-color);
      margin-bottom: 0.75rem;
      font-size: 1.125rem;
    }
    
    .products-summary {
      background: linear-gradient(135deg, hsl(35, 100%, 98%), hsl(35, 100%, 95%));
      padding: 2rem;
      border-radius: var(--border-radius);
      margin: 3rem 0;
      border-left: 4px solid hsl(35, 100%, 50%);
      box-shadow: var(--shadow-md);
    }
    
    .products-summary h2 {
      color: hsl(35, 100%, 40%);
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    
    .product-card {
      background: rgba(255, 255, 255, 0.9);
      padding: 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      transition: var(--transition-smooth);
    }
    
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .product-card h3 {
      color: var(--text-color);
      margin-bottom: 0.75rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    footer {
      margin-top: 4rem;
      padding: 2rem;
      background: var(--card-background);
      border-radius: var(--border-radius);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      box-shadow: var(--shadow-md);
      border-top: 4px solid var(--primary-color);
    }
    
    footer p {
      margin-bottom: 0.5rem;
    }
    
    footer p:last-child {
      margin-bottom: 0;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 2rem 1rem;
      }
      
      .header {
        padding: 2rem 1rem;
        margin-bottom: 2rem;
      }
      
      .header h1 {
        font-size: clamp(1.75rem, 4vw, 2.5rem);
      }
      
      .header .subtitle {
        font-size: 1.125rem;
      }
      
      .blog-item h2 {
        font-size: 1.5rem;
        padding: 1.5rem 1.5rem 0;
      }
      
      .blog-content, .post-card-content {
        padding: 0 1.5rem 1.5rem;
        font-size: 0.95rem;
      }
      
      .product-reference {
        margin: 0 1.5rem 1.25rem;
      }
      
      .seo-summary, .products-summary, .keywords-section {
        margin: 2rem 0;
        padding: 1.5rem;
      }
      
      .products-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <div class="subtitle">${description}</div>
      <div class="meta-info">
        ${blogs.length} artigo${blogs.length > 1 ? 's' : ''} • Publicado em ${new Date().toLocaleDateString('pt-BR')} • ${domain}
      </div>
    </div>
    
    
    
    <main class="blog-section">
      ${seoSummary}
      ${blogContents}
    </main>
    
    
    ${uniqueKeywords.length > 0 ? `
    <section class="keywords-section">
      <h3>🏷️ Palavras-chave relacionadas</h3>
      <div>
        ${uniqueKeywords.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
      </div>
    </section>
    ` : ''}
    
    <footer>
      <p>&copy; ${new Date().getFullYear()} ${domain}. Todos os direitos reservados.</p>
      <p><small>Conteúdo gerado com tecnologia avançada de SEO</small></p>
      <p><small>URL: ${canonicalUrl}</small></p>
    </footer>
  </div>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Usar delegação de eventos para melhor robustez
      document.addEventListener('click', function(event) {
        const button = event.target.closest('.read-more-btn');
        if (!button) return;
        
        event.preventDefault();
        
        // Encontrar o container do conteúdo (aceitar ambos os tipos como no Eodonto)
        const cardContent = button.closest('.post-card-content, .featured-post-content');
        if (!cardContent) return;

        // Encontrar o elemento de conteúdo completo
        const fullContent = cardContent.querySelector('.full-content');
        if (!fullContent) return;

        // Alternar a classe 'expanded'
        const isExpanded = fullContent.classList.contains('expanded');
        fullContent.classList.toggle('expanded');
        
        // Atualizar o texto do botão (igual ao Eodonto)
        button.textContent = isExpanded ? 'Leia mais →' : 'Fechar ↑';
        
        // Gerenciar preview content se existir
        const previewContent = cardContent.querySelector('.preview-content');
        if (previewContent) {
          previewContent.style.display = isExpanded ? 'block' : 'none';
        }
      });
    });
  </script>
</body>
</html>`;

    // PATCH 5: Blindagem final anti-rótulos internos
    return stripInternalLabels(finalHTML);
  }, []);

  const generateEmailWebViewHTML = useCallback((options: {
    subject: string;
    content: string;
    domain: string;
    unsubscribeUrl?: string;
  }): string => {
    const { subject, content, domain, unsubscribeUrl } = options;
    const canonicalUrl = `https://${domain}/email-view`;

    return generateOptimizedHTML({
      title: `Email: ${subject}`,
      description: `Visualização web do email: ${subject}`,
      content: `
        <div class="email-container">
          <div class="email-header">
            <h2>📧 Visualização Web do Email</h2>
            <p><strong>Assunto:</strong> ${subject}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          
          <div class="email-content">
            ${content}
          </div>
          
          ${unsubscribeUrl ? `
          <div class="email-footer">
            <p><small>Para cancelar o recebimento de emails, <a href="${unsubscribeUrl}">clique aqui</a>.</small></p>
          </div>
          ` : ''}
        </div>
        
        <style>
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #f9f9f9;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .email-header {
            background: #007bff;
            color: white;
            padding: 20px;
            text-align: center;
          }
          
          .email-header h2 {
            margin: 0 0 15px 0;
            color: white;
          }
          
          .email-content {
            padding: 30px;
            background: white;
          }
          
          .email-footer {
            padding: 15px;
            background: #f0f0f0;
            text-align: center;
            border-top: 1px solid #ddd;
          }
        </style>
      `,
      domain,
      canonicalUrl,
      type: 'article'
    });
  }, [generateOptimizedHTML]);

  return {
    generateOptimizedHTML,
    generateConsolidatedBlogHTML,
    generateEmailWebViewHTML
  };
};