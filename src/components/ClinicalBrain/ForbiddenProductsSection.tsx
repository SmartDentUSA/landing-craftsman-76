import { useState, useEffect } from 'react';
import { Ban, X, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { ForbiddenProduct } from './types';

interface ForbiddenProductsSectionProps {
  value: ForbiddenProduct[];
  onChange: (next: ForbiddenProduct[]) => void;
  currentProductId?: string;
}

interface ProductOption {
  id: string;
  name: string;
}

export default function ForbiddenProductsSection({ 
  value, 
  onChange, 
  currentProductId 
}: ForbiddenProductsSectionProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name')
        .eq('approved', true)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableProducts = products.filter(p => 
    p.id !== currentProductId && 
    !value.some(fp => fp.product_id === p.id)
  );

  const handleAdd = () => {
    if (!selectedProduct || !reason.trim()) return;
    
    const newItem: ForbiddenProduct = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      reason: reason.trim()
    };
    
    onChange([...value, newItem]);
    setSelectedProduct(null);
    setReason('');
    setOpen(false);
  };

  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ban className="h-4 w-4 text-destructive" />
        <Label className="text-sm font-medium">Produtos Proibidos</Label>
        {value.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {value.length}
          </Badge>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Produtos que NUNCA devem ser recomendados junto com este (incompatibilidades clínicas)
      </p>

      {/* Add new forbidden product */}
      <div className="flex flex-col gap-2 p-3 border border-dashed border-destructive/30 rounded-lg bg-destructive/5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <Search className="mr-2 h-4 w-4" />
              {selectedProduct ? selectedProduct.name : 'Buscar produto...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar produto..." />
              <CommandList>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {availableProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => {
                        setSelectedProduct(product);
                        setOpen(false);
                      }}
                    >
                      {product.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedProduct && (
          <>
            <Input
              placeholder="Motivo da incompatibilidade (ex: Reação química adversa)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button 
              size="sm" 
              variant="destructive"
              onClick={handleAdd}
              disabled={!reason.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Restrição
            </Button>
          </>
        )}
      </div>

      {/* List of forbidden products */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <Card key={index} className="p-3 bg-destructive/5 border-destructive/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
