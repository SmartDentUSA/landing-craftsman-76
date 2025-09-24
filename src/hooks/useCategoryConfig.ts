import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CategoryConfig {
  id: string;
  category: string;
  subcategory: string;
  target_audience: string[];
  keywords: string[];
  market_keywords: string[];
  search_intent_keywords: string[];
  created_at: string;
  updated_at: string;
}

interface CreateCategoryConfig {
  category: string;
  subcategory: string;
  target_audience: string[];
  keywords: string[];
  market_keywords: string[];
  search_intent_keywords: string[];
}

export const useCategoryConfig = () => {
  const [configs, setConfigs] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories_config')
        .select('*')
        .order('category, subcategory');

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        target_audience: Array.isArray(item.target_audience) ? item.target_audience.map(String) : [],
        keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : [],
        market_keywords: Array.isArray(item.market_keywords) ? item.market_keywords.map(String) : [],
        search_intent_keywords: Array.isArray(item.search_intent_keywords) ? item.search_intent_keywords.map(String) : []
      }));

      setConfigs(formattedData);
    } catch (error) {
      console.error('Error fetching category configs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de categorias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createConfig = useCallback(async (config: CreateCategoryConfig) => {
    try {
      const { data, error } = await supabase
        .from('categories_config')
        .insert([config])
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        ...data,
        target_audience: Array.isArray(data.target_audience) ? data.target_audience.map(String) : [],
        keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        market_keywords: Array.isArray(data.market_keywords) ? data.market_keywords.map(String) : [],
        search_intent_keywords: Array.isArray(data.search_intent_keywords) ? data.search_intent_keywords.map(String) : []
      };
      
      setConfigs(prev => [...prev, formattedData]);
      
      toast({
        title: "Sucesso",
        description: "Configuração de categoria criada com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Error creating category config:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar configuração de categoria",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const updateConfig = useCallback(async (id: string, updates: Partial<CreateCategoryConfig>) => {
    try {
      const { data, error } = await supabase
        .from('categories_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        ...data,
        target_audience: Array.isArray(data.target_audience) ? data.target_audience.map(String) : [],
        keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        market_keywords: Array.isArray(data.market_keywords) ? data.market_keywords.map(String) : [],
        search_intent_keywords: Array.isArray(data.search_intent_keywords) ? data.search_intent_keywords.map(String) : []
      };
      
      setConfigs(prev => prev.map(config => 
        config.id === id ? { ...config, ...formattedData } : config
      ));

      toast({
        title: "Sucesso",
        description: "Configuração atualizada com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Error updating category config:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configuração",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.filter(config => config.id !== id));

      toast({
        title: "Sucesso",
        description: "Configuração excluída com sucesso"
      });
    } catch (error) {
      console.error('Error deleting category config:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir configuração",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const getConfigByCategory = useCallback((category: string, subcategory: string = '') => {
    // Primeiro tenta buscar a configuração exata (categoria + subcategoria)
    let config = configs.find(config => 
      config.category === category && config.subcategory === subcategory
    );
    
    // Se não encontrar e não foi especificada subcategoria, busca qualquer configuração da categoria
    if (!config && !subcategory) {
      config = configs.find(config => config.category === category);
    }
    
    // Se não encontrar configuração específica mas foi fornecida subcategoria, busca configuração geral da categoria
    if (!config && subcategory) {
      config = configs.find(config => config.category === category && !config.subcategory);
    }
    
    return config;
  }, [configs]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return {
    configs,
    loading,
    createConfig,
    updateConfig,
    deleteConfig,
    getConfigByCategory,
    refreshConfigs: fetchConfigs
  };
};