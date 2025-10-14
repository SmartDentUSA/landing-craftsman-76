import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Video {
  url: string;
  description: string;
}

interface CompanyVideos {
  youtube_videos: Video[];
  instagram_videos: Video[];
  testimonial_videos: Video[];
  technical_videos: Video[];
}

export const useCompanyVideos = () => {
  const { toast } = useToast();

  const saveCompanyVideos = useCallback(async (userId: string, videos: CompanyVideos) => {
    try {
      const { error } = await supabase
        .from('company_profile')
        .update({
          company_videos: videos as any,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Vídeos da empresa salvos",
        description: "Os vídeos da empresa foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Error saving company videos:', error);
      toast({
        title: "Erro ao salvar vídeos",
        description: "Não foi possível salvar os vídeos da empresa.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadCompanyVideos = useCallback(async (userId: string): Promise<CompanyVideos> => {
    try {
      const { data: profile } = await supabase
        .from('company_profile')
        .select('company_videos')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.company_videos) {
        return profile.company_videos as unknown as CompanyVideos;
      }

      return {
        youtube_videos: [],
        instagram_videos: [],
        testimonial_videos: [],
        technical_videos: [],
      };
    } catch (error) {
      console.error('Error loading company videos:', error);
      return {
        youtube_videos: [],
        instagram_videos: [],
        testimonial_videos: [],
        technical_videos: [],
      };
    }
  }, []);

  const updateCompanyProfile = useCallback(async (userId: string, updates: {
    youtube_channel?: string;
    instagram_profile?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('company_profile')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Perfil da empresa atualizado",
        description: "As informações da empresa foram atualizadas.",
      });
    } catch (error) {
      console.error('Error updating company profile:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar o perfil da empresa.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    saveCompanyVideos,
    loadCompanyVideos,
    updateCompanyProfile,
  };
};