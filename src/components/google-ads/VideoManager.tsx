import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { VideoCollector } from '@/lib/google-ads/collectors/VideoCollector';
import { CompanyDataCollector } from '@/lib/google-ads/collectors/CompanyDataCollector';
import { VideoExtension } from '@/types/google-ads';

interface VideoManagerProps {
  config: any;
  data: any;
  landingPageId: string;
  onChange: (updates: any) => void;
}

export const VideoManager = ({ config, data, landingPageId, onChange }: VideoManagerProps) => {
  const [autoVideos, setAutoVideos] = useState<VideoExtension[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    collectAutoVideos();
  }, [landingPageId, data]);

  const collectAutoVideos = async () => {
    setIsLoading(true);
    try {
      // Collect videos from products
      const productVideos = await VideoCollector.collectAll(landingPageId, [], data);
      
      // Collect videos from company profile
      const companyVideos = await CompanyDataCollector.collectCompanyVideos();
      
      // Combine and limit to 20 videos
      const allVideos = [
        ...productVideos, 
        ...companyVideos.map(video => ({
          youtube_id: video.youtube_id,
          label: video.label
        }))
      ].slice(0, 20);
      
      setAutoVideos(allVideos);
    } catch (error) {
      console.error('Error collecting videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getYouTubeThumbnail = (youtubeId: string) => {
    return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  };

  const totalVideos = autoVideos.length;
  const isAtLimit = totalVideos >= 20;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Extensões de Vídeo</h3>
        <Badge variant="secondary">
          {totalVideos}/20 vídeos
        </Badge>
      </div>

      {/* Auto-collected videos from products */}
      {autoVideos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            Vídeos dos Produtos Selecionados ({autoVideos.length})
          </h4>
          <div className="grid gap-3">
            {autoVideos.map((video, index) => (
              <div key={`auto-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
                <img 
                  src={getYouTubeThumbnail(video.youtube_id)} 
                  alt={video.label || 'Video'} 
                  className="w-16 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {video.label || `Vídeo ${index + 1}`}
                  </p>
                  <a 
                    href={`https://youtube.com/watch?v=${video.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    youtube.com/watch?v={video.youtube_id}
                  </a>
                </div>
                <Badge variant="outline" className="text-xs">
                  Produto
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAtLimit && autoVideos.length >= 20 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Limite de 20 vídeos atingido. Google Ads não aceita mais que 20 extensões de vídeo.
          </p>
        </div>
      )}

      {totalVideos === 0 && (
        <div className="p-4 text-center text-muted-foreground">
          <p>Nenhum vídeo encontrado nos produtos selecionados.</p>
          <p className="text-sm">Adicione vídeos nas coleções dos produtos no Repositório de Produtos.</p>
        </div>
      )}

      {isLoading && (
        <div className="p-4 text-center text-muted-foreground">
          <p>Carregando vídeos...</p>
        </div>
      )}
    </div>
  );
};