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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Code, Copy, Download, Eye, Image, CheckCircle, 
  XCircle, Loader2, FileCode, Trash2, ExternalLink, RefreshCw, Save,
  AlertTriangle, Search, Sparkles, Package, Link2, Pencil, X, 
  Globe, Rocket, ChevronDown, ChevronRight, Home, FolderOpen, Cloud
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
  original_html?: string;
  transformed_html?: string;
  cta_url?: string;
  seo_config?: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string;
  };
  target_domain?: string;
  page_path?: string;
  is_homepage?: boolean;
  publish_status?: string;
  published_url?: string;
}

interface SEODomain {
  name: string;
  domain: string;
  cloudflare_enabled?: boolean;
  cloudflare_project_name?: string;
  cloudflare_status?: string;
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
  
  // Publication state
  const [selectedDomain, setSelectedDomain] = useState('');
  const [pagePath, setPagePath] = useState('');
  const [isHomepage, setIsHomepage] = useState(false);
  
  const [result, setResult] = useState<TransformResult | null>(null);
  
  // Editing state
  const [editingLPId, setEditingLPId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transform');
  
  // Product selector state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSEO | null>(null);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  
  // Library collapsed sections
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  
  // Fetch company domains
  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile-domains'],
    queryFn: async () => {
      const { data } = await supabase
        .from('company_profile')
        .select('seo_domains')
        .limit(1)
        .single();
      return data;
    },
  });
  
  const seoDomains = (companyProfile?.seo_domains as unknown as SEODomain[]) || [];
  const enabledDomains = seoDomains.filter(d => d.cloudflare_enabled && d.cloudflare_project_name);
  
  // Handle product selection
  const handleProductSelect = (product: ProductWithSEO) => {
    setSelectedProduct(product);
    setBrand(product.brand || '');
    setProduct(product.name);
    if (!name) setName(product.name);
    if (product.seo_title_override) setSeoTitle(product.seo_title_override);
    if (product.seo_description_override) setSeoDescription(product.seo_description_override);
    if (product.canonical_url) setSeoCanonical(product.canonical_url);
    if (product.keywords && product.keywords.length > 0) {
      setSeoKeywords(product.keywords.join(', '));
    }
    toast.success(`Produto "${product.name}" selecionado`);
  };
  
  // Validation
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
    const previewDesc = seoDescription || (brand && product ? `Adquira ${product} da ${brand} com a Smart Dent.` : 'A descrição será gerada automaticamente');
    const previewUrl = seoCanonical || (brand && product ? `smartdent.com.br/${brand.toLowerCase()}-${product.toLowerCase().replace(/\s+/g, '-')}` : 'smartdent.com.br/...');
    return { title: previewTitle, description: previewDesc, url: previewUrl };
  }, [seoTitle, seoDescription, seoCanonical, brand, product]);
  
  // Fetch saved LPs with new fields
  const { data: savedLPs, isLoading: loadingLPs } = useQuery({
    queryKey: ['cloned-landing-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cloned_landing_pages')
        .select('id, name, brand, product, status, created_at, captured_images, original_html, transformed_html, cta_url, seo_config, target_domain, page_path, is_homepage, publish_status, published_url')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(lp => ({
        ...lp,
        captured_images: (lp.captured_images as unknown as CapturedImage[]) || [],
        seo_config: (lp.seo_config as unknown as ClonedLP['seo_config']) || {}
      })) as ClonedLP[];
    },
  });
  
  // Group LPs by domain
  const lpsByDomain = useMemo(() => {
    if (!savedLPs) return { grouped: {}, unassigned: [] };
    
    const grouped: Record<string, ClonedLP[]> = {};
    const unassigned: ClonedLP[] = [];
    
    savedLPs.forEach(lp => {
      if (lp.target_domain) {
        if (!grouped[lp.target_domain]) {
          grouped[lp.target_domain] = [];
        }
        grouped[lp.target_domain].push(lp);
      } else {
        unassigned.push(lp);
      }
    });
    
    // Sort each domain's LPs: homepage first, then by name
    Object.keys(grouped).forEach(domain => {
      grouped[domain].sort((a, b) => {
        if (a.is_homepage && !b.is_homepage) return -1;
        if (!a.is_homepage && b.is_homepage) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    });
    
    return { grouped, unassigned };
  }, [savedLPs]);
  
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
          selectedProductId: selectedProduct?.id || null,
        },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na transformação');
      return data as TransformResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.generatedSEO) {
        if (!seoTitle && data.generatedSEO.title) setSeoTitle(data.generatedSEO.title);
        if (!seoDescription && data.generatedSEO.description) setSeoDescription(data.generatedSEO.description);
        if (!seoCanonical && data.generatedSEO.canonical) setSeoCanonical(data.generatedSEO.canonical);
        if (!seoKeywords && data.generatedSEO.keywords) setSeoKeywords(data.generatedSEO.keywords);
      }
      toast.success(`LP Clone concluída! ${data.stats.imagesProcessed} imagens`);
    },
    onError: (error) => {
      toast.error(`Erro: ${(error as Error).message}`);
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
          target_domain: selectedDomain || null,
          page_path: pagePath || '/',
          is_homepage: isHomepage,
          captured_images: JSON.parse(JSON.stringify(result.capturedImages)),
          seo_config: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          status: 'draft',
          publish_status: 'draft'
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
  
  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (lpId: string) => {
      const lp = savedLPs?.find(l => l.id === lpId);
      if (!lp) throw new Error('LP não encontrada');
      if (!lp.target_domain) throw new Error('Domínio não definido');
      
      const { data, error } = await supabase.functions.invoke('publish-cloudflare-pages', {
        body: {
          lpId,
          domain: lp.target_domain,
          pagePath: lp.page_path || '/',
          isHomepage: lp.is_homepage || false
        }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Publicado em ${data.deployment.publishedUrl}`);
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro ao publicar: ${(error as Error).message}`);
    }
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
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingLPId || !result) throw new Error('Dados inválidos');
      
      const { error } = await supabase
        .from('cloned_landing_pages')
        .update({
          name: name || `LP ${brand} ${product}`,
          brand,
          product,
          original_html: originalHTML,
          transformed_html: result.html,
          cta_url: ctaUrl,
          target_domain: selectedDomain || null,
          page_path: pagePath || '/',
          is_homepage: isHomepage,
          captured_images: JSON.parse(JSON.stringify(result.capturedImages)),
          seo_config: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingLPId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('LP atualizada!');
      setEditingLPId(null);
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro: ${(error as Error).message}`);
    },
  });
  
  // Assign domain mutation
  const assignDomainMutation = useMutation({
    mutationFn: async ({ lpId, domain, path, homepage }: { lpId: string; domain: string; path: string; homepage: boolean }) => {
      const { error } = await supabase
        .from('cloned_landing_pages')
        .update({
          target_domain: domain,
          page_path: path || '/',
          is_homepage: homepage
        })
        .eq('id', lpId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Domínio vinculado!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    }
  });
  
  const handleEditLP = (lp: ClonedLP) => {
    setName(lp.name || '');
    setBrand(lp.brand || '');
    setProduct(lp.product || '');
    setOriginalHTML(lp.original_html || '');
    setCtaUrl(lp.cta_url || '');
    setSelectedDomain(lp.target_domain || '');
    setPagePath(lp.page_path || '');
    setIsHomepage(lp.is_homepage || false);
    
    if (lp.seo_config) {
      setSeoTitle(lp.seo_config.title || '');
      setSeoDescription(lp.seo_config.description || '');
      setSeoCanonical(lp.seo_config.canonical || '');
      setSeoKeywords(lp.seo_config.keywords || '');
    }
    
    if (lp.transformed_html) {
      setResult({
        success: true,
        html: lp.transformed_html,
        capturedImages: lp.captured_images || [],
        stats: {
          imagesProcessed: lp.captured_images?.length || 0,
          imagesFailed: 0,
          ctasRewritten: 0,
          cssPreserved: true,
          headerRemoved: true,
          footerRemoved: true,
        },
      });
    } else {
      setResult(null);
    }
    
    setEditingLPId(lp.id);
    setActiveTab('transform');
    toast.info(`Editando: ${lp.name}`);
  };
  
  const handleCancelEdit = () => {
    setEditingLPId(null);
    setName('');
    setBrand('');
    setProduct('');
    setOriginalHTML('');
    setCtaUrl('');
    setSeoTitle('');
    setSeoDescription('');
    setSeoCanonical('');
    setSeoKeywords('');
    setSelectedDomain('');
    setPagePath('');
    setIsHomepage(false);
    setResult(null);
    setSelectedProduct(null);
  };
  
  const handlePreviewSavedLP = (lp: ClonedLP) => {
    if (lp.transformed_html) {
      const blob = new Blob([lp.transformed_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };
  
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
    }
  };
  
  const handlePreview = () => {
    if (result?.html) {
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };
  
  const getPublishStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Publicada</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600">⏳ Publicando...</Badge>;
      case 'error':
        return <Badge variant="destructive">❌ Erro</Badge>;
      default:
        return <Badge variant="secondary">📝 Rascunho</Badge>;
    }
  };
  
  const toggleDomainCollapse = (domain: string) => {
    setCollapsedDomains(prev => ({
      ...prev,
      [domain]: !prev[domain]
    }));
  };
  
  // Render LP Card
  const renderLPCard = (lp: ClonedLP, showDomainAssign = false) => (
    <Card key={lp.id} className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {lp.is_homepage && <Home className="h-4 w-4 text-primary" />}
              <CardTitle className="text-base truncate">{lp.name}</CardTitle>
            </div>
            <CardDescription className="text-xs flex items-center gap-2 mt-1">
              <span>{lp.brand} / {lp.product}</span>
              {lp.page_path && lp.page_path !== '/' && (
                <code className="bg-muted px-1 rounded text-xs">{lp.page_path}</code>
              )}
            </CardDescription>
          </div>
          {getPublishStatusBadge(lp.publish_status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{lp.captured_images?.length || 0} imagens</span>
          <span>{new Date(lp.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        
        {lp.published_url && (
          <a 
            href={lp.published_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 mb-3"
          >
            <ExternalLink className="h-3 w-3" />
            {lp.published_url}
          </a>
        )}
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleEditLP(lp)}>
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
          {lp.transformed_html && (
            <Button variant="outline" size="sm" onClick={() => handlePreviewSavedLP(lp)}>
              <Eye className="h-3 w-3" />
            </Button>
          )}
          {lp.target_domain && lp.transformed_html && (
            <Button 
              size="sm" 
              onClick={() => publishMutation.mutate(lp.id)}
              disabled={publishMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Rocket className="h-3 w-3 mr-1" />
              )}
              {lp.publish_status === 'success' ? 'Republicar' : 'Publicar'}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate(lp.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        {showDomainAssign && enabledDomains.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">Vincular a domínio:</Label>
            <div className="flex gap-2">
              <Select onValueChange={(domain) => {
                assignDomainMutation.mutate({ 
                  lpId: lp.id, 
                  domain, 
                  path: '/', 
                  homepage: false 
                });
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar domínio" />
                </SelectTrigger>
                <SelectContent>
                  {enabledDomains.map(d => (
                    <SelectItem key={d.domain} value={d.domain}>
                      {d.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="transform">
            {editingLPId ? '✏️ Editando' : 'Transformar'}
          </TabsTrigger>
          <TabsTrigger value="library">
            Biblioteca ({savedLPs?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        {editingLPId && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <Pencil className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-amber-800 dark:text-amber-200">
                Editando: <strong>{name}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <TabsContent value="transform" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    HTML Original
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={originalHTML}
                    onChange={(e) => setOriginalHTML(e.target.value)}
                    placeholder="<!DOCTYPE html>&#10;<html>..."
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
                    Identificação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Nome da LP</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Medit i900" />
                    </div>
                    <div>
                      <Label>Marca *</Label>
                      <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Medit" className={!brand ? 'border-destructive' : ''} />
                    </div>
                    <div>
                      <Label>Produto *</Label>
                      <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Scanner i900" className={!product ? 'border-destructive' : ''} />
                    </div>
                  </div>
                  
                  {selectedProduct ? (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedProduct.brand}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setProductSelectorOpen(true)}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setProductSelectorOpen(true)} className="w-full">
                      <Package className="h-4 w-4 mr-2" />
                      Selecionar do Repositório
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>URL do CTA *</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://api.whatsapp.com/send?phone=..."
                    className={!ctaUrl ? 'border-destructive' : ''}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    SEO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Título ({seoTitle.length}/60)</Label>
                    <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Auto-gerado..." className={seoTitle.length > 60 ? 'border-orange-500' : ''} />
                  </div>
                  <div>
                    <Label>Description ({seoDescription.length}/160)</Label>
                    <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Auto-gerada..." rows={2} className={seoDescription.length > 160 ? 'border-orange-500' : ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Canonical URL</Label>
                      <Input value={seoCanonical} onChange={(e) => setSeoCanonical(e.target.value)} placeholder="Auto-gerada..." />
                    </div>
                    <div>
                      <Label>Keywords</Label>
                      <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="Auto-geradas..." />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Search className="h-3 w-3" /> Preview Google
                    </p>
                    <p className="text-blue-600 text-sm font-medium truncate">{seoPreview.title}</p>
                    <p className="text-green-700 text-xs">{seoPreview.url}</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{seoPreview.description}</p>
                  </div>
                </CardContent>
              </Card>
              
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {validation.errors.map((error, idx) => <li key={idx}>{error}</li>)}
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
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Transformando...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Gerar HTML</>
                )}
              </Button>
            </div>
            
            {/* Result Column */}
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
                          <span>{result.stats.imagesProcessed} imagens</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          <span>{result.stats.ctasRewritten} CTAs</span>
                        </div>
                      </div>
                      {result.generatedSEO && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                          <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> SEO Auto-gerado
                          </p>
                        </div>
                      )}
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
                      <ScrollArea className="h-[100px] border rounded p-2">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {result.html.substring(0, 1500)}...
                        </pre>
                      </ScrollArea>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handleCopyHTML}>
                          <Copy className="h-4 w-4 mr-1" />Copiar
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadHTML}>
                          <Download className="h-4 w-4 mr-1" />Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePreview}>
                          <Eye className="h-4 w-4 mr-1" />Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Publication Block */}
                  <Card className="border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Rocket className="h-5 w-5" />
                        Publicar em Domínio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {enabledDomains.length === 0 ? (
                        <Alert>
                          <Cloud className="h-4 w-4" />
                          <AlertDescription>
                            Nenhum domínio com Cloudflare configurado. Configure em Repository {'>'} Tracking & SEO.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div>
                            <Label>Domínio Destino</Label>
                            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar domínio" />
                              </SelectTrigger>
                              <SelectContent>
                                {enabledDomains.map(d => (
                                  <SelectItem key={d.domain} value={d.domain}>
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-4 w-4" />
                                      {d.domain}
                                      {d.cloudflare_status === 'connected' && (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="homepage" 
                              checked={isHomepage} 
                              onCheckedChange={(c) => {
                                setIsHomepage(c === true);
                                if (c) setPagePath('/');
                              }} 
                            />
                            <label htmlFor="homepage" className="text-sm font-medium cursor-pointer">
                              Definir como Página Principal (/)
                            </label>
                          </div>
                          
                          {!isHomepage && (
                            <div>
                              <Label>Caminho da Página</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{selectedDomain || 'dominio.com'}/</span>
                                <Input
                                  value={pagePath.replace(/^\//, '')}
                                  onChange={(e) => setPagePath('/' + e.target.value.replace(/^\//, ''))}
                                  placeholder="scanner-i900"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          )}
                          
                          {selectedDomain && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground">Preview URL:</p>
                              <p className="text-sm font-mono text-primary">
                                https://{selectedDomain}{isHomepage ? '/' : pagePath || '/'}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => editingLPId ? updateMutation.mutate() : saveMutation.mutate()}
                          disabled={saveMutation.isPending || updateMutation.isPending}
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingLPId ? 'Atualizar' : 'Salvar Rascunho'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">LP Clone</p>
                    <p className="text-sm mt-2">Preencha HTML + CTA para começar</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Library Tab - Grouped by Domain */}
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
            <div className="space-y-6">
              {/* Domain Sections */}
              {Object.entries(lpsByDomain.grouped).map(([domain, lps]) => {
                const domainConfig = seoDomains.find(d => d.domain === domain);
                const isCollapsed = collapsedDomains[domain];
                
                return (
                  <Collapsible key={domain} open={!isCollapsed} onOpenChange={() => toggleDomainCollapse(domain)}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              <Globe className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-lg">{domain}</CardTitle>
                                <CardDescription>{lps.length} página{lps.length !== 1 ? 's' : ''}</CardDescription>
                              </div>
                            </div>
                            {domainConfig?.cloudflare_status === 'connected' ? (
                              <Badge className="bg-green-500/10 text-green-600">☁️ Cloudflare Conectado</Badge>
                            ) : (
                              <Badge variant="secondary">☁️ Cloudflare Pendente</Badge>
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lps.map(lp => renderLPCard(lp))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
              
              {/* Unassigned Section */}
              {lpsByDomain.unassigned.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">Sem Domínio Vinculado</CardTitle>
                        <CardDescription>{lpsByDomain.unassigned.length} página{lpsByDomain.unassigned.length !== 1 ? 's' : ''}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lpsByDomain.unassigned.map(lp => renderLPCard(lp, true))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <LPCloneProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onSelectProduct={handleProductSelect}
        currentProductId={selectedProduct?.id}
      />
    </div>
  );
};