import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyProfile {
  company_name?: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  instagram_profile?: string;
  youtube_channel?: string;
  social_media_links?: any;
}

interface FooterData {
  locations: Array<{ title: string; address: string }>;
  links: Array<{ label: string; href: string }>;
  social: Array<{ platform: string; href: string; icon_src: string; icon_alt: string }>;
}

export const useAutoFooterPopulation = () => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        const { data } = await supabase
          .from('company_profile')
          .select('*')
          .single();
        
        setCompanyProfile(data);
      } catch (error) {
        console.log('ℹ️ Perfil da empresa não encontrado');
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanyProfile();
  }, []);

  const generateAutoFooter = useCallback((): FooterData => {
    if (!companyProfile) {
      return { locations: [], links: [], social: [] };
    }

    const footer: FooterData = {
      locations: [],
      links: [],
      social: []
    };

    // Localização da empresa
    if (companyProfile.location) {
      footer.locations.push({
        title: companyProfile.company_name || 'Nossa Empresa',
        address: companyProfile.location
      });
    }

    // Links principais
    if (companyProfile.website_url) {
      footer.links.push({ 
        label: 'Website', 
        href: companyProfile.website_url 
      });
    }

    // Redes sociais
    if (companyProfile.instagram_profile) {
      footer.social.push({ 
        platform: 'Instagram', 
        href: companyProfile.instagram_profile.startsWith('http') 
          ? companyProfile.instagram_profile 
          : `https://instagram.com/${companyProfile.instagram_profile.replace('@', '')}`,
        icon_src: '',
        icon_alt: 'Instagram'
      });
    }

    if (companyProfile.youtube_channel) {
      footer.social.push({ 
        platform: 'YouTube', 
        href: companyProfile.youtube_channel.startsWith('http')
          ? companyProfile.youtube_channel
          : `https://youtube.com/${companyProfile.youtube_channel.replace('@', '')}`,
        icon_src: '',
        icon_alt: 'YouTube'
      });
    }

    // Adicionar links de social_media_links
    if (companyProfile.social_media_links && Array.isArray(companyProfile.social_media_links)) {
      companyProfile.social_media_links.forEach((link) => {
        if (link.url && link.platform) {
          footer.social.push({ 
            platform: link.platform, 
            href: link.url,
            icon_src: '',
            icon_alt: link.platform
          });
        }
      });
    }

    return footer;
  }, [companyProfile]);

  return {
    companyProfile,
    isLoading,
    generateAutoFooter,
    hasCompanyData: !!companyProfile
  };
};