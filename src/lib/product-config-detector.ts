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
  ecommerce: {
    promo_price: boolean;
    stock_managed: boolean;
    stock_quantity: boolean;
    min_order_quantity: boolean;
    max_order_quantity: boolean;
    free_shipping: boolean;
    ean: boolean;
    ncm: boolean;
  };
  social_content: {
    whatsapp_messages: boolean;
    whatsapp_sequences: boolean;
    instagram_copies: boolean;
    youtube_descriptions: boolean;
    tiktok_content: boolean;
  };
  additional_content: {
    individual_blog: boolean;
    tutorial_resources: boolean;
    bot_trigger_words: boolean;
  };
  cs_messages: {
    has_cs_messages: boolean;
    has_active_cs_messages: boolean;
    cs_messages_count: boolean;
  };
  aftersales_messages: {
    has_aftersales_messages: boolean;
    has_active_aftersales_messages: boolean;
    aftersales_messages_count: boolean;
  };
}

export function detectProductConfiguration(
  product: any,
  csMessages?: any[],
  aftersalesMessages?: any[]
): ProductConfigStatus {
  const hasArray = (arr: any) => Array.isArray(arr) && arr.length > 0;
  const hasText = (text: any) => !!text && text.toString().trim().length > 0;
  const hasNumber = (num: any) => typeof num === 'number' && num > 0;

  console.log('🔍 Product Full Data:', {
    id: product.id,
    name: product.name,
    // BASIC
    description_length: product.description?.length,
    price: product.price,
    category: product.category,
    subcategory: product.subcategory,
    image_url: product.image_url,
    images_gallery_count: product.images_gallery?.length,
    
    // SEO
    seo_title: product.seo_title_override,
    seo_description: product.seo_description_override,
    canonical_url: product.canonical_url,
    slug: product.slug,
    
    // KEYWORDS
    keywords_count: product.keywords?.length,
    market_keywords_count: product.market_keywords?.length,
    search_intent_count: product.search_intent_keywords?.length,
    target_audience_count: product.target_audience?.length,
    
    // SPECS
    technical_specs_count: product.technical_specifications?.length,
    faq_count: product.faq?.length,
    dimensions: { h: product.height, w: product.width, d: product.depth },
    weight: product.weight,
    material: product.material,
    
    // AI CONTENT
    benefits_count: product.benefits?.length,
    features_count: product.features?.length,
    tags_count: product.tags?.length,
    sales_pitch_length: product.sales_pitch?.length,
    
    // MERCHANT
    brand: product.brand,
    gtin: product.gtin,
    mpn: product.mpn,
    google_category: product.google_product_category,
    
    // SOCIAL
    whatsapp_messages: product.whatsapp_messages,
    whatsapp_messages_type: typeof product.whatsapp_messages,
    whatsapp_messages_keys: product.whatsapp_messages ? Object.keys(product.whatsapp_messages) : [],
    instagram_copies: product.instagram_copies,
    instagram_copies_type: typeof product.instagram_copies,
    
    // VIDEOS
    youtube_videos_count: product.youtube_videos?.length,
    instagram_videos_count: product.instagram_videos?.length,
    
    // MESSAGES
    cs_messages_count: csMessages?.length,
    aftersales_messages_count: aftersalesMessages?.length,
  });

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
    ecommerce: {
      promo_price: hasNumber(product.promo_price),
      stock_managed: product.stock_managed === true,
      stock_quantity: product.stock_managed === true && hasNumber(product.stock_quantity),
      min_order_quantity: hasNumber(product.min_order_quantity),
      max_order_quantity: hasNumber(product.max_order_quantity),
      free_shipping: product.free_shipping === true,
      ean: hasText(product.ean),
      ncm: hasText(product.ncm),
    },
    social_content: {
      whatsapp_messages: (() => {
        if (!product.whatsapp_messages) return false;
        if (hasArray(product.whatsapp_messages?.messages)) return true;
        const keys = Object.keys(product.whatsapp_messages);
        return keys.some(key => {
          const value = product.whatsapp_messages[key];
          return hasText(value) || hasArray(value);
        });
      })(),
      whatsapp_sequences: (() => {
        if (!product.whatsapp_sequences) return false;
        if (hasArray(product.whatsapp_sequences?.sequences)) return true;
        const keys = Object.keys(product.whatsapp_sequences);
        return keys.some(key => {
          const value = product.whatsapp_sequences[key];
          return hasText(value) || hasArray(value);
        });
      })(),
      instagram_copies: (() => {
        if (!product.instagram_copies) return false;
        if (hasArray(product.instagram_copies?.copies)) return true;
        const keys = Object.keys(product.instagram_copies);
        return keys.some(key => {
          const value = product.instagram_copies[key];
          return hasText(value) || hasArray(value);
        });
      })(),
      youtube_descriptions: (() => {
        if (!product.youtube_descriptions) return false;
        if (hasArray(product.youtube_descriptions?.descriptions)) return true;
        const keys = Object.keys(product.youtube_descriptions);
        return keys.some(key => {
          const value = product.youtube_descriptions[key];
          return hasText(value) || hasArray(value);
        });
      })(),
      tiktok_content: (() => {
        if (!product.tiktok_content) return false;
        if (hasArray(product.tiktok_content?.copies)) return true;
        const keys = Object.keys(product.tiktok_content);
        return keys.some(key => {
          const value = product.tiktok_content[key];
          return hasText(value) || hasArray(value);
        });
      })(),
    },
    additional_content: {
      individual_blog: !!(product.individual_blog_content?.technical || product.individual_blog_content?.commercial),
      tutorial_resources: hasArray(product.tutorial_resources?.tutorials),
      bot_trigger_words: hasArray(product.bot_trigger_words),
    },
    cs_messages: {
      has_cs_messages: hasArray(csMessages),
      has_active_cs_messages: (csMessages?.filter(m => m.is_active) || []).length > 0,
      cs_messages_count: (csMessages?.filter(m => m.is_active) || []).length >= 3,
    },
    aftersales_messages: {
      has_aftersales_messages: hasArray(aftersalesMessages),
      has_active_aftersales_messages: (aftersalesMessages?.filter(m => m.is_active) || []).length > 0,
      aftersales_messages_count: (aftersalesMessages?.filter(m => m.is_active) || []).length >= 3,
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

    console.log(`📊 Categoria "${category}":`, {
      configured,
      total,
      percentage: Math.round((configured / total) * 100),
      fields: Object.entries(fields).map(([key, value]) => ({ [key]: value }))
    });
  });

  const result = {
    total: totalItems,
    configured: totalConfigured,
    percentage: Math.round((totalConfigured / totalItems) * 100),
    byCategory,
  };

  console.log('📈 countConfiguredItems - Resultado:', result);

  return result;
}
