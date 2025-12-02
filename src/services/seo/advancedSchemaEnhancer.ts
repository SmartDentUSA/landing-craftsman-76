/**
 * Advanced Schema Enhancer - ENTERPRISE GRADE
 * Adiciona SpeakableSpecification, about, mentions para IA-readiness
 * ✅ USA structuredClone para evitar mutação
 * ✅ FAIL-SAFE DUPLO: try/catch interno
 * ✅ FASE 1: Enterprise Organization Schema
 * ✅ FASE 2: Speakable & AI Context
 */

/**
 * Gera SpeakableSpecification para assistentes de voz e IA
 * @param cssSelectors - Seletores CSS dos elementos "falantes"
 * @returns Schema SpeakableSpecification
 */
export function generateSpeakableSpecification(cssSelectors: string[] = []): object {
  return {
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors.length > 0 
      ? cssSelectors 
      : [
          "h1", 
          ".banner-title", 
          ".banner-subtitle",
          ".hero h1",
          ".blog-content h2", 
          ".blog-content p:first-of-type", 
          "article h1", 
          "article h2",
          ".offers-section h2",
          ".faq-section h2",
          ".solutions-section h2"
        ]
  };
}

/**
 * FASE 1: Gera Enterprise Organization Schema completo
 * @param companyProfile - Perfil completo da empresa
 * @returns Schema Organization enterprise-grade
 */
export function generateEnterpriseOrganizationSchema(companyProfile: any): object {
  try {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": ["Organization", "LocalBusiness"],
      "@id": companyProfile.website_url ? `${companyProfile.website_url}/#organization` : "#organization",
      "name": companyProfile.company_name,
      "legalName": companyProfile.company_name,
      "description": companyProfile.company_description
    };

    // ✅ URL e Logo
    if (companyProfile.website_url) {
      schema.url = companyProfile.website_url;
    }
    
    if (companyProfile.company_logo_url) {
      schema.logo = {
        "@type": "ImageObject",
        "url": companyProfile.company_logo_url,
        "caption": `Logo oficial ${companyProfile.company_name}`
      };
      schema.image = companyProfile.company_logo_url;
    }

    // ✅ Fundação
    if (companyProfile.founded_year) {
      schema.foundingDate = companyProfile.founded_year.toString();
    }

    // ✅ Tamanho da equipe
    if (companyProfile.team_size) {
      schema.numberOfEmployees = {
        "@type": "QuantitativeValue",
        "value": companyProfile.team_size
      };
    }

    // ✅ Endereço estruturado completo com GeoCoordinates
    const hasAddress = companyProfile.street_address || companyProfile.city || companyProfile.state;
    if (hasAddress) {
      schema.address = {
        "@type": "PostalAddress",
        "streetAddress": [companyProfile.street_address, companyProfile.address_number]
          .filter(Boolean).join(', '),
        "addressLocality": companyProfile.city || '',
        "addressRegion": companyProfile.state || '',
        "postalCode": companyProfile.postal_code || '',
        "addressCountry": companyProfile.country || 'BR'
      };
    }

    // ✅ GeoCoordinates (se disponível)
    if (companyProfile.latitude && companyProfile.longitude) {
      schema.geo = {
        "@type": "GeoCoordinates",
        "latitude": companyProfile.latitude,
        "longitude": companyProfile.longitude
      };
    }

    // ✅ Contatos estruturados (múltiplos ContactPoint)
    const contactPoints: any[] = [];
    
    if (companyProfile.contact_phone || companyProfile.contact_email) {
      contactPoints.push({
        "@type": "ContactPoint",
        "contactType": "customer service",
        "telephone": companyProfile.contact_phone,
        "email": companyProfile.contact_email,
        "availableLanguage": ["Portuguese", "English"]
      });
      
      contactPoints.push({
        "@type": "ContactPoint",
        "contactType": "sales",
        "telephone": companyProfile.contact_phone,
        "availableLanguage": ["Portuguese", "English"]
      });
    }
    
    if (contactPoints.length > 0) {
      schema.contactPoint = contactPoints;
    }

    // ✅ sameAs (redes sociais + domínios SEO)
    const sameAsLinks: string[] = [];
    
    if (companyProfile.social_media_links) {
      const socialLinks = typeof companyProfile.social_media_links === 'string'
        ? JSON.parse(companyProfile.social_media_links)
        : companyProfile.social_media_links;
      
      Object.values(socialLinks).forEach((link: any) => {
        if (link && typeof link === 'string' && link.startsWith('http')) {
          sameAsLinks.push(link);
        }
      });
    }
    
    if (companyProfile.instagram_profile) {
      sameAsLinks.push(`https://instagram.com/${companyProfile.instagram_profile.replace('@', '')}`);
    }
    
    if (companyProfile.youtube_channel) {
      sameAsLinks.push(companyProfile.youtube_channel);
    }
    
    // Adicionar domínios SEO como sameAs
    if (companyProfile.seo_domains && Array.isArray(companyProfile.seo_domains)) {
      companyProfile.seo_domains
        .filter((d: any) => d.enabled && d.use_in_schema)
        .forEach((d: any) => sameAsLinks.push(`https://${d.domain}`));
    }
    
    if (sameAsLinks.length > 0) {
      schema.sameAs = [...new Set(sameAsLinks)];
    }

    // ✅ Área de atuação estruturada
    const areasServed: any[] = [];
    
    if (companyProfile.seo_service_areas) {
      const areas = companyProfile.seo_service_areas.split(',').map((a: string) => a.trim());
      areas.forEach((area: string) => {
        areasServed.push({
          "@type": "Place",
          "name": area
        });
      });
    }
    
    // País padrão
    areasServed.push({
      "@type": "Country",
      "name": "Brasil"
    });
    
    schema.areaServed = areasServed;

    // ✅ knowsAbout (expertise)
    const knowsAbout: string[] = [];
    
    if (companyProfile.seo_technical_expertise) {
      knowsAbout.push(companyProfile.seo_technical_expertise);
    }
    if (companyProfile.seo_competitive_advantages) {
      knowsAbout.push(...companyProfile.seo_competitive_advantages.split(',').map((a: string) => a.trim()));
    }
    if (companyProfile.business_sector) {
      knowsAbout.push(companyProfile.business_sector);
    }
    if (companyProfile.main_products_services) {
      knowsAbout.push(companyProfile.main_products_services);
    }
    
    if (knowsAbout.length > 0) {
      schema.knowsAbout = [...new Set(knowsAbout)];
    }

    // ✅ Slogan e missão
    if (companyProfile.brand_values) {
      schema.slogan = companyProfile.brand_values;
    }
    
    // ✅ Speakable para IA de voz
    schema.speakable = generateSpeakableSpecification();

    console.log('✅ [Enterprise Schema] Organization completo gerado');
    return schema;
    
  } catch (error) {
    console.error('[Enterprise Schema] Falha ao gerar Organization:', error);
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": companyProfile?.company_name || "Empresa"
    };
  }
}

/**
 * Enriquece schemas existentes com contexto de IA
 * @param existingSchemas - Array de schemas existentes
 * @param companyProfile - Perfil da empresa
 * @param products - Lista de produtos (opcional)
 * @returns Schemas enriquecidos (CLONE - não muta original)
 */
export function enrichSchemaWithAIContext(
  existingSchemas: object[],
  companyProfile: any,
  products: any[] = []
): object[] {
  // ✅ FAIL-SAFE INTERNO
  try {
    // ✅ CLONE para evitar mutação
    const clonedSchemas = structuredClone(existingSchemas);
    
    // Encontrar WebPage schema
    const webPageIndex = clonedSchemas.findIndex((s: any) => 
      s['@type'] === 'WebPage' || s['@type'] === 'Article' || s['@type'] === 'BlogPosting'
    );
    
    if (webPageIndex >= 0) {
      const webPage = clonedSchemas[webPageIndex] as any;
      
      // Adicionar SpeakableSpecification se não existe
      if (!webPage.speakable) {
        webPage.speakable = generateSpeakableSpecification();
      }
      
      // Adicionar about se não existe
      if (!webPage.about && companyProfile) {
        webPage.about = {
          "@type": "Thing",
          "name": companyProfile.business_sector || companyProfile.industry || "Odontologia Digital",
          "description": companyProfile.company_description?.substring(0, 200)
        };
      }
      
      // Adicionar mentions baseado em produtos
      if (!webPage.mentions && products.length > 0) {
        webPage.mentions = products.slice(0, 5).map(p => ({
          "@type": "Product",
          "name": p.name,
          "@id": p.product_url || p.url || `#product-${p.id}`
        }));
      }
      
      // ✅ Adicionar publisher com referência ao Organization
      if (!webPage.publisher && companyProfile) {
        webPage.publisher = {
          "@type": "Organization",
          "@id": companyProfile.website_url ? `${companyProfile.website_url}/#organization` : "#organization",
          "name": companyProfile.company_name,
          "logo": companyProfile.company_logo_url ? {
            "@type": "ImageObject",
            "url": companyProfile.company_logo_url
          } : undefined
        };
      }
    }
    
    console.log('✅ [Schema Enhancer] Schemas enriquecidos com contexto IA');
    return clonedSchemas;
    
  } catch (error) {
    // ✅ FAIL-SAFE: Retorna schemas originais se falhar
    console.error('[Schema Enhancer] Falha, retornando original:', error);
    return existingSchemas;
  }
}

/**
 * Valida hierarquia de schemas obrigatórios
 * @param schemas - Array de schemas para validar
 * @returns Resultado da validação
 */
export function validateSchemaHierarchy(schemas: object[]): { 
  valid: boolean; 
  errors: string[]; 
  warnings: string[] 
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const types = schemas.map((s: any) => s['@type']).flat();
    
    // Validações obrigatórias
    if (!types.includes('Organization') && !types.includes('LocalBusiness')) {
      errors.push('Schema Organization/LocalBusiness ausente');
    }
    
    if (!types.includes('WebPage') && !types.includes('Article') && !types.includes('BlogPosting')) {
      warnings.push('Schema WebPage/Article recomendado');
    }
    
    // Verificar SpeakableSpecification
    const hasSpeak = schemas.some((s: any) => s.speakable || s['@type'] === 'SpeakableSpecification');
    if (!hasSpeak) {
      warnings.push('SpeakableSpecification ausente (IA-readiness)');
    }
    
    // Verificar about/mentions
    const hasAbout = schemas.some((s: any) => s.about);
    if (!hasAbout) {
      warnings.push('Campo about ausente (contexto semântico)');
    }
    
    // Verificar publisher correto
    const hasValidPublisher = schemas.some((s: any) => 
      s.publisher && s.publisher.name && s.publisher.name !== 'Nossa Empresa'
    );
    if (!hasValidPublisher) {
      warnings.push('Publisher não especificado corretamente');
    }
    
  } catch (error) {
    errors.push(`Erro na validação: ${error}`);
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Gera schema de Article completo com melhorias de IA
 * @param articleData - Dados do artigo
 * @param companyProfile - Perfil da empresa (opcional)
 * @returns Schema Article enriquecido
 */
export function generateArticleSchemaWithAI(articleData: {
  title: string;
  description: string;
  author?: { name: string; url?: string; id?: string };
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
}, companyProfile?: any): object {
  return {
    "@type": "Article",
    "headline": articleData.title,
    "description": articleData.description,
    "author": articleData.author ? {
      "@type": "Person",
      "name": articleData.author.name,
      "url": articleData.author.url,
      "@id": articleData.author.id ? `#author-${articleData.author.id}` : undefined
    } : undefined,
    "datePublished": articleData.datePublished,
    "dateModified": articleData.dateModified || articleData.datePublished,
    "image": articleData.image,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleData.url
    },
    "speakable": generateSpeakableSpecification([
      "h1",
      ".blog-content h2",
      ".blog-content p:first-of-type",
      "blockquote",
      ".article-summary"
    ]),
    "about": companyProfile ? {
      "@type": "Thing",
      "name": companyProfile.business_sector || companyProfile.industry || "Odontologia Digital"
    } : undefined,
    "publisher": companyProfile ? {
      "@type": "Organization",
      "@id": companyProfile.website_url ? `${companyProfile.website_url}/#organization` : "#organization",
      "name": companyProfile.company_name,
      "logo": companyProfile.company_logo_url ? {
        "@type": "ImageObject",
        "url": companyProfile.company_logo_url
      } : undefined
    } : undefined
  };
}
