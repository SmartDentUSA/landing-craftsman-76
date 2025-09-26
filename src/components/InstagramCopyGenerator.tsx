import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Edit2, History, Settings, Instagram, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InstagramCopy {
  id: string;
  feed_copy: string;
  story_copy: string;
  hashtags: string[];
  call_to_action: string;
  post_type: string;
  generated_at: string;
  editable: boolean;
}

interface InstagramCopyGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InstagramCopyGenerator: React.FC<InstagramCopyGeneratorProps> = ({
  productId,
  productName,
  isOpen,
  onClose
}) => {
  const [copies, setCopies] = useState<InstagramCopy[]>([]);
  const [currentCopy, setCurrentCopy] = useState<InstagramCopy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCopy, setEditingCopy] = useState<InstagramCopy | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [companyMention, setCompanyMention] = useState('@smartdentoficial');
  const [instagramType, setInstagramType] = useState<'feed' | 'reels' | 'carousel'>('feed');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && productId) {
      loadCopies();
      loadCompanyConfig();
    }
  }, [isOpen, productId]);

  const loadCopies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const instagramData = data?.instagram_copies as any || { copies: [] };
      const loadedCopies = instagramData.copies || [];
      setCopies(loadedCopies);
      
      if (loadedCopies.length > 0) {
        setCurrentCopy(loadedCopies[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar copies do Instagram:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as copies do Instagram.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('company_profile')
        .select('instagram_profile')
        .maybeSingle();

      if (error) throw error;
      if (data?.instagram_profile) {
        setCompanyMention(data.instagram_profile);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração da empresa:', error);
    }
  };

  const generateNewCopy = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'instagram',
          productId: productId,
          instagramType: instagramType
        }
      });

      if (error) throw error;

      const newCopy: InstagramCopy = {
        id: crypto.randomUUID(),
        ...data.content,
        generated_at: new Date().toISOString(),
        editable: true
      };

      const updatedCopies = [newCopy, ...copies];
      setCopies(updatedCopies);
      setCurrentCopy(newCopy);

      // Salvar no banco
      const { error: updateError } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            copies: updatedCopies,
            last_generated: new Date().toISOString()
          } as any
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Nova copy do Instagram gerada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar copy do Instagram:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a copy do Instagram.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCompanyConfig = async () => {
    try {
      const { error } = await supabase
        .from('company_profile')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          company_name: 'SmartDent',
          instagram_profile: companyMention
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Configuração da empresa salva com sucesso.",
      });
      setShowConfig(false);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o conteúdo.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (copy: InstagramCopy) => {
    setEditingCopy({ ...copy });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!editingCopy) return;

    try {
      const updatedCopies = copies.map(copy => 
        copy.id === editingCopy.id ? editingCopy : copy
      );

      setCopies(updatedCopies);
      
      if (currentCopy?.id === editingCopy.id) {
        setCurrentCopy(editingCopy);
      }

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            copies: updatedCopies,
            last_generated: copies.find(c => c.id === editingCopy.id)?.generated_at || new Date().toISOString()
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Copy editada com sucesso.",
      });
      
      setIsEditing(false);
      setEditingCopy(null);
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a edição.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingCopy(null);
  };

  const getCharacterCount = (text: string | undefined) => text?.length || 0;
  const isOverLimit = (text: string | undefined, limit: number) => getCharacterCount(text) > limit;

  const formatCopy = (content: any) => {
    if (typeof content === 'string') {
      return content.replace(/\\n/g, '\n');
    }
    if (content?.feed_copy) {
      return content.feed_copy.replace(/\\n/g, '\n');
    }
    return JSON.stringify(content, null, 2);
  };

  const getHashtagsString = (hashtags: string[]) => {
    return hashtags.join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Gerador de Copy Instagram - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seletor de Tipo e Botões de Ação */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="instagram-type">Tipo de Copy:</Label>
                <Select value={instagramType} onValueChange={(value: 'feed' | 'reels' | 'carousel') => setInstagramType(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feed">Copy Feed (post estático)</SelectItem>
                    <SelectItem value="reels">Copy Vídeo Reels</SelectItem>
                    <SelectItem value="carousel">Copy Carrossel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={generateNewCopy} 
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Instagram className="mr-2 h-4 w-4" />
                    Gerar Nova Copy
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="mr-2 h-4 w-4" />
                {showHistory ? 'Ocultar' : 'Ver'} Histórico
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurar
              </Button>
            </div>
          </div>

          {/* Configuração da Empresa */}
          {showConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Configuração da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company-mention">Mention da Empresa no Instagram</Label>
                  <Input
                    id="company-mention"
                    value={companyMention}
                    onChange={(e) => setCompanyMention(e.target.value)}
                    placeholder="@smartdentoficial"
                  />
                </div>
                <Button onClick={saveCompanyConfig}>
                  <Check className="mr-2 h-4 w-4" />
                  Salvar Configuração
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Copy Atual */}
          {currentCopy && !isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Copy para Instagram - {currentCopy.post_type === 'feed' ? 'Post Estático' : currentCopy.post_type === 'reels' ? 'Vídeo Reels' : 'Carrossel'}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formatCopy(currentCopy.feed_copy))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(currentCopy)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Copy do Feed */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Copy para Feed</Label>
                    <Badge variant={isOverLimit(currentCopy.feed_copy || '', 2200) ? "destructive" : "secondary"}>
                      {getCharacterCount(currentCopy.feed_copy || '')}/2200
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">
                    {formatCopy(currentCopy.feed_copy)}
                  </div>
                </div>

                {/* Copy para Stories */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Copy para Stories</Label>
                    <Badge variant={isOverLimit(currentCopy.story_copy || '', 160) ? "destructive" : "secondary"}>
                      {getCharacterCount(currentCopy.story_copy || '')}/160
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {currentCopy.story_copy}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <Label>Hashtags ({currentCopy.hashtags?.length || 0})</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {getHashtagsString(currentCopy.hashtags || [])}
                  </div>
                </div>

                {/* Call to Action */}
                <div>
                  <Label>Call to Action</Label>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {currentCopy.call_to_action}
                  </div>
                </div>

                <Badge variant="outline">
                  Gerado em: {new Date(currentCopy.generated_at).toLocaleString()}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Modo de Edição */}
          {isEditing && editingCopy && (
            <Card>
              <CardHeader>
                <CardTitle>Editando Copy do Instagram</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Editar Copy do Feed */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Copy para Feed</Label>
                    <Badge variant={isOverLimit(editingCopy.feed_copy || '', 2200) ? "destructive" : "secondary"}>
                      {getCharacterCount(editingCopy.feed_copy || '')}/2200
                    </Badge>
                  </div>
                  <Textarea
                    value={editingCopy.feed_copy}
                    onChange={(e) => setEditingCopy({...editingCopy, feed_copy: e.target.value})}
                    className="min-h-[200px]"
                  />
                </div>

                {/* Editar Copy para Stories */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Copy para Stories</Label>
                    <Badge variant={isOverLimit(editingCopy.story_copy || '', 160) ? "destructive" : "secondary"}>
                      {getCharacterCount(editingCopy.story_copy || '')}/160
                    </Badge>
                  </div>
                  <Textarea
                    value={editingCopy.story_copy}
                    onChange={(e) => setEditingCopy({...editingCopy, story_copy: e.target.value})}
                    className="min-h-[100px]"
                  />
                </div>

                {/* Editar Hashtags */}
                <div>
                  <Label>Hashtags (separadas por espaço)</Label>
                  <Textarea
                    value={getHashtagsString(editingCopy.hashtags || [])}
                    onChange={(e) => setEditingCopy({
                      ...editingCopy, 
                      hashtags: e.target.value.split(' ').filter(tag => tag.trim())
                    })}
                    placeholder="#hashtag1 #hashtag2 #hashtag3"
                  />
                </div>

                {/* Editar Call to Action */}
                <div>
                  <Label>Call to Action</Label>
                  <Input
                    value={editingCopy.call_to_action}
                    onChange={(e) => setEditingCopy({...editingCopy, call_to_action: e.target.value})}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveEdit}>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          {showHistory && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Copies</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Carregando histórico...
                  </div>
                ) : copies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma copy gerada ainda. Clique em "Gerar Nova Copy" para começar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {copies.map((copy, index) => (
                      <Card key={copy.id} className={currentCopy?.id === copy.id ? "ring-2 ring-primary" : ""}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">
                              Copy #{copies.length - index}
                            </Badge>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentCopy(copy)}
                              >
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(formatCopy(copy.feed_copy))}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {formatCopy(copy.feed_copy)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(copy.generated_at).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};