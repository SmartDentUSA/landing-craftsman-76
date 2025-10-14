import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompletionTracking {
  id: string;
  entity_id: string;
  completion_score: number;
  completion_status: 'complete' | 'good' | 'regular' | 'critical';
  score_details: {
    basic_info: { score: number; max: number };
    seo: { score: number; max: number };
    hero: { score: number; max: number };
    video: { score: number; max: number };
    solutions: { score: number; max: number };
    desktop_info: { score: number; max: number };
    resources: { score: number; max: number };
    advisory: { score: number; max: number };
    faq: { score: number; max: number };
    cta_final: { score: number; max: number };
    footer: { score: number; max: number };
    email: { score: number; max: number };
    linked_products: { count: number };
    has_blog: boolean;
  };
  missing_fields: string[];
  required_fields: string[];
  marked_complete: boolean;
  last_calculated_at: string;
}

export interface LandingPageWithCompletion {
  id: string;
  name: string;
  status: string;
  last_modified: Date;
  completion: CompletionTracking;
  selected_product_ids?: string[];
  blog_generated?: boolean;
  data?: any;
  template?: string;
  embed?: string;
}

export const useLandingPageCompletion = () => {
  const [data, setData] = useState<LandingPageWithCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    completion: 'all',
    activity: 'all',
    hasProducts: false,
    hasBlog: false,
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: lpData, error: lpError } = await supabase
        .from('landing_pages')
        .select('id, name, status, last_modified, selected_product_ids, blog_generated, data, template, embed')
        .order('last_modified', { ascending: false });

      if (lpError) throw lpError;

      const { data: completionData, error: completionError } = await supabase
        .from('content_completion_tracking')
        .select('*')
        .eq('entity_type', 'landing_page');

      if (completionError) throw completionError;

      const combined: LandingPageWithCompletion[] = lpData?.map(lp => {
        const rawCompletion = completionData?.find(c => c.entity_id === lp.id);
        const completion: CompletionTracking = rawCompletion 
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
          : createEmptyCompletion(lp.id);
        
        return {
          ...lp,
          last_modified: new Date(lp.last_modified),
          completion,
        };
      }) || [];

      setData(combined);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados de completude",
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
        .eq('entity_type', 'landing_page');

      if (error) throw error;

      toast({
        title: complete ? "Marcado como realizado" : "Desmarcado",
        description: complete 
          ? "Landing page marcada como concluída" 
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

  const filteredData = data.filter(lp => {
    if (filters.search && !lp.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    if (filters.status !== 'all' && lp.status !== filters.status) {
      return false;
    }

    if (filters.completion !== 'all' && lp.completion.completion_status !== filters.completion) {
      return false;
    }

    if (filters.activity !== 'all') {
      const daysSince = Math.floor((Date.now() - lp.last_modified.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.activity === 'week' && daysSince > 7) return false;
      if (filters.activity === 'stale_30' && daysSince <= 30) return false;
      if (filters.activity === 'stale_90' && daysSince <= 90) return false;
      if (filters.activity === 'abandoned' && daysSince <= 180) return false;
    }

    if (filters.hasProducts && (!lp.selected_product_ids || lp.selected_product_ids.length === 0)) {
      return false;
    }

    if (filters.hasBlog && !lp.blog_generated) {
      return false;
    }

    return true;
  });

  const stats = {
    total: data.length,
    complete: data.filter(lp => lp.completion.completion_status === 'complete').length,
    good: data.filter(lp => lp.completion.completion_status === 'good').length,
    regular: data.filter(lp => lp.completion.completion_status === 'regular').length,
    critical: data.filter(lp => lp.completion.completion_status === 'critical').length,
    stale_30: data.filter(lp => {
      const days = Math.floor((Date.now() - lp.last_modified.getTime()) / (1000 * 60 * 60 * 24));
      return days > 30;
    }).length,
    stale_90: data.filter(lp => {
      const days = Math.floor((Date.now() - lp.last_modified.getTime()) / (1000 * 60 * 60 * 24));
      return days > 90;
    }).length,
  };

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('lp_completion_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content_completion_tracking' }, 
        () => loadData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'landing_pages' }, 
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

function createEmptyCompletion(entityId: string): CompletionTracking {
  return {
    id: '',
    entity_id: entityId,
    completion_score: 0,
    completion_status: 'critical',
    score_details: {
      basic_info: { score: 0, max: 10 },
      seo: { score: 0, max: 20 },
      hero: { score: 0, max: 25 },
      video: { score: 0, max: 10 },
      solutions: { score: 0, max: 15 },
      desktop_info: { score: 0, max: 10 },
      resources: { score: 0, max: 20 },
      advisory: { score: 0, max: 10 },
      faq: { score: 0, max: 15 },
      cta_final: { score: 0, max: 10 },
      footer: { score: 0, max: 10 },
      email: { score: 0, max: 10 },
      linked_products: { count: 0 },
      has_blog: false,
    },
    missing_fields: [],
    required_fields: [],
    marked_complete: false,
    last_calculated_at: new Date().toISOString(),
  };
}
