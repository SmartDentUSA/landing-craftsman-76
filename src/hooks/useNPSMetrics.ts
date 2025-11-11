import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NPSMetrics {
  enabled: boolean;
  aggregate_rating: number;
  total_responses: number;
  unique_respondents: number;
  satisfaction_score: number;
  recommendation_score: number;
  training_quality_score: number;
  nps_score: number;
  promoters_percentage: number;
  passives_percentage: number;
  detractors_percentage: number;
  interest_themes: Record<string, { count: number; percentage: number }>;
  insights: {
    common_themes: string[];
    top_keywords: string[];
    content_opportunities: string[];
    product_correlations: string[][];
  };
  last_updated: string;
}

export const useNPSMetrics = () => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadNPSMetrics = async (): Promise<NPSMetrics | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('company_profile')
        .select('nps_metrics')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) {
        console.error('Error loading NPS metrics:', error);
        return null;
      }

      return (data?.nps_metrics as unknown) as NPSMetrics | null;
    } catch (error) {
      console.error('Error in loadNPSMetrics:', error);
      toast.error('Erro ao carregar métricas NPS');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const processNPSFile = async (file: File): Promise<boolean> => {
    try {
      setProcessing(true);
      toast.info('Processando arquivo NPS... Isso pode levar alguns segundos.');

      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('process-nps-csv', {
        body: formData,
      });

      if (error) {
        console.error('Error processing NPS file:', error);
        toast.error('Erro ao processar arquivo NPS');
        return false;
      }

      toast.success(`NPS processado com sucesso! ${data.metrics.total_responses} respostas analisadas.`);
      return true;
    } catch (error) {
      console.error('Error in processNPSFile:', error);
      toast.error('Erro ao processar arquivo NPS');
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const generateContentFromInterests = async (action: string): Promise<any> => {
    try {
      toast.info('Gerando conteúdo baseado nos interesses dos clientes...');

      const { data, error } = await supabase.functions.invoke('generate-content-from-interests', {
        body: { action },
      });

      if (error) {
        console.error('Error generating content:', error);
        toast.error('Erro ao gerar conteúdo');
        return null;
      }

      toast.success('Conteúdo gerado com sucesso!');
      return data.data;
    } catch (error) {
      console.error('Error in generateContentFromInterests:', error);
      toast.error('Erro ao gerar conteúdo');
      return null;
    }
  };

  return {
    loading,
    processing,
    loadNPSMetrics,
    processNPSFile,
    generateContentFromInterests,
  };
};
