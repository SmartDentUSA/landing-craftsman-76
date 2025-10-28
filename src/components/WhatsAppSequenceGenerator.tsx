import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLinksRepository } from '@/hooks/useLinksRepository';
import { ContentViewToggle } from '@/components/ui/content-view-toggle';
import { ProductVideosList } from '@/components/ProductVideosList';
import { ProductResourceCTAsList } from '@/components/ProductResourceCTAsList';
import { RelatedLandingPagesList } from '@/components/RelatedLandingPagesList';
import {
  MessageCircle, 
  Plus, 
  History, 
  Edit, 
  Save, 
  X, 
  Copy, 
  Loader2,
  Code,
  ExternalLink
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WhatsAppSequenceMessage {
  id: string;
  number: number;
  content: string;
  editable: boolean;
  approach: 'beneficio' | 'prova_social' | 'urgencia' | 'tecnica' | 'curiosidade' | 'garantia' | 'ultima_chamada';
}

interface WhatsAppSequenceGeneration {
  id: string;
  generated_at: string;
  messages: WhatsAppSequenceMessage[];
}

interface WhatsAppSequences {
  sequences: WhatsAppSequenceGeneration[];
  last_generated: string | null;
}

interface WhatsAppSequenceGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppSequenceGenerator: React.FC<WhatsAppSequenceGeneratorProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
}) => {
  const [sequences, setSequences] = useState<WhatsAppSequenceGeneration[]>([]);
  const [currentSequence, setCurrentSequence] = useState<WhatsAppSequenceMessage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [templateCanvaUrl, setTemplateCanvaUrl] = useState<string>('');
  const [editingTemplateUrl, setEditingTemplateUrl] = useState<string>('');
  const [messageViewModes, setMessageViewModes] = useState<Record<string, 'edit' | 'text' | 'html'>>({});
  const { toast } = useToast();
  const { allLinks, isLoading: linksLoading } = useLinksRepository();

  const getMessageViewMode = (messageId: string) => messageViewModes[messageId] || 'edit';
  const setMessageViewMode = (messageId: string, mode: 'edit' | 'text' | 'html') => {
    setMessageViewModes(prev => ({ ...prev, [messageId]: mode }));
  };

  useEffect(() => {
    if (isOpen) {
      loadSequences();
    }
  }, [isOpen, productId]);

  const loadSequences = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('whatsapp_sequences')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const sequencesData = data?.whatsapp_sequences as unknown as WhatsAppSequences;
      if (sequencesData?.sequences && sequencesData.sequences.length > 0) {
        setSequences(sequencesData.sequences);
        setCurrentSequence(sequencesData.sequences[0].messages);
      }
      const templateUrl = (sequencesData as any)?.template_canva_url || '';
      setTemplateCanvaUrl(templateUrl);
      setEditingTemplateUrl(templateUrl);
    } catch (error) {
      console.error('Erro ao carregar sequências:', error);
      toast({
        title: "Erro ao carregar sequências",
        description: "Não foi possível carregar o histórico de sequências.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewSequence = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'whatsapp_sequence',
          productId: productId
        }
      });

      if (error) throw error;

      if (data?.success && data?.sequence) {
        toast({
          title: "Sequência Gerada!",
          description: "7 mensagens WhatsApp foram criadas com sucesso.",
        });
        await loadSequences();
      }
    } catch (error) {
      console.error('Erro ao gerar sequência:', error);
      toast({
        title: "Erro ao gerar sequência",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive"
      });
    }
  };

  const copyHTMLVersion = async (content: string) => {
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #128C7E 0%, #075E54 100%); padding: 24px; border-radius: 12px; max-width: 600px;">
        <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="white-space: pre-wrap; color: #1f2937; font-size: 14px; line-height: 1.6;">
            ${content}
          </div>
        </div>
      </div>
    `;

    try {
      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML copiada para área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar HTML:', error);
    }
  };

  const startEditing = (message: WhatsAppSequenceMessage) => {
    setEditingId(message.id);
    setEditingContent(message.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const updatedSequences = sequences.map(seq => ({
        ...seq,
        messages: seq.messages.map(msg =>
          msg.id === editingId ? { ...msg, content: editingContent } : msg
        )
      }));

      const updatedData: any = {
        sequences: updatedSequences,
        last_generated: sequences[0]?.generated_at || new Date().toISOString(),
        template_canva_url: templateCanvaUrl
      };

      const { error } = await supabase
        .from('products_repository')
        .update({ whatsapp_sequences: updatedData as any })
        .eq('id', productId);

      if (error) throw error;

      setSequences(updatedSequences);
      setCurrentSequence(updatedSequences[0].messages);
      setEditingId(null);
      setEditingContent('');

      toast({
        title: "Mensagem Atualizada!",
        description: "A mensagem foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a edição.",
        variant: "destructive"
      });
    }
  };

  const saveTemplateUrl = async () => {
    try {
      const updatedData: any = {
        sequences: sequences,
        last_generated: sequences[0]?.generated_at || new Date().toISOString(),
        template_canva_url: editingTemplateUrl
      };

      const { error } = await supabase
        .from('products_repository')
        .update({ whatsapp_sequences: updatedData })
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

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const getCharacterCount = (text: string) => text.length;
  const isOverLimit = (text: string) => getCharacterCount(text) > 5000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Sequência de 7 Mensagens WhatsApp - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botões de Ação */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={generateNewSequence} 
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar Nova Sequência (7 Mensagens)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar' : 'Ver'} Histórico de Sequências
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
                  Este link será usado para todas as mensagens da sequência WhatsApp deste produto
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

          {/* Sequência Atual */}
          {currentSequence.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Sequência Atual (7 Mensagens)</h3>
                
                <div className="space-y-4">
                  {currentSequence.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Mensagem {message.number}
                          </Badge>
                          <Badge>{getApproachLabel(message.approach)}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {editingId !== message.id && (
                            <ContentViewToggle 
                              mode={getMessageViewMode(message.id)} 
                              onModeChange={(mode) => setMessageViewMode(message.id, mode)} 
                            />
                          )}
                          <div className="flex gap-2">
                            {editingId === message.id ? (
                              <>
                                <Button size="sm" onClick={saveEdit} disabled={isOverLimit(editingContent)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => startEditing(message)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(message.content)}>
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar Texto</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => copyHTMLVersion(message.content)}>
                                      <Code className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar HTML</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>

                      {editingId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-[150px] font-mono text-sm"
                          />
                          <ProductVideosList 
                            productId={productId}
                            onInsert={(text) => setEditingContent(prev => prev + text)}
                          />
                          <ProductResourceCTAsList
                            productId={productId}
                            onInsert={(text) => {
                              navigator.clipboard.writeText(text);
                              toast({ title: "Link CTA copiado!" });
                            }}
                          />
                          <RelatedLandingPagesList
                            productId={productId}
                            onInsert={(text) => {
                              navigator.clipboard.writeText(text);
                              toast({ title: "Link da Landing Page copiado!" });
                            }}
                          />
                          <Badge variant={isOverLimit(editingContent) ? "destructive" : "secondary"}>
                            {getCharacterCount(editingContent)}/5000 caracteres
                          </Badge>
                        </div>
                      ) : (
                        <>
                          {getMessageViewMode(message.id) === 'edit' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="whitespace-pre-wrap font-mono text-sm">
                                {message.content}
                              </div>
                            </div>
                          )}

                          {getMessageViewMode(message.id) === 'text' && (
                            <div className="rounded-md border border-input bg-muted px-3 py-2">
                              <div className="whitespace-pre-wrap font-mono text-sm">
                                {message.content}
                              </div>
                            </div>
                          )}

                          {getMessageViewMode(message.id) === 'html' && (
                            <div className="rounded-md border border-input bg-background p-4">
                              <div className="max-w-[400px] mx-auto">
                                <div className="bg-[#25d366] rounded-xl p-4">
                                  <div className="bg-[#dcf8c6] text-black p-3 rounded-lg whitespace-pre-wrap font-sans text-sm leading-relaxed shadow-sm">
                                    {message.content}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <Badge variant={isOverLimit(message.content) ? "destructive" : "secondary"} className="mt-2">
                            {getCharacterCount(message.content)}/1000 caracteres
                          </Badge>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de Sequências */}
          {showHistory && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Histórico de Sequências Geradas</h3>
                
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : sequences.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma sequência gerada ainda.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {sequences.map((seq, seqIndex) => (
                      <Card key={seq.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <Badge variant="outline">Geração {seqIndex + 1}</Badge>
                              <span className="text-sm text-muted-foreground ml-2">
                                {new Date(seq.generated_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setCurrentSequence(seq.messages)}
                            >
                              Usar Esta Sequência
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            {seq.messages.map((msg) => (
                              <div key={msg.id} className="border rounded p-3 bg-gray-50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">Mensagem {msg.number}</Badge>
                                  <Badge variant="outline">{getApproachLabel(msg.approach)}</Badge>
                                </div>
                                <div className="text-sm font-mono whitespace-pre-wrap line-clamp-3">
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Seção de Links Disponíveis */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">Links Disponíveis</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use estes links para personalizar suas mensagens do WhatsApp.
              </p>
              
              {linksLoading ? (
                <div className="text-sm text-muted-foreground">Carregando links...</div>
              ) : allLinks.length > 0 ? (
                <ScrollArea className="h-32 w-full border rounded p-3">
                  <div className="space-y-2">
                    {allLinks.map((link) => (
                      <div key={link.id} className="text-xs border-b pb-1">
                        <div className="font-medium">{link.name}</div>
                        <div className="text-muted-foreground break-all">{link.url}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {link.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Nenhum link disponível. Configure links no repositório.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getApproachLabel(approach: string): string {
  const labels: Record<string, string> = {
    'beneficio': '✅ Benefício',
    'prova_social': '⭐ Prova Social',
    'urgencia': '⏰ Urgência',
    'tecnica': '🔧 Técnica',
    'curiosidade': '🤔 Curiosidade',
    'garantia': '🛡️ Garantia',
    'ultima_chamada': '🔥 Última Chamada'
  };
  return labels[approach] || approach;
}
