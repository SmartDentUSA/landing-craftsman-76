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

interface AnimatedBannerAutoSaveOptions {
  isHydratingFromServer?: boolean;
}

export const useAnimatedBannerAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string,
  options: AnimatedBannerAutoSaveOptions = {}
) => {
  const lastSaveRef = useRef<Date>();
  const lastKnownPartnersCountRef = useRef<number | null>(null);

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData, isHydrating: boolean) => {
    if (!pageId) return;
    
    // 🛡️ PROTEÇÃO 1: Não salvar durante hidratação
    if (isHydrating) {
      console.log('🛡️ [AUTO-SAVE] Bloqueado durante hidratação - Faixa Animada');
      return;
    }
    
    const currentPartnersCount = updatedData.animated_banner_section?.partners?.length || 0;
    
    // 🛡️ PROTEÇÃO 2: Não salvar array vazio se havia dados antes
    if (currentPartnersCount === 0 && lastKnownPartnersCountRef.current && lastKnownPartnersCountRef.current > 0) {
      console.warn('⚠️ [AUTO-SAVE] BLOQUEADO: Tentativa de salvar partners como array vazio!', {
        lastKnownCount: lastKnownPartnersCountRef.current,
        currentCount: currentPartnersCount
      });
      return;
    }
    
    // Atualizar referência de contagem conhecida
    if (currentPartnersCount > 0) {
      lastKnownPartnersCountRef.current = currentPartnersCount;
    }
    
    console.log('🎨 [AUTO-SAVE] Salvando Faixa Animada...', { 
      animated_banner_section: updatedData.animated_banner_section,
      pageId,
      partners_count: currentPartnersCount
    });
    
    try {
      await saveLandingPage(pageId, { 
        data: {
          animated_banner_section: updatedData.animated_banner_section
        }
      });
      lastSaveRef.current = new Date();
      console.log('✅ [AUTO-SAVE] Faixa Animada salva com sucesso');
    } catch (error) {
      console.error('❌ [AUTO-SAVE] Erro ao salvar Faixa Animada:', error);
    }
  }, 1500);

  const saveAnimatedBanner = useCallback((updatedData: LandingPageData) => {
    const isHydrating = options.isHydratingFromServer ?? false;
    
    // 🛡️ Bloquear completamente durante hidratação
    if (isHydrating) {
      console.log('🛡️ [ANIMATED-BANNER] Auto-save bloqueado - hidratação em progresso');
      return;
    }
    
    console.log('🎨 [ANIMATED-BANNER] Iniciando auto-save');
    debouncedAutoSave(updatedData, isHydrating);
  }, [debouncedAutoSave, options.isHydratingFromServer]);

  // Função para inicializar contagem conhecida (chamada após hidratação)
  const initializeKnownCount = useCallback((count: number) => {
    if (count > 0) {
      lastKnownPartnersCountRef.current = count;
      console.log('📊 [ANIMATED-BANNER] Contagem inicial de partners:', count);
    }
  }, []);

  return {
    saveAnimatedBanner,
    lastSave: lastSaveRef.current,
    initializeKnownCount
  };
};
