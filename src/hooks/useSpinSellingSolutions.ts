import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SuccessCase {
  client_name: string;
  specialty: string;
  area: string;
  city: string;
  state: string;
  instagram: string;
  clinic_name?: string;
  usage_time?: string;
  results_achieved: string;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  ddd?: string;
  client_photo?: {
    src: string;
    supabase_path: string;
    uploaded_at: string;
    alt: string;
  } | null;
}

export interface SpinJourneyQuote {
  client_name: string;
  desire: string;
  pain: string;
  expected_result: string;
}

export interface CustomURL {
  url: string;
  enabled: boolean;
  label: string;
  type?: 'manual' | 'landing_page';
  landing_page_id?: string;
}

export interface GoogleAdsCampaign {
  csv: string;
  config: any;
  keywords: string[];
  warnings: string[];
  generated_at: string;
}

export interface WhatsAppSectionTitles {
  journey_title: string;
  journey_subtitle?: string | null;
  metrics_title: string;
  metrics_subtitle?: string | null;
}

export interface SpinJourneyLabels {
  desire_label: string;
  pain_label: string;
  result_label: string;
}

export interface SpinFAQ {
  question: string;
  answer: string;
}

export interface CustomMetric {
  label: string;      // "Redução de Tempo"
  value: number;      // 12
  unit: string;       // "minutos"
}

export interface SpinSellingSolution {
  id: string;
  title: string;
  pain_type: 'delivery_speed' | 'competitive_edge' | 'patient_loss' | 
             'training_fear' | 'high_lab_costs' | 'lab_dependency' | 
             'financial_roi' | 'quality_durability';
  priority: number;
  frequency?: string;
  product_ids: string[];
  
  // ✅ CAMPOS PREENCHIDOS MANUALMENTE PELO USUÁRIO
  success_cases: SuccessCase[];
  real_quotes: SpinJourneyQuote[];
  pain_metrics: { [key: string]: string | CustomMetric };
  custom_url?: CustomURL;
  sales_pitch?: string;
  faq?: SpinFAQ[];
  
  // ✅ PERSONALIZAÇÃO DE TEXTOS WHATSAPP
  whatsapp_section_titles?: WhatsAppSectionTitles;
  spin_journey_labels?: SpinJourneyLabels;
  
  // ⚡ CAMPOS GERADOS PELA IA (apenas quando o usuário clica)
  google_ads_campaign?: GoogleAdsCampaign;
  whatsapp_complete_message?: string;
  storytelling_auto_generated?: string;
  landing_page_html?: string;
  landing_page_generated_at?: string;
  ai_generated_images?: any;
  
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
      return data as unknown as SpinSellingSolution[];
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
        .update(updates as any)
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
