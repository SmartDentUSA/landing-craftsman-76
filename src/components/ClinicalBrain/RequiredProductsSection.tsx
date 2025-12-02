import { useState, useEffect } from 'react';
import { CheckCircle2, X, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { RequiredProduct } from './types';

interface RequiredProductsSectionProps {
  value: RequiredProduct[];
  onChange: (next: RequiredProduct[]) => void;
  currentProductId?: string;
}

interface ProductOption {
  id: string;
  name: string;
}

export default function RequiredProductsSection({ 
  value, 
  onChange, 
  currentProductId 
}: RequiredProductsSectionProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [context, setContext] = useState('');

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
    !value.some(rp => rp.product_id === p.id)
  );

  const handleAdd = () => {
    if (!selectedProduct || !context.trim()) return;
    
    const newItem: RequiredProduct = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      context: context.trim()
    };
    
    onChange([...value, newItem]);
    setSelectedProduct(null);
    setContext('');
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
        <CheckCircle2 className="h-4 w-4 text-success" />
        <Label className="text-sm font-medium">Produtos Obrigatórios</Label>
        {value.length > 0 && (
          <Badge variant="success" className="text-xs">
            {value.length}
          </Badge>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Produtos que SEMPRE devem ser mencionados junto (ex: resina + primer obrigatório)
      </p>

      {/* Add new required product */}
      <div className="flex flex-col gap-2 p-3 border border-dashed border-success/30 rounded-lg bg-success/5">
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
              placeholder="Contexto de uso (ex: Sempre usar como primer antes da aplicação)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <Button 
              size="sm" 
              variant="success"
              onClick={handleAdd}
              disabled={!context.trim()}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <Plus className="h-4 w-4" />
              Adicionar Requisito
            </Button>
          </>
        )}
      </div>

      {/* List of required products */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <Card key={index} className="p-3 bg-success/5 border-success/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.context}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
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
