/**
 * 🛡️ Hook de Auto-Save para Vídeo Explicativo com Proteção Anti-Perda de Dados
 * 
 * Implementa múltiplas camadas de proteção:
 * - Bloqueio durante hidratação
 * - Delay pós-hidratação
 * - Verificação de integridade de dados (selected_video)
 * - Backup automático antes de salvar
 */

import { useCallback, useRef, useState, useEffect } from 'react';
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

const BACKUP_KEY = 'explanatory-video-backup';
const POST_HYDRATION_DELAY_MS = 500; // Delay adicional após hidratação

export const useExplanatoryVideoAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string,
  options: ExplanatoryVideoAutoSaveOptions = {}
) => {
  const lastSaveRef = useRef<Date>();
  const lastKnownVideoRef = useRef<boolean | null>(null);
  const hydrationEndTimeRef = useRef<number | null>(null);
  const [isPostHydrationReady, setIsPostHydrationReady] = useState(false);

  // Gerenciar delay pós-hidratação
  useEffect(() => {
    if (!options.isHydratingFromServer && !isPostHydrationReady) {
      const timeout = setTimeout(() => {
        console.log('✅ [EXPLANATORY-VIDEO] Delay pós-hidratação concluído - auto-save liberado');
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
        explanatory_video_section: data.explanatory_video_section
      };
      localStorage.setItem(`${BACKUP_KEY}-${pageId}`, JSON.stringify(backup));
      console.log('💾 [EXPLANATORY-VIDEO] Backup local criado');
    } catch (error) {
      console.error('❌ [EXPLANATORY-VIDEO] Erro ao criar backup:', error);
    }
  }, [pageId]);

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData, isHydrating: boolean, isReady: boolean) => {
    if (!pageId) return;
    
    // 🛡️ PROTEÇÃO 1: Não salvar durante hidratação
    if (isHydrating) {
      console.log('🛡️ [AUTO-SAVE] Bloqueado durante hidratação - Vídeo Explicativo');
      return;
    }
    
    // 🛡️ PROTEÇÃO 2: Não salvar antes do delay pós-hidratação
    if (!isReady) {
      console.log('🛡️ [AUTO-SAVE] Aguardando delay pós-hidratação - Vídeo Explicativo');
      return;
    }
    
    const hasVideo = !!updatedData.explanatory_video_section?.selected_video;
    
    // 🛡️ PROTEÇÃO 3: Não salvar null se havia vídeo antes
    if (!hasVideo && lastKnownVideoRef.current === true) {
      console.warn('⚠️ [AUTO-SAVE] BLOQUEADO: Tentativa de salvar selected_video como null!');
      return;
    }
    
    // Atualizar referência conhecida
    if (hasVideo) {
      lastKnownVideoRef.current = true;
    }
    
    // 🛡️ PROTEÇÃO 4: Criar backup antes de salvar
    createLocalBackup(updatedData);
    
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
    
    // 🛡️ Bloquear antes do delay pós-hidratação
    if (!isPostHydrationReady) {
      console.log('🛡️ [EXPLANATORY-VIDEO] Auto-save bloqueado - aguardando delay pós-hidratação');
      return;
    }
    
    console.log('🎥 [EXPLANATORY-VIDEO] Iniciando auto-save para:', updatedData.explanatory_video_section);
    debouncedAutoSave(updatedData, isHydrating, isPostHydrationReady);
  }, [debouncedAutoSave, options.isHydratingFromServer, isPostHydrationReady]);

  // Função para inicializar estado conhecido (chamada após hidratação)
  const initializeKnownState = useCallback((hasVideo: boolean) => {
    lastKnownVideoRef.current = hasVideo;
    console.log('📊 [EXPLANATORY-VIDEO] Estado inicial de vídeo:', hasVideo);
  }, []);

  // Função para restaurar backup
  const restoreBackup = useCallback((): any | null => {
    if (!pageId) return null;
    
    try {
      const backupStr = localStorage.getItem(`${BACKUP_KEY}-${pageId}`);
      if (!backupStr) return null;
      
      const backup = JSON.parse(backupStr);
      console.log('🔄 [EXPLANATORY-VIDEO] Backup restaurado de', new Date(backup.timestamp).toLocaleString());
      return backup.explanatory_video_section;
    } catch {
      return null;
    }
  }, [pageId]);

  return {
    saveExplanatoryVideo,
    lastSave: lastSaveRef.current,
    initializeKnownState,
    restoreBackup,
    isReady: isPostHydrationReady
  };
};
