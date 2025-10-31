import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Video {
  url: string;
  title?: string;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  youtube_videos?: Video[];
  instagram_videos?: Video[];
  testimonial_videos?: Video[];
  technical_videos?: Video[];
  tiktok_videos?: Video[];
}

interface ConsolidatedProductVideosListProps {
  productIds: string[];
  onInsert: (text: string) => void;
}

export const ConsolidatedProductVideosList = ({ 
  productIds, 
  onInsert 
}: ConsolidatedProductVideosListProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [insertCount, setInsertCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProductsVideos();
  }, [productIds]);

  const fetchProductsVideos = async () => {
    if (!productIds || productIds.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, youtube_videos, instagram_videos, testimonial_videos, technical_videos, tiktok_videos')
        .in('id', productIds);

      if (error) throw error;
      
      // Type cast to handle Supabase JSONB columns
      setProducts((data || []) as unknown as Product[]);
    } catch (error: any) {
      toast({
        title: '❌ Erro ao buscar vídeos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = (url: string, title: string) => {
    const nextNumber = insertCount + 1;
    onInsert(`\n\n${nextNumber}) ${title}: ${url}`);
    setInsertCount(nextNumber);
    
    toast({
      title: '✅ Vídeo inserido',
      description: `Link #${nextNumber} adicionado à mensagem`,
    });
  };

  const getTotalVideosCount = (product: Product) => {
    return (
      (product.youtube_videos?.length || 0) +
      (product.technical_videos?.length || 0) +
      (product.testimonial_videos?.length || 0) +
      (product.instagram_videos?.length || 0) +
      (product.tiktok_videos?.length || 0)
    );
  };

  const renderVideoCategory = (
    videos: Video[] | undefined,
    categoryName: string,
    emoji: string
  ) => {
    if (!videos || videos.length === 0) return null;

    return (
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium text-muted-foreground">
          {emoji} {categoryName}
        </p>
        {videos.map((video, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {video.title || video.description || `Vídeo ${categoryName} ${idx + 1}`}
              </p>
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate block max-w-md"
              >
                {video.url}
              </a>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleInsert(video.url, video.title || video.description || `Vídeo ${categoryName}`)}
            >
              Inserir
            </Button>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando vídeos...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum produto vinculado ou sem vídeos disponíveis
        </p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {products.map(product => {
        const totalVideos = getTotalVideosCount(product);
        
        if (totalVideos === 0) return null;

        return (
          <AccordionItem key={product.id} value={product.id}>
            <AccordionTrigger>
              <div className="flex items-center gap-2 w-full justify-between pr-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">{product.name}</span>
                </div>
                <Badge variant="secondary" className="ml-auto mr-2">
                  {totalVideos} vídeos
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-3">
              {renderVideoCategory(product.youtube_videos, 'YouTube', '🎥')}
              {renderVideoCategory(product.technical_videos, 'Técnicos', '🔧')}
              {renderVideoCategory(product.testimonial_videos, 'Depoimentos', '💬')}
              {renderVideoCategory(product.instagram_videos, 'Instagram', '📸')}
              {renderVideoCategory(product.tiktok_videos, 'TikTok', '🎵')}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
