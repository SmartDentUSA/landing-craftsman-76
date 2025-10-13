import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Keyword {
  id: string;
  name: string; // MANTIDO: backward compatibility
  url: string;
  category: string;
  subcategory?: string;
  description?: string;
  keyword_type?: 'primary' | 'secondary' | 'long_tail' | 'negative';
  search_intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  monthly_searches?: number;
  competition_level?: 'low' | 'medium' | 'high';
  cpc_estimate?: number;
  relevance_score?: number;
  usage_count?: number;
  last_used_at?: string;
  ai_generated?: boolean;
  approved: boolean;
  created_at: string;
  updated_at: string;
  source_products?: string[];
  related_keywords?: string[];
}

export interface UseKeywordsRepositoryReturn {
  keywords: Keyword[];
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  addKeyword: (keyword: Omit<Keyword, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => Promise<Keyword | null>;
  updateKeyword: (id: string, updates: Partial<Keyword>) => Promise<boolean>;
  deleteKeyword: (id: string) => Promise<boolean>;
  
  // Bulk operations
  consolidateKeywords: (dryRun?: boolean) => Promise<any>;
  
  // Search and filter
  searchKeywords: (query: string) => Keyword[];
  getKeywordsByType: (type: string) => Keyword[];
  getKeywordsByCategory: (category: string, subcategory?: string) => Keyword[];
  
  // Usage tracking
  incrementUsage: (id: string) => Promise<void>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useKeywordsRepository(): UseKeywordsRepositoryReturn {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadKeywords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('external_links')
        .select('*')
        .order('keyword', { ascending: true });

      if (fetchError) throw fetchError;

      setKeywords((data || []) as unknown as Keyword[]);
    } catch (err: any) {
      console.error('Erro ao carregar keywords:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar keywords',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  const addKeyword = useCallback(async (keyword: Omit<Keyword, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('external_links')
        .insert([keyword as any])
        .select()
        .single();

      if (insertError) throw insertError;

      setKeywords(prev => [...prev, data as unknown as Keyword]);
      toast({
        title: 'Keyword adicionada',
        description: `"${(data as unknown as Keyword).name}" foi adicionada com sucesso.`
      });

      return data as unknown as Keyword;
    } catch (err: any) {
      console.error('Erro ao adicionar keyword:', err);
      toast({
        title: 'Erro ao adicionar keyword',
        description: err.message,
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const updateKeyword = useCallback(async (id: string, updates: Partial<Keyword>) => {
    try {
      const { error: updateError } = await supabase
        .from('external_links')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setKeywords(prev => prev.map(kw => kw.id === id ? { ...kw, ...updates } : kw));
      toast({
        title: 'Keyword atualizada',
        description: 'Alterações salvas com sucesso.'
      });

      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar keyword:', err);
      toast({
        title: 'Erro ao atualizar keyword',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const deleteKeyword = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('external_links')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setKeywords(prev => prev.filter(kw => kw.id !== id));
      toast({
        title: 'Keyword removida',
        description: 'Keyword deletada com sucesso.'
      });

      return true;
    } catch (err: any) {
      console.error('Erro ao deletar keyword:', err);
      toast({
        title: 'Erro ao deletar keyword',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const consolidateKeywords = useCallback(async (dryRun = false) => {
    try {
      toast({
        title: 'Consolidando keywords...',
        description: 'Aguarde enquanto processamos os dados.'
      });

      const { data, error } = await supabase.functions.invoke('consolidate-keywords', {
        body: { dryRun }
      });

      if (error) throw error;

      toast({
        title: 'Consolidação concluída',
        description: `${data.stats.keywords_deduplicated} keywords deduplicadas, ${data.stats.products_synced} produtos sincronizados.`
      });

      await loadKeywords();
      return data;
    } catch (err: any) {
      console.error('Erro na consolidação:', err);
      toast({
        title: 'Erro na consolidação',
        description: err.message,
        variant: 'destructive'
      });
      return null;
    }
  }, [toast, loadKeywords]);

  const searchKeywords = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return keywords.filter(kw =>
      kw.name.toLowerCase().includes(lowerQuery) ||
      kw.description?.toLowerCase().includes(lowerQuery) ||
      kw.category.toLowerCase().includes(lowerQuery)
    );
  }, [keywords]);

  const getKeywordsByType = useCallback((type: string) => {
    return keywords.filter(kw => kw.keyword_type === type);
  }, [keywords]);

  const getKeywordsByCategory = useCallback((category: string, subcategory?: string) => {
    return keywords.filter(kw => {
      if (subcategory) {
        return kw.category === category && kw.subcategory === subcategory;
      }
      return kw.category === category;
    });
  }, [keywords]);

  const incrementUsage = useCallback(async (id: string) => {
    const keyword = keywords.find(kw => kw.id === id);
    if (!keyword) return;

    await supabase
      .from('external_links')
      .update({
        usage_count: (keyword.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      } as any)
      .eq('id', id);
  }, [keywords]);

  return {
    keywords,
    isLoading,
    error,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    consolidateKeywords,
    searchKeywords,
    getKeywordsByType,
    getKeywordsByCategory,
    incrementUsage,
    refresh: loadKeywords
  };
}
