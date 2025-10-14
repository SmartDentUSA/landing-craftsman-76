export interface ProductConfigStatus {
  basic: {
    name: boolean;
    description: boolean;
    price: boolean;
    category: boolean;
    subcategory: boolean;
    main_image: boolean;
    gallery_min: boolean;
  };
  seo: {
    seo_title: boolean;
    seo_description: boolean;
    canonical_url: boolean;
    slug: boolean;
    has_keywords: boolean;
    has_target_audience: boolean;
  };
  keywords: {
    primary_keywords: boolean;
    market_keywords: boolean;
    search_intent: boolean;
    audience_segmented: boolean;
  };
  images: {
    main_image_url: boolean;
    gallery_count: boolean;
    all_images_have_alt: boolean;
  };
  specs: {
    technical_specs_min: boolean;
    faq_min: boolean;
    dimensions: boolean;
    weight: boolean;
    material: boolean;
  };
  ai_content: {
    benefits: boolean;
    features: boolean;
    ai_keywords: boolean;
    ai_category: boolean;
    sales_pitch: boolean;
    tags: boolean;
  };
  videos: {
    youtube_videos: boolean;
    instagram_videos: boolean;
    technical_videos: boolean;
    testimonial_videos: boolean;
  };
  ctas: {
    product_url: boolean;
    resource_cta1: boolean;
    resource_cta2: boolean;
    resource_cta3: boolean;
  };
  merchant: {
    gtin: boolean;
    mpn: boolean;
    brand: boolean;
    google_category: boolean;
  };
}

export function detectProductConfiguration(product: any): ProductConfigStatus {
  const hasArray = (arr: any) => Array.isArray(arr) && arr.length > 0;
  const hasText = (text: any) => !!text && text.toString().trim().length > 0;
  const hasNumber = (num: any) => typeof num === 'number' && num > 0;

  return {
    basic: {
      name: hasText(product.name),
      description: hasText(product.description) && product.description.length >= 50,
      price: hasNumber(product.price),
      category: hasText(product.category),
      subcategory: hasText(product.subcategory),
      main_image: hasText(product.image_url),
      gallery_min: hasArray(product.images_gallery) && product.images_gallery.length >= 3,
    },
    seo: {
      seo_title: hasText(product.seo_title_override) || hasText(product.name),
      seo_description: hasText(product.seo_description_override) || hasText(product.description),
      canonical_url: hasText(product.canonical_url),
      slug: hasText(product.slug),
      has_keywords: hasArray(product.keywords),
      has_target_audience: hasArray(product.target_audience),
    },
    keywords: {
      primary_keywords: hasArray(product.keywords) && product.keywords.length >= 3,
      market_keywords: hasArray(product.market_keywords) && product.market_keywords.length >= 2,
      search_intent: hasArray(product.search_intent_keywords),
      audience_segmented: hasArray(product.target_audience) && product.target_audience.length >= 2,
    },
    images: {
      main_image_url: hasText(product.image_url),
      gallery_count: hasArray(product.images_gallery) && product.images_gallery.length >= 3,
      all_images_have_alt: hasArray(product.images_gallery) && 
        product.images_gallery.every((img: any) => hasText(img.alt)),
    },
    specs: {
      technical_specs_min: hasArray(product.technical_specifications) && 
        product.technical_specifications.length >= 5,
      faq_min: hasArray(product.faq) && product.faq.length >= 3,
      dimensions: (hasNumber(product.height) && hasNumber(product.width) && hasNumber(product.depth)),
      weight: hasNumber(product.weight),
      material: hasText(product.material),
    },
    ai_content: {
      benefits: hasArray(product.benefits) && product.benefits.length >= 3,
      features: hasArray(product.features) && product.features.length >= 3,
      ai_keywords: product.ai_generated_keywords === true,
      ai_category: product.ai_generated_category === true,
      sales_pitch: hasText(product.sales_pitch),
      tags: hasArray(product.tags) && product.tags.length >= 2,
    },
    videos: {
      youtube_videos: hasArray(product.youtube_videos) && product.youtube_videos.length > 0,
      instagram_videos: hasArray(product.instagram_videos) && product.instagram_videos.length > 0,
      technical_videos: hasArray(product.technical_videos) && product.technical_videos.length > 0,
      testimonial_videos: hasArray(product.testimonial_videos) && product.testimonial_videos.length > 0,
    },
    ctas: {
      product_url: hasText(product.product_url),
      resource_cta1: product.resource_cta1?.visible === true && 
        hasText(product.resource_cta1?.url) && 
        hasText(product.resource_cta1?.label),
      resource_cta2: product.resource_cta2?.visible === true && 
        hasText(product.resource_cta2?.url) && 
        hasText(product.resource_cta2?.label),
      resource_cta3: product.resource_cta3?.visible === true && 
        hasText(product.resource_cta3?.url) && 
        hasText(product.resource_cta3?.label),
    },
    merchant: {
      gtin: hasText(product.gtin),
      mpn: hasText(product.mpn),
      brand: hasText(product.brand),
      google_category: hasText(product.google_product_category),
    },
  };
}

export function countConfiguredItems(status: ProductConfigStatus): {
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
