import { useState } from 'react';
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
import { 
  Code, Copy, Download, Eye, Image, CheckCircle, 
  XCircle, Loader2, FileCode, Trash2, ExternalLink, RefreshCw, Save
} from 'lucide-react';

interface CapturedImage {
  originalUrl: string;
  newUrl: string;
  supabasePath: string;
  status: 'success' | 'failed';
  error?: string;
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
  };
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
        },
      });
      
      if (error) throw error;
      return data as TransformResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Transformação concluída! ${data.stats.imagesProcessed} imagens capturadas.`);
    },
    onError: (error) => {
      toast.error(`Erro na transformação: ${(error as Error).message}`);
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
      a.download = `${name || 'landing-page'}.html`;
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
              
              <Card>
                <CardHeader>
                  <CardTitle>Identificação</CardTitle>
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
                      <Label>Marca</Label>
                      <Input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Medit"
                      />
                    </div>
                    <div>
                      <Label>Produto</Label>
                      <Input
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        placeholder="Scanner i900"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>URL do CTA</CardTitle>
                  <CardDescription>
                    Todos os botões e links de conversão serão redirecionados para esta URL
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://api.whatsapp.com/send?phone=5511999999999&text=Interesse"
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Configurações SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Título SEO</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Scanner Medit i900 | Smart Dent"
                    />
                  </div>
                  <div>
                    <Label>Meta Description</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Conheça o scanner intraoral Medit i900..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>URL Canonical</Label>
                      <Input
                        value={seoCanonical}
                        onChange={(e) => setSeoCanonical(e.target.value)}
                        placeholder="https://smartdent.com.br/medit-i900"
                      />
                    </div>
                    <div>
                      <Label>Keywords</Label>
                      <Input
                        value={seoKeywords}
                        onChange={(e) => setSeoKeywords(e.target.value)}
                        placeholder="scanner intraoral, medit i900"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button
                onClick={() => transformMutation.mutate()}
                disabled={!originalHTML || !ctaUrl || transformMutation.isPending}
                className="w-full"
                size="lg"
              >
                {transformMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transformando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar HTML Transformado
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
                        Transformação Concluída
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          <span>{result.stats.imagesProcessed} imagens capturadas</span>
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
                              <div className="truncate">{img.originalUrl}</div>
                              {img.status === 'success' && (
                                <div className="text-muted-foreground truncate">→ {img.newUrl}</div>
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
                    <p>Cole o HTML e clique em "Gerar HTML Transformado"</p>
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
              <CardContent className="text-center py-12 text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma LP salva ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {savedLPs?.map((lp) => (
                <Card key={lp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{lp.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {lp.brand} • {lp.product}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lp.created_at).toLocaleDateString('pt-BR')} • 
                          {lp.captured_images?.length || 0} imagens
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={lp.status === 'published' ? 'default' : 'secondary'}>
                          {lp.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(lp.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
