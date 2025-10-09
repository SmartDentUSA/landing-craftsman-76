import { useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface LandingPageData {
  explanatory_video_section?: {
    visible_desktop: boolean;
    visible_mobile: boolean;
    selected_video: {
      url: string;
      title: string;
      product_name: string;
      product_id: string;
    } | null;
  };
  [key: string]: any;
}

export const useExplanatoryVideoAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<void>,
  pageId?: string
) => {
  const lastSaveRef = useRef<Date>();

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData) => {
    if (!pageId) return;
    
    console.log('🎥 [AUTO-SAVE] Salvando seção de vídeo explicativo...', { 
      explanatory_video_section: updatedData.explanatory_video_section,
      pageId,
      visible_desktop: updatedData.explanatory_video_section?.visible_desktop,
      visible_mobile: updatedData.explanatory_video_section?.visible_mobile,
      selected_video: updatedData.explanatory_video_section?.selected_video
    });
    
    try {
      await saveLandingPage(pageId, { 
        data: {
          ...updatedData, 
          last_modified: new Date().toISOString() 
        }
      });
      lastSaveRef.current = new Date();
      console.log('✅ [AUTO-SAVE] Seção de vídeo salva com sucesso', {
        explanatory_video_section_saved: updatedData.explanatory_video_section
      });
    } catch (error) {
      console.error('❌ [AUTO-SAVE] Erro ao salvar seção de vídeo:', error);
    }
  }, 1500);

  const saveExplanatoryVideo = useCallback((updatedData: LandingPageData) => {
    console.log('🎥 [EXPLANATORY-VIDEO] Iniciando auto-save para:', updatedData.explanatory_video_section);
    debouncedAutoSave(updatedData);
  }, [debouncedAutoSave]);

  return {
    saveExplanatoryVideo,
    lastSave: lastSaveRef.current
  };
};
