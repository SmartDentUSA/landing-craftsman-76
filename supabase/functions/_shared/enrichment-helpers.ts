// ═══════════════════════════════════════════════════════════
// ENRICHMENT HELPERS — Sistema de Enriquecimento Progressivo
// ═══════════════════════════════════════════════════════════
//
// CONCEITO CENTRAL:
// Cada republicação de um HTML busca dados frescos do Supabase
// e enriquece o documento com novos reviews, produtos, vídeos
// e blogs — sem jamais alterar CSS, layout ou conteúdo visual.
//
// Regra de ouro: Só cresce. Nunca quebra. Nunca altera visual.
//
// FLUXO:
//   fetchRelatedProducts()  → Entity Index + llm-knowledge-layer
//   fetchLatestReviews()    → Organization.review[] + AggregateRating
//   fetchRelatedBlogs()     → Entity Index + links semânticos
//   fetchProductVideos()    → VideoObject[] no schema
//   buildProgressiveEntityIndex() → ItemList JSON-LD crescente
// ═══════════════════════════════════════════════════════════

import {
  extractYouTubeId,
  getYouTubeThumbnail,
} from './video-schema-helper.ts';

// ═══════════════════════════════════════════════════════════
// TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string | null;
  url: string;
  category: string | null;
  image?: string;
  description?: string;
  brand?: string;
}

export interface RelatedBlog {
  id: string;
  title: string;
  url: string;
  metaDescription?: string;
  publishedAt: string | null;
  landingPageId: string;
}

export interface ReviewData {
  author_name: string;
  rating: number;
  review_body: string;
  date_published: string;
  profile_photo_url?: string;
}

export interface VideoData {
  title: string;
  url: string;
  thumbnail?: string;
  duration?: string;
  description?: string;
  source: 'youtube' | 'instagram' | 'technical' | 'testimonial';
}

export interface ProgressiveEntityItem {
  name: string;
  url: string;
  type: 'product' | 'blog' | 'entity';
  image?: string;
  description?: string;
}

// ═══════════════════════════════════════════════════════════
// fetchRelatedProducts
// Busca produtos da mesma categoria, ordenados por mais recentes.
// Usado para enriquecer Entity Index e llm-knowledge-layer.
// ═══════════════════════════════════════════════════════════

export async function fetchRelatedProducts(
  supabase: any,
  currentProductId: string,
  category: string | null,
  limit: number = 10
): Promise<RelatedProduct[]> {
  try {
    const SELECT_FIELDS =
      'id, name, slug, category, image_url, product_url, canonical_url, description, brand';

    if (category) {
      const { data, error } = await supabase
        .from('products_repository')
        .select(SELECT_FIELDS)
        .eq('approved', true)
        .eq('active', true)
        .eq('category', category)
        .neq('id', currentProductId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      // Supplement with other categories if not enough results
      if (data.length < limit) {
        const { data: others } = await supabase
          .from('products_repository')
          .select(SELECT_FIELDS)
          .eq('approved', true)
          .eq('active', true)
          .neq('id', currentProductId)
          .neq('category', category)
          .order('updated_at', { ascending: false })
          .limit(limit - data.length);

        return [...data, ...(others || [])].map(mapToRelatedProduct);
      }

      return data.map(mapToRelatedProduct);
    }

    // No category: fetch recent products excluding current
    const { data, error } = await supabase
      .from('products_repository')
      .select(SELECT_FIELDS)
      .eq('approved', true)
      .eq('active', true)
      .neq('id', currentProductId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapToRelatedProduct);
  } catch (err) {
    console.warn('[enrichment] fetchRelatedProducts: exceção —', err);
    return [];
  }
}

function mapToRelatedProduct(p: any): RelatedProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug || null,
    url:
      p.product_url ||
      p.canonical_url ||
      (p.slug ? `https://smartdent.com.br/produto/${p.slug}` : ''),
    category: p.category || null,
    image: p.image_url || undefined,
    description: p.description
      ? p.description.replace(/<[^>]*>/g, '').substring(0, 200)
      : undefined,
    brand: p.brand || undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// fetchLatestReviews
// Busca reviews mais recentes, deduplicados por autor.
// Cada republicação pode trazer reviews novos.
//
// PRIORIDADE DE FONTES:
// 1. Tabela `reviews` (nova, dedicada ao enrichment)
// 2. `approved_reviews` com join para `raw_reviews`
// 3. `raw_reviews` direto (fallback)
// ═══════════════════════════════════════════════════════════

export async function fetchLatestReviews(
  supabase: any,
  limit: number = 15
): Promise<ReviewData[]> {
  try {
    // Prioridade 1: tabela `reviews` dedicada ao enrichment
    const { data: enrichmentReviews, error: enrichmentError } = await supabase
      .from('reviews')
      .select('author_name, rating, review_body, date_published')
      .eq('approved', true)
      .order('date_published', { ascending: false })
      .limit(limit * 2);

    if (!enrichmentError && enrichmentReviews && enrichmentReviews.length > 0) {
      const seen = new Set<string>();
      const reviews: ReviewData[] = enrichmentReviews
        .filter((r: any) => {
          if (!r.author_name || seen.has(r.author_name)) return false;
          seen.add(r.author_name);
          return true;
        })
        .slice(0, limit)
        .map((r: any): ReviewData => ({
          author_name: r.author_name,
          rating: r.rating,
          review_body: r.review_body || '',
          date_published:
            r.date_published || new Date().toISOString().split('T')[0],
        }));

      if (reviews.length > 0) {
        console.log(
          `✅ [enrichment] fetchLatestReviews: ${reviews.length} reviews (tabela reviews)`
        );
        return reviews;
      }
    }

    // Prioridade 2: approved_reviews com join para raw_reviews
    const { data: approvedData, error: approvedError } = await supabase
      .from('approved_reviews')
      .select(`
        display_order,
        raw_review:raw_review_id (
          author_name,
          rating,
          review_text,
          review_date,
          profile_photo_url
        )
      `)
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(limit * 2);

    if (!approvedError && approvedData && approvedData.length > 0) {
      const seen = new Set<string>();
      const reviews: ReviewData[] = [];

      for (const ar of approvedData) {
        const rv = ar.raw_review;
        if (!rv?.author_name || !rv?.rating) continue;
        if (seen.has(rv.author_name)) continue;
        seen.add(rv.author_name);
        reviews.push({
          author_name: rv.author_name,
          rating: rv.rating,
          review_body: rv.review_text || '',
          date_published:
            rv.review_date || new Date().toISOString().split('T')[0],
          profile_photo_url: rv.profile_photo_url || undefined,
        });
        if (reviews.length >= limit) break;
      }

      if (reviews.length > 0) {
        console.log(
          `✅ [enrichment] fetchLatestReviews: ${reviews.length} reviews (approved_reviews)`
        );
        return reviews;
      }
    }

    // Fallback: raw_reviews direto
    const { data, error } = await supabase
      .from('raw_reviews')
      .select('author_name, rating, review_text, review_date, profile_photo_url')
      .not('rating', 'is', null)
      .order('extracted_at', { ascending: false })
      .limit(limit * 2);

    if (error || !data) return [];

    const seen = new Set<string>();
    const reviews = data
      .filter((r: any) => {
        if (!r.author_name || seen.has(r.author_name)) return false;
        seen.add(r.author_name);
        return true;
      })
      .slice(0, limit)
      .map(
        (r: any): ReviewData => ({
          author_name: r.author_name,
          rating: r.rating,
          review_body: r.review_text || '',
          date_published:
            r.review_date || new Date().toISOString().split('T')[0],
          profile_photo_url: r.profile_photo_url || undefined,
        })
      );

    console.log(
      `✅ [enrichment] fetchLatestReviews: ${reviews.length} reviews (raw_reviews fallback)`
    );
    return reviews;
  } catch (err) {
    console.warn('[enrichment] fetchLatestReviews: exceção —', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// fetchRelatedBlogs
// Busca blogs relacionados ao produto atual.
// Usa source_landing_page_id como ponte entre produto e blog.
// ═══════════════════════════════════════════════════════════

export async function fetchRelatedBlogs(
  supabase: any,
  productId: string,
  limit: number = 5
): Promise<RelatedBlog[]> {
  try {
    // Buscar dados do produto para obter landing_page_id e nome
    const { data: product } = await supabase
      .from('products_repository')
      .select('source_landing_page_id, name, category')
      .eq('id', productId)
      .single();

    const blogs: RelatedBlog[] = [];

    // Busca direta via landing_page_id vinculado ao produto
    if (product?.source_landing_page_id) {
      const { data: directBlogs } = await supabase
        .from('blog_posts')
        .select('id, title, meta_description, landing_page_id, published_at')
        .eq('landing_page_id', product.source_landing_page_id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (directBlogs) {
        blogs.push(...directBlogs.map(mapToBlog));
      }
    }

    // Complementar: buscar blogs que mencionam o nome do produto
    if (blogs.length < limit && product?.name) {
      const productKeyword = product.name.substring(0, 30);
      const { data: namedBlogs } = await supabase
        .from('blog_posts')
        .select('id, title, meta_description, landing_page_id, published_at')
        .eq('status', 'published')
        .ilike('title', `%${productKeyword}%`)
        .order('published_at', { ascending: false })
        .limit(limit - blogs.length);

      if (namedBlogs) {
        const existingIds = new Set(blogs.map((b) => b.id));
        blogs.push(
          ...namedBlogs
            .filter((b: any) => !existingIds.has(b.id))
            .map(mapToBlog)
        );
      }
    }

    console.log(
      `✅ [enrichment] fetchRelatedBlogs: ${blogs.length} blogs para produto ${productId}`
    );
    return blogs.slice(0, limit);
  } catch (err) {
    console.warn('[enrichment] fetchRelatedBlogs: exceção —', err);
    return [];
  }
}

function mapToBlog(b: any): RelatedBlog {
  // URL construída a partir de published_domains se disponível
  const url = Array.isArray(b.published_domains) && b.published_domains.length > 0
    ? `https://${b.published_domains[0]}/${b.landing_page_id || b.id}`
    : b.url || '';

  return {
    id: b.id,
    title: b.title,
    url,
    metaDescription: b.meta_description || undefined,
    publishedAt: b.published_at || null,
    landingPageId: b.landing_page_id,
  };
}

// ═══════════════════════════════════════════════════════════
// fetchProductVideos
// Busca vídeos vinculados ao produto.
//
// PRIORIDADE DE FONTES:
// 1. Tabela `videos` (nova, dedicada ao enrichment) — product_id
// 2. youtube_videos + technical_videos do products_repository
// 3. video_testimonials da landing page vinculada
// ═══════════════════════════════════════════════════════════

export async function fetchProductVideos(
  supabase: any,
  productId: string,
  limit: number = 10
): Promise<VideoData[]> {
  try {
    // Prioridade 1: tabela `videos` dedicada ao enrichment
    const { data: enrichmentVideos, error: enrichmentError } = await supabase
      .from('videos')
      .select('title, url, thumbnail, duration, description, video_type')
      .eq('product_id', productId)
      .eq('approved', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(limit);

    const videos: VideoData[] = [];

    if (!enrichmentError && enrichmentVideos && enrichmentVideos.length > 0) {
      for (const v of enrichmentVideos) {
        if (!v?.url) continue;
        const ytId = extractYouTubeId(v.url);
        videos.push({
          title: v.title,
          url: v.url,
          thumbnail: v.thumbnail || (ytId ? getYouTubeThumbnail(ytId) : undefined),
          duration: v.duration || undefined,
          description: v.description || undefined,
          source: (v.video_type as VideoData['source']) || 'youtube',
        });
      }
    }

    if (videos.length >= limit) {
      console.log(
        `✅ [enrichment] fetchProductVideos: ${videos.length} vídeos (tabela videos)`
      );
      return videos.slice(0, limit);
    }

    const { data: product } = await supabase
      .from('products_repository')
      .select(
        'youtube_videos, instagram_videos, technical_videos, testimonial_videos, source_landing_page_id'
      )
      .eq('id', productId)
      .single();

    if (product) {
      // Vídeos YouTube do produto
      const ytVideos = Array.isArray(product.youtube_videos)
        ? product.youtube_videos
        : [];
      for (const v of ytVideos.slice(0, 5)) {
        if (!v?.url) continue;
        const ytId = extractYouTubeId(v.url);
        videos.push({
          title: v.title || v.description || 'Vídeo do Produto',
          url: v.url,
          thumbnail: v.thumbnail || (ytId ? getYouTubeThumbnail(ytId) : undefined),
          duration: v.duration || undefined,
          description: v.description || undefined,
          source: 'youtube',
        });
      }

      // Vídeos técnicos do produto
      const techVideos = Array.isArray(product.technical_videos)
        ? product.technical_videos
        : [];
      for (const v of techVideos.slice(0, 3)) {
        if (!v?.url) continue;
        const ytId = extractYouTubeId(v.url);
        videos.push({
          title: v.title || 'Vídeo Técnico',
          url: v.url,
          thumbnail: v.thumbnail || (ytId ? getYouTubeThumbnail(ytId) : undefined),
          duration: v.duration || undefined,
          description: v.description || undefined,
          source: 'technical',
        });
      }
    }

    // video_testimonials vinculados à landing page do produto
    if (product?.source_landing_page_id && videos.length < limit) {
      const { data: testimonials } = await supabase
        .from('video_testimonials')
        .select(
          'client_name, youtube_url, instagram_url, testimonial_text, specialty'
        )
        .eq('landing_page_id', product.source_landing_page_id)
        .eq('approved', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .limit(limit - videos.length);

      if (testimonials) {
        for (const t of testimonials) {
          const url = t.youtube_url || t.instagram_url;
          if (!url) continue;
          const ytId = extractYouTubeId(url);
          videos.push({
            title: `Depoimento: ${t.client_name}${
              t.specialty ? ` — ${t.specialty}` : ''
            }`,
            url,
            thumbnail: ytId ? getYouTubeThumbnail(ytId) : undefined,
            description: t.testimonial_text
              ? t.testimonial_text.substring(0, 200)
              : undefined,
            source: 'testimonial',
          });
        }
      }
    }

    // Deduplicar por URL
    const seen = new Set<string>();
    const unique = videos.filter((v) => {
      if (seen.has(v.url)) return false;
      seen.add(v.url);
      return true;
    });

    console.log(
      `✅ [enrichment] fetchProductVideos: ${unique.length} vídeos para produto ${productId}`
    );
    return unique.slice(0, limit);
  } catch (err) {
    console.warn('[enrichment] fetchProductVideos: exceção —', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// buildReviewsSchema
// Converte ReviewData[] para array de Review Schema.org.
// AggregateRating deve ser recalculado após chamar isto.
// ═══════════════════════════════════════════════════════════

export function buildReviewsSchema(reviews: ReviewData[]): Record<string, any>[] {
  return reviews.map((r) => ({
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: r.author_name,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: String(r.rating),
      bestRating: '5',
      worstRating: '1',
    },
    reviewBody: r.review_body,
    datePublished: r.date_published,
  }));
}

// ═══════════════════════════════════════════════════════════
// buildVideoGallerySchema
// Converte VideoData[] para array de VideoObject Schema.org.
// ═══════════════════════════════════════════════════════════

export function buildVideoGallerySchema(
  videos: VideoData[]
): Record<string, any>[] {
  return videos
    .filter((v) => v.url)
    .map((v) => {
      const ytId = extractYouTubeId(v.url);
      const schema: Record<string, any> = {
        '@type': 'VideoObject',
        name: v.title,
        url: v.url,
      };
      if (v.description) schema.description = v.description;
      if (v.thumbnail || ytId) {
        schema.thumbnailUrl = v.thumbnail || getYouTubeThumbnail(ytId!);
      }
      if (v.duration) schema.duration = v.duration;
      if (ytId) schema.embedUrl = `https://www.youtube.com/embed/${ytId}`;
      return schema;
    });
}

// ═══════════════════════════════════════════════════════════
// buildProgressiveEntityIndex
// Monta o Entity Index combinando:
// - Produto atual
// - Produtos relacionados (do banco)
// - Blogs relacionados (do banco)
// A cada republicação, a lista CRESCE com novos itens.
// ═══════════════════════════════════════════════════════════

export async function buildProgressiveEntityIndex(
  supabase: any,
  currentProduct: { name: string; url: string; image?: string },
  category: string | null,
  productId: string
): Promise<{ html: string; jsonLd: string }> {
  const [relatedProducts, relatedBlogs] = await Promise.all([
    fetchRelatedProducts(supabase, productId, category, 8),
    fetchRelatedBlogs(supabase, productId, 5),
  ]);

  // Lista combinada — começa com produto atual
  const entities: ProgressiveEntityItem[] = [
    {
      name: currentProduct.name,
      url: currentProduct.url,
      type: 'product',
      image: currentProduct.image,
    },
    ...relatedProducts.map(
      (p): ProgressiveEntityItem => ({
        name: p.name,
        url: p.url,
        type: 'product',
        image: p.image,
        description: p.description,
      })
    ),
    ...relatedBlogs
      .filter((b) => !!b.url)
      .map(
        (b): ProgressiveEntityItem => ({
          name: b.title,
          url: b.url,
          type: 'blog',
          description: b.metaDescription,
        })
      ),
  ];

  // Deduplicar por URL
  const seen = new Set<string>();
  const unique = entities.filter((e) => {
    if (!e.url || seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });

  console.log(
    `✅ [enrichment] buildProgressiveEntityIndex: ${unique.length} entidades (${relatedProducts.length} produtos + ${relatedBlogs.length} blogs)`
  );

  const html = buildEntityIndexHTML(unique);
  const jsonLd = buildEntityIndexJsonLD(unique);

  return { html, jsonLd };
}

// ═══════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════

const VISUALLY_HIDDEN =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';

/**
 * Gera HTML do Entity Index — visualmente oculto, semanticamente acessível.
 * Blocos ocultos (display:none não é usado; usa clip para acessibilidade).
 */
function buildEntityIndexHTML(entities: ProgressiveEntityItem[]): string {
  if (entities.length === 0) return '';

  const items = entities
    .filter((e) => e.url)
    .map(
      (e) =>
        `    <li><a href="${esc(e.url)}"${
          e.description ? ` title="${esc(e.description)}"` : ''
        }>${esc(e.name)}</a></li>`
    )
    .join('\n');

  return `
  <nav class="entity-index" data-ai-hint="entities" aria-label="Entidades Relacionadas" style="${VISUALLY_HIDDEN}">
    <ul>
${items}
    </ul>
  </nav>`;
}

/**
 * Gera JSON-LD ItemList para o Entity Index.
 * Cresce a cada republicação com novos produtos e blogs.
 */
function buildEntityIndexJsonLD(entities: ProgressiveEntityItem[]): string {
  if (entities.length === 0) return '';

  const itemListElement = entities
    .filter((e) => e.url)
    .map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': e.type === 'blog' ? 'Article' : 'Product',
        name: e.name,
        url: e.url,
        ...(e.image && { image: e.image }),
        ...(e.description && { description: e.description }),
      },
    }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Produtos e Conteúdos Relacionados',
    numberOfItems: itemListElement.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement,
  };

  return JSON.stringify(schema, null, 2);
}

/** Safe HTML attribute escaping */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

console.log(
  '🔄 [Enrichment] Helpers carregados: fetchRelatedProducts, fetchLatestReviews, fetchRelatedBlogs, fetchProductVideos, buildProgressiveEntityIndex'
);
