import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Video, ExternalLink, Check } from "lucide-react";

interface VideoItem {
  url: string;
  description: string;
}

interface VideoSectionProps {
  title: string;
  videos: VideoItem[];
  onAdd: (url: string, description: string) => void;
  onRemove: (index: number) => void;
  onEdit?: (index: number, url: string, description: string) => void;
  maxVideos: number;
}

export function VideoSection({ title, videos, onAdd, onRemove, onEdit, maxVideos }: VideoSectionProps) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAdd = () => {
    if (newVideoUrl.trim()) {
      onAdd(newVideoUrl, newVideoDescription);
      setNewVideoUrl('');
      setNewVideoDescription('');
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditUrl(videos[index].url);
    setEditDescription(videos[index].description || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && onEdit && editUrl.trim()) {
      onEdit(editingIndex, editUrl, editDescription);
      setEditingIndex(null);
      setEditUrl('');
      setEditDescription('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditUrl('');
    setEditDescription('');
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
                  {editingIndex === index ? (
                    // Modo de edição
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-url-${index}`}>URL do Vídeo</Label>
                        <Input
                          id={`edit-url-${index}`}
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-description-${index}`}>Descrição</Label>
                        <Input
                          id={`edit-description-${index}`}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Descrição do vídeo"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editUrl.trim()}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
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
                      
                      <div className="flex gap-1 flex-shrink-0">
                        {onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(index)}
                            className="h-8 w-8 p-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}