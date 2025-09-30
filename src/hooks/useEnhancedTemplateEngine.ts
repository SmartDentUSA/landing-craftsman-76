import { useState, useCallback } from 'react';
import { generateHTML } from '@/lib/template-engine';
import { getCompanyProfileForSEO, buildSEOMetaFromCompany } from '@/lib/company-profile-helper';

export function useEnhancedTemplateEngine() {
  const [isLoading, setIsLoading] = useState(false);

  const generateEnhancedHTML = useCallback(async (data: any): Promise<string> => {
    setIsLoading(true);
    
    try {
      // Buscar dados do perfil da empresa
      const companyProfile = await getCompanyProfileForSEO();
      
      // Integrar dados da empresa no data antes de gerar HTML
      let enhancedData = { ...data };
      
      if (companyProfile) {
        const companyMeta = buildSEOMetaFromCompany(companyProfile, data.ai_keywords?.primary || []);
        
        // Integrar company_name em og:site_name
        if (!enhancedData.og_site_name && companyProfile.company_name) {
          enhancedData.og_site_name = companyProfile.company_name;
        }
        
        // Usar company_description como fallback para meta description
        if (!enhancedData.seo_description && companyProfile.company_description) {
          enhancedData.seo_description = companyProfile.company_description;
        }
        
        // Adicionar seo_context_keywords às keywords existentes
        if (companyMeta.additionalKeywords.length > 0) {
          const existingKeywords = enhancedData.ai_keywords?.primary || [];
          enhancedData.ai_keywords = {
            ...enhancedData.ai_keywords,
            primary: [...existingKeywords, ...companyMeta.additionalKeywords]
          };
        }
        
        // Enriquecer meta description com seo_market_positioning
        if (companyProfile.seo_market_positioning && enhancedData.seo_description) {
          enhancedData.seo_description = `${enhancedData.seo_description} ${companyProfile.seo_market_positioning}`;
        }
        
        // Adicionar contexto geográfico se disponível
        if (companyMeta.geoContext && !enhancedData.seo_description?.includes(companyMeta.geoContext)) {
          enhancedData.seo_description = `${enhancedData.seo_description} | ${companyMeta.geoContext}`;
        }
        
        // Adicionar footer automático da empresa
        enhancedData.company_footer = companyMeta.companyFooter;
        enhancedData.institutional_links_html = companyMeta.institutionalLinksHtml;
        
        // Passar dados da empresa para o template engine
        enhancedData.company_profile = companyProfile;
        
        console.info('✅ Dados da empresa integrados ao HTML:', {
          company_name: companyProfile.company_name,
          seo_context_keywords: companyProfile.seo_context_keywords?.length || 0,
          institutional_links: companyProfile.institutional_links?.length || 0
        });
      }
      
      // Gerar HTML com dados enriquecidos
      return generateHTML(enhancedData);
      
    } catch (error) {
      console.error('Erro ao gerar HTML com dados da empresa:', error);
      // Fallback: gerar HTML sem dados da empresa
      return generateHTML(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateEnhancedHTML,
    isLoading
  };
}