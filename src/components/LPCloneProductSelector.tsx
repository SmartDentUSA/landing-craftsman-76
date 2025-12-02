import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Loader2, Check } from 'lucide-react';

export interface ProductWithSEO {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  seo_title_override: string | null;
  seo_description_override: string | null;
  canonical_url: string | null;
  keywords: string[] | null;
}

interface LPCloneProductSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectProduct: (product: ProductWithSEO) => void;
  currentProductId?: string | null;
}

export const LPCloneProductSelector = ({
  open,
  onClose,
  onSelectProduct,
  currentProductId,
}: LPCloneProductSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-lp-clone-with-seo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, brand, category, price, image_url, seo_title_override, seo_description_override, canonical_url, keywords')
        .eq('approved', true)
        .order('name');
      if (error) throw error;
      return data as ProductWithSEO[];
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

  const handleSelectProduct = (product: ProductWithSEO) => {
    onSelectProduct(product);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produto do Repositório
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
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  isSelected={product.id === currentProductId}
                  onSelect={() => handleSelectProduct(product)}
                />
              ))}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Product Item Component
const ProductItem = ({
  product,
  isSelected,
  onSelect,
}: {
  product: ProductWithSEO;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const hasSeoTitle = !!product.seo_title_override;
  const hasSeoDesc = !!product.seo_description_override;
  const hasCanonical = !!product.canonical_url;
  const hasKeywords = product.keywords && product.keywords.length > 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/10 border-primary/50'
          : 'hover:bg-muted/50 border-border'
      }`}
      onClick={onSelect}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{product.name}</p>
          {isSelected && (
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {product.brand && <span>{product.brand}</span>}
          {product.category && (
            <Badge variant="outline" className="text-xs py-0">
              {product.category}
            </Badge>
          )}
        </div>
        {/* SEO Indicators */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-xs ${hasSeoTitle ? 'text-green-600' : 'text-muted-foreground/50'}`}>
            {hasSeoTitle ? '✓' : '○'} Title
          </span>
          <span className={`text-xs ${hasSeoDesc ? 'text-green-600' : 'text-muted-foreground/50'}`}>
            {hasSeoDesc ? '✓' : '○'} Desc
          </span>
          <span className={`text-xs ${hasCanonical ? 'text-green-600' : 'text-muted-foreground/50'}`}>
            {hasCanonical ? '✓' : '○'} URL
          </span>
          <span className={`text-xs ${hasKeywords ? 'text-green-600' : 'text-muted-foreground/50'}`}>
            {hasKeywords ? '✓' : '○'} KW
          </span>
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
