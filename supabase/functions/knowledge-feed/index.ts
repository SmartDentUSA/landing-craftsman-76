import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: {
    name: string;
    letter: string;
  };
  url: string;
  image_url: string;
  published_at: string;
  keywords: string[];
}

interface FeedResponse {
  feed: {
    title: string;
    link: string;
    description: string;
    updated_at: string;
  };
  items: FeedItem[];
}

function extractPrimaryCategory(offers: any[]): string {
  if (!offers || offers.length === 0) return 'Geral';
  const firstOffer = offers[0];
  return firstOffer.category || 'Geral';
}

function extractKeywords(offers: any[]): string[] {
  if (!offers || offers.length === 0) return [];
  const keywords = new Set<string>();
  offers.forEach(offer => {
    if (offer.keywords && Array.isArray(offer.keywords)) {
      offer.keywords.forEach((kw: string) => keywords.add(kw));
    }
  });
  return Array.from(keywords).slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';
    const limit = parseInt(url.searchParams.get('limit') || '12', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const category = url.searchParams.get('category') || null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Fetching published landing pages...', { limit, offset, category });

    let query = supabase
      .from('landing_pages')
      .select('id, name, data, last_modified, status, created_at')
      .order('last_modified', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: pages, error } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Found ${pages?.length || 0} published pages`);

    const items: FeedItem[] = (pages || []).map(page => {
      const pageData = page.data || {};
      const seo = pageData.seo || {};
      const schema = pageData.schema || {};
      const banner = pageData.banner || {};
      const offers = schema.offers || [];

      const primaryCategory = extractPrimaryCategory(offers);
      const keywords = extractKeywords(offers);
      const canonicalUrl = seo.canonical_url || `https://example.com/${page.id}`;
      const bannerImage = banner.images?.[0];
      const imageUrl = typeof bannerImage === 'string' 
        ? bannerImage 
        : (bannerImage?.src || pageData.logo_url || 'https://placehold.co/600x400?text=Sem+Imagem');

      return {
        id: page.id,
        title: pageData.name || page.name || 'Sem Título',
        slug: canonicalUrl.split('/').pop() || page.id,
        excerpt: seo.meta_description || 'Confira este conteúdo exclusivo',
        category: {
          name: primaryCategory,
          letter: primaryCategory[0] || 'G'
        },
        url: canonicalUrl,
        image_url: imageUrl,
        published_at: page.last_modified || page.created_at,
        keywords: keywords
      };
    });

    const feedResponse: FeedResponse = {
      feed: {
        title: 'Base de Conhecimento',
        link: 'https://example.com/blog',
        description: 'Últimas publicações e artigos',
        updated_at: items[0]?.published_at || new Date().toISOString()
      },
      items
    };

    if (format === 'json') {
      return new Response(JSON.stringify(feedResponse, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fallback para outros formatos
    return new Response(JSON.stringify(feedResponse, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in knowledge-feed:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
