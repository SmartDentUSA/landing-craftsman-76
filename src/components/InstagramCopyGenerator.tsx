import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Edit, Save, X, Zap, Code, ExternalLink, Film, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CopyVariation {
  [key: string]: any;
  variation: number;
  approach: string;
  copy: string;
  link?: string;
  hashtags?: string[];
  call_to_action?: string;
}

interface InstagramCopy {
  feed_copies?: CopyVariation[];
  story_copy?: string;
  story_link?: string;
  reels_copies?: CopyVariation[];
  last_generated?: string;
  feed_copy?: string;
  feed_link?: string;
  reels_copy?: string;
  reels_link?: string;
}

// === Tipos para Roteiro de Reels (Script Audiovisual) ===
interface ReelsScene {
  visual: string;
  dialogue: string;
}

interface ReelsScript {
  variation: number;
  approach: string;
  hook: string;
  scenes: ReelsScene[];
  cta: string;
}

interface InstagramCopyGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

const REELS_SCRIPT_LABELS: Record<string, { label: string; description: string }> = {
  educational: { label: '🎓 Educativa', description: 'Ensina algo útil ao público' },
  trending: { label: '🔥 Trending', description: 'Aproveita tendências virais' },
  behind_scenes: { label: '🎬 Bastidores', description: 'Mostra o processo por trás' },
  demonstration: { label: '🎯 Demonstração', description: 'Mostra o produto em ação' }
};

export function InstagramCopyGenerator({ productId, productName, isOpen, onClose }: InstagramCopyGeneratorProps) {
  // === Estados existentes (Copies de texto) ===
  const [feedCopies, setFeedCopies] = useState<CopyVariation[]>([
    { variation: 1, approach: 'storytelling', copy: '', link: '' },
    { variation: 2, approach: 'benefits', copy: '', link: '' },
    { variation: 3, approach: 'problem_solution', copy: '', link: '' },
    { variation: 4, approach: 'urgency', copy: '', link: '' }
  ]);
  
  const [reelsCopies, setReelsCopies] = useState<CopyVariation[]>([
    { variation: 1, approach: 'educational', copy: '', link: '' },
    { variation: 2, approach: 'trending', copy: '', link: '' },
    { variation: 3, approach: 'behind_scenes', copy: '', link: '' },
    { variation: 4, approach: 'demonstration', copy: '', link: '' }
  ]);
  
  const [storyCopy, setStoryCopy] = useState('');
  const [storyLink, setStoryLink] = useState('');
  
  const [editingFeedVariation, setEditingFeedVariation] = useState<number | null>(null);
  const [editingReelsVariation, setEditingReelsVariation] = useState<number | null>(null);
  const [editingStory, setEditingStory] = useState(false);
  
  const [activeFeedTab, setActiveFeedTab] = useState(1);
  const [activeReelsTab, setActiveReelsTab] = useState(1);
  
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  // === Novos estados (Roteiro de Reels Audiovisual) ===
  const [reelsScripts, setReelsScripts] = useState<ReelsScript[]>([
    { variation: 1, approach: 'educational', hook: '', scenes: [], cta: '' },
    { variation: 2, approach: 'trending', hook: '', scenes: [], cta: '' },
    { variation: 3, approach: 'behind_scenes', hook: '', scenes: [], cta: '' },
    { variation: 4, approach: 'demonstration', hook: '', scenes: [], cta: '' }
  ]);
  const [activeReelsScriptTab, setActiveReelsScriptTab] = useState(1);
  const [generatingReelsScript, setGeneratingReelsScript] = useState(false);
  const [editingReelsScriptVariation, setEditingReelsScriptVariation] = useState<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadExistingCopies();
    }
  }, [isOpen, productId]);

  const loadExistingCopies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('instagram_copies, instagram_reels_scripts')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const instagramData = data?.instagram_copies as InstagramCopy;
      
      if (instagramData) {
        if (instagramData.feed_copies && instagramData.feed_copies.length > 0) {
          setFeedCopies(instagramData.feed_copies);
        }
        else if (instagramData.feed_copy) {
          setFeedCopies([
            { variation: 1, approach: 'storytelling', copy: instagramData.feed_copy, link: instagramData.feed_link }
          ]);
        }
        
        if (instagramData.reels_copies && instagramData.reels_copies.length > 0) {
          setReelsCopies(instagramData.reels_copies);
        }
        else if (instagramData.reels_copy) {
          setReelsCopies([
            { variation: 1, approach: 'educational', copy: instagramData.reels_copy, link: instagramData.reels_link }
          ]);
        }
        
        if (instagramData.story_copy) {
          setStoryCopy(instagramData.story_copy);
          setStoryLink(instagramData.story_link || '');
        }
      }

      // Carregar scripts de reels audiovisuais
      if (data?.instagram_reels_scripts && Array.isArray(data.instagram_reels_scripts) && data.instagram_reels_scripts.length > 0) {
        setReelsScripts(data.instagram_reels_scripts as unknown as ReelsScript[]);
      }
    } catch (error) {
      console.error('Erro ao carregar copies:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as copies existentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getApproachLabel = (approach: string): string => {
    const labels: Record<string, string> = {
      storytelling: '📖 Storytelling',
      benefits: '✨ Benefícios',
      problem_solution: '💡 Problema/Solução',
      urgency: '⏰ Urgência',
      educational: '🎓 Educativa',
      trending: '🔥 Trending',
      behind_scenes: '🎬 Bastidores',
      demonstration: '🎯 Demonstração'
    };
    return labels[approach] || approach;
  };

  const generateAllVariations = async (type: 'feed' | 'reels') => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'instagram',
          productId: productId,
          instagramType: type
        }
      });

      if (error) throw error;

      if (data?.content) {
        if (type === 'feed' && data.content.feed_copies) {
          setFeedCopies(data.content.feed_copies);
        } else if (type === 'reels' && data.content.reels_copies) {
          setReelsCopies(data.content.reels_copies);
        }

        toast({
          title: "Sucesso!",
          description: data.message || `4 variações de ${type} geradas!`,
        });
      }
    } catch (error) {
      console.error(`Erro ao gerar ${type}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível gerar as variações de ${type}.`,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateStory = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'instagram',
          productId: productId,
          instagramType: 'carousel'
        }
      });

      if (error) throw error;

      if (data?.content && data.content.feed_copy) {
        setStoryCopy(data.content.feed_copy);
        
        const { data: existingData } = await supabase
          .from('products_repository')
          .select('instagram_copies')
          .eq('id', productId)
          .single();

        const existingCopies = (existingData?.instagram_copies || {}) as Record<string, any>;
        
        const { error: updateError } = await supabase
          .from('products_repository')
          .update({
            instagram_copies: {
              ...existingCopies,
              story_copy: data.content.feed_copy,
              last_generated: new Date().toISOString()
            } as any
          })
          .eq('id', productId);

        if (updateError) throw updateError;

        toast({
          title: "Sucesso!",
          description: "Copy para Stories gerada!",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar Stories:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a copy para Stories.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // === Novas funções para Roteiro de Reels Audiovisual ===
  const generateReelsScripts = async () => {
    setGeneratingReelsScript(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-instagram-reels-script', {
        body: { productId }
      });

      if (error) throw error;

      if (data?.content && Array.isArray(data.content)) {
        setReelsScripts(data.content);
        toast({
          title: "Sucesso!",
          description: "Roteiros de Reels gerados com 4 variações!",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar scripts de reels:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar os roteiros de Reels.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReelsScript(false);
    }
  };

  const saveReelsScript = async (variationNum: number) => {
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({ instagram_reels_scripts: reelsScripts as any })
        .eq('id', productId);

      if (error) throw error;

      setEditingReelsScriptVariation(null);
      toast({
        title: "Salvo!",
        description: `Roteiro de Reels variação ${variationNum} salvo com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao salvar script:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o roteiro.",
        variant: "destructive",
      });
    }
  };

  const updateReelsScriptField = (variationIndex: number, field: 'hook' | 'cta', value: string) => {
    const updated = [...reelsScripts];
    updated[variationIndex] = { ...updated[variationIndex], [field]: value };
    setReelsScripts(updated);
  };

  const updateReelsScriptScene = (variationIndex: number, sceneIndex: number, field: 'visual' | 'dialogue', value: string) => {
    const updated = [...reelsScripts];
    const updatedScenes = [...updated[variationIndex].scenes];
    updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], [field]: value };
    updated[variationIndex] = { ...updated[variationIndex], scenes: updatedScenes };
    setReelsScripts(updated);
  };

  const addReelsScriptScene = (variationIndex: number) => {
    const updated = [...reelsScripts];
    updated[variationIndex] = {
      ...updated[variationIndex],
      scenes: [...updated[variationIndex].scenes, { visual: '', dialogue: '' }]
    };
    setReelsScripts(updated);
  };

  const removeReelsScriptScene = (variationIndex: number, sceneIndex: number) => {
    const updated = [...reelsScripts];
    if (updated[variationIndex].scenes.length <= 1) return;
    updated[variationIndex] = {
      ...updated[variationIndex],
      scenes: updated[variationIndex].scenes.filter((_, i) => i !== sceneIndex)
    };
    setReelsScripts(updated);
  };

  const copyReelsScriptToClipboard = (script: ReelsScript) => {
    const text = `ROTEIRO DE REELS - ${REELS_SCRIPT_LABELS[script.approach]?.label || script.approach}

🎣 HOOK: ${script.hook}

🎬 CENAS:
${script.scenes.map((scene, i) => `
CENA ${i + 1}:
📹 Visual: ${scene.visual}
💬 Diálogo: ${scene.dialogue}
`).join('\n')}

📢 CTA: ${script.cta}`;

    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Roteiro copiado para a área de transferência." });
  };

  const copyReelsScriptAsHTML = (script: ReelsScript) => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Roteiro de Reels - ${productName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #405de6, #833ab4, #c13584, #e1306c); min-height: 100vh; }
    .container { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    h1 { background: linear-gradient(135deg, #405de6, #c13584); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-top: 0; }
    .hook { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 12px 12px 0; margin: 16px 0; }
    .scene { background: #f3f4f6; padding: 16px; border-radius: 12px; margin: 12px 0; }
    .scene-number { font-weight: bold; color: #c13584; margin-bottom: 8px; }
    .visual { background: #dbeafe; padding: 10px; border-radius: 8px; margin: 6px 0; }
    .dialogue { background: #fce7f3; padding: 10px; border-radius: 8px; margin: 6px 0; }
    .cta { background: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 12px 12px 0; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 ${REELS_SCRIPT_LABELS[script.approach]?.label || script.approach}</h1>
    <div class="hook"><strong>🎣 Hook:</strong> ${script.hook}</div>
    <h2>🎬 Cenas</h2>
    ${script.scenes.map((scene, i) => `
    <div class="scene">
      <div class="scene-number">CENA ${i + 1}</div>
      <div class="visual"><strong>📹 Visual:</strong> ${scene.visual}</div>
      <div class="dialogue"><strong>💬 Diálogo:</strong> ${scene.dialogue}</div>
    </div>`).join('')}
    <div class="cta"><strong>📢 CTA:</strong> ${script.cta}</div>
  </div>
</body>
</html>`;

    navigator.clipboard.writeText(html);
    toast({ title: "HTML Copiado!", description: "Versão HTML do roteiro copiada." });
  };

  // === Funções existentes de salvar ===
  const saveFeedVariation = async (variationNum: number, copy: string, link?: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = (existingData?.instagram_copies as InstagramCopy) || {};
      
      const updatedFeedCopies = [...feedCopies];
      const index = updatedFeedCopies.findIndex(v => v.variation === variationNum);
      if (index !== -1) {
        updatedFeedCopies[index] = { ...updatedFeedCopies[index], copy, link };
      }

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            ...(existingCopies || {}),
            feed_copies: updatedFeedCopies,
            last_updated: new Date().toISOString()
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: `Variação ${variationNum} de Feed salva com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a variação.",
        variant: "destructive",
      });
    }
  };

  const saveReelsVariation = async (variationNum: number, copy: string, link?: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = (existingData?.instagram_copies as InstagramCopy) || {};
      
      const updatedReelsCopies = [...reelsCopies];
      const index = updatedReelsCopies.findIndex(v => v.variation === variationNum);
      if (index !== -1) {
        updatedReelsCopies[index] = { ...updatedReelsCopies[index], copy, link };
      }

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            ...(existingCopies || {}),
            reels_copies: updatedReelsCopies,
            last_updated: new Date().toISOString()
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: `Variação ${variationNum} de Reels salva com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a variação.",
        variant: "destructive",
      });
    }
  };

  const saveStory = async (content: string, link?: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = existingData?.instagram_copies as any || {};

      const updatedCopies = {
        ...existingCopies,
        story_copy: content,
        story_link: link || '',
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: updatedCopies as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: "Copy Stories salva com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a copy.",
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
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const copyHTMLVersion = async (text: string, type: 'feed' | 'story' | 'reels') => {
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram ${type.charAt(0).toUpperCase() + type.slice(1)} - ${productName}</title>
  <meta name="description" content="Copy para Instagram ${type} do produto ${productName}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); min-height: 100vh; }
    .instagram-container { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .instagram-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #efefef; }
    .instagram-content { font-size: 16px; line-height: 1.6; white-space: pre-wrap; color: #262626; }
    .hashtag { color: #0095f6; font-weight: 500; }
  </style>
</head>
<body>
  <div class="instagram-container">
    <div class="instagram-header"><strong>${productName}</strong></div>
    <div class="instagram-content">${text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')}</div>
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: `Versão HTML da copy ${type} copiada.`,
      });
    } catch (error) {
      console.error('Erro ao copiar HTML:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar a versão HTML.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Gerador de Copy Instagram - {productName}
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
              {/* SEÇÃO FEED - COM TABS PARA 4 VARIAÇÕES */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Copy para Feed (4 Variações)</CardTitle>
                    <Button
                      onClick={() => generateAllVariations('feed')}
                      disabled={generating}
                      size="sm"
                      variant="outline"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar Todas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={String(activeFeedTab)} onValueChange={(v) => setActiveFeedTab(Number(v))}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      {feedCopies.map((variation) => (
                        <TabsTrigger key={variation.variation} value={String(variation.variation)}>
                          <div className="flex flex-col items-center">
                            <span className="font-bold">#{variation.variation}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {variation.approach.replace('_', ' ')}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {feedCopies.map((variation, index) => (
                      <TabsContent key={variation.variation} value={String(variation.variation)} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {getApproachLabel(variation.approach)}
                          </Badge>
                          {variation.copy && (
                            <span className="text-xs text-muted-foreground">
                              {variation.copy.length} caracteres
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={variation.copy}
                          onChange={(e) => {
                            const newCopies = [...feedCopies];
                            newCopies[index].copy = e.target.value;
                            setFeedCopies(newCopies);
                          }}
                          className="min-h-[200px]"
                          placeholder={`Copy ${variation.variation} será gerada aqui...`}
                          readOnly={editingFeedVariation !== variation.variation}
                        />

                        {editingFeedVariation === variation.variation && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Link Externo (Canva)</label>
                            <Input
                              value={variation.link || ''}
                              onChange={(e) => {
                                const newCopies = [...feedCopies];
                                newCopies[index].link = e.target.value;
                                setFeedCopies(newCopies);
                              }}
                              placeholder="https://canva.com/design/..."
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          {editingFeedVariation === variation.variation ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  saveFeedVariation(variation.variation, variation.copy, variation.link);
                                  setEditingFeedVariation(null);
                                }}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  loadExistingCopies();
                                  setEditingFeedVariation(null);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingFeedVariation(variation.variation)}
                                disabled={!variation.copy}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              {variation.link && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(variation.link, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Canva
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(variation.copy)}
                                disabled={!variation.copy}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion(variation.copy, 'feed')}
                                disabled={!variation.copy}
                              >
                                <Code className="h-4 w-4 mr-2" />
                                HTML
                              </Button>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* SEÇÃO STORIES - MANTÉM ÚNICO */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Copy para Stories</CardTitle>
                    <Button
                      onClick={generateStory}
                      disabled={generating}
                      size="sm"
                      variant="outline"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={storyCopy}
                    onChange={(e) => setStoryCopy(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="A copy para stories será gerada aqui..."
                    readOnly={!editingStory}
                  />
                  {editingStory && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Link Externo (opcional)</label>
                      <Input
                        value={storyLink}
                        onChange={(e) => setStoryLink(e.target.value)}
                        placeholder="https://exemplo.com"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {storyCopy.length} caracteres
                    </span>
                    <div className="flex gap-2">
                      {!editingStory ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingStory(true)}
                            disabled={!storyCopy}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          {storyLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(storyLink, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Canva
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(storyCopy)}
                            disabled={!storyCopy}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyHTMLVersion(storyCopy, 'story')}
                            disabled={!storyCopy}
                          >
                            <Code className="h-4 w-4 mr-2" />
                            HTML
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              saveStory(storyCopy, storyLink);
                              setEditingStory(false);
                            }}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStory(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEÇÃO REELS - COM TABS PARA 4 VARIAÇÕES (TEXTO) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Copy para Reels (4 Variações)</CardTitle>
                    <Button
                      onClick={() => generateAllVariations('reels')}
                      disabled={generating}
                      size="sm"
                      variant="outline"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar Todas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={String(activeReelsTab)} onValueChange={(v) => setActiveReelsTab(Number(v))}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      {reelsCopies.map((variation) => (
                        <TabsTrigger key={variation.variation} value={String(variation.variation)}>
                          <div className="flex flex-col items-center">
                            <span className="font-bold">#{variation.variation}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {variation.approach.replace('_', ' ')}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {reelsCopies.map((variation, index) => (
                      <TabsContent key={variation.variation} value={String(variation.variation)} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {getApproachLabel(variation.approach)}
                          </Badge>
                          {variation.copy && (
                            <span className="text-xs text-muted-foreground">
                              {variation.copy.length} caracteres
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={variation.copy}
                          onChange={(e) => {
                            const newCopies = [...reelsCopies];
                            newCopies[index].copy = e.target.value;
                            setReelsCopies(newCopies);
                          }}
                          className="min-h-[200px]"
                          placeholder={`Copy ${variation.variation} será gerada aqui...`}
                          readOnly={editingReelsVariation !== variation.variation}
                        />

                        {editingReelsVariation === variation.variation && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Link Externo (Canva)</label>
                            <Input
                              value={variation.link || ''}
                              onChange={(e) => {
                                const newCopies = [...reelsCopies];
                                newCopies[index].link = e.target.value;
                                setReelsCopies(newCopies);
                              }}
                              placeholder="https://canva.com/design/..."
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          {editingReelsVariation === variation.variation ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  saveReelsVariation(variation.variation, variation.copy, variation.link);
                                  setEditingReelsVariation(null);
                                }}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  loadExistingCopies();
                                  setEditingReelsVariation(null);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingReelsVariation(variation.variation)}
                                disabled={!variation.copy}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              {variation.link && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(variation.link, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Canva
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(variation.copy)}
                                disabled={!variation.copy}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion(variation.copy, 'reels')}
                                disabled={!variation.copy}
                              >
                                <Code className="h-4 w-4 mr-2" />
                                HTML
                              </Button>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* === SEÇÃO ROTEIRO DE REELS (SCRIPT AUDIOVISUAL) - NOVO === */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Film className="h-5 w-5" />
                      🎬 Roteiro de Reels (Audiovisual)
                    </CardTitle>
                    <Button
                      onClick={generateReelsScripts}
                      disabled={generatingReelsScript}
                      size="sm"
                      variant="outline"
                    >
                      {generatingReelsScript ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar Todos
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scripts audiovisuais profissionais com hook, cenas e CTA
                  </p>
                </CardHeader>
                <CardContent>
                  <Tabs value={String(activeReelsScriptTab)} onValueChange={(v) => setActiveReelsScriptTab(Number(v))}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      {reelsScripts.map((script) => (
                        <TabsTrigger key={script.variation} value={String(script.variation)}>
                          <div className="flex flex-col items-center">
                            <span className="font-bold">#{script.variation}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {script.approach.replace('_', ' ')}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {reelsScripts.map((script, index) => {
                      const isEditing = editingReelsScriptVariation === script.variation;
                      const hasContent = script.hook || script.scenes.length > 0 || script.cta;

                      return (
                        <TabsContent key={script.variation} value={String(script.variation)} className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="capitalize">
                              {REELS_SCRIPT_LABELS[script.approach]?.label || script.approach}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {REELS_SCRIPT_LABELS[script.approach]?.description || ''}
                            </span>
                          </div>

                          {!hasContent ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>Nenhum roteiro gerado ainda</p>
                              <p className="text-sm">Clique em "Gerar Todos" para criar roteiros audiovisuais</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Hook */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">🎣 Hook Inicial</label>
                                {isEditing ? (
                                  <Textarea
                                    value={script.hook}
                                    onChange={(e) => updateReelsScriptField(index, 'hook', e.target.value)}
                                    className="min-h-[60px]"
                                    placeholder="Gancho inicial que prende a atenção..."
                                  />
                                ) : (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">{script.hook || 'Não definido'}</p>
                                  </div>
                                )}
                              </div>

                              {/* Cenas */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium">🎬 Cenas</label>
                                  {isEditing && (
                                    <Button size="sm" variant="outline" onClick={() => addReelsScriptScene(index)}>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Adicionar Cena
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="space-y-3">
                                  {script.scenes.map((scene, sceneIndex) => (
                                    <div key={sceneIndex} className="border rounded-lg p-4 bg-card">
                                      <div className="flex items-center justify-between mb-3">
                                        <Badge variant="secondary">Cena {sceneIndex + 1}</Badge>
                                        {isEditing && script.scenes.length > 1 && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => removeReelsScriptScene(index, sceneIndex)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground">📹 Visual</label>
                                          {isEditing ? (
                                            <Textarea
                                              value={scene.visual}
                                              onChange={(e) => updateReelsScriptScene(index, sceneIndex, 'visual', e.target.value)}
                                              className="mt-1 min-h-[80px]"
                                              placeholder="Descrição visual da cena..."
                                            />
                                          ) : (
                                            <p className="text-sm mt-1 p-2 bg-blue-50 border border-blue-100 rounded whitespace-pre-wrap">
                                              {scene.visual || 'Não definido'}
                                            </p>
                                          )}
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground">💬 Diálogo</label>
                                          {isEditing ? (
                                            <Textarea
                                              value={scene.dialogue}
                                              onChange={(e) => updateReelsScriptScene(index, sceneIndex, 'dialogue', e.target.value)}
                                              className="mt-1 min-h-[80px]"
                                              placeholder="Fala sugerida..."
                                            />
                                          ) : (
                                            <p className="text-sm mt-1 p-2 bg-pink-50 border border-pink-100 rounded whitespace-pre-wrap">
                                              {scene.dialogue || 'Não definido'}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* CTA */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">📢 Call-to-Action</label>
                                {isEditing ? (
                                  <Input
                                    value={script.cta}
                                    onChange={(e) => updateReelsScriptField(index, 'cta', e.target.value)}
                                    placeholder="CTA final do vídeo..."
                                  />
                                ) : (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm">{script.cta || 'Não definido'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Botões de ação */}
                          {hasContent && (
                            <div className="flex justify-end gap-2 pt-4 border-t">
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => saveReelsScript(script.variation)}>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    loadExistingCopies();
                                    setEditingReelsScriptVariation(null);
                                  }}>
                                    <X className="h-4 w-4 mr-1" />
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setEditingReelsScriptVariation(script.variation)}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => copyReelsScriptToClipboard(script)}>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copiar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => copyReelsScriptAsHTML(script)}>
                                    <Code className="h-4 w-4 mr-1" />
                                    HTML
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
