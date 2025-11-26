import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NPSGeneratedContent {
  id: string;
  user_id: string;
  action_type: 'landing-pages' | 'blog-topics' | 'product-mapping' | 'faqs';
  generated_data: any;
  applied: boolean;
  applied_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useNPSGeneratedContent = () => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<NPSGeneratedContent[]>([]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('nps_generated_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory((data as NPSGeneratedContent[]) || []);
    } catch (error) {
      console.error('Error loading NPS content history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const saveGenerated = async (
    actionType: NPSGeneratedContent['action_type'],
    generatedData: any
  ): Promise<string | null> => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        toast.error('Usuário não autenticado');
        return null;
      }

      const { data, error } = await supabase
        .from('nps_generated_content')
        .insert({
          user_id: userId,
          action_type: actionType,
          generated_data: generatedData,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Conteúdo salvo no histórico');
      await loadHistory();
      return data.id;
    } catch (error) {
      console.error('Error saving generated content:', error);
      toast.error('Erro ao salvar conteúdo');
      return null;
    }
  };

  const markAsApplied = async (id: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('nps_generated_content')
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
          notes,
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Marcado como aplicado');
      await loadHistory();
    } catch (error) {
      console.error('Error marking as applied:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('nps_generated_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Conteúdo removido');
      await loadHistory();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Erro ao remover conteúdo');
    }
  };

  return {
    loading,
    history,
    loadHistory,
    saveGenerated,
    markAsApplied,
    deleteContent,
  };
};
