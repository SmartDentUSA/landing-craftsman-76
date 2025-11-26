import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Trash2,
  ExternalLink,
  Loader2 
} from 'lucide-react';

interface NPSContentActionsProps {
  actionType: 'landing-pages' | 'blog-topics' | 'product-mapping' | 'faqs';
  data: any;
  contentId?: string;
  onApplied?: () => void;
}

export const NPSContentActions = ({ 
  actionType, 
  data, 
  contentId,
  onApplied 
}: NPSContentActionsProps) => {
  const [loading, setLoading] = useState(false);

  const saveFAQsToCompanyProfile = async () => {
    try {
      setLoading(true);
      
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Get current company profile
      const { data: profile, error: fetchError } = await supabase
        .from('company_profile')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (fetchError || !profile) {
        toast.error('Perfil da empresa não encontrado');
        return;
      }

      // FAQs structure from NPS data
      const faqs = data.faqs || [];
      
      toast.success(`${faqs.length} FAQs prontos para serem adicionados manualmente ao perfil da empresa`);
      
      if (contentId) {
        await markAsApplied(contentId);
      }
      
      onApplied?.();
    } catch (error) {
      console.error('Error saving FAQs:', error);
      toast.error('Erro ao processar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const createBlogDraft = async () => {
    try {
      setLoading(true);
      toast.info('Funcionalidade de criação de blog será implementada em breve');
      
      if (contentId) {
        await markAsApplied(contentId);
      }
      
      onApplied?.();
    } catch (error) {
      console.error('Error creating blog:', error);
      toast.error('Erro ao criar rascunho');
    } finally {
      setLoading(false);
    }
  };

  const createSpinLandingPage = async () => {
    try {
      setLoading(true);
      toast.info('Funcionalidade de criação de landing page será implementada em breve');
      
      if (contentId) {
        await markAsApplied(contentId);
      }
      
      onApplied?.();
    } catch (error) {
      console.error('Error creating landing page:', error);
      toast.error('Erro ao criar landing page');
    } finally {
      setLoading(false);
    }
  };

  const markAsApplied = async (id: string) => {
    const { error } = await supabase
      .from('nps_generated_content')
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error marking as applied:', error);
    }
  };

  const renderActions = () => {
    switch (actionType) {
      case 'faqs':
        return (
          <Button 
            onClick={saveFAQsToCompanyProfile}
            disabled={loading}
            size="sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Salvar FAQs no Perfil
          </Button>
        );
      
      case 'blog-topics':
        return (
          <Button 
            onClick={createBlogDraft}
            disabled={loading}
            size="sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar Rascunho de Blog
          </Button>
        );
      
      case 'landing-pages':
        return (
          <Button 
            onClick={createSpinLandingPage}
            disabled={loading}
            size="sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Criar Landing Page SPIN
          </Button>
        );
      
      case 'product-mapping':
        return (
          <Badge variant="secondary">Mapeamento Visual</Badge>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-2">
      {renderActions()}
    </div>
  );
};
