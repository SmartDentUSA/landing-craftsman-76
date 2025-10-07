import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink } from 'lucide-react';

interface ResourceCTA {
  label: string;
  url: string;
  visible: boolean;
}

interface ResourceDescriptions {
  cta1?: string;
  cta2?: string;
  cta3?: string;
}

interface ProductResourceCTAsListProps {
  productId: string;
  onInsert: (text: string) => void;
}

export const ProductResourceCTAsList: React.FC<ProductResourceCTAsListProps> = ({
  productId,
  onInsert
}) => {
  const [ctas, setCtas] = useState<Array<{ cta: ResourceCTA; description: string; number: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchCTAs();
    }
  }, [productId]);

  const fetchCTAs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('resource_cta1, resource_cta2, resource_cta3, resource_descriptions')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const ctaList: Array<{ cta: ResourceCTA; description: string; number: number }> = [];
      const descriptions = (data.resource_descriptions as ResourceDescriptions) || {};

      if (data.resource_cta1 && typeof data.resource_cta1 === 'object') {
        const cta1 = data.resource_cta1 as any;
        if (cta1.visible) {
          ctaList.push({
            cta: cta1 as ResourceCTA,
            description: descriptions.cta1 || '',
            number: 1
          });
        }
      }
      if (data.resource_cta2 && typeof data.resource_cta2 === 'object') {
        const cta2 = data.resource_cta2 as any;
        if (cta2.visible) {
          ctaList.push({
            cta: cta2 as ResourceCTA,
            description: descriptions.cta2 || '',
            number: 2
          });
        }
      }
      if (data.resource_cta3 && typeof data.resource_cta3 === 'object') {
        const cta3 = data.resource_cta3 as any;
        if (cta3.visible) {
          ctaList.push({
            cta: cta3 as ResourceCTA,
            description: descriptions.cta3 || '',
            number: 3
          });
        }
      }

      setCtas(ctaList);
    } catch (error) {
      console.error('Erro ao carregar CTAs de recursos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os CTAs de recursos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = (cta: ResourceCTA, description: string) => {
    const formattedText = `${cta.label}\n🔗 ${cta.url}${description ? `\n\n${description}` : ''}`;
    onInsert(formattedText);
    toast({
      title: "CTA Inserido!",
      description: "Link do recurso copiado para área de transferência."
    });
  };

  if (!productId) return null;

  if (isLoading) {
    return (
      <Card className="mt-3">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Carregando CTAs...</span>
        </CardContent>
      </Card>
    );
  }

  if (ctas.length === 0) return null;

  return (
    <Card className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔗</span>
          <span>Botões CTA para Recursos</span>
          <Badge variant="secondary">{ctas.length} disponíveis</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          E-books, artigos e recursos disponíveis para inserir nos conteúdos
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ctas.map(({ cta, description, number }) => (
            <div key={number} className="p-3 bg-background rounded border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{cta.label}</p>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                  <a 
                    href={cta.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    {cta.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleInsert(cta, description)}
                >
                  Inserir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
