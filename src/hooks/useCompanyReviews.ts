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
   */
  const loadCompanyReviews = async (): Promise<CompanyReviewsJSONB | null> => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("company_profile")
        .select("company_reviews")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Se não existir company_profile, cria automaticamente
      if (!data) {
        const { error: insertError } = await supabase
          .from("company_profile")
          .insert({
            user_id: user.id,
            company_name: "Nova Empresa",
            company_reviews: {
              manual_reviews: [],
              google_reviews_imported: false,
              google_place_id: null,
              last_google_sync: null
            }
          });

        if (insertError) throw insertError;

        return {
          manual_reviews: [],
          google_reviews_imported: false,
          google_place_id: null,
          last_google_sync: null
        };
      }

      if (!data?.company_reviews) {
        return {
          manual_reviews: [],
          google_reviews_imported: false,
          google_place_id: null,
          last_google_sync: null
        };
      }
      
      return data.company_reviews as unknown as CompanyReviewsJSONB;
      
    } catch (error: any) {
      console.error("Erro ao carregar company reviews:", error);
      toast({
        title: "Erro ao carregar reviews",
        description: error.message,
        variant: "destructive"
      });
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

      // Chamar edge function com flags de sincronização
      const { data, error } = await supabase.functions.invoke(
        "extract-google-reviews",
        {
          body: {
            url: googleMapsUrl,
            extract_individual_reviews: true,
            sync_to_company_profile: true, // 🆕 Flag para sincronizar
            company_id: user.id // 🆕 ID do company_profile
          }
        }
      );

      if (error) throw error;

      console.log('✅ Google Reviews sync response:', {
        reviews_extracted: data?.reviews_extracted,
        place_id: data?.place_id,
        success: data?.success
      });

      toast({
        title: "✅ Google Reviews importados",
        description: `${data?.reviews_extracted || 0} reviews extraídos e sincronizados`,
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
