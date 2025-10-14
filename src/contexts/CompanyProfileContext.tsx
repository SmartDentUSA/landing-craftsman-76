import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyProfile {
  id: string;
  company_name: string;
  company_description?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  seo_context_keywords?: any;
  institutional_links?: any;
  tracking_pixels?: any;
  seo_domains?: any;
  company_videos?: any;
  company_reviews?: any;
  target_audience?: string;
  business_sector?: string;
  founded_year?: number;
  social_media_links?: any;
  youtube_company_footer?: string;
  seo_service_areas?: string;
  seo_technical_expertise?: string;
  seo_competitive_advantages?: string;
  seo_market_positioning?: string;
  instagram_profile?: string;
  youtube_channel?: string;
  team_size?: string;
  company_logo_url?: string;
  differentiators?: string;
  delivery_approach?: string;
  working_methodology?: string;
  company_culture?: string;
  vision_statement?: string;
  mission_statement?: string;
  brand_values?: string;
  main_products_services?: string;
}

interface CompanyProfileContextType {
  profile: CompanyProfile | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CompanyProfileContext = createContext<CompanyProfileContextType | undefined>(undefined);

export function CompanyProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .single(); // ✅ Agora funciona com 1 registro único

      if (error) {
        console.error('❌ Erro ao carregar perfil da empresa:', error);
      } else {
        setProfile(data);
        console.log('✅ Perfil da empresa carregado:', data?.company_name);
      }
    } catch (err) {
      console.error('❌ Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <CompanyProfileContext.Provider value={{ profile, loading, refetch: fetchProfile }}>
      {children}
    </CompanyProfileContext.Provider>
  );
}

export function useCompanyProfile() {
  const context = useContext(CompanyProfileContext);
  if (!context) {
    throw new Error('useCompanyProfile must be used within CompanyProfileProvider');
  }
  return context;
}
