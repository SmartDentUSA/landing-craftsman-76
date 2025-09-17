import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Star, DollarSign, Filter, Eye, EyeOff } from "lucide-react";
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
  keywords?: string[];
  benefits?: string[];
  features?: string[];
}

interface ProductRepositoryPanelProps {
  landingPageId: string;
  onProductSelectionChange: (selectedProducts: Product[]) => void;
  className?: string;
}

export function ProductRepositoryPanel({ 
  landingPageId, 
  onProductSelectionChange, 
  className 
}: ProductRepositoryPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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

      const formattedProducts: Product[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        currency: item.currency || 'BRL',
        category: item.category,
        image_url: item.image_url,
        product_url: item.product_url,
        use_in_ai_generation: item.use_in_ai_generation ?? true,
        keywords: Array.isArray(item.keywords) ? item.keywords.filter((k): k is string => typeof k === 'string') : [],
        benefits: Array.isArray(item.benefits) ? item.benefits.filter((b): b is string => typeof b === 'string') : [],
        features: Array.isArray(item.features) ? item.features.filter((f): f is string => typeof f === 'string') : []
      }));

      setProducts(formattedProducts);
      
      // Auto-select products that are enabled for AI generation
      const autoSelected = new Set(
        formattedProducts
          .filter(p => p.use_in_ai_generation)
          .map(p => p.id)
      );
      setSelectedProductIds(autoSelected);

    } catch (error: any) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
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

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Repositório de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Carregando produtos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Repositório de Produtos
          <Badge variant="outline" className="ml-auto">
            {selectedProductIds.size} de {products.length}
          </Badge>
        </CardTitle>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Preço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos preços</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="low">Até R$ 100</SelectItem>
                <SelectItem value="medium">R$ 100 - R$ 500</SelectItem>
                <SelectItem value="high">Acima de R$ 500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllProducts}
              className="gap-2"
            >
              {selectedProductIds.size === filteredProducts.length ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Desmarcar todos
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Marcar todos
                </>
              )}
            </Button>
            
            <Badge variant="secondary">
              {filteredProducts.length} produtos
            </Badge>
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
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedProductIds.has(product.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleProductSelection(product.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="mt-1"
                      />
                      
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