import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Star, DollarSign, Filter, Eye, EyeOff, RefreshCw, RotateCcw, Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProductSync } from "@/hooks/useProductSync";
import useLandingPages from "@/hooks/useLandingPages";
import { ProductEditModal } from "@/components/ProductEditModal";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  image_url?: string;
  product_url?: string;
  use_in_ai_generation: boolean;
  approved: boolean;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
}

interface ProductRepositoryPanelProps {
  landingPageId: string;
  onProductSelectionChange: (selectedProducts: Product[]) => void;
  className?: string;
  onSyncTriggered?: () => void;
}

export function ProductRepositoryPanel({ 
  landingPageId, 
  onProductSelectionChange, 
  className,
  onSyncTriggered 
}: ProductRepositoryPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const { migrateExistingOffers, syncOffersToRepository } = useProductSync();
  const { getLandingPage } = useLandingPages();

  // Load products from repository
  useEffect(() => {
    loadProducts();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter(product => {
        if (!product.price) return priceFilter === "free";
        if (priceFilter === "free") return product.price === 0;
        if (priceFilter === "low") return product.price > 0 && product.price <= 100;
        if (priceFilter === "medium") return product.price > 100 && product.price <= 500;
        if (priceFilter === "high") return product.price > 500;
        return true;
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, priceFilter]);

  // Update selection callback
  useEffect(() => {
    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
    onProductSelectionChange(selectedProducts);
  }, [selectedProductIds, products, onProductSelectionChange]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .eq('approved', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const formattedProducts: Product[] = (data || []).map(data => ({
        id: data.id,
        name: data.name,
        description: data.description || '',
        price: data.price || 0,
        currency: data.currency || 'BRL',
        category: data.category || '',
        image_url: data.image_url || '',
        product_url: data.product_url || '',
        use_in_ai_generation: data.use_in_ai_generation ?? true,
        approved: data.approved ?? true,
        keywords: Array.isArray(data.keywords) ? data.keywords.map(k => String(k)) : [],
        benefits: Array.isArray(data.benefits) ? data.benefits.map(b => String(b)) : [],
        features: Array.isArray(data.features) ? data.features.map(f => String(f)) : []
      }));
      
      setProducts(formattedProducts);

      // Auto-select products marked for AI generation
      const aiProducts = formattedProducts.filter(p => p.use_in_ai_generation);
      setSelectedProductIds(new Set(aiProducts.map(p => p.id)));

    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos do repositório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleAllProducts = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return categories.sort();
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "Gratuito";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(price);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = (savedProduct: Product) => {
    setProducts(prev => {
      const existing = prev.find(p => p.id === savedProduct.id);
      if (existing) {
        return prev.map(p => p.id === savedProduct.id ? savedProduct : p);
      } else {
        return [...prev, savedProduct];
      }
    });
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
  };

  const handleSyncOffers = async () => {
    if (!landingPageId) return;

    setIsSyncing(true);
    try {
      // Get current landing page data
      const landingPage = getLandingPage(landingPageId);
      if (!landingPage?.data?.schema?.offers) {
        // Try to migrate existing data first
        await migrateExistingOffers(landingPageId);
      } else {
        // Sync current offers
        await syncOffersToRepository(landingPageId, landingPage.data.schema.offers);
      }
      
      // Reload products after sync
      await loadProducts();
      onSyncTriggered?.();
      
    } catch (error) {
      console.error('Error syncing offers:', error);
      toast({
        title: "Erro",
        description: "Erro ao sincronizar ofertas",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Carregando produtos...</span>
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
              <Package className="h-5 w-5" />
              Repositório de Produtos
            </CardTitle>
          </div>
          
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {getUniqueCategories().map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Preço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="low">Até R$ 100</SelectItem>
                  <SelectItem value="medium">R$ 100-500</SelectItem>
                  <SelectItem value="high">Acima R$ 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllProducts}
                className="gap-2"
              >
                {selectedProductIds.size === filteredProducts.length ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {selectedProductIds.size === filteredProducts.length ? 'Desmarcar' : 'Marcar'} Todos
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncOffers}
                disabled={isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Sincronizar
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleAddProduct}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
              
              <Badge variant="secondary">
                {filteredProducts.length} produtos
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 p-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== "all" || priceFilter !== "all"
                    ? "Nenhum produto encontrado com os filtros aplicados"
                    : "Nenhum produto no repositório"}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className={`transition-all duration-200 ${
                    selectedProductIds.has(product.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedProductIds.has(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                        className="mt-1"
                      />
                      
                      <div className="cursor-pointer flex-1 min-w-0" onClick={() => toggleProductSelection(product.id)}>
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
                            <h4 className="font-medium text-sm leading-5 truncate">
                              {product.name}
                            </h4>
                            
                            {product.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                {product.category && (
                                  <Badge variant="secondary" className="text-xs px-2 py-0">
                                    {product.category}
                                  </Badge>
                                )}
                                
                                {product.price !== undefined && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <DollarSign className="h-3 w-3" />
                                    {formatPrice(product.price, product.currency)}
                                  </div>
                                )}
                              </div>
                              
                              {selectedProductIds.has(product.id) && (
                                <Badge variant="default" className="text-xs">
                                  Ativo no preview
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Tem certeza que deseja excluir este produto?')) {
                              handleDeleteProduct(product.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <ProductEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
      />
    </Card>
  );
}