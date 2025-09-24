import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTargetAudienceAggregator() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const aggregateTargetAudiences = async (): Promise<string> => {
    setLoading(true);
    try {
      // Buscar todas as configurações de categoria que têm público-alvo
      const { data: configs, error } = await supabase
        .from('categories_config')
        .select('target_audience')
        .not('target_audience', 'is', null);

      if (error) throw error;

      // Extrair e normalizar todos os públicos-alvo
      const allAudiences: string[] = [];
      
      configs?.forEach(config => {
        if (config.target_audience && Array.isArray(config.target_audience)) {
          config.target_audience.forEach((audience: string) => {
            if (audience && typeof audience === 'string') {
              const trimmed = audience.trim();
              if (trimmed) {
                allAudiences.push(trimmed);
              }
            }
          });
        }
      });

      // Remover duplicatas (ignorando case)
      const uniqueAudiences = Array.from(
        new Map(
          allAudiences.map(audience => [audience.toLowerCase(), audience])
        ).values()
      );

      // Ordenar alfabeticamente
      uniqueAudiences.sort((a, b) => a.localeCompare(b, 'pt-BR'));

      const result = uniqueAudiences.join(', ');
      
      toast({
        title: "Públicos-alvo capturados",
        description: `${uniqueAudiences.length} públicos únicos encontrados nas subcategorias`,
      });

      return result;
    } catch (error: any) {
      console.error('Error aggregating target audiences:', error);
      toast({
        title: "Erro ao capturar públicos",
        description: error.message || "Não foi possível capturar os públicos-alvo",
        variant: "destructive",
      });
      return '';
    } finally {
      setLoading(false);
    }
  };

  return {
    aggregateTargetAudiences,
    loading
  };
}