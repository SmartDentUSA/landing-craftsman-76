/**
 * BreadcrumbList Schema Helper
 * FASE 9: Centraliza geração de BreadcrumbList para SEO
 * 
 * Google exibe breadcrumbs como links clicáveis na SERP
 * Impacto: CTR +15-25%, melhor compreensão da estrutura do site
 */

// ============================================
// INTERFACES
// ============================================

export interface BreadcrumbItem {
  name: string;
  url?: string;
  position?: number; // Auto-incrementado se não fornecido
}

export interface BreadcrumbOptions {
  websiteUrl: string;
  websiteName?: string;
  includeHome?: boolean; // default: true
  includeCurrent?: boolean; // default: true (último item sem URL = página atual)
  maxItems?: number; // default: 5
}

export interface BlogBreadcrumbData {
  title: string;
  category?: string;
  categorySlug?: string;
  slug?: string;
}

export interface ProductBreadcrumbData {
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  slug?: string;
  productUrl?: string;
}

export interface SolutionBreadcrumbData {
  title: string;
  category?: string;
  painType?: string;
  canonicalUrl?: string;
}

export interface LandingPageBreadcrumbData {
  name: string;
  brand?: string;
  canonicalUrl?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Converte texto para slug URL-friendly
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Espaços para hífens
    .replace(/-+/g, '-') // Múltiplos hífens para um
    .trim();
}

/**
 * Garante que a URL base não termine com /
 */
function normalizeUrl(url: string): string {
  return url?.replace(/\/+$/, '') || '';
}

// ============================================
// CORE SCHEMA GENERATORS
// ============================================

/**
 * Gera BreadcrumbList Schema a partir de itens
 */
export function generateBreadcrumbListSchema(
  items: BreadcrumbItem[],
  options: BreadcrumbOptions
): Record<string, any> {
  const {
    websiteUrl,
    websiteName = 'Home',
    includeHome = true,
    includeCurrent = true,
    maxItems = 5
  } = options;

  const baseUrl = normalizeUrl(websiteUrl);
  const breadcrumbItems: BreadcrumbItem[] = [];

  // Adiciona Home se configurado
  if (includeHome) {
    breadcrumbItems.push({
      name: websiteName,
      url: baseUrl
    });
  }

  // Adiciona itens fornecidos
  items.forEach(item => {
    breadcrumbItems.push(item);
  });

  // Limita ao máximo de itens
  const limitedItems = breadcrumbItems.slice(0, maxItems);

  // Gera itemListElement com posições
  const itemListElement = limitedItems.map((item, index) => {
    const position = index + 1;
    const isLast = index === limitedItems.length - 1;

    // Último item não tem URL (representa a página atual)
    if (isLast && includeCurrent && !item.url) {
      return {
        '@type': 'ListItem',
        position,
        name: item.name
      };
    }

    return {
      '@type': 'ListItem',
      position,
      name: item.name,
      item: item.url || baseUrl
    };
  });

  return {
    '@type': 'BreadcrumbList',
    itemListElement
  };
}

// ============================================
// SPECIALIZED GENERATORS
// ============================================

/**
 * Gera BreadcrumbList para Blog Posts
 * Estrutura: Home → Blog → Categoria → Título do Artigo
 */
export function generateBlogBreadcrumbs(
  blog: BlogBreadcrumbData,
  options: BreadcrumbOptions
): Record<string, any> {
  const baseUrl = normalizeUrl(options.websiteUrl);
  const items: BreadcrumbItem[] = [];

  // Blog
  items.push({
    name: 'Blog',
    url: `${baseUrl}/blog`
  });

  // Categoria (se existir)
  if (blog.category) {
    const categorySlug = blog.categorySlug || slugify(blog.category);
    items.push({
      name: blog.category,
      url: `${baseUrl}/blog/categoria/${categorySlug}`
    });
  }

  // Título do artigo (último item, sem URL)
  items.push({
    name: blog.title
  });

  return generateBreadcrumbListSchema(items, options);
}

/**
 * Gera BreadcrumbList para Páginas de Produto
 * Estrutura: Home → Categoria → Subcategoria → Produto
 */
export function generateProductBreadcrumbs(
  product: ProductBreadcrumbData,
  options: BreadcrumbOptions
): Record<string, any> {
  const baseUrl = normalizeUrl(options.websiteUrl);
  const items: BreadcrumbItem[] = [];

  // Categoria principal
  if (product.category) {
    items.push({
      name: product.category,
      url: `${baseUrl}/categoria/${slugify(product.category)}`
    });
  }

  // Subcategoria
  if (product.subcategory) {
    const parentSlug = product.category ? slugify(product.category) : 'produtos';
    items.push({
      name: product.subcategory,
      url: `${baseUrl}/categoria/${parentSlug}/${slugify(product.subcategory)}`
    });
  }

  // Produto (último item)
  items.push({
    name: product.name,
    url: product.productUrl // Se tiver URL, usa; senão fica sem (página atual)
  });

  return generateBreadcrumbListSchema(items, options);
}

/**
 * Gera BreadcrumbList para Soluções SPIN
 * Estrutura: Home → Soluções → Categoria/Tipo de Dor → Título da Solução
 */
export function generateSolutionBreadcrumbs(
  solution: SolutionBreadcrumbData,
  options: BreadcrumbOptions
): Record<string, any> {
  const baseUrl = normalizeUrl(options.websiteUrl);
  const items: BreadcrumbItem[] = [];

  // Soluções
  items.push({
    name: solution.category || 'Soluções',
    url: `${baseUrl}/solucoes`
  });

  // Tipo de dor (se existir e for diferente da categoria)
  if (solution.painType && solution.painType !== solution.category) {
    items.push({
      name: solution.painType,
      url: `${baseUrl}/solucoes/${slugify(solution.painType)}`
    });
  }

  // Título da solução
  items.push({
    name: solution.title,
    url: solution.canonicalUrl // Último item com URL canônica
  });

  return generateBreadcrumbListSchema(items, options);
}

/**
 * Gera BreadcrumbList para Landing Pages clonadas
 * Estrutura: Home → Marca → Produto
 */
export function generateLandingPageBreadcrumbs(
  landingPage: LandingPageBreadcrumbData,
  options: BreadcrumbOptions
): Record<string, any> {
  const baseUrl = normalizeUrl(options.websiteUrl);
  const items: BreadcrumbItem[] = [];

  // Marca
  if (landingPage.brand) {
    items.push({
      name: landingPage.brand,
      url: `${baseUrl}/marca/${slugify(landingPage.brand)}`
    });
  }

  // Nome do produto/LP (último item)
  items.push({
    name: landingPage.name,
    url: landingPage.canonicalUrl
  });

  return generateBreadcrumbListSchema(items, options);
}

/**
 * Gera BreadcrumbList para E-commerce (produto no repositório)
 * Estrutura: Home → Categoria → Subcategoria → Produto
 */
export function generateEcommerceBreadcrumbs(
  product: ProductBreadcrumbData,
  options: BreadcrumbOptions
): Record<string, any> {
  const baseUrl = normalizeUrl(options.websiteUrl);
  const items: BreadcrumbItem[] = [];

  // Se tem marca, usa como primeiro nível
  if (product.brand) {
    items.push({
      name: product.brand,
      url: `${baseUrl}/marca/${slugify(product.brand)}`
    });
  }

  // Categoria
  if (product.category) {
    items.push({
      name: product.category,
      url: `${baseUrl}/categoria/${slugify(product.category)}`
    });
  }

  // Subcategoria
  if (product.subcategory) {
    const parentPath = product.category 
      ? `${slugify(product.category)}/${slugify(product.subcategory)}`
      : slugify(product.subcategory);
    items.push({
      name: product.subcategory,
      url: `${baseUrl}/categoria/${parentPath}`
    });
  }

  // Produto (último item, sem URL = página atual)
  items.push({
    name: product.name
  });

  return generateBreadcrumbListSchema(items, options);
}

// ============================================
// HTML MICRODATA GENERATOR
// ============================================

/**
 * Gera HTML com microdata para breadcrumbs
 * Útil para inserir breadcrumbs visíveis na página
 */
export function generateBreadcrumbMicrodataHTML(
  items: BreadcrumbItem[],
  options: BreadcrumbOptions
): string {
  const {
    websiteUrl,
    websiteName = 'Home',
    includeHome = true
  } = options;

  const baseUrl = normalizeUrl(websiteUrl);
  const allItems: BreadcrumbItem[] = [];

  if (includeHome) {
    allItems.push({ name: websiteName, url: baseUrl });
  }
  allItems.push(...items);

  const listItems = allItems.map((item, index) => {
    const position = index + 1;
    const isLast = index === allItems.length - 1;

    if (isLast) {
      return `
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
          <span itemprop="name">${item.name}</span>
          <meta itemprop="position" content="${position}">
        </li>
      `;
    }

    return `
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <a itemprop="item" href="${item.url}">
          <span itemprop="name">${item.name}</span>
        </a>
        <meta itemprop="position" content="${position}">
      </li>
    `;
  }).join('\n');

  return `
    <nav aria-label="Breadcrumb">
      <ol itemscope itemtype="https://schema.org/BreadcrumbList" class="breadcrumb">
        ${listItems}
      </ol>
    </nav>
  `.trim();
}

// ============================================
// EXTRACTION HELPERS
// ============================================

/**
 * Extrai dados de breadcrumb de um blog post
 */
export function extractBlogBreadcrumbData(blogPost: any): BlogBreadcrumbData {
  return {
    title: blogPost.title || 'Artigo',
    category: blogPost.category || blogPost.keywords?.[0] || undefined,
    categorySlug: blogPost.category_slug || (blogPost.category ? slugify(blogPost.category) : undefined),
    slug: blogPost.slug
  };
}

/**
 * Extrai dados de breadcrumb de um produto
 */
export function extractProductBreadcrumbData(product: any): ProductBreadcrumbData {
  return {
    name: product.name || 'Produto',
    category: product.category || undefined,
    subcategory: product.subcategory || undefined,
    brand: product.brand || undefined,
    slug: product.slug || slugify(product.name),
    productUrl: product.product_url || product.canonical_url || undefined
  };
}

console.log('✅ [SCHEMA HELPER] breadcrumb-schema-helper.ts carregado');
