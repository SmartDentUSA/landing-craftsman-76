import type { LandingPageWithCompletion } from '@/hooks/useLandingPageCompletion';

export interface LandingPageConfigStatus {
  basic: {
    name: boolean;
    status: boolean;
    template: boolean;
    recent_update: boolean;
    has_products: boolean;
    has_blog: boolean;
    has_embed: boolean;
  };
  banner: {
    title: boolean;
    subtitle: boolean;
    badge: boolean;
    cta_primary_label: boolean;
    cta_primary_href: boolean;
    cta_secondary_label: boolean;
    cta_secondary_href: boolean;
    images_count: boolean;
    images_alt: boolean;
  };
  seo: {
    title_length: boolean;
    description_length: boolean;
    canonical_url: boolean;
    keywords_count: boolean;
    og_title: boolean;
    og_description: boolean;
    og_image: boolean;
    twitter_title: boolean;
    twitter_description: boolean;
    twitter_image: boolean;
    schema_org: boolean;
    robots_meta: boolean;
  };
  video: {
    selected: boolean;
    valid_url: boolean;
    title: boolean;
    description: boolean;
  };
  solutions: {
    count_min: boolean;
    all_titles: boolean;
    all_texts: boolean;
    all_images: boolean;
    display_order: boolean;
  };
  desktop_info: {
    title: boolean;
    text_length: boolean;
    has_table: boolean;
    table_headers: boolean;
    visibility: boolean;
  };
  advisory: {
    title: boolean;
    paragraph: boolean;
    image: boolean;
    cta: boolean;
    visibility: boolean;
  };
  faq: {
    title: boolean;
    count_min: boolean;
    has_schema: boolean;
    visibility: boolean;
  };
  cta_final: {
    title: boolean;
    paragraph: boolean;
    primary_configured: boolean;
    secondary_configured: boolean;
  };
  footer: {
    institutional_links: boolean;
    policy_links: boolean;
    legal_name: boolean;
  };
  email: {
    subject: boolean;
    main_title: boolean;
    primary_cta: boolean;
    image: boolean;
    address: boolean;
    unsubscribe_link: boolean;
    logo: boolean;
  };
  resources: {
    offers_configured: boolean;
    prices_availability: boolean;
    offer_urls: boolean;
  };
}

export function detectLandingPageConfiguration(
  lp: LandingPageWithCompletion
): LandingPageConfigStatus {
  const data = lp.data || {};
  const banner = data.banner || {};
  const seo = data.seo || {};
  const video = data.explanatory_video_section || {};
  const solutions = data.solutions || [];
  const desktop = data.desktop_info || {};
  const advisory = data.advisory || {};
  const faq = data.faq || [];
  const ctaFinal = data.cta_final || {};
  const footer = data.footer || {};
  const email = data.email || {};
  const schema = data.schema || {};
  const brand = data.brand || {};

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(lp.last_modified).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    basic: {
      name: !!lp.name && lp.name.trim().length > 0,
      status: !!lp.status,
      template: !!lp.template,
      recent_update: daysSinceUpdate <= 30,
      has_products: (lp.selected_product_ids?.length || 0) > 0,
      has_blog: !!lp.blog_generated,
      has_embed: !!lp.embed && lp.embed.trim().length > 0,
    },
    banner: {
      title: !!banner.title && banner.title.length > 0,
      subtitle: !!banner.subtitle && banner.subtitle.length > 0,
      badge: !!banner.badge_text && banner.badge_text.length > 0,
      cta_primary_label: !!banner.cta_primary?.label,
      cta_primary_href: !!banner.cta_primary?.href,
      cta_secondary_label: !!banner.cta_secondary?.label,
      cta_secondary_href: !!banner.cta_secondary?.href,
      images_count: Array.isArray(banner.images) && banner.images.length >= 2,
      images_alt: Array.isArray(banner.images) && 
        banner.images.length > 0 &&
        banner.images.every((img: any) => img.alt && img.alt.length > 0),
    },
    seo: {
      title_length: !!seo.seo_title && 
        seo.seo_title.length >= 50 && 
        seo.seo_title.length <= 60,
      description_length: !!seo.seo_description && 
        seo.seo_description.length >= 150 && 
        seo.seo_description.length <= 160,
      canonical_url: !!seo.canonical_url && seo.canonical_url.startsWith('http'),
      keywords_count: Array.isArray(seo.keywords) && seo.keywords.length >= 3,
      og_title: !!seo.open_graph?.og_title,
      og_description: !!seo.open_graph?.og_description,
      og_image: !!seo.open_graph?.og_image,
      twitter_title: !!seo.twitter_card?.twitter_title,
      twitter_description: !!seo.twitter_card?.twitter_description,
      twitter_image: !!seo.twitter_card?.twitter_image,
      schema_org: !!schema && Object.keys(schema).length > 0,
      robots_meta: !!seo.robots_meta,
    },
    video: {
      selected: !!video.selected_video,
      valid_url: !!video.selected_video?.url && 
        (video.selected_video.url.includes('youtube.com') || 
         video.selected_video.url.includes('youtu.be')),
      title: !!video.selected_video?.title,
      description: !!video.selected_video?.description,
    },
    solutions: {
      count_min: Array.isArray(solutions) && solutions.length >= 3,
      all_titles: Array.isArray(solutions) && solutions.length > 0 &&
        solutions.every((s: any) => s.title && s.title.length > 0),
      all_texts: Array.isArray(solutions) && solutions.length > 0 &&
        solutions.every((s: any) => s.text && s.text.length > 0),
      all_images: Array.isArray(solutions) && solutions.length > 0 &&
        solutions.every((s: any) => s.image && s.image.src),
      display_order: Array.isArray(solutions) && solutions.length > 0 &&
        solutions.every((s: any) => typeof s.order === 'number'),
    },
    desktop_info: {
      title: !!desktop.title && desktop.title.length > 0,
      text_length: !!desktop.text && desktop.text.length >= 100,
      has_table: desktop.show_table === true && 
        Array.isArray(desktop.table_data) && 
        desktop.table_data.length > 0,
      table_headers: Array.isArray(desktop.table_headers) && 
        desktop.table_headers.length > 0,
      visibility: desktop.visible_desktop === true || desktop.visible_mobile === true,
    },
    advisory: {
      title: !!advisory.title && advisory.title.length > 0,
      paragraph: !!advisory.paragraph && advisory.paragraph.length > 0,
      image: !!advisory.image?.src,
      cta: !!advisory.cta?.label && !!advisory.cta?.href,
      visibility: advisory.visible_desktop === true || advisory.visible_mobile === true,
    },
    faq: {
      title: !!data.faq_title && data.faq_title.length > 0,
      count_min: Array.isArray(faq) && faq.length >= 5,
      has_schema: !!schema.faq_enabled || 
        (Array.isArray(schema.faq_items) && schema.faq_items.length > 0),
      visibility: data.faq_section?.visible_desktop === true || 
        data.faq_section?.visible_mobile === true,
    },
    cta_final: {
      title: !!ctaFinal.title && ctaFinal.title.length > 0,
      paragraph: !!ctaFinal.paragraph && ctaFinal.paragraph.length > 0,
      primary_configured: !!ctaFinal.primary?.label && !!ctaFinal.primary?.href,
      secondary_configured: !!ctaFinal.secondary?.label && !!ctaFinal.secondary?.href,
    },
    footer: {
      institutional_links: Array.isArray(footer.links) && footer.links.length > 0,
      policy_links: !!brand.policies && 
        (!!brand.policies.privacy_url || !!brand.policies.terms_url),
      legal_name: !!brand.legal_name && brand.legal_name.length > 0,
    },
    email: {
      subject: !!email.assunto_email && email.assunto_email.length > 0,
      main_title: !!email.titulo_principal && email.titulo_principal.length > 0,
      primary_cta: !!email.cta_label && !!email.cta_href,
      image: !!email.imagem_src?.src,
      address: !!email.endereco_completo && email.endereco_completo.length > 0,
      unsubscribe_link: !!email.link_descadastro,
      logo: !!email.logo_src?.src,
    },
    resources: {
      offers_configured: !!schema.offers && 
        Array.isArray(schema.offers) && 
        schema.offers.length > 0,
      prices_availability: !!schema.offers && 
        Array.isArray(schema.offers) &&
        schema.offers.every((o: any) => o.price && o.availability),
      offer_urls: !!schema.offers && 
        Array.isArray(schema.offers) &&
        schema.offers.every((o: any) => o.url),
    },
  };
}

export function countConfiguredItems(status: LandingPageConfigStatus): {
  total: number;
  configured: number;
  percentage: number;
  byCategory: Record<string, { configured: number; total: number }>;
} {
  const byCategory: Record<string, { configured: number; total: number }> = {};
  let totalConfigured = 0;
  let totalItems = 0;

  Object.entries(status).forEach(([category, fields]) => {
    const configured = Object.values(fields).filter(Boolean).length;
    const total = Object.values(fields).length;
    
    byCategory[category] = { configured, total };
    totalConfigured += configured;
    totalItems += total;
  });

  return {
    total: totalItems,
    configured: totalConfigured,
    percentage: Math.round((totalConfigured / totalItems) * 100),
    byCategory,
  };
}
