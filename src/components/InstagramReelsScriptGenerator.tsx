import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Edit, Save, X, Zap, Code, Film, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Scene {
  visual: string;
  dialogue: string;
}

interface ReelsScript {
  variation: number;
  approach: string;
  hook: string;
  scenes: Scene[];
  cta: string;
  estimated_duration?: string;
}

interface InstagramReelsScriptGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdate?: () => void;
}

const APPROACH_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  educational: { 
    label: '🎓 Educativo', 
    icon: '🎓', 
    description: 'Ensinar algo útil' 
  },
  trending: { 
    label: '🔥 Trending', 
    icon: '🔥', 
    description: 'Formato viral' 
  },
  behind_scenes: { 
    label: '🎬 Bastidores', 
    icon: '🎬', 
    description: 'Behind the scenes' 
  },
  demonstration: { 
    label: '🎯 Demonstração', 
    icon: '🎯', 
    description: 'Produto em ação' 
  }
};

export function InstagramReelsScriptGenerator({ productId, productName, isOpen, onClose, onProductUpdate }: InstagramReelsScriptGeneratorProps) {
  const [reelsScripts, setReelsScripts] = useState<ReelsScript[]>([]);
  const [activeTab, setActiveTab] = useState('1');
  const [editingVariation, setEditingVariation] = useState<number | null>(null);
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
        .select('instagram_reels_scripts')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const reelsData = data?.instagram_reels_scripts as any;
      
      if (reelsData && reelsData.scripts && reelsData.scripts.length > 0) {
        const latestScript = reelsData.scripts[0];
        if (latestScript.reels_scripts) {
          setReelsScripts(latestScript.reels_scripts);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar roteiros Reels:', error);
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
      const { data, error } = await supabase.functions.invoke('generate-instagram-reels-script', {
        body: { productId }
      });

      if (error) throw error;

      if (data?.content?.reels_scripts) {
        setReelsScripts(data.content.reels_scripts);

        toast({
          title: "Sucesso!",
          description: "Roteiros de Reels gerados com sucesso!",
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

  const saveScript = async (variationIndex: number) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_reels_scripts')
        .eq('id', productId)
        .single();

      const existingContent = existingData?.instagram_reels_scripts as any || { scripts: [], last_generated: null };
      
      if (!existingContent.scripts || existingContent.scripts.length === 0) {
        existingContent.scripts = [{
          id: crypto.randomUUID(),
          reels_scripts: reelsScripts,
          generated_at: new Date().toISOString(),
          editable: true
        }];
      } else {
        existingContent.scripts[0].reels_scripts = reelsScripts;
      }
      
      existingContent.last_updated = new Date().toISOString();

      const { error } = await supabase
        .from('products_repository')
        .update({ instagram_reels_scripts: existingContent })
        .eq('id', productId);

      if (error) throw error;

      setEditingVariation(null);
      toast({
        title: "Salvo!",
        description: `Variação ${variationIndex + 1} salva com sucesso!`,
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

  const formatScriptAsText = (script: ReelsScript): string => {
    if (!script) return '';
    
    let text = `🎬 ROTEIRO REELS - ${APPROACH_LABELS[script.approach]?.label || script.approach}\n\n`;
    text += `🪝 HOOK:\n${script.hook}\n\n`;
    text += `--- CENAS ---\n\n`;
    
    script.scenes?.forEach((scene, index) => {
      text += `CENA ${index + 1}\n`;
      text += `[VISUAL]: ${scene.visual}\n`;
      text += `[FALA]: ${scene.dialogue}\n\n`;
    });
    
    text += `📢 CTA:\n${script.cta}\n`;
    if (script.estimated_duration) {
      text += `\n⏱️ Duração: ${script.estimated_duration}`;
    }
    
    return text;
  };

  const copyHTMLVersion = async (script: ReelsScript) => {
    try {
      const approachInfo = APPROACH_LABELS[script.approach] || { label: script.approach, icon: '📱' };
      
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roteiro Reels ${approachInfo.label} - ${productName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045); min-height: 100vh; }
    .container { background: white; border-radius: 20px; padding: 25px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e1306c; }
    .header h1 { margin: 0; font-size: 20px; color: #333; }
    .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
    .hook { background: linear-gradient(135deg, #833ab4, #e1306c); color: white; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
    .hook-label { font-size: 12px; opacity: 0.8; margin-bottom: 5px; }
    .hook-text { font-size: 18px; font-weight: bold; }
    .scene { background: #f8f9fa; padding: 15px; margin-bottom: 12px; border-radius: 10px; border-left: 4px solid #e1306c; }
    .scene-number { font-size: 12px; color: #e1306c; font-weight: bold; margin-bottom: 8px; }
    .scene-visual { background: #e3f2fd; padding: 8px; border-radius: 6px; margin-bottom: 8px; font-size: 14px; }
    .scene-dialogue { background: #fff3e0; padding: 8px; border-radius: 6px; font-size: 14px; }
    .cta { background: #4caf50; color: white; padding: 15px; border-radius: 12px; text-align: center; margin-top: 20px; }
    .duration { text-align: center; color: #666; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${approachInfo.icon} ${approachInfo.label}</h1>
      <p>${productName}</p>
    </div>
    
    <div class="hook">
      <div class="hook-label">🪝 HOOK</div>
      <div class="hook-text">${script.hook}</div>
    </div>
    
    ${script.scenes?.map((scene, index) => `
    <div class="scene">
      <div class="scene-number">CENA ${index + 1}</div>
      <div class="scene-visual"><strong>[VISUAL]:</strong> ${scene.visual}</div>
      <div class="scene-dialogue"><strong>[FALA]:</strong> ${scene.dialogue}</div>
    </div>
    `).join('') || ''}
    
    <div class="cta">
      <strong>📢 CTA:</strong> ${script.cta}
    </div>
    
    ${script.estimated_duration ? `<div class="duration">⏱️ ${script.estimated_duration}</div>` : ''}
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML do roteiro copiada para visualização.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a versão HTML.",
        variant: "destructive",
      });
    }
  };

  const updateScriptField = (index: number, field: keyof ReelsScript, value: any) => {
    setReelsScripts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateScene = (scriptIndex: number, sceneIndex: number, field: 'visual' | 'dialogue', value: string) => {
    setReelsScripts(prev => {
      const updated = [...prev];
      const scenes = [...(updated[scriptIndex].scenes || [])];
      scenes[sceneIndex] = { ...scenes[sceneIndex], [field]: value };
      updated[scriptIndex] = { ...updated[scriptIndex], scenes };
      return updated;
    });
  };

  const renderScriptContent = (script: ReelsScript, index: number) => {
    const isEditing = editingVariation === index;
    const approachInfo = APPROACH_LABELS[script.approach] || { label: script.approach, icon: '📱', description: '' };

    return (
      <div className="space-y-4">
        {/* Hook */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            🪝 Hook (Abertura)
          </label>
          {isEditing ? (
            <Textarea
              value={script.hook}
              onChange={(e) => updateScriptField(index, 'hook', e.target.value)}
              className="min-h-[80px]"
              placeholder="Frase de abertura impactante..."
            />
          ) : (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 p-4 rounded-lg">
              <p className="font-medium">{script.hook || 'Nenhum hook definido'}</p>
            </div>
          )}
        </div>

        {/* Cenas */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Film className="h-4 w-4" /> Cenas ({script.scenes?.length || 0})
          </h4>
          
          {script.scenes?.map((scene, sceneIndex) => (
            <Card key={sceneIndex} className="border-l-4 border-l-pink-500">
              <CardContent className="p-3 space-y-2">
                <Badge variant="secondary" className="text-xs">Cena {sceneIndex + 1}</Badge>
                
                <div>
                  <label className="text-xs font-medium text-blue-600">[VISUAL]</label>
                  {isEditing ? (
                    <Textarea
                      value={scene.visual}
                      onChange={(e) => updateScene(index, sceneIndex, 'visual', e.target.value)}
                      className="min-h-[50px] mt-1 text-sm"
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
                      onChange={(e) => updateScene(index, sceneIndex, 'dialogue', e.target.value)}
                      className="min-h-[50px] mt-1 text-sm"
                    />
                  ) : (
                    <p className="text-sm bg-orange-50 dark:bg-orange-950/30 p-2 rounded mt-1">{scene.dialogue}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            📢 Call-to-Action
          </label>
          {isEditing ? (
            <Textarea
              value={script.cta}
              onChange={(e) => updateScriptField(index, 'cta', e.target.value)}
              className="min-h-[60px]"
              placeholder="CTA final..."
            />
          ) : (
            <div className="bg-green-100 dark:bg-green-950/30 p-3 rounded-lg">
              <p className="font-medium text-green-800 dark:text-green-200">{script.cta || 'Nenhum CTA definido'}</p>
            </div>
          )}
        </div>

        {/* Duração */}
        {script.estimated_duration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{script.estimated_duration}</span>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingVariation(null);
                  loadExistingContent();
                }}
              >
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => saveScript(index)}
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
                      onClick={() => copyHTMLVersion(script)}
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
                onClick={() => setEditingVariation(index)}
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            Gerador de Roteiro Reels - {productName}
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
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  Gerar Roteiros Reels
                </Button>
              </div>

              {/* Tabs para as 4 variações */}
              {reelsScripts.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full">
                    {reelsScripts.map((script, index) => {
                      const approachInfo = APPROACH_LABELS[script.approach] || { icon: '📱', label: `#${index + 1}` };
                      return (
                        <TabsTrigger key={index} value={String(index + 1)} className="flex flex-col items-center py-3">
                          <span className="text-lg">{approachInfo.icon}</span>
                          <span className="text-xs">{approachInfo.label.replace(approachInfo.icon, '').trim()}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {reelsScripts.map((script, index) => {
                    const approachInfo = APPROACH_LABELS[script.approach] || { label: script.approach, description: '' };
                    return (
                      <TabsContent key={index} value={String(index + 1)}>
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Variação #{script.variation}</span>
                              <Badge variant="outline">{approachInfo.description}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderScriptContent(script, index)}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum roteiro de Reels gerado ainda.</p>
                  <p className="text-sm">Clique em "Gerar Roteiros Reels" para criar 4 variações.</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
