import { useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface LandingPageData {
  animated_banner_section?: {
    visible_desktop: boolean;
    visible_mobile: boolean;
    title: string;
    partners: Array<{
      id: string;
      name: string;
      seo_description: string;
      logo: any;
    }>;
  };
  [key: string]: any;
}

export const useAnimatedBannerAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<void>,
  pageId?: string
) => {
  const lastSaveRef = useRef<Date>();

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData) => {
    if (!pageId) return;
    
    console.log('🎨 [AUTO-SAVE] Salvando Faixa Animada...', { 
      animated_banner_section: updatedData.animated_banner_section,
      pageId,
      partners_count: updatedData.animated_banner_section?.partners?.length || 0
    });
    
    try {
      await saveLandingPage(pageId, { 
        data: {
          ...updatedData, 
          last_modified: new Date().toISOString() 
        }
      });
      lastSaveRef.current = new Date();
      console.log('✅ [AUTO-SAVE] Faixa Animada salva com sucesso');
    } catch (error) {
      console.error('❌ [AUTO-SAVE] Erro ao salvar Faixa Animada:', error);
    }
  }, 1500);

  const saveAnimatedBanner = useCallback((updatedData: LandingPageData) => {
    console.log('🎨 [ANIMATED-BANNER] Iniciando auto-save');
    debouncedAutoSave(updatedData);
  }, [debouncedAutoSave]);

  return {
    saveAnimatedBanner,
    lastSave: lastSaveRef.current
  };
};
