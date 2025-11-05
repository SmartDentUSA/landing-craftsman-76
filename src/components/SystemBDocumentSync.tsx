import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function SystemBDocumentSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    productsUpdated: number;
    totalDocuments: number;
    catalogDocuments: number;
    resinDocuments: number;
  } | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-system-b-documents');

      if (error) throw error;

      setResult({
        productsUpdated: data.products_updated || 0,
        totalDocuments: data.total_documents || 0,
        catalogDocuments: data.catalog_documents || 0,
        resinDocuments: data.resin_documents || 0,
      });

      toast({
        title: "✅ Sincronização concluída!",
        description: `${data.products_updated} produtos atualizados com ${data.total_documents} documentos técnicos.`,
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "❌ Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido ao sincronizar documentos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Sincronização Sistema B - Documentos Técnicos
        </CardTitle>
        <CardDescription>
          Importa automaticamente documentos técnicos (fichas, laudos, certificados) do Sistema B para os produtos do repositório
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleSync} 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Documentos Sistema B
            </>
          )}
        </Button>

        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Produtos Atualizados</p>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <p className="text-2xl font-bold">{result.productsUpdated}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total de Documentos</p>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{result.totalDocuments}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Docs Catálogo</p>
              <Badge variant="outline" className="text-sm font-bold">
                {result.catalogDocuments}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Docs Resinas</p>
              <Badge variant="outline" className="text-sm font-bold">
                {result.resinDocuments}
              </Badge>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-info/10 border border-info/20 rounded-lg p-3 space-y-1">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-info" />
            <strong>Como funciona:</strong>
          </p>
          <ul className="list-disc list-inside ml-6 space-y-1">
            <li>Busca produtos com <code className="text-xs bg-muted px-1 py-0.5 rounded">li_product_id</code> (Loja Integrada)</li>
            <li>Consulta documentos no endpoint <code className="text-xs bg-muted px-1 py-0.5 rounded">/data-export</code></li>
            <li>Mapeia documentos por <code className="text-xs bg-muted px-1 py-0.5 rounded">external_id</code></li>
            <li>Atualiza campo <code className="text-xs bg-muted px-1 py-0.5 rounded">technical_documents</code> no banco</li>
            <li>Documentos aparecem automaticamente no modal de edição do produto</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
