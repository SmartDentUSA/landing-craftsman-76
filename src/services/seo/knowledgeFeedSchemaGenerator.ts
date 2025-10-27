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
  image_url: string | { src: string; alt?: string; mode?: string; scale?: number };
  published_at: string;
  updated_at?: string;
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
      itemListElement: limitedArticles.map((article, index) => {
        // Extrair URL da imagem (suporta string ou objeto)
        const imageUrl = typeof article.image_url === 'string' 
          ? article.image_url 
          : article.image_url?.src || '';
        
        const baseUrl = feedUrl.split('/blog')[0] || feedUrl.split('/base-conhecimento')[0];

        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'BlogPosting',
            '@id': article.url,
            headline: article.title,
            description: article.excerpt,
            url: article.url,
            image: imageUrl ? {
              '@type': 'ImageObject',
              url: imageUrl,
              width: 1200,
              height: 630
            } : undefined,
            datePublished: article.published_at,
            dateModified: article.updated_at || article.published_at,
            keywords: article.keywords?.length > 0 
              ? article.keywords.join(', ') 
              : article.category?.name || '',
            inLanguage: 'pt-BR',
            isAccessibleForFree: true,
            author: {
              '@type': 'Organization',
              name: companyName,
              url: baseUrl
            },
            publisher: {
              '@type': 'Organization',
              name: companyName,
              url: baseUrl,
              logo: {
                '@type': 'ImageObject',
                url: `${baseUrl}/logo.png`,
                width: 600,
                height: 60
              }
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': article.url,
              url: article.url,
              name: article.title
            },
            articleSection: article.category?.name || 'Geral',
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Início',
                  item: baseUrl
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Blog',
                  item: feedUrl
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: article.category?.name || 'Geral',
                  item: `${feedUrl}?category=${article.category?.letter || ''}`
                }
              ]
            }
          }
        };
      })
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
