import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LojaIntegradaAPIImporterProps {
  onImportComplete?: () => void;
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

export const LojaIntegradaAPIImporter: React.FC<LojaIntegradaAPIImporterProps> = ({
  onImportComplete
}) => {
  const [importMethod, setImportMethod] = useState<'api' | 'scraping'>('api');
  const [productUrl, setProductUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<'closed' | 'open'>('closed');
  const { toast } = useToast();

  const validateLojaIntegradaUrl = (url: string): boolean => {
    return url.includes('lojaintegrada.com.br') || url.includes('produto');
  };

  const handleImport = async () => {
    if (!productUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira a URL do produto da Loja Integrada.",
        variant: "destructive"
      });
      return;
    }

    if (!validateLojaIntegradaUrl(productUrl)) {
      toast({
        title: "URL inválida",
        description: "A URL deve ser de um produto da Loja Integrada.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setPreview(null);

    try {
      console.log('🚀 Starting import:', { method: importMethod, url: productUrl });

      let result;

      if (importMethod === 'api') {
        // Use new API edge function
        const { data, error } = await supabase.functions.invoke('import-loja-integrada-api', {
          body: {
            productUrl,
            endpoint: '/produtos', // Can be enhanced to extract product ID from URL
          }
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'API import failed');
        }

        result = data.data;
        
        // Update circuit breaker status from metadata
        if (data.metadata?.circuitBreakerStatus) {
          setCircuitStatus(data.metadata.circuitBreakerStatus);
        }

        console.log('✅ API Import successful:', result);
        
        toast({
          title: "Dados extraídos via API",
          description: `${data.metadata?.fieldsExtracted || 0} campos extraídos em ${data.metadata?.totalTimeMs || 0}ms`,
        });

        if (data.metadata?.fallbackUsed) {
          toast({
            title: "⚠️ Fallback usado",
            description: "API falhou, dados extraídos via web scraping",
            variant: "default"
          });
        }

      } else {
        // Use existing web scraping
        const { data, error } = await supabase.functions.invoke('extract-product-data', {
          body: { url: productUrl }
        });

        if (error) throw error;
        result = data;

        console.log('✅ Web scraping successful:', result);
        
        toast({
          title: "Dados extraídos via Web Scraping",
          description: "Dados básicos extraídos com sucesso",
        });
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

    } catch (error) {
      console.error('❌ Import error:', error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const getMethodIcon = (method: 'api' | 'scraping') => {
    return method === 'api' ? <Zap className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  const getMethodBadge = (method: 'api' | 'scraping') => {
    if (method === 'api') {
      return (
        <Badge variant="default" className="gap-1">
          <Zap className="h-3 w-3" />
          API Oficial
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Globe className="h-3 w-3" />
        Web Scraping
      </Badge>
    );
  };

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <span className="font-semibold">Importar da Loja Integrada</span>
        </div>
        {circuitStatus === 'open' && (
          <Badge variant="destructive" className="gap-1">
            <Shield className="h-3 w-3" />
            Circuit Breaker Aberto
          </Badge>
        )}
      </div>

      {/* Method Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Método de Importação</Label>
        <RadioGroup value={importMethod} onValueChange={(v) => setImportMethod(v as 'api' | 'scraping')}>
          <div className="space-y-2">
            {/* API Method */}
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors">
              <RadioGroupItem value="api" id="api" />
              <Label htmlFor="api" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">API Oficial</div>
                      <div className="text-xs text-muted-foreground">
                        90%+ campos • Dados estruturados • Rápido
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">Recomendado</Badge>
                </div>
              </Label>
            </div>

            {/* Scraping Method */}
            <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent transition-colors">
              <RadioGroupItem value="scraping" id="scraping" />
              <Label htmlFor="scraping" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Web Scraping</div>
                      <div className="text-xs text-muted-foreground">
                        20% campos • Dados básicos • Fallback automático
                      </div>
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="product-url" className="text-sm font-medium">
          URL do Produto
        </Label>
        <div className="flex gap-2">
          <Input
            id="product-url"
            type="url"
            placeholder="https://minhaloja.lojaintegrada.com.br/produto/exemplo"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            disabled={importing}
            className="flex-1"
          />
          <Button
            onClick={handleImport}
            disabled={importing || !productUrl.trim()}
            className="gap-2"
          >
            {importing ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                {getMethodIcon(importMethod)}
                Importar
              </>
            )}
          </Button>
        </div>
      </div>

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
            {getMethodBadge(importMethod)}
          </div>

          {/* Product Info */}
          <div className="space-y-2">
            <div>
              <div className="font-medium">{preview.name}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {preview.category && <span>{preview.category}</span>}
                {preview.brand && <span>• {preview.brand}</span>}
              </div>
            </div>

            {/* Price */}
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

          {/* Data Quality Stats */}
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

          {/* Fields Extracted */}
          <div className="flex items-center gap-2">
            <Progress value={preview.data_quality} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {preview.fields_extracted}/{preview.total_fields} campos
            </span>
          </div>

          {/* Quality Badge */}
          <div className="flex items-center gap-2">
            {preview.data_quality >= 80 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-500 font-medium">Excelente qualidade de dados</span>
              </>
            ) : preview.data_quality >= 50 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-yellow-500 font-medium">Qualidade média - alguns campos ausentes</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-500 font-medium">Baixa qualidade - muitos campos ausentes</span>
              </>
            )}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
            onClick={() => {
              setPreview(null);
              setProductUrl('');
            }}
          >
            Importar Outro Produto
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Info Footer */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <div className="flex items-start gap-2">
          <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            {importMethod === 'api' 
              ? 'API Oficial extrai 90%+ dos campos com fallback automático para web scraping se necessário.'
              : 'Web Scraping extrai ~20% dos campos básicos. Use API Oficial para dados completos.'
            }
          </span>
        </div>
      </div>
    </div>
  );
};
