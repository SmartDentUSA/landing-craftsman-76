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

interface ExplanatoryVideoAutoSaveOptions {
  isHydratingFromServer?: boolean;
}

export const useExplanatoryVideoAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string,
  options: ExplanatoryVideoAutoSaveOptions = {}
) => {
  const lastSaveRef = useRef<Date>();
  const lastKnownVideoRef = useRef<boolean | null>(null);

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData, isHydrating: boolean) => {
    if (!pageId) return;
    
    // 🛡️ PROTEÇÃO 1: Não salvar durante hidratação
    if (isHydrating) {
      console.log('🛡️ [AUTO-SAVE] Bloqueado durante hidratação - Vídeo Explicativo');
      return;
    }
    
    const hasVideo = !!updatedData.explanatory_video_section?.selected_video;
    
    // 🛡️ PROTEÇÃO 2: Não salvar null se havia vídeo antes
    if (!hasVideo && lastKnownVideoRef.current === true) {
      console.warn('⚠️ [AUTO-SAVE] BLOQUEADO: Tentativa de salvar selected_video como null!');
      return;
    }
    
    // Atualizar referência conhecida
    if (hasVideo) {
      lastKnownVideoRef.current = true;
    }
    
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
          explanatory_video_section: updatedData.explanatory_video_section
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
    const isHydrating = options.isHydratingFromServer ?? false;
    
    // 🛡️ Bloquear completamente durante hidratação
    if (isHydrating) {
      console.log('🛡️ [EXPLANATORY-VIDEO] Auto-save bloqueado - hidratação em progresso');
      return;
    }
    
    console.log('🎥 [EXPLANATORY-VIDEO] Iniciando auto-save para:', updatedData.explanatory_video_section);
    debouncedAutoSave(updatedData, isHydrating);
  }, [debouncedAutoSave, options.isHydratingFromServer]);

  // Função para inicializar estado conhecido (chamada após hidratação)
  const initializeKnownState = useCallback((hasVideo: boolean) => {
    lastKnownVideoRef.current = hasVideo;
    console.log('📊 [EXPLANATORY-VIDEO] Estado inicial de vídeo:', hasVideo);
  }, []);

  return {
    saveExplanatoryVideo,
    lastSave: lastSaveRef.current,
    initializeKnownState
  };
};
