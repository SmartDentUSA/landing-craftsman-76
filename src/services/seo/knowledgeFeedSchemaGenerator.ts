/**
 * Gerador de Schema.org para Knowledge Feed (Blog Articles)
 * Implementa ItemList + BlogPosting para SEO avançado
 */

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  url: string;
  image_url: string;
  published_at: string;
  keywords: string[];
  category: { name: string; letter: string };
}

export function generateKnowledgeFeedSchema(
  articles: KnowledgeArticle[],
  feedUrl: string,
  companyName: string
): string {
  if (!articles || articles.length === 0) {
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': [] });
  }

  // Limitar a 10 artigos para não sobrecarregar o schema
  const limitedArticles = articles.slice(0, 10);

  const schemas: any[] = [
    {
      '@type': 'ItemList',
      name: 'Artigos do Blog',
      description: 'Últimos artigos publicados',
      numberOfItems: limitedArticles.length,
      url: feedUrl,
      itemListElement: limitedArticles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          '@id': article.url,
          headline: article.title,
          description: article.excerpt,
          url: article.url,
          image: article.image_url,
          datePublished: article.published_at,
          keywords: article.keywords?.join(', ') || '',
          author: {
            '@type': 'Organization',
            name: companyName
          },
          publisher: {
            '@type': 'Organization',
            name: companyName
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': article.url
          },
          articleSection: article.category?.name || 'Geral'
        }
      }))
    }
  ];

  // Adicionar BreadcrumbList para navegação
  schemas.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: feedUrl.split('/blog')[0]
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: feedUrl
      }
    ]
  });

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemas
  }, null, 2);
}

/**
 * Extrai top keywords de artigos para SEO
 */
export function extractTopKeywords(articles: KnowledgeArticle[], limit: number = 10): string[] {
  const allKeywords = articles.flatMap(article => article.keywords || []);
  
  // Contar frequência de keywords
  const keywordCount = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Ordenar por frequência e retornar top N
  return Object.entries(keywordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([keyword]) => keyword);
}
