import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Loader2, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
}

interface LPCloneProductSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  onSelectProducts: (ids: string[]) => void;
}

export const LPCloneProductSelector = ({
  open,
  onClose,
  selectedProductIds,
  onSelectProducts,
}: LPCloneProductSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedProductIds);

  // Sync with external state when dialog opens
  useState(() => {
    setSelectedIds(selectedProductIds);
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-lp-clone'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, brand, category, price, image_url')
        .eq('approved', true)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const selectedProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  const unselectedProducts = useMemo(() => {
    return filteredProducts.filter((p) => !selectedIds.includes(p.id));
  }, [filteredProducts, selectedIds]);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSelectProducts(selectedIds);
    onClose();
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vincular Produtos à LP Clone
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, marca ou categoria..."
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Selecionados ({selectedProducts.length})
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <ProductItem
                      key={product.id}
                      product={product}
                      isSelected={true}
                      onToggle={() => toggleProduct(product.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unselected Products */}
            <div>
              {selectedProducts.length > 0 && (
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Disponíveis ({unselectedProducts.length})
                </p>
              )}
              <div className="space-y-2">
                {unselectedProducts.map((product) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    isSelected={false}
                    onToggle={() => toggleProduct(product.id)}
                  />
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum produto encontrado</p>
              </div>
            )}
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar ({selectedIds.length} produtos)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Product Item Component
const ProductItem = ({
  product,
  isSelected,
  onToggle,
}: {
  product: Product;
  isSelected: boolean;
  onToggle: () => void;
}) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/5 border-primary/30'
          : 'hover:bg-muted/50 border-border'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {product.brand && <span>{product.brand}</span>}
          {product.category && (
            <Badge variant="outline" className="text-xs py-0">
              {product.category}
            </Badge>
          )}
        </div>
      </div>

      {product.price && (
        <span className="text-sm font-medium text-muted-foreground">
          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )}
    </div>
  );
};
