/**
 * Serviço responsável pela geração de HTML de blogs
 * Extraído de useSEOHTMLGenerator para melhor modularidade
 */

export interface BlogHTMLOptions {
  blogs: Array<{
    title: string;
    content: string;
    meta_description?: string;
    keywords?: string[];
  }>;
  domain: string;
  canonicalUrl: string;
  finalTitle: string;
  finalDescription: string;
  selectedProducts?: any[];
  intelligentLinks?: Record<string, string>;
  excludeFooter?: boolean;
  companySEO?: any;
}

export function generateBlogHTML(options: BlogHTMLOptions): string {
  const {
    blogs,
    domain,
    canonicalUrl,
    finalTitle,
    finalDescription,
    selectedProducts,
    intelligentLinks = {},
    excludeFooter = false,
    companySEO
  } = options;

  // Implementação básica - será expandida conforme necessário
  const blogContents = blogs.map((blog, index) => {
    return `
      <article class="blog-post" data-index="${index}">
        <h2>${blog.title}</h2>
        <div class="blog-content">
          ${blog.content}
        </div>
      </article>
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${finalTitle}</title>
      <meta name="description" content="${finalDescription}">
      <link rel="canonical" href="${canonicalUrl}">
    </head>
    <body>
      <main>
        <h1>${finalTitle}</h1>
        ${blogContents}
      </main>
      ${!excludeFooter ? `
        <footer>
          <p>&copy; ${new Date().getFullYear()} ${domain}. Todos os direitos reservados.</p>
        </footer>
      ` : ''}
    </body>
    </html>
  `;
}
