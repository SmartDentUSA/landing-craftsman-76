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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Check, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  image_url: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  keywords: string[] | null;
  market_keywords: string[] | null;
  benefits: string[] | null;
  features: string[] | null;
}

interface LPCloneProductSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
}

export function LPCloneProductSelector({
  open,
  onClose,
  selectedProduct,
  onSelectProduct,
}: LPCloneProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-lp-clone'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, brand, price, image_url, category, subcategory, description, keywords, market_keywords, benefits, features')
        .eq('approved', true)
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  // Extract unique categories
  const categories = [...new Set(products?.map(p => p.category).filter(Boolean))] as string[];

  const filteredProducts = products?.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  const handleClear = () => {
    onSelectProduct(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produto do Repositório
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, marca ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              Todas
            </Badge>
            {categories.slice(0, 8).map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedProduct.name}</span>
                {selectedProduct.brand && (
                  <Badge variant="secondary" className="text-xs">{selectedProduct.brand}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Products List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando produtos...
              </div>
            ) : filteredProducts?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts?.map(product => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedProduct?.id === product.id 
                        ? 'bg-primary/5 border-primary ring-1 ring-primary/20' 
                        : ''
                    }`}
                    onClick={() => handleSelect(product)}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded-lg bg-muted"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {product.brand && (
                          <Badge variant="outline" className="text-xs">
                            {product.brand}
                          </Badge>
                        )}
                        {product.category && (
                          <span className="text-xs">{product.category}</span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      {product.price && (
                        <span className="font-semibold text-primary">
                          R$ {product.price.toLocaleString('pt-BR')}
                        </span>
                      )}
                      {selectedProduct?.id === product.id && (
                        <Check className="h-5 w-5 text-primary ml-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredProducts?.length || 0} produto(s) disponível(is)
            </p>
            <div className="flex gap-2">
              {selectedProduct && (
                <Button variant="outline" onClick={handleClear}>
                  Limpar Seleção
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
