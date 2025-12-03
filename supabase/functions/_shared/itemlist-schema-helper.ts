/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 FASE 7: ItemList Schema Helper (SGE/AEO)
 * ═══════════════════════════════════════════════════════════
 * 
 * Gera ItemList Schema.org para:
 * - Listas de produtos (Product Carousel Rich Snippets)
 * - Listas de artigos/blogs
 * - Listas genéricas
 * 
 * Benefícios SEO:
 * ✅ Google Product Carousel
 * ✅ Google Shopping visibility
 * ✅ Voice Search optimization
 * ✅ AI Discovery (Gemini, ChatGPT)
 */

// ═══════════════════════════════════════════════════════════
// 📋 INTERFACES
// ═══════════════════════════════════════════════════════════

export interface ItemListProduct {
  name: string;
  description?: string;
  image_url?: string;
  product_url?: string;
  price?: number;
  promo_price?: number;
  brand?: string;
  gtin?: string;
  mpn?: string;
  availability?: string;
  currency?: string;
}

export interface ItemListArticle {
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  author?: string;
  datePublished?: string;
}

export interface ItemListOptions {
  listName?: string;
  listDescription?: string;
  includeOffers?: boolean;
  includeBrand?: boolean;
  listOrder?: 'ascending' | 'descending' | 'unordered';
  baseUrl?: string;
}

// ═══════════════════════════════════════════════════════════
// 🛒 PRODUCT ITEMLIST SCHEMA
// ═══════════════════════════════════════════════════════════

/**
 * Gera ItemList Schema para lista de produtos
 * Usado em: SPIN Landing Pages, E-commerce, Blog Posts
 */
export function generateProductItemListSchema(
  products: ItemListProduct[],
  options: ItemListOptions = {}
): any | null {
  // Validar produtos
  const validProducts = products.filter(p => p.name && p.name.trim().length > 0);
  
  if (validProducts.length === 0) {
    console.log('⚠️ [ItemList] Nenhum produto válido para gerar schema');
    return null;
  }

  const {
    listName,
    listDescription,
    includeOffers = true,
    includeBrand = true,
    listOrder = 'ascending',
    baseUrl
  } = options;

  // Mapear ordem para Schema.org
  const orderMap = {
    'ascending': 'https://schema.org/ItemListOrderAscending',
    'descending': 'https://schema.org/ItemListOrderDescending',
    'unordered': 'https://schema.org/ItemListUnordered'
  };

  const schema: any = {
    '@type': 'ItemList',
    numberOfItems: validProducts.length,
    itemListOrder: orderMap[listOrder]
  };

  // Adicionar nome e descrição se fornecidos
  if (listName) {
    schema.name = listName;
  }
  if (listDescription) {
    schema.description = listDescription;
  }

  // Gerar elementos da lista
  schema.itemListElement = validProducts.map((product, index) => {
    const item: any = {
      '@type': 'Product',
      name: product.name
    };

    // Descrição
    if (product.description) {
      item.description = product.description.substring(0, 500).replace(/<[^>]*>/g, '');
    }

    // Imagem
    if (product.image_url) {
      item.image = product.image_url;
    }

    // URL do produto
    if (product.product_url) {
      item.url = product.product_url;
    } else if (baseUrl) {
      item.url = baseUrl;
    }

    // Brand
    if (includeBrand && product.brand) {
      item.brand = {
        '@type': 'Brand',
        name: product.brand
      };
    }

    // Identificadores
    if (product.gtin) {
      item.gtin = product.gtin;
    }
    if (product.mpn) {
      item.mpn = product.mpn;
    }

    // Offers (preço)
    if (includeOffers && (product.price || product.promo_price)) {
      item.offers = {
        '@type': 'Offer',
        price: product.promo_price || product.price,
        priceCurrency: product.currency || 'BRL',
        availability: product.availability 
          ? `https://schema.org/${product.availability.replace(' ', '')}` 
          : 'https://schema.org/InStock'
      };
    }

    return {
      '@type': 'ListItem',
      position: index + 1,
      item
    };
  });

  console.log(`✅ [ItemList] Product schema gerado com ${validProducts.length} produtos`);
  return schema;
}

// ═══════════════════════════════════════════════════════════
// 📰 ARTICLE ITEMLIST SCHEMA
// ═══════════════════════════════════════════════════════════

/**
 * Gera ItemList Schema para lista de artigos/blogs
 */
export function generateArticleItemListSchema(
  articles: ItemListArticle[],
  options: ItemListOptions = {}
): any | null {
  const validArticles = articles.filter(a => a.title && a.title.trim().length > 0);
  
  if (validArticles.length === 0) {
    return null;
  }

  const { listName, listDescription, listOrder = 'descending' } = options;

  const orderMap = {
    'ascending': 'https://schema.org/ItemListOrderAscending',
    'descending': 'https://schema.org/ItemListOrderDescending',
    'unordered': 'https://schema.org/ItemListUnordered'
  };

  const schema: any = {
    '@type': 'ItemList',
    numberOfItems: validArticles.length,
    itemListOrder: orderMap[listOrder]
  };

  if (listName) schema.name = listName;
  if (listDescription) schema.description = listDescription;

  schema.itemListElement = validArticles.map((article, index) => {
    const item: any = {
      '@type': 'Article',
      headline: article.title
    };

    if (article.description) {
      item.description = article.description.substring(0, 160);
    }
    if (article.url) {
      item.url = article.url;
    }
    if (article.image_url) {
      item.image = article.image_url;
    }
    if (article.author) {
      item.author = { '@type': 'Person', name: article.author };
    }
    if (article.datePublished) {
      item.datePublished = article.datePublished;
    }

    return {
      '@type': 'ListItem',
      position: index + 1,
      item
    };
  });

  console.log(`✅ [ItemList] Article schema gerado com ${validArticles.length} artigos`);
  return schema;
}

// ═══════════════════════════════════════════════════════════
// 🎠 CAROUSEL ITEMLIST SCHEMA (Google Rich Snippets)
// ═══════════════════════════════════════════════════════════

/**
 * Gera ItemList Schema otimizado para Google Carousel Rich Snippets
 * Requer: produtos com imagem, nome e URL únicos
 */
export function generateCarouselItemListSchema(
  products: ItemListProduct[],
  listName: string = 'Produtos Relacionados'
): any | null {
  // Filtrar apenas produtos com dados mínimos para carousel
  const carouselProducts = products.filter(p => 
    p.name && 
    p.image_url && 
    (p.product_url || p.description)
  );

  if (carouselProducts.length < 2) {
    console.log('⚠️ [Carousel] Mínimo 2 produtos com imagem e URL para carousel');
    return null;
  }

  return generateProductItemListSchema(carouselProducts, {
    listName,
    includeOffers: true,
    includeBrand: true,
    listOrder: 'ascending'
  });
}

// ═══════════════════════════════════════════════════════════
// 🔄 GENERIC ITEMLIST SCHEMA
// ═══════════════════════════════════════════════════════════

/**
 * Gera ItemList Schema genérico para qualquer tipo de item
 */
export function generateGenericItemListSchema(
  items: Array<{ name: string; url?: string; description?: string; image?: string }>,
  itemType: string = 'Thing',
  options: ItemListOptions = {}
): any | null {
  const validItems = items.filter(i => i.name && i.name.trim().length > 0);
  
  if (validItems.length === 0) {
    return null;
  }

  const { listName, listDescription, listOrder = 'ascending' } = options;

  const orderMap = {
    'ascending': 'https://schema.org/ItemListOrderAscending',
    'descending': 'https://schema.org/ItemListOrderDescending',
    'unordered': 'https://schema.org/ItemListUnordered'
  };

  const schema: any = {
    '@type': 'ItemList',
    numberOfItems: validItems.length,
    itemListOrder: orderMap[listOrder]
  };

  if (listName) schema.name = listName;
  if (listDescription) schema.description = listDescription;

  schema.itemListElement = validItems.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': itemType,
      name: item.name,
      ...(item.url && { url: item.url }),
      ...(item.description && { description: item.description }),
      ...(item.image && { image: item.image })
    }
  }));

  return schema;
}

// ═══════════════════════════════════════════════════════════
// 📦 HELPER: Extrair produtos do formato do repositório
// ═══════════════════════════════════════════════════════════

/**
 * Converte produtos do formato products_repository para ItemListProduct
 */
export function convertToItemListProducts(
  products: any[],
  defaultUrl?: string
): ItemListProduct[] {
  return products.map(p => ({
    name: p.name,
    description: p.description || p.sales_pitch,
    image_url: p.image_url,
    product_url: p.product_url || p.canonical_url || defaultUrl,
    price: p.price,
    promo_price: p.promo_price,
    brand: p.brand,
    gtin: p.gtin,
    mpn: p.mpn,
    availability: p.availability || 'in stock',
    currency: p.currency || 'BRL'
  }));
}

// ═══════════════════════════════════════════════════════════
// 📄 STRING OUTPUT (com @context)
// ═══════════════════════════════════════════════════════════

/**
 * Gera ItemList Schema como string JSON-LD pronta para <script>
 */
export function generateProductItemListSchemaString(
  products: ItemListProduct[],
  options: ItemListOptions = {}
): string {
  const schema = generateProductItemListSchema(products, options);
  
  if (!schema) return '';
  
  return JSON.stringify({
    '@context': 'https://schema.org',
    ...schema
  }, null, 2);
}
