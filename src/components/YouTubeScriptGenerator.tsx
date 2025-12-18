import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Edit, Save, X, Zap, Code, Film, User, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Scene {
  scene: number;
  visual: string;
  dialogue: string;
}

interface ScriptFormat {
  objective: string;
  speaker: string;
  estimated_duration: string;
  scenes: Scene[];
}

interface YouTubeScripts {
  institutional?: ScriptFormat;
  technical?: ScriptFormat;
  educational?: ScriptFormat;
  step_by_step?: ScriptFormat;
}

interface YouTubeScriptGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdate?: () => void;
}

const FORMAT_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  institutional: { 
    label: '🏢 Institucional', 
    icon: '🏢', 
    description: 'Apresentação da marca e produto' 
  },
  technical: { 
    label: '🔧 Técnico', 
    icon: '🔧', 
    description: 'Detalhamento de especificações' 
  },
  educational: { 
    label: '🎓 Educacional', 
    icon: '🎓', 
    description: 'Tutorial de como usar' 
  },
  step_by_step: { 
    label: '📋 Passo a Passo', 
    icon: '📋', 
    description: 'Demonstração prática' 
  }
};

export function YouTubeScriptGenerator({ productId, productName, isOpen, onClose, onProductUpdate }: YouTubeScriptGeneratorProps) {
  const [scripts, setScripts] = useState<YouTubeScripts>({});
  const [activeTab, setActiveTab] = useState('institutional');
  const [editingFormat, setEditingFormat] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadExistingContent();
    }
  }, [isOpen, productId]);

  const loadExistingContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('youtube_scripts')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const youtubeData = data?.youtube_scripts as any;
      
      if (youtubeData && youtubeData.scripts && youtubeData.scripts.length > 0) {
        const latestScript = youtubeData.scripts[0];
        setScripts({
          institutional: latestScript.institutional,
          technical: latestScript.technical,
          educational: latestScript.educational,
          step_by_step: latestScript.step_by_step
        });
      }
    } catch (error) {
      console.error('Erro ao carregar roteiros YouTube:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os roteiros existentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateScripts = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-youtube-script', {
        body: { productId }
      });

      if (error) throw error;

      if (data?.content) {
        setScripts({
          institutional: data.content.institutional,
          technical: data.content.technical,
          educational: data.content.educational,
          step_by_step: data.content.step_by_step
        });

        toast({
          title: "Sucesso!",
          description: "Roteiros YouTube gerados com sucesso!",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar roteiros:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar os roteiros. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveScript = async (format: string, script: ScriptFormat) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('youtube_scripts')
        .eq('id', productId)
        .single();

      const existingContent = existingData?.youtube_scripts as any || { scripts: [], last_generated: null };
      
      if (!existingContent.scripts || existingContent.scripts.length === 0) {
        existingContent.scripts = [{
          id: crypto.randomUUID(),
          [format]: script,
          generated_at: new Date().toISOString(),
          editable: true
        }];
      } else {
        existingContent.scripts[0][format] = script;
      }
      
      existingContent.last_updated = new Date().toISOString();

      const { error } = await supabase
        .from('products_repository')
        .update({ youtube_scripts: existingContent })
        .eq('id', productId);

      if (error) throw error;

      setEditingFormat(null);
      toast({
        title: "Salvo!",
        description: `Roteiro ${FORMAT_LABELS[format]?.label} salvo com sucesso!`,
      });
      
      if (onProductUpdate) onProductUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o roteiro.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const formatScriptAsText = (script: ScriptFormat): string => {
    if (!script) return '';
    
    let text = `📌 OBJETIVO: ${script.objective}\n`;
    text += `👤 APRESENTADOR: ${script.speaker}\n`;
    text += `⏱️ DURAÇÃO: ${script.estimated_duration}\n\n`;
    text += `--- CENAS ---\n\n`;
    
    script.scenes?.forEach((scene) => {
      text += `CENA ${scene.scene}\n`;
      text += `[VISUAL]: ${scene.visual}\n`;
      text += `[FALA]: ${scene.dialogue}\n\n`;
    });
    
    return text;
  };

  const copyHTMLVersion = async (script: ScriptFormat, format: string) => {
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roteiro YouTube ${FORMAT_LABELS[format]?.label} - ${productName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #ff0000; }
    .header-icon { font-size: 40px; }
    .header-text h1 { margin: 0; color: #333; font-size: 24px; }
    .header-text p { margin: 5px 0 0; color: #666; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
    .meta-item { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .meta-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .meta-value { font-size: 16px; font-weight: 600; color: #333; }
    .scene { background: #fafafa; border-left: 4px solid #ff0000; padding: 20px; margin-bottom: 15px; border-radius: 0 8px 8px 0; }
    .scene-number { font-weight: bold; color: #ff0000; margin-bottom: 10px; }
    .scene-visual { background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
    .scene-visual strong { color: #1976d2; }
    .scene-dialogue { background: #fff3e0; padding: 10px; border-radius: 5px; }
    .scene-dialogue strong { color: #f57c00; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">🎬</div>
      <div class="header-text">
        <h1>${FORMAT_LABELS[format]?.label} - ${productName}</h1>
        <p>Roteiro de Vídeo para YouTube</p>
      </div>
    </div>
    
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">📌 Objetivo</div>
        <div class="meta-value">${script.objective}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">👤 Apresentador</div>
        <div class="meta-value">${script.speaker}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">⏱️ Duração</div>
        <div class="meta-value">${script.estimated_duration}</div>
      </div>
    </div>
    
    <h2>📋 Roteiro das Cenas</h2>
    ${script.scenes?.map(scene => `
    <div class="scene">
      <div class="scene-number">CENA ${scene.scene}</div>
      <div class="scene-visual"><strong>[VISUAL]:</strong> ${scene.visual}</div>
      <div class="scene-dialogue"><strong>[FALA]:</strong> ${scene.dialogue}</div>
    </div>
    `).join('') || ''}
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML do roteiro copiada para visualização web.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a versão HTML.",
        variant: "destructive",
      });
    }
  };

  const updateScene = (format: string, sceneIndex: number, field: 'visual' | 'dialogue', value: string) => {
    setScripts(prev => {
      const script = prev[format as keyof YouTubeScripts];
      if (!script) return prev;
      
      const updatedScenes = [...(script.scenes || [])];
      updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], [field]: value };
      
      return {
        ...prev,
        [format]: { ...script, scenes: updatedScenes }
      };
    });
  };

  const updateScriptMeta = (format: string, field: 'objective' | 'speaker' | 'estimated_duration', value: string) => {
    setScripts(prev => {
      const script = prev[format as keyof YouTubeScripts];
      if (!script) return prev;
      
      return {
        ...prev,
        [format]: { ...script, [field]: value }
      };
    });
  };

  const renderScriptContent = (format: string, script: ScriptFormat | undefined) => {
    if (!script) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum roteiro gerado ainda.</p>
          <p className="text-sm">Clique em "Gerar Roteiros" para criar.</p>
        </div>
      );
    }

    const isEditing = editingFormat === format;

    return (
      <div className="space-y-4">
        {/* Metadados */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              📌 Objetivo
            </label>
            {isEditing ? (
              <Textarea
                value={script.objective}
                onChange={(e) => updateScriptMeta(format, 'objective', e.target.value)}
                className="min-h-[60px]"
              />
            ) : (
              <p className="text-sm bg-muted/50 p-2 rounded">{script.objective}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Apresentador
            </label>
            {isEditing ? (
              <Textarea
                value={script.speaker}
                onChange={(e) => updateScriptMeta(format, 'speaker', e.target.value)}
                className="min-h-[60px]"
              />
            ) : (
              <p className="text-sm bg-muted/50 p-2 rounded">{script.speaker}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Duração
            </label>
            {isEditing ? (
              <Textarea
                value={script.estimated_duration}
                onChange={(e) => updateScriptMeta(format, 'estimated_duration', e.target.value)}
                className="min-h-[60px]"
              />
            ) : (
              <p className="text-sm bg-muted/50 p-2 rounded">{script.estimated_duration}</p>
            )}
          </div>
        </div>

        {/* Cenas */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Film className="h-4 w-4" /> Cenas ({script.scenes?.length || 0})
          </h4>
          
          {script.scenes?.map((scene, index) => (
            <Card key={index} className="border-l-4 border-l-red-500">
              <CardContent className="p-4 space-y-3">
                <Badge variant="secondary">Cena {scene.scene}</Badge>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-blue-600">[VISUAL]</label>
                    {isEditing ? (
                      <Textarea
                        value={scene.visual}
                        onChange={(e) => updateScene(format, index, 'visual', e.target.value)}
                        className="min-h-[60px] mt-1"
                      />
                    ) : (
                      <p className="text-sm bg-blue-50 dark:bg-blue-950/30 p-2 rounded mt-1">{scene.visual}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-orange-600">[FALA]</label>
                    {isEditing ? (
                      <Textarea
                        value={scene.dialogue}
                        onChange={(e) => updateScene(format, index, 'dialogue', e.target.value)}
                        className="min-h-[80px] mt-1"
                      />
                    ) : (
                      <p className="text-sm bg-orange-50 dark:bg-orange-950/30 p-2 rounded mt-1">{scene.dialogue}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingFormat(null);
                  loadExistingContent();
                }}
              >
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => saveScript(format, script)}
              >
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formatScriptAsText(script))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar Texto</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyHTMLVersion(script, format)}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar HTML</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingFormat(format)}
              >
                <Edit className="h-4 w-4 mr-1" /> Editar
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            Gerador de Roteiro YouTube - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Botão principal */}
              <div className="flex justify-center">
                <Button
                  onClick={generateScripts}
                  disabled={generating}
                  size="lg"
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  Gerar Roteiros YouTube
                </Button>
              </div>

              {/* Tabs para os 4 formatos */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  {Object.entries(FORMAT_LABELS).map(([key, { icon, label }]) => (
                    <TabsTrigger key={key} value={key} className="flex flex-col items-center py-3">
                      <span className="text-lg">{icon}</span>
                      <span className="text-xs">{label.replace(icon, '').trim()}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(FORMAT_LABELS).map(([key, { label, description }]) => (
                  <TabsContent key={key} value={key}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{label}</span>
                          <Badge variant="outline">{description}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderScriptContent(key, scripts[key as keyof YouTubeScripts])}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
