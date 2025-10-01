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
  ean?: string;
  gtin?: string;
  availability?: string;
}

interface ProductLojaIntegradaImporterProps {
  productUrl?: string;
  onImportSuccess?: (data: ImportedData) => void;
  onImportError?: (error: string) => void;
  mode?: 'callback' | 'direct-save';
  onImportComplete?: () => void;
  overwriteData?: boolean;
  currentFormData?: any;
}

export function ProductLojaIntegradaImporter({ 
  productUrl: initialUrl, 
  onImportSuccess,
  onImportError,
  mode = 'callback',
  onImportComplete,
  overwriteData = false,
  currentFormData = {}
}: ProductLojaIntegradaImporterProps) {
  const [importMethod, setImportMethod] = useState<'api' | 'scraping'>('api');
  const [productUrl, setProductUrl] = useState(initialUrl || '');
  const [productId, setProductId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<'closed' | 'open'>('closed');
  const { toast } = useToast();

  // Helper function to check if field should be updated
  const shouldUpdate = (currentValue: any): boolean => {
    if (overwriteData) return true;
    if (currentValue === null || currentValue === undefined || currentValue === '') return true;
    if (Array.isArray(currentValue) && currentValue.length === 0) return true;
    return false;
  };

  // Helpers internos
  const parsePrice = (value: any): number | undefined => {
    if (!value) return undefined;
    const parsed = parseFloat(
      value.toString().replace(/[^\d.,]/g, "").replace(",", ".")
    );
    return isNaN(parsed) ? undefined : parsed;
  };

  const normalizeAvailability = (val: any): string => {
    if (!val) return "in_stock";
    const map: Record<string, string> = {
      "em estoque": "in_stock",
      "disponivel": "in_stock",
      "in stock": "in_stock",
      "indisponivel": "out_of_stock",
      "sem estoque": "out_of_stock",
      "out of stock": "out_of_stock",
      "pre-venda": "preorder",
      "preorder": "preorder",
    };
    const norm = val.toString().toLowerCase();
    return map[norm] || val;
  };

  // Função consolidada com lógica de preços baseada em variações
  const normalizeEdgeResponse = (payload: any): any => {
    if (!payload) return payload;

    // Unwrap nested structures
    let data = payload;
    if (payload?.data?.data?.name) data = payload.data.data;
    else if (payload?.data?.name) data = payload.data;
    else if (payload?.product?.data?.name) data = payload.product.data;
    else if (payload?.product?.name) data = payload.product;

    console.log('[normalizeEdgeResponse] Input data:', data);

    // -------- Consolidar preços com base nas variações --------
    let finalPrice = parsePrice(data.price ?? data.preco_cheio ?? data.original_price) ?? 0;
    let finalPromo = parsePrice(data.promo_price ?? data.preco_promocional ?? data.discount_price) ?? 0;

    if ((!finalPrice || finalPrice === 0) && Array.isArray(data.variacoes) && data.variacoes.length > 0) {
      const variationPrices = data.variacoes
        .map((v: any) => parsePrice(v.preco || v.price) || 0)
        .filter((p: number) => p > 0);

      const variationPromos = data.variacoes
        .map((v: any) => parsePrice(v.preco_promocional || v.promo_price) || 0)
        .filter((p: number) => p > 0);

      if (variationPrices.length > 0) {
        finalPrice = Math.max(...variationPrices); // maior = preço cheio
        if (variationPromos.length > 0) {
          const minPromo = Math.min(...variationPromos);
          finalPromo = minPromo < finalPrice ? minPromo : 0; // menor promo válido
        }
      }
    }

    // -------- Normalização completa --------
    const normalized = {
      id: data.id || data.product_id || undefined,
      name: data.name ?? data.nome ?? "",
      description: data.description ?? data.descricao_completa ?? data.body ?? "",
      sales_pitch: data.sales_pitch ?? "",

      // Preços consolidados
      price: finalPrice,
      promo_price: finalPromo > 0 ? finalPromo : null,
      currency: data.currency ?? data.moeda ?? "BRL",

      // Links
      product_url: data.product_url ?? data.url ?? "",
      canonical_url: data.canonical_url ?? data.url_canonica ?? null,
      image_url: data.image_url ?? data.imagem_url ?? data.image ?? data.imagens?.[0]?.url ?? "",
      images_gallery: (data.images_gallery ?? data.imagens ?? []).map((img: any, idx: number) => ({
        url: img.url || img,
        alt: img.alt || `Imagem ${idx + 1}`,
        order: img.order ?? idx,
        is_main: img.is_main ?? (idx === 0)
      })),

      // Categorias
      category: data.category ?? data.categorias?.[0]?.nome ?? data.categoria ?? "",
      subcategory: data.subcategory ?? data.subcategoria ?? "",
      store_category: data.store_category ?? data.categoria_original ?? "",

      // Marca / identificação
      brand: data.brand ?? data.marca?.nome ?? data.marca ?? "",
      gtin: data.gtin ?? "",
      ean: data.ean ?? data.codigo_barras ?? "",
      mpn: data.mpn ?? "",

      // Especificações físicas
      package_size: data.package_size ?? "",
      weight: data.weight ?? data.peso ? parseFloat(data.weight ?? data.peso) : null,
      height: data.height ?? data.altura ? parseFloat(data.height ?? data.altura) : null,
      width: data.width ?? data.largura ? parseFloat(data.width ?? data.largura) : null,
      depth: data.depth ?? data.profundidade ? parseFloat(data.depth ?? data.profundidade) : null,

      // Variações completas com suporte a preços promocionais
      variations: (data.variations ?? data.variacoes ?? []).map((v: any) => ({
        name: v.name || v.nome || "",
        price: parsePrice(v.price ?? v.preco),
        promo_price: parsePrice(v.promo_price ?? v.preco_promocional),
        stock: v.stock ?? v.estoque ?? undefined,
        sku: v.sku || "",
        color: v.color || v.cor || "",
        size: v.size || v.tamanho || ""
      })),

      // SEO e IA
      keywords: data.keywords ?? [],
      market_keywords: data.market_keywords ?? [],
      search_intent_keywords: data.search_intent_keywords ?? [],
      benefits: data.benefits ?? [],
      features: data.features ?? [],
      bot_trigger_words: data.bot_trigger_words ?? [],

      // Público-alvo
      target_audience: data.target_audience ?? [],

      // Vídeos
      instagram_videos: data.instagram_videos ?? [],
      youtube_videos: data.youtube_videos ?? [],
      testimonial_videos: data.testimonial_videos ?? [],
      technical_videos: data.technical_videos ?? [],
      tiktok_videos: data.tiktok_videos ?? [],
      video_captions: data.video_captions ?? {},

      // Google Merchant
      google_product_category: data.google_product_category ?? "",
      ncm: data.ncm ?? null,
      condition: data.condition ?? data.condicao ?? "new",
      availability: normalizeAvailability(
        data.availability ??
          data.disponibilidade ??
          (data.disponivel ? "em estoque" : "sem estoque")
      ),

      // Controle
      use_in_ai_generation: data.use_in_ai_generation !== undefined ? data.use_in_ai_generation : true,
      approved: data.approved !== undefined ? data.approved : true,

      // FAQ e specs técnicas
      faq: data.faq ?? [],
      technical_specifications: data.technical_specifications ?? [],
      tags: data.tags ?? [],

      // Campos adicionais
      material: data.material ?? null,
      size: data.size ?? null,
      color: data.color ?? null,
      sku: data.sku ?? null,

      // Dados originais
      original_data: payload
    };

    // -------- Logging melhorado --------
    console.info("🔍 Dados normalizados:", {
      name: normalized.name,
      price: normalized.price,
      promo_price: normalized.promo_price,
      brand: normalized.brand,
      variations_count: normalized.variations?.length ?? 0,
      images_count: normalized.images_gallery?.length ?? 0,
      ean: normalized.ean,
      gtin: normalized.gtin,
      availability: normalized.availability
    });

    return normalized;
  };

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

        result = normalizeEdgeResponse(data);

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
        result = normalizeEdgeResponse(data);

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
          data_quality: dataQuality,
          ean: result.ean,
          gtin: result.gtin,
          availability: result.availability
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
        // Callback mode - build comprehensive update object
        const updates: any = {};
        const fieldsImported: string[] = [];

        // Name (required)
        if (result.name && shouldUpdate(currentFormData.name)) {
          updates.name = result.name;
          fieldsImported.push('Nome');
        }

        // Description with validation
        const isDescValid = result.description && 
                           result.description.trim().length > 20 && 
                           result.description.toLowerCase() !== result.name?.toLowerCase();
        if (isDescValid && shouldUpdate(currentFormData.description)) {
          updates.description = result.description;
          fieldsImported.push('Descrição');
        }

        // Prices with regex parsing
        if (result.price) {
          const priceValue = parseFloat(result.price.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(priceValue) && priceValue > 0 && shouldUpdate(currentFormData.price)) {
            updates.price = priceValue;
            fieldsImported.push('Preço');
          }
        }

        if (result.promo_price) {
          const promoPriceValue = parseFloat(result.promo_price.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(promoPriceValue) && promoPriceValue > 0 && shouldUpdate(currentFormData.promo_price)) {
            updates.promo_price = promoPriceValue;
            fieldsImported.push('Preço Promocional');
          }
        }

        // Images gallery
        if (result.images_gallery && Array.isArray(result.images_gallery) && result.images_gallery.length > 0) {
          if (overwriteData || !currentFormData.images_gallery?.length) {
            updates.images_gallery = result.images_gallery;
            fieldsImported.push(`Galeria (${result.images_gallery.length} imagens)`);
            
            // Set main image as image_url for compatibility
            const mainImage = result.images_gallery.find((img: any) => img.is_main) || result.images_gallery[0];
            if (mainImage && shouldUpdate(currentFormData.image_url)) {
              updates.image_url = mainImage.url;
            }
          }
        } else if (result.image_url && shouldUpdate(currentFormData.image_url)) {
          updates.image_url = result.image_url;
          fieldsImported.push('Imagem');
        }

        // Sales pitch (combine with installmentText if present)
        if (result.installmentText || result.sales_pitch) {
          const currentSalesPitch = currentFormData.sales_pitch || '';
          const newSalesPitch = result.installmentText ? 
            (currentSalesPitch ? `${currentSalesPitch}\n\n${result.installmentText}` : result.installmentText) :
            result.sales_pitch;
          if (shouldUpdate(currentFormData.sales_pitch)) {
            updates.sales_pitch = newSalesPitch;
            fieldsImported.push('Pitch de Vendas');
          }
        }

        // Google Merchant fields
        if (result.gtin && shouldUpdate(currentFormData.gtin)) {
          updates.gtin = result.gtin;
          fieldsImported.push('GTIN');
        }
        if (result.ean && shouldUpdate(currentFormData.ean)) {
          updates.ean = result.ean;
          fieldsImported.push('EAN');
        }
        if (result.mpn && shouldUpdate(currentFormData.mpn)) {
          updates.mpn = result.mpn;
          fieldsImported.push('MPN');
        }
        if (result.brand && shouldUpdate(currentFormData.brand)) {
          updates.brand = result.brand;
          fieldsImported.push('Marca');
        }
        if (result.color && shouldUpdate(currentFormData.color)) {
          updates.color = result.color;
          fieldsImported.push('Cor');
        }
        if (result.size && shouldUpdate(currentFormData.size)) {
          updates.size = result.size;
          fieldsImported.push('Tamanho');
        }
        if (result.material && shouldUpdate(currentFormData.material)) {
          updates.material = result.material;
          fieldsImported.push('Material');
        }
        if (result.google_product_category && shouldUpdate(currentFormData.google_product_category)) {
          updates.google_product_category = result.google_product_category;
          fieldsImported.push('Categoria Google');
        }
        if (result.condition && shouldUpdate(currentFormData.condition)) {
          updates.condition = result.condition;
          fieldsImported.push('Condição');
        }
        if (result.availability && shouldUpdate(currentFormData.availability)) {
          updates.availability = result.availability;
          fieldsImported.push('Disponibilidade');
        }

        // Physical specifications
        if (result.weight && shouldUpdate(currentFormData.weight)) {
          updates.weight = result.weight;
          fieldsImported.push('Peso');
        }
        if (result.height && shouldUpdate(currentFormData.height)) {
          updates.height = result.height;
          fieldsImported.push('Altura');
        }
        if (result.width && shouldUpdate(currentFormData.width)) {
          updates.width = result.width;
          fieldsImported.push('Largura');
        }
        if (result.depth && shouldUpdate(currentFormData.depth)) {
          updates.depth = result.depth;
          fieldsImported.push('Profundidade');
        }
        if (result.package_size && shouldUpdate(currentFormData.package_size)) {
          updates.package_size = result.package_size;
          fieldsImported.push('Tamanho Embalagem');
        }

        // Variations
        if (result.variations && Array.isArray(result.variations) && (overwriteData || !currentFormData.variations?.length)) {
          updates.variations = result.variations;
          fieldsImported.push('Variações');
        }

        // Store category
        if (result.store_category && shouldUpdate(currentFormData.store_category)) {
          updates.store_category = result.store_category;
          fieldsImported.push('Categoria da Loja');
        }

        // Product URL
        if (productUrl && shouldUpdate(currentFormData.product_url)) {
          updates.product_url = productUrl;
        }

        setImportResult({
          success: true,
          source: importMethod === 'api' ? 'API' : 'Web Scraping',
          fieldsImported: fieldsImported.length,
          ...updates
        });

        toast({
          title: "Importação concluída",
          description: `${fieldsImported.length} campos importados: ${fieldsImported.join(', ')}`,
        });

        onImportSuccess?.(updates);
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
