import { useState, useEffect, useCallback } from 'react';
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

  const fetchFeed = useCallback(async () => {
    if (!debouncedFeedUrl) return;
    
    try {
      setLoading(true);
      setError(null);

      // Cache-busting e headers no-cache
      const timestamp = Date.now();
      const url = `${debouncedFeedUrl}?format=json&limit=${debouncedLimit}&_t=${timestamp}`;
      
      console.log('🔄 [useKnowledgeFeed] Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      // Log dos dados recebidos para debug
      console.log('📦 [useKnowledgeFeed] Dados recebidos:', {
        total: data.items?.length || 0,
        firstTitle: data.items?.[0]?.title || 'N/A',
        feedUpdated: data.feed?.updated_at || 'N/A'
      });
      
      setFeedMeta(data.feed);
      setArticles(data.items || []);
      
      console.log(`✅ [useKnowledgeFeed] ${data.items?.length || 0} artigos carregados`);
    } catch (err) {
      setError('Erro ao carregar artigos');
      console.error('❌ [useKnowledgeFeed] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedFeedUrl, debouncedLimit]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { articles, feedMeta, loading, error, refetch: fetchFeed };
};
