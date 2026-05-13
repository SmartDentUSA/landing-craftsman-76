// Republish ALL pages of a Cloudflare-hosted domain in a SINGLE deployment.
//
// Why this exists:
// The previous flow called `publish-cloudflare-pages` once per page, and each
// of those calls created a Cloudflare Pages deployment whose manifest had only
// ONE file. Cloudflare Pages treats each deployment as a full snapshot of the
// site, so deploying a single-file manifest effectively removed every other
// route from the live build. When the user clicked "Republicar Tudo", the last
// page deployed was the only one that survived — everything else looked
// "despublicado".
//
// This function fixes the architecture for Cloudflare:
//   1. Read EVERY page that should remain online for the domain
//      (cloned_landing_pages + product_blog_publications).
//   2. Inject tracking pixels + nav (same logic the per-page publisher used).
//   3. Build ONE manifest containing all routes.
//   4. Deploy ONCE to Cloudflare Pages.
//
// Result: the live build always contains all pages, no matter how many times
// the bulk button is clicked.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blake3 } from "https://esm.sh/hash-wasm@4.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingPixels {
  google_tag_manager?: { enabled: boolean; container_id: string | null };
  meta_pixel?: { enabled: boolean; pixel_id: string | null };
  tiktok_pixel?: { enabled: boolean; pixel_id: string | null };
  google_analytics?: { enabled: boolean; measurement_id: string | null };
}

async function calculateBlake3Hash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hash = await blake3(data);
  return hash.slice(0, 32);
}

function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function generateTrackingScripts(pixels: TrackingPixels): { headScripts: string; bodyScripts: string } {
  let headScripts = '';
  let bodyScripts = '';

  if (pixels.google_tag_manager?.enabled && pixels.google_tag_manager.container_id) {
    const gtmId = pixels.google_tag_manager.container_id;
    headScripts += `\n<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${gtmId}');</script>\n<!-- End Google Tag Manager -->`;
    bodyScripts += `\n<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->`;
  }

  if (pixels.meta_pixel?.enabled && pixels.meta_pixel.pixel_id) {
    const pixelId = pixels.meta_pixel.pixel_id;
    headScripts += `\n<!-- Meta Pixel -->\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');</script>\n<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>`;
  }

  if (pixels.tiktok_pixel?.enabled && pixels.tiktok_pixel.pixel_id) {
    const pixelId = pixels.tiktok_pixel.pixel_id;
    headScripts += `\n<!-- TikTok Pixel -->\n<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelId}');ttq.page();}(window,document,'ttq');</script>`;
  }

  if (pixels.google_analytics?.enabled && pixels.google_analytics.measurement_id) {
    const id = pixels.google_analytics.measurement_id;
    headScripts += `\n<!-- GA4 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;
  }

  return { headScripts, bodyScripts };
}

function injectTrackingScripts(html: string, pixels: TrackingPixels): string {
  const { headScripts, bodyScripts } = generateTrackingScripts(pixels);
  if (!headScripts && !bodyScripts) return html;
  let out = html;
  if (headScripts && out.includes('</head>')) out = out.replace('</head>', `${headScripts}\n</head>`);
  if (bodyScripts) out = out.replace(/<body([^>]*)>/i, `<body$1>${bodyScripts}`);
  return out;
}

// Paths that must be served as literal files (no trailing-slash dir hack).
const SYSTEM_FILE_PATHS = new Set(['/sitemap.xml', '/robots.txt', '/feed.xml']);

// Detect broken-slug rows produced by an older clonador bug that stripped the
// first letter of every word in /en and /es titles. They are 404 in practice
// and pollute the sitemap. Skip them entirely.
function isBrokenSlug(pagePath: string | null | undefined): boolean {
  if (!pagePath) return false;
  return /^\/(en|es)\/blog\/-/.test(pagePath);
}

function buildFilePath(pagePath: string | null | undefined, isHomepage: boolean): string {
  if (isHomepage || !pagePath || pagePath === '/' || pagePath === '') return '/index.html';
  if (pagePath && SYSTEM_FILE_PATHS.has(pagePath)) return pagePath; // serve as-is
  const clean = pagePath.replace(/^\//, '').replace(/\/$/, '');
  return `/${clean}/index.html`;
}

function manifestPathToCanonical(domain: string, filePath: string): string {
  if (filePath === '/index.html') return `https://${domain}/`;
  if (SYSTEM_FILE_PATHS.has(filePath)) return `https://${domain}${filePath}`;
  return `https://${domain}${filePath.replace(/\/index\.html$/, '/')}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Build a fresh sitemap.xml from the live manifest entries (excludes system files,
// excludes broken slugs, uses trailing-slash canonicals matching what CF serves).
function buildSitemapXml(domain: string, paths: string[], today: string): string {
  const urls = paths
    .filter((p) => !SYSTEM_FILE_PATHS.has(p) && p !== '/index.html' && !isBrokenSlug(p.replace(/\/index\.html$/, '')))
    .map((p) => manifestPathToCanonical(domain, p))
    .sort();

  // Always include homepage at top
  const all = [`https://${domain}/`, ...urls.filter((u) => u !== `https://${domain}/`)];

  const body = all.map((u) => `  <url>
    <loc>${escapeXml(u)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u === `https://${domain}/` ? '1.0' : '0.8'}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function buildRobotsTxt(domain: string): string {
  return `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
}

// Minimal SEO-clean homepage when the domain has no `/` page.
// Lists the most recent blog posts so Googlebot has internal links to crawl.
function buildHomepageHtml(domain: string, brandName: string, recentPosts: Array<{ title: string; url: string }>): string {
  const postsList = recentPosts.length
    ? `<ul>${recentPosts.slice(0, 24).map((p) => `<li><a href="${escapeXml(p.url)}">${escapeXml(p.title)}</a></li>`).join('')}</ul>`
    : '<p>Conteúdo em breve.</p>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeXml(brandName)} — Conteúdo técnico em odontologia digital</title>
<meta name="description" content="${escapeXml(brandName)}: artigos, guias e materiais técnicos sobre odontologia digital, impressão 3D e fluxos clínicos.">
<link rel="canonical" href="https://${domain}/">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeXml(brandName)}">
<meta property="og:url" content="https://${domain}/">
<meta property="og:description" content="Conteúdo técnico em odontologia digital.">
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:920px;margin:0 auto;padding:24px;line-height:1.6;color:#1f2937}h1{font-size:2rem;margin-bottom:8px}h2{margin-top:32px}a{color:#0f172a}ul{padding-left:20px}li{margin:6px 0}</style>
</head>
<body>
<header>
<h1>${escapeXml(brandName)}</h1>
<p>Conteúdo técnico, guias e tutoriais em odontologia digital.</p>
</header>
<main>
<h2>Artigos recentes</h2>
${postsList}
</main>
<footer>
<p><small>© ${new Date().getFullYear()} ${escapeXml(brandName)}. Todos os direitos reservados.</small></p>
</footer>
</body>
</html>`;
}

/**
 * SEO FIX 2026-05 — Rewrites canonical, og:url and meta robots to the actual
 * served URL. Older HTML stored in DB has canonical pointing to smartdent.com.br
 * (cross-domain) which causes Google to deindex everything as
 * "Página alternativa com tag canônica adequada".
 */
function fixSeoForServedUrl(html: string, domain: string, filePath: string): string {
  const urlPath = filePath === '/index.html' ? '/' : filePath.replace(/\/index\.html$/, '/');
  const canonicalUrl = `https://${domain}${urlPath}`;
  let out = html;

  // Drop ALL existing canonical/og:url/robots/googlebot tags (any number of duplicates)
  out = out
    .replace(/<link[^>]*rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]*property=["']og:url["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]*name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]*name=["']googlebot["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]*name=["']bingbot["'][^>]*>\s*/gi, '');

  // Re-inject canonical + og:url + a SINGLE indexable robots tag right after <head>
  const seoBlock =
    `\n<link rel="canonical" href="${canonicalUrl}">` +
    `\n<meta property="og:url" content="${canonicalUrl}">` +
    `\n<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">\n`;

  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${seoBlock}`);
  } else if (out.includes('</head>')) {
    out = out.replace('</head>', `${seoBlock}</head>`);
  }

  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
  const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { domain } = await req.json();
    if (!domain) {
      return new Response(JSON.stringify({ success: false, error: 'domain é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      return new Response(JSON.stringify({ success: false, error: 'Credenciais Cloudflare ausentes' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[bulk-cf] Starting full-domain republish: ${domain}`);

    // 1. Domain config
    const { data: company } = await supabase
      .from('company_profile')
      .select('seo_domains, tracking_pixels')
      .limit(1)
      .maybeSingle();

    const seoDomains = (company?.seo_domains as any[]) || [];
    const domainConfig = seoDomains.find((d: any) => d.domain === domain);
    if (!domainConfig) throw new Error(`Domínio "${domain}" não configurado em company_profile.seo_domains`);
    if (!domainConfig.cloudflare_enabled || !domainConfig.cloudflare_project_name) {
      throw new Error(`Cloudflare não habilitado para "${domain}"`);
    }
    const projectName = domainConfig.cloudflare_project_name;

    // Tracking pixels resolution (per-domain overrides global)
    const rawPixels = domainConfig.tracking_pixels || (company?.tracking_pixels as any) || {};
    const trackingPixels: TrackingPixels = {
      google_tag_manager: rawPixels.google_tag_manager || rawPixels.gtm || null,
      google_analytics: rawPixels.google_analytics || rawPixels.ga4 || null,
      meta_pixel: rawPixels.meta_pixel || rawPixels.meta || null,
      tiktok_pixel: rawPixels.tiktok_pixel || rawPixels.tiktok || null,
    };

    // 2. Fetch ALL LP pages that should be online for this domain.
    //    Accept BOTH legacy ('published') and Cloudflare ('success') statuses,
    //    plus any record that has a published_url and HTML — that's enough
    //    evidence the page was once live and we should not drop it now.
    const { data: lps, error: lpErr } = await supabase
      .from('cloned_landing_pages')
      .select('id, name, page_path, is_homepage, transformed_html, original_html, published_url, publish_status')
      .eq('target_domain', domain);
    if (lpErr) throw new Error(`LP fetch: ${lpErr.message}`);

    const eligibleLps = (lps || []).filter((p) => {
      const html = p.transformed_html || p.original_html;
      if (!html) return false;
      const status = p.publish_status || '';
      const wasOnline = status === 'success' || status === 'published' || !!p.published_url;
      return wasOnline;
    });

    // 3. Fetch ALL blog publications for this domain.
    const { data: blogs, error: blogErr } = await supabase
      .from('product_blog_publications')
      .select('id, page_path, html_content, published_url, publish_status')
      .eq('target_domain', domain);
    if (blogErr) console.warn(`[bulk-cf] blog fetch warning: ${blogErr.message}`);

    const eligibleBlogs = (blogs || []).filter((b) => {
      if (!b.html_content) return false;
      const status = b.publish_status || '';
      return status === 'published' || status === 'success' || !!b.published_url;
    });

    console.log(`[bulk-cf] Eligible: ${eligibleLps.length} LPs + ${eligibleBlogs.length} blogs`);

    if (eligibleLps.length === 0 && eligibleBlogs.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Nenhuma página elegível encontrada para ${domain}. Nada será republicado para evitar derrubar o site.`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Build the full file set, dedup'd by manifest path.
    type Entry = { path: string; html: string; sourceType: 'lp' | 'blog'; sourceId: string };
    const byPath = new Map<string, Entry>();

    for (const lp of eligibleLps) {
      const path = buildFilePath(lp.page_path, !!lp.is_homepage);
      let html = injectTrackingScripts(lp.transformed_html || lp.original_html || '', trackingPixels);
      html = fixSeoForServedUrl(html, domain, path);
      // Homepage wins over a colliding path
      if (!byPath.has(path) || lp.is_homepage) {
        byPath.set(path, { path, html, sourceType: 'lp', sourceId: lp.id });
      }
    }
    for (const blog of eligibleBlogs) {
      const path = buildFilePath(blog.page_path, false);
      if (byPath.has(path)) continue;
      let html = injectTrackingScripts(blog.html_content || '', trackingPixels);
      html = fixSeoForServedUrl(html, domain, path);
      byPath.set(path, { path, html, sourceType: 'blog', sourceId: blog.id });
    }

    const entries = Array.from(byPath.values());
    console.log(`[bulk-cf] Manifest will contain ${entries.length} files`);

    // 5. Hash + payload
    const hashed = await Promise.all(entries.map(async (e) => ({
      ...e,
      hash: await calculateBlake3Hash(e.html),
    })));

    // 6. Get JWT upload token
    const tokenRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`,
      { headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` } }
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.success || !tokenData.result?.jwt) {
      throw new Error(`Upload token falhou: ${tokenData.errors?.[0]?.message || tokenRes.status}`);
    }
    const jwt = tokenData.result.jwt;

    // 7. Upload contents (CF accepts up to ~5MB per request; chunk by safety)
    const CHUNK = 50;
    for (let i = 0; i < hashed.length; i += CHUNK) {
      const slice = hashed.slice(i, i + CHUNK);
      const payload = slice.map((f) => ({
        key: f.hash,
        value: stringToBase64(f.html),
        metadata: { contentType: 'text/html' },
        base64: true,
      }));
      const upRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.success) {
        throw new Error(`Upload chunk ${i} falhou: ${upData.errors?.[0]?.message || upRes.status}`);
      }
    }

    // 8. Upsert hashes
    const allHashes = hashed.map((f) => f.hash);
    const upsertRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: allHashes }),
    });
    const upsertData = await upsertRes.json();
    if (!upsertRes.ok || !upsertData.success) {
      throw new Error(`Upsert hashes falhou: ${upsertData.errors?.[0]?.message || upsertRes.status}`);
    }

    // 9. Single deployment with FULL manifest
    const manifest: Record<string, string> = {};
    for (const f of hashed) manifest[f.path] = f.hash;

    const formData = new FormData();
    formData.append('manifest', JSON.stringify(manifest));

    const deployRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
        body: formData,
      }
    );
    const deployData = await deployRes.json();
    if (!deployRes.ok || !deployData.success) {
      throw new Error(`Deployment falhou: ${deployData.errors?.[0]?.message || deployRes.status}`);
    }

    const deployment = deployData.result;
    console.log(`[bulk-cf] Deployment OK: ${deployment.id} (${deployment.url})`);

    // 10. Update DB so each item has a fresh published_url + status.
    const nowIso = new Date().toISOString();
    for (const f of hashed) {
      const publishedUrl = `https://${domain}${f.path === '/index.html' ? '/' : f.path.replace(/\/index\.html$/, '/')}`;
      if (f.sourceType === 'lp') {
        await supabase
          .from('cloned_landing_pages')
          .update({
            publish_status: 'success',
            status: 'published',
            published_url: publishedUrl,
            published_at: nowIso,
            cloudflare_deployment_id: deployment.id,
            publish_error_message: null,
          })
          .eq('id', f.sourceId);
      } else {
        await supabase
          .from('product_blog_publications')
          .update({
            publish_status: 'published',
            published_url: publishedUrl,
            published_at: nowIso,
            cloudflare_deployment_id: deployment.id,
            publish_error_message: null,
          })
          .eq('id', f.sourceId);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      domain,
      deploymentId: deployment.id,
      deploymentUrl: deployment.url,
      filesDeployed: entries.length,
      lps: eligibleLps.length,
      blogs: eligibleBlogs.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[bulk-cf] ERROR:', error?.message || error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
