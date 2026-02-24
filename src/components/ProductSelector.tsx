import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, DollarSign, Eye, EyeOff, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

interface ProductSelectorProps {
  landingPageId: string;
  selectedProductIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  className?: string;
}

export function ProductSelector({ 
  landingPageId, 
  selectedProductIds,
  onSelectionChange,
  className
}: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load approved products for AI generation
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

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .eq('approved', true)
        .eq('use_in_ai_generation', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const formattedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        currency: item.currency || 'BRL',
        category: item.category || '',
        image_url: item.image_url || '',
        product_url: item.product_url || '',
        use_in_ai_generation: item.use_in_ai_generation ?? true,
        approved: item.approved ?? true,
      }));
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos disponíveis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    
    onSelectionChange(newSelection);
  };

  const toggleAllProducts = () => {
    const allVisible = filteredProducts.map(p => p.id);
    const allSelected = allVisible.every(id => selectedProductIds.includes(id));
    
    if (allSelected) {
      // Remove all visible from selection
      const newSelection = selectedProductIds.filter(id => !allVisible.includes(id));
      onSelectionChange(newSelection);
    } else {
      // Add all visible to selection
      const newSelection = [...new Set([...selectedProductIds, ...allVisible])];
      onSelectionChange(newSelection);
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return categories.sort();
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (price === 0) return "Pedir orçamento";
    if (!price) return "Gratuito";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(price);
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
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produtos para Ofertas
          </CardTitle>
          
          <div className="text-sm text-muted-foreground">
            Escolha os produtos que aparecerão na seção de ofertas desta landing page.
            Os produtos são gerenciados na aba "Repositório".
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
            <div className="flex gap-2 items-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {getUniqueCategories().filter(category => category && category.trim() !== '').map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllProducts}
                className="gap-2"
              >
                {filteredProducts.every(p => selectedProductIds.includes(p.id)) ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {filteredProducts.every(p => selectedProductIds.includes(p.id)) ? 'Desmarcar' : 'Marcar'} Todos
              </Button>
              
              <Badge variant="secondary">
                {selectedProductIds.length} de {filteredProducts.length} selecionados
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
                  {searchTerm || categoryFilter !== "all"
                    ? "Nenhum produto encontrado com os filtros aplicados"
                    : "Nenhum produto aprovado para ofertas"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Gerencie produtos na aba "Repositório"
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className={`transition-all duration-200 cursor-pointer ${
                    selectedProductIds.includes(product.id)
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleProductSelection(product.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => {}} // Controlled by parent click
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
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
                              <div className="flex items-center gap-2 flex-wrap">
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
                              
                              {product.product_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(product.product_url, '_blank');
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}