// ================================================================
// sync-system-b-articles
// Ingere artigos do Sistema B (knowledge-feed) no Sistema A,
// roteia por domínio e enriquece com products_repository.
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_B_BASE = "https://okeogjgqijbfkudfjadz.supabase.co/functions/v1";
const SYSTEM_B_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZW9namdxaWpiZmt1ZGZqYWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzE5MDgsImV4cCI6MjA3MjQ0NzkwOH0.OGdtvsJNdEqAfUoDA4O9OcnD69Titu69TsXS38TaVtk";

const PAGE_SIZE     = 100;
const MAX_PAGES_DEF = 7;
const ENRICH_BATCH  = 50;
const SLEEP_MS      = 150;

interface FeedMeta { total_count: number; offset: number; limit: number; has_more: boolean; }
interface FeedFaq { question: string; answer: string; }
interface FeedAuthor { id?: string; name?: string; specialty?: string; photo_url?: string; mini_bio?: string; lattes_url?: string; social_links?: Record<string, string>; }
interface FeedItem {
  id: string; title: string; title_en?: string; title_es?: string; slug: string;
  excerpt?: string; excerpt_en?: string; excerpt_es?: string; meta_description?: string;
  category?: { name: string; letter: string }; url?: string; image_url?: string; image_alt?: string;
  published_at?: string; updated_at?: string; keywords?: string[];
  faqs?: FeedFaq[]; faqs_en?: FeedFaq[]; faqs_es?: FeedFaq[];
  answer_block?: string; answer_block_en?: string; answer_block_es?: string;
  ai_context?: Record<string, unknown>; ai_context_en?: Record<string, unknown>; ai_context_es?: Record<string, unknown>;
  geo?: Record<string, unknown>; technical_properties?: Record<string, unknown>;
  veredict_data?: Record<string, unknown>; norm_references?: Record<string, unknown>;
  is_medical_device?: boolean; is_scholarly?: boolean;
  recommended_products?: string[]; recommended_resins?: string[]; author?: FeedAuthor;
}
interface DomainRow { domain: string; keyword_rules: string[]; product_categories: string[]; is_hub: boolean; active: boolean; priority: number; }
interface SyncStats {
  mode: string; pages_fetched: number; articles_fetched: number; articles_upserted: number;
  articles_skipped: number; articles_enriched: number; errors: string[];
  domain_distribution: Record<string, number>; started_at: string; finished_at: string; duration_ms: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const startTime = Date.now();
  const stats: SyncStats = {
    mode: "ingest", pages_fetched: 0, articles_fetched: 0, articles_upserted: 0,
    articles_skipped: 0, articles_enriched: 0, errors: [], domain_distribution: {},
    started_at: new Date().toISOString(), finished_at: "", duration_ms: 0,
  };

  try {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") ?? "ingest") as string;
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const maxPages = parseInt(url.searchParams.get("max_pages") ?? String(MAX_PAGES_DEF), 10);
    const domainFilter = url.searchParams.get("domain") ?? null;
    stats.mode = mode;

    console.log(`[sync-system-b] START mode=${mode} offset=${offset} maxPages=${maxPages}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: domains, error: domainErr } = await supabase
      .from("domain_config")
      .select("domain, keyword_rules, product_categories, is_hub, active, priority")
      .eq("active", true)
      .order("priority", { ascending: true });

    if (domainErr) throw new Error(`domain_config load failed: ${domainErr.message}`);

    const domainRows = (domains ?? []) as DomainRow[];
    const hubDomain = domainRows.find(d => d.is_hub)?.domain ?? "eodonto.com";
    const nonHubDomains = domainRows.filter(d => !d.is_hub && d.active);

    console.log(`[sync-system-b] ${domainRows.length} domains loaded. Hub: ${hubDomain}`);

    if (mode === "ingest" || mode === "full" || mode === "incremental") {
      let lastSyncedAt: Date | null = null;
      if (mode === "incremental") {
        const { data: latest } = await supabase
          .from("systemb_articles").select("synced_at")
          .order("synced_at", { ascending: false }).limit(1).maybeSingle();
        lastSyncedAt = latest?.synced_at ? new Date(latest.synced_at) : null;
      }

      let currentOffset = offset;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < maxPages) {
        const feedUrl = `${SYSTEM_B_BASE}/knowledge-feed?format=json&offset=${currentOffset}&limit=${PAGE_SIZE}`;
        console.log(`[sync-system-b] Fetching page offset=${currentOffset}`);

        const feedRes = await fetch(feedUrl, {
          headers: { apikey: SYSTEM_B_ANON_KEY, Authorization: `Bearer ${SYSTEM_B_ANON_KEY}` },
        });

        if (!feedRes.ok) {
          const errText = await feedRes.text();
          stats.errors.push(`Feed offset=${currentOffset} → HTTP ${feedRes.status}: ${errText.slice(0, 200)}`);
          break;
        }

        const feedData = await feedRes.json();
        const feedMeta = feedData.feed as FeedMeta;
        const items = (feedData.items ?? []) as FeedItem[];

        hasMore = feedMeta?.has_more ?? false;
        stats.pages_fetched++;
        stats.articles_fetched += items.length;

        console.log(`[sync-system-b] offset=${currentOffset} → ${items.length} articles, has_more=${hasMore}`);

        let toProcess = items;
        if (mode === "incremental" && lastSyncedAt) {
          toProcess = items.filter(item => {
            const updatedAt = item.updated_at ? new Date(item.updated_at) : null;
            return updatedAt && updatedAt > lastSyncedAt!;
          });
          stats.articles_skipped += items.length - toProcess.length;
        }
        if (domainFilter) {
          toProcess = toProcess.filter(item => routeArticle(item, nonHubDomains, hubDomain) === domainFilter);
        }

        if (toProcess.length > 0) {
          const batch = toProcess.map(item => {
            const targetDomain = routeArticle(item, nonHubDomains, hubDomain);
            stats.domain_distribution[targetDomain] = (stats.domain_distribution[targetDomain] ?? 0) + 1;
            return buildArticleRecord(item, targetDomain);
          });

          const { error: upsertErr } = await supabase
            .from("systemb_articles")
            .upsert(batch, { onConflict: "systemb_id", ignoreDuplicates: false });

          if (upsertErr) {
            stats.errors.push(`Upsert error at offset ${currentOffset}: ${upsertErr.message}`);
          } else {
            stats.articles_upserted += batch.length;
          }
        }

        currentOffset += PAGE_SIZE;
        pageCount++;
        if (hasMore && pageCount < maxPages) await sleep(SLEEP_MS);
      }
    }

    if (mode === "enrich" || mode === "full") {
      stats.articles_enriched = await enrichPendingArticles(supabase);
    }

    stats.finished_at = new Date().toISOString();
    stats.duration_ms = Date.now() - startTime;

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    stats.finished_at = new Date().toISOString();
    stats.duration_ms = Date.now() - startTime;
    stats.errors.push(String(err));
    return new Response(JSON.stringify({ success: false, error: String(err), stats }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

function routeArticle(article: FeedItem, domains: DomainRow[], hubDomain: string): string {
  const corpus = [article.title ?? "", article.title_en ?? "", article.excerpt ?? "", ...(article.keywords ?? [])]
    .join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const scores: Array<{ domain: string; score: number; priority: number }> = [];

  for (const dc of domains) {
    if (!dc.keyword_rules?.length) continue;
    let score = 0;
    for (const kw of dc.keyword_rules) {
      const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (corpus.includes(kwNorm)) {
        if (kwNorm.length >= 15) score += 5;
        else if (kwNorm.length >= 8) score += 3;
        else if (kwNorm.length >= 4) score += 2;
        else score += 1;
      }
    }
    if (score > 0) scores.push({ domain: dc.domain, score, priority: dc.priority ?? 99 });
  }

  if (scores.length === 0) return hubDomain;
  scores.sort((a, b) => b.score !== a.score ? b.score - a.score : a.priority - b.priority);
  return scores[0].domain;
}

function buildArticleRecord(item: FeedItem, targetDomain: string): Record<string, unknown> {
  return {
    systemb_id: item.id, title: item.title, title_en: item.title_en ?? null, title_es: item.title_es ?? null,
    slug: item.slug, excerpt: item.excerpt ?? null, excerpt_en: item.excerpt_en ?? null, excerpt_es: item.excerpt_es ?? null,
    meta_description: item.meta_description ?? null,
    category_name: item.category?.name ?? null, category_letter: item.category?.letter ?? null,
    source_url: item.url ?? null, image_url: item.image_url ?? null, image_alt: item.image_alt ?? null,
    published_at_source: item.published_at ?? null, updated_at_source: item.updated_at ?? null,
    keywords: item.keywords ?? [], faqs: item.faqs ?? [], faqs_en: item.faqs_en ?? [], faqs_es: item.faqs_es ?? [],
    answer_block: item.answer_block ?? null, answer_block_en: item.answer_block_en ?? null, answer_block_es: item.answer_block_es ?? null,
    ai_context: item.ai_context ?? null, ai_context_en: item.ai_context_en ?? null, ai_context_es: item.ai_context_es ?? null,
    geo: item.geo ?? null, technical_properties: item.technical_properties ?? null,
    veredict_data: item.veredict_data ?? null, norm_references: item.norm_references ?? null,
    is_medical_device: item.is_medical_device ?? false, is_scholarly: item.is_scholarly ?? false,
    recommended_products: item.recommended_products ?? [], recommended_resins: item.recommended_resins ?? [],
    author: item.author ?? null,
    target_domain: targetDomain, publish_status: "pending", synced_at: new Date().toISOString(),
  };
}

async function enrichPendingArticles(supabase: SupabaseClient): Promise<number> {
  const { data: articles, error } = await supabase
    .from("systemb_articles")
    .select("id, title, keywords, faqs, category_letter, recommended_products, target_domain")
    .eq("publish_status", "pending")
    .neq("recommended_products", "[]")
    .limit(ENRICH_BATCH);

  if (error || !articles?.length) return 0;

  let enriched = 0;
  for (const article of articles) {
    try {
      const productIds: string[] = (article.recommended_products ?? []).slice(0, 3);
      if (!productIds.length) continue;

      const { data: products } = await supabase
        .from("products_repository")
        .select("id, name, category, brand, sales_pitch, faq, technical_specifications, clinical_brain_status, individual_blog_content")
        .in("id", productIds).eq("active", true);

      if (!products?.length) {
        await supabase.from("systemb_articles").update({ publish_status: "enriched" }).eq("id", article.id);
        enriched++;
        continue;
      }

      const primary = products[0];
      let answerBlock: string | null = null;
      if (primary.sales_pitch) {
        const pitchText = typeof primary.sales_pitch === "string" ? primary.sales_pitch : JSON.stringify(primary.sales_pitch);
        const clean = pitchText.replace(/[#*_`\[\]]/g, "").replace(/\s+/g, " ").trim();
        const words = clean.split(" ").slice(0, 55);
        answerBlock = words.join(" ") + (clean.split(" ").length > 55 ? "." : "");
      }

      const aiContext = {
        primary_product: primary.name, primary_brand: primary.brand ?? null,
        primary_category: primary.category ?? null, product_count: products.length,
        clinical_validated: products.some((p: Record<string, unknown>) => p.clinical_brain_status === "validated"),
        has_technical_specs: !!primary.technical_specifications,
        article_category: article.category_letter, article_keywords: article.keywords ?? [],
        target_domain: article.target_domain, product_ids_sistema_a: products.map((p: Record<string, unknown>) => p.id),
      };

      const truncate = (text: unknown, maxChars: number) => {
        if (!text) return "";
        const str = typeof text === "string" ? text : JSON.stringify(text);
        return str.length > maxChars ? str.slice(0, maxChars) + "…" : str;
      };

      const enrichedJson = {
        source: "sistema_b_x_sistema_a", enriched_at: new Date().toISOString(),
        article: { title: article.title, keywords: article.keywords, faqs_count: Array.isArray(article.faqs) ? article.faqs.length : 0 },
        primary_product: {
          name: primary.name, category: primary.category,
          sales_pitch: truncate(primary.sales_pitch, 600), technical_specs: truncate(primary.technical_specifications, 800),
          clinical_status: primary.clinical_brain_status, faq_preview: truncate(primary.faq, 400),
        },
        related_products: products.slice(1).map((p: Record<string, unknown>) => ({ name: p.name, category: p.category })),
      };

      const { error: updateErr } = await supabase.from("systemb_articles")
        .update({ answer_block: answerBlock, ai_context: aiContext, enriched_json: enrichedJson, enriched_at: new Date().toISOString(), publish_status: "enriched" })
        .eq("id", article.id);

      if (!updateErr) enriched++;
    } catch (e) {
      console.error(`[enrich] Error for ${article.id}:`, String(e));
    }
  }
  return enriched;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
