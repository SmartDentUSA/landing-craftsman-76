/**
 * Blog Index Template
 * Renders a "news portal" style /blog index page with a card grid,
 * pagination, sister-blogs sidebar and JSON-LD Blog/ItemList schema.
 */

export interface BlogIndexPost {
  name: string;
  url: string;
  description: string;
  ogImage: string | null;
  brand: string | null;
  publishedTime: string | null;
  formattedDate: string;
  readingTimeMin: number;
  author: string | null;
}

export interface SisterBlog {
  domain: string;
  name: string;
  url: string;
  hasPosts: boolean;
}

export interface RenderBlogIndexInput {
  domain: string;
  siteName: string;
  siteDescription: string;
  themeColor: string;
  blogBaseUrl: string; // e.g. https://dentala.com.br/blog
  lang: string;        // 'pt' | 'en' | 'es'
  posts: BlogIndexPost[];
  page: number;
  totalPages: number;
  totalPosts: number;
  sisterBlogs: SisterBlog[];
  availableLangs: string[];
  trackingHead?: string;
  trackingBody?: string;
}

const LANG_LABEL: Record<string, string> = { pt: 'Português', en: 'English', es: 'Español' };
const LANG_HREFLANG: Record<string, string> = { pt: 'pt-BR', en: 'en', es: 'es' };

const escapeHtml = (s: string): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function renderCard(post: BlogIndexPost, themeColor: string): string {
  const thumbStyle = post.ogImage
    ? `background-image:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.55) 100%),url('${escapeHtml(post.ogImage)}');background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg,${themeColor},#1a1a2e);`;

  const badge = post.brand
    ? `<span class="post-badge">${escapeHtml(post.brand)}</span>`
    : '';

  return `<article class="post-card">
  <a href="${escapeHtml(post.url)}" class="post-link" aria-label="${escapeHtml(post.name)}">
    <div class="post-thumb" style="${thumbStyle}">
      ${badge}
      ${!post.ogImage ? '<div class="post-thumb-fallback">📰</div>' : ''}
    </div>
    <div class="post-body">
      <div class="post-meta">
        ${post.formattedDate ? `<time datetime="${escapeHtml(post.publishedTime || '')}">${escapeHtml(post.formattedDate)}</time>` : ''}
        ${post.readingTimeMin ? `<span class="dot">·</span><span>${post.readingTimeMin} min de leitura</span>` : ''}
      </div>
      <h2 class="post-title">${escapeHtml(post.name)}</h2>
      ${post.description ? `<p class="post-excerpt">${escapeHtml(post.description)}</p>` : ''}
      <span class="post-cta">Ler artigo →</span>
    </div>
  </a>
</article>`;
}

function renderPagination(input: RenderBlogIndexInput): string {
  if (input.totalPages <= 1) return '';
  const base = input.blogBaseUrl;
  const link = (n: number) => (n === 1 ? base : `${base}/page/${n}`);
  const items: string[] = [];
  if (input.page > 1) {
    items.push(`<a class="page-nav" href="${escapeHtml(link(input.page - 1))}">← Anterior</a>`);
  }
  for (let i = 1; i <= input.totalPages; i++) {
    if (i === input.page) {
      items.push(`<span class="page-num current">${i}</span>`);
    } else {
      items.push(`<a class="page-num" href="${escapeHtml(link(i))}">${i}</a>`);
    }
  }
  if (input.page < input.totalPages) {
    items.push(`<a class="page-nav" href="${escapeHtml(link(input.page + 1))}">Próxima →</a>`);
  }
  return `<nav class="pagination" aria-label="Paginação">${items.join('')}</nav>`;
}

function renderLangSwitcher(input: RenderBlogIndexInput): string {
  if (input.availableLangs.length <= 1) return '';
  const buildUrl = (l: string) => {
    if (l === 'pt') return `https://${input.domain}/blog`;
    return `https://${input.domain}/${l}/blog`;
  };
  return `<div class="lang-switcher" role="group" aria-label="Idioma">
    ${input.availableLangs
      .map(
        (l) =>
          `<a href="${escapeHtml(buildUrl(l))}" class="${l === input.lang ? 'active' : ''}">${LANG_LABEL[l] || l}</a>`,
      )
      .join('')}
  </div>`;
}

function renderSisterBlogs(input: RenderBlogIndexInput): string {
  if (!input.sisterBlogs.length) return '';
  return `<aside class="sister-blogs" aria-label="Outros blogs">
    <h3>📚 Outros blogs do ecossistema Smart Dent</h3>
    <div class="sister-grid">
      ${input.sisterBlogs
        .map(
          (b) => `<a href="${escapeHtml(b.url)}" class="sister-link${b.hasPosts ? '' : ' empty'}">
        <span class="sister-name">${escapeHtml(b.name)}</span>
        <span class="sister-domain">${escapeHtml(b.domain)}</span>
      </a>`,
        )
        .join('')}
    </div>
  </aside>`;
}

function renderJsonLd(input: RenderBlogIndexInput): string {
  const blogPosts = input.posts.map((p, idx) => ({
    '@type': 'BlogPosting',
    position: (input.page - 1) * input.posts.length + idx + 1,
    headline: p.name,
    url: p.url,
    description: p.description || undefined,
    image: p.ogImage || undefined,
    datePublished: p.publishedTime || undefined,
    author: p.author ? { '@type': 'Person', name: p.author } : undefined,
  }));

  const itemList = {
    '@type': 'ItemList',
    itemListElement: input.posts.map((p, idx) => ({
      '@type': 'ListItem',
      position: (input.page - 1) * input.posts.length + idx + 1,
      url: p.url,
      name: p.name,
    })),
  };

  const blog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `Blog — ${input.siteName}`,
    description: input.siteDescription,
    url: input.blogBaseUrl,
    inLanguage: LANG_HREFLANG[input.lang] || input.lang,
    publisher: {
      '@type': 'Organization',
      name: input.siteName,
      url: `https://${input.domain}`,
    },
    blogPost: blogPosts,
    mainEntity: itemList,
  };

  return `<script type="application/ld+json">${JSON.stringify(blog)}</script>`;
}

export function renderBlogIndex(input: RenderBlogIndexInput): string {
  const title = `Blog ${input.siteName} — Insights, Guias e Tutoriais${input.page > 1 ? ` (página ${input.page})` : ''}`;
  const description =
    input.siteDescription?.slice(0, 155) ||
    `Artigos, guias e tutoriais técnicos sobre odontologia digital publicados em ${input.siteName}.`;
  const canonical = input.page === 1 ? input.blogBaseUrl : `${input.blogBaseUrl}/page/${input.page}`;
  const themeColor = input.themeColor || '#0f172a';

  const cards = input.posts.length
    ? `<section class="posts-grid">${input.posts.map((p) => renderCard(p, themeColor)).join('\n')}</section>`
    : `<section class="empty-state">
        <p>Nenhum artigo publicado ainda neste idioma. Em breve novos conteúdos.</p>
      </section>`;

  return `<!doctype html>
<html lang="${LANG_HREFLANG[input.lang] || 'pt-BR'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="${escapeHtml(input.siteName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="theme-color" content="${escapeHtml(themeColor)}">
${input.availableLangs
  .map((l) => {
    const href = l === 'pt' ? `https://${input.domain}/blog` : `https://${input.domain}/${l}/blog`;
    return `<link rel="alternate" hreflang="${LANG_HREFLANG[l] || l}" href="${escapeHtml(href)}">`;
  })
  .join('\n')}
${renderJsonLd(input)}
${input.trackingHead || ''}
<style>
:root{--theme:${themeColor};--bg:#0a0e1a;--surface:#111827;--surface-2:#1a1f2e;--text:#e5e7eb;--muted:#9ca3af;--border:rgba(255,255,255,.08);--accent:#60a5fa}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
.blog-hero{padding:64px 0 40px;background:linear-gradient(135deg,var(--surface) 0%,var(--bg) 100%);border-bottom:1px solid var(--border)}
.breadcrumb{font-size:13px;color:var(--muted);margin-bottom:16px}
.breadcrumb a{color:var(--accent)}
.blog-hero h1{font-size:clamp(28px,4vw,44px);line-height:1.15;margin:0 0 16px;font-weight:800;letter-spacing:-.02em}
.blog-hero .lead{font-size:16px;color:var(--muted);max-width:720px;margin:0 0 24px}
.meta-bar{display:flex;flex-wrap:wrap;align-items:center;gap:16px;font-size:13px;color:var(--muted)}
.meta-bar .pill{background:var(--surface-2);padding:6px 12px;border-radius:999px;border:1px solid var(--border)}
.lang-switcher{display:inline-flex;gap:4px;background:var(--surface-2);border-radius:999px;padding:4px;border:1px solid var(--border)}
.lang-switcher a{padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;color:var(--muted);transition:all .2s}
.lang-switcher a.active{background:var(--theme);color:#fff}
.lang-switcher a:hover:not(.active){color:var(--text)}
main.blog-main{padding:48px 0 64px}
.posts-grid{display:grid;grid-template-columns:1fr;gap:24px}
@media(min-width:640px){.posts-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.posts-grid{grid-template-columns:repeat(3,1fr)}}
.post-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:transform .2s,border-color .2s,box-shadow .2s;display:flex;flex-direction:column}
.post-card:hover{transform:translateY(-4px);border-color:var(--theme);box-shadow:0 12px 32px -16px rgba(0,0,0,.6)}
.post-link{display:flex;flex-direction:column;height:100%}
.post-thumb{aspect-ratio:16/10;position:relative;display:flex;align-items:flex-end;padding:14px}
.post-thumb-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px;opacity:.4}
.post-badge{position:relative;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.15)}
.post-body{padding:18px 20px 22px;flex:1;display:flex;flex-direction:column}
.post-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-bottom:10px}
.post-meta .dot{opacity:.5}
.post-title{font-size:18px;line-height:1.3;font-weight:700;margin:0 0 10px;color:var(--text);letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.post-excerpt{font-size:14px;color:var(--muted);margin:0 0 14px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:1}
.post-cta{font-size:13px;font-weight:600;color:var(--accent);margin-top:auto}
.post-card:hover .post-cta{color:var(--theme);filter:brightness(1.4)}
.empty-state{text-align:center;padding:80px 20px;color:var(--muted);background:var(--surface);border-radius:14px;border:1px dashed var(--border)}
.pagination{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin:48px 0 0;padding-top:32px;border-top:1px solid var(--border)}
.page-num,.page-nav{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 12px;border-radius:8px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:13px;font-weight:600;transition:all .2s}
.page-num:hover,.page-nav:hover{background:var(--surface-2);border-color:var(--theme)}
.page-num.current{background:var(--theme);color:#fff;border-color:var(--theme)}
.sister-blogs{margin-top:64px;padding:32px;background:var(--surface);border:1px solid var(--border);border-radius:14px}
.sister-blogs h3{margin:0 0 20px;font-size:16px;font-weight:700;color:var(--text)}
.sister-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.sister-link{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);transition:all .2s}
.sister-link:hover{border-color:var(--theme);transform:translateY(-2px)}
.sister-link.empty{opacity:.5}
.sister-name{font-size:13px;font-weight:600;color:var(--text)}
.sister-domain{font-size:11px;color:var(--muted)}
footer.site-footer{margin-top:64px;padding:32px 0;background:var(--surface);border-top:1px solid var(--border);text-align:center;font-size:12px;color:var(--muted)}
footer.site-footer a{color:var(--accent);margin:0 8px}
</style>
</head>
<body>
${input.trackingBody || ''}
<header class="blog-hero">
  <div class="container">
    <nav class="breadcrumb"><a href="https://${escapeHtml(input.domain)}/">Home</a> / Blog${input.page > 1 ? ` / Página ${input.page}` : ''}</nav>
    <h1>Blog ${escapeHtml(input.siteName)}</h1>
    <p class="lead">${escapeHtml(description)}</p>
    <div class="meta-bar">
      <span class="pill">📰 ${input.totalPosts} ${input.totalPosts === 1 ? 'artigo publicado' : 'artigos publicados'}</span>
      ${input.totalPages > 1 ? `<span class="pill">Página ${input.page} de ${input.totalPages}</span>` : ''}
      ${renderLangSwitcher(input)}
    </div>
  </div>
</header>
<main class="blog-main">
  <div class="container">
    ${cards}
    ${renderPagination(input)}
    ${renderSisterBlogs(input)}
  </div>
</main>
<footer class="site-footer">
  <div class="container">
    <p>© ${new Date().getFullYear()} ${escapeHtml(input.siteName)} — Todos os direitos reservados.</p>
    <p><a href="https://${escapeHtml(input.domain)}/">Página inicial</a> · <a href="${escapeHtml(input.blogBaseUrl)}">Blog</a></p>
  </div>
</footer>
</body>
</html>`;
}
