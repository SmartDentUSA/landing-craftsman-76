import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, Copy, Edit, Save, X, Loader2, Plus, History, Code, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLinksRepository } from '@/hooks/useLinksRepository';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContentViewToggle } from '@/components/ui/content-view-toggle';
import { ProductVideosList } from '@/components/ProductVideosList';

interface WhatsAppMessage {
  id: string;
  content: string;
  generated_at: string;
  editable: boolean;
}

interface WhatsAppMessageGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppMessageGenerator: React.FC<WhatsAppMessageGeneratorProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'text' | 'html'>('edit');
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [templateCanvaUrl, setTemplateCanvaUrl] = useState<string>('');
  const [editingTemplateUrl, setEditingTemplateUrl] = useState<string>('');
  const { toast } = useToast();
  const { allLinks, isLoading: linksLoading } = useLinksRepository();

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, productId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('whatsapp_messages')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const whatsappData = data.whatsapp_messages as any;
      const messagesData = whatsappData?.messages || [];
      const templateUrl = whatsappData?.template_canva_url || '';
      setMessages(messagesData);
      setTemplateCanvaUrl(templateUrl);
      setEditingTemplateUrl(templateUrl);
      
      if (messagesData.length > 0) {
        setCurrentMessage(messagesData[0].content);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewMessage = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'whatsapp',
          productId: productId
        }
      });

      if (error) throw error;

      setCurrentMessage(data.content);
      await loadMessages(); // Recarrega para pegar a mensagem salva

      toast({
        title: "Sucesso",
        description: "Nova mensagem WhatsApp gerada!",
      });
    } catch (error) {
      console.error('Erro ao gerar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a mensagem.",
        variant: "destructive",
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
        description: "Mensagem copiada para a área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  const copyHTMLVersion = async (content: string) => {
    try {
      // Generate SEO optimized HTML version for web sharing
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mensagem WhatsApp - ${productName}</title>
  <meta name="description" content="Mensagem WhatsApp sobre ${productName}">
  <meta name="robots" content="noindex, nofollow">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f0f0f0;
    }
    .whatsapp-container {
      background: #25d366;
      border-radius: 15px;
      padding: 20px;
      color: white;
      position: relative;
    }
    .whatsapp-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      font-weight: bold;
    }
    .whatsapp-message {
      background: #dcf8c6;
      color: #000;
      padding: 15px;
      border-radius: 12px;
      white-space: pre-wrap;
      font-size: 16px;
      line-height: 1.4;
      position: relative;
    }
    .whatsapp-message::after {
      content: '';
      position: absolute;
      bottom: -8px;
      right: 15px;
      border: 8px solid transparent;
      border-top-color: #dcf8c6;
    }
    .timestamp {
      text-align: right;
      font-size: 12px;
      color: #666;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="whatsapp-container">
    <div class="whatsapp-header">
      💬 Mensagem WhatsApp - ${productName}
    </div>
    <div class="whatsapp-message">
      ${content}
    </div>
    <div class="timestamp">
      ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML da mensagem copiada para visualização web.",
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

  const startEditing = (message: WhatsAppMessage) => {
    setEditingId(message.id);
    setEditingContent(message.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      // Atualizar na lista local
      const updatedMessages = messages.map(msg => 
        msg.id === editingId ? { ...msg, content: editingContent } : msg
      );
      
      // Atualizar no banco
      const { error } = await supabase
        .from('products_repository')
        .update({ 
          whatsapp_messages: { 
            messages: updatedMessages, 
            last_generated: new Date().toISOString(),
            template_canva_url: templateCanvaUrl
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      setMessages(updatedMessages);
      
      // Se estamos editando a mensagem atual
      if (editingId === messages[0]?.id) {
        setCurrentMessage(editingContent);
      }

      setEditingId(null);
      setEditingContent('');

      toast({
        title: "Salvo",
        description: "Mensagem atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a edição.",
        variant: "destructive",
      });
    }
  };

  const saveTemplateUrl = async () => {
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({ 
          whatsapp_messages: { 
            messages: messages,
            last_generated: new Date().toISOString(),
            template_canva_url: editingTemplateUrl
          } as any
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

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const getCharacterCount = (text: string) => text.length;
  const isOverLimit = (text: string) => getCharacterCount(text) > 5000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Gerador de Mensagens WhatsApp - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ações principais */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={generateNewMessage} 
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar Nova Mensagem
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar' : 'Ver'} Histórico
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
                  Este link será usado para todas as mensagens WhatsApp deste produto
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

          {/* Mensagem atual */}
          {currentMessage && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">Mensagem Atual</h3>
                  <div className="flex items-center gap-2">
                    <ContentViewToggle mode={viewMode} onModeChange={setViewMode} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(currentMessage)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar Texto</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyHTMLVersion(currentMessage)}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar HTML</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Modo Editar */}
                {viewMode === 'edit' && (
                  <>
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="Mensagem editável..."
                    />
                    <ProductVideosList 
                      productId={productId}
                      onInsert={(text) => setCurrentMessage(prev => prev + text)}
                    />
                  </>
                )}

                {/* Modo Texto */}
                {viewMode === 'text' && (
                  <div className="min-h-[300px] rounded-md border border-input bg-muted px-3 py-2">
                    <div className="whitespace-pre-wrap font-mono text-sm">
                      {currentMessage}
                    </div>
                  </div>
                )}

                {/* Modo HTML */}
                {viewMode === 'html' && (
                  <div className="min-h-[300px] rounded-md border border-input bg-background p-4">
                    <div className="max-w-[600px] mx-auto">
                      <div className="bg-[#25d366] rounded-2xl p-5">
                        <div className="bg-[#dcf8c6] text-black p-4 rounded-xl whitespace-pre-wrap font-sans text-base leading-relaxed shadow-md">
                          {currentMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-2">
                  <Badge variant={isOverLimit(currentMessage) ? "destructive" : "secondary"}>
                    {getCharacterCount(currentMessage)}/5000 caracteres
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de mensagens */}
          {showHistory && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Histórico de Mensagens</h3>
                
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma mensagem gerada ainda.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={message.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              Mensagem {index + 1}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(message.generated_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          
                          <div className="flex gap-1">
                            {editingId === message.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={saveEdit}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditing(message)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyToClipboard(message.content)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar Texto</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyHTMLVersion(message.content)}
                                    >
                                      <Code className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar HTML</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>

                        {editingId === message.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="min-h-[200px] font-mono text-sm"
                              placeholder="Edite a mensagem..."
                            />
                            <Badge variant={isOverLimit(editingContent) ? "destructive" : "secondary"}>
                              {getCharacterCount(editingContent)}/5000 caracteres
                            </Badge>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border rounded p-3">
                            <div className="whitespace-pre-wrap font-mono text-sm">
                              {message.content}
                            </div>
                            <div className="mt-2">
                              <Badge variant={isOverLimit(message.content) ? "destructive" : "secondary"}>
                                {getCharacterCount(message.content)}/1000 caracteres
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
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