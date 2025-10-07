import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink } from 'lucide-react';
import { DOMAIN_CONFIGS } from '@/config/domain-config';

interface LandingPage {
  id: string;
  name: string;
  status: string;
}

interface RelatedLandingPagesListProps {
  productId: string;
  onInsert: (text: string) => void;
}

export const RelatedLandingPagesList: React.FC<RelatedLandingPagesListProps> = ({
  productId,
  onInsert
}) => {
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchLandingPages();
    }
  }, [productId]);

  const fetchLandingPages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('id, name, status, selected_product_ids')
        .eq('status', 'published');

      if (error) throw error;

      // Filtrar landing pages que contêm este produto
      const filtered = data.filter(lp => {
        const selectedIds = lp.selected_product_ids as string[] || [];
        return selectedIds.includes(productId);
      });

      setLandingPages(filtered);
    } catch (error) {
      console.error('Erro ao carregar landing pages:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as landing pages relacionadas.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = (lp: LandingPage) => {
    const url = `${DOMAIN_CONFIGS.dentala.BASE_URL}/${lp.id}`;
    const formattedText = `📄 ${lp.name}\n🔗 ${url}`;
    onInsert(formattedText);
    toast({
      title: "Landing Page Inserida!",
      description: "Link da landing page copiado para área de transferência."
    });
  };

  const handleOpen = (lp: LandingPage) => {
    const url = `${DOMAIN_CONFIGS.dentala.BASE_URL}/${lp.id}`;
    window.open(url, '_blank');
  };

  if (!productId) return null;

  if (isLoading) {
    return (
      <Card className="mt-3">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Carregando landing pages...</span>
        </CardContent>
      </Card>
    );
  }

  if (landingPages.length === 0) return null;

  return (
    <Card className="mt-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📄</span>
          <span>Landing Pages Relacionadas</span>
          <Badge variant="secondary">{landingPages.length} publicadas</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Landing pages que contêm este produto - divulgue nas mensagens
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {landingPages.map(lp => (
            <div key={lp.id} className="p-3 bg-background rounded border">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{lp.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link: /{lp.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOpen(lp)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleInsert(lp)}
                  >
                    Inserir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
