import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseTargetAudienceString } from '@/lib/target-audience-helper';

interface CompanyTargetAudienceResult {
  targetAudience: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Cache global para evitar múltiplas requisições
let cachedTargetAudience: string[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useCompanyTargetAudience(): CompanyTargetAudienceResult {
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTargetAudience = useCallback(async () => {
    // Verificar cache
    const now = Date.now();
    if (cachedTargetAudience && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      setTargetAudience(cachedTargetAudience);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('company_profile')
        .select('target_audience')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data?.target_audience) {
        // Converter string para array usando o helper
        const audienceArray = parseTargetAudienceString(data.target_audience);
        
        // Atualizar cache
        cachedTargetAudience = audienceArray;
        cacheTimestamp = now;
        
        setTargetAudience(audienceArray);
      } else {
        setTargetAudience([]);
      }
    } catch (err: any) {
      console.error('Error fetching company target audience:', err);
      setError(err.message || 'Erro ao buscar público-alvo da empresa');
      setTargetAudience([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    // Limpar cache e recarregar
    cachedTargetAudience = null;
    cacheTimestamp = null;
    await fetchTargetAudience();
  }, [fetchTargetAudience]);

  useEffect(() => {
    fetchTargetAudience();
  }, [fetchTargetAudience]);

  return {
    targetAudience,
    loading,
    error,
    refresh
  };
}
