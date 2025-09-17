import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ExternalLink, Play } from 'lucide-react';
import { VideoCollector } from '@/lib/google-ads/collectors/VideoCollector';
import { VideoExtension } from '@/types/google-ads';

interface VideoManagerProps {
  config: any;
  data: any;
  landingPageId: string;
  onChange: (updates: any) => void;
}

export const VideoManager = ({ config, data, landingPageId, onChange }: VideoManagerProps) => {
  const [autoVideos, setAutoVideos] = useState<VideoExtension[]>([]);
  const [newVideo, setNewVideo] = useState({ url: '', label: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    collectAutoVideos();
  }, [landingPageId, data]);

  const collectAutoVideos = async () => {
    setIsLoading(true);
    try {
      const videos = await VideoCollector.collectAll(landingPageId, [], data);
      setAutoVideos(videos);
    } catch (error) {
      console.error('Error collecting videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addManualVideo = () => {
    if (newVideo.url) {
      const validation = VideoCollector.validateYouTubeUrl(newVideo.url);
      if (!validation.valid) {
        alert(validation.warning || 'URL inválida');
        return;
      }

      const currentVideos = config.youtube_videos || [];
      onChange({
        youtube_videos: [...currentVideos, { ...newVideo }]
      });
      setNewVideo({ url: '', label: '' });
    }
  };

  const removeVideo = (index: number) => {
    const currentVideos = config.youtube_videos || [];
    onChange({
      youtube_videos: currentVideos.filter((_: any, i: number) => i !== index)
    });
  };

  const getYouTubeThumbnail = (youtubeId: string) => {
    return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  };

  const totalVideos = autoVideos.length + (config.youtube_videos?.length || 0);
  const isAtLimit = totalVideos >= 20;

  return (
    <div className="space-y-4">
      {/* Auto-collected Videos */}
      {autoVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vídeos Coletados Automaticamente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Coletados automaticamente dos blog posts, depoimentos e produtos da landing page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autoVideos.map((video, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border rounded">
                  <img 
                    src={getYouTubeThumbnail(video.youtube_id)}
                    alt="YouTube thumbnail"
                    className="w-16 h-12 object-cover rounded"
                  />
                   <div className="flex-1">
                     <div className="font-medium text-sm">{video.label}</div>
                     <div className="text-xs text-muted-foreground flex items-center gap-1">
                       <ExternalLink className="w-3 h-3" />
                       youtube.com/watch?v={video.youtube_id}
                     </div>
                   </div>
                   <Badge variant={video.label?.includes('Produto:') ? 'default' : 'secondary'}>
                     {video.label?.includes('Produto:') ? 'Produto' : 'Auto'}
                   </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Vídeos Manuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="video-url">URL do YouTube</Label>
              <Input
                id="video-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={newVideo.url}
                onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="video-label">Rótulo (opcional)</Label>
              <Input
                id="video-label"
                placeholder="Depoimento, Tutorial, etc."
                value={newVideo.label}
                onChange={(e) => setNewVideo(prev => ({ ...prev, label: e.target.value }))}
                maxLength={25}
              />
            </div>
          </div>
          
          <Button
            onClick={addManualVideo}
            disabled={!newVideo.url || isAtLimit}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Vídeo
          </Button>

          {config.youtube_videos?.length > 0 && (
            <div className="space-y-2">
              <Label>Vídeos Adicionados ({config.youtube_videos.length})</Label>
              {config.youtube_videos.map((video: any, index: number) => {
                const youtubeId = VideoCollector.extractYouTubeId && VideoCollector.extractYouTubeId(video.url);
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded">
                    {youtubeId && (
                      <img 
                        src={getYouTubeThumbnail(youtubeId)}
                        alt="YouTube thumbnail"
                        className="w-16 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{video.label || 'Vídeo Manual'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {video.url}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVideo(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className={`${isAtLimit ? 'border-amber-200 bg-amber-50' : 'bg-muted/30'}`}>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isAtLimit ? 'text-amber-600' : 'text-primary'}`}>
              {totalVideos}/20
            </div>
            <div className="text-sm text-muted-foreground">
              Extensões de vídeo para a campanha
            </div>
            {isAtLimit && (
              <p className="text-xs text-amber-600 mt-2">
                Limite do Google Ads atingido (20 vídeos máximo)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};