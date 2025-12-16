import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ForbiddenProduct {
  product_name: string;
  reason: string;
}

interface RequiredProduct {
  product_name: string;
  context: string;
}

interface AntiHallucinationRules {
  never_claim: string[];
  never_mix_with: string[];
  never_use_in_stages: string[];
  always_require: string[];
  always_explain: string[];
}

interface WorkflowStage {
  applicable: boolean;
  role: 'principal' | 'acessorio' | 'consumivel' | null;
  description: string;
  pain_points_addressed: string[];
  competitive_advantages: string[];
}

interface ClinicalBrainGenerated {
  product_type: string;
  workflow_stages: Record<string, WorkflowStage>;
  forbidden_products: ForbiddenProduct[];
  required_products: RequiredProduct[];
  anti_hallucination_rules: AntiHallucinationRules;
}

interface GenerateResponse {
  success: boolean;
  generated?: ClinicalBrainGenerated;
  confidence_score?: number;
  reasoning?: string;
  error?: string;
}

export function useClinicalBrainGenerator() {
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const generate = async (productId: string, forceRegenerate = false): Promise<GenerateResponse | null> => {
    if (!productId) {
      toast({
        title: 'Erro',
        description: 'ID do produto não fornecido',
        variant: 'destructive',
      });
      return null;
    }

    setGenerating(true);
    try {
      console.log('🧠 [Clinical Brain] Iniciando geração...');
      
      const { data, error } = await supabase.functions.invoke('generate-clinical-brain', {
        body: { productId, forceRegenerate }
      });

      if (error) {
        console.error('❌ [Clinical Brain] Erro:', error);
        toast({
          title: 'Erro ao gerar Clinical Brain',
          description: error.message || 'Erro desconhecido',
          variant: 'destructive',
        });
        return null;
      }

      if (!data.success) {
        toast({
          title: 'Erro',
          description: data.error || 'Falha na geração',
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: '✅ Clinical Brain Gerado',
        description: `Confiança: ${Math.round((data.confidence_score || 0) * 100)}% — Aguardando revisão`,
      });

      return data;
    } catch (err) {
      console.error('❌ [Clinical Brain] Exceção:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao comunicar com o servidor',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const validate = async (
    productId: string, 
    validatorName: string, 
    notes?: string
  ): Promise<boolean> => {
    if (!productId || !validatorName) {
      toast({
        title: 'Erro',
        description: 'Dados de validação incompletos',
        variant: 'destructive',
      });
      return false;
    }

    setValidating(true);
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({
          clinical_brain_status: 'validated',
          clinical_brain_validated_at: new Date().toISOString(),
          clinical_brain_validator_name: validatorName,
          clinical_brain_validation_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        toast({
          title: 'Erro ao validar',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: '✅ Clinical Brain Validado',
        description: `Validado por ${validatorName}`,
      });

      return true;
    } catch (err) {
      console.error('❌ [Clinical Brain] Erro na validação:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao validar',
        variant: 'destructive',
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const resetStatus = async (productId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({
          clinical_brain_status: 'empty',
          clinical_brain_generated_at: null,
          clinical_brain_validated_at: null,
          clinical_brain_validator_name: null,
          clinical_brain_validation_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        toast({
          title: 'Erro ao resetar',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Status resetado',
        description: 'Clinical Brain marcado como não configurado',
      });

      return true;
    } catch (err) {
      console.error('❌ [Clinical Brain] Erro ao resetar:', err);
      return false;
    }
  };

  return {
    generate,
    validate,
    resetStatus,
    generating,
    validating,
  };
}
