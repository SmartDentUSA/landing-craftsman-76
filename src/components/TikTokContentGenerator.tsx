import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Edit, Save, X, Zap, Code, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TikTokCopy {
  id: string;
  video_script: string;
  hashtags: string[];
  call_to_action: string;
  hook: string;
  trending_references: string[];
  generated_at: string;
  editable: boolean;
}

interface TikTokContentGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdate?: () => void;
}

export function TikTokContentGenerator({ productId, productName, isOpen, onClose, onProductUpdate }: TikTokContentGeneratorProps) {
  const [videoScript, setVideoScript] = useState('');
  const [hookText, setHookText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [editingScript, setEditingScript] = useState(false);
  const [editingHook, setEditingHook] = useState(false);
  const [editingCta, setEditingCta] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [templateCanvaUrl, setTemplateCanvaUrl] = useState<string>('');
  const [editingTemplateUrl, setEditingTemplateUrl] = useState<string>('');
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
        .select('tiktok_content')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const tiktokData = data?.tiktok_content as any;
      
      if (tiktokData && tiktokData.copies && tiktokData.copies.length > 0) {
        const latestCopy = tiktokData.copies[0];
        setVideoScript(latestCopy.video_script || '');
        setHookText(latestCopy.hook || '');
        setCtaText(latestCopy.call_to_action || '');
      }
      const templateUrl = tiktokData?.template_canva_url || '';
      setTemplateCanvaUrl(templateUrl);
      setEditingTemplateUrl(templateUrl);
    } catch (error) {
      console.error('Erro ao carregar conteúdo TikTok:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o conteúdo TikTok existente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTikTokContent = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tiktok-content', {
        body: {
          productId: productId
        }
      });

      if (error) {
        console.error('Erro ao gerar conteúdo TikTok:', error);
        throw error;
      }

      if (data?.content) {
        console.log('Conteúdo TikTok gerado:', data.content);
        
        setVideoScript(data.content.video_script || '');
        setHookText(data.content.hook || '');
        setCtaText(data.content.call_to_action || '');

        toast({
          title: "Sucesso!",
          description: "Conteúdo TikTok gerado com sucesso!",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar conteúdo TikTok:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o conteúdo TikTok. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
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

  const copyHTMLVersion = async (content: { script: string; hook: string; cta: string }) => {
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TikTok Script - ${productName}</title>
  <meta name="description" content="Script para TikTok do produto ${productName}">
  <meta name="robots" content="noindex, nofollow">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #ff0050, #ff4081, #e91e63);
      min-height: 100vh;
    }
    .tiktok-container {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .tiktok-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #efefef;
    }
    .tiktok-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(45deg, #ff0050, #ff4081);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      margin-right: 15px;
    }
    .section {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: #262626;
    }
    .hashtag {
      color: #ff0050;
      font-weight: 500;
    }
    .timestamp {
      text-align: center;
      font-size: 12px;
      color: #8e8e8e;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #efefef;
    }
  </style>
</head>
<body>
  <div class="tiktok-container">
    <div class="tiktok-header">
      <div class="tiktok-icon">🎵</div>
      <div>
        <strong>${productName}</strong>
        <div style="color: #666; font-size: 14px;">TikTok Content</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">🎬 Hook (Primeiros 3 segundos)</div>
      <div class="content">${content.hook}</div>
    </div>
    
    <div class="section">
      <div class="section-title">📝 Script do Vídeo</div>
      <div class="content">${content.script}</div>
    </div>
    
    <div class="section">
      <div class="section-title">📢 Call-to-Action</div>
      <div class="content">${content.cta}</div>
    </div>
    
    <div class="timestamp">
      ${new Date().toLocaleDateString('pt-BR')} • Script TikTok
    </div>
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML do conteúdo TikTok copiada para visualização web.",
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

  const saveContent = async (type: 'script' | 'hook' | 'cta', content: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('tiktok_content')
        .eq('id', productId)
        .single();

      const existingContent = existingData?.tiktok_content as any || { copies: [], last_generated: null };
      
      // Se copies estiver vazio, cria nova estrutura
      if (!existingContent.copies || existingContent.copies.length === 0) {
        existingContent.copies = [{
          id: crypto.randomUUID(),
          video_script: type === 'script' ? content : videoScript,
          hook: type === 'hook' ? content : hookText,
          call_to_action: type === 'cta' ? content : ctaText,
          hashtags: [],
          trending_references: [],
          generated_at: new Date().toISOString(),
          editable: true
        }];
      } else {
        // Atualiza copy existente
        const latestCopy = { ...existingContent.copies[0] };
        
        if (type === 'script') {
          latestCopy.video_script = content;
        }
        if (type === 'hook') {
          latestCopy.hook = content;
        }
        if (type === 'cta') {
          latestCopy.call_to_action = content;
        }
        
        existingContent.copies[0] = latestCopy;
      }
      
      existingContent.last_updated = new Date().toISOString();
      existingContent.template_canva_url = templateCanvaUrl;

      const { error } = await supabase
        .from('products_repository')
        .update({
          tiktok_content: existingContent
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: `Conteúdo ${type === 'script' ? 'do script' : type === 'hook' ? 'do hook' : 'do CTA'} salvo com sucesso!`,
      });
      
      // Trigger product update callback
      if (onProductUpdate) {
        onProductUpdate();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o conteúdo.",
        variant: "destructive",
      });
    }
  };

  const saveTemplateUrl = async () => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('tiktok_content')
        .eq('id', productId)
        .single();

      const existingContent = existingData?.tiktok_content as any || { copies: [], last_generated: null };
      existingContent.template_canva_url = editingTemplateUrl;

      const { error } = await supabase
        .from('products_repository')
        .update({
          tiktok_content: existingContent
        })
        .eq('id', productId);

      if (error) throw error;

      setTemplateCanvaUrl(editingTemplateUrl);
      setShowTemplateConfig(false);

      toast({
        title: "Template Salvo",
        description: "URL do Template Canva atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template.",
        variant: "destructive",
      });
    }
  };

  const getCharacterCount = (text: string) => text.length;
  const isOverLimit = (text: string) => getCharacterCount(text) > 5000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🎵</span>
            Gerador de Conteúdo TikTok - {productName}
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
              {/* Botões principais */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={generateTikTokContent}
                  disabled={generating}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  Gerar Conteúdo TikTok
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => setShowTemplateConfig(!showTemplateConfig)}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {templateCanvaUrl ? '✓ Template Canva' : 'Configurar Template Canva'}
                </Button>
              </div>

              {/* Configuração do Template Canva */}
              {showTemplateConfig && (
                <Card>
                  <CardContent className="p-4">
                    <label className="text-sm font-medium mb-2 block">
                      🎨 Template Canva (URL)
                    </label>
                    <Input
                      type="url"
                      value={editingTemplateUrl}
                      onChange={(e) => setEditingTemplateUrl(e.target.value)}
                      placeholder="https://www.canva.com/design/..."
                      className="mb-2"
                    />
                    <p className="text-xs text-muted-foreground mb-3">
                      Este link será usado para todos os conteúdos TikTok deste produto
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveTemplateUrl}>
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowTemplateConfig(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Botão Abrir Template Canva */}
              {templateCanvaUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(templateCanvaUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Template Canva
                </Button>
              )}

              {/* Hook (Primeiros 3 segundos) */}
              <Card>
                <CardHeader>
                  <CardTitle>🎬 Hook (Primeiros 3 segundos)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    className="min-h-[100px]"
                    placeholder="O hook será gerado aqui..."
                    readOnly={!editingHook}
                  />
                  <div className="flex justify-between items-center">
                    <Badge variant={isOverLimit(hookText) ? "destructive" : "secondary"}>
                      {getCharacterCount(hookText)}/5000 caracteres
                    </Badge>
                    <div className="flex gap-2">
                      {hookText && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(hookText)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar Texto</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {hookText && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion({ hook: hookText, script: '', cta: '' })}
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar HTML</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!editingHook ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingHook(true)}
                                disabled={!hookText}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    saveContent('hook', hookText);
                                    setEditingHook(false);
                                  }}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Salvar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingHook(false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Script do Vídeo */}
              <Card>
                <CardHeader>
                  <CardTitle>📝 Script do Vídeo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={videoScript}
                    onChange={(e) => setVideoScript(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="O script do vídeo será gerado aqui..."
                    readOnly={!editingScript}
                  />
                  <div className="flex justify-between items-center">
                    <Badge variant={isOverLimit(videoScript) ? "destructive" : "secondary"}>
                      {getCharacterCount(videoScript)}/5000 caracteres
                    </Badge>
                    <div className="flex gap-2">
                      {videoScript && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(videoScript)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar Texto</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                       )}
                      {videoScript && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion({ hook: '', script: videoScript, cta: '' })}
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar HTML</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!editingScript ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingScript(true)}
                                disabled={!videoScript}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    saveContent('script', videoScript);
                                    setEditingScript(false);
                                  }}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Salvar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingScript(false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call-to-Action */}
              <Card>
                <CardHeader>
                  <CardTitle>📢 Call-to-Action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="min-h-[100px]"
                  placeholder="O call-to-action será gerado aqui..."
                  readOnly={!editingCta}
                />
                <div className="flex justify-between items-center">
                  <Badge variant={isOverLimit(ctaText) ? "destructive" : "secondary"}>
                    {getCharacterCount(ctaText)}/5000 caracteres
                  </Badge>
                    <div className="flex gap-2">
                      {ctaText && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(ctaText)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar Texto</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    )}
                    {ctaText && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion({ hook: '', script: '', cta: ctaText })}
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar HTML</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!editingCta ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingCta(true)}
                                disabled={!ctaText}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  saveContent('cta', ctaText);
                                  setEditingCta(false);
                                }}
                              >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Salvar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCta(false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botão para copiar versão HTML completa */}
              {(videoScript || hookText || ctaText) && (
                <div className="flex justify-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => copyHTMLVersion({
                            script: videoScript,
                            hook: hookText,
                            cta: ctaText
                          })}
                        >
                          <Code className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar HTML Completo</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}