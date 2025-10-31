import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Video, Check, Trash2, Info, Loader2 } from 'lucide-react';

interface VideoItem {
  url: string;
  title?: string;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  youtube_videos?: VideoItem[];
  instagram_videos?: VideoItem[];
  testimonial_videos?: VideoItem[];
  technical_videos?: VideoItem[];
  tiktok_videos?: VideoItem[];
}

interface VideoSelectorForLandingPageProps {
  productIds: string[];
  selectedVideoUrl?: string;
  selectedVideoTitle?: string;
  onSelectVideo: (url: string, title: string) => void;
  onRemoveVideo: () => void;
}

export const VideoSelectorForLandingPage = ({
  productIds,
  selectedVideoUrl,
  selectedVideoTitle,
  onSelectVideo,
  onRemoveVideo,
}: VideoSelectorForLandingPageProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [productIds]);

  const fetchProducts = async () => {
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
      setProducts((data || []) as unknown as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
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

  const VideoCard = ({ video, type, isSelected, onSelect }: any) => (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {type}
          </Badge>
          <p className="text-sm font-medium">
            {video.title || video.description || `Vídeo ${type}`}
          </p>
        </div>
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
        variant={isSelected ? "default" : "outline"}
        onClick={onSelect}
        className={isSelected ? "bg-green-600 hover:bg-green-700" : ""}
      >
        {isSelected ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Selecionado
          </>
        ) : (
          'Selecionar'
        )}
      </Button>
    </div>
  );

  const renderVideoCategory = (videos: VideoItem[] | undefined, type: string) => {
    if (!videos || videos.length === 0) return null;

    return videos.map((video, idx) => (
      <VideoCard
        key={idx}
        video={video}
        type={type}
        isSelected={selectedVideoUrl === video.url}
        onSelect={() => onSelectVideo(video.url, video.title || video.description || `Vídeo ${type}`)}
      />
    ));
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-purple-700">Carregando vídeos...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Video className="w-6 h-6" />
          🎬 Vídeo de Demonstração (Landing Page)
        </CardTitle>
        <CardDescription>
          Selecione um vídeo dos produtos vinculados para exibir COM PLAYER na landing page,
          <strong> antes da seção de métricas</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 || products.every(p => getTotalVideosCount(p) === 0) ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Nenhum vídeo disponível</AlertTitle>
            <AlertDescription>
              Os produtos vinculados não possuem vídeos cadastrados no repositório
            </AlertDescription>
          </Alert>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {products.map(product => {
              const totalVideos = getTotalVideosCount(product);
              if (totalVideos === 0) return null;

              return (
                <AccordionItem key={product.id} value={product.id}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 w-full justify-between pr-2">
                      <span className="font-medium">{product.name}</span>
                      <Badge variant="secondary">{totalVideos} vídeos</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-3">
                    {renderVideoCategory(product.youtube_videos, 'YouTube')}
                    {renderVideoCategory(product.technical_videos, 'Técnicos')}
                    {renderVideoCategory(product.testimonial_videos, 'Depoimentos')}
                    {renderVideoCategory(product.instagram_videos, 'Instagram')}
                    {renderVideoCategory(product.tiktok_videos, 'TikTok')}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {selectedVideoUrl && (
          <Alert className="bg-green-50 border-green-200">
            <Video className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">✅ Vídeo Selecionado</AlertTitle>
            <AlertDescription>
              <p className="text-sm font-medium text-green-800 mb-1">
                {selectedVideoTitle}
              </p>
              <a
                href={selectedVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline break-all"
              >
                {selectedVideoUrl}
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onRemoveVideo}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover Seleção
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
