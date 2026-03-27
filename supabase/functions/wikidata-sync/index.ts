import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCompanyPayload,
  buildProductPayload,
  extractTechSpecs,
  summarizePayload,
  evaluateSemanticScore,
  canonicalizePayload,
  hashPayload,
  type CompanyProfileInput,
  type ProductInput,
  type WikidataPayload,
} from "../_shared/wikidata-payload-builder.ts";

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

// ── OAuth 1.0a + Wikidata Write Helpers ─────────────────────

interface WikidataOAuthSecrets {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessSecret: string;
}

function getWikidataSecrets(): WikidataOAuthSecrets | null {
  const consumerKey = Deno.env.get("WIKIDATA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("WIKIDATA_CONSUMER_SECRET");
  const accessToken = Deno.env.get("WIKIDATA_ACCESS_TOKEN");
  const accessSecret = Deno.env.get("WIKIDATA_ACCESS_SECRET");

  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
    return null;
  }
  return { consumerKey, consumerSecret, accessToken, accessSecret };
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

async function signOAuth1a(
  method: string,
  url: string,
  params: Record<string, string>,
  secrets: WikidataOAuthSecrets,
): Promise<{ oauthParams: Record<string, string>; apiParams: Record<string, string> }> {
  const encoder = new TextEncoder();

  const oauthBase: Record<string, string> = {
    oauth_consumer_key: secrets.consumerKey,
    oauth_token: secrets.accessToken,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };

  // Signature base string includes ALL params (oauth + api)
  const allParams: Record<string, string> = { ...oauthBase, ...params };

  const sorted = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sorted),
  ].join("&");

  const signingKey = `${percentEncode(secrets.consumerSecret)}&${percentEncode(secrets.accessSecret)}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(baseString),
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return {
    oauthParams: { ...oauthBase, oauth_signature: signature },
    apiParams: params,
  };
}

function buildOAuthHeader(oauthParams: Record<string, string>): string {
  const parts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");
  return `OAuth ${parts}`;
}

async function getWikidataCsrfToken(secrets: WikidataOAuthSecrets): Promise<string> {
  const url = "https://www.wikidata.org/w/api.php";
  const apiParams: Record<string, string> = {
    action: "query",
    meta: "tokens",
    type: "csrf",
    format: "json",
  };

  const { oauthParams } = await signOAuth1a("GET", url, apiParams, secrets);
  const query = new URLSearchParams(apiParams).toString();

  const res = await fetch(`${url}?${query}`, {
    headers: { Authorization: buildOAuthHeader(oauthParams) },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[wikidata-sync] CSRF request failed", { status: res.status, body: text.slice(0, 500) });
    throw new Error(`CSRF token request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  const token = json?.query?.tokens?.csrftoken;
  const oauthErrorCode = json?.error?.code;
  const oauthErrorInfo = json?.error?.info;

  if (oauthErrorCode === "mwoauth-invalid-authorization") {
    console.error("[wikidata-sync] Invalid Wikidata OAuth authorization", JSON.stringify(json).slice(0, 500));
    throw new Error(`WIKIDATA_OAUTH_INVALID_AUTHORIZATION: ${oauthErrorInfo || "OAuth grant not approved or expired"}`);
  }

  if (!token || token === "+\\") {
    console.error("[wikidata-sync] Invalid CSRF token response", JSON.stringify(json).slice(0, 500));
    throw new Error(`Invalid CSRF token received: ${JSON.stringify(json?.query?.tokens)}`);
  }

  console.log("[wikidata-sync] CSRF token obtained successfully");
  return token;
}

function normalizeLabel(label: string): string {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function findExistingEntity(label: string): Promise<string | null> {
  const res = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=pt&format=json&limit=5`,
  );
  if (!res.ok) return null;

  const json = await res.json();
  // Return exact match only, excluding known category/class QIDs
  const exactMatch = json.search?.find(
    (r: { id?: string; label?: string }) =>
      normalizeLabel(r.label || "") === normalizeLabel(label) &&
      !getCategoryQids().has(r.id),
  );
  if (exactMatch) {
    console.log(`[wikidata-sync] findExistingEntity: matched "${label}" → ${exactMatch.id}`);
  }
  return exactMatch?.id || null;
}

async function executeWbEditEntity(
  payload: WikidataPayload,
  secrets: WikidataOAuthSecrets,
  qid?: string | null,
): Promise<string> {
  // Rate limit
  await new Promise((resolve) => setTimeout(resolve, 600));

  const url = "https://www.wikidata.org/w/api.php";
  const csrf = await getWikidataCsrfToken(secrets);

  const apiParams: Record<string, string> = {
    action: "wbeditentity",
    format: "json",
    token: csrf,
    bot: "1",
    data: JSON.stringify(payload),
    summary: "Automated sync via SmartDent Authority Publisher",
  };

  if (qid) {
    apiParams.id = qid;
  } else {
    apiParams.new = "item";
  }

  const { oauthParams } = await signOAuth1a("POST", url, apiParams, secrets);

  console.log(`[wikidata-sync] Executing wbeditentity: ${qid ? `UPDATE ${qid}` : "CREATE NEW"}`);

  const body = new URLSearchParams(apiParams);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: buildOAuthHeader(oauthParams),
    },
    body,
  });

  const rawText = await res.text();
  console.log(`[wikidata-sync] wbeditentity raw response (${res.status}):`, rawText.slice(0, 1000));

  let json: any;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`Non-JSON response from Wikidata: ${rawText.slice(0, 500)}`);
  }

  if (json.error) {
    const errInfo = json.error.info || json.error.code || JSON.stringify(json.error);
    console.error("[wikidata-sync] Wikidata API error details:", JSON.stringify(json.error));
    throw Object.assign(new Error(`Wikidata API Error: ${errInfo}`), { code: "WIKIDATA_API_ERROR" });
  }

  const resultQid = json.entity?.id;
  if (!resultQid) {
    throw new Error(`No entity ID in wbeditentity response: ${rawText.slice(0, 500)}`);
  }

  console.log(`[wikidata-sync] ✅ wbeditentity SUCCESS: ${resultQid}`);
  return resultQid;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    if (action === "build_company_payload") {
      return await handleBuildCompanyPayload(db);
    }

    if (action === "build_product_payload") {
      return await handleBuildProductPayload(db, body?.productId);
    }

    if (action === "resolve_and_persist") {
      return await handleResolveAndPersist(db, body?.entityType, body?.internalId);
    }

    if (action === "execute_write") {
      return await handleExecuteWrite(db, body?.entityType, body?.internalId);
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
    .select("id, name, brand, description, category, subcategory, wikidata_item_id")
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
    category: product.category,
    subcategory: product.subcategory,
  });

  const best = candidates[0];
  if (!best || best.score < 35) {
    // Try category fallback — return as suggestion only, do NOT persist to DB
    const fallbackQid = getCategoryFallbackQid(product.category, product.subcategory, product.name);
    if (fallbackQid) {
      console.log("[wikidata-sync] Category fallback (suggestion only, not persisted)", { productId, fallbackQid });
      const fallbackDetails = await fetchEntityDetails(fallbackQid);

      return jsonResponse({
        success: false,
        needsCreate: true,
        reason: "generic_category_only",
        fallbackQid,
        fallbackLabel: fallbackDetails.label,
        fallbackDescription: fallbackDetails.description,
        message: "Categoria identificada, mas nenhum item específico encontrado. Use Resolve + Publish para criar.",
      });
    }

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

async function searchProductCandidates(input: { name?: string | null; brand?: string | null; description?: string | null; category?: string | null; subcategory?: string | null }) {
  const genericTerms = extractGenericProductTerms(input.name);
  const queries = uniqueStrings([
    input.brand && input.name ? `${input.brand} ${input.name}` : null,
    input.name,
    genericTerms,
    input.subcategory,
    input.category,
    input.subcategory ? `${input.subcategory} dental` : null,
  ]);

  return await collectBestCandidates(queries, (candidate) =>
    scoreProductCandidate(candidate, {
      name: input.name ?? "",
      brand: input.brand ?? "",
      description: input.description ?? "",
      category: input.category ?? "",
      subcategory: input.subcategory ?? "",
    })
  );
}

const CATEGORY_FALLBACK_MAP: Record<string, string> = {
// NOTE: CATEGORY_QIDS is derived below after this map definition
  // Q1780993 = dental composite (verified on Wikidata)
  "resina composta": "Q1780993",
  "resinas compostas": "Q1780993",
  "composite resin": "Q1780993",
  "dental composite": "Q1780993",
  "selante": "Q1780993",
  // Q3834994 = 3D printer (verified on Wikidata)
  "impressora 3d": "Q3834994",
  "impressoras 3d": "Q3834994",
  "3d printer": "Q3834994",
  // Q2631097 = photopolymer (verified on Wikidata)
  "resina 3d": "Q2631097",
  "resinas 3d": "Q2631097",
  "photopolymer": "Q2631097",
  // Q1618071 = 3D scanner (verified on Wikidata)
  "scanner 3d": "Q1618071",
  "scanners 3d": "Q1618071",
  "3d scanner": "Q1618071",
  // Q7397 = software ✓
  "software": "Q7397",
  "softwares": "Q7397",
  // Q45621 = ceramic ✓
  "ceramica": "Q45621",
  "cerâmica": "Q45621",
  "caracterizacao": "Q45621",
  "caracterização": "Q45621",
  "dental ceramics": "Q45621",
  // Q131790 = adhesive ✓
  "adesivo": "Q131790",
  "adesivos": "Q131790",
  "adhesive": "Q131790",
  // Q204885 = dental cement (verified on Wikidata)
  "cimento": "Q204885",
  "cimentos": "Q204885",
  "dental cement": "Q204885",
  // Q143458 = tooth bleaching (verified on Wikidata)
  "clareador": "Q143458",
  "clareamento": "Q143458",
  "teeth whitening": "Q143458",
  // Q146439 = silicone (verified on Wikidata)
  "silicone": "Q146439",
  "silicones": "Q146439",
  "moldagem": "Q146439",
  // Q11685373 = alginate (verified on Wikidata)
  "alginato": "Q11685373",
  // Q2102936 = dental curing light (verified on Wikidata)
  "fotopolimerizador": "Q2102936",
  "led": "Q2102936",
};

// Lazy getter for category QID blocklist (avoids TDZ issues with hoisting)
let _categoryQidsCache: Set<string> | null = null;
function getCategoryQids(): Set<string> {
  if (!_categoryQidsCache) {
    _categoryQidsCache = new Set(Object.values(CATEGORY_FALLBACK_MAP));
  }
  return _categoryQidsCache;
}

function getCategoryFallbackQid(category?: string | null, subcategory?: string | null, name?: string | null): string | null {
  const candidates = [subcategory, category, name].filter(Boolean).map((v) => normalizeText(v!));

  for (const text of candidates) {
    for (const [key, qid] of Object.entries(CATEGORY_FALLBACK_MAP)) {
      if (text.includes(normalizeText(key))) {
        return qid;
      }
    }
  }
  return null;
}

function extractGenericProductTerms(name?: string | null): string {
  if (!name) return "";
  return name
    .replace(/[-–—]/g, " ")
    .replace(/\b[A-Z]{0,3}\d+[A-Z]?\b/gi, "") // Remove codes like DA2, A3, B1
    .replace(/\b(kit|combo|pack|uni|unid|ml|g|mm)\b/gi, "")
    .replace(/\b\d+(\.\d+)?\s*(ml|g|mm|un|kg)?\b/gi, "") // Remove measurements
    .replace(/\s+/g, " ")
    .trim();
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
  target: { name: string; brand: string; description: string; category: string; subcategory: string },
): Candidate {
  const reasons: string[] = [];
  let score = 0;

  const targetName = normalizeText(target.name);
  const targetBrand = normalizeText(target.brand);
  const targetCategory = normalizeText(target.category);
  const targetSubcategory = normalizeText(target.subcategory);
  const candidateLabel = normalizeText(candidate.label);
  const candidateDescription = normalizeText(candidate.description);

  // Generic terms from the product name (without codes/models)
  const genericTerms = normalizeText(extractGenericProductTerms(target.name));

  if (candidateLabel && targetName && candidateLabel === targetName) {
    score += 45;
    reasons.push("label_exact_match");
  } else if (candidateLabel && genericTerms && candidateLabel === genericTerms) {
    score += 40;
    reasons.push("generic_label_exact_match");
  } else if (candidateLabel && targetName && candidateLabel.includes(targetName)) {
    score += 28;
    reasons.push("label_contains_target");
  } else if (candidateLabel && targetName && targetName.includes(candidateLabel)) {
    score += 20;
    reasons.push("target_contains_label");
  } else if (candidateLabel && genericTerms && (candidateLabel.includes(genericTerms) || genericTerms.includes(candidateLabel))) {
    score += 22;
    reasons.push("generic_terms_match");
  }

  if (targetBrand && candidateLabel.includes(targetBrand)) {
    score += 15;
    reasons.push("brand_in_label");
  }

  if (targetBrand && candidateDescription.includes(targetBrand)) {
    score += 10;
    reasons.push("brand_in_description");
  }

  // Category/subcategory matching
  if (targetSubcategory && (candidateLabel.includes(targetSubcategory) || candidateDescription.includes(targetSubcategory))) {
    score += 18;
    reasons.push("subcategory_match");
  } else if (targetCategory && (candidateLabel.includes(targetCategory) || candidateDescription.includes(targetCategory))) {
    score += 12;
    reasons.push("category_match");
  }

  // Dental/odontology context boost
  if (candidateDescription.includes("dental") || candidateDescription.includes("odonto") || candidateDescription.includes("dentist")) {
    score += 8;
    reasons.push("dental_context");
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

// ── Payload Builder Handlers (Dry-Run) ──────────────────────

async function handleBuildCompanyPayload(db: ReturnType<typeof createClient>) {
  const { data: company, error } = await db
    .from("company_profile")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[wikidata-sync] Failed to load company for payload build", error);
    return jsonResponse({ success: false, error: `Erro ao carregar empresa: ${error.message}` }, 500);
  }

  if (!company) {
    return jsonResponse({ success: false, error: "Nenhum perfil de empresa encontrado" }, 404);
  }

  try {
    const payload = buildCompanyPayload(company as CompanyProfileInput);
    const techSpecs = {};
    const summary = summarizePayload(payload, techSpecs, "company");

    console.log("[wikidata-sync] Company payload built", {
      claimCount: summary.claimCount,
      isValid: summary.isValid,
      semanticGrade: summary.semanticScore.grade,
      semanticOverall: summary.semanticScore.overall,
    });

    return jsonResponse({
      success: true,
      action: "build_company_payload",
      dryRun: true,
      payload,
      summary,
    });
  } catch (buildError) {
    console.error("[wikidata-sync] Company payload build FAILED", buildError);
    return jsonResponse({
      success: false,
      error: buildError instanceof Error ? buildError.message : "Build error",
    }, 400);
  }
}

async function handleBuildProductPayload(db: ReturnType<typeof createClient>, productId?: string) {
  if (!productId || typeof productId !== "string") {
    return jsonResponse({ success: false, error: "productId é obrigatório" }, 400);
  }

  const { data: product, error } = await db
    .from("products_repository")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("[wikidata-sync] Failed to load product for payload build", error);
    return jsonResponse({ success: false, error: `Erro ao carregar produto: ${error.message}` }, 500);
  }

  if (!product) {
    return jsonResponse({ success: false, error: "Produto não encontrado" }, 404);
  }

  // Get company QID and country
  const { data: company } = await db
    .from("company_profile")
    .select("wikidata_id, country")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const companyQid = company?.wikidata_id || "Q138636902";
  const companyCountry = company?.country || "Brasil";

  try {
    const productWithCountry = { ...(product as ProductInput), country: companyCountry };
    const payload = buildProductPayload(productWithCountry, companyQid);
    const techSpecs = extractTechSpecs(product.features, product.description);
    const summary = summarizePayload(payload, techSpecs, "product");

    console.log("[wikidata-sync] Product payload built", {
      productId,
      productName: product.name,
      claimCount: summary.claimCount,
      isValid: summary.isValid,
      semanticGrade: summary.semanticScore.grade,
      semanticOverall: summary.semanticScore.overall,
      techSpecs,
    });

    return jsonResponse({
      success: true,
      action: "build_product_payload",
      dryRun: true,
      productId,
      productName: product.name,
      payload,
      summary,
    });
  } catch (buildError) {
    console.error("[wikidata-sync] Product payload build FAILED", buildError);
    return jsonResponse({
      success: false,
      error: buildError instanceof Error ? buildError.message : "Build error",
      productId,
    }, 400);
  }
}

// ── resolve_and_persist Pipeline ────────────────────────────

async function handleResolveAndPersist(
  db: ReturnType<typeof createClient>,
  entityType?: string,
  internalId?: string,
) {
  const startTime = Date.now();

  if (!entityType || !internalId) {
    return jsonResponse({ success: false, error: "entityType and internalId required" }, 400);
  }

  if (entityType !== "company" && entityType !== "product") {
    return jsonResponse({ success: false, error: "entityType must be 'company' or 'product'" }, 400);
  }

  try {
    // 1. Circuit breaker check
    const { data: flag } = await db
      .from("system_flags")
      .select("value")
      .eq("key", "WIKIDATA_WRITE_ENABLED")
      .maybeSingle();

    const writeEnabled = flag?.value?.enabled === true;

    // 2. Build payload based on entity type
    let payload: WikidataPayload;
    let semanticEntityType: "company" | "product" = entityType;

    if (entityType === "company") {
      const { data: company, error } = await db
        .from("company_profile")
        .select("*")
        .eq("id", internalId)
        .maybeSingle();

      if (error || !company) {
        return logAndReturn(db, {
          action: "resolve_and_persist",
          entityType, internalId,
          writeDecision: "abort",
          success: false,
          errorCode: "ENTITY_NOT_FOUND",
          errorMessage: error?.message || "Company not found",
          durationMs: Date.now() - startTime,
        });
      }

      payload = buildCompanyPayload(company as CompanyProfileInput);
    } else {
      const { data: product, error } = await db
        .from("products_repository")
        .select("*")
        .eq("id", internalId)
        .maybeSingle();

      if (error || !product) {
        return logAndReturn(db, {
          action: "resolve_and_persist",
          entityType, internalId,
          writeDecision: "abort",
          success: false,
          errorCode: "ENTITY_NOT_FOUND",
          errorMessage: error?.message || "Product not found",
          durationMs: Date.now() - startTime,
        });
      }

      const { data: company } = await db
        .from("company_profile")
        .select("wikidata_id, country")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      const companyQid = company?.wikidata_id || "Q138636902";
      const productWithCountry = { ...(product as ProductInput), country: company?.country || "Brasil" };
      payload = buildProductPayload(productWithCountry, companyQid);
    }

    // 3. Canonicalize + SHA-256
    const payloadHash = await hashPayload(payload);

    // 4. Semantic score + write guard
    const score = evaluateSemanticScore(payload, semanticEntityType);

    if (!score.passed) {
      return logAndReturn(db, {
        action: "resolve_and_persist",
        entityType, internalId,
        payloadHash,
        writeDecision: "abort",
        success: false,
        semanticScore: score.overall,
        semanticGrade: score.grade,
        errorCode: "SEMANTIC_BLOCK",
        errorMessage: `Semantic score ${score.overall} < 0.7 threshold`,
        durationMs: Date.now() - startTime,
        requestPayload: payload,
      });
    }

    // 5. Atomic upsert with optimistic locking
    const { data: entityMap, error: upsertError } = await db.rpc("resolve_wikidata_entity", {
      p_entity_type: entityType,
      p_internal_id: internalId,
      p_payload_hash: payloadHash,
      p_resolution_score: score.overall,
      p_resolution_decision: score.overall >= 0.85 ? "link" : score.overall >= 0.7 ? "create" : "collision",
    }).maybeSingle();

    // Fallback: direct upsert if RPC doesn't exist
    let writeDecision: string;
    let syncStatus: string;
    let wikidataQid: string | null = null;
    let entityMapId: string | null = null;
    let existingRecord: any = null;

    if (upsertError) {
      // RPC doesn't exist yet — do direct upsert
      console.warn("[wikidata-sync] RPC fallback, direct upsert", upsertError.message);

      const { data: existingData } = await db
        .from("wikidata_entity_map")
        .select("*")
        .eq("entity_type", entityType)
        .eq("internal_id", internalId)
        .maybeSingle();

      existingRecord = existingData;

      const sameHash = existingRecord?.payload_hash === payloadHash;
      const hasQid = !!existingRecord?.wikidata_qid;

      if (sameHash && hasQid && existingRecord?.sync_status === "synced") {
        writeDecision = "skip";
        syncStatus = "synced";
        wikidataQid = existingRecord.wikidata_qid;
        entityMapId = existingRecord.id;
      } else if (sameHash && hasQid) {
        writeDecision = "update";
        syncStatus = existingRecord.sync_status;
        wikidataQid = existingRecord.wikidata_qid;
        entityMapId = existingRecord.id;
      } else if (sameHash && !hasQid) {
        writeDecision = "create";
        syncStatus = existingRecord.sync_status;
        entityMapId = existingRecord.id;
      } else {
        const upsertData = {
          entity_type: entityType,
          internal_id: internalId,
          payload_hash: payloadHash,
          sync_status: "pending" as const,
          resolution_score: score.overall,
          resolution_decision: score.overall >= 0.85 ? "link" : score.overall >= 0.7 ? "create" : "collision",
        };

        if (existingRecord) {
          const { data: updated } = await db
            .from("wikidata_entity_map")
            .update({
              ...upsertData,
              lock_version: (existingRecord.lock_version || 0) + 1,
            })
            .eq("id", existingRecord.id)
            .eq("lock_version", existingRecord.lock_version || 0)
            .select()
            .maybeSingle();

          if (!updated) {
            return logAndReturn(db, {
              action: "resolve_and_persist",
              entityType, internalId, payloadHash,
              writeDecision: "abort",
              success: false,
              errorCode: "OPTIMISTIC_LOCK_FAILURE",
              errorMessage: "Concurrent modification detected",
              durationMs: Date.now() - startTime,
            });
          }
          writeDecision = "update";
          syncStatus = "pending";
          entityMapId = updated.id;
          wikidataQid = updated.wikidata_qid;
        } else {
          const { data: inserted } = await db
            .from("wikidata_entity_map")
            .insert(upsertData)
            .select()
            .maybeSingle();

          writeDecision = "create";
          syncStatus = "pending";
          entityMapId = inserted?.id || null;
        }
      }
    } else {
      writeDecision = entityMap?.write_decision || "create";
      syncStatus = entityMap?.sync_status || "pending";
      wikidataQid = entityMap?.wikidata_qid || null;
      entityMapId = entityMap?.id || null;
    }

    // --- Orphan QID recovery (skip category QIDs) ---
    let repairSource: string | null = null;
    if (!wikidataQid) {
      let candidateQid: string | null = null;
      if (entityType === "company") {
        const { data: srcData } = await db.from("company_profile").select("wikidata_id").eq("id", internalId).maybeSingle();
        candidateQid = srcData?.wikidata_id || null;
      } else {
        const { data: srcData } = await db.from("products_repository").select("wikidata_item_id").eq("id", internalId).maybeSingle();
        candidateQid = srcData?.wikidata_item_id || null;
      }
      // Block category QIDs from being treated as orphan product QIDs
      if (candidateQid && !getCategoryQids().has(candidateQid)) {
        wikidataQid = candidateQid;
        writeDecision = "update";
        repairSource = "orphan_qid";
        console.log(`[wikidata-sync] Repair: orphan QID ${wikidataQid} from source`);
      } else if (candidateQid && getCategoryQids().has(candidateQid)) {
        console.log(`[wikidata-sync] Skipped orphan recovery: ${candidateQid} is a category QID`);
      }
    }

    // --- Anti-dup multi-label + aliases ---
    if (!wikidataQid && writeDecision === "create") {
      const labelCandidates = [
        payload.labels?.pt?.value,
        payload.labels?.en?.value,
        ...(payload.aliases?.pt || []).map((a: any) => a.value || a),
        ...(payload.aliases?.en || []).map((a: any) => a.value || a),
      ].filter(Boolean) as string[];
      for (const lbl of labelCandidates) {
        const found = await findExistingEntity(normalizeLabel(lbl));
        if (found) {
          wikidataQid = found;
          writeDecision = "update";
          repairSource = "anti_dup_match";
          console.log(`[wikidata-sync] Anti-dup: ${found} via "${lbl}"`);
          break;
        }
      }
    }

    // --- Payload validation guard ---
    if (writeDecision !== "skip" && writeDecision !== "abort") {
      const requiredLangs = ["pt", "en"];
      const missingLangs = requiredLangs.filter(lang => {
        const val = payload.labels?.[lang]?.value;
        return !val || !val.trim() || val.trim().length < 2;
      });
      if (missingLangs.length) {
        return logAndReturn(db, {
          action: "resolve_and_persist", entityType, internalId, payloadHash,
          writeDecision: "abort", success: false,
          errorCode: "INVALID_PAYLOAD",
          errorMessage: `Missing/invalid labels for: ${missingLangs.join(", ")}`,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // --- Structured logging ---
    const sameHashFlag = existingRecord?.payload_hash === payloadHash;
    console.log("[wikidata-sync] Decision context:", JSON.stringify({
      phase: "pre_write", entityType, internalId,
      decision: writeDecision, syncStatus,
      hasQid: !!wikidataQid, sameHash: sameHashFlag ?? null,
      targetQid: wikidataQid, entityMapId, writeEnabled,
      repairMode: writeDecision === "update" && (sameHashFlag ?? false),
      repairSource,
    }));

    // 6. If write enabled and decision requires write, execute real write
    if (writeEnabled && writeDecision !== "skip" && writeDecision !== "abort") {
      const secrets = getWikidataSecrets();
      if (secrets) {
        try {
          // Anti-duplication: check if entity already exists on Wikidata
          const ptLabel = payload.labels?.pt?.value || payload.labels?.["pt-br"]?.value;
          let existingQid: string | null = null;

          if (writeDecision === "create" && ptLabel) {
            existingQid = await findExistingEntity(ptLabel);
            if (existingQid) {
              console.log(`[wikidata-sync] Anti-duplication: found existing ${existingQid} for "${ptLabel}"`);
            }
          }

          const targetQid = wikidataQid || existingQid || null;

          if (targetQid && writeDecision === "create") writeDecision = "update";

          // Anti-dup recheck (race condition mitigation)
          let finalTargetQid = targetQid;
          if (!finalTargetQid && writeDecision === "create" && ptLabel) {
            const recheck = await findExistingEntity(normalizeLabel(ptLabel));
            if (recheck) {
              finalTargetQid = recheck;
              writeDecision = "update";
              console.log("[wikidata-sync] Anti-dup recheck:", recheck);
            }
          }

          const finalQid = await withRetry(
            () => executeWbEditEntity(payload, secrets, finalTargetQid),
            { max: 3, delays: [600, 1500, 3000], retryOn: ["API_RATE_LIMIT", "NETWORK_ERROR", "maxlag", "readonly", "timeout"] },
          );

          // Persist QID back to entity_map
          if (entityMapId) {
            await db
              .from("wikidata_entity_map")
              .update({
                wikidata_qid: finalQid,
                sync_status: "synced",
                last_synced_at: new Date().toISOString(),
              })
              .eq("id", entityMapId);
          }

          // Also persist to source table
          if (entityType === "company") {
            await db
              .from("company_profile")
              .update({ wikidata_id: finalQid, updated_at: new Date().toISOString() })
              .eq("id", internalId);
          } else {
            await db
              .from("products_repository")
              .update({ wikidata_item_id: finalQid, updated_at: new Date().toISOString() })
              .eq("id", internalId);
          }

          wikidataQid = finalQid;
          syncStatus = "synced";
          console.log(`[wikidata-sync] ✅ Live write complete: ${finalQid}`);

          // Read-after-write verification (non-blocking)
          const capturedQid = finalQid;
          setTimeout(async () => {
            try {
              const vRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${capturedQid}&props=labels|descriptions|claims&format=json`);
              const vJson = await vRes.json();
              const e = vJson?.entities?.[capturedQid];
              const labelPt = e?.labels?.pt?.value;
              const labelEn = e?.labels?.en?.value;
              const validLabels = [labelPt, labelEn].filter((v: string | undefined) => v && v.trim().length >= 2);
              const hasCoreData = validLabels.length > 0 && Object.keys(e?.claims || {}).length > 0;
              console.log(`[wikidata-sync] Verify: ${capturedQid} hasCoreData=${hasCoreData} labels=${validLabels.length}`);
              if (!hasCoreData) console.warn(`[wikidata-sync] ⚠ Weak write: ${capturedQid}`);
            } catch { /* non-blocking */ }
          }, 1500);
        } catch (writeErr) {
          console.error("[wikidata-sync] Live write FAILED", writeErr);

          // Update entity_map status to failed
          if (entityMapId) {
            await db
              .from("wikidata_entity_map")
              .update({ sync_status: "failed", retry_count: 1 })
              .eq("id", entityMapId);
          }

          syncStatus = "failed";
          const writeErrorMessage = writeErr instanceof Error ? writeErr.message : "Write failed";
          const writeErrorCode = writeErrorMessage.includes("WIKIDATA_OAUTH_INVALID_AUTHORIZATION")
            ? "WIKIDATA_OAUTH_INVALID_AUTHORIZATION"
            : "WRITE_FAILED";
          const friendlyWriteError = writeErrorCode === "WIKIDATA_OAUTH_INVALID_AUTHORIZATION"
            ? "Credenciais OAuth do Wikidata inválidas ou expiradas. Atualize os secrets WIKIDATA_ACCESS_TOKEN / WIKIDATA_ACCESS_SECRET."
            : writeErrorMessage;

          return logAndReturn(db, {
            action: "resolve_and_persist",
            entityType, internalId, payloadHash,
            writeDecision,
            success: false,
            semanticScore: score.overall,
            semanticGrade: score.grade,
            wikidataQid,
            entityMapId,
            syncStatus: "failed",
            writeEnabled,
            errorCode: writeErrorCode,
            errorMessage: friendlyWriteError,
            durationMs: Date.now() - startTime,
            requestPayload: payload,
          });
        }
      } else {
        console.warn("[wikidata-sync] Write enabled but OAuth secrets missing — staying in preview mode");
      }
    }

    // 7. Log and return
    return logAndReturn(db, {
      action: "resolve_and_persist",
      entityType, internalId, payloadHash,
      writeDecision,
      success: true,
      semanticScore: score.overall,
      semanticGrade: score.grade,
      wikidataQid,
      entityMapId,
      syncStatus,
      writeEnabled,
      durationMs: Date.now() - startTime,
      requestPayload: payload,
      collisionCandidates: score.overall >= 0.7 && score.overall < 0.85 ? score.details : undefined,
    });
  } catch (err) {
    console.error("[wikidata-sync] resolve_and_persist error", err);
    return logAndReturn(db, {
      action: "resolve_and_persist",
      entityType, internalId,
      writeDecision: "abort",
      success: false,
      errorCode: "INTERNAL_ERROR",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
  }
}

// ── execute_write Action (Manual Publish) ───────────────────

async function handleExecuteWrite(
  db: ReturnType<typeof createClient>,
  entityType?: string,
  internalId?: string,
) {
  const startTime = Date.now();

  if (!entityType || !internalId) {
    return jsonResponse({ success: false, error: "entityType and internalId required" }, 400);
  }

  if (entityType !== "company" && entityType !== "product") {
    return jsonResponse({ success: false, error: "entityType must be 'company' or 'product'" }, 400);
  }

  // 1. Circuit breaker
  const { data: flag } = await db
    .from("system_flags")
    .select("value")
    .eq("key", "WIKIDATA_WRITE_ENABLED")
    .maybeSingle();

  if (flag?.value?.enabled !== true) {
    return logAndReturn(db, {
      action: "execute_write",
      entityType, internalId,
      writeDecision: "abort",
      success: false,
      errorCode: "CIRCUIT_BREAKER_OFF",
      errorMessage: "WIKIDATA_WRITE_ENABLED is not enabled",
      durationMs: Date.now() - startTime,
    });
  }

  // 2. Check OAuth secrets
  const secrets = getWikidataSecrets();
  if (!secrets) {
    return logAndReturn(db, {
      action: "execute_write",
      entityType, internalId,
      writeDecision: "abort",
      success: false,
      errorCode: "MISSING_SECRETS",
      errorMessage: "Wikidata OAuth secrets not configured",
      durationMs: Date.now() - startTime,
    });
  }

  try {
    // 3. Build payload
    let payload: WikidataPayload;

    if (entityType === "company") {
      const { data: company, error } = await db.from("company_profile").select("*").eq("id", internalId).maybeSingle();
      if (error || !company) {
        return logAndReturn(db, { action: "execute_write", entityType, internalId, writeDecision: "abort", success: false, errorCode: "ENTITY_NOT_FOUND", errorMessage: "Company not found", durationMs: Date.now() - startTime });
      }
      payload = buildCompanyPayload(company as CompanyProfileInput);
    } else {
      const { data: product, error } = await db.from("products_repository").select("*").eq("id", internalId).maybeSingle();
      if (error || !product) {
        return logAndReturn(db, { action: "execute_write", entityType, internalId, writeDecision: "abort", success: false, errorCode: "ENTITY_NOT_FOUND", errorMessage: "Product not found", durationMs: Date.now() - startTime });
      }
      const { data: company } = await db.from("company_profile").select("wikidata_id, country").order("updated_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
      const companyQid = company?.wikidata_id || "Q138636902";
      payload = buildProductPayload({ ...(product as ProductInput), country: company?.country || "Brasil" }, companyQid);
    }

    // 4. Semantic guard
    const score = evaluateSemanticScore(payload, entityType as "company" | "product");
    if (!score.passed) {
      return logAndReturn(db, {
        action: "execute_write", entityType, internalId,
        writeDecision: "abort", success: false,
        semanticScore: score.overall, semanticGrade: score.grade,
        errorCode: "SEMANTIC_BLOCK",
        errorMessage: `Score ${score.overall} < 0.7`,
        durationMs: Date.now() - startTime,
        requestPayload: payload,
      });
    }

    // 5. Anti-duplication check
    const ptLabel = payload.labels?.pt?.value || payload.labels?.["pt-br"]?.value;
    let existingQid: string | null = null;

    // Check entity_map first
    const { data: entityMap } = await db
      .from("wikidata_entity_map")
      .select("wikidata_qid")
      .eq("entity_type", entityType)
      .eq("internal_id", internalId)
      .maybeSingle();

    existingQid = entityMap?.wikidata_qid || null;

    // Also check source table
    if (!existingQid) {
      if (entityType === "company") {
        const { data } = await db.from("company_profile").select("wikidata_id").eq("id", internalId).maybeSingle();
        existingQid = data?.wikidata_id || null;
      } else {
        const { data } = await db.from("products_repository").select("wikidata_item_id").eq("id", internalId).maybeSingle();
        existingQid = data?.wikidata_item_id || null;
      }
    }

    // Search Wikidata for duplicates if creating new
    if (!existingQid && ptLabel) {
      existingQid = await findExistingEntity(ptLabel);
      if (existingQid) {
        console.log(`[wikidata-sync] Anti-duplication found: ${existingQid} for "${ptLabel}"`);
      }
    }

    // 6. Execute write
    const payloadHash = await hashPayload(payload);
    const finalQid = await withRetry(
      () => executeWbEditEntity(payload, secrets, existingQid),
      { max: 3, delays: [600, 1500, 3000], retryOn: ["API_RATE_LIMIT", "NETWORK_ERROR"] },
    );

    // 7. Persist QID
    // Update entity_map
    await db.from("wikidata_entity_map").upsert({
      entity_type: entityType,
      internal_id: internalId,
      wikidata_qid: finalQid,
      payload_hash: payloadHash,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      resolution_score: score.overall,
      resolution_decision: existingQid ? "link" : "create",
    }, { onConflict: "entity_type,internal_id" });

    // Update source table
    if (entityType === "company") {
      await db.from("company_profile").update({ wikidata_id: finalQid, updated_at: new Date().toISOString() }).eq("id", internalId);
    } else {
      await db.from("products_repository").update({ wikidata_item_id: finalQid, updated_at: new Date().toISOString() }).eq("id", internalId);
    }

    // 8. Log
    return logAndReturn(db, {
      action: "execute_write",
      entityType, internalId, payloadHash,
      writeDecision: existingQid ? "update" : "create",
      success: true,
      semanticScore: score.overall,
      semanticGrade: score.grade,
      wikidataQid: finalQid,
      syncStatus: "synced",
      writeEnabled: true,
      durationMs: Date.now() - startTime,
      requestPayload: payload,
    });
  } catch (err) {
    console.error("[wikidata-sync] execute_write error", err);
    return logAndReturn(db, {
      action: "execute_write",
      entityType, internalId,
      writeDecision: "abort",
      success: false,
      errorCode: "WRITE_FAILED",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
  }
}

interface LogEntry {
  action: string;
  entityType: string;
  internalId: string;
  payloadHash?: string;
  writeDecision: string;
  success: boolean;
  semanticScore?: number;
  semanticGrade?: string;
  wikidataQid?: string | null;
  entityMapId?: string | null;
  syncStatus?: string;
  writeEnabled?: boolean;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
  requestPayload?: unknown;
  collisionCandidates?: unknown;
}

async function logAndReturn(
  db: ReturnType<typeof createClient>,
  entry: LogEntry,
) {
  // Insert sync log
  try {
    await db.from("wikidata_sync_logs").insert({
      entity_map_id: entry.entityMapId || null,
      action: entry.action,
      entity_type: entry.entityType,
      internal_id: entry.internalId,
      wikidata_qid: entry.wikidataQid || null,
      payload_hash: entry.payloadHash || null,
      write_decision: entry.writeDecision,
      success: entry.success,
      error_code: entry.errorCode || null,
      error_message: entry.errorMessage || null,
      semantic_grade: entry.semanticGrade || null,
      semantic_score: entry.semanticScore || null,
      duration_ms: entry.durationMs,
      request_payload: entry.requestPayload ? JSON.parse(JSON.stringify(entry.requestPayload)) : null,
    });
  } catch (logErr) {
    console.error("[wikidata-sync] Failed to insert sync log", logErr);
  }

  const status = entry.success
    ? 200
    : entry.errorCode === "ENTITY_NOT_FOUND"
      ? 404
      : entry.errorCode === "WIKIDATA_OAUTH_INVALID_AUTHORIZATION"
        ? 401
        : 400;

  return jsonResponse({
    success: entry.success,
    writeDecision: entry.writeDecision,
    syncStatus: entry.syncStatus || (entry.success ? "pending" : "failed"),
    semanticScore: entry.semanticScore,
    semanticGrade: entry.semanticGrade,
    wikidataQid: entry.wikidataQid,
    writeEnabled: entry.writeEnabled,
    payloadHash: entry.payloadHash,
    collisionCandidates: entry.collisionCandidates,
    error: entry.errorMessage,
    errorCode: entry.errorCode,
    durationMs: entry.durationMs,
  }, status);
}

// ── Retry with Exponential Backoff ──────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { max?: number; delays?: number[]; retryOn?: string[] } = {},
): Promise<T> {
  const { max = 3, delays = [600, 1500, 3000], retryOn = ["API_RATE_LIMIT", "NETWORK_ERROR", "maxlag", "readonly", "timeout"] } = options;

  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const errorCode = (err as { code?: string })?.code || "";
      const isRetryable = retryOn.some(code => 
        errorCode.includes(code) || (err instanceof Error && err.message.includes(code))
      );

      if (!isRetryable || attempt >= max - 1) throw err;

      const delay = delays[Math.min(attempt, delays.length - 1)];
      console.warn(`[wikidata-sync] Retry ${attempt + 1}/${max} after ${delay}ms`, errorCode);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("withRetry: exhausted all attempts");
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}
