// ═══════════════════════════════════════════════════════════
// 🎥 FASE 8: VIDEO SCHEMA HELPER - VideoObject Schema.org
// ═══════════════════════════════════════════════════════════
// Helper centralizado para geração de VideoObject schemas
// Usado em: publish-blog-post, generate-ecommerce-html, generate-spin-landing-page
// ═══════════════════════════════════════════════════════════

/**
 * Interface para dados de vídeo compatível com Schema.org VideoObject
 */
export interface VideoSchemaData {
  name: string;
  description?: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: number; // segundos
  contentUrl?: string;
  embedUrl?: string;
  transcript?: string;
  inLanguage?: string;
  // Relacionamentos
  aboutProduct?: {
    name: string;
    url?: string;
  };
  creator?: {
    name: string;
    url?: string;
  };
  tags?: string[];
}

/**
 * Interface para vídeos do Sistema B (compatibilidade)
 */
export interface SystemBVideoData {
  titulo: string;
  descricao?: string;
  embed_url: string;
  thumbnail: string;
  duracao_segundos: number;
  transcricao?: string;
  tags?: string[];
  criado_em: string;
  produto_correlacionado?: {
    nome: string;
    url_pagina?: string;
    slug?: string;
    li_product_id?: string;
  };
}

/**
 * Interface para vídeos do YouTube do produto
 */
export interface ProductYouTubeVideo {
  url?: string;
  embed_url?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  duration?: number;
  duration_seconds?: number;
  publishedAt?: string;
  created_at?: string;
}

/**
 * Opções para geração de VideoObject Schema
 */
export interface VideoSchemaOptions {
  includeTranscript?: boolean;
  includeAboutProduct?: boolean;
  includeCreator?: boolean;
  defaultLanguage?: string;
  creatorName?: string;
  creatorUrl?: string;
}

/**
 * Formata duração em segundos para formato ISO 8601 (PT{H}H{M}M{S}S)
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'PT0S';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0 || (hours === 0 && minutes === 0)) duration += `${secs}S`;
  
  return duration;
}

/**
 * Extrai ID de vídeo do YouTube de uma URL
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Padrões de URLs do YouTube
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Gera thumbnail URL do YouTube a partir do ID
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault'
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Gera URL de embed do YouTube a partir do ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Gera um único VideoObject Schema
 */
export function generateVideoObjectSchema(
  video: VideoSchemaData,
  options: VideoSchemaOptions = {}
): Record<string, any> {
  const {
    includeTranscript = true,
    includeAboutProduct = true,
    includeCreator = true,
    defaultLanguage = 'pt-BR',
    creatorName = 'Smart Dent',
    creatorUrl = 'https://smartdent.com.br'
  } = options;

  const schema: Record<string, any> = {
    '@type': 'VideoObject',
    name: video.name,
    description: video.description || video.name,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    inLanguage: video.inLanguage || defaultLanguage
  };

  // Duração formatada
  if (video.duration && video.duration > 0) {
    schema.duration = formatDuration(video.duration);
  }

  // URLs de conteúdo
  if (video.contentUrl) {
    schema.contentUrl = video.contentUrl;
  }
  if (video.embedUrl) {
    schema.embedUrl = video.embedUrl;
  }

  // Transcrição (importante para SGE/GEO)
  if (includeTranscript && video.transcript) {
    schema.transcript = video.transcript;
  }

  // Produto relacionado
  if (includeAboutProduct && video.aboutProduct) {
    schema.about = {
      '@type': 'Product',
      name: video.aboutProduct.name,
      ...(video.aboutProduct.url && { url: video.aboutProduct.url })
    };
  }

  // Criador/Publisher
  if (includeCreator) {
    schema.creator = {
      '@type': 'Organization',
      name: video.creator?.name || creatorName,
      url: video.creator?.url || creatorUrl
    };
  }

  // Keywords/Tags
  if (video.tags && video.tags.length > 0) {
    schema.keywords = video.tags.join(', ');
  }

  return schema;
}

/**
 * Gera múltiplos VideoObject Schemas
 */
export function generateVideoObjectSchemas(
  videos: VideoSchemaData[],
  options: VideoSchemaOptions = {}
): Record<string, any>[] {
  return videos
    .filter(v => v.name && v.thumbnailUrl)
    .map(video => generateVideoObjectSchema(video, options));
}

/**
 * Converte vídeo do Sistema B para VideoSchemaData
 */
export function convertSystemBVideoToSchema(video: SystemBVideoData): VideoSchemaData {
  return {
    name: video.titulo,
    description: video.descricao || video.titulo,
    thumbnailUrl: video.thumbnail,
    uploadDate: video.criado_em,
    duration: video.duracao_segundos,
    contentUrl: video.embed_url,
    embedUrl: video.embed_url,
    transcript: video.transcricao,
    tags: video.tags,
    aboutProduct: video.produto_correlacionado ? {
      name: video.produto_correlacionado.nome,
      url: video.produto_correlacionado.url_pagina
    } : undefined
  };
}

/**
 * Converte array de vídeos do Sistema B para VideoSchemaData[]
 */
export function convertSystemBVideosToSchemas(videos: SystemBVideoData[]): VideoSchemaData[] {
  return videos.map(convertSystemBVideoToSchema);
}

/**
 * Gera VideoObject Schemas a partir de vídeos do Sistema B
 * (Wrapper para compatibilidade com código existente)
 */
export function generateSystemBVideoSchemas(
  videos: SystemBVideoData[],
  options: VideoSchemaOptions = {}
): Record<string, any>[] {
  const schemaData = convertSystemBVideosToSchemas(videos);
  return generateVideoObjectSchemas(schemaData, options);
}

/**
 * Converte vídeos do YouTube do produto para VideoSchemaData[]
 */
export function convertProductYouTubeVideos(
  videos: ProductYouTubeVideo[],
  productName?: string,
  productUrl?: string
): VideoSchemaData[] {
  return videos
    .filter(v => v.url || v.embed_url)
    .map(video => {
      const url = video.url || video.embed_url || '';
      const videoId = extractYouTubeId(url);
      
      return {
        name: video.title || `Vídeo sobre ${productName || 'produto'}`,
        description: video.description || video.title || productName || '',
        thumbnailUrl: video.thumbnail || video.thumbnailUrl || (videoId ? getYouTubeThumbnail(videoId) : ''),
        uploadDate: video.publishedAt || video.created_at || new Date().toISOString(),
        duration: video.duration || video.duration_seconds,
        contentUrl: video.url || `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: video.embed_url || (videoId ? getYouTubeEmbedUrl(videoId) : ''),
        aboutProduct: productName ? {
          name: productName,
          url: productUrl
        } : undefined
      };
    });
}

/**
 * Gera ItemList de VideoObjects (para Video Carousel Rich Snippets)
 */
export function generateVideoItemListSchema(
  videos: VideoSchemaData[],
  listName?: string
): Record<string, any> | null {
  if (!videos || videos.length === 0) return null;

  return {
    '@type': 'ItemList',
    name: listName || 'Coleção de Vídeos',
    numberOfItems: videos.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: videos.map((video, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: generateVideoObjectSchema(video, { includeCreator: false })
    }))
  };
}

/**
 * Extrai e converte todos os vídeos de um produto (YouTube, Instagram, Technical)
 */
export function extractProductVideos(
  product: any,
  options: { maxVideos?: number } = {}
): VideoSchemaData[] {
  const { maxVideos = 6 } = options;
  const allVideos: VideoSchemaData[] = [];

  // YouTube Videos
  if (product.youtube_videos && Array.isArray(product.youtube_videos)) {
    const ytVideos = convertProductYouTubeVideos(
      product.youtube_videos,
      product.name,
      product.product_url || product.canonical_url
    );
    allVideos.push(...ytVideos);
  }

  // Technical Videos
  if (product.technical_videos && Array.isArray(product.technical_videos)) {
    const techVideos = product.technical_videos
      .filter((v: any) => v.url || v.embed_url)
      .map((video: any) => {
        const videoId = extractYouTubeId(video.url || video.embed_url);
        return {
          name: video.title || video.name || `Vídeo técnico - ${product.name}`,
          description: video.description || '',
          thumbnailUrl: video.thumbnail || (videoId ? getYouTubeThumbnail(videoId) : ''),
          uploadDate: video.created_at || new Date().toISOString(),
          duration: video.duration || video.duration_seconds,
          contentUrl: video.url,
          embedUrl: video.embed_url || (videoId ? getYouTubeEmbedUrl(videoId) : ''),
          aboutProduct: {
            name: product.name,
            url: product.product_url || product.canonical_url
          }
        };
      });
    allVideos.push(...techVideos);
  }

  // Instagram Videos (se tiverem embed disponível)
  if (product.instagram_videos && Array.isArray(product.instagram_videos)) {
    const igVideos = product.instagram_videos
      .filter((v: any) => v.url || v.embed_url)
      .map((video: any) => ({
        name: video.title || video.caption || `Vídeo Instagram - ${product.name}`,
        description: video.description || video.caption || '',
        thumbnailUrl: video.thumbnail || '',
        uploadDate: video.created_at || new Date().toISOString(),
        contentUrl: video.url,
        embedUrl: video.embed_url,
        aboutProduct: {
          name: product.name,
          url: product.product_url || product.canonical_url
        }
      }));
    allVideos.push(...igVideos);
  }

  // Limitar quantidade
  return allVideos.slice(0, maxVideos);
}

/**
 * Gera todos os VideoObject Schemas para um produto
 */
export function generateProductVideoSchemas(
  product: any,
  options: VideoSchemaOptions & { maxVideos?: number } = {}
): Record<string, any>[] {
  const videos = extractProductVideos(product, { maxVideos: options.maxVideos });
  return generateVideoObjectSchemas(videos, options);
}

/**
 * Gera VideoObject Schema para vídeo principal do blog
 */
export function generateBlogVideoSchema(
  videoUrl: string,
  blogTitle: string,
  options: VideoSchemaOptions = {}
): Record<string, any> | null {
  if (!videoUrl) return null;

  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  const video: VideoSchemaData = {
    name: `Vídeo: ${blogTitle}`,
    description: `Vídeo relacionado ao artigo: ${blogTitle}`,
    thumbnailUrl: getYouTubeThumbnail(videoId, 'maxres'),
    uploadDate: new Date().toISOString(),
    contentUrl: videoUrl.includes('youtube.com/watch') ? videoUrl : `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: getYouTubeEmbedUrl(videoId)
  };

  return generateVideoObjectSchema(video, options);
}
