import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Package, X, Search, Shield } from "lucide-react";

export interface RelatedProduct {
  product_id: string;
  product_name: string;
  role: 'acessorio' | 'consumivel';
}

interface WorkflowProductSelectorProps {
  stageKey: string;
  currentProductId?: string;
  selectedProducts: RelatedProduct[];
  onChange: (products: RelatedProduct[]) => void;
}

export function WorkflowProductSelector({
  stageKey,
  currentProductId,
  selectedProducts,
  onChange
}: WorkflowProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch approved products
  const { data: products = [] } = useQuery({
    queryKey: ['workflow-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, image_url, category')
        .eq('approved', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filter out current product and already selected products
  const availableProducts = useMemo(() => {
    const selectedIds = new Set(selectedProducts.map(p => p.product_id));
    return products.filter(p => 
      p.id !== currentProductId && 
      !selectedIds.has(p.id) &&
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [products, currentProductId, selectedProducts, search]);

  const handleAddProduct = (productId: string, productName: string) => {
    const newProduct: RelatedProduct = {
      product_id: productId,
      product_name: productName,
      role: 'acessorio' // Default role
    };
    onChange([...selectedProducts, newProduct]);
    setOpen(false);
    setSearch("");
  };

  const handleRemoveProduct = (productId: string) => {
    onChange(selectedProducts.filter(p => p.product_id !== productId));
  };

  const handleRoleChange = (productId: string, role: 'acessorio' | 'consumivel') => {
    onChange(selectedProducts.map(p => 
      p.product_id === productId ? { ...p, role } : p
    ));
  };

  const acessorios = selectedProducts.filter(p => p.role === 'acessorio');
  const consumiveis = selectedProducts.filter(p => p.role === 'consumivel');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Produtos do Portfólio nesta Etapa
        </Label>
        <Badge variant="outline" className="text-xs gap-1">
          <Shield className="h-3 w-3" />
          Anti-Alucinação IA
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Selecione produtos que trabalham juntos nesta etapa. O produto atual será sempre o principal.
      </p>

      {/* Product Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Search className="h-4 w-4" />
            Buscar produtos para adicionar...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar por nome..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
              <CommandGroup heading="Produtos Disponíveis">
                {availableProducts.slice(0, 10).map(product => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => handleAddProduct(product.id, product.name)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt="" 
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        {product.category && (
                          <div className="text-xs text-muted-foreground">{product.category}</div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Products List */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
          {/* Acessórios */}
          {acessorios.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Acessórios</div>
              {acessorios.map(product => (
                <ProductItem 
                  key={product.product_id}
                  product={product}
                  products={products}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemoveProduct}
                />
              ))}
            </div>
          )}

          {/* Consumíveis */}
          {consumiveis.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Consumíveis</div>
              {consumiveis.map(product => (
                <ProductItem 
                  key={product.product_id}
                  product={product}
                  products={products}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemoveProduct}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedProducts.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">
          Nenhum produto relacionado selecionado
        </div>
      )}
    </div>
  );
}

interface ProductItemProps {
  product: RelatedProduct;
  products: { id: string; name: string; image_url: string | null }[];
  onRoleChange: (productId: string, role: 'acessorio' | 'consumivel') => void;
  onRemove: (productId: string) => void;
}

function ProductItem({ product, products, onRoleChange, onRemove }: ProductItemProps) {
  const productData = products.find(p => p.id === product.product_id);
  
  return (
    <div className="flex items-center gap-2 bg-background rounded p-2">
      {productData?.image_url ? (
        <img 
          src={productData.image_url} 
          alt="" 
          className="h-8 w-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{product.product_name}</div>
      </div>
      
      <Select 
        value={product.role} 
        onValueChange={(value: 'acessorio' | 'consumivel') => onRoleChange(product.product_id, value)}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="acessorio">Acessório</SelectItem>
          <SelectItem value="consumivel">Consumível</SelectItem>
        </SelectContent>
      </Select>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(product.product_id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
