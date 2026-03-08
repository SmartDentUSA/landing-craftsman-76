import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, Globe, Rocket, Loader2, Eye, ExternalLink, 
  ChevronDown, ChevronRight, CheckCircle, XCircle, Clock,
  Package, Sparkles, RefreshCw
} from 'lucide-react';

interface SEODomain {
  name: string;
  domain: string;
  cloudflare_enabled?: boolean;
  cloudflare_project_name?: string;
  publish_method?: 'cloudflare' | 'ftp';
  ftp_profile?: string;
  enabled?: boolean;
}

interface ProductWithBlog {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  individual_blog_content: {
    commercial?: string;
    commercial_faqs?: Array<{ question: string; answer: string; sge_snippet?: string; category?: string }>;
    technical?: string;
    technical_faqs?: Array<{ question: string; answer: string; sge_snippet?: string; category?: string }>;
    generated_at?: string;
  } | null;
}

interface BlogPublication {
  id: string;
  product_id: string;
  blog_type: string;
  target_domain: string;
  page_path: string;
  publish_status: string;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
}

export const ProductBlogPublisherPanel = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [pagePath, setPagePath] = useState('');
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});

  // Fetch products with blog content
  const { data: productsWithBlogs, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products-with-blogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, brand, category, image_url, individual_blog_content')
        .not('individual_blog_content', 'is', null)
        .eq('approved', true)
        .order('name');
      
      if (error) throw error;
      return (data || []).filter(p => {
        const blogContent = p.individual_blog_content as ProductWithBlog['individual_blog_content'];
        return blogContent?.commercial || blogContent?.technical;
      }) as ProductWithBlog[];
    },
  });

  // Fetch publications
  const { data: publications, isLoading: loadingPublications } = useQuery({
    queryKey: ['product-blog-publications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_blog_publications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BlogPublication[];
    },
  });

  // Fetch domains
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

  // Identify products with unpublished blogs
  const unpublishedBlogs = useMemo(() => {
    if (!productsWithBlogs || !publications) return [];
    
    const publishedMap = new Map<string, Set<string>>();
    publications.forEach(pub => {
      const key = pub.product_id;
      if (!publishedMap.has(key)) publishedMap.set(key, new Set());
      publishedMap.get(key)!.add(`${pub.blog_type}-${pub.target_domain}`);
    });

    const unpublished: Array<{ product: ProductWithBlog; blogType: 'commercial' | 'technical'; hasFaqs: boolean }> = [];
    
    productsWithBlogs.forEach(product => {
      const blogContent = product.individual_blog_content;
      if (!blogContent) return;
      
      if (blogContent.commercial) {
        unpublished.push({ 
          product, 
          blogType: 'commercial',
          hasFaqs: !!blogContent.commercial_faqs?.length
        });
      }
      if (blogContent.technical) {
        unpublished.push({ 
          product, 
          blogType: 'technical',
          hasFaqs: !!blogContent.technical_faqs?.length
        });
      }
    });
    
    return unpublished;
  }, [productsWithBlogs, publications]);

  // Group published by domain
  const publishedByDomain = useMemo(() => {
    if (!publications) return {};
    
    const grouped: Record<string, BlogPublication[]> = {};
    publications
      .filter(p => p.publish_status === 'published')
      .forEach(pub => {
        if (!grouped[pub.target_domain]) grouped[pub.target_domain] = [];
        grouped[pub.target_domain].push(pub);
      });
    
    return grouped;
  }, [publications]);

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async ({ productId, blogType, domain, path }: { 
      productId: string; 
      blogType: string; 
      domain: string; 
      path: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('publish-product-blog-cloudflare', {
        body: { productId, blogType, domain, pagePath: path }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Publicado em ${data.publishedUrl}`);
      queryClient.invalidateQueries({ queryKey: ['product-blog-publications'] });
    },
    onError: (error) => {
      toast.error(`Erro: ${(error as Error).message}`);
    }
  });

  const handlePublish = (productId: string, productName: string, blogType: string) => {
    if (!selectedDomain) {
      toast.error('Selecione um domínio');
      return;
    }
    
    const slug = productName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const finalPath = pagePath || `blog/${slug}-${blogType}`;
    
    publishMutation.mutate({
      productId,
      blogType,
      domain: selectedDomain,
      path: finalPath
    });
  };

  const getProductName = (productId: string) => {
    const product = productsWithBlogs?.find(p => p.id === productId);
    return product?.name || 'Produto';
  };

  const toggleDomainCollapse = (domain: string) => {
    setCollapsedDomains(prev => ({ ...prev, [domain]: !prev[domain] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Publicado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Publicador de Blogs de Produtos
        </CardTitle>
        <CardDescription>
          Publique blogs gerados para produtos em seus domínios configurados no Cloudflare Pages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Fila ({unpublishedBlogs.length})
            </TabsTrigger>
            <TabsTrigger value="published" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Publicados ({publications?.filter(p => p.publish_status === 'published').length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Todos ({publications?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-4">
            <div className="flex items-end gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex-1 space-y-2">
                <Label>Domínio de Publicação</Label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um domínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledDomains.map(domain => (
                      <SelectItem key={domain.domain} value={domain.domain}>
                        {domain.name} ({domain.domain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Caminho (opcional)</Label>
                <Input 
                  placeholder="blog/nome-produto" 
                  value={pagePath}
                  onChange={(e) => setPagePath(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => refetchProducts()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : unpublishedBlogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum blog pendente de publicação</p>
                <p className="text-sm">Gere blogs para produtos no Repositório primeiro</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {unpublishedBlogs.map(({ product, blogType, hasFaqs }) => (
                    <div 
                      key={`${product.id}-${blogType}`}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={blogType === 'commercial' ? 'default' : 'secondary'}>
                              {blogType === 'commercial' ? 'Comercial' : 'Técnico'}
                            </Badge>
                            {hasFaqs && (
                              <Badge variant="outline" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                10 FAQs
                              </Badge>
                            )}
                            {product.brand && (
                              <span className="text-xs text-muted-foreground">{product.brand}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const blogContent = product.individual_blog_content;
                            const content = blogType === 'commercial' ? blogContent?.commercial : blogContent?.technical;
                            if (content) {
                              const blob = new Blob([content], { type: 'text/markdown' });
                              window.open(URL.createObjectURL(blob), '_blank');
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePublish(product.id, product.name, blogType)}
                          disabled={!selectedDomain || publishMutation.isPending}
                        >
                          {publishMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Rocket className="h-4 w-4 mr-2" />
                              Publicar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Published Tab */}
          <TabsContent value="published" className="space-y-4">
            {loadingPublications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(publishedByDomain).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum blog publicado ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(publishedByDomain).map(([domain, pubs]) => (
                  <Collapsible 
                    key={domain}
                    open={!collapsedDomains[domain]}
                    onOpenChange={() => toggleDomainCollapse(domain)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="font-medium">{domain}</span>
                          <Badge variant="secondary">{pubs.length} blogs</Badge>
                        </div>
                        {collapsedDomains[domain] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pl-4">
                      {pubs.map(pub => (
                        <div key={pub.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{getProductName(pub.product_id)}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={pub.blog_type === 'commercial' ? 'default' : 'secondary'} className="text-xs">
                                {pub.blog_type === 'commercial' ? 'Comercial' : 'Técnico'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">/{pub.page_path}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(pub.publish_status)}
                            {pub.published_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={pub.published_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all" className="space-y-4">
            {loadingPublications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !publications?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma publicação registrada</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {publications.map(pub => (
                    <div key={pub.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{getProductName(pub.product_id)}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={pub.blog_type === 'commercial' ? 'default' : 'secondary'} className="text-xs">
                            {pub.blog_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{pub.target_domain}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(pub.publish_status)}
                        {pub.published_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={pub.published_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
