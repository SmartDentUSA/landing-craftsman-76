import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NavigationMenuItem {
  label: string;
  href: string;
  order: number;
  openInNewTab?: boolean;
}

interface FooterLocation {
  title: string;
  address: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSocialLink {
  platform: string;
  href: string;
  icon_src: string;
  icon_alt: string;
}

interface NavigationFooterConfig {
  navigation_menu: NavigationMenuItem[];
  footer: {
    title: string;
    locations: FooterLocation[];
    links: FooterLink[];
    social_links: FooterSocialLink[];
  };
}

interface CompanyProfile {
  company_name?: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  instagram_profile?: string;
  youtube_channel?: string;
  social_media_links?: any;
  navigation_footer_config?: NavigationFooterConfig;
}

interface FooterData {
  locations: FooterLocation[];
  links: FooterLink[];
  social: FooterSocialLink[];
}

interface MenuData {
  label: string;
  href: string;
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
        
        if (data) {
          // Cast para o tipo correto, tratando navigation_footer_config como unknown primeiro
          const navConfig = data.navigation_footer_config as unknown as NavigationFooterConfig | null;
          setCompanyProfile({
            company_name: data.company_name,
            location: data.location || undefined,
            contact_phone: data.contact_phone || undefined,
            contact_email: data.contact_email || undefined,
            website_url: data.website_url || undefined,
            instagram_profile: data.instagram_profile || undefined,
            youtube_channel: data.youtube_channel || undefined,
            social_media_links: data.social_media_links,
            navigation_footer_config: navConfig || undefined
          });
        }
      } catch (error) {
        console.log('ℹ️ Perfil da empresa não encontrado');
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanyProfile();
  }, []);

  // Gera menu de navegação a partir do perfil da empresa
  const generateAutoNavigation = useCallback((): MenuData[] => {
    if (!companyProfile) {
      return [];
    }

    // Se tem configuração de navegação definida, usar ela
    const navConfig = companyProfile.navigation_footer_config;
    if (navConfig?.navigation_menu && navConfig.navigation_menu.length > 0) {
      return navConfig.navigation_menu
        .sort((a, b) => a.order - b.order)
        .map(item => ({
          label: item.label,
          href: item.href
        }));
    }

    // Fallback: gerar menu básico a partir dos dados existentes
    const menu: MenuData[] = [];
    
    if (companyProfile.website_url) {
      menu.push({ label: 'Home', href: companyProfile.website_url });
    }

    return menu;
  }, [companyProfile]);

  // Gera footer a partir do perfil da empresa
  const generateAutoFooter = useCallback((): FooterData => {
    if (!companyProfile) {
      return { locations: [], links: [], social: [] };
    }

    // Se tem configuração de footer definida, usar ela
    const navConfig = companyProfile.navigation_footer_config;
    if (navConfig?.footer) {
      const footerConfig = navConfig.footer;
      
      // Se tem dados configurados, usar eles
      if (footerConfig.locations?.length > 0 || 
          footerConfig.links?.length > 0 || 
          footerConfig.social_links?.length > 0) {
        return {
          locations: footerConfig.locations || [],
          links: footerConfig.links || [],
          social: footerConfig.social_links || []
        };
      }
    }

    // Fallback: gerar footer a partir dos dados existentes (comportamento anterior)
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
      companyProfile.social_media_links.forEach((link: any) => {
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
    generateAutoNavigation,
    generateAutoFooter,
    hasCompanyData: !!companyProfile
  };
};
