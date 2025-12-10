/**
 * 🛡️ Hook Centralizado de Proteção Anti-Perda de Dados
 * 
 * Gerencia estado de hidratação global com delay pós-hidratação,
 * armazena snapshot inicial, valida integridade e cria backups locais.
 */

import { useCallback, useRef, useState } from 'react';

// Arrays críticos que NUNCA devem ser zerados por auto-save
export const CRITICAL_ARRAYS = [
  'offers',
  'partners', 
  'table_data',
  'solutions',
  'faq',
  'breadcrumb',
  'menu',
  'locations',
  'links',
  'social',
  'images'
] as const;

// Formato do backup local
interface LocalBackup {
  timestamp: number;
  data: Record<string, any>;
  pageId: string;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  blockedArrays?: string[];
}

interface AutoSaveProtectionState {
  isHydrating: boolean;
  isProtectionActive: boolean;
  hydrationEndTime: number | null;
  initialSnapshot: Record<string, any> | null;
}

interface UseAutoSaveProtectionReturn {
  // Estado
  isHydrating: boolean;
  isProtectionActive: boolean;
  
  // Métodos de controle de hidratação
  startHydration: () => void;
  endHydration: (initialData: any, delayMs?: number) => void;
  
  // Métodos de validação
  validateBeforeSave: (newData: any, sectionName?: string) => ValidationResult;
  
  // Métodos de backup
  createBackup: (data: any, pageId: string) => void;
  restoreLatestBackup: (pageId: string) => Record<string, any> | null;
  listBackups: (pageId: string) => LocalBackup[];
  
  // Snapshot
  getInitialSnapshot: () => Record<string, any> | null;
}

const BACKUP_KEY_PREFIX = 'lp-backup-';
const MAX_BACKUPS_PER_PAGE = 5;
const POST_HYDRATION_DELAY_MS = 3000; // 3 segundos de delay após hidratação

/**
 * Extrai contagem de arrays críticos de um objeto de dados
 */
function extractCriticalArrayCounts(data: any): Record<string, number> {
  const counts: Record<string, number> = {};
  
  if (!data || typeof data !== 'object') return counts;
  
  // Verificar arrays no nível raiz
  for (const key of CRITICAL_ARRAYS) {
    if (Array.isArray(data[key])) {
      counts[key] = data[key].length;
    }
  }
  
  // Verificar arrays aninhados comuns
  if (data.animated_banner_section?.partners) {
    counts['animated_banner_section.partners'] = data.animated_banner_section.partners.length;
  }
  if (data.desktop_info?.table_data) {
    counts['desktop_info.table_data'] = data.desktop_info.table_data.length;
  }
  if (data.schema?.offers) {
    counts['schema.offers'] = data.schema.offers.length;
  }
  if (data.schema?.breadcrumb) {
    counts['schema.breadcrumb'] = data.schema.breadcrumb.length;
  }
  if (data.footer?.locations) {
    counts['footer.locations'] = data.footer.locations.length;
  }
  if (data.footer?.links) {
    counts['footer.links'] = data.footer.links.length;
  }
  if (data.footer?.social) {
    counts['footer.social'] = data.footer.social.length;
  }
  if (data.banner?.images) {
    counts['banner.images'] = data.banner.images.length;
  }
  
  return counts;
}

/**
 * Compara contagens para detectar perda de dados
 */
function detectDataLoss(
  initialCounts: Record<string, number>, 
  newCounts: Record<string, number>
): string[] {
  const blockedArrays: string[] = [];
  
  for (const [key, initialCount] of Object.entries(initialCounts)) {
    const newCount = newCounts[key] ?? 0;
    
    // Bloquear se tinha dados e agora está vazio
    if (initialCount > 0 && newCount === 0) {
      blockedArrays.push(key);
    }
  }
  
  return blockedArrays;
}

export function useAutoSaveProtection(): UseAutoSaveProtectionReturn {
  const [state, setState] = useState<AutoSaveProtectionState>({
    isHydrating: true,
    isProtectionActive: true,
    hydrationEndTime: null,
    initialSnapshot: null
  });
  
  const initialCountsRef = useRef<Record<string, number>>({});
  const hydrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inicia o modo de hidratação (bloqueia auto-saves)
  const startHydration = useCallback(() => {
    console.log('🛡️ [PROTECTION] Iniciando hidratação - auto-saves bloqueados');
    
    // Limpar timeout anterior se existir
    if (hydrationTimeoutRef.current) {
      clearTimeout(hydrationTimeoutRef.current);
    }
    
    setState(prev => ({
      ...prev,
      isHydrating: true,
      isProtectionActive: true
    }));
  }, []);

  // Finaliza hidratação com delay de segurança
  const endHydration = useCallback((initialData: any, delayMs: number = POST_HYDRATION_DELAY_MS) => {
    console.log('🛡️ [PROTECTION] Finalizando hidratação com delay de', delayMs, 'ms');
    
    // Armazenar snapshot inicial e contagens
    const counts = extractCriticalArrayCounts(initialData);
    initialCountsRef.current = counts;
    
    setState(prev => ({
      ...prev,
      initialSnapshot: JSON.parse(JSON.stringify(initialData)),
      isHydrating: false // Hidratação terminou
    }));
    
    console.log('📊 [PROTECTION] Contagens iniciais registradas:', counts);
    
    // Delay de segurança antes de liberar proteção
    hydrationTimeoutRef.current = setTimeout(() => {
      console.log('✅ [PROTECTION] Proteção liberada - auto-saves permitidos');
      setState(prev => ({
        ...prev,
        isProtectionActive: false,
        hydrationEndTime: Date.now()
      }));
    }, delayMs);
  }, []);

  // Valida dados antes de salvar
  const validateBeforeSave = useCallback((newData: any, sectionName?: string): ValidationResult => {
    // Se ainda está em hidratação ou proteção ativa, bloquear
    if (state.isHydrating) {
      return {
        valid: false,
        reason: `Bloqueado durante hidratação${sectionName ? ` (${sectionName})` : ''}`
      };
    }
    
    if (state.isProtectionActive) {
      return {
        valid: false,
        reason: `Aguardando delay pós-hidratação${sectionName ? ` (${sectionName})` : ''}`
      };
    }
    
    // Validar integridade dos arrays críticos
    const newCounts = extractCriticalArrayCounts(newData);
    const blockedArrays = detectDataLoss(initialCountsRef.current, newCounts);
    
    if (blockedArrays.length > 0) {
      console.warn('⚠️ [PROTECTION] Perda de dados detectada:', blockedArrays);
      return {
        valid: false,
        reason: `Tentativa de zerar arrays críticos: ${blockedArrays.join(', ')}`,
        blockedArrays
      };
    }
    
    return { valid: true };
  }, [state.isHydrating, state.isProtectionActive]);

  // Cria backup local em localStorage
  const createBackup = useCallback((data: any, pageId: string) => {
    if (!pageId || !data) return;
    
    try {
      const backup: LocalBackup = {
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(data)),
        pageId
      };
      
      const backupKey = `${BACKUP_KEY_PREFIX}${pageId}`;
      
      // Buscar backups existentes
      const existingBackupsStr = localStorage.getItem(backupKey);
      let existingBackups: LocalBackup[] = [];
      
      if (existingBackupsStr) {
        try {
          existingBackups = JSON.parse(existingBackupsStr);
        } catch {
          existingBackups = [];
        }
      }
      
      // Adicionar novo backup e manter apenas os últimos N
      existingBackups.unshift(backup);
      existingBackups = existingBackups.slice(0, MAX_BACKUPS_PER_PAGE);
      
      localStorage.setItem(backupKey, JSON.stringify(existingBackups));
      
      console.log('💾 [BACKUP] Backup criado para página', pageId, 'em', new Date(backup.timestamp).toLocaleTimeString());
    } catch (error) {
      console.error('❌ [BACKUP] Erro ao criar backup:', error);
    }
  }, []);

  // Restaura o backup mais recente
  const restoreLatestBackup = useCallback((pageId: string): Record<string, any> | null => {
    if (!pageId) return null;
    
    try {
      const backupKey = `${BACKUP_KEY_PREFIX}${pageId}`;
      const backupsStr = localStorage.getItem(backupKey);
      
      if (!backupsStr) return null;
      
      const backups: LocalBackup[] = JSON.parse(backupsStr);
      
      if (backups.length === 0) return null;
      
      const latestBackup = backups[0];
      console.log('🔄 [BACKUP] Restaurando backup de', new Date(latestBackup.timestamp).toLocaleString());
      
      return latestBackup.data;
    } catch (error) {
      console.error('❌ [BACKUP] Erro ao restaurar backup:', error);
      return null;
    }
  }, []);

  // Lista todos os backups disponíveis
  const listBackups = useCallback((pageId: string): LocalBackup[] => {
    if (!pageId) return [];
    
    try {
      const backupKey = `${BACKUP_KEY_PREFIX}${pageId}`;
      const backupsStr = localStorage.getItem(backupKey);
      
      if (!backupsStr) return [];
      
      return JSON.parse(backupsStr);
    } catch {
      return [];
    }
  }, []);

  // Retorna snapshot inicial
  const getInitialSnapshot = useCallback(() => {
    return state.initialSnapshot;
  }, [state.initialSnapshot]);

  return {
    isHydrating: state.isHydrating,
    isProtectionActive: state.isProtectionActive,
    startHydration,
    endHydration,
    validateBeforeSave,
    createBackup,
    restoreLatestBackup,
    listBackups,
    getInitialSnapshot
  };
}
