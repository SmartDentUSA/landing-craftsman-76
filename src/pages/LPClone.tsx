import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TopNavigation } from '@/components/TopNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Code, Copy, Download, Eye, Rocket, Image, CheckCircle, 
  XCircle, Loader2, FileCode, Trash2, ExternalLink, RefreshCw
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

// Função para normalizar encoding do texto de entrada
const normalizeInputEncoding = (text: string): string => {
  // Mapeamento de caracteres double-encoded comuns
  const fixes: [RegExp, string][] = [
    // Emojis malformados
    [/ðŸš€/g, '🚀'], [/âž¡ï¸/g, '➡️'], [/ðŸ"¥/g, '🔥'], [/ðŸ'‰/g, '👉'],
    [/âœ…/g, '✅'], [/âŒ/g, '❌'], [/ðŸ'¡/g, '💡'], [/ðŸŽ¯/g, '🎯'],
    // Caracteres portugueses
    [/Ã¡/g, 'á'], [/Ã /g, 'à'], [/Ã¢/g, 'â'], [/Ã£/g, 'ã'],
    [/Ã©/g, 'é'], [/Ã¨/g, 'è'], [/Ãª/g, 'ê'],
    [/Ã­/g, 'í'], [/Ã¬/g, 'ì'], [/Ã®/g, 'î'],
    [/Ã³/g, 'ó'], [/Ã²/g, 'ò'], [/Ã´/g, 'ô'], [/Ãµ/g, 'õ'],
    [/Ãº/g, 'ú'], [/Ã¹/g, 'ù'], [/Ã»/g, 'û'],
    [/Ã§/g, 'ç'], [/Ã±/g, 'ñ'],
    [/Ã‰/g, 'É'], [/Ã"/g, 'Ó'], [/Ãœ/g, 'Ü'], [/Ã‡/g, 'Ç'],
    // Travessões e aspas
    [/â€"/g, '–'], [/â€"/g, '—'], [/â€™/g, "'"], [/â€œ/g, '"'],
    // Símbolos
    [/Â®/g, '®'], [/Â©/g, '©'], [/Â°/g, '°'], [/Â /g, ' '],
  ];
  
  let fixed = text;
  for (const [pattern, replacement] of fixes) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
};

const LPClone = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [originalHTML, setOriginalHTML] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoCanonical, setSeoCanonical] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  
  // Result state
  const [result, setResult] = useState<TransformResult | null>(null);
  
  // Fetch company domains
  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile-domains'],
    queryFn: async () => {
      const { data } = await supabase
        .from('company_profile')
        .select('seo_domains, website_url')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
  
  // Fetch saved LPs
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
  
  // Transform mutation
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
  
  // Save mutation
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
          target_domain: targetDomain,
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
  
  // Delete mutation
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
  
  const domains = companyProfile?.seo_domains as { domain: string }[] || [];
  
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
        <TopNavigation />
        
        <div className="container mx-auto py-6 px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Code className="h-8 w-8" />
                LP Clone — Landing Page Transformer
              </h1>
              <p className="text-muted-foreground mt-1">
                Transforme landing pages de fabricantes em ativos digitais proprietários
              </p>
            </div>
          </div>
          
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
                        onChange={(e) => setOriginalHTML(normalizeInputEncoding(e.target.value))}
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
                        placeholder="https://api.whatsapp.com/send?phone=5511999999999&text=Interesse no i900"
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
                            placeholder="scanner intraoral, medit i900, ios"
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
                  {result && (
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
                            <div className="flex items-center gap-2">
                              {result.stats.headerRemoved ? (
                                <Badge variant="outline">Header Removido</Badge>
                              ) : (
                                <Badge variant="secondary">Header Original</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {result.stats.footerRemoved ? (
                                <Badge variant="outline">Footer Removido</Badge>
                              ) : (
                                <Badge variant="secondary">Footer Original</Badge>
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
                                  <div className="flex items-center gap-2">
                                    {img.status === 'success' ? (
                                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="h-3 w-3 flex-shrink-0" />
                                    )}
                                    <span className="truncate flex-1">
                                      {img.originalUrl.substring(0, 50)}...
                                    </span>
                                  </div>
                                  {img.status === 'success' && (
                                    <div className="text-muted-foreground mt-1 truncate pl-5">
                                      → {img.supabasePath}
                                    </div>
                                  )}
                                  {img.error && (
                                    <div className="text-red-500 mt-1 pl-5">{img.error}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>HTML Gerado</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={result.html}
                            readOnly
                            className="font-mono text-xs min-h-[200px]"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            {result.html.length.toLocaleString()} caracteres
                          </p>
                        </CardContent>
                      </Card>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleCopyHTML} variant="outline">
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar HTML
                        </Button>
                        <Button onClick={handleDownloadHTML} variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar HTML
                        </Button>
                        <Button onClick={handlePreview} variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button 
                          onClick={() => saveMutation.mutate()}
                          disabled={saveMutation.isPending}
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Rocket className="h-4 w-4 mr-2" />
                          )}
                          Salvar na Biblioteca
                        </Button>
                      </div>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Publicar em Domínio</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Select value={targetDomain} onValueChange={setTargetDomain}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o domínio" />
                            </SelectTrigger>
                            <SelectContent>
                              {companyProfile?.website_url && (
                                <SelectItem value={companyProfile.website_url}>
                                  {companyProfile.website_url}
                                </SelectItem>
                              )}
                              {domains.map((d, i) => (
                                <SelectItem key={i} value={d.domain}>
                                  {d.domain}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            className="w-full" 
                            disabled={!targetDomain}
                            onClick={() => toast.info('Funcionalidade de publicação em desenvolvimento')}
                          >
                            <Rocket className="h-4 w-4 mr-2" />
                            Publicar no Domínio Selecionado
                          </Button>
                        </CardContent>
                      </Card>
                    </>
                  )}
                  
                  {!result && (
                    <Card className="h-full flex items-center justify-center min-h-[400px]">
                      <CardContent className="text-center text-muted-foreground">
                        <Code className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>Cole o HTML e configure os parâmetros</p>
                        <p className="text-sm">O resultado aparecerá aqui</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="library">
              <Card>
                <CardHeader>
                  <CardTitle>Biblioteca de LPs Clonadas</CardTitle>
                  <CardDescription>
                    Histórico de landing pages transformadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingLPs ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : savedLPs && savedLPs.length > 0 ? (
                    <div className="space-y-2">
                      {savedLPs.map((lp) => (
                        <div 
                          key={lp.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{lp.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {lp.brand} • {lp.product} • {new Date(lp.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={lp.status === 'published' ? 'default' : 'secondary'}>
                              {lp.status === 'published' ? '🟢 Publicada' : '🟡 Rascunho'}
                            </Badge>
                            <Badge variant="outline">
                              {(lp.captured_images as CapturedImage[])?.filter(i => i.status === 'success').length || 0} imgs
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(lp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma LP clonada ainda
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default LPClone;
