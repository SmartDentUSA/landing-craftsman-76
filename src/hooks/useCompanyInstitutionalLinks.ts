import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InstitutionalLink {
  label: string;
  url: string;
  category: 'institutional' | 'support' | 'legal' | 'policy';
}

export function useCompanyInstitutionalLinks() {
  const [links, setLinks] = useState<InstitutionalLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstitutionalLinks();
  }, []);

  const loadInstitutionalLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_profile')
        .select('institutional_links')
        .maybeSingle();

      if (error) {
        console.error('Error loading institutional links:', error);
        return;
      }

      if (data?.institutional_links && Array.isArray(data.institutional_links)) {
        setLinks(data.institutional_links as unknown as InstitutionalLink[]);
      }
    } catch (error) {
      console.error('Error loading institutional links:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    links,
    loading,
    reload: loadInstitutionalLinks
  };
}