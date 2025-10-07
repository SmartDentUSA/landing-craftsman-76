import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCSMessages } from "@/hooks/useCSMessages";
import { ProductVideosList } from "@/components/ProductVideosList";
import { Loader2, Trash2, Save, MessageSquare, Plus } from "lucide-react";

export const CSManager = () => {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { fetchMessages, createMessage, updateMessage, deleteMessage, toggleActive } = useCSMessages();

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products-for-cs"],
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

  const { data: productsWithMessages = [], isLoading: productsWithMessagesLoading } = useQuery({
    queryKey: ["products-with-cs-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cs_messages")
        .select(`
          product_id,
          products_repository!inner(id, name)
        `)
        .eq("products_repository.approved", true);
      
      if (error) throw error;
      
      const grouped = data.reduce((acc: any, item: any) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            id: item.products_repository.id,
            name: item.products_repository.name,
            messageCount: 0
          };
        }
        acc[productId].messageCount++;
        return acc;
      }, {});
      
      return Object.values(grouped) as Array<{ id: string; name: string; messageCount: number }>;
    },
  });

  const handleCreateFirstMessage = () => {
    if (!selectedProductId) {
      toast({
        title: "Produto não selecionado",
        description: "Por favor, selecione um produto primeiro.",
        variant: "destructive",
      });
      return;
    }

    createMessage.mutate({
      productId: selectedProductId,
      messageOrder: 1,
      messageContent: "",
    });
  };

  const handleAddMessage = () => {
    if (!selectedProductId || !messages) return;

    if (messages.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "O limite máximo é de 10 mensagens por produto.",
        variant: "destructive",
      });
      return;
    }

    const nextOrder = messages.length > 0 
      ? Math.max(...messages.map(m => m.message_order)) + 1 
      : 1;

    createMessage.mutate({
      productId: selectedProductId,
      messageOrder: nextOrder,
      messageContent: "",
    });
  };

  const handleContentChange = (messageId: string, content: string) => {
    setEditedContents(prev => ({
      ...prev,
      [messageId]: content
    }));
  };

  const handleSaveMessage = (messageId: string) => {
    const message = messages?.find(m => m.id === messageId);
    const content = editedContents[messageId] ?? message?.message_content ?? "";
    
    if (!content || content.trim().length < 10) {
      toast({
        title: "Conteúdo inválido",
        description: "A mensagem deve ter pelo menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    updateMessage.mutate({
      id: messageId,
      productId: selectedProductId,
      messageContent: content.trim(),
    }, {
      onSuccess: () => {
        setEditedContents(prev => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
      }
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage.mutate({
      id: messageId,
      productId: selectedProductId,
    }, {
      onSuccess: () => {
        setDeleteConfirmId(null);
      }
    });
  };

  const handleToggleActive = (messageId: string, currentStatus: boolean) => {
    toggleActive.mutate({
      id: messageId,
      productId: selectedProductId,
      isActive: !currentStatus,
    });
  };

  const { data: messages, isLoading: messagesLoading } = fetchMessages(selectedProductId);

  const selectedProduct = products.find(p => p.id === selectedProductId);

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
          <CardTitle>Gerenciador de Mensagens de CS</CardTitle>
          <CardDescription>
            Crie mensagens sequenciais para robô de Customer Success (máximo 10 mensagens por produto)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {productsWithMessages.length > 0 && (
            <div className="space-y-2">
              <Label>Produtos com Mensagens Cadastradas ({productsWithMessages.length})</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {productsWithMessages.map((product) => (
                  <Card 
                    key={product.id} 
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedProductId === product.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.messageCount} {product.messageCount === 1 ? 'mensagem' : 'mensagens'}
                          </p>
                        </div>
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {productsWithMessages.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou selecione outro produto
                </span>
              </div>
            </div>
          )}

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

          {selectedProductId && selectedProduct && (
            <div className="space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages && messages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Nenhuma mensagem de CS cadastrada para {selectedProduct.name}
                    </p>
                    <Button onClick={handleCreateFirstMessage}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeira Mensagem
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Mensagens de CS para {selectedProduct.name}</Label>
                    {messages && messages.length < 10 && (
                      <Button size="sm" onClick={handleAddMessage}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Mensagem ({messages.length}/10)
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {messages?.map((message) => {
                      const currentContent = editedContents[message.id] ?? message.message_content;
                      const hasChanges = editedContents[message.id] !== undefined && 
                                        editedContents[message.id] !== message.message_content;

                      return (
                        <Card key={message.id} className="relative">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                  Mensagem #{message.message_order}
                                  {hasChanges && (
                                    <span className="text-xs text-amber-500">(não salvo)</span>
                                  )}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={message.is_active}
                                      onCheckedChange={() => handleToggleActive(message.id, message.is_active)}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {message.is_active ? "Ativa" : "Inativa"}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirmId(message.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <Textarea
                                value={currentContent}
                                onChange={(e) => handleContentChange(message.id, e.target.value)}
                                placeholder="Digite o conteúdo da mensagem..."
                                className="min-h-[100px]"
                              />
                              
                              {/* 🎬 Biblioteca de Vídeos do Produto */}
                              <ProductVideosList 
                                productId={selectedProductId} 
                                onInsert={(text) => {
                                  const newText = currentContent + text;
                                  handleContentChange(message.id, newText);
                                }}
                              />
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {currentContent.length} caracteres (mínimo 10)
                                </span>
                                {hasChanges && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveMessage(message.id)}
                                    disabled={currentContent.trim().length < 10}
                                  >
                                    <Save className="h-4 w-4 mr-2" />
                                    Salvar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteMessage(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
