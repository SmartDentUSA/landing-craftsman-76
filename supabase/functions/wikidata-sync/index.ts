import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EntitySearchHit = {
  id: string;
  label?: string;
  description?: string;
  match?: { language?: string; text?: string; type?: string };
};

type Candidate = {
  qid: string;
  label?: string;
  description?: string;
  website?: string;
  score: number;
  reasons: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase environment variables" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Missing authorization header" }, 401);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[wikidata-sync] Invalid auth claims", claimsError);
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub;
    const db = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: isAdmin, error: roleError } = await db.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (roleError) {
      console.error("[wikidata-sync] Role check failed", roleError);
      return jsonResponse({ success: false, error: "Role verification failed" }, 500);
    }

    if (!isAdmin) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    console.log("[wikidata-sync] Request received", { action, userId });

    if (action === "sync_company") {
      return await handleCompanySync(db);
    }

    if (action === "sync_product") {
      return await handleProductSync(db, body?.productId);
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (error) {
    console.error("[wikidata-sync] Unhandled error", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

async function handleCompanySync(db: ReturnType<typeof createClient>) {
  const { data: company, error } = await db
    .from("company_profile")
    .select("id, company_name, website_url, company_description, wikidata_id, updated_at, created_at")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[wikidata-sync] Failed to load company", error);
    return jsonResponse({ success: false, error: `Erro ao carregar empresa: ${error.message}` }, 500);
  }

  if (!company) {
    return jsonResponse({ success: false, error: "Nenhum perfil de empresa encontrado" }, 404);
  }

  if (company.wikidata_id) {
    console.log("[wikidata-sync] Company already has Wikidata ID", company.wikidata_id);
    return jsonResponse({ success: true, wikidataQid: company.wikidata_id, source: "existing" });
  }

  const domain = getHostname(company.website_url);
  const candidates = await searchCompanyCandidates({
    name: company.company_name,
    description: company.company_description,
    domain,
  });

  const best = candidates[0];
  if (!best || best.score < 45) {
    console.warn("[wikidata-sync] No strong company match found", { candidates });
    return jsonResponse(
      {
        success: false,
        error: "Nenhuma entidade confiável encontrada para a empresa no Wikidata",
        candidates: candidates.slice(0, 3),
      },
      404,
    );
  }

  const { error: updateError } = await db
    .from("company_profile")
    .update({ wikidata_id: best.qid, updated_at: new Date().toISOString() })
    .eq("id", company.id);

  if (updateError) {
    console.error("[wikidata-sync] Failed to update company Wikidata ID", updateError);
    return jsonResponse({ success: false, error: `Erro ao salvar Wikidata ID: ${updateError.message}` }, 500);
  }

  console.log("[wikidata-sync] Company synced", best);
  return jsonResponse({
    success: true,
    wikidataQid: best.qid,
    label: best.label,
    description: best.description,
    website: best.website,
    score: best.score,
    reasons: best.reasons,
  });
}

async function handleProductSync(db: ReturnType<typeof createClient>, productId?: string) {
  if (!productId || typeof productId !== "string") {
    return jsonResponse({ success: false, error: "productId é obrigatório" }, 400);
  }

  const { data: product, error } = await db
    .from("products_repository")
    .select("id, name, brand, description, wikidata_item_id")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("[wikidata-sync] Failed to load product", error);
    return jsonResponse({ success: false, error: `Erro ao carregar produto: ${error.message}` }, 500);
  }

  if (!product) {
    return jsonResponse({ success: false, error: "Produto não encontrado" }, 404);
  }

  if (product.wikidata_item_id) {
    return jsonResponse({ success: true, wikidataQid: product.wikidata_item_id, source: "existing" });
  }

  const candidates = await searchProductCandidates({
    name: product.name,
    brand: product.brand,
    description: product.description,
  });

  const best = candidates[0];
  if (!best || best.score < 55) {
    console.warn("[wikidata-sync] No strong product match found", { productId, candidates });
    return jsonResponse(
      {
        success: false,
        error: "Nenhuma entidade confiável encontrada para o produto no Wikidata",
        candidates: candidates.slice(0, 3),
      },
      404,
    );
  }

  const { error: updateError } = await db
    .from("products_repository")
    .update({ wikidata_item_id: best.qid, updated_at: new Date().toISOString() })
    .eq("id", product.id);

  if (updateError) {
    console.error("[wikidata-sync] Failed to update product Wikidata ID", updateError);
    return jsonResponse({ success: false, error: `Erro ao salvar Wikidata do produto: ${updateError.message}` }, 500);
  }

  console.log("[wikidata-sync] Product synced", { productId, best });
  return jsonResponse({
    success: true,
    wikidataQid: best.qid,
    label: best.label,
    description: best.description,
    website: best.website,
    score: best.score,
    reasons: best.reasons,
  });
}

async function searchCompanyCandidates(input: { name?: string | null; description?: string | null; domain?: string | null }) {
  const queries = uniqueStrings([
    input.name,
    input.name && input.domain ? `${input.name} ${input.domain}` : null,
    input.domain,
  ]);

  return await collectBestCandidates(queries, (candidate) =>
    scoreCompanyCandidate(candidate, {
      name: input.name ?? "",
      description: input.description ?? "",
      domain: input.domain ?? "",
    })
  );
}

async function searchProductCandidates(input: { name?: string | null; brand?: string | null; description?: string | null }) {
  const queries = uniqueStrings([
    input.brand && input.name ? `${input.brand} ${input.name}` : null,
    input.name,
  ]);

  return await collectBestCandidates(queries, (candidate) =>
    scoreProductCandidate(candidate, {
      name: input.name ?? "",
      brand: input.brand ?? "",
      description: input.description ?? "",
    })
  );
}

async function collectBestCandidates(
  queries: string[],
  scorer: (candidate: Candidate) => Candidate,
): Promise<Candidate[]> {
  const hitsById = new Map<string, EntitySearchHit>();

  for (const query of queries) {
    const searchHits = await searchWikidata(query);
    for (const hit of searchHits) {
      if (!hit?.id?.startsWith("Q") || hitsById.has(hit.id)) continue;
      hitsById.set(hit.id, hit);
    }
  }

  const candidates: Candidate[] = [];
  for (const hit of hitsById.values()) {
    const entityDetails = await fetchEntityDetails(hit.id);
    const baseCandidate: Candidate = {
      qid: hit.id,
      label: entityDetails.label || hit.label,
      description: entityDetails.description || hit.description,
      website: entityDetails.website,
      score: 0,
      reasons: [],
    };
    candidates.push(scorer(baseCandidate));
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 10);
}

function scoreCompanyCandidate(
  candidate: Candidate,
  target: { name: string; description: string; domain: string },
): Candidate {
  const reasons: string[] = [];
  let score = 0;

  const targetName = normalizeText(target.name);
  const candidateLabel = normalizeText(candidate.label);
  const candidateDescription = normalizeText(candidate.description);
  const targetDomain = normalizeHostname(target.domain);
  const candidateDomain = normalizeHostname(candidate.website);

  if (candidateLabel && targetName && candidateLabel === targetName) {
    score += 40;
    reasons.push("label_exact_match");
  } else if (candidateLabel && targetName && candidateLabel.includes(targetName)) {
    score += 25;
    reasons.push("label_contains_target");
  } else if (candidateLabel && targetName && targetName.includes(candidateLabel)) {
    score += 18;
    reasons.push("target_contains_label");
  }

  if (candidateDomain && targetDomain && candidateDomain === targetDomain) {
    score += 100;
    reasons.push("website_domain_match");
  }

  if (candidateDescription.includes("empresa") || candidateDescription.includes("company") || candidateDescription.includes("business")) {
    score += 8;
    reasons.push("description_company_signal");
  }

  if (target.description && candidateDescription) {
    const keywords = extractKeywords(target.description);
    const matchingKeywords = keywords.filter((keyword) => candidateDescription.includes(keyword)).length;
    if (matchingKeywords > 0) {
      score += Math.min(15, matchingKeywords * 3);
      reasons.push(`description_keyword_matches:${matchingKeywords}`);
    }
  }

  return { ...candidate, score, reasons };
}

function scoreProductCandidate(
  candidate: Candidate,
  target: { name: string; brand: string; description: string },
): Candidate {
  const reasons: string[] = [];
  let score = 0;

  const targetName = normalizeText(target.name);
  const targetBrand = normalizeText(target.brand);
  const candidateLabel = normalizeText(candidate.label);
  const candidateDescription = normalizeText(candidate.description);

  if (candidateLabel && targetName && candidateLabel === targetName) {
    score += 45;
    reasons.push("label_exact_match");
  } else if (candidateLabel && targetName && candidateLabel.includes(targetName)) {
    score += 28;
    reasons.push("label_contains_target");
  } else if (candidateLabel && targetName && targetName.includes(candidateLabel)) {
    score += 20;
    reasons.push("target_contains_label");
  }

  if (targetBrand && candidateLabel.includes(targetBrand)) {
    score += 15;
    reasons.push("brand_in_label");
  }

  if (targetBrand && candidateDescription.includes(targetBrand)) {
    score += 10;
    reasons.push("brand_in_description");
  }

  const productKeywords = extractKeywords(target.description || target.name);
  const matchingKeywords = productKeywords.filter((keyword) => candidateDescription.includes(keyword)).length;
  if (matchingKeywords > 0) {
    score += Math.min(20, matchingKeywords * 4);
    reasons.push(`description_keyword_matches:${matchingKeywords}`);
  }

  return { ...candidate, score, reasons };
}

async function searchWikidata(query: string): Promise<EntitySearchHit[]> {
  if (!query) return [];

  const languages = ["pt", "en"];
  const aggregated: EntitySearchHit[] = [];

  for (const language of languages) {
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.searchParams.set("action", "wbsearchentities");
    url.searchParams.set("format", "json");
    url.searchParams.set("language", language);
    url.searchParams.set("uselang", language);
    url.searchParams.set("type", "item");
    url.searchParams.set("limit", "5");
    url.searchParams.set("search", query);

    const response = await fetch(url);
    if (!response.ok) {
      console.warn("[wikidata-sync] Search request failed", { query, language, status: response.status });
      continue;
    }

    const data = await response.json();
    if (Array.isArray(data?.search)) {
      aggregated.push(...data.search);
    }
  }

  return aggregated;
}

async function fetchEntityDetails(qid: string): Promise<{ label?: string; description?: string; website?: string }> {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("ids", qid);
  url.searchParams.set("languages", "pt|en");
  url.searchParams.set("props", "labels|descriptions|claims");

  const response = await fetch(url);
  if (!response.ok) {
    console.warn("[wikidata-sync] Entity details request failed", { qid, status: response.status });
    return {};
  }

  const data = await response.json();
  const entity = data?.entities?.[qid];
  if (!entity) return {};

  const label = entity.labels?.pt?.value || entity.labels?.en?.value;
  const description = entity.descriptions?.pt?.value || entity.descriptions?.en?.value;
  const websiteClaim = entity.claims?.P856?.[0]?.mainsnak?.datavalue?.value;

  return {
    label,
    description,
    website: typeof websiteClaim === "string" ? websiteClaim : undefined,
  };
}

function extractKeywords(text?: string | null): string[] {
  return uniqueStrings(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length >= 5)
      .slice(0, 8),
  );
}

function getHostname(value?: string | null): string {
  if (!value) return "";
  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0] || "";
  }
}

function normalizeHostname(value?: string | null): string {
  return getHostname(value).replace(/^www\./, "").toLowerCase();
}

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}
