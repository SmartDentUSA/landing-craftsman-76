// ═══════════════════════════════════════════════════════════
// 🎯 GERADOR DE SCHEMAS JSON-LD PARA SGE/AEO
// ═══════════════════════════════════════════════════════════

// ✅ FASE 3.1: Importar processamento de intelligent links
import { buildIntelligentLinksMap, applyIntelligentLinks } from '../../../src/services/seo/intelligentLinksProcessor.ts';

function generateSPINSchemas(
  solution: any,
  products: any[],
  company: any,
  faqs: any[],
  successCases: any[],
  canonicalUrl: string
): any[] {
  const schemas: any[] = [];

  // 1. Organization Schema
  if (company) {
    const orgSchema: any = {
      '@type': 'Organization',
      name: company.company_name || 'Smart Dent',
      url: company.website || canonicalUrl,
      
      // ✅ FASE 1: Logo CRÍTICO (priorizar company_logo_url)
      logo: company.company_logo_url || company.logo_url || '',
      
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: company.phone_number,
        contactType: 'customer service',
        email: company.email,
        areaServed: 'BR',
        availableLanguage: 'pt-BR'
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${company.street_address}, ${company.address_number}`,
        addressLocality: company.city,
        addressRegion: company.state,
        postalCode: company.postal_code,
        addressCountry: 'BR'
      }
    };
    
    // ✅ FASE 1: Ano de fundação (CRÍTICO Schema.org)
    if (company.founded_year) {
      orgSchema.foundingDate = company.founded_year.toString();
    }
    
    // ✅ FASE 1: Missão da empresa (SGE prioriza)
    if (company.mission_statement) {
      orgSchema.mission = company.mission_statement;
    }
    
    // ✅ FASE 1: Visão como slogan (SGE prioriza)
    if (company.vision_statement) {
      orgSchema.slogan = company.vision_statement;
    }
    
    // ✅ FASE 1: Tamanho da equipe
    if (company.team_size) {
      orgSchema.numberOfEmployees = {
        "@type": "QuantitativeValue",
        "value": company.team_size
      };
    }
    
    // ✅ FASE 1: Expertise expandido com company_culture, working_methodology, differentiators
    if (company.seo_technical_expertise) {
      const knowsAboutItems = [company.seo_technical_expertise];
      
      if (company.company_culture) {
        knowsAboutItems.push(company.company_culture);
      }
      
      if (company.working_methodology) {
        knowsAboutItems.push(company.working_methodology);
      }
      
      if (company.differentiators) {
        const diffs = company.differentiators.split(',').map((d: string) => d.trim()).filter(Boolean);
        knowsAboutItems.push(...diffs);
      }
      
      orgSchema.knowsAbout = knowsAboutItems.filter(Boolean);
    }
    
    schemas.push(orgSchema);
  }

  // 2. WebPage Schema
  schemas.push({
    '@type': 'WebPage',
    name: solution.title,
    description: solution.sales_pitch?.substring(0, 160) || solution.pain_description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl
  });

  // 3. ItemList Schema (produtos selecionados)
  if (products && products.length > 0) {
    schemas.push({
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          description: product.description || product.name,
          image: product.image_url,
          url: product.product_url || canonicalUrl
        }
      }))
    });
  }

  // 4. Product Schemas (detalhados)
  products.forEach(product => {
    const productSchema: any = {
      '@type': 'Product',
      name: product.name,
      description: product.description || product.name,
      image: product.image_url
    };

    if (product.brand) {
      productSchema.brand = { '@type': 'Brand', name: product.brand };
    }

    if (product.price) {
      productSchema.offers = {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
        url: product.product_url
      };
    }

    if (product.gtin) productSchema.gtin = product.gtin;
    if (product.mpn) productSchema.mpn = product.mpn;

    schemas.push(productSchema);
  });

  // 5. FAQPage Schema
  if (faqs && faqs.length > 0) {
    schemas.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    });
  }

  // 6. Review Schemas (success cases)
  successCases.forEach(testimonial => {
    if (testimonial.client_name && testimonial.result_achieved) {
      schemas.push({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: testimonial.client_name
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 5,
          bestRating: 5
        },
        reviewBody: testimonial.result_achieved
      });
    }
  });

  // 7. BreadcrumbList Schema
  schemas.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: company?.website || 'https://smartdent.com.br'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: solution.category || 'Soluções',
        item: `${company?.website || 'https://smartdent.com.br'}/solucoes`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: solution.title,
        item: canonicalUrl
      }
    ]
  });

  return schemas;
}

// ═══════════════════════════════════════════════════════════
// 🎨 GERADOR DE HTML DA LANDING PAGE
// ═══════════════════════════════════════════════════════════

// Função auxiliar para escape HTML
function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Função para gerar embed de vídeo
function generateVideoEmbed(url: string): string {
  if (!url) return '';
  
  // YouTube
  if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop()?.split('?')[0]
      : new URL(url).searchParams.get('v');
    
    if (!videoId) return '';
    
    return `
      <iframe 
        class="video-iframe"
        width="100%"
        height="100%"
        src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
        loading="lazy"
        title="Vídeo de Demonstração"
      ></iframe>
    `;
  }
  
  // Instagram
  if (url.includes('instagram.com')) {
    return `
      <div class="instagram-wrapper">
        <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin: 0 auto;">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver no Instagram</a>
        </blockquote>
        <script async src="//www.instagram.com/embed.js"></script>
      </div>
    `;
  }
  
  // TikTok
  if (url.includes('tiktok.com')) {
    const videoId = url.split('/video/')[1]?.split('?')[0] || url.split('/').pop();
    return `
      <div class="tiktok-wrapper">
        <blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="margin: 0 auto;">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver no TikTok</a>
        </blockquote>
        <script async src="https://www.tiktok.com/embed.js"></script>
      </div>
    `;
  }
  
  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('/').filter(Boolean).pop();
    if (!videoId) return '';
    
    return `
      <iframe 
        class="video-iframe"
        src="https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479" 
        width="100%"
        height="100%"
        frameborder="0" 
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write" 
        title="Vídeo de Demonstração"
        loading="lazy"
      ></iframe>
    `;
  }
  
  // Fallback: link direto
  return `
    <div class="video-fallback">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="video-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Assistir Vídeo</span>
      </a>
    </div>
  `;
}

/**
 * Enriquece keywords extraídas com benefits e features dos produtos
 */
function enrichKeywordsWithProductData(
  baseKeywords: string[],
  products: any[]
): string[] {
  const enrichedKeywords = [...baseKeywords];
  
  products.forEach(product => {
    // Adicionar top 3 benefits
    if (product.benefits && Array.isArray(product.benefits)) {
      const topBenefits = product.benefits.slice(0, 3);
      topBenefits.forEach((benefit: any) => {
        const benefitText = typeof benefit === 'string' 
          ? benefit 
          : benefit.title || benefit.text || '';
        
        if (benefitText && benefitText.length > 5) {
          enrichedKeywords.push(benefitText);
        }
      });
    }
    
    // Adicionar top 3 features
    if (product.features && Array.isArray(product.features)) {
      const topFeatures = product.features.slice(0, 3);
      topFeatures.forEach((feature: any) => {
        const featureText = typeof feature === 'string'
          ? feature
          : feature.title || feature.text || '';
        
        if (featureText && featureText.length > 5) {
          enrichedKeywords.push(featureText);
        }
      });
    }
  });
  
  // Remover duplicatas e limitar a 20 keywords
  return [...new Set(enrichedKeywords)]
    .filter(k => k && k.length > 0)
    .slice(0, 20);
}

// Função auxiliar para gerar o HTML da Landing Page com CSS padronizado
export function generateLandingPageHTML(
  solution: any, 
  products: any[], 
  company: any, 
  aiContent?: any,
  preview: boolean = false
): string {
  const mainProduct = products[0] || {};
  const successCases = solution.success_cases || [];
  const pain_metrics = solution.pain_metrics || {};
  const faqs = solution.faq || [];
  
  // ✅ Usar textos customizados ou gerados por IA
  const customText = solution.landing_page_custom_text || {};
  
  console.log('🎨 [HTML] CustomText recebido:', Object.keys(customText));
  console.log('🤖 [HTML] AI Content recebido:', aiContent ? Object.keys(aiContent) : 'nenhum');
  
  // ✅ TÍTULO HERO: SEMPRE ESTÁTICO (manual ou solution.title)
  const finalHeroTitle = customText.hero_title || solution.title;
  
  // ✅ SUBTÍTULO HERO: PRIORIDADE - customText (manual) > aiContent (IA) > default (sales_pitch)
  const finalHeroSubtitle = customText.hero_subtitle || aiContent?.hero?.subtitle || 
    (solution.sales_pitch ? solution.sales_pitch.substring(0, 120) + '...' : `Solução completa com ${products.map(p => p.name).join(', ')}`);
  
  // ✅ MÉTRICAS: IA ou defaults
  const finalMetricsTitle = customText.metrics_title || aiContent?.metrics?.title || 'Transformação Real em Clínicas';
  const finalMetricsSubtitle = customText.metrics_subtitle || aiContent?.metrics?.subtitle ||
    `Imagine sua clínica entregando resultados no mesmo dia, sem retrabalho e sem depender de laboratórios externos. Hoje, muitos perdem pacientes pela demora e complexidade. Com ${products.slice(0, 2).map(p => p.name).join(' e ')}, clínicas parceiras eliminam gargalos críticos e se tornam referência em agilidade e previsibilidade.`;
  
  // ✅ FAQ: sempre estático (não gerado por IA nesta função)
  const finalFaqTitle = customText.faq_title || 'Perguntas Frequentes';
  
  // ✅ CTA: IA ou defaults
  const finalCtaText = customText.cta_text || aiContent?.cta?.text || 'Fale agora com nossos especialistas e transforme sua clínica';
  const finalCtaButtonText = customText.cta_button_text || aiContent?.cta?.buttonText || 'SOLICITAR DEMONSTRAÇÃO E PREÇO';
  
  console.log('🎨 [HTML] Texto final do hero subtitle:', finalHeroSubtitle.substring(0, 100));
  console.log('🎨 [HTML] Texto final metrics title:', finalMetricsTitle);
  
  // ✅ FASE 3.1: Aplicar Intelligent Links nos textos SPIN
  const canonicalUrl = solution.custom_url?.url || 'https://smartdent.com.br';
  const intelligentLinks = buildIntelligentLinksMap(products, canonicalUrl);
  
  // Enriquecer textos com links inteligentes
  const enrichedHeroSubtitle = applyIntelligentLinks(finalHeroSubtitle, intelligentLinks);
  const enrichedMetricsSubtitle = applyIntelligentLinks(finalMetricsSubtitle, intelligentLinks);
  const enrichedSalesPitch = solution.sales_pitch ? applyIntelligentLinks(solution.sales_pitch, intelligentLinks) : '';
  const enrichedPainDescription = solution.pain_description ? applyIntelligentLinks(solution.pain_description, intelligentLinks) : '';
  
  console.log('🔗 [INTELLIGENT LINKS] Links aplicados:', Object.keys(intelligentLinks).length);
  
  // HERO IMAGE (prioridade CORRETA: manual > IA > NADA)
  let heroImageSrc = '';
  let heroImageAlt = 'Banner hero';

  // 1️⃣ PRIORIDADE MÁXIMA: Upload Manual
  if (solution.ai_generated_images?.hero_banner?.mode === 'manual_upload') {
    const manualUpload = solution.ai_generated_images.hero_banner.manual_upload;
    if (manualUpload?.src) {
      heroImageSrc = manualUpload.src;
      heroImageAlt = manualUpload.alt || 'Banner hero personalizado';
    }
  }

  // 2️⃣ SEGUNDA PRIORIDADE: Imagem Gerada por IA
  else if (solution.ai_generated_images?.hero_banner?.mode === 'ai_generated') {
    const aiGenerated = solution.ai_generated_images.hero_banner.ai_generated;
    if (aiGenerated?.src) {
      heroImageSrc = aiGenerated.src;
      heroImageAlt = `Banner hero - ${solution.title}`;
    }
  }

  // ❌ REMOVIDO: Fallbacks para produto e placeholder
  // Se não configurou banner (mode === null ou 'none'), heroImageSrc fica vazio


  // Formatação do tipo de dor como badge
  const painTypeLabels: Record<string, string> = {
    delivery_speed: 'Velocidade de Entrega',
    competitive_edge: 'Vantagem Competitiva',
    patient_loss: 'Retenção de Pacientes',
    training_fear: 'Capacitação Profissional',
    high_lab_costs: 'Redução de Custos',
    lab_dependency: 'Independência Operacional',
    financial_roi: 'Retorno Financeiro',
    quality_durability: 'Qualidade Premium'
  };
  const badge = painTypeLabels[solution.pain_type] || 'SOLUÇÃO ODONTOLÓGICA';

  // 🔍 DEBUG: Verificar dados da tabela de comparação
  console.log('🔍 [COMPARISON TABLE DEBUG]', {
    enabled: solution.competitor_comparison?.enabled,
    title: solution.competitor_comparison?.title,
    headers: solution.competitor_comparison?.table_headers,
    headersLength: solution.competitor_comparison?.table_headers?.length,
    data: solution.competitor_comparison?.table_data,
    dataLength: solution.competitor_comparison?.table_data?.length,
    firstRow: solution.competitor_comparison?.table_data?.[0],
    willRender: !!(solution.competitor_comparison?.enabled && 
                   solution.competitor_comparison.table_headers?.length > 0 && 
                   solution.competitor_comparison.table_data?.length > 0)
  });

  // Lista de chaves das métricas recomendadas (padrão do sistema)
  const RECOMMENDED_METRIC_KEYS = [
    'ROI',
    'patient_loss',
    'revenue_loss',
    'lab_time',
    'digital_time',
    'learning_curve',
    'satisfaction_rate',
    'production_capacity',
    'delivery_time'
  ];

  // ═══════════════════════════════════════════════════════════
  // 🎯 ESTRATÉGIA DE MÉTRICAS (CORRIGIDA):
  // 
  // 1. MÉTRICAS PERSONALIZADAS (NÃO na lista RECOMMENDED):
  //    - Enviadas para a IA no prompt
  //    - Usadas NO SUBTÍTULO da seção de métricas
  //    - Exibidas NOS CARDS ANIMADOS (top 3) ✅ CORRIGIDO
  //
  // 2. MÉTRICAS RECOMENDADAS (na lista RECOMMENDED):
  //    - Usadas APENAS no subtítulo da IA
  //    - NÃO aparecem nos cards animados
  //
  // Objetivo: Evitar repetição e maximizar uso de dados personalizados
  // ═══════════════════════════════════════════════════════════

  const allMetrics = Object.entries(pain_metrics);

  // 🎯 CLASSIFICAÇÃO POR ORIGEM (chave), NÃO POR FORMATO
  const recommendedMetrics = allMetrics.filter(([key]) => RECOMMENDED_METRIC_KEYS.includes(key));
  const customMetrics = allMetrics.filter(([key]) => !RECOMMENDED_METRIC_KEYS.includes(key));

  // 🎯 Cards animados: APENAS métricas personalizadas (top 3)
  const selectedMetrics = customMetrics.slice(0, 3);

  const metricsArray = selectedMetrics.map(([key, value]) => {
    let displayValue = value;
    let numericValue = 0;
    let label = key.replace(/_/g, ' ');
    
    // 🔥 FORMATO 1: Objeto { label, value, unit }
    if (typeof value === 'object' && value !== null && 'label' in value) {
      label = value.label;
      numericValue = parseFloat(value.value) || 0;
      displayValue = `${value.value}${value.unit || ''}`;
    }
    // 🔥 FORMATO 2: String com número ("12 meses", "R$ 1.800,00", "30%")
    else if (typeof value === 'string') {
      // Remover símbolos de moeda e separadores
      const cleanValue = value.replace(/[R$\s]/g, '').replace(/\./g, '');
      const match = cleanValue.match(/(\d+(?:,\d+)?)/);
      
      if (match) {
        numericValue = parseFloat(match[1].replace(',', '.'));
      }
      
      displayValue = value;
    }
    // 🔥 FORMATO 3: Número puro
    else if (typeof value === 'number') {
      numericValue = value;
      displayValue = value.toString();
    }
    
    return [key, displayValue, numericValue, label];
  });
  
  console.log('📊 [HTML] Métricas classificadas:', {
    total: allMetrics.length,
    recommended: recommendedMetrics.length,
    custom: customMetrics.length,
    selected_for_cards: selectedMetrics.map(([k]) => k)
  });
  console.log('📊 [HTML] Métricas processadas (com labels):', metricsArray);

  // Links institucionais do rodapé
  const institutionalLinks = company?.institutional_links || [];

  // SEO
  const seoTitle = `${solution.title} | ${company?.company_name || 'Smart Dent'}`;
  const seoDescription = enrichedHeroSubtitle.substring(0, 160).replace(/<[^>]*>/g, ''); // Remove HTML tags for meta
  const canonicalUrl = solution.custom_url?.url || `${company?.website || 'https://smartdent.com.br'}/solucoes/${solution.id}`;
  
  // Extrair keywords de múltiplas fontes
  const baseKeywords = [
    ...Object.keys(pain_metrics),
    ...(products.flatMap(p => p.keywords || [])),
    ...(products.flatMap(p => p.market_keywords || [])),
    ...(products.flatMap(p => p.search_intent_keywords || []))
  ]
    .filter((k, i, arr) => arr.indexOf(k) === i) // unique
    .map(k => typeof k === 'string' ? k : k.keyword || k.name || '')
    .filter(k => k.length > 0);

  // 🎯 ENRIQUECIMENTO: Adicionar benefits e features
  const extractedKeywords = enrichKeywordsWithProductData(baseKeywords, products);

  console.log(`✅ [KEYWORDS] Enriquecidas: base=${baseKeywords.length}, final=${extractedKeywords.length}`);

  // Gerar schemas consolidados
  const schemas = generateSPINSchemas(
    solution,
    products,
    company,
    faqs,
    successCases,
    canonicalUrl
  );

  // Consolidar schemas em @graph (Google recomenda)
  const consolidatedSchema = {
    '@context': 'https://schema.org',
    '@graph': schemas
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SEO BÁSICO -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="keywords" content="${escapeHtml(extractedKeywords.join(', '))}">
  <!-- Keywords enriquecidas com benefits e features dos produtos -->
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow'}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- OPEN GRAPH (Facebook, LinkedIn) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:image" content="${escapeHtml(heroImageSrc || company?.logo_url || '')}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escapeHtml(company?.company_name || 'Smart Dent')}">
  <meta property="og:locale" content="pt_BR">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- TWITTER CARDS -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${escapeHtml(heroImageSrc || company?.logo_url || '')}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- HREFLANG (Multi-domínio) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link rel="alternate" hreflang="pt-BR" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
  ${company?.usa_address ? `<link rel="alternate" hreflang="en-US" href="${escapeHtml(canonicalUrl.replace('.com.br', '.com'))}">` : ''}
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- RESOURCE HINTS (Performance) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  ${heroImageSrc ? `<link rel="preload" as="image" href="${escapeHtml(heroImageSrc)}" fetchpriority="high">` : ''}
  ${products[0]?.image_url ? `<link rel="preload" as="image" href="${escapeHtml(products[0].image_url)}">` : ''}
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SCHEMA.ORG JSON-LD (@graph consolidado) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <script type="application/ld+json">
${JSON.stringify(consolidatedSchema, null, 2)}
  </script>
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- FONTS & ICONS -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  
  ${!preview && company?.google_analytics_id ? `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- GOOGLE ANALYTICS -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(company.google_analytics_id)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${escapeHtml(company.google_analytics_id)}');
  </script>
  ` : ''}
  
  <style>
    /* ===== DESIGN SYSTEM GEMINI V4.5 ===== */
    :root {
      /* Cores do Logo Smart Dent */
      --primary-dark: #3E4B5E;
      --primary-gradient-dark: #1e293b;
      --cta-bg-color: #3E4B5E;
      --accent-tech: #EE7A3E;
      --accent-glow: #FF9B67;
      
      /* Cores de Uso Geral */
      --text-color: #333333;
      --muted: #64748b;
      --card-bg: #ffffff;
      --background-color: #f8fafc;
      --section-light-bg: #fdfdfd;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      scroll-behavior: smooth;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .section-padding {
      padding: 4rem 0;
    }

    h1, h2, h3 {
      color: var(--primary-dark);
      font-weight: 800;
      letter-spacing: -0.8px;
    }

    /* ===== HEADER COM MENU ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 0;
      position: relative;
      z-index: 10;
    }

    .banner {
      width: 180px;
      height: auto;
    }

    .main-nav a {
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin-left: 1.5rem;
      transition: color 0.2s;
    }

    .main-nav a:hover {
      color: var(--accent-tech);
    }

    /* ===== HERO IMAGE - MODERN GLOSSY ===== */
        .image1-container {
          position: relative;
          width: 100%;
          min-height: 400px;
          aspect-ratio: 16 / 9;
          background: #000000;
          overflow: hidden;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          margin-top: -1rem;
        }

        .image1-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 1;
        }

        .text-overlay {
          position: absolute;
          top: 50%;
          left: 7%;
          transform: translateY(-50%);
          max-width: 50%;
          background: rgba(62, 75, 94, 0.85);
          padding: 32px 40px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

    .text-overlay small {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-glow);
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(255, 155, 103, 0.3);
      border: 1px solid var(--accent-tech);
    }

    .text-overlay h1 {
      font-size: 48px;
      line-height: 1.1;
      font-weight: 900;
      color: white;
      margin: 16px 0;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
      background: none;
      -webkit-text-fill-color: unset;
    }

    .text-overlay p {
      font-size: 20px;
      line-height: 1.7;
      color: #e0e0e0;
      margin: 0;
      font-weight: 500;
    }

    /* ===== SEÇÃO DE DEPOIMENTOS - CARROSSEL ===== */
    .testimonials-section {
      background: var(--section-light-bg);
      padding: 4rem 0;
      border-top: 1px solid #eee;
    }

    .testimonials-section h2 {
      font-size: 32px;
      margin-bottom: 3rem;
      text-align: center;
    }

    /* ===== ANIMAÇÃO INFINITE SCROLL (MARQUEE CONTÍNUO) ===== */
    @keyframes infinite-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .testimonials-carousel {
      display: flex;
      overflow: hidden; /* ✅ hidden ao invés de auto */
      gap: 1.5rem;
      padding: 0 0 1.5rem;
      width: 100%;
      margin: 0 auto;
      position: relative;
    }

    .testimonials-track {
      display: flex;
      gap: 1.5rem;
      animation: infinite-scroll 30s linear infinite; /* ✅ NOVA ANIMAÇÃO */
      will-change: transform;
    }

    .testimonials-track:hover {
      animation-play-state: paused; /* ✅ PAUSAR AO HOVER */
    }

    .testimonial-card {
      background: var(--card-bg);
      min-width: 320px;
      max-width: 380px;
      height: auto;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      scroll-snap-align: center;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .rating {
      color: var(--accent-tech);
      font-size: 16px;
      margin-bottom: 0.75rem;
    }

    .rating i {
      margin-right: 2px;
    }

    .testimonial-card p {
      font-size: 16px;
      line-height: 1.5;
      color: var(--text-color);
      margin-bottom: 1.5rem;
      font-style: italic;
    }

    .profile-info {
      display: flex;
      align-items: center;
      margin-top: auto;
    }

    .profile-info img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 1rem;
      border: 2px solid var(--accent-tech);
    }

    .details strong {
      display: block;
      font-size: 16px;
      color: var(--primary-dark);
      font-weight: 700;
    }

    .details small {
      display: block;
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }

    .instagram-link {
      margin-left: auto;
      color: var(--accent-tech);
      font-size: 14px;
      text-decoration: none;
      display: flex;
      align-items: center;
      font-weight: 600;
    }

    .instagram-link i {
      margin-left: 0.4rem;
      font-size: 18px;
    }

    /* ===== NARRATIVA SPIN CONTEXTUAL ===== */
    .spin-context {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 3rem 2rem;
      border-radius: 12px;
      text-align: center;
    }

    .spin-narrative {
      font-size: 1.15rem;
      line-height: 1.9;
      color: #495057;
      text-align: justify;
      max-width: 900px;
      margin: 0 auto;
      font-weight: 400;
    }

    .spin-narrative strong {
      color: #007bff;
      font-weight: 600;
    }

    /* ===== SEÇÃO DE MÉTRICAS ===== */
    .metrics-section {
      text-align: center;
      background: var(--section-light-bg);
      padding: 4rem 0;
      border-bottom: 1px solid #eee;
    }

    .metrics-section h2 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .metrics-section > p {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .metrics-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1000px;
      margin: 0 auto;
      padding: 0;
    }

    .metric-card {
      background: var(--card-bg);
      height: 250px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 12px;
      text-align: center;
      flex-direction: column;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e0e0e0;
      transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
      padding: 2rem;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 0 20px var(--accent-glow);
      border-color: var(--accent-tech);
    }

    .metrics-cards > div:first-child {
      background: linear-gradient(135deg, var(--primary-dark) 0%, #2a3442 100%);
      border: 1px solid var(--accent-tech);
      box-shadow: 0 0 40px rgba(238, 122, 62, 0.4), 0 15px 50px rgba(0, 0, 0, 0.4);
    }

    .metrics-cards > div:first-child .count {
      color: var(--accent-glow);
      text-shadow: 0 0 15px rgba(255, 155, 103, 0.8);
    }

    .metrics-cards > div:first-child span {
      color: #f0f0f0;
    }

    .metric-card .count {
      font-family: 'Montserrat', sans-serif;
      font-size: 64px;
      font-weight: 900;
      color: var(--accent-tech);
      display: block;
      margin-bottom: 4px;
      line-height: 1;
    }

    .metric-card .count {
      display: inline-flex;
      align-items: flex-start;
      line-height: 1;
      margin-bottom: 4px;
    }

    .metric-card .count .number {
      font-size: 64px;
      font-weight: 900;
      color: var(--accent-tech);
    }

    .metric-card .count .unit {
      font-size: 28px;
      font-weight: 600;
      color: var(--accent-tech);
      margin-left: 4px;
      opacity: 0.9;
      line-height: 1.1;
      vertical-align: super;
    }

    .metric-card span:not(.count):not(.number):not(.unit) {
      font-size: 16px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    /* ===== TABELA DE COMPARAÇÃO COM CONCORRENTES ===== */
    .comparison-section {
      text-align: center;
      padding: 4rem 0;
      background: var(--section-light-bg);
    }

    .comparison-section h2 {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 1rem;
      color: var(--primary-dark);
    }

    .comparison-section .subtitle {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
      font-weight: 500;
    }

    .desktop-table {
      max-width: 1100px;
      margin: 0 auto;
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }

    .desktop-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .desktop-table thead {
      background: linear-gradient(135deg, var(--primary-dark) 0%, #2a3442 100%);
    }

    .desktop-table th {
      padding: 1.5rem 1rem;
      text-align: left;
      font-weight: 700;
      font-size: 16px;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 3px solid var(--accent-tech);
    }

    .desktop-table th:first-child {
      border-top-left-radius: 12px;
    }

    .desktop-table th:last-child {
      border-top-right-radius: 12px;
    }

    .desktop-table td {
      padding: 1.25rem 1rem;
      text-align: left;
      font-size: 15px;
      color: var(--text-color);
      border-bottom: 1px solid #e8e8e8;
      transition: background 0.2s;
    }

    .desktop-table tbody tr:hover {
      background: #f8f9fa;
    }

    .desktop-table tbody tr:last-child td {
      border-bottom: none;
    }

    /* Destaque para a coluna "Nossa Solução" (segunda coluna) */
    .desktop-table td:nth-child(2) {
      background: linear-gradient(135deg, rgba(238, 122, 62, 0.08) 0%, rgba(255, 155, 103, 0.05) 100%);
      font-weight: 600;
      color: var(--primary-dark);
    }

    .desktop-table tbody tr:hover td:nth-child(2) {
      background: linear-gradient(135deg, rgba(238, 122, 62, 0.12) 0%, rgba(255, 155, 103, 0.08) 100%);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .desktop-table {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .desktop-table table {
        min-width: 600px;
      }

      .desktop-table th,
      .desktop-table td {
        padding: 1rem 0.75rem;
        font-size: 14px;
      }
    }

    /* ===== FAQ - ESTILO GEMINI ===== */
    .faq {
      text-align: center;
      padding: 4rem 0;
      background: var(--section-light-bg);
    }

    .faq h3 {
      font-size: 32px;
      margin-bottom: 3rem;
    }

    .faq details {
      background: var(--card-bg);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid #e2e8f0;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
      text-align: left;
    }

    .faq details[open] {
      background: #fefefe;
      border-color: var(--accent-tech);
      box-shadow: 0 8px 25px rgba(238, 122, 62, 0.1);
    }

    .faq summary {
      font-weight: 700;
      font-size: 18px;
      color: var(--primary-dark);
      cursor: pointer;
      list-style: none;
      user-select: none;
      transition: color 0.2s;
    }

    .faq summary:hover {
      color: var(--accent-tech);
    }

    .faq summary::-webkit-details-marker {
      display: none;
    }

    .faq summary::before {
      content: "▶";
      display: inline-block;
      margin-right: 12px;
      font-size: 12px;
      color: var(--accent-tech);
      font-weight: 900;
      transition: transform 0.2s, color 0.2s;
    }

    .faq details[open] summary::before {
      transform: rotate(90deg);
    }

    .faq details p {
      font-size: 16px;
      line-height: 1.7;
      color: var(--text-color);
      padding-top: 1rem;
      border-top: 1px dashed #e2e8f0;
      margin-top: 1rem;
    }

    /* ===== SEÇÃO DE VÍDEO DE DEMONSTRAÇÃO ===== */
    .video-demo-section {
      text-align: center;
      padding: 4rem 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 20px;
      margin-bottom: 3rem;
    }

    .video-container {
      position: relative;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .video-container:hover {
      transform: translateY(-5px);
      box-shadow: 0 25px 80px rgba(0,0,0,0.3) !important;
    }

    .video-iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
    }

    .instagram-wrapper,
    .tiktok-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 500px;
    }

    .instagram-media,
    .tiktok-embed {
      max-width: 540px !important;
      width: 100% !important;
      margin: 0 auto !important;
    }

    .video-fallback {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 4rem 2rem;
      background: #f8f9fa;
      border-radius: 16px;
      border: 3px dashed #dee2e6;
      min-height: 300px;
    }

    .video-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 24px;
      color: #EE7A3E;
      text-decoration: none;
      font-weight: 700;
      padding: 1.5rem 3rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }

    .video-link:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      text-decoration: none;
      color: #d66a30;
    }

    .video-link svg {
      flex-shrink: 0;
    }

    .video-caption {
      margin-top: 1.5rem;
      font-size: 18px;
      color: #6b7280;
      font-style: italic;
      text-align: center;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }

    /* Responsivo - Vídeo */
    @media (max-width: 768px) {
      .video-demo-section {
        padding: 3rem 1rem;
      }
      
      .video-demo-section .section-title {
        font-size: 28px !important;
      }
      
      .video-container {
        aspect-ratio: 16/10 !important;
        border-radius: 12px !important;
      }
      
      .video-caption {
        font-size: 16px !important;
        padding: 0 1rem;
      }
      
      .instagram-wrapper,
      .tiktok-wrapper {
        min-height: 400px;
      }
    }

    .faq details p * {
      all: unset;
      display: inline;
    }

    .biocompatible-note {
      margin-top: 1.5rem;
      padding: 1rem;
      border-left: 4px solid var(--accent-tech);
      background: #fffaf5;
      font-style: italic;
      color: var(--primary-dark);
      font-weight: 600;
      border-radius: 4px;
    }

    /* ===== CTA - GRADIENTE GEMINI ===== */
    .cta {
      text-align: center;
      padding: 4rem 0;
      background: linear-gradient(135deg, var(--accent-tech) 0%, var(--accent-glow) 100%);
      color: white;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.1);
    }

    .cta p {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 2rem;
      line-height: 1.3;
      color: white;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.3);
    }

    .cta button {
      background: linear-gradient(to top, var(--primary-dark), #4a5c73);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 22px;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), inset 0 2px 5px rgba(255,255,255,0.2);
      transition: all 0.1s ease;
    }

    .cta button:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255,255,255,0.3);
    }

    .sticky-cta {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 10px 20px;
      background: var(--primary-dark);
      color: white;
      box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      text-align: center;
    }

    .sticky-cta button {
      width: 90%;
      padding: 14px 20px;
      font-size: 18px;
      background: var(--accent-tech);
      color: white;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    /* ===== FOOTER - CORES DO LOGO ===== */
    footer {
      background: linear-gradient(to bottom, var(--primary-dark), var(--primary-gradient-dark));
      padding: 3rem 0 2rem;
    }

    .footer-columns {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 2rem;
    }

    .footer-columns > div {
      flex: 1;
      min-width: 250px;
    }

    .footer-columns strong {
      font-weight: 700;
      display: block;
      margin-bottom: 0.75rem;
      font-size: 18px;
      color: var(--accent-glow);
    }

    .footer-columns p {
      font-size: 15px;
      line-height: 1.8;
      margin: 0.5rem 0;
      color: #ccc;
    }

    .footer-columns a {
      color: #b0c4de;
      text-decoration: none;
      font-size: 15px;
      display: block;
      margin: 0.6rem 0;
      transition: color 0.2s;
    }

    .footer-columns a:hover {
      color: var(--accent-tech);
      text-decoration: underline;
    }

    /* ===== RESPONSIVO TABLET ===== */
    @media screen and (max-width: 1024px) {
      .text-overlay {
        max-width: 65%;
        padding: 28px 32px;
      }
      .text-overlay h1 {
        font-size: 38px;
      }
      .image1-container {
        aspect-ratio: 4 / 3;
      }
    }

    /* ===== RESPONSIVO MOBILE ===== */
    @media screen and (max-width: 768px) {
      .main-nav {
        display: none;
      }
      .header {
        justify-content: center;
      }

      .image1-container {
        min-height: 300px;
        border-radius: 0;
        aspect-ratio: unset;
      }
      
      .text-overlay {
        position: static;
        transform: none;
        max-width: 100%;
        padding: 24px;
        border-radius: 0;
        box-shadow: none;
        border: none;
        background: var(--primary-dark);
        backdrop-filter: none;
      }

      .text-overlay h1 {
        font-size: 30px;
        margin-top: 0;
        color: white;
      }
      
      .text-overlay p {
        color: #e0e0e0;
      }
      
      .metrics-section {
        padding: 3rem 0;
      }
      
      .cta {
        padding: 3rem 0;
      }
      
      .cta p {
        font-size: 22px;
        margin-bottom: 1.5rem;
      }
      
      .faq {
        padding: 3rem 0;
      }
      
      .testimonials-section {
        padding: 3rem 0;
      }

      /* MANTÉM OS 3 CARDS DE MÉTRICAS EM LINHA */
      .metrics-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        padding: 0 0.75rem;
      }
      
      .metric-card {
        min-width: unset;
        height: auto;
        min-height: 180px;
        padding: 1rem 0.75rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
      }
      
      .metric-card .count .number {
        font-size: 48px;
      }
      
      .metric-card .count .unit {
        font-size: 21px;
        margin-left: 2px;
      }
      
      .metric-card span:not(.count):not(.number):not(.unit) {
        font-size: 13px;
        line-height: 1.2;
        min-height: 35px;
        text-align: center;
        word-break: normal;
        overflow-wrap: break-word;
        hyphens: auto;
        display: block;
        width: 100%;
      }

      /* Carrossel de Depoimentos Mobile */
      .testimonials-carousel {
        overflow-x: auto; /* ✅ SCROLL MANUAL NO MOBILE */
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding: 0 1.5rem 1rem;
        gap: 1rem;
      }
      
      .testimonials-track {
        animation: none; /* ✅ DESABILITAR ANIMAÇÃO NO MOBILE */
      }
      
      .testimonial-card {
        min-width: 85vw;
        height: auto;
        scroll-snap-align: start;
      }

      .sticky-cta {
        display: block;
      }
      
      .cta .container {
        display: none;
      }
      
      .footer-columns {
        flex-direction: column;
        gap: 2rem;
      }
    }

    /* ===== HERO SEM IMAGEM (texto em fundo sólido) ===== */
    .hero-text-only {
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-gradient-dark) 100%);
      padding: 4rem 2rem;
      text-align: center;
      color: white;
    }

    .hero-text-only small {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-glow);
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(255, 155, 103, 0.3);
      border: 1px solid var(--accent-tech);
    }

    .hero-text-only h1 {
      font-size: 48px;
      line-height: 1.2;
      font-weight: 900;
      color: white;
      margin: 16px 0;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
    }

    .hero-text-only p {
      font-size: 20px;
      line-height: 1.7;
      color: #e0e0e0;
      margin: 0;
      max-width: 700px;
      margin: 0 auto;
      font-weight: 500;
    }
  </style>
</head>
<body>
  ${!preview && company?.google_tag_manager_id ? `
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeHtml(company.google_tag_manager_id)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  ` : ''}
  
  <!-- Header com Logo e Menu -->
  <div class="container">
    <div class="header">
      <img src="${escapeHtml(company?.logo_url || 'https://via.placeholder.com/150x50?text=Logo')}" alt="Logo ${escapeHtml(company?.company_name || 'Empresa')}" class="banner" width="180" height="60" loading="eager">
      <nav class="main-nav">
        <a href="https://loja.smartdent.com.br/">Loja</a>
        <a href="https://parametros.smartdent.com.br/base-conhecimento">Blog</a>
        <a href="https://api.whatsapp.com/send/?phone=5516993831794&text=Ol%C3%A1+Smart+Dent%2C+gostaria+de+mais+informa%C3%A7%C3%B5es" target="_blank">Fale conosco</a>
      </nav>
    </div>
  </div>

  <!-- Hero Image com Texto Sobreposto -->
  <div class="container">
    ${heroImageSrc ? `
    <!-- Hero com imagem de fundo -->
    <div class="image1-container">
      <img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(heroImageAlt)}" width="1200" height="675" loading="eager" fetchpriority="high">
      <div class="text-overlay">
        <small><i class="fas fa-microchip"></i> ${escapeHtml(badge)}</small>
        <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
        <p data-editable="true" data-field="hero_subtitle">${enrichedHeroSubtitle}</p>
      </div>
    </div>
    ` : `
    <!-- Hero sem imagem (apenas texto em fundo sólido) -->
    <div class="hero-text-only">
      <small><i class="fas fa-microchip"></i> ${escapeHtml(badge)}</small>
      <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
      <p data-editable="true" data-field="hero_subtitle">${enrichedHeroSubtitle}</p>
    </div>
    `}
    </div>
  </div>

  ${aiContent?.spinNarrative ? `
  <!-- Contexto Narrativo SPIN -->
  <div class="container section-padding">
    <section class="spin-context">
      <p class="spin-narrative" data-editable="true" data-field="spin_narrative">
        ${escapeHtml(aiContent.spinNarrative)}
      </p>
    </section>
  </div>
  ` : ''}

  ${solution.selected_video_url ? `
  <!-- ========== SEÇÃO DE VÍDEO DE DEMONSTRAÇÃO ========== -->
  <div class="container section-padding" style="padding-top: 3rem; padding-bottom: 3rem;">
    <section class="video-demo-section">
      <h2 class="section-title" data-editable="true" data-field="video_demo_title" style="font-size: 36px; font-weight: 800; text-align: center; margin-bottom: 2rem; color: var(--primary-dark);">
        ${escapeHtml(customText.video_demo_title || '🎬 Veja Como Funciona na Prática')}
      </h2>
      
      <div class="video-container" style="max-width: 1000px; margin: 0 auto; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); background: #000;">
        ${generateVideoEmbed(solution.selected_video_url)}
      </div>
    </section>
  </div>
  ` : ''}

  ${metricsArray.length > 0 ? `
  <!-- Seção de Métricas -->
  <div class="container section-padding">
    <section class="metrics-section">
      <h2 data-editable="true" data-field="metrics_title">${escapeHtml(finalMetricsTitle)}</h2>
      <p data-editable="true" data-field="metrics_subtitle">${enrichedMetricsSubtitle}</p>
      <div class="metrics-cards" id="metrics-counter">
        ${metricsArray.map(([key, displayValue, numericValue, label]) => {
          // 🔥 Aplicar edições do customText aos rótulos das métricas
          const labelKey = `metric_label_${key}`;
          const finalLabel = (customText && customText[labelKey]) || label;
          
          // 🔥 Extrair unidade de medida do displayValue
          const unit = String(displayValue).replace(/[\d\.,\s]+/g, '').trim();
          
          return `
          <div class="metric-card">
            <span class="count" data-target="${numericValue || 0}" data-unit="${unit}">
              <span class="number">0</span><span class="unit">${escapeHtml(unit)}</span>
            </span>
            <span data-editable="true" data-field="metric_label_${escapeHtml(key)}">${escapeHtml(finalLabel)}</span>
          </div>
        `}).join('')}
      </div>
    </section>
  </div>
  ` : ''}

  ${solution.competitor_comparison?.enabled && solution.competitor_comparison.table_headers?.length > 0 && solution.competitor_comparison.table_data?.length > 0 ? `
  <!-- ========== SEÇÃO: TABELA DE COMPARAÇÃO COM CONCORRENTES ========== -->
  <div class="container section-padding">
    <section class="comparison-section">
      <h2 data-editable="true" data-field="comparison_title">${escapeHtml(solution.competitor_comparison.title || 'Por que escolher nossa solução?')}</h2>
      ${solution.competitor_comparison.subtitle ? `<p class="subtitle" data-editable="true" data-field="comparison_subtitle">${escapeHtml(solution.competitor_comparison.subtitle)}</p>` : ''}
      
      <div class="desktop-table">
        <table>
          <thead>
            <tr>
              ${solution.competitor_comparison.table_headers.map((header: string, index: number) => `
                <th data-editable="true" data-field="comparison_header_${index}">${escapeHtml(header)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${solution.competitor_comparison.table_data.map((row: any, rowIndex: number) => `
              <tr>
                ${solution.competitor_comparison.table_headers.map((header: string, colIndex: number) => {
                  const cellValue = row[header];
                  const displayValue = (cellValue !== undefined && cellValue !== null && cellValue !== '') 
                    ? cellValue 
                    : '-';
                  
                  console.log(`🔍 Cell [${rowIndex}, ${colIndex}] header="${header}" value="${cellValue}" display="${displayValue}"`);
                  
                  return `<td data-editable="true" data-field="comparison_cell_${rowIndex}_${colIndex}">${escapeHtml(displayValue)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  </div>
  ` : ''}

  ${faqs.length > 0 ? `
  <!-- Seção de FAQs (Acordeão) -->
  <div class="container">
    <section class="faq">
      <h3 data-editable="true" data-field="faq_title">${escapeHtml(finalFaqTitle)}</h3>
      ${(() => {
        // 🔥 Mudança 2B: Aplicar edições do customText à FAQ
        const effectiveFaqs = faqs.map((faq: any, index: number) => ({
          question: (customText && customText[`faq_question_${index}`]) || faq.question,
          answer: (customText && customText[`faq_answer_${index}`]) || faq.answer
        }));
        
        return effectiveFaqs.map((faq: any, index: number) => `
        <details>
          <summary data-editable="true" data-field="faq_question_${index}"><i class="fas fa-chart-line"></i> ${escapeHtml(faq.question)}</summary>
          <p data-editable="true" data-field="faq_answer_${index}">${escapeHtml(faq.answer)}</p>
        </details>
      `).join('');
      })()}
    </section>
  </div>
  ` : ''}

  ${successCases.length > 0 ? `
  <!-- Seção de Depoimentos com Carrossel -->
  <section class="testimonials-section">
    <div class="container">
      <h2>O que nossos clientes dizem sobre a Solução</h2>
      <div class="testimonials-carousel">
        <div class="testimonials-track">
          ${(() => {
            const testimonials = aiContent?.testimonials || successCases;
            // ✅ DUPLICAR ARRAY para efeito seamless (igual InfinitePartnersCarousel)
            const duplicatedTestimonials = [...testimonials, ...testimonials];
            
            return duplicatedTestimonials.map((testimonial, idx) => {
              const originalIndex = idx % testimonials.length;
              const originalCase = successCases[originalIndex] || {};
              const quote = testimonial.quote || originalCase.result_achieved || 'Resultado não especificado';
              const clientName = testimonial.clientName || originalCase.client_name;
              const clientPhoto = originalCase.client_photo;
              
              return `
                <div class="testimonial-card">
                  <div class="rating">
                    <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                  </div>
                  <p>"${escapeHtml(quote)}"</p>
                  <div class="profile-info">
                    ${clientPhoto?.src 
                      ? `<img src="${escapeHtml(clientPhoto.src)}" alt="${escapeHtml(clientName)}" width="60" height="60" loading="lazy">` 
                      : `<img src="https://via.placeholder.com/80/${escapeHtml(company?.primary_color?.replace('#', '') || '3E4B5E')}/FFFFFF?text=${escapeHtml(clientName?.charAt(0) || '?')}" alt="${escapeHtml(clientName)}" width="60" height="60" loading="lazy">`
                    }
                    <div class="details">
                      <strong>${escapeHtml(clientName)}</strong>
                      <small>${escapeHtml(originalCase.specialty || 'Cliente')}${originalCase.city ? ' | ' + escapeHtml(originalCase.city) + '/' + escapeHtml(originalCase.state) : ''}</small>
                    </div>
                    ${originalCase.instagram 
                      ? `<a href="https://instagram.com/${escapeHtml(originalCase.instagram.replace('@', ''))}" target="_blank" class="instagram-link">
                           <i class="fab fa-instagram"></i>
                         </a>` 
                      : ''
                    }
                  </div>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  <!-- Sticky CTA Mobile -->
  <div class="sticky-cta">
    <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
      <i class="fas fa-bolt"></i> FALE CONOSCO E ACELERE SUA CLÍNICA
    </button>
  </div>

  <!-- Call to Action -->
  <div class="container">
    <section class="cta">
      <p data-editable="true" data-field="cta_text">${escapeHtml(finalCtaText)}</p>
      <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
        <i class="fas fa-comment-alt"></i> ${escapeHtml(finalCtaButtonText)}
      </button>
    </section>
  </div>

  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-columns">
        <div>
          <strong>${escapeHtml(company?.company_name || 'Empresa')} - Brasil</strong>
          <p><i class="fas fa-phone"></i> Atendimento: ${escapeHtml(company?.phone_number || '')}</p>
          <p><i class="fas fa-envelope"></i> Comercial: ${escapeHtml(company?.email || '')}</p>
          <p>${escapeHtml(company?.street_address || '')}, ${escapeHtml(company?.address_number || '')}</p>
          <p>${escapeHtml(company?.city || '')} - ${escapeHtml(company?.state || '')}, ${escapeHtml(company?.postal_code || '')}</p>
        </div>
        ${company?.usa_address ? `
        <div>
          <strong>${escapeHtml(company?.company_name || 'Empresa')} - USA</strong>
          <p>${escapeHtml(company.usa_address)}</p>
        </div>
        ` : ''}
        ${institutionalLinks.length > 0 ? `
        <div>
          <strong>Links Úteis</strong>
          ${institutionalLinks.slice(0, 5).map((link: any) => `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>
  </footer>

  <!-- Script para Contador Animado de Métricas -->
  <script>
    const counters = document.querySelectorAll('.count');
    const metricsSection = document.getElementById('metrics-counter');
    let hasCounted = false;

    function startCounter(counter) {
      const target = +counter.getAttribute('data-target');
      const numberEl = counter.querySelector('.number');
      const duration = 2000;
      let startTimestamp = null;

      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = timestamp - startTimestamp;
        const currentCount = Math.min(Math.floor(progress / duration * target), target);
        
        if (numberEl) numberEl.textContent = String(currentCount);

        if (progress < duration) {
          window.requestAnimationFrame(step);
        } else {
          if (numberEl) numberEl.textContent = String(target);
        }
      };

      window.requestAnimationFrame(step);
    }
    
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasCounted) {
          counters.forEach(startCounter);
          hasCounted = true;
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    if (metricsSection) {
      observer.observe(metricsSection);
    }
  </script>
</body>
</html>`;
}

