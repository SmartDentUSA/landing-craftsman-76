import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PromptConfiguration {
  id: string;
  edge_function_id: string;
  prompt_name: string;
  custom_prompt: string;
  selected_data_sources: string[];
  selected_fields: Record<string, string[]>;
  use_intelligent_links?: boolean;
  created_at: string;
  updated_at: string;
}

export const usePromptsConfiguration = () => {
  const [configurations, setConfigurations] = useState<PromptConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadConfigurations = async (edgeFunctionId?: string) => {
    if (loading) return; // Evita múltiplas chamadas simultâneas
    
    setLoading(true);
    try {
      let query = supabase.from('prompts_configuration').select('*');
      
      if (edgeFunctionId) {
        query = query.eq('edge_function_id', edgeFunctionId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const processedData = (data || []).map(item => ({
        ...item,
        selected_data_sources: Array.isArray(item.selected_data_sources) 
          ? item.selected_data_sources.filter((s): s is string => typeof s === 'string')
          : [],
        selected_fields: typeof item.selected_fields === 'object' && item.selected_fields !== null && !Array.isArray(item.selected_fields)
          ? Object.fromEntries(
              Object.entries(item.selected_fields).map(([key, value]) => [
                key, 
                Array.isArray(value) 
                  ? value.filter((v): v is string => typeof v === 'string')
                  : []
              ])
            )
          : {}
      }));
      
      setConfigurations(processedData);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações de prompts.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async (
    edgeFunctionId: string,
    promptName: string,
    customPrompt: string,
    selectedDataSources: string[],
    selectedFields: Record<string, string[]>,
    useIntelligentLinks?: boolean
  ) => {
    try {
      const configData: any = {
        edge_function_id: edgeFunctionId,
        prompt_name: promptName,
        custom_prompt: customPrompt,
        selected_data_sources: selectedDataSources,
        selected_fields: selectedFields
      };

      if (useIntelligentLinks !== undefined) {
        configData.use_intelligent_links = useIntelligentLinks;
      }

      const { error } = await supabase
        .from('prompts_configuration')
        .upsert(configData, {
          onConflict: 'edge_function_id,prompt_name'
        });

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "A configuração do prompt foi salva com sucesso.",
      });

      // Recarregar apenas todas as configurações para evitar loops
      await loadConfigurations();
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      console.error('Detalhes do erro ao salvar:', error);
      
      toast({
        title: "Erro ao salvar",
        description: `Falha ao salvar a configuração: ${errorMessage}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteConfiguration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompts_configuration')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuração removida",
        description: "A configuração foi removida com sucesso.",
      });

      // Atualizar lista local
      setConfigurations(prev => prev.filter(config => config.id !== id));
      
      return true;
    } catch (error) {
      console.error('Erro ao deletar configuração:', error);
      toast({
        title: "Erro ao remover",
        description: "Ocorreu um erro ao remover a configuração.",
        variant: "destructive"
      });
      return false;
    }
  };

  const getConfigurationByFunction = useCallback((edgeFunctionId: string, promptName: string) => {
    return configurations.find(
      config => config.edge_function_id === edgeFunctionId && config.prompt_name === promptName
    );
  }, [configurations]);

  useEffect(() => {
    loadConfigurations();
  }, []);

  return {
    configurations,
    loading,
    loadConfigurations,
    saveConfiguration,
    deleteConfiguration,
    getConfigurationByFunction
  };
};