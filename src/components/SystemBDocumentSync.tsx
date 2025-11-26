import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SystemBDocumentSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [testProductId, setTestProductId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{
    productsUpdated: number;
    totalDocuments: number;
    catalogDocuments: number;
    resinDocuments: number;
    googleReviews: number;
    reputationUpdated: boolean;
  } | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-system-b-documents');

      if (error) throw error;

      const summary = data?.summary || {};
      
      setResult({
        productsUpdated: summary.produtos_atualizados || 0,
        totalDocuments: summary.documentos_sincronizados || 0,
        catalogDocuments: summary.documentos_por_origem?.catalog_documents || 0,
        resinDocuments: summary.documentos_por_origem?.resin_documents || 0,
        googleReviews: summary.avaliacoes_google_sincronizadas || 0,
        reputationUpdated: summary.reputacao_atualizada || false,
      });

      const googleReviewsMsg = summary.avaliacoes_google_sincronizadas 
        ? ` + ${summary.avaliacoes_google_sincronizadas} avaliações Google`
        : '';

      toast({
        title: "✅ Sincronização concluída!",
        description: `${summary.produtos_atualizados || 0} produtos atualizados com ${summary.documentos_sincronizados || 0} documentos técnicos${googleReviewsMsg}.`,
      });

      // Disparar evento para refresh automático
      window.dispatchEvent(new CustomEvent('systemB:documentsSynced'));
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

  const handleTestProduct = async () => {
    if (!testProductId.trim()) {
      toast({
        title: "⚠️ Campo vazio",
        description: "Digite um li_product_id para testar",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('debug-systemb-product', {
        body: { li_product_id: testProductId }
      });

      if (error) throw error;

      setTestResult(data);
      
      const totalDocs = (data.total_catalog_docs || 0) + (data.total_resin_docs || 0);
      
      toast({
        title: totalDocs > 0 ? "✅ Documentos encontrados!" : "⚠️ Nenhum documento encontrado",
        description: `Catálogo: ${data.total_catalog_docs} docs | Resinas: ${data.total_resin_docs} docs`
      });
    } catch (error) {
      console.error('Erro ao testar produto:', error);
      toast({
        title: "❌ Erro no teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
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
          <div className="space-y-4">
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

            {(result.googleReviews > 0 || result.reputationUpdated) && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">⭐ Avaliações Google</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold">{result.googleReviews}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">🏆 Reputação</p>
                  <Badge variant={result.reputationUpdated ? "default" : "secondary"}>
                    {result.reputationUpdated ? "Atualizada" : "Não atualizada"}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 border-t pt-4 mt-4">
          <div>
            <Label htmlFor="test-product-id" className="text-sm font-medium">
              🔍 Testar produto específico
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o li_product_id para verificar se há documentos no Sistema B
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input 
              id="test-product-id"
              placeholder="Digite li_product_id (ex: 373844367)"
              value={testProductId}
              onChange={(e) => setTestProductId(e.target.value)}
              disabled={isTesting}
            />
            <Button 
              onClick={handleTestProduct} 
              variant="outline"
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Testar
                </>
              )}
            </Button>
          </div>
          
          {testResult && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Docs Catálogo</p>
                  <Badge variant={testResult.total_catalog_docs > 0 ? "default" : "secondary"}>
                    {testResult.total_catalog_docs}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Docs Resinas</p>
                  <Badge variant={testResult.total_resin_docs > 0 ? "default" : "secondary"}>
                    {testResult.total_resin_docs}
                  </Badge>
                </div>
              </div>
              
              {testResult.catalog_examples?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">📄 Documentos do Catálogo:</p>
                  {testResult.catalog_examples.map((doc: any) => (
                    <a 
                      key={doc.id}
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-3 w-3" />
                      {doc.nome} ({(doc.tamanho / 1024).toFixed(0)} KB)
                    </a>
                  ))}
                </div>
              )}
              
              {testResult.resin_examples?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">🧪 Documentos de Resinas:</p>
                  {testResult.resin_examples.map((doc: any) => (
                    <a 
                      key={doc.id}
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-3 w-3" />
                      {doc.nome} ({(doc.tamanho / 1024).toFixed(0)} KB)
                    </a>
                  ))}
                </div>
              )}
              
              {testResult.total_catalog_docs + testResult.total_resin_docs === 0 && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Nenhum documento encontrado no Sistema B para este produto
                </p>
              )}
            </div>
          )}
        </div>

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
            <li>🆕 Sincroniza avaliações do Google na tabela <code className="text-xs bg-muted px-1 py-0.5 rounded">raw_reviews</code></li>
            <li>🆕 Atualiza reputação em <code className="text-xs bg-muted px-1 py-0.5 rounded">company_profile.company_reviews</code></li>
            <li>Documentos aparecem automaticamente no modal de edição do produto</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
