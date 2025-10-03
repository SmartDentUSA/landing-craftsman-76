import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLinksRepository } from '@/hooks/useLinksRepository';
import { 
  MessageCircle, 
  Plus, 
  History, 
  Edit, 
  Save, 
  X, 
  Copy, 
  FileText,
  Loader2 
} from 'lucide-react';

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
  const { toast } = useToast();
  const { allLinks, isLoading: linksLoading } = useLinksRepository();

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
    if (!editingId || isOverLimit(editingContent)) return;

    try {
      const updatedSequences = sequences.map(seq => ({
        ...seq,
        messages: seq.messages.map(msg =>
          msg.id === editingId ? { ...msg, content: editingContent } : msg
        )
      }));

      const updatedData: WhatsAppSequences = {
        sequences: updatedSequences,
        last_generated: sequences[0]?.generated_at || new Date().toISOString()
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

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const getCharacterCount = (text: string) => text.length;
  const isOverLimit = (text: string) => getCharacterCount(text) > 1000;

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
          </div>

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
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditing(message)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => copyToClipboard(message.content)}>
                                <Copy className="h-4 w-4" /> Texto
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => copyHTMLVersion(message.content)}>
                                <FileText className="h-4 w-4" /> HTML
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-[150px] font-mono text-sm"
                          />
                          <Badge variant={isOverLimit(editingContent) ? "destructive" : "secondary"}>
                            {getCharacterCount(editingContent)}/1000 caracteres
                          </Badge>
                        </div>
                      ) : (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="whitespace-pre-wrap font-mono text-sm">
                              {message.content}
                            </div>
                          </div>
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
