import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Globe,
  Shield,
  Download,
  Clock
} from 'lucide-react';
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

interface ImportPreview {
  name: string;
  price: number;
  promo_price?: number;
  brand?: string;
  category?: string;
  images_count: number;
  variations_count: number;
  fields_extracted: number;
  total_fields: number;
  data_quality: number;
}

interface ProductLojaIntegradaImporterProps {
  productUrl?: string;
  onImportSuccess?: (data: ImportedData) => void;
  onImportError?: (error: string) => void;
  mode?: 'callback' | 'direct-save';
  onImportComplete?: () => void;
}

export function ProductLojaIntegradaImporter({ 
  productUrl: initialUrl, 
  onImportSuccess,
  onImportError,
  mode = 'callback',
  onImportComplete
}: ProductLojaIntegradaImporterProps) {
  const [importMethod, setImportMethod] = useState<'api' | 'scraping'>('api');
  const [productUrl, setProductUrl] = useState(initialUrl || '');
  const [productId, setProductId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<'closed' | 'open'>('closed');
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
    setPreview(null);

    try {
      let result;

      if (importMethod === 'api') {
        const { data, error } = await supabase.functions.invoke('import-loja-integrada-api', {
          body: {
            productUrl: productUrl || undefined,
            productId: productId || undefined,
            endpoint: productId ? 'produto' : '/produtos'
          }
        });

        if (error) throw error;

        if (!data || typeof data !== 'object') {
          throw new Error('Resposta inválida do servidor');
        }

        if (!data.success) {
          throw new Error(data.error || 'Erro na importação');
        }

        result = data.data || data.product;

        // Update circuit breaker status
        if (data.metadata?.circuitBreakerStatus) {
          setCircuitStatus(data.metadata.circuitBreakerStatus);
        }

        toast({
          title: "Dados extraídos via API",
          description: `${data.metadata?.fieldsExtracted || 0} campos extraídos`,
        });

        if (data.metadata?.fallbackUsed) {
          toast({
            title: "⚠️ Fallback usado",
            description: "API falhou, dados extraídos via web scraping",
          });
        }

      } else {
        const { data, error } = await supabase.functions.invoke('extract-product-data', {
          body: { url: productUrl }
        });

        if (error) throw error;
        result = data;

        toast({
          title: "Dados extraídos via Web Scraping",
          description: "Dados básicos extraídos com sucesso",
        });
      }

      if (!result || !result.name) {
        throw new Error('Nome do produto é obrigatório');
      }

      // Generate preview
      const fieldsExtracted = Object.keys(result).filter(key => 
        result[key] !== null && 
        result[key] !== '' && 
        (Array.isArray(result[key]) ? result[key].length > 0 : true)
      ).length;

      const totalFields = Object.keys(result).length;
      const dataQuality = Math.round((fieldsExtracted / totalFields) * 100);

      setPreview({
        name: result.name || 'Sem nome',
        price: result.price || 0,
        promo_price: result.promo_price,
        brand: result.brand,
        category: result.category,
        images_count: result.images_gallery?.length || 0,
        variations_count: result.variations?.length || 0,
        fields_extracted: fieldsExtracted,
        total_fields: totalFields,
        data_quality: dataQuality
      });

      // Handle based on mode
      if (mode === 'direct-save') {
        // Save to repository
        const { error: saveError } = await supabase
          .from('products_repository')
          .insert({
            ...result,
            product_url: productUrl,
            source_type: importMethod === 'api' ? 'loja_integrada_api' : 'web_scraping',
            data_source: importMethod === 'api' ? 'loja_integrada_api' : 'web_scraping',
            approved: true,
            use_in_ai_generation: true,
          });

        if (saveError) throw saveError;

        toast({
          title: "Produto importado!",
          description: `${fieldsExtracted} campos extraídos (${dataQuality}% qualidade)`,
        });

        onImportComplete?.();
      } else {
        // Callback mode
        setImportResult({
          success: true,
          source: importMethod === 'api' ? 'API' : 'Web Scraping',
          ...result
        });

        toast({
          title: "Importação concluída",
          description: `Produto importado via ${importMethod === 'api' ? 'API' : 'Web Scraping'}`,
        });

        onImportSuccess?.(result);
      }

    } catch (error: any) {
      console.error('Erro na importação:', error);
      
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importar da Loja Integrada
            </CardTitle>
            <CardDescription>
              Escolha o método e importe dados do produto
            </CardDescription>
          </div>
          {circuitStatus === 'open' && (
            <Badge variant="destructive" className="gap-1">
              <Shield className="h-3 w-3" />
              Circuit Breaker Aberto
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Método de Importação</Label>
          <RadioGroup value={importMethod} onValueChange={(v) => setImportMethod(v as 'api' | 'scraping')}>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors">
                <RadioGroupItem value="api" id="api" />
                <Label htmlFor="api" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">API Oficial</div>
                        <div className="text-xs text-muted-foreground">
                          90%+ campos • Dados completos • Rápido
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs">Recomendado</Badge>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors">
                <RadioGroupItem value="scraping" id="scraping" />
                <Label htmlFor="scraping" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Web Scraping</div>
                      <div className="text-xs text-muted-foreground">
                        ~20% campos • Dados básicos • Fallback
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>
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
          className="w-full gap-2"
        >
          {importing ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              {importMethod === 'api' ? <Zap className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              Importar Produto
            </>
          )}
        </Button>

        {/* Import Progress */}
        {importing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              <span>Extraindo dados do produto...</span>
            </div>
            <Progress value={45} className="h-2" />
          </div>
        )}

        {/* Preview */}
        {preview && !importing && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Preview da Importação</span>
              <Badge variant={importMethod === 'api' ? 'default' : 'secondary'} className="gap-1">
                {importMethod === 'api' ? <Zap className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                {importMethod === 'api' ? 'API' : 'Scraping'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div>
                <div className="font-medium">{preview.name}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {preview.category && <span>{preview.category}</span>}
                  {preview.brand && <span>• {preview.brand}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  R$ {preview.price.toFixed(2)}
                </span>
                {preview.promo_price && preview.promo_price < preview.price && (
                  <Badge variant="destructive" className="text-xs">
                    Promoção: R$ {preview.promo_price.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background rounded p-2 text-center">
                <div className="text-xs text-muted-foreground">Imagens</div>
                <div className="font-bold text-primary">{preview.images_count}</div>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <div className="text-xs text-muted-foreground">Variações</div>
                <div className="font-bold text-primary">{preview.variations_count}</div>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <div className="text-xs text-muted-foreground">Qualidade</div>
                <div className="font-bold text-primary">{preview.data_quality}%</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Progress value={preview.data_quality} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {preview.fields_extracted}/{preview.total_fields} campos
              </span>
            </div>
          </div>
        )}

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
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {importMethod === 'api' 
              ? 'API Oficial extrai 90%+ dos campos com fallback automático para web scraping se necessário.'
              : 'Web Scraping extrai ~20% dos campos básicos. Use API Oficial para dados completos.'
            }
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
