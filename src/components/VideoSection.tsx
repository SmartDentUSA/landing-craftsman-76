import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Video, ExternalLink } from "lucide-react";

interface Video {
  url: string;
  description: string;
}

interface VideoSectionProps {
  title: string;
  videos: Video[];
  onAdd: (url: string, description: string) => void;
  onRemove: (index: number) => void;
  maxVideos: number;
}

export function VideoSection({ title, videos, onAdd, onRemove, maxVideos }: VideoSectionProps) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');

  const handleAdd = () => {
    if (newVideoUrl.trim()) {
      onAdd(newVideoUrl, newVideoDescription);
      setNewVideoUrl('');
      setNewVideoDescription('');
    }
  };

  const getVideoId = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <Badge variant="secondary">
          {videos.length}/{maxVideos}
        </Badge>
      </div>

      {/* Add new video */}
      {videos.length < maxVideos && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`${title}-url`}>URL do Vídeo</Label>
                <Input
                  id={`${title}-url`}
                  type="url"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${title}-description`}>Descrição (opcional)</Label>
                <Input
                  id={`${title}-description`}
                  value={newVideoDescription}
                  onChange={(e) => setNewVideoDescription(e.target.value)}
                  placeholder="Descrição do vídeo"
                />
              </div>
              <Button
                type="button"
                onClick={handleAdd}
                disabled={!newVideoUrl.trim()}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Vídeo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video list */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((video, index) => {
            const videoId = getVideoId(video.url);
            const thumbnailUrl = videoId 
              ? `https://img.youtube.com/vi/${videoId}/default.jpg`
              : null;

            return (
              <Card key={index} className="relative">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {thumbnailUrl ? (
                      <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={thumbnailUrl} 
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Video className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <a 
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{video.url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                      {video.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {video.description}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(index)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}