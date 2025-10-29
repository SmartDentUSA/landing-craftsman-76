import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SpinSellingSolution {
  id: string;
  title: string;
  pain_type: 'delivery_speed' | 'competitive_edge' | 'patient_loss' | 'training_fear' | 'high_lab_costs' | 'lab_dependency' | 'financial_roi' | 'quality_durability';
  priority: number;
  frequency?: string;
  product_ids: string[];
  real_quotes: Array<{
    quote: string;
    timestamp: string;
    speaker?: string;
  }>;
  pain_metrics: {
    [key: string]: string;
  };
  google_ads_headline?: string;
  whatsapp_hook?: string;
  storytelling_hook?: string;
  case_study_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSpinSellingSolutions() {
  const queryClient = useQueryClient();

  // READ - Buscar todas soluções
  const { data: solutions, isLoading } = useQuery({
    queryKey: ['spin-selling-solutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as SpinSellingSolution[];
    }
  });

  // CREATE - Criar nova solução
  const createSolution = useMutation({
    mutationFn: async (newSolution: Omit<SpinSellingSolution, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .insert([newSolution as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-selling-solutions'] });
      toast({
        title: "Sucesso!",
        description: "Solução SPIN criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // UPDATE - Atualizar solução
  const updateSolution = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SpinSellingSolution> }) => {
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-selling-solutions'] });
      toast({
        title: "Sucesso!",
        description: "Solução atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // DELETE - Excluir solução
  const deleteSolution = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spin_selling_solutions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-selling-solutions'] });
      toast({
        title: "Sucesso!",
        description: "Solução excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    solutions,
    isLoading,
    createSolution,
    updateSolution,
    deleteSolution
  };
}
