/**
 * 🛡️ Hook de Auto-Save para Desktop Info com Proteção Anti-Perda de Dados
 * 
 * Implementa múltiplas camadas de proteção:
 * - Bloqueio durante hidratação
 * - Delay pós-hidratação
 * - Verificação de integridade de dados
 * - Backup automático antes de salvar
 */

import { useCallback, useRef, useState, useEffect } from 'react';
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

const BACKUP_KEY = 'desktop-info-backup';
const POST_HYDRATION_DELAY_MS = 500; // Delay adicional após hidratação

export const useDesktopInfoAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string,
  options: DesktopInfoAutoSaveOptions = {}
) => {
  const lastSaveRef = useRef<Date>();
  const lastKnownTableDataCountRef = useRef<number | null>(null);
  const hydrationEndTimeRef = useRef<number | null>(null);
  const [isPostHydrationReady, setIsPostHydrationReady] = useState(false);

  // Gerenciar delay pós-hidratação
  useEffect(() => {
    if (!options.isHydratingFromServer && !isPostHydrationReady) {
      // Hidratação acabou de terminar - aguardar delay adicional
      const timeout = setTimeout(() => {
        console.log('✅ [DESKTOP-INFO] Delay pós-hidratação concluído - auto-save liberado');
        hydrationEndTimeRef.current = Date.now();
        setIsPostHydrationReady(true);
      }, POST_HYDRATION_DELAY_MS);
      
      return () => clearTimeout(timeout);
    }
  }, [options.isHydratingFromServer, isPostHydrationReady]);

  // Reset quando hidratação inicia
  useEffect(() => {
    if (options.isHydratingFromServer) {
      setIsPostHydrationReady(false);
      hydrationEndTimeRef.current = null;
    }
  }, [options.isHydratingFromServer]);

  // Criar backup local
  const createLocalBackup = useCallback((data: any) => {
    if (!pageId || !data) return;
    
    try {
      const backup = {
        timestamp: Date.now(),
        pageId,
        desktop_info: data.desktop_info
      };
      localStorage.setItem(`${BACKUP_KEY}-${pageId}`, JSON.stringify(backup));
      console.log('💾 [DESKTOP-INFO] Backup local criado');
    } catch (error) {
      console.error('❌ [DESKTOP-INFO] Erro ao criar backup:', error);
    }
  }, [pageId]);

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData, isHydrating: boolean, isReady: boolean) => {
    if (!pageId) return;
    
    // 🛡️ PROTEÇÃO 1: Não salvar durante hidratação
    if (isHydrating) {
      console.log('🛡️ [AUTO-SAVE] Bloqueado durante hidratação - Desktop Info');
      return;
    }
    
    // 🛡️ PROTEÇÃO 2: Não salvar antes do delay pós-hidratação
    if (!isReady) {
      console.log('🛡️ [AUTO-SAVE] Aguardando delay pós-hidratação - Desktop Info');
      return;
    }
    
    const currentTableDataCount = updatedData.desktop_info?.table_data?.length || 0;
    
    // 🛡️ PROTEÇÃO 3: Não salvar array vazio se havia dados antes
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
    
    // 🛡️ PROTEÇÃO 4: Criar backup antes de salvar
    createLocalBackup(updatedData);
    
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
    
    // 🛡️ Bloquear antes do delay pós-hidratação
    if (!isPostHydrationReady) {
      console.log('🛡️ [DESKTOP-INFO] Auto-save bloqueado - aguardando delay pós-hidratação');
      return;
    }
    
    console.log('🔧 [DESKTOP-INFO] Iniciando auto-save para:', updatedData.desktop_info);
    debouncedAutoSave(updatedData, isHydrating, isPostHydrationReady);
  }, [debouncedAutoSave, options.isHydratingFromServer, isPostHydrationReady]);

  // Função para inicializar contagem conhecida (chamada após hidratação)
  const initializeKnownCount = useCallback((count: number) => {
    if (count > 0) {
      lastKnownTableDataCountRef.current = count;
      console.log('📊 [DESKTOP-INFO] Contagem inicial de table_data:', count);
    }
  }, []);

  // Função para restaurar backup
  const restoreBackup = useCallback((): any | null => {
    if (!pageId) return null;
    
    try {
      const backupStr = localStorage.getItem(`${BACKUP_KEY}-${pageId}`);
      if (!backupStr) return null;
      
      const backup = JSON.parse(backupStr);
      console.log('🔄 [DESKTOP-INFO] Backup restaurado de', new Date(backup.timestamp).toLocaleString());
      return backup.desktop_info;
    } catch {
      return null;
    }
  }, [pageId]);

  return {
    saveDesktopInfo,
    lastSave: lastSaveRef.current,
    initializeKnownCount,
    restoreBackup,
    isReady: isPostHydrationReady
  };
};
