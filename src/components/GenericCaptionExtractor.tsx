import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
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

interface GenericCaptionExtractorProps {
  entityType: 'product' | 'company' | 'testimonial';
  entityId: string;
  videoType: 'youtube_videos' | 'instagram_videos' | 'testimonial_videos' | 'technical_videos';
  videos: Array<{ url: string; description?: string }>;
  existingCaptions?: VideoCaption[];
  onCaptionsExtracted: (captions: VideoCaption[]) => void;
  defaultOpen?: boolean;
}

export function GenericCaptionExtractor({ 
  entityType,
  entityId, 
  videoType, 
  videos, 
  existingCaptions = [], 
  onCaptionsExtracted,
  defaultOpen = true
}: GenericCaptionExtractorProps) {
  const navigate = useNavigate();
  const [extracting, setExtracting] = useState(false);
  const [viewingCaptions, setViewingCaptions] = useState<VideoCaption | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [secretsConfigured, setSecretsConfigured] = useState<boolean | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [isRegeneratingAnalysis, setIsRegeneratingAnalysis] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSecrets = async () => {
      try {
        const { data } = await supabase.functions.invoke('test-youtube-connection');
        setSecretsConfigured(data?.ok || false);
      } catch (error) {
        setSecretsConfigured(false);
      }
    };
    
    checkSecrets();
  }, []);

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
    
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('extract-youtube-captions', {
          body: {
            entityType,
            entityId,
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
          
          setExtracting(false);
          return;
        } else {
          throw new Error(data?.error || 'Erro desconhecido');
        }
      } catch (error: any) {
        lastError = error;
        
        const isConflict = error?.message?.includes('modified by another request');
        
        if (isConflict && attempt < maxRetries - 1) {
          const waitTime = 1000 * (attempt + 1);
          console.log(`Conflict detected, retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
          
          toast({
            title: "Conflito detectado",
            description: `Tentando novamente em ${waitTime / 1000}s...`,
          });
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        break;
      }
    }
    
    console.error('Error extracting captions:', lastError);
    toast({
      title: "Erro",
      description: lastError?.message || "Erro ao extrair legendas. Tente novamente.",
      variant: "destructive"
    });
    setExtracting(false);
  };

  const getStatusBadge = () => {
    if (!hasVideos) {
      return <Badge variant="secondary">Sem vídeos</Badge>;
    }
    if (hasCaptions) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Extraído ({existingCaptions.length}/{videos.length})
        </Badge>
      );
    }
    return <Badge variant="outline">Não extraído (0/{videos.length})</Badge>;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleEditCaption = (caption: VideoCaption) => {
    setEditingCaption(caption.url);
    setEditedText(caption.captions);
  };

  const handleCancelEdit = () => {
    setEditingCaption(null);
    setEditedText("");
  };

  const handleSaveCaption = async (originalCaption: VideoCaption) => {
    if (!editedText.trim()) {
      toast({
        title: "Erro",
        description: "A legenda não pode estar vazia",
        variant: "destructive"
      });
      return;
    }

    setIsRegeneratingAnalysis(true);

    try {
      const updatedCaptions = existingCaptions.map(cap => 
        cap.url === originalCaption.url 
          ? { ...cap, captions: editedText, extracted_at: new Date().toISOString() }
          : cap
      );

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'extract-youtube-captions',
        {
          body: {
            entityType,
            entityId,
            videoType,
            regenerateAnalysis: {
              videoUrl: originalCaption.url,
              captionText: editedText
            }
          }
        }
      );

      if (analysisError) {
        console.warn('⚠️ Falha ao regenerar análise:', analysisError);
        onCaptionsExtracted(updatedCaptions);
        toast({
          title: "Legenda salva",
          description: "Texto atualizado, mas análise de IA não pôde ser regenerada",
          variant: "default"
        });
      } else if (analysisData?.analysis) {
        const finalCaptions = updatedCaptions.map(cap =>
          cap.url === originalCaption.url
            ? { 
                ...cap, 
                captions: editedText,
                analysis: analysisData.analysis
              }
            : cap
        );
        
        onCaptionsExtracted(finalCaptions);
        
        toast({
          title: "Legenda atualizada",
          description: "Texto e análise de IA regenerados com sucesso",
        });
      } else {
        onCaptionsExtracted(updatedCaptions);
        toast({
          title: "Sucesso",
          description: "Legenda atualizada com sucesso"
        });
      }

      setEditingCaption(null);
      setEditedText("");
    } catch (error: any) {
      console.error('Error saving caption:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar legenda",
        variant: "destructive"
      });
    } finally {
      setIsRegeneratingAnalysis(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2">
        <CardHeader className="pb-3">
          {secretsConfigured === false && (
            <Alert variant="default" className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>YouTube OAuth não configurado.</strong>{' '}
                Para extrair legendas de vídeos do seu canal, configure as credenciais OAuth.{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-yellow-900 underline"
                  onClick={() => navigate('/repository')}
                >
                  Configurar agora
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronUp className="h-5 w-5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <div>
                <h4 className="font-medium">Extração de Legendas</h4>
                <p className="text-sm text-muted-foreground">
                  {hasVideos 
                    ? `${videos.length} vídeo(s) disponível(is)`
                    : "Nenhum vídeo para extração"
                  }
                </p>
              </div>
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
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
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
                        <div className="flex items-center gap-2">
                          {editingCaption === caption.url ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveCaption(caption)}
                                disabled={isRegeneratingAnalysis}
                              >
                                {isRegeneratingAnalysis ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Regenerando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Salvar
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isRegeneratingAnalysis}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingCaptions(
                                  viewingCaptions?.url === caption.url ? null : caption
                                )}
                              >
                                {viewingCaptions?.url === caption.url ? 'Ocultar' : 'Ver Legendas'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCaption(caption)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                            </>
                          )}
                        </div>
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
                              <label className="text-xs font-medium text-muted-foreground">
                                Keywords Extraídas:
                              </label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {caption.analysis.keywords.map((keyword, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                ℹ️ Keywords são extraídas automaticamente e atualizadas quando você editar a legenda
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {(viewingCaptions?.url === caption.url || editingCaption === caption.url) && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            {editingCaption === caption.url ? 'Editar Legenda:' : 'Legenda Completa:'}
                          </label>
                          {editingCaption === caption.url ? (
                            <Textarea
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              className="min-h-[200px] font-mono text-xs"
                              disabled={isRegeneratingAnalysis}
                            />
                          ) : (
                            <div className="max-h-[400px] overflow-y-auto bg-muted p-3 rounded-md">
                              <pre className="whitespace-pre-wrap text-xs font-mono">
                                {caption.captions}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {!hasCaptions && hasVideos && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Clique em "Extrair" para obter as legendas dos vídeos
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
