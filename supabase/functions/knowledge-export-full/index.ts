// knowledge-export-full v2 — Cobertura 100%
// Exporta TODO o conteúdo do sistema (cards, tabelas, mensagens, mídias)
// em JSON estruturado + HTML formatado por seção + @graph JSON-LD unificado.
//
// GET /functions/v1/knowledge-export-full
//   ?slug=&category=&include=&format=&since=&limit=&offset=
//   &embed_html=true&approved_only=true&pretty=false&schema_only=false
//
// include = all | products,blogs,landing_pages,videos,reviews,kols,spin,
//                 milestones,company,categories,links,coupons,lia,prompts
//
// Público, sem JWT. Usa SERVICE_ROLE internamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// ---------- helpers ----------

const escapeHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const asArray = <T = any>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : [];

const ytThumb = (url?: string): string => {
  if (!url) return "";
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : "";
};

const ytId = (url?: string): string => {
  if (!url) return "";
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : "";
};

const normVideo = (v: any) => {
  if (!v) return null;
  if (typeof v === "string") {
    return { url: v, title: "", description: "", thumbnail: ytThumb(v) };
  }
  return {
    url: v.url || v.video_url || v.src || "",
    title: v.title || v.name || "",
    description: v.description || v.caption || v.summary || "",
    thumbnail: v.thumbnail || v.thumb || ytThumb(v.url || v.video_url),
  };
};

const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.warn("safe() fallback:", (e as Error).message);
    return fallback;
  }
};

// ---------- HTML renderers ----------

function renderProductCard(p: any, company: any, msgs: any): string {
  const benefits = asArray<string>(p.benefits);
  const features = asArray<string>(p.features);
  const faq = asArray<any>(p.faq);
  const techSpecs = asArray<any>(p.technical_specifications);
  const gallery = asArray<any>(p.images_gallery);
  const yt = asArray<any>(p.youtube_videos).map(normVideo).filter(Boolean);
  const ig = asArray<any>(p.instagram_videos).map(normVideo).filter(Boolean);
  const tk = asArray<any>(p.tiktok_videos).map(normVideo).filter(Boolean);
  const tech = asArray<any>(p.technical_videos).map(normVideo).filter(Boolean);
  const test = asArray<any>(p.testimonial_videos).map(normVideo).filter(Boolean);
  const cs = asArray<any>(msgs?.cs);
  const after = asArray<any>(msgs?.aftersales);

  const priceBlock =
    p.price != null
      ? `<p class="price"><strong>${escapeHtml(p.currency || "BRL")} ${escapeHtml(p.price)}</strong>${p.promo_price ? ` <s>${escapeHtml(p.promo_price)}</s>` : ""}</p>`
      : "";

  const galleryHtml = gallery.length
    ? `<div class="gallery">${gallery
        .map(
          (img: any) =>
            `<img loading="lazy" src="${escapeHtml(typeof img === "string" ? img : img.url)}" alt="${escapeHtml(p.name)}"/>`,
        )
        .join("")}</div>`
    : "";

  const videoBlock = (label: string, list: any[]) =>
    list.length
      ? `<section class="videos videos-${label.toLowerCase()}"><h3>${label}</h3>${list
          .map(
            (v) =>
              `<figure><a href="${escapeHtml(v.url)}" target="_blank" rel="noopener">${v.thumbnail ? `<img loading="lazy" src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title || p.name)}"/>` : ""}</a><figcaption><strong>${escapeHtml(v.title)}</strong>${v.description ? `<p>${escapeHtml(v.description)}</p>` : ""}</figcaption></figure>`,
          )
          .join("")}</section>`
      : "";

  const faqHtml = faq.length
    ? `<section class="faq"><h3>Perguntas frequentes</h3>${faq
        .map(
          (f: any) =>
            `<details><summary>${escapeHtml(f.question || f.q)}</summary><div>${escapeHtml(f.answer || f.a)}</div></details>`,
        )
        .join("")}</section>`
    : "";

  const specsHtml = techSpecs.length
    ? `<section class="tech-specs"><h3>Especificações técnicas</h3><table><tbody>${techSpecs
        .map(
          (s: any) =>
            `<tr><th>${escapeHtml(s.label || s.key || s.name)}</th><td>${escapeHtml(s.value || s.val)}</td></tr>`,
        )
        .join("")}</tbody></table></section>`
    : "";

  const messagesHtml =
    cs.length || after.length
      ? `<section class="whatsapp-sequence"><h3>Sequência WhatsApp</h3>
        ${cs.length ? `<div class="cs"><h4>CS (até 10 mensagens)</h4><ol>${cs.map((m: any) => `<li>${escapeHtml(m.message_text || m.content || m.text || JSON.stringify(m))}</li>`).join("")}</ol></div>` : ""}
        ${after.length ? `<div class="after"><h4>Pós-venda</h4><ol>${after.map((m: any) => `<li>${escapeHtml(m.message_text || m.content || m.text || JSON.stringify(m))}</li>`).join("")}</ol></div>` : ""}
      </section>`
      : "";

  const ctaHtml = p.product_url
    ? `<a class="cta primary" href="${escapeHtml(p.product_url)}" target="_blank" rel="noopener">Ver produto</a>`
    : "";

  return `<article class="indexable-content product-card" data-product-id="${escapeHtml(p.id)}" data-slug="${escapeHtml(p.slug || "")}">
  <header>
    <h2>${escapeHtml(p.name)}</h2>
    ${p.category ? `<p class="category">${escapeHtml(p.category)}${p.subcategory ? ` › ${escapeHtml(p.subcategory)}` : ""}</p>` : ""}
    ${priceBlock}
  </header>
  ${p.image_url ? `<img class="hero" loading="lazy" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}"/>` : ""}
  ${p.description ? `<div class="description">${escapeHtml(p.description)}</div>` : ""}
  ${benefits.length ? `<section class="benefits"><h3>Benefícios</h3><ul>${benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul></section>` : ""}
  ${features.length ? `<section class="features"><h3>Características</h3><ul>${features.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul></section>` : ""}
  ${specsHtml}
  ${galleryHtml}
  ${videoBlock("YouTube", yt)}
  ${videoBlock("Instagram", ig)}
  ${videoBlock("TikTok", tk)}
  ${videoBlock("Tecnicos", tech)}
  ${videoBlock("Depoimentos", test)}
  ${faqHtml}
  ${messagesHtml}
  ${ctaHtml}
  ${company?.company_name ? `<footer class="brand">${escapeHtml(company.company_name)}</footer>` : ""}
</article>`;
}

function renderReviewCard(r: any): string {
  const rating = Number(r.rating || 5);
  return `<article class="indexable-content review-card" data-review-id="${escapeHtml(r.id)}">
  <header>
    <strong>${escapeHtml(r.author_name || "Anônimo")}</strong>
    <span class="rating" aria-label="${rating} estrelas">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>
    ${r.review_date ? `<time datetime="${escapeHtml(r.review_date)}">${escapeHtml(r.review_date)}</time>` : ""}
  </header>
  ${r.review_text ? `<blockquote>${escapeHtml(r.review_text)}</blockquote>` : ""}
  ${r.response_from_owner ? `<aside class="owner-response"><strong>Resposta:</strong> ${escapeHtml(r.response_from_owner)}</aside>` : ""}
</article>`;
}

function renderVideoTestimonialCard(v: any): string {
  const thumb = ytThumb(v.youtube_url);
  return `<article class="indexable-content testimonial-video-card" data-id="${escapeHtml(v.id)}">
  <header>
    <h3>${escapeHtml(v.client_name || "Depoimento")}</h3>
    ${v.profession ? `<p class="profession">${escapeHtml(v.profession)}${v.location ? ` — ${escapeHtml(v.location)}` : ""}</p>` : ""}
  </header>
  ${v.youtube_url ? `<a href="${escapeHtml(v.youtube_url)}" target="_blank" rel="noopener">${thumb ? `<img loading="lazy" src="${thumb}" alt="${escapeHtml(v.client_name || "Depoimento")}"/>` : "Ver depoimento"}</a>` : ""}
  ${v.testimonial_text ? `<blockquote>${escapeHtml(v.testimonial_text)}</blockquote>` : ""}
  ${v.product_name ? `<p class="product">Produto: <strong>${escapeHtml(v.product_name)}</strong></p>` : ""}
</article>`;
}

function renderMilestoneCard(m: any): string {
  return `<article class="indexable-content milestone-card" data-id="${escapeHtml(m.id)}" data-year="${escapeHtml(m.year)}">
  <header>
    <time datetime="${escapeHtml(m.year)}${m.month ? `-${String(m.month).padStart(2, "0")}` : ""}">${escapeHtml(m.year)}</time>
    <h3>${escapeHtml(m.title)}</h3>
  </header>
  ${m.image_url ? `<img loading="lazy" src="${escapeHtml(m.image_url)}" alt="${escapeHtml(m.title)}"/>` : ""}
  ${m.description ? `<p>${escapeHtml(m.description)}</p>` : ""}
  ${m.impact ? `<p class="impact"><strong>Impacto:</strong> ${escapeHtml(m.impact)}</p>` : ""}
  ${m.legacy ? `<p class="legacy"><strong>Legado:</strong> ${escapeHtml(m.legacy)}</p>` : ""}
</article>`;
}

function renderKolCard(k: any): string {
  return `<article class="indexable-content kol-card" data-id="${escapeHtml(k.id)}">
  <header>
    ${k.photo_url ? `<img loading="lazy" src="${escapeHtml(k.photo_url)}" alt="${escapeHtml(k.name)}"/>` : ""}
    <h3>${escapeHtml(k.name)}</h3>
    ${k.specialty ? `<p class="specialty">${escapeHtml(k.specialty)}</p>` : ""}
  </header>
  ${k.bio ? `<p>${escapeHtml(k.bio)}</p>` : ""}
  ${k.instagram_handle ? `<a href="https://instagram.com/${escapeHtml(k.instagram_handle.replace("@", ""))}" rel="noopener">Instagram</a>` : ""}
</article>`;
}

function renderSpinCard(s: any): string {
  const journey = s.spin_journey || {};
  const quotes = asArray<any>(s.real_quotes);
  const cases = asArray<any>(s.success_cases);
  const metrics = asArray<any>(s.impact_metrics);
  const faq = asArray<any>(s.faq);

  return `<article class="indexable-content spin-card" data-id="${escapeHtml(s.id)}">
  <header>
    <h2>${escapeHtml(s.title || s.solution_name || "Solução SPIN")}</h2>
    ${s.subtitle ? `<p>${escapeHtml(s.subtitle)}</p>` : ""}
  </header>
  ${s.sales_pitch ? `<section class="sales-pitch"><h3>Sales Pitch</h3><p>${escapeHtml(s.sales_pitch)}</p></section>` : ""}
  ${journey.desire || journey.pain || journey.result ? `<section class="journey"><h3>Jornada SPIN</h3>
    ${journey.desire ? `<p><strong>Desejo:</strong> ${escapeHtml(journey.desire)}</p>` : ""}
    ${journey.pain ? `<p><strong>Dor:</strong> ${escapeHtml(journey.pain)}</p>` : ""}
    ${journey.result ? `<p><strong>Resultado:</strong> ${escapeHtml(journey.result)}</p>` : ""}
  </section>` : ""}
  ${metrics.length ? `<section class="metrics"><h3>Métricas de Impacto</h3><ul>${metrics.map((m: any) => `<li><strong>${escapeHtml(m.value || m.metric)}</strong> — ${escapeHtml(m.label || m.description)}</li>`).join("")}</ul></section>` : ""}
  ${quotes.length ? `<section class="quotes"><h3>Frases reais</h3>${quotes.map((q: any) => `<blockquote>${escapeHtml(q.text || q)}${q.author ? `<cite> — ${escapeHtml(q.author)}</cite>` : ""}</blockquote>`).join("")}</section>` : ""}
  ${cases.length ? `<section class="cases"><h3>Casos de Sucesso</h3>${cases.map((c: any) => `<article><h4>${escapeHtml(c.title || c.client)}</h4><p>${escapeHtml(c.description || c.text)}</p></article>`).join("")}</section>` : ""}
  ${faq.length ? `<section class="faq"><h3>FAQ</h3>${faq.map((f: any) => `<details><summary>${escapeHtml(f.question || f.q)}</summary><div>${escapeHtml(f.answer || f.a)}</div></details>`).join("")}</section>` : ""}
  ${s.whatsapp_complete_message ? `<section class="whatsapp"><h3>Mensagem WhatsApp completa</h3><pre>${escapeHtml(s.whatsapp_complete_message)}</pre></section>` : ""}
</article>`;
}

function renderLandingPageCard(lp: any): string {
  if (lp.consolidated_html_cache) {
    return `<article class="indexable-content landing-page-card" data-id="${escapeHtml(lp.id)}">${lp.consolidated_html_cache}</article>`;
  }
  return `<article class="indexable-content landing-page-card" data-id="${escapeHtml(lp.id)}">
    <h2>${escapeHtml(lp.name)}</h2>
    <p>Status: ${escapeHtml(lp.status)}</p>
  </article>`;
}

function renderBlogCard(b: any): string {
  if (b.html_content) {
    return `<article class="indexable-content blog-card" data-slug="${escapeHtml(b.slug || "")}">${b.html_content}</article>`;
  }
  return `<article class="indexable-content blog-card" data-slug="${escapeHtml(b.slug || "")}">
    <h2>${escapeHtml(b.title || "")}</h2>
    ${b.path ? `<a href="${escapeHtml(b.path)}">Ler artigo</a>` : ""}
  </article>`;
}

// ---------- JSON-LD builders ----------

function buildProductSchema(p: any, company: any, agg: any): any {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    image: [
      p.image_url,
      ...asArray<any>(p.images_gallery).map((i) =>
        typeof i === "string" ? i : i.url,
      ),
    ].filter(Boolean),
    sku: p.id,
    brand: { "@type": "Brand", name: company?.company_name || "Smart Dent" },
    url: p.product_url || p.canonical_url || undefined,
  };
  if (p.price != null) {
    schema.offers = {
      "@type": "Offer",
      price: String(p.price),
      priceCurrency: p.currency || "BRL",
      availability: "https://schema.org/InStock",
      url: p.product_url || undefined,
    };
  }
  if (agg?.ratingValue) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: agg.ratingValue,
      reviewCount: agg.reviewCount,
      bestRating: agg.bestRating || "5",
    };
  }
  const faq = asArray<any>(p.faq);
  if (faq.length) {
    schema.mainEntity = faq.map((f: any) => ({
      "@type": "Question",
      name: f.question || f.q,
      acceptedAnswer: { "@type": "Answer", text: f.answer || f.a },
    }));
  }
  return schema;
}

function buildMilestoneSchema(m: any): any {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: m.title,
    startDate: `${m.year}${m.month ? `-${String(m.month).padStart(2, "0")}` : ""}${m.day ? `-${String(m.day).padStart(2, "0")}` : ""}`,
    description: m.description || undefined,
    location: m.location || undefined,
    image: m.image_url || undefined,
  };
}

function buildReviewSchema(r: any, company: any): any {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    author: { "@type": "Person", name: r.author_name || "Anônimo" },
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(r.rating || 5),
      bestRating: "5",
    },
    reviewBody: r.review_text,
    datePublished: r.review_date,
    itemReviewed: { "@type": "Organization", name: company?.company_name || "Smart Dent" },
  };
}

function buildVideoSchema(v: any): any {
  const id = ytId(v.youtube_url);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.client_name ? `Depoimento — ${v.client_name}` : "Depoimento",
    description: v.testimonial_text || v.profession || undefined,
    thumbnailUrl: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined,
    contentUrl: v.youtube_url,
    embedUrl: id ? `https://www.youtube.com/embed/${id}` : undefined,
    uploadDate: v.created_at,
  };
}

// ---------- main ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    const embedHtml = url.searchParams.get("embed_html") !== "false";
    const approvedOnly = url.searchParams.get("approved_only") !== "false";
    const since = url.searchParams.get("since") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const pretty = url.searchParams.get("pretty") === "true";
    const schemaOnly = url.searchParams.get("schema_only") === "true";
    const includeParam = (url.searchParams.get("include") || "all").toLowerCase();
    const wants = (key: string) =>
      includeParam === "all" ||
      includeParam.split(",").map((s) => s.trim()).includes(key);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Knowledge base agregada
    const { data: kb, error: kbErr } = await supabase.rpc(
      "get_complete_knowledge_base",
      {
        p_include_company: wants("company"),
        p_include_categories: wants("categories") || wants("all"),
        p_include_links: wants("links") || wants("all"),
        p_include_products: wants("products"),
        p_include_video_testimonials:
          wants("videos") || wants("video_testimonials"),
        p_include_google_reviews: wants("reviews"),
        p_include_kols: wants("kols"),
        p_include_spin_solutions: wants("spin") || wants("spin_solutions"),
        p_include_blog_posts: false,
        p_include_landing_pages: false,
        p_approved_only: approvedOnly,
        p_category: category ?? null,
        p_limit: limit,
        p_offset: offset,
      },
    );
    if (kbErr) throw new Error(`KB RPC: ${kbErr.message}`);

    const company = kb?.company_profile ?? null;
    const reviewsAgg = company?.google_aggregate_rating ?? null;

    // 2) Produtos enriquecidos
    let products = asArray<any>(kb?.products).map((wrap: any) => {
      const p = wrap.product || wrap;
      const msgs = {
        cs: wrap.cs_messages ?? [],
        aftersales: wrap.aftersales_messages ?? [],
      };
      const enriched: any = {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        price: p.price,
        promo_price: p.promo_price,
        currency: p.currency,
        description: p.description,
        applications: p.applications,
        benefits: asArray(p.benefits),
        features: asArray(p.features),
        keywords: asArray(p.keywords),
        target_audience: asArray(p.target_audience),
        tags: asArray(p.tags),
        faq: asArray(p.faq),
        technical_specifications: asArray(p.technical_specifications),
        image_url: p.image_url,
        images_gallery: asArray(p.images_gallery),
        videos: {
          youtube: asArray(p.youtube_videos).map(normVideo).filter(Boolean),
          instagram: asArray(p.instagram_videos).map(normVideo).filter(Boolean),
          tiktok: asArray(p.tiktok_videos).map(normVideo).filter(Boolean),
          technical: asArray(p.technical_videos).map(normVideo).filter(Boolean),
          testimonial: asArray(p.testimonial_videos).map(normVideo).filter(Boolean),
        },
        ctas: {
          product_url: p.product_url,
          resource_cta1: p.resource_cta1,
          resource_cta2: p.resource_cta2,
          resource_cta3: p.resource_cta3,
        },
        seo: {
          seo_title: p.seo_title_override,
          seo_description: p.seo_description_override,
          canonical_url: p.canonical_url,
        },
        merchant: {
          gtin: p.gtin,
          mpn: p.mpn,
          brand: p.brand,
          google_product_category: p.google_product_category,
        },
        messages: msgs,
        coupons: wrap.coupons ?? [],
        google_ads: wrap.google_ads ?? [],
        completion_score: wrap.completion_score ?? null,
        updated_at: p.updated_at,
        created_at: p.created_at,
        schema_jsonld: buildProductSchema(p, company, reviewsAgg),
      };
      if (embedHtml) enriched.html_card = renderProductCard(p, company, msgs);
      return enriched;
    });

    if (slug) {
      const s = slug.toLowerCase();
      products = products.filter(
        (p) =>
          (p.slug || "").toLowerCase().includes(s) ||
          (p.name || "").toLowerCase().includes(s),
      );
    }
    if (since) {
      const t = new Date(since).getTime();
      products = products.filter((p) => new Date(p.updated_at).getTime() > t);
    }

    // 3) Blogs (generated_pages)
    let blogs: any[] = [];
    if (wants("blogs")) {
      blogs = await safe(async () => {
        let q = supabase
          .from("generated_pages")
          .select(
            "id, title, slug, path, html_content, schema_json_ld, tags, page_type, published, published_url, published_at, canonical_url, updated_at, created_at",
          )
          .in("page_type", [
            "product_blog",
            "consolidated_blog",
            "landing_page",
            "spin_landing_page",
          ])
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (approvedOnly) q = q.eq("published", true);
        if (since) q = q.gt("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []).map((b: any) => ({
          ...b,
          ...(embedHtml ? { html_card: renderBlogCard(b) } : {}),
        }));
      }, []);
    }

    // 4) Landing pages
    let landingPages: any[] = [];
    if (wants("landing_pages")) {
      landingPages = await safe(async () => {
        let q = supabase
          .from("landing_pages")
          .select(
            "id, name, status, template, data, selected_product_ids, consolidated_html_cache, version, last_modified, updated_at, created_at",
          )
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (approvedOnly) q = q.eq("status", "published");
        if (since) q = q.gt("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []).map((lp: any) => ({
          id: lp.id,
          name: lp.name,
          status: lp.status,
          template: lp.template,
          data: lp.data,
          selected_product_ids: lp.selected_product_ids,
          version: lp.version,
          updated_at: lp.updated_at,
          created_at: lp.created_at,
          html: embedHtml ? lp.consolidated_html_cache || null : undefined,
          html_card: embedHtml ? renderLandingPageCard(lp) : undefined,
        }));
      }, []);
    }

    // 5) Milestones
    let milestones: any[] = [];
    if (wants("milestones")) {
      milestones = await safe(async () => {
        const { data, error } = await supabase
          .from("company_milestones")
          .select("*")
          .eq("is_published", true)
          .order("display_order", { ascending: true, nullsFirst: false })
          .order("year", { ascending: false });
        if (error) throw error;
        return (data || []).map((m: any) => ({
          ...m,
          schema_jsonld: buildMilestoneSchema(m),
          ...(embedHtml ? { html_card: renderMilestoneCard(m) } : {}),
        }));
      }, []);
    }

    // 6) Reviews (Google) + cards individuais
    let reviewsBlock: any = undefined;
    if (wants("reviews")) {
      const approved = asArray<any>(kb?.google_reviews);
      const enrichedReviews = approved.map((r: any) => ({
        ...r,
        schema_jsonld: buildReviewSchema(r, company),
        ...(embedHtml ? { html_card: renderReviewCard(r) } : {}),
      }));
      const schemaBlock = await safe(async () => {
        const { data } = await supabase.rpc("fn_get_reviews_schema_block", {
          p_company_name: company?.company_name || "Smart Dent",
          p_company_url: company?.website_url || "https://smartdent.com.br",
        });
        return data ?? null;
      }, null);
      reviewsBlock = {
        aggregate: reviewsAgg,
        approved: enrichedReviews,
        schema_jsonld: schemaBlock,
      };
    }

    // 7) Video testimonials enriquecidos
    let videoTestimonials: any[] = [];
    if (wants("videos") || wants("video_testimonials")) {
      const list = asArray<any>(kb?.video_testimonials);
      videoTestimonials = list.map((v: any) => ({
        ...v,
        schema_jsonld: buildVideoSchema(v),
        ...(embedHtml ? { html_card: renderVideoTestimonialCard(v) } : {}),
      }));
    }

    // 8) KOLs enriquecidos
    let kols: any[] = [];
    if (wants("kols")) {
      const list = asArray<any>(kb?.key_opinion_leaders);
      kols = list.map((k: any) => ({
        ...k,
        ...(embedHtml ? { html_card: renderKolCard(k) } : {}),
      }));
    }

    // 9) SPIN solutions enriquecidos
    let spin: any[] = [];
    if (wants("spin") || wants("spin_solutions")) {
      const list = asArray<any>(kb?.spin_solutions);
      spin = list.map((s: any) => ({
        ...s,
        ...(embedHtml ? { html_card: renderSpinCard(s) } : {}),
      }));
    }

    // 10) Coupons globais
    let coupons: any[] = [];
    if (wants("coupons")) {
      coupons = await safe(async () => {
        const { data, error } = await supabase
          .from("product_coupons")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data || [];
      }, []);
    }

    // 11) Lia (estatísticas agregadas — privacidade)
    let liaStats: any = undefined;
    if (wants("lia")) {
      liaStats = await safe(async () => {
        const [{ count: leadsCount }, { count: convCount }, { count: msgCount }] =
          await Promise.all([
            supabase
              .from("lia_leads")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("lia_conversations")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("lia_messages")
              .select("id", { count: "exact", head: true }),
          ]);
        return {
          total_leads: leadsCount || 0,
          total_conversations: convCount || 0,
          total_messages: msgCount || 0,
        };
      }, null);
    }

    // 12) Prompts versionados (system prompts públicos)
    let prompts: any[] = [];
    if (wants("prompts")) {
      prompts = await safe(async () => {
        const { data, error } = await supabase
          .from("prompts_configuration")
          .select("id, prompt_key, prompt_title, prompt_text, version, is_active, updated_at")
          .eq("is_active", true)
          .order("prompt_key", { ascending: true });
        if (error) throw error;
        return data || [];
      }, []);
    }

    // 13) Company JSON-LD
    let companyOut: any = undefined;
    if (wants("company") && company) {
      companyOut = {
        ...company,
        schema_jsonld: {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.company_name,
          url: company.website_url,
          logo: company.company_logo_url,
          description: company.company_description,
          foundingDate: company.founded_year
            ? String(company.founded_year)
            : undefined,
          email: company.contact_email,
          telephone: company.contact_phone,
          address:
            company.street_address || company.city
              ? {
                  "@type": "PostalAddress",
                  streetAddress: [company.street_address, company.address_number]
                    .filter(Boolean)
                    .join(", "),
                  addressLocality: company.city,
                  addressRegion: company.state,
                  postalCode: company.postal_code,
                  addressCountry: company.country,
                }
              : undefined,
          sameAs: [
            ...asArray<string>(
              Object.values(company.social_media_links ?? {}),
            ).filter(Boolean),
            "https://www.wikidata.org/wiki/Q138636902",
          ],
        },
      };
    }

    // Payload final
    const payload: any = {
      generated_at: new Date().toISOString(),
      version: "2.0.0",
      filters: {
        slug,
        category,
        approved_only: approvedOnly,
        since,
        limit,
        offset,
        include: includeParam,
      },
      stats: {
        total_products: products.length,
        total_blogs: blogs.length,
        total_landing_pages: landingPages.length,
        total_video_testimonials: videoTestimonials.length,
        total_kols: kols.length,
        total_spin_solutions: spin.length,
        total_milestones: milestones.length,
        total_reviews: reviewsBlock?.approved?.length || 0,
        total_coupons: coupons.length,
        total_prompts: prompts.length,
      },
      tracking: {
        gtm_id: "GTM-NZ64Q899",
        wikidata_qid: "Q138636902",
      },
    };
    if (companyOut) payload.company = companyOut;
    if (wants("categories")) payload.categories_config = kb?.categories_config ?? [];
    if (wants("links")) payload.external_links = kb?.external_links ?? [];
    if (wants("products")) payload.products = products;
    if (wants("blogs")) payload.blogs = blogs;
    if (wants("landing_pages")) payload.landing_pages = landingPages;
    if (wants("videos") || wants("video_testimonials"))
      payload.video_testimonials = videoTestimonials;
    if (wants("kols")) payload.kols = kols;
    if (wants("spin") || wants("spin_solutions")) payload.spin_solutions = spin;
    if (wants("milestones")) payload.milestones = milestones;
    if (reviewsBlock) payload.reviews = reviewsBlock;
    if (wants("coupons")) payload.coupons = coupons;
    if (liaStats) payload.lia = liaStats;
    if (wants("prompts")) payload.prompts = prompts;

    // schema_only=true → retorna apenas @graph unificado
    if (schemaOnly) {
      const graph: any[] = [];
      if (companyOut?.schema_jsonld) graph.push(companyOut.schema_jsonld);
      products.forEach((p) => p.schema_jsonld && graph.push(p.schema_jsonld));
      milestones.forEach((m: any) => m.schema_jsonld && graph.push(m.schema_jsonld));
      videoTestimonials.forEach((v: any) => v.schema_jsonld && graph.push(v.schema_jsonld));
      asArray(reviewsBlock?.approved).forEach((r: any) => r.schema_jsonld && graph.push(r.schema_jsonld));
      const out = { "@context": "https://schema.org", "@graph": graph };
      return new Response(JSON.stringify(out, null, pretty ? 2 : 0), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/ld+json; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=900",
        },
      });
    }

    // ---------- HTML format ----------
    if (format === "html" || format === "both") {
      const sections: Record<string, string> = {
        company: companyOut
          ? `<article class="indexable-content company-profile"><h1>${escapeHtml(companyOut.company_name)}</h1>${companyOut.company_description ? `<p>${escapeHtml(companyOut.company_description)}</p>` : ""}</article>`
          : "",
        products: products.map((p) => p.html_card || "").join("\n"),
        spin: spin.map((s: any) => s.html_card || "").join("\n"),
        milestones: milestones.map((m: any) => m.html_card || "").join("\n"),
        reviews: asArray(reviewsBlock?.approved)
          .map((r: any) => r.html_card || "")
          .join("\n"),
        video_testimonials: videoTestimonials
          .map((v: any) => v.html_card || "")
          .join("\n"),
        kols: kols.map((k: any) => k.html_card || "").join("\n"),
        landing_pages: landingPages.map((lp: any) => lp.html_card || "").join("\n"),
        blogs: blogs.map((b: any) => b.html_card || "").join("\n"),
      };

      const graphSchemas: any[] = [];
      if (companyOut?.schema_jsonld) graphSchemas.push(companyOut.schema_jsonld);
      if (reviewsBlock?.schema_jsonld) graphSchemas.push(reviewsBlock.schema_jsonld);
      products.forEach((p) => p.schema_jsonld && graphSchemas.push(p.schema_jsonld));
      milestones.forEach((m: any) => m.schema_jsonld && graphSchemas.push(m.schema_jsonld));
      videoTestimonials.forEach((v: any) => v.schema_jsonld && graphSchemas.push(v.schema_jsonld));
      asArray(reviewsBlock?.approved).forEach((r: any) => r.schema_jsonld && graphSchemas.push(r.schema_jsonld));

      const fullHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(company?.company_name || "Knowledge Export")} — Knowledge Base</title>
<meta name="robots" content="index,follow"/>
${company?.website_url ? `<link rel="canonical" href="${escapeHtml(company.website_url)}"/>` : ""}
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NZ64Q899');</script>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graphSchemas })}</script>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NZ64Q899" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<main>
${sections.company}
${sections.products}
${sections.spin}
${sections.milestones}
${sections.reviews}
${sections.video_testimonials}
${sections.kols}
${sections.landing_pages}
${sections.blogs}
</main>
</body>
</html>`;

      if (format === "html") {
        return new Response(fullHtml, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=900",
          },
        });
      }
      payload.html_full = fullHtml;
      payload.html_by_section = sections;
    }

    return new Response(
      JSON.stringify(payload, null, pretty ? 2 : 0),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=900",
        },
      },
    );
  } catch (e) {
    console.error("knowledge-export-full error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
