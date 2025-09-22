import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KOL {
  id: string;
  full_name: string;
  photo_url?: string;
  mini_cv?: string;
  lattes_url?: string;
  website_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  specialty?: string;
  approved: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export const useKOLs = (approvedOnly: boolean = false) => {
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);

  const loadKOLs = async () => {
    try {
      let query = supabase
        .from('key_opinion_leaders')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true });

      if (approvedOnly) {
        query = query.eq('approved', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setKols(data || []);
    } catch (error) {
      console.error('Error loading KOLs:', error);
      toast.error('Erro ao carregar especialistas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKOLs();
  }, [approvedOnly]);

  return {
    kols,
    loading,
    refetch: loadKOLs
  };
};