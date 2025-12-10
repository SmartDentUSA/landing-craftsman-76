/**
 * 🛡️ Hook de Auto-Save para Faixa Animada com Proteção Anti-Perda de Dados
 * 
 * Implementa múltiplas camadas de proteção:
 * - Bloqueio durante hidratação
 * - Delay pós-hidratação
 * - Verificação de integridade de dados (partners)
 * - Backup automático antes de salvar
 */

import { useCallback, useRef, useState, useEffect } from 'react';
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

const BACKUP_KEY = 'animated-banner-backup';
const POST_HYDRATION_DELAY_MS = 500; // Delay adicional após hidratação

export const useAnimatedBannerAutoSave = (
  saveLandingPage: (id: string, data: Partial<LandingPageData>) => Promise<boolean | void>,
  pageId?: string,
  options: AnimatedBannerAutoSaveOptions = {}
) => {
  const lastSaveRef = useRef<Date>();
  const lastKnownPartnersCountRef = useRef<number | null>(null);
  const hydrationEndTimeRef = useRef<number | null>(null);
  const [isPostHydrationReady, setIsPostHydrationReady] = useState(false);

  // Gerenciar delay pós-hidratação
  useEffect(() => {
    if (!options.isHydratingFromServer && !isPostHydrationReady) {
      const timeout = setTimeout(() => {
        console.log('✅ [ANIMATED-BANNER] Delay pós-hidratação concluído - auto-save liberado');
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
        animated_banner_section: data.animated_banner_section
      };
      localStorage.setItem(`${BACKUP_KEY}-${pageId}`, JSON.stringify(backup));
      console.log('💾 [ANIMATED-BANNER] Backup local criado');
    } catch (error) {
      console.error('❌ [ANIMATED-BANNER] Erro ao criar backup:', error);
    }
  }, [pageId]);

  const debouncedAutoSave = useDebounce(async (updatedData: LandingPageData, isHydrating: boolean, isReady: boolean) => {
    if (!pageId) return;
    
    // 🛡️ PROTEÇÃO 1: Não salvar durante hidratação
    if (isHydrating) {
      console.log('🛡️ [AUTO-SAVE] Bloqueado durante hidratação - Faixa Animada');
      return;
    }
    
    // 🛡️ PROTEÇÃO 2: Não salvar antes do delay pós-hidratação
    if (!isReady) {
      console.log('🛡️ [AUTO-SAVE] Aguardando delay pós-hidratação - Faixa Animada');
      return;
    }
    
    const currentPartnersCount = updatedData.animated_banner_section?.partners?.length || 0;
    
    // 🛡️ PROTEÇÃO 3: Não salvar array vazio se havia dados antes
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
    
    // 🛡️ PROTEÇÃO 4: Criar backup antes de salvar
    createLocalBackup(updatedData);
    
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
    
    // 🛡️ Bloquear antes do delay pós-hidratação
    if (!isPostHydrationReady) {
      console.log('🛡️ [ANIMATED-BANNER] Auto-save bloqueado - aguardando delay pós-hidratação');
      return;
    }
    
    console.log('🎨 [ANIMATED-BANNER] Iniciando auto-save');
    debouncedAutoSave(updatedData, isHydrating, isPostHydrationReady);
  }, [debouncedAutoSave, options.isHydratingFromServer, isPostHydrationReady]);

  // Função para inicializar contagem conhecida (chamada após hidratação)
  const initializeKnownCount = useCallback((count: number) => {
    if (count > 0) {
      lastKnownPartnersCountRef.current = count;
      console.log('📊 [ANIMATED-BANNER] Contagem inicial de partners:', count);
    }
  }, []);

  // Função para restaurar backup
  const restoreBackup = useCallback((): any | null => {
    if (!pageId) return null;
    
    try {
      const backupStr = localStorage.getItem(`${BACKUP_KEY}-${pageId}`);
      if (!backupStr) return null;
      
      const backup = JSON.parse(backupStr);
      console.log('🔄 [ANIMATED-BANNER] Backup restaurado de', new Date(backup.timestamp).toLocaleString());
      return backup.animated_banner_section;
    } catch {
      return null;
    }
  }, [pageId]);

  return {
    saveAnimatedBanner,
    lastSave: lastSaveRef.current,
    initializeKnownCount,
    restoreBackup,
    isReady: isPostHydrationReady
  };
};
