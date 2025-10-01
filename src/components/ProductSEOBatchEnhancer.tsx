import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BatchResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  details: Array<{
    id: string;
    name: string;
    status: 'success' | 'failed' | 'skipped';
    actions: string[];
    errors: string[];
    message?: string;
  }>;
}

export const ProductSEOBatchEnhancer = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleBatchEnhance = async () => {
    setIsProcessing(true);
    setResult(null);
    setProgress(0);

    try {
      toast({
        title: "🤖 Automação SEO Iniciada",
        description: "Processando produtos sem otimização..."
      });

      const { data, error } = await supabase.functions.invoke('auto-seo-enhancer', {
        body: { mode: 'auto' }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.results);
        setProgress(100);
        
        toast({
          title: "✅ Automação Concluída!",
          description: data.message
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro na automação:', error);
      toast({
        title: "❌ Erro na Automação",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'data_extracted': 'Dados Extraídos',
      'seo_title_generated': 'Título SEO Gerado',
      'meta_description_generated': 'Meta Description Gerada',
      'slug_generated': 'Slug Criado'
    };
    return labels[action] || action;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Automação SEO em Lote</CardTitle>
        </div>
        <CardDescription>
          Otimiza automaticamente todos os produtos sem SEO configurado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleBatchEnhance}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Otimizar SEO Automaticamente
            </>
          )}
        </Button>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Processando produtos...
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-muted-foreground">Otimizados</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Pulados</p>
              </div>
            </div>

            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {result.details.map((detail) => (
                  <div
                    key={detail.id}
                    className="p-3 rounded-lg border bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {detail.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        )}
                        {detail.status === 'failed' && (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        {detail.status === 'skipped' && (
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{detail.name}</p>
                          {detail.message && (
                            <p className="text-xs text-muted-foreground">{detail.message}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          detail.status === 'success' ? 'default' :
                          detail.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {detail.status}
                      </Badge>
                    </div>

                    {detail.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {detail.actions.map((action, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {getActionLabel(action)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {detail.errors.length > 0 && (
                      <div className="space-y-1">
                        {detail.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
