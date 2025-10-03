import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AfterSalesMessage {
  id: string;
  product_id: string;
  message_order: number;
  message_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAfterSalesMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchMessages = (productId: string | null) => {
    return useQuery({
      queryKey: ["aftersales-messages", productId],
      queryFn: async () => {
        if (!productId) return [];
        
        const { data, error } = await supabase
          .from("aftersales_messages")
          .select("*")
          .eq("product_id", productId)
          .order("message_order", { ascending: true });

        if (error) throw error;
        return data as AfterSalesMessage[];
      },
      enabled: !!productId,
    });
  };

  const createMessage = useMutation({
    mutationFn: async ({
      productId,
      messageOrder,
      content,
    }: {
      productId: string;
      messageOrder: number;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("aftersales_messages")
        .insert({
          product_id: productId,
          message_order: messageOrder,
          message_content: content,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["aftersales-messages", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-with-aftersales-messages"],
      });
      toast({
        title: "Mensagem criada",
        description: "Mensagem de pós-venda criada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMessage = useMutation({
    mutationFn: async ({
      messageId,
      content,
      productId,
    }: {
      messageId: string;
      content: string;
      productId: string;
    }) => {
      const { data, error } = await supabase
        .from("aftersales_messages")
        .update({ message_content: content })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["aftersales-messages", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-with-aftersales-messages"],
      });
      toast({
        title: "Mensagem atualizada",
        description: "Mensagem de pós-venda atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async ({
      messageId,
      productId,
    }: {
      messageId: string;
      productId: string;
    }) => {
      const { error } = await supabase
        .from("aftersales_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["aftersales-messages", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-with-aftersales-messages"],
      });
      toast({
        title: "Mensagem excluída",
        description: "Mensagem de pós-venda excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({
      messageId,
      isActive,
      productId,
    }: {
      messageId: string;
      isActive: boolean;
      productId: string;
    }) => {
      const { error } = await supabase
        .from("aftersales_messages")
        .update({ is_active: isActive })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["aftersales-messages", variables.productId],
      });
      toast({
        title: "Status atualizado",
        description: "Status da mensagem atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    fetchMessages,
    createMessage,
    updateMessage,
    deleteMessage,
    toggleActive,
  };
};
