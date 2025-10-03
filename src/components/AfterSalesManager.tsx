import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAfterSalesMessages } from "@/hooks/useAfterSalesMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Edit, Save, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AfterSalesManager = () => {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { fetchMessages, createMessage, updateMessage, deleteMessage, toggleActive } = useAfterSalesMessages();
  const { data: messages = [], isLoading: messagesLoading } = fetchMessages(selectedProductId);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products-for-aftersales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products_repository")
        .select("id, name")
        .eq("approved", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const handleCreateFirstMessage = () => {
    if (!selectedProductId) {
      toast({
        title: "Selecione um produto",
        description: "Por favor, selecione um produto antes de criar mensagens.",
        variant: "destructive",
      });
      return;
    }

    createMessage.mutate({
      productId: selectedProductId,
      messageOrder: 1,
      content: "Digite sua mensagem aqui...",
    });
  };

  const handleAddMessage = () => {
    if (!selectedProductId) return;
    if (messages.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Você já atingiu o limite de 10 mensagens por produto.",
        variant: "destructive",
      });
      return;
    }

    const nextOrder = messages.length + 1;
    createMessage.mutate({
      productId: selectedProductId,
      messageOrder: nextOrder,
      content: "Digite sua mensagem aqui...",
    });
  };

  const handleContentChange = (messageId: string, newContent: string) => {
    setEditedContents(prev => ({
      ...prev,
      [messageId]: newContent
    }));
  };

  const handleSave = (messageId: string, originalContent: string) => {
    const contentToSave = editedContents[messageId] || originalContent;
    console.log('Saving message:', messageId, 'with content:', contentToSave);
    
    if (contentToSave.trim().length < 10) {
      toast({
        title: "Mensagem muito curta",
        description: "A mensagem deve ter pelo menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    updateMessage.mutate(
      {
        messageId,
        content: contentToSave,
        productId: selectedProductId,
      },
      {
        onSuccess: () => {
          console.log('Message saved successfully');
          setEditedContents(prev => {
            const newContents = { ...prev };
            delete newContents[messageId];
            return newContents;
          });
        },
        onError: (error) => {
          console.error('Error saving message:', error);
        }
      }
    );
  };

  const handleDelete = (messageId: string) => {
    deleteMessage.mutate(
      { messageId, productId: selectedProductId },
      {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      }
    );
  };

  const handleToggleActive = (messageId: string, currentStatus: boolean) => {
    toggleActive.mutate({
      messageId,
      isActive: !currentStatus,
      productId: selectedProductId,
    });
  };

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Gerenciador de Mensagens de Pós-Venda
          </CardTitle>
          <CardDescription>
            Crie mensagens sequenciais para robô de atendimento WhatsApp (máximo 10 mensagens por produto)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product-select">Selecionar Produto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger id="product-select">
                <SelectValue placeholder="Escolha um produto..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProductId && messages.length === 0 && !messagesLoading && (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                Nenhuma mensagem criada para este produto ainda.
              </p>
              <Button onClick={handleCreateFirstMessage} disabled={createMessage.isPending}>
                {createMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Mensagens de Atendimento
              </Button>
            </div>
          )}

          {messagesLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Mensagens Criadas ({messages.length}/10)
                </h3>
                <Button
                  onClick={handleAddMessage}
                  disabled={messages.length >= 10 || createMessage.isPending}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Nova Mensagem
                </Button>
              </div>

              <div className="space-y-3">
                {messages.map((message) => {
                  const currentContent = editedContents[message.id] ?? message.message_content;
                  const hasChanges = editedContents[message.id] !== undefined && 
                                    editedContents[message.id] !== message.message_content;

                  return (
                    <Card key={message.id} className={!message.is_active ? "opacity-60" : ""}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                {message.message_order}️⃣ Mensagem {message.message_order}
                              </span>
                              <div className="flex items-center gap-2 ml-auto">
                                <Label htmlFor={`active-${message.id}`} className="text-sm">
                                  Ativa
                                </Label>
                                <Switch
                                  id={`active-${message.id}`}
                                  checked={message.is_active}
                                  onCheckedChange={() => handleToggleActive(message.id, message.is_active)}
                                />
                              </div>
                            </div>
                            <Textarea
                              value={currentContent}
                              onChange={(e) => handleContentChange(message.id, e.target.value)}
                              placeholder="Digite sua mensagem aqui..."
                              rows={4}
                              className="resize-none"
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {currentContent.length} caracteres (mínimo 10)
                              </p>
                              {hasChanges && (
                                <p className="text-xs text-amber-600 font-medium">
                                  ⚠️ Alterações não salvas
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(message.id, message.message_content)}
                            disabled={updateMessage.isPending || !hasChanges}
                            variant={hasChanges ? "default" : "outline"}
                          >
                            {updateMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(message.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
