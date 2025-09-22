import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, ExternalLink, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  product_url?: string;
}

interface SelectedProductLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onInsertLink: (url: string, text: string) => void;
}

export const SelectedProductLinkModal: React.FC<SelectedProductLinkModalProps> = ({
  open,
  onOpenChange,
  selectedProducts,
  onInsertLink
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalText, setExternalText] = useState('');

  // Debug dos produtos recebidos
  useEffect(() => {
    if (open) {
      console.log('🔗 SelectedProductLinkModal - Modal aberto com produtos:', {
        selectedProducts,
        totalProdutos: selectedProducts?.length || 0
      });
    }
  }, [open, selectedProducts]);

  const filteredProducts = selectedProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInsertProductLink = (product: Product) => {
    const url = product.product_url || `#produto-${product.id}`;
    const text = product.name;
    onInsertLink(url, text);
    onOpenChange(false);
    toast({
      title: "Link inserido!",
      description: `Link para "${product.name}" adicionado com sucesso.`
    });
  };

  const handleInsertExternalLink = () => {
    if (!externalUrl || !externalText) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a URL e o texto do link.",
        variant: "destructive"
      });
      return;
    }

    onInsertLink(externalUrl, externalText);
    onOpenChange(false);
    setExternalUrl('');
    setExternalText('');
    toast({
      title: "Link inserido!",
      description: `Link externo "${externalText}" adicionado com sucesso.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inserir Link de Produto</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos Selecionados
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Link Externo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {selectedProducts.length > 0 ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nos produtos selecionados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleInsertProductLink(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{product.name}</h4>
                            {product.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {product.price && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.currency || 'R$'} {product.price}
                                </Badge>
                              )}
                              {product.product_url && (
                                <Badge variant="outline" className="text-xs">
                                  Link disponível
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredProducts.length === 0 && searchTerm && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado nos produtos selecionados.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto selecionado na landing page.</p>
                <p className="text-sm mt-2">Selecione produtos no Editor para poder inserir links aqui.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="external" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="external-url">URL</Label>
                <Input
                  id="external-url"
                  placeholder="https://exemplo.com"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="external-text">Texto do Link</Label>
                <Input
                  id="external-text"
                  placeholder="Texto que aparecerá como link"
                  value={externalText}
                  onChange={(e) => setExternalText(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleInsertExternalLink}
                className="w-full"
                disabled={!externalUrl || !externalText}
              >
                Inserir Link Externo
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};