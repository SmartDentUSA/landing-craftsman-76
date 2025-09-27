import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSelectedProducts } from '@/hooks/useSelectedProducts';
import { useLinksRepository } from '@/hooks/useLinksRepository';
import { toast } from '@/hooks/use-toast';
import { Search, ExternalLink, Package, Globe, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  product_url?: string;
}

interface ProductLinkModalProps {
  children: React.ReactNode;
  onInsertLink: (url: string, text: string) => void;
}

export const ProductLinkModal: React.FC<ProductLinkModalProps> = ({
  children,
  onInsertLink
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalText, setExternalText] = useState('');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [linkText, setLinkText] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { loadProductsByIds } = useSelectedProducts();
  const { allLinks } = useLinksRepository();

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Load all products from repository
      const { data: allProducts, error } = await supabase
        .from('products_repository')
        .select('id, name, description, price, currency, image_url, product_url')
        .eq('approved', true)
        .order('name');

      if (error) throw error;
      setProducts(allProducts || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInsertProductLink = (product: Product) => {
    const url = product.product_url || `#produto-${product.id}`;
    const text = product.name;
    onInsertLink(url, text);
    setOpen(false);
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
    setOpen(false);
    setExternalUrl('');
    setExternalText('');
    toast({
      title: "Link inserido!",
      description: `Link externo "${externalText}" adicionado com sucesso.`
    });
  };

  const handleInsertCentralizedLink = () => {
    const selectedLink = allLinks.find(link => link.id === selectedLinkId);
    if (!selectedLink) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um link.",
        variant: "destructive"
      });
      return;
    }

    onInsertLink(selectedLink.url, linkText || selectedLink.name);
    setSelectedLinkId('');
    setLinkText('');
    setOpen(false);
    toast({
      title: "Link inserido!",
      description: `Link "${selectedLink.name}" adicionado com sucesso.`
    });
  };

  const getCategoryIcon = (type: 'internal' | 'external') => {
    return type === 'internal' ? Globe : Link;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'landing-page': 'bg-green-100 text-green-800',
      produto: 'bg-blue-100 text-blue-800',
      empresa: 'bg-green-100 text-green-800',
      parceiro: 'bg-purple-100 text-purple-800',
      recurso: 'bg-orange-100 text-orange-800',
      documentacao: 'bg-gray-100 text-gray-800',
      outro: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category as keyof typeof colors] || colors.outro;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inserir Link</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="centralized" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="centralized" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Links Centralizados
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Link Personalizado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="centralized" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="centralized-link">URL de Destino</Label>
                <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um link..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allLinks.map((link) => {
                      const Icon = getCategoryIcon(link.type);
                      return (
                        <SelectItem key={link.id} value={link.id}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{link.name}</span>
                            <Badge className={getCategoryColor(link.category)} variant="outline">
                              {link.category === 'landing-page' ? 'Interno' : link.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedLinkId && (
                  <p className="text-sm text-muted-foreground">
                    {allLinks.find(l => l.id === selectedLinkId)?.url}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="centralized-text">Texto do Link (opcional)</Label>
                <Input
                  id="centralized-text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Deixe vazio para usar o nome do link"
                />
              </div>

              <Button
                onClick={handleInsertCentralizedLink}
                disabled={!selectedLinkId}
                className="w-full"
              >
                Inserir Link
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando produtos...</div>
            ) : (
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
                
                {filteredProducts.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.'}
                  </div>
                )}
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