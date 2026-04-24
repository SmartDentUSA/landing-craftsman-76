import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderBlogIndex, type BlogIndexPost, type SisterBlog } from "../_shared/blog-index-template.ts";
import { extractPostCardMeta, formatPtDate } from "../_shared/blog-index-extractors.ts";
import { injectTrackingIntoHTML, type TrackingPixels } from "../_shared/tracking-injector.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POSTS_PER_PAGE = 12;
const EXCLUDED_DOMAIN = 'www.smartdent.com.br';

interface SeoDomain {
  domain: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  publish_method?: string;
  theme_color?: string;
}

function blogPathForLang(lang: string, page: number): string {
  const base = lang === 'pt' ? '/blog' : `/${lang}/blog`;
  return page === 1 ? base : `${base}/page/${page}`;
}

function blogUrlForLang(domain: string, lang: string): string {
  return `https://${domain}${lang === 'pt' ? '/blog' : `/${lang}/blog`}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const targetDomain: string | undefined = body.domain;
    const allDomains: boolean = !!body.allDomains;

    // Load company profile for tracking + seo_domains
    const { data: company } = await db
      .from('company_profile')
      .select('tracking_pixels, seo_domains')
      .limit(1)
      .maybeSingle();

    const seoDomains: SeoDomain[] = (company?.seo_domains as any[]) || [];
    const trackingPixels = company?.tracking_pixels as TrackingPixels | undefined;

    // Discover which domains have at least one published blog post
    const { data: distinctRows, error: distinctErr } = await db
      .from('cloned_landing_pages')
      .select('target_domain, lang')
      .eq('publish_status', 'success')
      .like('page_path', '/blog/%')
      .neq('target_domain', EXCLUDED_DOMAIN);

    if (distinctErr) throw new Error(`Failed to enumerate blogs: ${distinctErr.message}`);

    // Build map: domain → Set<lang>
    const domainLangs = new Map<string, Set<string>>();
    for (const row of (distinctRows || []) as any[]) {
      if (!row.target_domain) continue;
      const set = domainLangs.get(row.target_domain) || new Set<string>();
      set.add(row.lang || 'pt');
      domainLangs.set(row.target_domain, set);
    }

    // Decide which domains to process
    let domainsToProcess: string[];
    if (allDomains) {
      domainsToProcess = Array.from(domainLangs.keys());
    } else if (targetDomain) {
      if (targetDomain === EXCLUDED_DOMAIN) {
        return new Response(
          JSON.stringify({ success: false, error: `Domain ${EXCLUDED_DOMAIN} is excluded.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      domainsToProcess = [targetDomain];
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Provide { domain } or { allDomains: true }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Sister blogs (all enabled domains except current, skipping excluded)
    const allEnabledDomains = seoDomains
      .filter((d) => d.enabled !== false && d.domain && d.domain !== EXCLUDED_DOMAIN);

    const results: any[] = [];

    for (const domain of domainsToProcess) {
      const cfg = seoDomains.find((d) => d.domain === domain);
      const langSet = domainLangs.get(domain) || new Set(['pt']);
      const availableLangs = Array.from(langSet);

      const siteName = cfg?.name || domain.replace(/^www\./, '');
      const siteDescription = cfg?.description || `Blog técnico sobre odontologia digital — ${siteName}`;
      const themeColor = cfg?.theme_color || '#0f172a';

      const sisterBlogs: SisterBlog[] = allEnabledDomains
        .filter((d) => d.domain !== domain)
        .map((d) => ({
          domain: d.domain,
          name: d.name || d.domain,
          url: `https://${d.domain}/blog`,
          hasPosts: domainLangs.has(d.domain),
        }));

      for (const lang of availableLangs) {
        // Fetch all posts for this (domain, lang)
        const { data: posts, error: postsErr } = await db
          .from('cloned_landing_pages')
          .select('name, page_path, published_url, transformed_html, brand, product, created_at, lang')
          .eq('target_domain', domain)
          .eq('publish_status', 'success')
          .eq('lang', lang)
          .like('page_path', '/blog/%')
          .order('created_at', { ascending: false });

        if (postsErr) {
          results.push({ domain, lang, error: postsErr.message });
          continue;
        }

        const postCards: BlogIndexPost[] = (posts || []).map((p: any) => {
          const meta = extractPostCardMeta(p.transformed_html || '');
          return {
            name: p.name || p.product || 'Artigo',
            url: p.published_url || `https://${domain}${p.page_path}`,
            description: meta.description || '',
            ogImage: meta.ogImage,
            brand: p.brand || null,
            publishedTime: meta.publishedTime || p.created_at || null,
            formattedDate: formatPtDate(meta.publishedTime, p.created_at),
            readingTimeMin: meta.readingTimeMin,
            author: meta.author,
          };
        });

        const totalPosts = postCards.length;
        const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));

        // Generate one HTML per page
        for (let page = 1; page <= totalPages; page++) {
          const pagePosts = postCards.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

          let html = renderBlogIndex({
            domain,
            siteName,
            siteDescription,
            themeColor,
            blogBaseUrl: blogUrlForLang(domain, lang),
            lang,
            posts: pagePosts,
            page,
            totalPages,
            totalPosts,
            sisterBlogs,
            availableLangs,
          });

          // Inject tracking pixels
          if (trackingPixels) {
            html = injectTrackingIntoHTML(html, trackingPixels, {
              generatorName: 'generate-blog-index',
              domain,
            });
          }

          const pagePath = blogPathForLang(lang, page);

          // Upsert into cloned_landing_pages — match on (target_domain, page_path)
          const { data: existing } = await db
            .from('cloned_landing_pages')
            .select('id')
            .eq('target_domain', domain)
            .eq('page_path', pagePath)
            .maybeSingle();

          const record = {
            name: `Blog — ${siteName}${page > 1 ? ` (p.${page})` : ''}${lang !== 'pt' ? ` [${lang.toUpperCase()}]` : ''}`,
            brand: 'Blog Index',
            product: siteName,
            target_domain: domain,
            page_path: pagePath,
            is_homepage: false,
            lang,
            original_html: html,
            transformed_html: html,
            publish_status: 'pending',
            published_url: null,
            cta_url: `https://${domain}/`,
            status: 'ready',
          };

          if (existing?.id) {
            await db
              .from('cloned_landing_pages')
              .update({ ...record, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          } else {
            // Need a user_id — pick the first user_id seen on cloned_landing_pages for this domain
            const { data: anyRow } = await db
              .from('cloned_landing_pages')
              .select('user_id')
              .eq('target_domain', domain)
              .limit(1)
              .maybeSingle();

            await db.from('cloned_landing_pages').insert({
              ...record,
              user_id: anyRow?.user_id || null,
            });
          }
        }

        results.push({ domain, lang, totalPosts, totalPages });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[generate-blog-index] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
