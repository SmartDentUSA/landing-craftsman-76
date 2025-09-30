import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, AlertCircle, CheckCircle2, Cloud } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ProductLojaIntegradaImporterProps {
  onDataImported: (data: any) => void;
  productUrl?: string;
}

export function ProductLojaIntegradaImporter({ 
  onDataImported,
  productUrl: initialUrl 
}: ProductLojaIntegradaImporterProps) {
  const [importMethod, setImportMethod] = useState<'api' | 'scraping'>('api');
  const [productUrl, setProductUrl] = useState(initialUrl || '');
  const [importing, setImporting] = useState(false);
  const [lastImportSource, setLastImportSource] = useState<'api' | 'scraping' | null>(null);
  const { toast } = useToast();

  const validateLojaIntegradaUrl = (url: string): boolean => {
    return url.includes('lojaintegrada.com.br') || url.includes('loja.com.br');
  };

  const handleImport = async () => {
    if (!productUrl.trim()) {
      toast({
        title: "URL necessária",
        description: "Digite a URL do produto na Loja Integrada",
        variant: "destructive"
      });
      return;
    }

    if (!validateLojaIntegradaUrl(productUrl)) {
      toast({
        title: "URL inválida",
        description: "Use uma URL válida da Loja Integrada",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setLastImportSource(null);

    try {
      let importedData = null;
      let source: 'api' | 'scraping' = importMethod;

      if (importMethod === 'api') {
        // Tentar API oficial primeiro
        const { data, error } = await supabase.functions.invoke('import-loja-integrada-api', {
          body: {
            productUrl,
            endpoint: 'produtos'
          }
        });

        if (error) throw error;

        if (data?.success && data?.mappedData) {
          importedData = data.mappedData;
          source = data.metadata?.source === 'web_scraping' ? 'scraping' : 'api';
        }
      } else {
        // Web scraping direto
        const { data, error } = await supabase.functions.invoke('extract-product-data', {
          body: { url: productUrl }
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          importedData = data.data;
          source = 'scraping';
        }
      }

      if (!importedData) {
        throw new Error('Nenhum dado foi importado');
      }

      // Callback com os dados importados
      onDataImported({
        ...importedData,
        _import_source: source,
        _import_timestamp: new Date().toISOString()
      });

      setLastImportSource(source);

      toast({
        title: "Importação concluída",
        description: `Dados importados via ${source === 'api' ? 'API Oficial' : 'Web Scraping'}`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Não foi possível importar os dados do produto",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Cloud className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Importar da Loja Integrada</h3>
        {lastImportSource && (
          <Badge variant="outline" className="ml-auto">
            {lastImportSource === 'api' ? 'API' : 'Scraping'}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm mb-2">Método de Importação</Label>
          <RadioGroup 
            value={importMethod} 
            onValueChange={(value) => setImportMethod(value as 'api' | 'scraping')}
            className="flex gap-4 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="api" id="method-api" />
              <Label htmlFor="method-api" className="cursor-pointer font-normal">
                API Oficial
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scraping" id="method-scraping" />
              <Label htmlFor="method-scraping" className="cursor-pointer font-normal">
                Web Scraping
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="product-url" className="text-sm">URL do Produto</Label>
          <Input
            id="product-url"
            type="url"
            placeholder="https://sua-loja.lojaintegrada.com.br/produto-exemplo"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            disabled={importing}
            className="mt-1"
          />
        </div>

        <Button 
          onClick={handleImport}
          disabled={importing || !productUrl.trim()}
          className="w-full"
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Importar Dados
            </>
          )}
        </Button>

        {lastImportSource && (
          <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              Dados importados com sucesso. Revise os campos abaixo antes de salvar.
            </AlertDescription>
          </Alert>
        )}

        <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>API Oficial:</strong> Dados estruturados e completos, incluindo variações e estoque.
            <br />
            <strong>Web Scraping:</strong> Extração direta da página, útil quando a API falha.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
