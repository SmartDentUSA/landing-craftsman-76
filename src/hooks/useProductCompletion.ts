import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductCompletionTracking {
  id: string;
  entity_id: string;
  completion_score: number;
  completion_status: 'complete' | 'good' | 'regular' | 'critical';
  score_details: {
    basic_info: { score: number; max: number };
    seo_categories: { score: number; max: number };
    keywords_audience: { score: number; max: number };
    images_gallery: { score: number; max: number };
    technical_specs: { score: number; max: number };
    ai_content: { score: number; max: number };
    videos: { score: number; max: number };
    ctas_resources: { score: number; max: number };
    google_merchant: { score: number; max: number };
  };
  missing_fields: string[];
  required_fields: string[];
  marked_complete: boolean;
  last_calculated_at: string;
}

export interface ProductWithCompletion {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  updated_at: Date;
  completion: ProductCompletionTracking;
  price: number | null;
  image_url: string | null;
}

export const useProductCompletion = () => {
  const [data, setData] = useState<ProductWithCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    completion: 'all',
    activity: 'all',
    hasVideos: false,
    seoOptimized: false,
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: productsData, error: productsError } = await supabase
        .from('products_repository')
        .select('id, name, category, subcategory, updated_at, price, image_url')
        .eq('approved', true)
        .order('updated_at', { ascending: false });

      if (productsError) throw productsError;

      const { data: completionData, error: completionError } = await supabase
        .from('content_completion_tracking')
        .select('*')
        .eq('entity_type', 'product');

      if (completionError) throw completionError;

      const combined: ProductWithCompletion[] = productsData?.map(product => {
        const rawCompletion = completionData?.find(c => c.entity_id === product.id);
        const completion: ProductCompletionTracking = rawCompletion 
          ? {
              id: rawCompletion.id,
              entity_id: rawCompletion.entity_id,
              completion_score: rawCompletion.completion_score,
              completion_status: rawCompletion.completion_status as 'complete' | 'good' | 'regular' | 'critical',
              score_details: rawCompletion.score_details as any,
              missing_fields: rawCompletion.missing_fields || [],
              required_fields: rawCompletion.required_fields || [],
              marked_complete: rawCompletion.marked_complete || false,
              last_calculated_at: rawCompletion.last_calculated_at,
            }
          : createEmptyCompletion(product.id);
        
        return {
          ...product,
          updated_at: new Date(product.updated_at),
          completion,
        };
      }) || [];

      setData(combined);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados de produtos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const markAsComplete = useCallback(async (entityId: string, complete: boolean) => {
    try {
      const { error } = await supabase
        .from('content_completion_tracking')
        .update({
          marked_complete: complete,
          marked_complete_at: complete ? new Date().toISOString() : null,
        })
        .eq('entity_id', entityId)
        .eq('entity_type', 'product');

      if (error) throw error;

      toast({
        title: complete ? "Marcado como realizado" : "Desmarcado",
        description: complete 
          ? "Produto marcado como concluído" 
          : "Marcação removida",
      });

      await loadData();
    } catch (error) {
      console.error('Erro ao marcar:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status",
        variant: "destructive"
      });
    }
  }, [loadData, toast]);

  const filteredData = data.filter(product => {
    if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    if (filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }

    if (filters.completion !== 'all' && product.completion.completion_status !== filters.completion) {
      return false;
    }

    if (filters.activity !== 'all') {
      const daysSince = Math.floor((Date.now() - product.updated_at.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.activity === 'week' && daysSince > 7) return false;
      if (filters.activity === 'stale_30' && daysSince <= 30) return false;
      if (filters.activity === 'stale_90' && daysSince <= 90) return false;
      if (filters.activity === 'abandoned' && daysSince <= 180) return false;
    }

    if (filters.hasVideos) {
      const hasAnyVideo = 
        product.completion.score_details.videos.score > 0;
      if (!hasAnyVideo) return false;
    }

    if (filters.seoOptimized) {
      const seoScore = product.completion.score_details.seo_categories.score;
      const seoMax = product.completion.score_details.seo_categories.max;
      const seoPercentage = (seoScore / seoMax) * 100;
      if (seoPercentage < 80) return false;
    }

    return true;
  });

  const stats = {
    total: data.length,
    complete: data.filter(p => p.completion.completion_status === 'complete').length,
    good: data.filter(p => p.completion.completion_status === 'good').length,
    regular: data.filter(p => p.completion.completion_status === 'regular').length,
    critical: data.filter(p => p.completion.completion_status === 'critical').length,
    stale_30: data.filter(p => {
      const days = Math.floor((Date.now() - p.updated_at.getTime()) / (1000 * 60 * 60 * 24));
      return days > 30;
    }).length,
    stale_90: data.filter(p => {
      const days = Math.floor((Date.now() - p.updated_at.getTime()) / (1000 * 60 * 60 * 24));
      return days > 90;
    }).length,
  };

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('product_completion_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content_completion_tracking' }, 
        () => loadData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products_repository' }, 
        () => loadData()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  return {
    data: filteredData,
    isLoading,
    filters,
    setFilters,
    stats,
    markAsComplete,
    refresh: loadData,
  };
};

function createEmptyCompletion(entityId: string): ProductCompletionTracking {
  return {
    id: '',
    entity_id: entityId,
    completion_score: 0,
    completion_status: 'critical',
    score_details: {
      basic_info: { score: 0, max: 15 },
      seo_categories: { score: 0, max: 20 },
      keywords_audience: { score: 0, max: 15 },
      images_gallery: { score: 0, max: 15 },
      technical_specs: { score: 0, max: 15 },
      ai_content: { score: 0, max: 20 },
      videos: { score: 0, max: 15 },
      ctas_resources: { score: 0, max: 10 },
      google_merchant: { score: 0, max: 10 },
    },
    missing_fields: [],
    required_fields: [],
    marked_complete: false,
    last_calculated_at: new Date().toISOString(),
  };
}
