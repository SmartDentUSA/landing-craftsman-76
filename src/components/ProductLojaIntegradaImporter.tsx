import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ImportedData {
  name: string;
  description?: string;
  price?: number;
  promo_price?: number;
  image_url?: string;
  images_gallery?: Array<{ url: string; alt: string; order: number; is_main: boolean }>;
  brand?: string;
  ean?: string;
  gtin?: string;
  mpn?: string;
  variations?: Array<{ name: string; price?: number; stock?: number; color?: string; size?: string }>;
  category?: string;
  subcategory?: string;
  keywords?: string[];
  features?: string[];
  [key: string]: any;
}

interface ProductLojaIntegradaImporterProps {
  productUrl?: string;
  onImportSuccess: (data: ImportedData) => void;
  onImportError?: (error: string) => void;
}

export function ProductLojaIntegradaImporter({ 
  productUrl: initialUrl, 
  onImportSuccess,
  onImportError 
}: ProductLojaIntegradaImporterProps) {
  const [productUrl, setProductUrl] = useState(initialUrl || '');
  const [productId, setProductId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!productUrl && !productId) {
      toast({
        title: "URL ou ID necessário",
        description: "Informe a URL do produto ou o ID da Loja Integrada",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-loja-integrada-api', {
        body: {
          productUrl: productUrl || undefined,
          productId: productId || undefined,
          endpoint: productId ? 'produto' : undefined
        }
      });

      if (error) throw error;

      // Validar estrutura da resposta
      if (!data || typeof data !== 'object') {
        throw new Error('Resposta inválida do servidor');
      }

      if (data.success) {
        // Validar dados do produto
        const productData = data.data || data.product;
        
        if (!productData || typeof productData !== 'object') {
          throw new Error('Dados do produto não encontrados na resposta');
        }

        if (!productData.name) {
          throw new Error('Nome do produto é obrigatório');
        }

        setImportResult({
          success: true,
          source: data.metadata?.dataSource || 'API',
          ...productData
        });

        toast({
          title: "Importação concluída",
          description: `Produto importado via ${data.metadata?.dataSource || 'API'}`,
        });

        // Chamar callback com os dados importados
        onImportSuccess(productData);
      } else {
        throw new Error(data.error || 'Erro na importação');
      }
    } catch (error: any) {
      console.error('Erro na importação:', error);
      
      // Mensagem de erro específica para resposta HTML
      let errorMessage = error.message || 'Erro ao importar produto da Loja Integrada';
      if (errorMessage.includes('is not valid JSON') || errorMessage.includes('Unexpected token')) {
        errorMessage = 'A API retornou uma resposta inválida. Verifique se a URL/ID está correto e tente novamente.';
      }
      
      toast({
        title: "Erro na importação",
        description: errorMessage,
        variant: "destructive"
      });

      setImportResult({ success: false, error: errorMessage });
      onImportError?.(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Importar da Loja Integrada
        </CardTitle>
        <CardDescription>
          Importe dados do produto diretamente da sua Loja Integrada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="productUrl">URL do Produto</Label>
          <Input
            id="productUrl"
            placeholder="https://suaoja.com.br/produto-exemplo"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            disabled={importing}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">OU</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productId">ID do Produto (Loja Integrada)</Label>
          <Input
            id="productId"
            placeholder="12345"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={importing}
          />
        </div>

        <Button 
          onClick={handleImport} 
          disabled={importing || (!productUrl && !productId)}
          className="w-full"
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            'Importar Produto'
          )}
        </Button>

        {importResult && (
          <Alert variant={importResult.success ? "default" : "destructive"}>
            {importResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {importResult.success ? (
                <div className="space-y-1">
                  <p className="font-medium">
                    Produto importado com sucesso via {importResult.source}!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Os campos do formulário foram preenchidos automaticamente. 
                    Revise as informações antes de salvar.
                  </p>
                </div>
              ) : (
                <p>{importResult.error}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Como funciona:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Tenta primeiro importar via API da Loja Integrada</li>
              <li>Se falhar, usa web scraping como fallback</li>
              <li>Importa imagens, variações, especificações e mais</li>
              <li>Você pode editar os dados antes de salvar</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
