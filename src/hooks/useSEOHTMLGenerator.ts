import { useCallback } from 'react';
import { useAdvancedSchemaGenerator } from './useAdvancedSchemaGenerator';
import { processContentWithIntelligentLinks } from '@/lib/intelligent-links';
import { useLinksRepository } from './useLinksRepository';

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
}

export const useSEOHTMLGenerator = () => {
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

    // Criar mapeamento de links inteligentes
    const intelligentLinks: Record<string, string> = {};
    allLinks.forEach(link => {
      if (link.name) {
        intelligentLinks[link.name.toLowerCase()] = link.url;
      }
    });

    // Processar conteúdo com links inteligentes
    const processedContent = processContentWithIntelligentLinks(content, intelligentLinks);

    // Gerar Schema.org se solicitado
    let schemaJson = '';
    if (includeSchema) {
      if (type === 'product' && products.length > 0) {
        const { schemas } = generateCompletePageSchema(products, undefined, undefined, undefined, title, description);
        schemaJson = `
        <script type="application/ld+json">
        ${JSON.stringify(schemas, null, 2)}
        </script>`;
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

    // URL canônica
    const canonical = canonicalUrl || (domain ? `https://${domain}` : window.location.href);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${keywords.length > 0 ? `<meta name="keywords" content="${keywords.join(', ')}">` : ''}
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="${type === 'product' ? 'product' : 'article'}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${domain || 'Nossa Empresa'}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta property="og:locale" content="pt_BR">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="${author?.name || domain || 'Nossa Empresa'}">
  <meta name="generator" content="SEO Generator">
  <meta name="theme-color" content="#007bff">
  
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

  const generateConsolidatedBlogHTML = useCallback((options: ConsolidatedBlogOptions): string => {
    const { title, description, domain, blogs, landingPagesSEO, selectedProducts, aggregatedKeywords, landingPageData, includeOffers = false, ogImage } = options;

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

    // Gerar schema para múltiplos artigos
    const blogSchemas = blogs.map((blog, index) => ({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": blog.title,
      "description": blog.content.substring(0, 160),
      "datePublished": new Date().toISOString(),
      "position": index + 1,
      "author": {
        "@type": "Organization",
        "name": domain
      }
    }));

    const itemListSchema = {
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

    const schemaJson = `
    <script type="application/ld+json">
    ${JSON.stringify(itemListSchema, null, 2)}
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
      return `
        <section class="blog-item">
          <a href="${blogCanonicalUrl}" class="blog-link">
            <h2>${blog.title}</h2>
          </a>
          ${blog.productName ? `<p class="product-reference"><strong>Produto:</strong> ${blog.productName}</p>` : ''}
          <div class="blog-content">
            ${processContentWithIntelligentLinks(blog.content, intelligentLinks)}
          </div>
        </section>
      `;
    }).join('\n');

    const canonicalUrl = `https://${domain}`;
    
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

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${uniqueKeywords.join(', ')}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="${domain}">
  <meta property="og:locale" content="pt_BR">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="${domain}">
  <meta name="generator" content="Blog Consolidado SEO">
  <meta name="theme-color" content="#007bff">
  
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
    
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 3px solid #007bff;
    }
    
    .header h1 {
      color: #1a1a1a;
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 1.2rem;
      margin-bottom: 20px;
    }
    
    .header .meta-info {
      color: #888;
      font-size: 0.9rem;
    }
    
    .blog-item {
      margin-bottom: 60px;
      padding-bottom: 40px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .blog-item:last-child {
      border-bottom: none;
    }
    
    .blog-link {
      text-decoration: none;
      color: inherit;
      display: block;
      transition: all 0.3s ease;
    }
    
    .blog-link:hover {
      transform: translateY(-2px);
    }
    
    .blog-item h2 {
      color: #2c3e50;
      font-size: 2rem;
      margin-bottom: 20px;
      border-left: 4px solid #007bff;
      padding-left: 15px;
      transition: color 0.3s ease;
    }
    
    .blog-link:hover h2 {
      color: #007bff;
    }
    
    .product-reference {
      background: #e3f2fd;
      padding: 10px 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #2196f3;
    }
    
    .blog-content {
      font-size: 1.1rem;
      line-height: 1.7;
    }
    
    .blog-content h3 {
      color: #34495e;
      font-size: 1.5rem;
      margin: 25px 0 15px 0;
    }
    
    .blog-content h4 {
      color: #2c3e50;
      font-size: 1.2rem;
      margin: 20px 0 10px 0;
    }
    
    .blog-content p {
      margin-bottom: 18px;
      text-align: justify;
    }
    
    .blog-content ul, .blog-content ol {
      margin: 15px 0 15px 30px;
    }
    
    .blog-content li {
      margin-bottom: 8px;
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
    
    .blog-content blockquote {
      background: #f8f9fa;
      border-left: 4px solid #007bff;
      margin: 20px 0;
      padding: 15px 20px;
      font-style: italic;
    }
    
    .blog-content strong {
      color: #2c3e50;
    }
    
    .keywords-section {
      margin-top: 40px;
      padding: 25px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      border-left: 4px solid #28a745;
    }
    
    .keywords-section h3 {
      color: #28a745;
      margin-bottom: 15px;
      font-size: 1.3rem;
    }
    
    .keywords-section .tag {
      display: inline-block;
      background: #fff;
      color: #495057;
      padding: 6px 12px;
      margin: 4px;
      border-radius: 20px;
      font-size: 0.9rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border: 1px solid #dee2e6;
    }
    
    .summary-box {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      padding: 25px;
      border-radius: 12px;
      margin: 40px 0;
      border-left: 4px solid #2196f3;
    }
    
    .summary-box h3 {
      color: #1976d2;
      margin-bottom: 15px;
    }
    
    .seo-summary {
      background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
      padding: 25px;
      border-radius: 12px;
      margin: 40px 0;
      border-left: 4px solid #9c27b0;
    }
    
    .landing-page-context {
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 8px;
    }
    
    .products-summary {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      padding: 25px;
      border-radius: 12px;
      margin: 40px 0;
      border-left: 4px solid #ff9800;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .product-card {
      background: rgba(255, 255, 255, 0.9);
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    footer {
      margin-top: 60px;
      padding-top: 40px;
      border-top: 3px solid #eee;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      .header h1 {
        font-size: 2.2rem;
      }
      
      .blog-item h2 {
        font-size: 1.6rem;
      }
      
      .blog-content {
        font-size: 1rem;
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
    
    <div class="summary-box">
      <h3>📋 Resumo do Conteúdo</h3>
      <p>Este documento consolida ${blogs.length} artigo${blogs.length > 1 ? 's especializados' : ' especializado'} sobre produtos e serviços relevantes. Cada seção aborda aspectos técnicos e comerciais importantes para profissionais da área.</p>
    </div>
    
    <main>
      ${seoSummary}
      ${blogContents}
      
      ${selectedProducts && selectedProducts.length > 0 ? `
      <section class="products-summary">
        <h2>Produtos Relacionados</h2>
        <div class="products-grid">
          ${selectedProducts.map(product => `
            <div class="product-card">
              <h3>${product.name}</h3>
              <p>${product.description}</p>
              ${product.category ? `<p><strong>Categoria:</strong> ${product.category}</p>` : ''}
              ${product.keywords && product.keywords.length > 0 ? `<p><strong>Keywords:</strong> ${product.keywords.slice(0, 5).join(', ')}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}
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
</body>
</html>`;
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