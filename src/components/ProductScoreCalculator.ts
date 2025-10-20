interface Product {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
  sales_pitch?: string;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
  target_audience?: string[];
  search_intent_keywords?: string[];
  market_keywords?: string[];
  tags?: string[];
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  tiktok_videos?: any[];
  seo_title_override?: string;
  seo_description_override?: string;
  canonical_url?: string;
  slug?: string;
}

export interface ScoreBreakdown {
  total: number;
  percentage: number;
  details: {
    basicInfo: number;
    content: number;
    multimedia: number;
    seo: number;
    commercial: number;
  };
  maxPoints: number;
  missingFields: string[];
}

export const calculateProductScore = (product: Product): ScoreBreakdown => {
  let score = 0;
  const missingFields: string[] = [];
  
  // Informações Básicas (25 pontos)
  let basicInfo = 0;
  if (product.name?.trim()) {
    basicInfo += 5;
  } else {
    missingFields.push('Nome');
  }
  
  if (product.description?.trim()) {
    basicInfo += 5;
  } else {
    missingFields.push('Descrição');
  }
  
  if (product.category?.trim()) {
    basicInfo += 5;
  } else {
    missingFields.push('Categoria');
  }
  
  if (product.subcategory?.trim()) {
    basicInfo += 5;
  } else {
    missingFields.push('Subcategoria');
  }
  
  if (product.price !== undefined && product.price !== null) {
    basicInfo += 5;
  } else {
    missingFields.push('Preço');
  }
  
  // Conteúdo Rico (30 pontos)
  let content = 0;
  if (product.features && product.features.length > 0) {
    content += 8;
  } else {
    missingFields.push('Características');
  }
  
  if (product.benefits && product.benefits.length > 0) {
    content += 8;
  } else {
    missingFields.push('Benefícios');
  }
  
  if (product.sales_pitch?.trim()) {
    content += 7;
  } else {
    missingFields.push('Pitch de Vendas');
  }
  
  if (product.target_audience && product.target_audience.length > 0) {
    content += 7;
  } else {
    missingFields.push('Público-alvo');
  }
  
  // Mídia (20 pontos)
  let multimedia = 0;
  if (product.image_url?.trim()) {
    multimedia += 10;
  } else {
    missingFields.push('Imagem');
  }
  
  const totalVideos = (product.youtube_videos?.length || 0) + 
                     (product.instagram_videos?.length || 0) + 
                     (product.technical_videos?.length || 0) + 
                     (product.testimonial_videos?.length || 0) + 
                     (product.tiktok_videos?.length || 0);
  
  if (totalVideos > 0) {
    multimedia += 10;
  } else {
    missingFields.push('Vídeos');
  }
  
  // SEO & Marketing (25 pontos)
  let seo = 0;
  if (product.keywords && product.keywords.length > 0) {
    seo += 5;
  } else {
    missingFields.push('Palavras-chave');
  }
  
  if (product.search_intent_keywords && product.search_intent_keywords.length > 0) {
    seo += 5;
  } else {
    missingFields.push('Palavras-chave de Intenção');
  }
  
  if (product.market_keywords && product.market_keywords.length > 0) {
    seo += 5;
  } else {
    missingFields.push('Palavras-chave de Mercado');
  }
  
  // SEO Avançado (10 pontos)
  if (product.seo_title_override?.trim()) {
    seo += 3;
  } else {
    missingFields.push('SEO Title');
  }
  
  if (product.seo_description_override?.trim() && 
      product.seo_description_override.length >= 120 && 
      product.seo_description_override.length <= 160) {
    seo += 4;
  } else {
    missingFields.push('Meta Description (120-160 chars)');
  }
  
  if (product.canonical_url?.trim() && product.canonical_url.startsWith('http')) {
    seo += 2;
  } else {
    missingFields.push('URL Canônica');
  }
  
  if (product.slug?.trim()) {
    seo += 1;
  } else {
    missingFields.push('Slug SEO');
  }
  
  // Comercial (10 pontos)
  let commercial = 0;
  if (product.product_url?.trim()) {
    commercial += 5;
  } else {
    missingFields.push('URL do Produto');
  }
  
  if (product.tags && product.tags.length > 0) {
    commercial += 5;
  } else {
    missingFields.push('Tags');
  }
  
  const total = basicInfo + content + multimedia + seo + commercial;
  const maxPoints = 110;
  const percentage = Math.round((total / maxPoints) * 100);
  
  return {
    total,
    percentage,
    details: {
      basicInfo,
      content,
      multimedia,
      seo,
      commercial
    },
    maxPoints,
    missingFields
  };
};

export const getScoreColor = (percentage: number): string => {
  if (percentage >= 90) return 'success';
  if (percentage >= 70) return 'warning'; 
  if (percentage >= 50) return 'secondary';
  return 'destructive';
};

export const getScoreLabel = (percentage: number): string => {
  if (percentage >= 90) return 'Completo';
  if (percentage >= 70) return 'Bom';
  if (percentage >= 50) return 'Regular';
  return 'Crítico';
};