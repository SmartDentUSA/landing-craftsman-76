import { useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface LandingPageData {
  desktop_info?: {
    title: string;
    text: string;
    visible_desktop: boolean;
    visible_mobile: boolean;
    show_table: boolean;
    table_title: string;
    table_headers: string[];
    table_data: Array<{ [key: string]: string }>;
  };
  [key: string]: any;
}

interface DesktopInfoAutoSaveOptions {
  isHydratingFromServer?: boolean;
}

export const useDesktopInfoAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string,
  options: DesktopInfoAutoSaveOptions = {}
) => {
  const lastSaveRef = useRef<Date>();
  const lastKnownTableDataCountRef = useRef<number | null>(null);

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData, isHydrating: boolean) => {
    if (!pageId) return;
    
    // 🛡️ PROTEÇÃO 1: Não salvar durante hidratação
    if (isHydrating) {
      console.log('🛡️ [AUTO-SAVE] Bloqueado durante hidratação - Desktop Info');
      return;
    }
    
    const currentTableDataCount = updatedData.desktop_info?.table_data?.length || 0;
    
    // 🛡️ PROTEÇÃO 2: Não salvar array vazio se havia dados antes
    if (currentTableDataCount === 0 && lastKnownTableDataCountRef.current && lastKnownTableDataCountRef.current > 0) {
      console.warn('⚠️ [AUTO-SAVE] BLOQUEADO: Tentativa de salvar table_data como array vazio!', {
        lastKnownCount: lastKnownTableDataCountRef.current,
        currentCount: currentTableDataCount
      });
      return;
    }
    
    // Atualizar referência de contagem conhecida
    if (currentTableDataCount > 0) {
      lastKnownTableDataCountRef.current = currentTableDataCount;
    }
    
    console.log('🔧 [AUTO-SAVE] Salvando alterações automaticamente...', { 
      desktop_info: updatedData.desktop_info,
      pageId,
      show_table: updatedData.desktop_info?.show_table,
      table_headers: updatedData.desktop_info?.table_headers,
      table_data_count: currentTableDataCount
    });
    
    try {
      await saveLandingPage(pageId, { 
        data: {
          desktop_info: updatedData.desktop_info
        }
      });
      lastSaveRef.current = new Date();
      console.log('✅ [AUTO-SAVE] Dados salvos com sucesso', {
        desktop_info_saved: updatedData.desktop_info
      });
    } catch (error) {
      console.error('❌ [AUTO-SAVE] Erro ao salvar:', error);
    }
  }, 1500);

  const saveDesktopInfo = useCallback((updatedData: LandingPageData) => {
    const isHydrating = options.isHydratingFromServer ?? false;
    
    // 🛡️ Bloquear completamente durante hidratação
    if (isHydrating) {
      console.log('🛡️ [DESKTOP-INFO] Auto-save bloqueado - hidratação em progresso');
      return;
    }
    
    console.log('🔧 [DESKTOP-INFO] Iniciando auto-save para:', updatedData.desktop_info);
    debouncedAutoSave(updatedData, isHydrating);
  }, [debouncedAutoSave, options.isHydratingFromServer]);

  // Função para inicializar contagem conhecida (chamada após hidratação)
  const initializeKnownCount = useCallback((count: number) => {
    if (count > 0) {
      lastKnownTableDataCountRef.current = count;
      console.log('📊 [DESKTOP-INFO] Contagem inicial de table_data:', count);
    }
  }, []);

  return {
    saveDesktopInfo,
    lastSave: lastSaveRef.current,
    initializeKnownCount
  };
};
