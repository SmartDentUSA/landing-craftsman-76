import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useSelectedProducts } from '@/hooks/useSelectedProducts';
import { Loader2, ImageOff } from 'lucide-react';

interface ProductImageSelectorProps {
  productIds: string[];
  selectedImageUrls: string[];
  onSelectionChange: (urls: string[]) => void;
}

interface ProductWithImage {
  id: string;
  name: string;
  image_url: string;
}

export function ProductImageSelector({
  productIds,
  selectedImageUrls,
  onSelectionChange
}: ProductImageSelectorProps) {
  const [products, setProducts] = useState<ProductWithImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { loadProductsByIds } = useSelectedProducts();

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const loadedProducts = await loadProductsByIds(productIds);
        
        // Filtrar apenas produtos com image_url válida
        const productsWithImages = loadedProducts
          .filter(p => p.image_url && p.image_url.trim() !== '')
          .map(p => ({
            id: p.id,
            name: p.name,
            image_url: p.image_url
          }));

        setProducts(productsWithImages);

        // Auto-selecionar todas as imagens por padrão se nada estiver selecionado
        if (selectedImageUrls.length === 0 && productsWithImages.length > 0) {
          onSelectionChange(productsWithImages.map(p => p.image_url));
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productIds.length > 0) {
      loadProducts();
    }
  }, [productIds]);

  const handleToggle = (imageUrl: string) => {
    const isSelected = selectedImageUrls.includes(imageUrl);
    
    if (isSelected) {
      onSelectionChange(selectedImageUrls.filter(url => url !== imageUrl));
    } else {
      onSelectionChange([...selectedImageUrls, imageUrl]);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando imagens dos produtos...</span>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border-2 border-dashed border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <ImageOff className="h-10 w-10 text-yellow-600 dark:text-yellow-500 mb-3" />
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Nenhum produto com imagem
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2 max-w-md">
            Os produtos selecionados não possuem imagens. Adicione imagens aos produtos no repositório para gerar banners com IA.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Selecione as imagens para a IA usar:</p>
        <Badge variant="secondary">
          {selectedImageUrls.length}/{products.length} selecionadas
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((product) => {
          const isSelected = selectedImageUrls.includes(product.image_url);
          
          return (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleToggle(product.image_url)}
            >
              <CardContent className="p-3">
                <div className="relative aspect-square mb-2 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md p-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(product.image_url)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <p className="text-xs font-medium truncate">{product.name}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedImageUrls.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          ⚠️ Selecione pelo menos 1 imagem para gerar o banner
        </p>
      )}
    </div>
  );
}
