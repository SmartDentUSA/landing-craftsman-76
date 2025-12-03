// ═══════════════════════════════════════════════════════════
// 🔗 INTEGRAÇÃO COM SISTEMA B - VÍDEOS E DOCUMENTOS TÉCNICOS
// ═══════════════════════════════════════════════════════════

export interface SystemBVideo {
  titulo: string;
  descricao: string;
  embed_url: string;
  thumbnail: string;
  duracao_segundos: number;
  transcricao?: string;
  tags: string[];
  criado_em: string;
  produto_correlacionado?: {
    nome: string;
    url_pagina: string;
    slug?: string;
    li_product_id?: string;
  };
}

export interface SystemBDocument {
  id: string;
  nome: string;
  descricao?: string;
  nome_arquivo: string;
  url_download: string;
  tamanho_bytes: number;
  tipo_arquivo?: string;
  produto_correlacionado?: {
    nome: string;
    url_pagina: string;
    li_product_id?: string;
  };
}

export interface SystemBEnrichment {
  videos: SystemBVideo[];
  documents: SystemBDocument[];
  syncedAt: string;
  totalVideos: number;
  totalDocuments: number;
}

/**
 * Busca vídeos e documentos do Sistema B relacionados aos produtos selecionados
 */
export async function fetchSystemBResourcesForProducts(
  products: any[]
): Promise<SystemBEnrichment> {
  console.log('🔗 [SISTEMA B] Iniciando busca de recursos técnicos...');
  
  // Extrair li_product_ids dos produtos selecionados
  const productLiIds = products
    .map(p => p.original_data?.li_product_id || p.li_product_id)
    .filter(Boolean)
    .map(id => String(id));
  
  const productNames = products.map(p => p.name?.toLowerCase().trim()).filter(Boolean);
  
  console.log('🔗 [SISTEMA B] Produtos para correlacionar:', {
    totalProdutos: products.length,
    comLiId: productLiIds.length,
    liIds: productLiIds,
    nomes: productNames.slice(0, 5)
  });

  if (productLiIds.length === 0 && productNames.length === 0) {
    console.log('⚠️ [SISTEMA B] Nenhum produto com identificador válido');
    return {
      videos: [],
      documents: [],
      syncedAt: new Date().toISOString(),
      totalVideos: 0,
      totalDocuments: 0
    };
  }

  try {
    // Buscar dados do Sistema B com vídeos
    const systemBUrl = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready&include_product_videos=true&include_resin_videos=true';
    
    const response = await fetch(systemBUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error('❌ [SISTEMA B] Erro na requisição:', response.status);
      return createEmptyEnrichment();
    }

    const raw = await response.json();
    const payload = raw?.data ?? raw;

    console.log('📦 [SISTEMA B] Payload recebido:', {
      temVideosProdutos: !!payload?.videos_produtos,
      temVideosResinas: !!payload?.videos_resinas,
      temDocsCatalogo: !!payload?.documentos_catalogo,
      temProdutosResinas: !!payload?.produtos?.resinas,
      totalVideosProdutos: payload?.videos_produtos?.length || 0,
      totalVideosResinas: payload?.videos_resinas?.length || 0
    });

    // Extrair vídeos
    const videosProdutos = payload?.videos_produtos || [];
    const videosResinas = payload?.videos_resinas || [];
    const allVideos = [...videosProdutos, ...videosResinas];

    // Filtrar vídeos relacionados aos produtos selecionados
    const matchedVideos = filterVideosByProducts(allVideos, productLiIds, productNames);
    
    // Extrair documentos técnicos dos produtos
    const matchedDocuments = extractDocumentsFromProducts(products, payload);

    console.log('✅ [SISTEMA B] Recursos encontrados:', {
      videosCorrelacionados: matchedVideos.length,
      documentosCorrelacionados: matchedDocuments.length
    });

    return {
      videos: matchedVideos,
      documents: matchedDocuments,
      syncedAt: new Date().toISOString(),
      totalVideos: matchedVideos.length,
      totalDocuments: matchedDocuments.length
    };

  } catch (error) {
    console.error('❌ [SISTEMA B] Erro ao buscar recursos:', error);
    return createEmptyEnrichment();
  }
}

/**
 * Filtra vídeos que estão relacionados aos produtos selecionados
 */
function filterVideosByProducts(
  videos: any[],
  productLiIds: string[],
  productNames: string[]
): SystemBVideo[] {
  const matchedVideos: SystemBVideo[] = [];

  for (const videoData of videos) {
    const video = videoData.video || videoData;
    const produto = videoData.produto || videoData.resina_vinculada;
    
    // Verificar correlação por li_product_id
    const videoLiId = produto?.li_product_id || produto?.loja_integrada_id;
    const videoProductName = (produto?.nome || video?.titulo || '').toLowerCase().trim();
    
    const matchByLiId = videoLiId && productLiIds.includes(String(videoLiId));
    const matchByName = productNames.some(name => 
      videoProductName.includes(name) || name.includes(videoProductName)
    );

    if (matchByLiId || matchByName) {
      matchedVideos.push({
        titulo: video.titulo || 'Vídeo Técnico',
        descricao: video.descricao || '',
        embed_url: video.embed_url || '',
        thumbnail: video.thumbnail || '',
        duracao_segundos: video.duracao_segundos || 0,
        transcricao: video.transcricao || '',
        tags: videoData.tags || [],
        criado_em: videoData.criado_em || new Date().toISOString(),
        produto_correlacionado: produto ? {
          nome: produto.nome,
          url_pagina: produto.url_pagina,
          slug: produto.slug,
          li_product_id: videoLiId
        } : undefined
      });
    }
  }

  // Limitar a 6 vídeos para não sobrecarregar a página
  return matchedVideos.slice(0, 6);
}

/**
 * Extrai documentos técnicos dos produtos selecionados
 */
function extractDocumentsFromProducts(
  products: any[],
  _systemBPayload: any
): SystemBDocument[] {
  const documents: SystemBDocument[] = [];

  for (const product of products) {
    const technicalDocs = product.technical_documents || [];
    
    for (const doc of technicalDocs) {
      if (doc.ativo !== false && doc.url_download) {
        documents.push({
          id: doc.id || `doc-${Date.now()}-${Math.random()}`,
          nome: doc.nome || doc.nome_arquivo || 'Documento Técnico',
          descricao: doc.descricao || `Documentação técnica para ${product.name}`,
          nome_arquivo: doc.nome_arquivo || 'documento.pdf',
          url_download: doc.url_download,
          tamanho_bytes: doc.tamanho_bytes || 0,
          tipo_arquivo: doc.nome_arquivo?.split('.').pop()?.toLowerCase() || 'pdf',
          produto_correlacionado: {
            nome: product.name,
            url_pagina: product.product_url,
            li_product_id: product.original_data?.li_product_id
          }
        });
      }
    }
  }

  // Limitar a 10 documentos
  return documents.slice(0, 10);
}

function createEmptyEnrichment(): SystemBEnrichment {
  return {
    videos: [],
    documents: [],
    syncedAt: new Date().toISOString(),
    totalVideos: 0,
    totalDocuments: 0
  };
}

// ✅ FASE 8: Re-exportar do helper centralizado para compatibilidade
import { 
  generateSystemBVideoSchemas,
  type VideoSchemaData,
  type VideoSchemaOptions 
} from '../_shared/video-schema-helper.ts';

/**
 * Gera Schema.org VideoObject para vídeos do Sistema B
 * ✅ FASE 8: Usa helper centralizado
 */
export function generateVideoObjectSchemas(videos: SystemBVideo[]): any[] {
  // Converter para formato do helper e gerar schemas
  return generateSystemBVideoSchemas(videos, {
    includeTranscript: true,
    includeAboutProduct: true,
    includeCreator: true,
    defaultLanguage: 'pt-BR',
    creatorName: 'Smart Dent',
    creatorUrl: 'https://smartdent.com.br'
  });
}

/**
 * Gera Schema.org DigitalDocument para documentos técnicos
 */
export function generateDocumentSchemas(documents: SystemBDocument[]): any[] {
  return documents.map(doc => {
    const schema: any = {
      '@type': 'DigitalDocument',
      name: doc.nome,
      description: doc.descricao,
      url: doc.url_download,
      encodingFormat: getMimeType(doc.tipo_arquivo || 'pdf'),
      inLanguage: 'pt-BR'
    };

    // Adicionar tamanho se disponível
    if (doc.tamanho_bytes > 0) {
      schema.contentSize = formatFileSize(doc.tamanho_bytes);
    }

    // Relacionar ao produto
    if (doc.produto_correlacionado) {
      schema.about = {
        '@type': 'Product',
        name: doc.produto_correlacionado.nome,
        url: doc.produto_correlacionado.url_pagina
      };
    }

    return schema;
  });
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
