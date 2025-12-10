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
  country?: 'Brazil' | 'USA' | '';
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

export interface FooterData {
  locations: FooterLocation[];
  links: FooterLink[];
  social: FooterSocialLink[];
}

export interface MenuData {
  label: string;
  href: string;
}

export const useAutoFooterPopulation = () => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        // Obter usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('ℹ️ Usuário não autenticado');
          setIsLoading(false);
          return;
        }

        // Filtrar por user_id do usuário autenticado
        const { data, error } = await supabase
          .from('company_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar perfil da empresa:', error);
          setIsLoading(false);
          return;
        }
        
        if (data) {
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
        } else {
          console.log('ℹ️ Perfil da empresa não encontrado para este usuário');
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
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

  // 🆕 Forçar re-sincronização com dados do perfil (limpa flags de sessão)
  const forceResyncFromProfile = useCallback((): { menu: MenuData[], footer: FooterData } => {
    // Limpar flags de sessão para permitir re-aplicação
    sessionStorage.removeItem('autoFooterApplied');
    sessionStorage.removeItem('autoMenuApplied');
    
    return {
      menu: generateAutoNavigation(),
      footer: generateAutoFooter()
    };
  }, [generateAutoNavigation, generateAutoFooter]);

  // 🆕 Obter dados do perfil para comparação (verifica se está sincronizado)
  const getProfileDefaults = useCallback((): { menu: MenuData[], footer: FooterData } => {
    return {
      menu: generateAutoNavigation(),
      footer: generateAutoFooter()
    };
  }, [generateAutoNavigation, generateAutoFooter]);

  // 🆕 Verificar se menu atual está sincronizado com perfil
  const isMenuSyncedWithProfile = useCallback((currentMenu: MenuData[]): boolean => {
    const profileMenu = generateAutoNavigation();
    if (profileMenu.length === 0) return true; // Não há dados no perfil para comparar
    if (currentMenu.length !== profileMenu.length) return false;
    
    return currentMenu.every((item, index) => 
      item.label === profileMenu[index]?.label && 
      item.href === profileMenu[index]?.href
    );
  }, [generateAutoNavigation]);

  // 🆕 Verificar se footer atual está sincronizado com perfil
  const isFooterSyncedWithProfile = useCallback((currentFooter: FooterData): boolean => {
    const profileFooter = generateAutoFooter();
    
    // Se não há dados no perfil, considera sincronizado
    if (profileFooter.locations.length === 0 && 
        profileFooter.links.length === 0 && 
        profileFooter.social.length === 0) {
      return true;
    }
    
    // Comparar localizações
    if (currentFooter.locations?.length !== profileFooter.locations.length) return false;
    
    // Comparar links
    if (currentFooter.links?.length !== profileFooter.links.length) return false;
    
    // Comparar redes sociais
    if (currentFooter.social?.length !== profileFooter.social.length) return false;
    
    // Se passou todas as verificações básicas, está sincronizado
    return true;
  }, [generateAutoFooter]);

  return {
    companyProfile,
    isLoading,
    generateAutoNavigation,
    generateAutoFooter,
    forceResyncFromProfile,
    getProfileDefaults,
    isMenuSyncedWithProfile,
    isFooterSyncedWithProfile,
    hasCompanyData: !!companyProfile
  };
};
