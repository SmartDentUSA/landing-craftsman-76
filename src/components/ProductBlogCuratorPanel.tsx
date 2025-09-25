import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Sparkles, Eye, Package, Settings } from "lucide-react";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";

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
  const [preferences, setPreferences] = useState<BlogConsolidationPreferences>({});
  const [selectedBlogContent, setSelectedBlogContent] = useState<{ content: string; title: string } | null>(null);
  
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
    // Carregar preferências do localStorage
    const savedPrefs = localStorage.getItem('blog-consolidation-preferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  useEffect(() => {
    // Salvar preferências no localStorage e notificar parent
    localStorage.setItem('blog-consolidation-preferences', JSON.stringify(preferences));
    onPreferencesChange(preferences);
  }, [preferences, onPreferencesChange]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const loadedProducts = await loadProductsByIds(selectedProductIds);
      setProducts(loadedProducts);
    } finally {
      setLoading(false);
    }
  };

  const productsWithBlogs = products.filter(product => 
    product.individual_blog_content?.commercial || product.individual_blog_content?.technical
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
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Curadoria de Blogs dos Produtos
          </CardTitle>
          
          <div className="text-sm text-muted-foreground">
            Selecione quais blogs individuais serão incluídos no blog consolidado.
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {productsWithBlogs.length} produto{productsWithBlogs.length !== 1 ? 's' : ''} com blog{productsWithBlogs.length !== 1 ? 's' : ''}
            </Badge>
            
            <Badge variant="default">
              {getActiveBlogsCount()} blog{getActiveBlogsCount() !== 1 ? 's' : ''} ativo{getActiveBlogsCount() !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4">
            {productsWithBlogs.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum produto selecionado possui blogs gerados
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Use o gerador de blogs individuais nos produtos primeiro
                </p>
              </div>
            ) : (
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
                              {/* Blog Comercial */}
                              {product.individual_blog_content?.commercial && (
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
                              )}

                              {/* Blog Técnico */}
                              {product.individual_blog_content?.technical && (
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