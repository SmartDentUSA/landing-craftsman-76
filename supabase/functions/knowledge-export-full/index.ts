// knowledge-export-full
// Endpoint público que retorna TODO o conteúdo gerado no sistema
// (produtos, mensagens, imagens, vídeos, blogs, LPs, reviews, KOLs, SPIN,
// milestones, company profile) em JSON estruturado + HTML pronto + JSON-LD.
//
// GET /functions/v1/knowledge-export-full?slug=&category=&include=&format=&since=&limit=&offset=
//
// Read-only. Sem JWT. Usa SERVICE_ROLE internamente.

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

// ---------- HTML renderers ----------

function renderProductCard(p: any, company: any): string {
  const benefits = asArray<string>(p.benefits);
  const features = asArray<string>(p.features);
  const faq = asArray<any>(p.faq);
  const gallery = asArray<any>(p.images_gallery);
  const yt = asArray<any>(p.youtube_videos).map(normVideo).filter(Boolean);
  const ig = asArray<any>(p.instagram_videos).map(normVideo).filter(Boolean);
  const tk = asArray<any>(p.tiktok_videos).map(normVideo).filter(Boolean);
  const tech = asArray<any>(p.technical_videos).map(normVideo).filter(Boolean);
  const test = asArray<any>(p.testimonial_videos).map(normVideo).filter(Boolean);

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
      ? `<section class="videos videos-${label}"><h3>${label}</h3>${list
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
  ${galleryHtml}
  ${videoBlock("YouTube", yt)}
  ${videoBlock("Instagram", ig)}
  ${videoBlock("TikTok", tk)}
  ${videoBlock("Técnicos", tech)}
  ${videoBlock("Depoimentos", test)}
  ${faqHtml}
  ${ctaHtml}
  ${company?.company_name ? `<footer class="brand">${escapeHtml(company.company_name)}</footer>` : ""}
</article>`;
}

function buildProductSchema(p: any, company: any, agg: any): any {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    image: [p.image_url, ...asArray<any>(p.images_gallery).map((i) => (typeof i === "string" ? i : i.url))].filter(Boolean),
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

function renderBlogCard(b: any): string {
  if (b.html_content) {
    return `<article class="indexable-content blog-card" data-slug="${escapeHtml(b.slug || "")}">${b.html_content}</article>`;
  }
  return `<article class="indexable-content blog-card" data-slug="${escapeHtml(b.slug || "")}">
    <h2>${escapeHtml(b.title || "")}</h2>
    ${b.path ? `<a href="${escapeHtml(b.path)}">Ler artigo</a>` : ""}
  </article>`;
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
    const includeParam = (url.searchParams.get("include") || "all").toLowerCase();
    const wants = (key: string) =>
      includeParam === "all" || includeParam.split(",").map((s) => s.trim()).includes(key);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Knowledge base agregada (produtos + relações + company + reviews + kols + spin)
    const { data: kb, error: kbErr } = await supabase.rpc(
      "get_complete_knowledge_base",
      {
        p_include_company: wants("company"),
        p_include_categories: wants("categories") || wants("all"),
        p_include_links: wants("links") || wants("all"),
        p_include_products: wants("products"),
        p_include_video_testimonials: wants("videos") || wants("video_testimonials"),
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

    // 2) Produtos: enriquecer com html_card + schema_jsonld, opcionalmente filtrar por slug
    let products = asArray<any>(kb?.products).map((wrap: any) => {
      const p = wrap.product || wrap;
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
        messages: {
          cs: wrap.cs_messages ?? [],
          aftersales: wrap.aftersales_messages ?? [],
        },
        coupons: wrap.coupons ?? [],
        google_ads: wrap.google_ads ?? [],
        completion_score: wrap.completion_score ?? null,
        updated_at: p.updated_at,
        created_at: p.created_at,
        schema_jsonld: buildProductSchema(p, company, reviewsAgg),
      };
      if (embedHtml) enriched.html_card = renderProductCard(p, company);
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
      let q = supabase
        .from("generated_pages")
        .select(
          "id, title, slug, path, html_content, schema_json_ld, tags, page_type, published, published_url, published_at, canonical_url, updated_at, created_at",
        )
        .eq("page_type", "product_blog")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (approvedOnly) q = q.eq("published", true);
      if (since) q = q.gt("updated_at", since);
      const { data, error } = await q;
      if (error) throw new Error(`blogs: ${error.message}`);
      blogs = (data || []).map((b: any) => ({
        ...b,
        ...(embedHtml ? { html_card: renderBlogCard(b) } : {}),
      }));
    }

    // 4) Landing pages
    let landingPages: any[] = [];
    if (wants("landing_pages")) {
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
      if (error) throw new Error(`landing_pages: ${error.message}`);
      landingPages = (data || []).map((lp: any) => ({
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
      }));
    }

    // 5) Milestones
    let milestones: any[] = [];
    if (wants("milestones")) {
      const { data, error } = await supabase
        .from("company_milestones")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("year", { ascending: false });
      if (error) throw new Error(`milestones: ${error.message}`);
      milestones = data || [];
    }

    // 6) Reviews schema agregado
    let reviewsBlock: any = undefined;
    if (wants("reviews")) {
      const { data: rs } = await supabase.rpc("fn_get_reviews_schema_block", {
        p_company_name: company?.company_name || "Smart Dent",
        p_company_url: company?.website_url || "https://smartdent.com.br",
      });
      reviewsBlock = {
        aggregate: reviewsAgg,
        approved: kb?.google_reviews ?? [],
        schema_jsonld: rs ?? null,
      };
    }

    // 7) Company JSON-LD Organization
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
          foundingDate: company.founded_year ? String(company.founded_year) : undefined,
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

    const payload: any = {
      generated_at: new Date().toISOString(),
      filters: { slug, category, approved_only: approvedOnly, since, limit, offset, include: includeParam },
      stats: {
        total_products: products.length,
        total_blogs: blogs.length,
        total_landing_pages: landingPages.length,
        total_video_testimonials: asArray(kb?.video_testimonials).length,
        total_kols: asArray(kb?.key_opinion_leaders).length,
        total_milestones: milestones.length,
      },
    };
    if (companyOut) payload.company = companyOut;
    if (wants("categories")) payload.categories_config = kb?.categories_config ?? [];
    if (wants("links")) payload.external_links = kb?.external_links ?? [];
    if (wants("products")) payload.products = products;
    if (wants("blogs")) payload.blogs = blogs;
    if (wants("landing_pages")) payload.landing_pages = landingPages;
    if (wants("videos") || wants("video_testimonials"))
      payload.video_testimonials = kb?.video_testimonials ?? [];
    if (wants("kols")) payload.kols = kb?.key_opinion_leaders ?? [];
    if (wants("spin") || wants("spin_solutions"))
      payload.spin_solutions = kb?.spin_solutions ?? [];
    if (wants("milestones")) payload.milestones = milestones;
    if (reviewsBlock) payload.reviews = reviewsBlock;

    // ---------- HTML format ----------
    if (format === "html" || format === "both") {
      const productsHtml = products.map((p) => p.html_card || "").join("\n");
      const blogsHtml = blogs.map((b: any) => b.html_card || "").join("\n");
      const fullHtml = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(company?.company_name || "Knowledge Export")}</title>
<meta name="robots" content="index,follow"/>
${reviewsBlock?.schema_jsonld ? `<script type="application/ld+json">${JSON.stringify(reviewsBlock.schema_jsonld)}</script>` : ""}
${companyOut?.schema_jsonld ? `<script type="application/ld+json">${JSON.stringify(companyOut.schema_jsonld)}</script>` : ""}
</head><body>
<main>
${productsHtml}
${blogsHtml}
${products
  .map(
    (p) =>
      `<script type="application/ld+json">${JSON.stringify(p.schema_jsonld)}</script>`,
  )
  .join("\n")}
</main>
</body></html>`;

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
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=900",
      },
    });
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
