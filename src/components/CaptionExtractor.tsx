import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoCaption {
  url: string;
  captions: string;
  language: string;
  extracted_at: string;
  method: string;
  analysis?: {
    keywords: string[];
    sentiment: string;
    summary: string;
  };
}

interface CaptionExtractorProps {
  productId: string;
  videoType: 'youtube_videos' | 'instagram_videos' | 'testimonial_videos' | 'technical_videos';
  videos: Array<{ url: string; description: string }>;
  existingCaptions?: VideoCaption[];
  onCaptionsExtracted: (captions: VideoCaption[]) => void;
}

export function CaptionExtractor({ 
  productId, 
  videoType, 
  videos, 
  existingCaptions = [], 
  onCaptionsExtracted 
}: CaptionExtractorProps) {
  const [extracting, setExtracting] = useState(false);
  const [viewingCaptions, setViewingCaptions] = useState<VideoCaption | null>(null);
  const { toast } = useToast();

  const hasVideos = videos.length > 0;
  const hasCaptions = existingCaptions.length > 0;

  const extractCaptions = async () => {
    if (!hasVideos) {
      toast({
        title: "Nenhum vídeo",
        description: "Adicione vídeos antes de extrair legendas",
        variant: "destructive"
      });
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-youtube-captions', {
        body: {
          productId,
          videoType
        }
      });

      if (error) throw error;

      if (data?.success) {
        onCaptionsExtracted(data.captions || []);
        toast({
          title: "Sucesso",
          description: `Legendas extraídas para ${data.extracted} vídeo(s)`,
        });

        if (data.errors && data.errors.length > 0) {
          toast({
            title: "Avisos",
            description: `Alguns vídeos falharam: ${data.errors.length}`,
            variant: "destructive"
          });
        }
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error extracting captions:', error);
      toast({
        title: "Erro",
        description: "Erro ao extrair legendas. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setExtracting(false);
    }
  };

  const getStatusBadge = () => {
    if (!hasVideos) {
      return <Badge variant="secondary">Sem vídeos</Badge>;
    }
    if (hasCaptions) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Extraído</Badge>;
    }
    return <Badge variant="outline">Não extraído</Badge>;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-medium">Extração de Legendas</h4>
          <p className="text-sm text-muted-foreground">
            Extraia legendas automaticamente dos vídeos do YouTube
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button
            onClick={extractCaptions}
            disabled={!hasVideos || extracting}
            size="sm"
            variant={hasCaptions ? "outline" : "default"}
          >
            {extracting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {hasCaptions ? 'Re-extrair' : 'Extrair'}
          </Button>
        </div>
      </div>

      {hasCaptions && (
        <div className="space-y-3">
          <h5 className="font-medium text-sm">Legendas Extraídas ({existingCaptions.length})</h5>
          {existingCaptions.map((caption, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {caption.method}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {caption.language}
                    </Badge>
                    {caption.analysis && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSentimentColor(caption.analysis.sentiment)}`}
                      >
                        {caption.analysis.sentiment}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingCaptions(
                      viewingCaptions?.url === caption.url ? null : caption
                    )}
                  >
                    {viewingCaptions?.url === caption.url ? 'Ocultar' : 'Ver Legendas'}
                  </Button>
                </div>

                <div className="text-sm">
                  <p className="font-medium truncate">{caption.url}</p>
                  <p className="text-muted-foreground text-xs">
                    Extraído em {new Date(caption.extracted_at).toLocaleString()}
                  </p>
                </div>

                {caption.analysis && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Resumo:</label>
                      <p className="text-sm">{caption.analysis.summary}</p>
                    </div>
                    
                    {caption.analysis.keywords.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Keywords:</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {caption.analysis.keywords.slice(0, 5).map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {caption.analysis.keywords.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{caption.analysis.keywords.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {viewingCaptions?.url === caption.url && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Legendas Completas ({caption.captions.length} caracteres):
                    </label>
                    <Textarea
                      value={caption.captions}
                      readOnly
                      className="text-sm max-h-32"
                      placeholder="Nenhuma legenda disponível"
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!hasVideos && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">Adicione vídeos do YouTube para extrair legendas automaticamente</p>
          </div>
        </Card>
      )}
    </div>
  );
}