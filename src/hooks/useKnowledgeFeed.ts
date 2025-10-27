import { useState, useEffect } from 'react';
import { useDebounceValue } from './useDebounceValue';

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

  // Debounce feedUrl and limit to prevent rapid fetches
  const debouncedFeedUrl = useDebounceValue(feedUrl, 500);
  const debouncedLimit = useDebounceValue(limit, 500);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${debouncedFeedUrl}?format=json&limit=${debouncedLimit}`);
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
    if (debouncedFeedUrl) fetchFeed();
  }, [debouncedFeedUrl, debouncedLimit]);

  return { articles, feedMeta, loading, error, refetch: fetchFeed };
};
