import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CSMessage {
  id: string;
  product_id: string;
  message_order: number;
  message_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCSMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchMessages = (productId: string | null) => {
    return useQuery({
      queryKey: ["cs-messages", productId],
      queryFn: async () => {
        if (!productId) return [];

        const { data, error } = await supabase
          .from("cs_messages")
          .select("*")
          .eq("product_id", productId)
          .order("message_order", { ascending: true });

        if (error) throw error;
        return data as CSMessage[];
      },
      enabled: !!productId,
    });
  };

  const createMessage = useMutation({
    mutationFn: async ({
      productId,
      messageOrder,
      messageContent,
    }: {
      productId: string;
      messageOrder: number;
      messageContent: string;
    }) => {
      const { data, error } = await supabase
        .from("cs_messages")
        .insert({
          product_id: productId,
          message_order: messageOrder,
          message_content: messageContent,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cs-messages", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-with-cs-messages"],
      });
      toast({
        title: "Mensagem criada",
        description: "Mensagem de CS criada com sucesso!",
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
      id,
      productId,
      messageContent,
    }: {
      id: string;
      productId: string;
      messageContent: string;
    }) => {
      const { data, error } = await supabase
        .from("cs_messages")
        .update({ message_content: messageContent })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cs-messages", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-with-cs-messages"],
      });
      toast({
        title: "Mensagem atualizada",
        description: "Mensagem de CS atualizada com sucesso!",
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
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from("cs_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cs-messages", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["products-with-cs-messages"],
      });
      toast({
        title: "Mensagem excluída",
        description: "Mensagem de CS excluída com sucesso!",
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
      id,
      productId,
      isActive,
    }: {
      id: string;
      productId: string;
      isActive: boolean;
    }) => {
      const { data, error } = await supabase
        .from("cs_messages")
        .update({ is_active: isActive })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cs-messages", variables.productId],
      });
      toast({
        title: "Status atualizado",
        description: `Mensagem ${variables.isActive ? "ativada" : "desativada"} com sucesso!`,
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
