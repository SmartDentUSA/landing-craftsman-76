/**
 * Hook for managing Company Reviews
 * Gerencia reviews manuais globais e sincronização com Google
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CompanyReviewsJSONB } from "@/types/reviews";

export function useCompanyReviews() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  /**
   * Carrega reviews da empresa do company_profile
   * Com retry para aguardar sessão estar disponível
   */
  const loadCompanyReviews = async (): Promise<CompanyReviewsJSONB | null> => {
    try {
      setLoading(true);
      
      // Tentar obter sessão com retry (3 tentativas, 500ms entre cada)
      let user = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user;
        
        if (user) break;
        
        if (attempt < 2) {
          console.log(`useCompanyReviews: Aguardando sessão (tentativa ${attempt + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Se não tem usuário após retries, retorna null silenciosamente
      if (!user) {
        console.warn("useCompanyReviews: Sessão não disponível ainda");
        return null;
      }

      // company_profile é SINGLETON — buscar a única linha sem filtrar por user_id
      const { data, error } = await supabase
        .from("company_profile")
        .select("id, company_reviews")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const emptyReviews: CompanyReviewsJSONB = {
        manual_reviews: [],
        google_reviews_imported: false,
        google_place_id: null,
        last_google_sync: null,
      };

      // Só insere se realmente não existir NENHUMA linha
      if (!data) {
        const { error: insertError } = await supabase
          .from("company_profile")
          .insert({
            user_id: user.id,
            company_name: "Nova Empresa",
            company_reviews: emptyReviews as any,
          });

        // Se outro processo já criou (23505 do singleton), ignorar silenciosamente
        if (insertError && (insertError as any).code !== "23505") {
          throw insertError;
        }
        return emptyReviews;
      }

      if (!data.company_reviews) return emptyReviews;

      return data.company_reviews as unknown as CompanyReviewsJSONB;
      
    } catch (error: any) {
      console.error("Erro ao carregar company reviews:", error);
      // Não mostrar toast para erros de autenticação inicial
      if (error.message && !error.message.includes("não autenticado")) {
        toast({
          title: "Erro ao carregar reviews",
          description: error.message,
          variant: "destructive"
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva reviews manuais no company_profile
   */
  const saveCompanyReviews = async (
    reviews: CompanyReviewsJSONB
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      console.log('💾 Salvando reviews:', {
        user_id: user.id,
        reviews_count: reviews.manual_reviews?.length ?? 0,
        reviews_preview: reviews.manual_reviews?.slice(0, 2)
      });

      const { error } = await supabase
        .from("company_profile")
        .update({
          company_reviews: reviews as any,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;

      console.log('✅ Reviews salvos com sucesso');

      toast({
        title: "✅ Reviews salvos",
        description: `${reviews.manual_reviews?.length ?? 0} reviews salvos com sucesso`
      });

      return true;
      
    } catch (error: any) {
      console.error("Erro ao salvar company reviews:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincroniza reviews do Google e atualiza company_profile
   */
  const syncGoogleReviews = async (
    googleMapsUrl: string
  ): Promise<boolean> => {
    try {
      setSyncing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      console.log('🔍 Syncing Google reviews:', {
        url: googleMapsUrl,
        user_id: user.id
      });

      const { data, error } = await supabase.functions.invoke(
        "extract-google-reviews",
        {
          body: {
            url: googleMapsUrl,
            extract_individual_reviews: true,
            sync_to_company_profile: true,
            company_id: user.id
          }
        }
      );

      if (error) throw error;

      console.log('✅ Google Reviews sync response:', data);

      // ✅ Verificar success do retorno
      if (!data?.success) {
        toast({
          title: "❌ Erro ao importar reviews",
          description: data?.error || "Não foi possível extrair reviews. Verifique a URL ou configure OAuth do Google Business em /google-business-settings.",
          variant: "destructive"
        });
        return false;
      }

      // ✅ Verificar se realmente extraiu reviews
      if (data.data?.reviews_extracted === 0) {
        toast({
          title: "⚠️ Nenhuma review encontrada",
          description: "Configure as credenciais do Google Business API em /google-business-settings para melhores resultados.",
          variant: "default"
        });
        return false;
      }

      // ✅ Só mostra sucesso se realmente extraiu
      toast({
        title: "✅ Google Reviews importados",
        description: `${data.data.reviews_extracted} reviews extraídos e sincronizados`,
      });

      return true;
      
    } catch (error: any) {
      console.error("Erro ao sincronizar Google reviews:", error);
      toast({
        title: "❌ Erro na sincronização",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setSyncing(false);
    }
  };

  return {
    loading,
    syncing,
    loadCompanyReviews,
    saveCompanyReviews,
    syncGoogleReviews
  };
}
