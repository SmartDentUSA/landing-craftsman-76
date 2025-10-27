import { useState, useEffect } from 'react';

interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: { name: string; letter: string };
  url: string;
  image_url: string;
  published_at: string;
  keywords: string[];
}

interface FeedMeta {
  title: string;
  link: string;
  description: string;
  updated_at: string;
}

export const useKnowledgeFeed = (feedUrl: string, limit: number = 12) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [feedMeta, setFeedMeta] = useState<FeedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${feedUrl}?format=json&limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setFeedMeta(data.feed);
      setArticles(data.items || []);
    } catch (err) {
      setError('Erro ao carregar artigos');
      console.error('useKnowledgeFeed error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (feedUrl) fetchFeed();
  }, [feedUrl, limit]);

  return { articles, feedMeta, loading, error, refetch: fetchFeed };
};
