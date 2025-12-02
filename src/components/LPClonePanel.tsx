import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Code, Copy, Download, Eye, Image, CheckCircle, 
  XCircle, Loader2, FileCode, Trash2, ExternalLink, RefreshCw, Save,
  AlertTriangle, Search, Sparkles, Package, Link2
} from 'lucide-react';
import { LPCloneProductSelector, ProductWithSEO } from './LPCloneProductSelector';

interface CapturedImage {
  originalUrl: string;
  newUrl: string;
  supabasePath: string;
  status: 'success' | 'failed';
  error?: string;
  isHeroImage?: boolean;
}

interface GeneratedSEO {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  ogImage?: string;
}

interface TransformResult {
  success: boolean;
  html: string;
  capturedImages: CapturedImage[];
  stats: {
    imagesProcessed: number;
    imagesFailed: number;
    ctasRewritten: number;
    cssPreserved: boolean;
    headerRemoved: boolean;
    footerRemoved: boolean;
    videosPreserved?: number;
  };
  generatedSEO?: GeneratedSEO;
}

interface ClonedLP {
  id: string;
  name: string;
  brand: string | null;
  product: string | null;
  status: string;
  created_at: string;
  captured_images: CapturedImage[];
}


export const LPClonePanel = () => {
  const queryClient = useQueryClient();
  
  const [originalHTML, setOriginalHTML] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoCanonical, setSeoCanonical] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  
  const [result, setResult] = useState<TransformResult | null>(null);
  
  // Product selector state (single selection)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSEO | null>(null);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  
  // Handle product selection - auto-fills all fields
  const handleProductSelect = (product: ProductWithSEO) => {
    setSelectedProduct(product);
    
    // Auto-fill Identificação do Produto
    setBrand(product.brand || '');
    setProduct(product.name);
    if (!name) setName(product.name);
    
    // Auto-fill SEO fields (only if empty)
    if (product.seo_title_override) {
      setSeoTitle(product.seo_title_override);
    }
    if (product.seo_description_override) {
      setSeoDescription(product.seo_description_override);
    }
    if (product.canonical_url) {
      setSeoCanonical(product.canonical_url);
    }
    if (product.keywords && product.keywords.length > 0) {
      setSeoKeywords(product.keywords.join(', '));
    }
    
    toast.success(`Produto "${product.name}" selecionado - campos preenchidos automaticamente`);
  };
  
  // Validation state
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!originalHTML) errors.push('HTML Original é obrigatório');
    if (!ctaUrl) errors.push('URL do CTA é obrigatório');
    if (!brand) errors.push('Marca é obrigatória para SEO');
    if (!product) errors.push('Produto é obrigatório para SEO');
    
    if (seoTitle && seoTitle.length > 60) warnings.push('Título SEO muito longo (máx 60 caracteres)');
    if (seoDescription && seoDescription.length > 160) warnings.push('Meta description muito longa (máx 160 caracteres)');
    
    return { errors, warnings, isValid: errors.length === 0 };
  }, [originalHTML, ctaUrl, brand, product, seoTitle, seoDescription]);
  
  // SEO Preview
  const seoPreview = useMemo(() => {
    const previewTitle = seoTitle || (brand && product ? `${product} ${brand} | Smart Dent` : 'Preencha Marca e Produto');
    const previewDesc = seoDescription || (brand && product ? `Adquira ${product} da ${brand} com a Smart Dent. Entrega para todo Brasil com suporte técnico especializado.` : 'A descrição será gerada automaticamente');
    const previewUrl = seoCanonical || (brand && product ? `smartdent.com.br/${brand.toLowerCase()}-${product.toLowerCase().replace(/\s+/g, '-')}` : 'smartdent.com.br/...');
    
    return { title: previewTitle, description: previewDesc, url: previewUrl };
  }, [seoTitle, seoDescription, seoCanonical, brand, product]);
  
  const { data: savedLPs, isLoading: loadingLPs } = useQuery({
    queryKey: ['cloned-landing-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cloned_landing_pages')
        .select('id, name, brand, product, status, created_at, captured_images')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(lp => ({
        ...lp,
        captured_images: (lp.captured_images as unknown as CapturedImage[]) || []
      })) as ClonedLP[];
    },
  });
  
  const transformMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('clone-landing-page', {
        body: {
          html: originalHTML,
          ctaUrl,
          seoConfig: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          brand,
          product,
          selectedProductId: selectedProduct?.id || null,
        },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na transformação');
      return data as TransformResult;
    },
    onSuccess: (data) => {
      setResult(data);
      
      // Auto-fill SEO fields with generated values
      if (data.generatedSEO) {
        if (!seoTitle && data.generatedSEO.title) setSeoTitle(data.generatedSEO.title);
        if (!seoDescription && data.generatedSEO.description) setSeoDescription(data.generatedSEO.description);
        if (!seoCanonical && data.generatedSEO.canonical) setSeoCanonical(data.generatedSEO.canonical);
        if (!seoKeywords && data.generatedSEO.keywords) setSeoKeywords(data.generatedSEO.keywords);
      }
      
      const videosMsg = data.stats.videosPreserved ? ` | ${data.stats.videosPreserved} vídeos preservados` : '';
      toast.success(`LP Clone v3.0 concluída! ${data.stats.imagesProcessed} imagens${videosMsg}`);
    },
    onError: (error) => {
      toast.error(`Erro: ${(error as Error).message}`);
    },
  });
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('Nenhum resultado para salvar');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('cloned_landing_pages')
        .insert([{
          user_id: user.id,
          name: name || `LP ${brand} ${product}`,
          brand,
          product,
          original_html: originalHTML,
          transformed_html: result.html,
          cta_url: ctaUrl,
          captured_images: JSON.parse(JSON.stringify(result.capturedImages)),
          seo_config: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          status: 'draft',
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('LP salva na biblioteca!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${(error as Error).message}`);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cloned_landing_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('LP removida!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
  });
  
  const handleCopyHTML = () => {
    if (result?.html) {
      navigator.clipboard.writeText(result.html);
      toast.success('HTML copiado!');
    }
  };
  
  const handleDownloadHTML = () => {
    if (result?.html) {
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brand}-${product}.html`.toLowerCase().replace(/\s+/g, '-');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    }
  };
  
  const handlePreview = () => {
    if (result?.html) {
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="transform" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transform">Transformar</TabsTrigger>
          <TabsTrigger value="library">
            Biblioteca ({savedLPs?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transform" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Entrada */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    HTML Original do Fabricante
                  </CardTitle>
                  <CardDescription>
                    Cole o código HTML completo da página do fabricante
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={originalHTML}
                    onChange={(e) => setOriginalHTML(e.target.value)}
                    placeholder="<!DOCTYPE html>&#10;<html>&#10;..."
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {originalHTML.length.toLocaleString()} caracteres
                  </p>
                </CardContent>
              </Card>
              
              <Card className={!brand || !product ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Identificação do Produto
                    {(!brand || !product) && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Selecione um produto do repositório ou preencha manualmente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Nome da LP</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Medit i900"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1">
                        Marca <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Medit"
                        className={!brand ? 'border-destructive' : ''}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1">
                        Produto <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        placeholder="Scanner i900"
                        className={!product ? 'border-destructive' : ''}
                      />
                    </div>
                  </div>
                  {brand && product && (
                    <p className="text-xs text-muted-foreground">
                      📁 Assets serão salvos em: <code className="bg-muted px-1 rounded">lp-clone-assets/{brand.toLowerCase()}/{product.toLowerCase().replace(/\s+/g, '-')}/</code>
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Produto Vinculado */}
              <Card className={selectedProduct ? 'border-primary/30' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Produto Vinculado
                    {selectedProduct && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Vinculado</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Selecione um produto para preencher automaticamente Marca, Produto e SEO
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedProduct ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        {selectedProduct.image_url ? (
                          <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{selectedProduct.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedProduct.brand && <span>{selectedProduct.brand}</span>}
                            {selectedProduct.category && <span> • {selectedProduct.category}</span>}
                          </p>
                          {/* SEO Status Indicators */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${selectedProduct.seo_title_override ? 'text-green-600' : 'text-amber-500'}`}>
                              {selectedProduct.seo_title_override ? '✓' : '○'} Title
                            </span>
                            <span className={`text-xs ${selectedProduct.seo_description_override ? 'text-green-600' : 'text-amber-500'}`}>
                              {selectedProduct.seo_description_override ? '✓' : '○'} Desc
                            </span>
                            <span className={`text-xs ${selectedProduct.canonical_url ? 'text-green-600' : 'text-amber-500'}`}>
                              {selectedProduct.canonical_url ? '✓' : '○'} URL
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductSelectorOpen(true)}
                        className="w-full"
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Trocar Produto
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setProductSelectorOpen(true)}
                        className="w-full"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Selecionar Produto do Repositório
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        ou preencha manualmente os campos acima
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>URL do CTA <span className="text-destructive">*</span></CardTitle>
                  <CardDescription>
                    Todos os botões e links de conversão serão redirecionados para esta URL
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://api.whatsapp.com/send?phone=5511999999999&text=Interesse"
                    className={!ctaUrl ? 'border-destructive' : ''}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Configurações SEO
                    <Badge variant="outline" className="text-xs">Auto-gerado se vazio</Badge>
                  </CardTitle>
                  <CardDescription>
                    Deixe em branco para geração automática baseada no HTML original
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Título SEO ({seoTitle.length}/60)</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Será gerado automaticamente..."
                      className={seoTitle.length > 60 ? 'border-orange-500' : ''}
                    />
                  </div>
                  <div>
                    <Label>Meta Description ({seoDescription.length}/160)</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Será gerada automaticamente..."
                      rows={2}
                      className={seoDescription.length > 160 ? 'border-orange-500' : ''}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>URL Canonical</Label>
                      <Input
                        value={seoCanonical}
                        onChange={(e) => setSeoCanonical(e.target.value)}
                        placeholder="Será gerada automaticamente..."
                      />
                    </div>
                    <div>
                      <Label>Keywords</Label>
                      <Input
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        placeholder="Serão geradas automaticamente..."
                      />
                    </div>
                  </div>
                  
                  {/* SEO Preview */}
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Search className="h-3 w-3" /> Preview Google
                    </p>
                    <div className="space-y-1">
                      <p className="text-blue-600 text-sm font-medium truncate">
                        {seoPreview.title}
                      </p>
                      <p className="text-green-700 text-xs">
                        {seoPreview.url}
                      </p>
                      <p className="text-muted-foreground text-xs line-clamp-2">
                        {seoPreview.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Validation Errors */}
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {validation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {validation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={() => transformMutation.mutate()}
                disabled={!validation.isValid || transformMutation.isPending}
                className="w-full"
                size="lg"
              >
                {transformMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transformando v2.0...
                  </>
                ) : !validation.isValid ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Preencha os campos obrigatórios
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar HTML com SEO Automático
                  </>
                )}
              </Button>
            </div>
            
            {/* Resultado */}
            <div className="space-y-6">
              {result ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        LP Clone v2.0 Concluído
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          <span>{result.stats.imagesProcessed} imagens em /{brand.toLowerCase()}/</span>
                        </div>
                        {result.stats.imagesFailed > 0 && (
                          <div className="flex items-center gap-2 text-orange-500">
                            <XCircle className="h-4 w-4" />
                            <span>{result.stats.imagesFailed} falhas</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          <span>{result.stats.ctasRewritten} CTAs reescritos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.stats.cssPreserved ? (
                            <Badge variant="outline" className="text-green-500">CSS Preservado</Badge>
                          ) : (
                            <Badge variant="destructive">CSS Alterado</Badge>
                          )}
                        </div>
                      </div>
                      
                      {result.generatedSEO && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                          <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> SEO Gerado Automaticamente
                          </p>
                          <div className="text-xs space-y-1">
                            <p><strong>Título:</strong> {result.generatedSEO.title}</p>
                            <p><strong>Canonical:</strong> {result.generatedSEO.canonical}</p>
                            {result.generatedSEO.ogImage && (
                              <p><strong>OG Image:</strong> ✅ Capturada do hero</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Imagens Capturadas ({result.capturedImages.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {result.capturedImages.map((img, idx) => (
                            <div 
                              key={idx}
                              className={`text-xs p-2 rounded ${
                                img.status === 'success' 
                                  ? 'bg-green-500/10 text-green-700' 
                                  : 'bg-red-500/10 text-red-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {img.isHeroImage && <Badge variant="outline" className="text-xs">Hero</Badge>}
                                <span className="truncate">{img.originalUrl}</span>
                              </div>
                              {img.status === 'success' && (
                                <div className="text-muted-foreground truncate">→ {img.supabasePath}</div>
                              )}
                              {img.error && (
                                <div className="text-red-500">{img.error}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        HTML Gerado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-[150px] border rounded p-2">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {result.html.substring(0, 2000)}...
                        </pre>
                      </ScrollArea>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyHTML}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadHTML}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePreview}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => saveMutation.mutate()}
                          disabled={saveMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">LP Clone v3.0</p>
                    <p className="text-sm mt-2">
                      Selecione produto + Preencha HTML + CTA
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      SEO enriquecido • Header/Footer dinâmico • Vídeos preservados
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="library" className="space-y-6">
          {loadingLPs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : savedLPs?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">Nenhuma LP clonada ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedLPs?.map((lp) => (
                <Card key={lp.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{lp.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {lp.brand} / {lp.product}
                        </CardDescription>
                      </div>
                      <Badge variant={lp.status === 'published' ? 'default' : 'secondary'}>
                        {lp.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>{lp.captured_images?.length || 0} imagens</span>
                      <span>{new Date(lp.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(lp.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Product Selector Modal */}
      <LPCloneProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onSelectProduct={handleProductSelect}
        currentProductId={selectedProduct?.id}
      />
    </div>
  );
};
