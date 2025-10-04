import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Edit, Save, X, Zap, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InstagramCopy {
  id: string;
  feed_copy: string;
  story_copy: string;
  hashtags: string[];
  call_to_action: string;
  post_type: string;
  generated_at: string;
  editable: boolean;
  external_link?: string;
}

interface InstagramCopyGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InstagramCopyGenerator({ productId, productName, isOpen, onClose }: InstagramCopyGeneratorProps) {
  const [feedCopy, setFeedCopy] = useState('');
  const [storyCopy, setStoryCopy] = useState('');
  const [reelsCopy, setReelsCopy] = useState('');
  const [feedLink, setFeedLink] = useState('');
  const [storyLink, setStoryLink] = useState('');
  const [reelsLink, setReelsLink] = useState('');
  const [editingFeed, setEditingFeed] = useState(false);
  const [editingStory, setEditingStory] = useState(false);
  const [editingReels, setEditingReels] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
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
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const instagramData = data?.instagram_copies as any;
      
      if (instagramData) {
        // Nova estrutura direta
        if (instagramData.feed_copy || instagramData.story_copy || instagramData.reels_copy) {
          setFeedCopy(instagramData.feed_copy || '');
          setStoryCopy(instagramData.story_copy || '');
          setReelsCopy(instagramData.reels_copy || '');
          setFeedLink(instagramData.feed_link || '');
          setStoryLink(instagramData.story_link || '');
          setReelsLink(instagramData.reels_link || '');
        }
        // Estrutura antiga com array de copies (fallback)
        else if (instagramData.copies && instagramData.copies.length > 0) {
          const feedData = instagramData.copies.find((item: any) => item.post_type === 'feed');
          const reelsData = instagramData.copies.find((item: any) => item.post_type === 'reels');
          const carouselData = instagramData.copies.find((item: any) => item.post_type === 'carousel');
          
          setFeedCopy(feedData?.feed_copy || '');
          setReelsCopy(reelsData?.feed_copy || '');
          setStoryCopy(carouselData?.feed_copy || '');
        }
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

  const generateAllCopies = async () => {
    setGenerating(true);
    try {
      const types = [
        { type: 'feed', label: 'Feed' },
        { type: 'reels', label: 'Reels' },
        { type: 'carousel', label: 'Stories' }
      ];
      
      const allCopies: any = {};
      
      for (const { type, label } of types) {
        console.log(`Gerando copy para ${label}...`);
        
        const { data, error } = await supabase.functions.invoke('generate-social-content', {
          body: {
            type: 'instagram',
            productId: productId,
            instagramType: type
          }
        });

        if (error) {
          console.error(`Erro ao gerar ${label}:`, error);
          throw error;
        }

        if (data?.content) {
          console.log(`Copy gerada para ${label}:`, data.content);
          
          // Atualizar estado conforme o tipo
          const content = data.content.feed_copy || '';
          if (type === 'feed') {
            setFeedCopy(content);
            allCopies.feed_copy = content;
          }
          else if (type === 'reels') {
            setReelsCopy(content);
            allCopies.reels_copy = content;
          }
          else if (type === 'carousel') {
            setStoryCopy(content);
            allCopies.story_copy = content;
          }

          // Preservar outros dados da resposta
          if (data.content.hashtags) allCopies.hashtags = data.content.hashtags;
          if (data.content.call_to_action) allCopies.call_to_action = data.content.call_to_action;
        }
      }

      // Salvar todas as copies no banco usando nova estrutura
      if (Object.keys(allCopies).length > 0) {
        const { error: updateError } = await supabase
          .from('products_repository')
          .update({
            instagram_copies: {
              ...allCopies,
              last_generated: new Date().toISOString()
            }
          })
          .eq('id', productId);

        if (updateError) {
          console.error('Erro ao salvar no banco:', updateError);
          throw updateError;
        }
      }

      toast({
        title: "Sucesso!",
        description: "Todas as copies foram geradas!",
      });
    } catch (error) {
      console.error('Erro ao gerar copies:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar as copies. Tente novamente.",
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

  const copyHTMLVersion = async (text: string, type: 'feed' | 'story' | 'reels') => {
    try {
      // Generate SEO optimized HTML version for Instagram post preview
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram ${type.charAt(0).toUpperCase() + type.slice(1)} - ${productName}</title>
  <meta name="description" content="Copy para Instagram ${type} do produto ${productName}">
  <meta name="robots" content="noindex, nofollow">
  <meta property="og:title" content="Instagram ${type.charAt(0).toUpperCase() + type.slice(1)} - ${productName}">
  <meta property="og:description" content="Copy para Instagram ${type} do produto ${productName}">
  <meta property="og:type" content="article">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d);
      min-height: 100vh;
    }
    .instagram-container {
      background: white;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      position: relative;
    }
    .instagram-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #efefef;
    }
    .instagram-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      margin-right: 15px;
    }
    .type-badge {
      background: #0095f6;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .instagram-content {
      font-size: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: #262626;
    }
    .hashtag {
      color: #0095f6;
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
    .engagement {
      display: flex;
      justify-content: space-around;
      margin-top: 15px;
      padding: 10px 0;
      border-top: 1px solid #efefef;
    }
    .engagement-item {
      display: flex;
      align-items: center;
      color: #8e8e8e;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="instagram-container">
    <div class="instagram-header">
      <div class="instagram-icon">📸</div>
      <div>
        <strong>${productName}</strong>
        <div class="type-badge">${type}</div>
      </div>
    </div>
    <div class="instagram-content">
      ${text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')}
    </div>
    <div class="engagement">
      <div class="engagement-item">❤️ Curtir</div>
      <div class="engagement-item">💬 Comentar</div>
      <div class="engagement-item">📤 Compartilhar</div>
    </div>
    <div class="timestamp">
      ${new Date().toLocaleDateString('pt-BR')} • Visualização de Copy
    </div>
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: `Versão HTML da copy ${type} copiada para visualização web.`,
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

  const saveCopy = async (type: 'feed' | 'story' | 'reels', content: string, link?: string) => {
    try {
      // Carregar dados existentes
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = existingData?.instagram_copies as any || {};

      // Atualizar o campo específico
      const fieldMap = {
        'feed': 'feed_copy',
        'story': 'story_copy', 
        'reels': 'reels_copy'
      };

      const linkFieldMap = {
        'feed': 'feed_link',
        'story': 'story_link', 
        'reels': 'reels_link'
      };

      const updatedCopies = {
        ...existingCopies,
        [fieldMap[type]]: content,
        [linkFieldMap[type]]: link || '',
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: updatedCopies
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: `Copy ${type} salva com sucesso!`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              {/* Botão principal para gerar todas as copies */}
              <div className="flex justify-center">
                <Button
                  onClick={generateAllCopies}
                  disabled={generating}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  Gerar Todas as Copies
                </Button>
              </div>

              {/* Copy para Feed */}
              <Card>
                <CardHeader>
                  <CardTitle>Copy para Feed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={feedCopy}
                    onChange={(e) => setFeedCopy(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="A copy para feed será gerada aqui..."
                    readOnly={!editingFeed}
                  />
                  {editingFeed && (
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-1 block">Link Externo (opcional)</label>
                      <Input
                        value={feedLink}
                        onChange={(e) => setFeedLink(e.target.value)}
                        placeholder="https://exemplo.com"
                        className="text-sm"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {feedCopy.length} caracteres
                    </span>
                    <div className="flex gap-2">
                      {feedCopy && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(feedCopy)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {feedLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(feedLink, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyHTMLVersion(feedCopy, 'feed')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {!editingFeed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingFeed(true)}
                          disabled={!feedCopy}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              saveCopy('feed', feedCopy, feedLink);
                              setEditingFeed(false);
                            }}
                          >
                            <Save className="h-4 w-4" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingFeed(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Copy para Stories */}
              <Card>
                <CardHeader>
                  <CardTitle>Copy para Stories</CardTitle>
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
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-1 block">Link Externo (opcional)</label>
                      <Input
                        value={storyLink}
                        onChange={(e) => setStoryLink(e.target.value)}
                        placeholder="https://exemplo.com"
                        className="text-sm"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {storyCopy.length} caracteres
                    </span>
                    <div className="flex gap-2">
                      {storyCopy && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(storyCopy)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {storyLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(storyLink, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyHTMLVersion(storyCopy, 'story')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {!editingStory ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingStory(true)}
                          disabled={!storyCopy}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              saveCopy('story', storyCopy, storyLink);
                              setEditingStory(false);
                            }}
                          >
                            <Save className="h-4 w-4" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingStory(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Copy para Reels */}
              <Card>
                <CardHeader>
                  <CardTitle>Copy para Reels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={reelsCopy}
                    onChange={(e) => setReelsCopy(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="A copy para reels será gerada aqui..."
                    readOnly={!editingReels}
                  />
                  {editingReels && (
                    <div className="pt-2">
                      <label className="text-sm font-medium mb-1 block">Link Externo (opcional)</label>
                      <Input
                        value={reelsLink}
                        onChange={(e) => setReelsLink(e.target.value)}
                        placeholder="https://exemplo.com"
                        className="text-sm"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {reelsCopy.length} caracteres
                    </span>
                    <div className="flex gap-2">
                      {reelsCopy && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(reelsCopy)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {reelsLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(reelsLink, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyHTMLVersion(reelsCopy, 'reels')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {!editingReels ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingReels(true)}
                          disabled={!reelsCopy}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              saveCopy('reels', reelsCopy, reelsLink);
                              setEditingReels(false);
                            }}
                          >
                            <Save className="h-4 w-4" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingReels(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}