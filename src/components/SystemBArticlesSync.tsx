import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Newspaper, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function SystemBArticlesSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'sync-system-b-articles?mode=full&max_pages=7',
        { method: 'GET' }
      );

      if (error) throw error;

      setResult(data);

      const totalIngested =
        data?.total_ingested ??
        data?.summary?.total_ingested ??
        (data?.by_domain
          ? Object.values(data.by_domain).reduce(
              (acc: number, v: any) => acc + (Number(v) || 0),
              0
            )
          : 0);

      toast({
        title: '✅ Sincronização concluída!',
        description: `${totalIngested} artigos ingeridos do Sistema B.`,
      });
    } catch (error) {
      console.error('Erro na sincronização de artigos:', error);
      toast({
        title: '❌ Erro na sincronização',
        description:
          error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar artigos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const byDomain: Record<string, any> | null =
    result?.by_domain || result?.summary?.by_domain || result?.domains || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Sincronização Sistema B - Artigos
        </CardTitle>
        <CardDescription>
          Importa artigos do Sistema B (modo full, até 7 páginas por domínio)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSync} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando artigos...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Artigos Sistema B
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {byDomain && Object.keys(byDomain).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Artigos ingeridos por domínio:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                  {Object.entries(byDomain).map(([domain, count]) => (
                    <div key={domain} className="space-y-1">
                      <p className="text-xs text-muted-foreground truncate" title={domain}>
                        {domain}
                      </p>
                      <Badge variant="outline" className="text-sm font-bold">
                        {typeof count === 'object' ? JSON.stringify(count) : String(count)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Resposta completa:</p>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-96 border">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-info/10 border border-info/20 rounded-lg p-3 space-y-1">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-info" />
            <strong>Endpoint:</strong>
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
            GET /functions/v1/sync-system-b-articles?mode=full&max_pages=7
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
