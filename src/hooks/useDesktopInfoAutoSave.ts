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

export const useDesktopInfoAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string
) => {
  const lastSaveRef = useRef<Date>();

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData) => {
    if (!pageId) return;
    
    console.log('🔧 [AUTO-SAVE] Salvando alterações automaticamente...', { 
      desktop_info: updatedData.desktop_info,
      pageId,
      show_table: updatedData.desktop_info?.show_table,
      table_headers: updatedData.desktop_info?.table_headers,
      table_data: updatedData.desktop_info?.table_data
    });
    
    try {
      await saveLandingPage(pageId, { 
        data: {
          ...updatedData, 
          last_modified: new Date().toISOString() 
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
    console.log('🔧 [DESKTOP-INFO] Iniciando auto-save para:', updatedData.desktop_info);
    debouncedAutoSave(updatedData);
  }, [debouncedAutoSave]);

  return {
    saveDesktopInfo,
    lastSave: lastSaveRef.current
  };
};