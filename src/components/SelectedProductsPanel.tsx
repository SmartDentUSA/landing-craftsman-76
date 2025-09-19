import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Package, GripVertical, ExternalLink, Edit, Eye, Settings } from "lucide-react";
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
  display_order?: number;
}

interface SelectedProductsPanelProps {
  landingPageId: string;
  selectedProductIds: string[];
  onOrderChange: (newOrder: string[]) => void;
  onEditInRepository: (productId: string) => void;
  className?: string;
}

export function SelectedProductsPanel({ 
  landingPageId, 
  selectedProductIds,
  onOrderChange,
  onEditInRepository,
  className
}: SelectedProductsPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedProductIds.length > 0) {
      loadSelectedProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [selectedProductIds]);

  const loadSelectedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', selectedProductIds);

      if (error) throw error;

      // Order products according to selectedProductIds order
      const orderedProducts = selectedProductIds
        .map(id => data?.find(p => p.id === id))
        .filter(Boolean) as Product[];
      
      setProducts(orderedProducts);
    } catch (error) {
      console.error('Error loading selected products:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos selecionados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedProductIds);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onOrderChange(items);
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
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Carregando produtos selecionados...</span>
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
            <Eye className="h-5 w-5" />
            Produtos Selecionados para Landing Page
          </CardTitle>
          
          <div className="text-sm text-muted-foreground">
            Produtos que aparecerão na seção de ofertas. Arraste para reordenar.
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {products.length} produto{products.length !== 1 ? 's' : ''} selecionado{products.length !== 1 ? 's' : ''}
            </Badge>
            
            {products.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Arraste os itens para reordenar
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum produto selecionado
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Use a aba "Ofertas" para selecionar produtos
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="selected-products">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {products.map((product, index) => (
                        <Draggable
                          key={product.id}
                          draggableId={product.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-all duration-200 ${
                                snapshot.isDragging 
                                  ? 'shadow-lg rotate-1 ring-2 ring-primary' 
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-[2rem]">
                                    #{index + 1}
                                  </div>
                                  
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
                                        
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          {product.category && (
                                            <Badge variant="secondary" className="text-xs px-2 py-0">
                                              {product.category}
                                            </Badge>
                                          )}
                                          
                                          {product.price !== undefined && (
                                            <Badge variant="outline" className="text-xs px-2 py-0">
                                              {formatPrice(product.price, product.currency)}
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
                                      onClick={() => onEditInRepository(product.id)}
                                      className="h-8 w-8 p-0"
                                      title="Editar no repositório"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    
                                    {product.product_url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(product.product_url, '_blank')}
                                        className="h-8 w-8 p-0"
                                        title="Ver produto"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}