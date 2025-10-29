import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
}

interface SpinProductSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  onSelectProducts: (productIds: string[]) => void;
}

export function SpinProductSelector({
  open,
  onClose,
  selectedProductIds,
  onSelectProducts
}: SpinProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedProductIds);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-spin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, price, image_url, category, description')
        .eq('approved', true)
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: open
  });

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProducts = products?.filter(p => selectedIds.includes(p.id)) || [];
  const unselectedProducts = filteredProducts?.filter(p => !selectedIds.includes(p.id)) || [];

  const toggleProduct = (productId: string) => {
    setSelectedIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSave = () => {
    onSelectProducts(selectedIds);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Produtos para a Solução SPIN</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{selectedIds.length} produto(s) selecionado(s)</span>
            {selectedIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Limpar seleção
              </Button>
            )}
          </div>

          {/* Products List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando produtos...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Products First */}
                {selectedProducts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-primary">
                      Produtos Selecionados
                    </h4>
                    {selectedProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSelected={true}
                        onToggle={() => toggleProduct(product.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Unselected Products */}
                {unselectedProducts.length > 0 && (
                  <div className="space-y-2">
                    {selectedProducts.length > 0 && (
                      <h4 className="font-semibold text-sm text-muted-foreground mt-4">
                        Outros Produtos
                      </h4>
                    )}
                    {unselectedProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSelected={false}
                        onToggle={() => toggleProduct(product.id)}
                      />
                    ))}
                  </div>
                )}

                {filteredProducts?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Seleção
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductCard({ 
  product, 
  isSelected, 
  onToggle 
}: { 
  product: Product; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  return (
    <div 
      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      
      {product.image_url && (
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-12 h-12 object-cover rounded"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{product.name}</h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {product.category && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {product.category}
            </span>
          )}
          {product.price && (
            <span className="font-semibold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
