import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Sparkles, Eye, Package, Settings, Link, ChevronDown, RefreshCw, AlertCircle } from "lucide-react";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { IntelligentLinksManager } from "./IntelligentLinksManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/constants/storage-keys";

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  image_url?: string;
  individual_blog_content?: {
    commercial?: string | null;
    technical?: string | null;
    generated_at?: string | null;
    commercial_links?: Record<string, string>;
    technical_links?: Record<string, string>;
    commercial_links_generated_at?: string | null;
    technical_links_generated_at?: string | null;
  };
}

interface BlogConsolidationPreferences {
  [productId: string]: {
    useCommercial: boolean;
    useTechnical: boolean;
  };
}

interface ProductBlogCuratorPanelProps {
  selectedProductIds: string[];
  onPreferencesChange: (preferences: BlogConsolidationPreferences) => void;
  className?: string;
}

export function ProductBlogCuratorPanel({ 
  selectedProductIds, 
  onPreferencesChange,
  className 
}: ProductBlogCuratorPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<BlogConsolidationPreferences>({});
  const [selectedBlogContent, setSelectedBlogContent] = useState<{ content: string; title: string } | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { loadProductsByIds } = useSelectedProducts();

  useEffect(() => {
    if (selectedProductIds.length > 0) {
      loadProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [selectedProductIds]);

  useEffect(() => {
    // Carregar preferências do localStorage usando chave padronizada
    const savedPrefs = localStorage.getItem(STORAGE_KEYS.BLOG_CONSOLIDATION_PREFERENCES);
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  useEffect(() => {
    // Salvar preferências no localStorage e notificar parent
    localStorage.setItem(STORAGE_KEYS.BLOG_CONSOLIDATION_PREFERENCES, JSON.stringify(preferences));
    onPreferencesChange(preferences);
  }, [preferences, onPreferencesChange]);

  // Realtime subscription para mudanças na tabela products_repository
  useEffect(() => {
    if (selectedProductIds.length === 0) return;

    const channel = supabase
      .channel('products-blog-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products_repository',
          filter: `id=in.(${selectedProductIds.join(',')})`,
        },
        (payload) => {
          console.log('🔄 Product blog content updated:', payload);
          // Recarregar produtos quando houver mudanças
          loadProducts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProductIds]);

  const loadProducts = async (forceRefresh = false) => {
    const isRefresh = forceRefresh && !loading;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      console.log('🔄 Loading products, force refresh:', forceRefresh);
      const loadedProducts = await loadProductsByIds(selectedProductIds, forceRefresh);
      setProducts(loadedProducts);
      setLastUpdated(new Date());
      
      if (isRefresh) {
        toast.success("Dados atualizados com sucesso");
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadProducts(true);
  };

  const productsWithBlogs = products.filter(product => 
    product.individual_blog_content?.commercial || product.individual_blog_content?.technical
  );

  const productsWithoutBlogs = products.filter(product => 
    !product.individual_blog_content?.commercial && !product.individual_blog_content?.technical
  );

  const toggleBlogUse = (productId: string, blogType: 'commercial' | 'technical', enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [blogType === 'commercial' ? 'useCommercial' : 'useTechnical']: enabled
      }
    }));
  };

  const viewBlogContent = (content: string, productName: string, blogType: string) => {
    setSelectedBlogContent({
      content,
      title: `${productName} - Blog ${blogType === 'commercial' ? 'Comercial' : 'Técnico'}`
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Data desconhecida';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActiveBlogsCount = () => {
    return Object.values(preferences).reduce((count, pref) => {
      return count + (pref.useCommercial ? 1 : 0) + (pref.useTechnical ? 1 : 0);
    }, 0);
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const updateProductLinks = async (productId: string, blogType: 'commercial' | 'technical', links: Record<string, string>) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const updatedBlogContent = {
        ...product.individual_blog_content,
        [`${blogType}_links`]: links,
        [`${blogType}_links_generated_at`]: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({ individual_blog_content: updatedBlogContent })
        .eq('id', productId);

      if (error) throw error;

      // Atualizar estado local
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, individual_blog_content: updatedBlogContent }
          : p
      ));

      toast.success("Links inteligentes atualizados");
    } catch (error) {
      console.error('Error updating links:', error);
      toast.error("Erro ao atualizar links");
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Carregando blogs dos produtos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Curadoria de Blogs dos Produtos
              </CardTitle>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Selecione quais blogs individuais serão incluídos no blog consolidado.
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {productsWithBlogs.length} produto{productsWithBlogs.length !== 1 ? 's' : ''} com blog{productsWithBlogs.length !== 1 ? 's' : ''}
                </Badge>
                
                <Badge variant="default">
                  {getActiveBlogsCount()} blog{getActiveBlogsCount() !== 1 ? 's' : ''} ativo{getActiveBlogsCount() !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {lastUpdated && (
                <div className="text-xs text-muted-foreground">
                  Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
                </div>
              )}
            </div>
          </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4">
            {/* Produtos sem blogs disponíveis */}
            {productsWithoutBlogs.length > 0 && (
              <Card className="mb-6 border-orange-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                    Produtos sem Blog Gerado ({productsWithoutBlogs.length})
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Produtos selecionados que ainda não possuem blogs gerados
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productsWithoutBlogs.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 p-4 border rounded-lg bg-orange-50">
                        {product.image_url && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {product.category} {product.category && '•'} {product.category || 'Sem categoria'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Produtos com blogs disponíveis */}
            {productsWithBlogs.length === 0 && productsWithoutBlogs.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum produto selecionado
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Selecione produtos no repositório para começar
                </p>
              </div>
            ) : productsWithBlogs.length > 0 && (
              <div className="space-y-4">
                {productsWithBlogs.map((product) => {
                  const prefs = preferences[product.id] || { useCommercial: false, useTechnical: false };
                  
                  return (
                    <Card key={product.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {product.image_url && (
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-5 mb-2">
                              {product.name}
                            </h4>
                            
                            {product.category && (
                              <Badge variant="secondary" className="text-xs mb-3">
                                {product.category}
                              </Badge>
                            )}

                            <div className="space-y-3">
                              {/* Header com botão de expandir */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Blogs Disponíveis</span>
                                  {(product.individual_blog_content?.commercial_links || product.individual_blog_content?.technical_links) && (
                                    <Badge variant="outline" className="text-xs">
                                      <Link className="h-3 w-3 mr-1" />
                                      Links
                                    </Badge>
                                  )}
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleProductExpanded(product.id)}
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${
                                    expandedProducts.has(product.id) ? 'rotate-180' : ''
                                  }`} />
                                </Button>
                              </div>

                              {/* Blog Comercial */}
                              {product.individual_blog_content?.commercial && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                      <div>
                                        <div className="text-sm font-medium">Blog Comercial</div>
                                        <div className="text-xs text-muted-foreground">
                                          Gerado em {formatDate(product.individual_blog_content.generated_at)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => viewBlogContent(
                                              product.individual_blog_content!.commercial!,
                                              product.name,
                                              'commercial'
                                            )}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[80vh]">
                                          <DialogHeader>
                                            <DialogTitle>{selectedBlogContent?.title}</DialogTitle>
                                          </DialogHeader>
                                          <ScrollArea className="max-h-[60vh]">
                                            <div 
                                              className="prose prose-sm max-w-none p-4"
                                              dangerouslySetInnerHTML={{ 
                                                __html: selectedBlogContent?.content
                                                  ?.replace(/#{1,6}\s/g, '')
                                                  ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                  ?.replace(/\n\n/g, '</p><p>')
                                                  ?.replace(/^/, '<p>')
                                                  ?.replace(/$/, '</p>') || ''
                                              }}
                                            />
                                          </ScrollArea>
                                        </DialogContent>
                                      </Dialog>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">Usar no Consolidado</span>
                                        <Switch
                                          checked={prefs.useCommercial}
                                          onCheckedChange={(checked) => 
                                            toggleBlogUse(product.id, 'commercial', checked)
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Links Inteligentes - Blog Comercial */}
                                  <Collapsible open={expandedProducts.has(product.id)}>
                                    <CollapsibleContent>
                                      <IntelligentLinksManager
                                        blogContent={product.individual_blog_content.commercial}
                                        existingLinks={product.individual_blog_content.commercial_links || {}}
                                        onLinksChange={(links) => updateProductLinks(product.id, 'commercial', links)}
                                        blogType="commercial"
                                        productName={product.name}
                                      />
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              )}

                              {/* Blog Técnico */}
                              {product.individual_blog_content?.technical && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-green-600" />
                                      <div>
                                        <div className="text-sm font-medium">Blog Técnico</div>
                                        <div className="text-xs text-muted-foreground">
                                          Gerado em {formatDate(product.individual_blog_content.generated_at)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => viewBlogContent(
                                              product.individual_blog_content!.technical!,
                                              product.name,
                                              'technical'
                                            )}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                      </Dialog>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">Usar no Consolidado</span>
                                        <Switch
                                          checked={prefs.useTechnical}
                                          onCheckedChange={(checked) => 
                                            toggleBlogUse(product.id, 'technical', checked)
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Links Inteligentes - Blog Técnico */}
                                  <Collapsible open={expandedProducts.has(product.id)}>
                                    <CollapsibleContent>
                                      <IntelligentLinksManager
                                        blogContent={product.individual_blog_content.technical}
                                        existingLinks={product.individual_blog_content.technical_links || {}}
                                        onLinksChange={(links) => updateProductLinks(product.id, 'technical', links)}
                                        blogType="technical"
                                        productName={product.name}
                                      />
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}