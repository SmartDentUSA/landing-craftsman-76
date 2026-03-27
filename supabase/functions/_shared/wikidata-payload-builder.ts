// ============================================================
// Wikidata Payload Builder v2.0 — Hardened & Spec-Compliant
// Whitelist-enforced, QID-validated, authority-grade references
// ============================================================

// ── Property Whitelist (Hard Enforcement) ───────────────────

const PROPERTY_WHITELIST = {
  company: [
    "P31",   // instance of
    "P17",   // country
    "P856",  // official website
    "P571",  // inception
    "P625",  // coordinate location
    "P1651", // YouTube video ID
    "P2003", // Instagram username
    "P2013", // Facebook ID
    "P4264", // LinkedIn company ID
    "P2397", // YouTube channel ID
    "P1327", // partner organization
    "P154",  // logo image (Commons)
    "P968",  // email address
    "P1329", // phone number
    "P3225", // DUNS number
    "P6204", // CNPJ (tax ID)
    "P973",  // described at URL
  ] as const,
  product: [
    "P31",   // instance of (MUST be Q2424752 = product model)
    "P176",  // manufacturer
    "P973",  // described at URL
    "P495",  // country of origin (conditional: only if Brasil)
  ] as const,
} as const;

type EntityType = keyof typeof PROPERTY_WHITELIST;

function isPropertyAllowed(entityType: EntityType, property: string): boolean {
  return (PROPERTY_WHITELIST[entityType] as readonly string[]).includes(property);
}

// ── QID Validator ───────────────────────────────────────────

function isValidQID(value: string): boolean {
  return /^Q\d+$/.test(value);
}

function assertValidQID(value: string, context: string): void {
  if (!isValidQID(value)) {
    throw new Error(`Invalid QID "${value}" in ${context}. Must match /^Q\\d+$/`);
  }
}

// ── Wikidata API Types ──────────────────────────────────────

export interface WikidataEntityId {
  "entity-type": "item";
  "numeric-id": number;
  id: string;
}

export interface WikidataStringValue {
  type: "string";
  value: string;
}

export interface WikidataTimeValue {
  type: "time";
  value: {
    time: string;
    timezone: 0;
    before: 0;
    after: 0;
    precision: number;
    calendarmodel: "http://www.wikidata.org/entity/Q1985727";
  };
}

export interface WikidataQuantityValue {
  type: "quantity";
  value: {
    amount: string;
    unit: string;
  };
}

export interface WikidataGlobeCoordinateValue {
  type: "globecoordinate";
  value: {
    latitude: number;
    longitude: number;
    altitude: null;
    precision: number;
    globe: "http://www.wikidata.org/entity/Q2";
  };
}

export type WikidataDataValue =
  | { type: "wikibase-entityid"; value: WikidataEntityId }
  | WikidataStringValue
  | WikidataTimeValue
  | WikidataQuantityValue
  | WikidataGlobeCoordinateValue;

export interface WikidataMainSnak {
  snaktype: "value";
  property: string;
  datavalue: WikidataDataValue;
}

export interface WikidataReference {
  snaks: Record<string, WikidataMainSnak[]>;
  "snaks-order": string[];
}

export interface WikidataClaim {
  mainsnak: WikidataMainSnak;
  type: "statement";
  rank: "normal" | "preferred" | "deprecated";
  qualifiers?: Record<string, WikidataMainSnak[]>;
  "qualifiers-order"?: string[];
  references?: WikidataReference[];
}

export interface WikidataLabel {
  language: string;
  value: string;
}

export interface WikidataPayload {
  labels?: Record<string, WikidataLabel>;
  descriptions?: Record<string, WikidataLabel>;
  aliases?: Record<string, WikidataLabel[]>;
  claims?: Record<string, WikidataClaim[]>;
}

// ── Extracted Tech Specs (for description enrichment only) ──

export interface TechSpecs {
  flexuralStrengthMPa?: number;
  shoreHardness?: { scale: "A" | "D"; value: number };
  radiopacity?: number;
  translucency?: number;
  depthOfCureMm?: number;
  workingTimeSeconds?: number;
}

// ── Claim Builders ──────────────────────────────────────────

function entityId(qid: string): WikidataDataValue {
  assertValidQID(qid, "entityId builder");
  const numericId = parseInt(qid.replace("Q", ""), 10);
  return {
    type: "wikibase-entityid",
    value: { "entity-type": "item", "numeric-id": numericId, id: qid },
  };
}

function stringVal(val: string): WikidataDataValue {
  return { type: "string", value: val };
}

function timeVal(year: number): WikidataDataValue {
  return {
    type: "time",
    value: {
      time: `+${String(year).padStart(4, "0")}-00-00T00:00:00Z`,
      timezone: 0,
      before: 0,
      after: 0,
      precision: 9,
      calendarmodel: "http://www.wikidata.org/entity/Q1985727",
    },
  };
}

function globeCoordinate(lat: number, lon: number): WikidataDataValue {
  return {
    type: "globecoordinate",
    value: {
      latitude: lat,
      longitude: lon,
      altitude: null,
      precision: 0.0001,
      globe: "http://www.wikidata.org/entity/Q2",
    },
  };
}

function buildClaim(
  property: string,
  datavalue: WikidataDataValue,
  references?: WikidataReference[],
): WikidataClaim {
  const claim: WikidataClaim = {
    mainsnak: { snaktype: "value", property, datavalue },
    type: "statement",
    rank: "normal",
  };
  if (references?.length) {
    claim.references = references;
  }
  return claim;
}

// ── Structured Authority Reference Builder ──────────────────
// Full reference with P248 (stated in), P854 (reference URL), P813 (retrieved)

function buildAuthorityReference(url: string, sourceQID?: string): WikidataReference {
  const snaks: Record<string, WikidataMainSnak[]> = {};
  const snaksOrder: string[] = [];

  // P248: stated in (source entity)
  if (sourceQID && isValidQID(sourceQID)) {
    snaks["P248"] = [{
      snaktype: "value",
      property: "P248",
      datavalue: entityId(sourceQID),
    }];
    snaksOrder.push("P248");
  }

  // P854: reference URL
  snaks["P854"] = [{
    snaktype: "value",
    property: "P854",
    datavalue: stringVal(url),
  }];
  snaksOrder.push("P854");

  // P813: retrieved (today's date)
  const today = new Date();
  const dateStr = `+${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00:00Z`;
  snaks["P813"] = [{
    snaktype: "value",
    property: "P813",
    datavalue: {
      type: "time",
      value: {
        time: dateStr,
        timezone: 0,
        before: 0,
        after: 0,
        precision: 11, // day precision
        calendarmodel: "http://www.wikidata.org/entity/Q1985727",
      },
    },
  }];
  snaksOrder.push("P813");

  return { snaks, "snaks-order": snaksOrder };
}

function addClaimWhitelisted(
  entityType: EntityType,
  claims: Record<string, WikidataClaim[]>,
  property: string,
  datavalue: WikidataDataValue,
  references?: WikidataReference[],
) {
  if (!isPropertyAllowed(entityType, property)) {
    console.warn(`[PayloadBuilder] BLOCKED: Property ${property} not in ${entityType} whitelist`);
    return;
  }
  if (!claims[property]) claims[property] = [];
  claims[property].push(buildClaim(property, datavalue, references));
}

// ── YouTube ID Extractor ────────────────────────────────────

function extractYouTubeIds(videos: unknown): string[] {
  if (!Array.isArray(videos)) return [];
  const ids: string[] = [];
  for (const v of videos) {
    if (!v || typeof v !== "object") continue;
    const record = v as Record<string, unknown>;
    for (const key of ["youtube_id", "youtubeId", "video_id", "videoId", "url"]) {
      const val = record[key];
      if (typeof val === "string" && val.trim()) {
        const match = val.match(
          /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
        );
        if (match) {
          ids.push(match[1]);
        } else if (/^[a-zA-Z0-9_-]{11}$/.test(val.trim())) {
          ids.push(val.trim());
        }
      }
    }
  }
  return [...new Set(ids)];
}

// ── Tech Spec Parser (for description enrichment ONLY) ──────
// IMPORTANT: These values are NOT sent as claims (P2076/P1306 removed).
// They enrich labels/descriptions/aliases for semantic discoverability.

export function extractTechSpecs(
  features?: unknown,
  description?: string | null,
): TechSpecs {
  const specs: TechSpecs = {};
  const texts: string[] = [];

  if (Array.isArray(features)) {
    for (const f of features) {
      if (typeof f === "string") texts.push(f);
      else if (f && typeof f === "object") {
        const rec = f as Record<string, unknown>;
        if (typeof rec.text === "string") texts.push(rec.text);
        if (typeof rec.value === "string") texts.push(rec.value);
        if (typeof rec.description === "string") texts.push(rec.description);
        if (typeof rec.name === "string" && typeof rec.value === "string") {
          texts.push(`${rec.name}: ${rec.value}`);
        }
      }
    }
  }

  if (description) texts.push(description);
  const combined = texts.join(" ");

  const mpaMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*MPa/i);
  if (mpaMatch) specs.flexuralStrengthMPa = parseFloat(mpaMatch[1].replace(",", "."));

  const shoreMatch = combined.match(/Shore\s*([AD])\s*(\d+)/i);
  if (shoreMatch) {
    specs.shoreHardness = {
      scale: shoreMatch[1].toUpperCase() as "A" | "D",
      value: parseInt(shoreMatch[2], 10),
    };
  }

  const radioMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?radiopac/i);
  if (radioMatch) specs.radiopacity = parseFloat(radioMatch[1].replace(",", "."));

  const transMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?transluc/i);
  if (transMatch) specs.translucency = parseFloat(transMatch[1].replace(",", "."));

  const depthMatch = combined.match(/(?:profundidade|depth)\s*(?:de\s+)?(?:cura|cure)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*mm/i);
  if (depthMatch) specs.depthOfCureMm = parseFloat(depthMatch[1].replace(",", "."));

  const workMatch = combined.match(/(?:tempo|time)\s*(?:de\s+)?(?:trabalho|work)\s*(?:de\s+)?(\d+)\s*(?:s|seg|sec)/i);
  if (workMatch) specs.workingTimeSeconds = parseInt(workMatch[1], 10);

  return specs;
}

// ── Description Enrichment with Tech Specs ──────────────────
// Instead of claims, embed tech data into multilingual descriptions

function buildEnrichedDescription(
  baseDesc: string,
  specs: TechSpecs,
  lang: "pt" | "en" | "es",
): string {
  const parts: string[] = [];

  if (specs.flexuralStrengthMPa) {
    const labels = { pt: "resistência flexural", en: "flexural strength", es: "resistencia flexural" };
    parts.push(`${labels[lang]} ${specs.flexuralStrengthMPa} MPa`);
  }
  if (specs.shoreHardness) {
    const labels = { pt: "dureza", en: "hardness", es: "dureza" };
    parts.push(`${labels[lang]} Shore ${specs.shoreHardness.scale} ${specs.shoreHardness.value}`);
  }
  if (specs.radiopacity) {
    const labels = { pt: "radiopacidade", en: "radiopacity", es: "radiopacidad" };
    parts.push(`${labels[lang]} ${specs.radiopacity}%`);
  }
  if (specs.depthOfCureMm) {
    const labels = { pt: "profundidade de cura", en: "depth of cure", es: "profundidad de curado" };
    parts.push(`${labels[lang]} ${specs.depthOfCureMm} mm`);
  }

  if (parts.length === 0) return baseDesc;

  const enriched = `${baseDesc} (${parts.join(", ")})`;
  return enriched.length > 250 ? enriched.slice(0, 247) + "..." : enriched;
}

// ── Company Payload Builder ─────────────────────────────────

export interface CompanyProfileInput {
  company_name?: string | null;
  legal_name?: string | null;
  company_description?: string | null;
  website_url?: string | null;
  founded_year?: number | null;
  founder_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  company_logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  duns_number?: string | null;
  tax_id?: string | null;
  country?: string | null;
  wikidata_id?: string | null;
  company_videos?: unknown;
  youtube_channel?: string | null;
  institutional_links?: unknown;
  social_media_links?: unknown;
}

export function buildCompanyPayload(company: CompanyProfileInput): WikidataPayload {
  const payload: WikidataPayload = {};
  const claims: Record<string, WikidataClaim[]> = {};
  const add = (p: string, v: WikidataDataValue, refs?: WikidataReference[]) =>
    addClaimWhitelisted("company", claims, p, v, refs);

  // Website reference for authority
  const siteRef = company.website_url
    ? [buildAuthorityReference(company.website_url, "Q138636902")]
    : undefined;

  // Labels
  const name = company.company_name?.trim();
  if (name) {
    payload.labels = {
      pt: { language: "pt", value: name },
      "pt-br": { language: "pt-br", value: name },
    };
  }

  // Descriptions
  const desc = company.company_description?.trim();
  if (desc) {
    const shortDesc = desc.length > 250 ? desc.slice(0, 247) + "..." : desc;
    payload.descriptions = {
      pt: { language: "pt", value: shortDesc },
      "pt-br": { language: "pt-br", value: shortDesc },
    };
  }

  // Aliases
  if (company.legal_name && company.legal_name !== company.company_name) {
    payload.aliases = {
      pt: [{ language: "pt", value: company.legal_name.trim() }],
    };
  }

  // ── Claims (whitelist-enforced) ──

  // P31: instance of → Q4830453 (business enterprise)
  add("P31", entityId("Q4830453"));

  // P17: country → Q155 (Brazil)
  add("P17", entityId("Q155"));

  // P856: official website
  if (company.website_url) {
    add("P856", stringVal(company.website_url), siteRef);
  }

  // P571: inception (founded year)
  if (company.founded_year && company.founded_year > 1800 && company.founded_year <= new Date().getFullYear()) {
    add("P571", timeVal(company.founded_year), siteRef);
  }

  // P625: coordinate location
  if (
    company.latitude != null &&
    company.longitude != null &&
    company.latitude >= -90 && company.latitude <= 90 &&
    company.longitude >= -180 && company.longitude <= 180
  ) {
    add("P625", globeCoordinate(company.latitude, company.longitude));
  }

  // P154: logo image (Commons filename)
  if (company.company_logo_url) {
    add("P154", stringVal(company.company_logo_url));
  }

  // P968: email address
  if (company.contact_email) {
    add("P968", stringVal(company.contact_email));
  }

  // P1329: phone number
  if (company.contact_phone) {
    add("P1329", stringVal(company.contact_phone));
  }

  // P3225: DUNS number
  if (company.duns_number) {
    add("P3225", stringVal(company.duns_number));
  }

  // P6204: CNPJ (tax ID)
  if (company.tax_id) {
    add("P6204", stringVal(company.tax_id));
  }

  // P973: described at URL
  if (company.website_url) {
    add("P973", stringVal(company.website_url));
  }

  // P1651: YouTube video IDs
  const ytIds = extractYouTubeIds(company.company_videos);
  for (const id of ytIds.slice(0, 10)) {
    add("P1651", stringVal(id));
  }

  // P2397: YouTube channel ID
  if (company.youtube_channel) {
    const channelMatch = company.youtube_channel.match(
      /youtube\.com\/(?:channel\/|c\/|@)([a-zA-Z0-9_-]+)/,
    );
    if (channelMatch) {
      add("P2397", stringVal(channelMatch[1]));
    }
  }

  // P1327: partner organization (from institutional_links)
  if (Array.isArray(company.institutional_links)) {
    for (const link of company.institutional_links) {
      if (link && typeof link === "object") {
        const rec = link as Record<string, unknown>;
        const url = (rec.url || rec.link) as string | undefined;
        if (typeof url === "string" && url.startsWith("http")) {
          add("P1327", stringVal(url));
        }
      }
    }
  }

  // P2003: Instagram username
  if (company.social_media_links && typeof company.social_media_links === "object") {
    const social = company.social_media_links as Record<string, unknown>;
    if (typeof social.instagram === "string" && social.instagram) {
      const igMatch = social.instagram.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      if (igMatch) add("P2003", stringVal(igMatch[1]));
    }
  }

  if (Object.keys(claims).length > 0) {
    payload.claims = claims;
  }

  return payload;
}

// ── Product Payload Builder ─────────────────────────────────

export interface ProductInput {
  name?: string | null;
  brand?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  wikidata_item_id?: string | null;
  features?: unknown;
  technical_documents?: unknown;
  technical_specifications?: unknown;
  image_url?: string | null;
  product_url?: string | null;
  country?: string | null;
  ean?: string | null;
  gtin?: string | null;
  mpn?: string | null;
}

export function buildProductPayload(
  product: ProductInput,
  companyQid: string = "Q138636902",
): WikidataPayload {
  assertValidQID(companyQid, "buildProductPayload companyQid");

  const payload: WikidataPayload = {};
  const claims: Record<string, WikidataClaim[]> = {};
  const add = (p: string, v: WikidataDataValue, refs?: WikidataReference[]) =>
    addClaimWhitelisted("product", claims, p, v, refs);

  // Extract tech specs for description enrichment (NOT for claims)
  const specs = extractTechSpecs(product.features, product.description);

  // Labels
  const name = product.name?.trim();
  if (name) {
    payload.labels = {
      pt: { language: "pt", value: name },
      "pt-br": { language: "pt-br", value: name },
    };
  }

  // Description — enriched with tech specs instead of claims
  const desc = product.description?.trim();
  if (desc) {
    const shortDesc = desc.length > 250 ? desc.slice(0, 247) + "..." : desc;
    const enrichedPt = buildEnrichedDescription(shortDesc, specs, "pt");
    payload.descriptions = {
      pt: { language: "pt", value: enrichedPt },
      "pt-br": { language: "pt-br", value: enrichedPt },
    };
  }

  // Aliases — include tech spec keywords for discoverability
  const aliasValues: string[] = [];
  if (product.brand && product.brand !== product.name) {
    aliasValues.push(product.brand);
  }
  if (specs.flexuralStrengthMPa) {
    aliasValues.push(`${specs.flexuralStrengthMPa} MPa`);
  }
  if (specs.shoreHardness) {
    aliasValues.push(`Shore ${specs.shoreHardness.scale} ${specs.shoreHardness.value}`);
  }
  if (aliasValues.length > 0) {
    payload.aliases = {
      pt: aliasValues.map(v => ({ language: "pt", value: v })),
    };
  }

  // Build authority reference from product URL
  const productRef = product.product_url
    ? [buildAuthorityReference(product.product_url, companyQid)]
    : undefined;

  // ── Claims (whitelist-enforced, NO P2076/P1306) ──

  // P31: instance of → Q2424752 (product model) — FIXED, always product model
  add("P31", entityId("Q2424752"), productRef);

  // P176: manufacturer → company QID
  add("P176", entityId(companyQid), productRef);

  // P973: described at URL
  if (product.product_url) {
    add("P973", stringVal(product.product_url));
  }

  // P495: country of origin → Q155 ONLY if explicitly "Brasil"
  const country = product.country?.trim().toLowerCase();
  if (country === "brasil" || country === "brazil") {
    add("P495", entityId("Q155"), productRef);
  }

  if (Object.keys(claims).length > 0) {
    payload.claims = claims;
  }

  return payload;
}

// ── Payload Validator ───────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export function validatePayload(
  payload: WikidataPayload,
  entityType?: EntityType,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate labels
  if (payload.labels) {
    for (const [lang, label] of Object.entries(payload.labels)) {
      if (!label.value?.trim()) {
        errors.push({ path: `labels.${lang}`, message: "Label value is empty", severity: "error" });
      }
      if (label.value && label.value.length > 250) {
        errors.push({ path: `labels.${lang}`, message: `Label too long: ${label.value.length} chars (max 250)`, severity: "error" });
      }
    }
  }

  // Validate descriptions
  if (payload.descriptions) {
    for (const [lang, desc] of Object.entries(payload.descriptions)) {
      if (desc.value && desc.value.length > 250) {
        errors.push({ path: `descriptions.${lang}`, message: `Description too long: ${desc.value.length} chars (max 250)`, severity: "error" });
      }
    }
  }

  // Validate claims
  if (payload.claims) {
    for (const [property, claimArray] of Object.entries(payload.claims)) {
      // Validate property format
      if (!property.match(/^P\d+$/)) {
        errors.push({ path: `claims.${property}`, message: `Invalid property ID: ${property}`, severity: "error" });
      }

      // Whitelist enforcement
      if (entityType && !isPropertyAllowed(entityType, property)) {
        errors.push({ path: `claims.${property}`, message: `Property ${property} NOT in ${entityType} whitelist — will be blocked`, severity: "error" });
      }

      for (let i = 0; i < claimArray.length; i++) {
        const claim = claimArray[i];
        const claimPath = `claims.${property}[${i}]`;

        if (claim.mainsnak.snaktype !== "value") {
          errors.push({ path: claimPath, message: `snaktype must be "value"`, severity: "error" });
        }

        const dv = claim.mainsnak.datavalue;

        // Validate QIDs
        if (dv.type === "wikibase-entityid") {
          const qid = (dv.value as WikidataEntityId).id;
          if (!isValidQID(qid)) {
            errors.push({ path: claimPath, message: `Invalid QID: "${qid}"`, severity: "error" });
          }
        }

        // Validate time format
        if (dv.type === "time") {
          const timeStr = (dv as WikidataTimeValue).value.time;
          if (!timeStr.match(/^\+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
            errors.push({ path: claimPath, message: `Invalid time format: ${timeStr}`, severity: "error" });
          }
        }

        // Validate coordinates
        if (dv.type === "globecoordinate") {
          const coord = (dv as WikidataGlobeCoordinateValue).value;
          if (coord.latitude < -90 || coord.latitude > 90) {
            errors.push({ path: claimPath, message: `Invalid latitude: ${coord.latitude}`, severity: "error" });
          }
          if (coord.longitude < -180 || coord.longitude > 180) {
            errors.push({ path: claimPath, message: `Invalid longitude: ${coord.longitude}`, severity: "error" });
          }
        }

        // Validate references structure
        if (claim.references) {
          for (let r = 0; r < claim.references.length; r++) {
            const ref = claim.references[r];
            if (!ref["snaks-order"]?.length) {
              errors.push({ path: `${claimPath}.references[${r}]`, message: "Reference missing snaks-order", severity: "warning" });
            }
            // Check P813 (retrieved date) exists
            if (!ref.snaks["P813"]) {
              errors.push({ path: `${claimPath}.references[${r}]`, message: "Reference missing P813 (retrieved date) — weakens authority", severity: "warning" });
            }
          }
        }
      }
    }
  }

  return errors;
}

// ── Confidence Score ────────────────────────────────────────

export interface ConfidenceScore {
  hasReferences: boolean;
  hasQIDs: boolean;
  hasMultilang: boolean;
  completeness: number;
  grade: "A" | "B" | "C" | "D";
}

function calculateConfidence(payload: WikidataPayload, specs: TechSpecs): ConfidenceScore {
  let total = 0;
  let filled = 0;

  // Labels
  total += 3; // pt, en, es
  filled += payload.labels ? Object.keys(payload.labels).length : 0;

  // Descriptions
  total += 3;
  filled += payload.descriptions ? Object.keys(payload.descriptions).length : 0;

  // Claims
  const claimCount = payload.claims
    ? Object.values(payload.claims).reduce((sum, arr) => sum + arr.length, 0)
    : 0;
  total += 4; // expect at least 4 claims
  filled += Math.min(claimCount, 4);

  // References
  const hasRefs = payload.claims
    ? Object.values(payload.claims).some(arr => arr.some(c => c.references?.length))
    : false;
  total += 1;
  filled += hasRefs ? 1 : 0;

  const completeness = total > 0 ? Math.round((filled / total) * 100) / 100 : 0;

  const hasQIDs = payload.claims
    ? Object.values(payload.claims).some(arr =>
        arr.some(c => c.mainsnak.datavalue.type === "wikibase-entityid")
      )
    : false;

  const hasMultilang = payload.labels
    ? Object.keys(payload.labels).length >= 2
    : false;

  let grade: "A" | "B" | "C" | "D" = "D";
  if (completeness >= 0.9 && hasRefs && hasQIDs) grade = "A";
  else if (completeness >= 0.7 && hasQIDs) grade = "B";
  else if (completeness >= 0.5) grade = "C";

  return { hasReferences: hasRefs, hasQIDs, hasMultilang, completeness, grade };
}

// ── Summary Generator ───────────────────────────────────────

export interface PayloadSummary {
  labels: string[];
  descriptions: string[];
  aliases: string[];
  claimCount: number;
  claimsByProperty: Record<string, number>;
  techSpecsExtracted: TechSpecs;
  techSpecsUsage: "description_enrichment_only";
  validationErrors: ValidationError[];
  isValid: boolean;
  confidence: ConfidenceScore;
  whitelistEnforced: boolean;
  blockedProperties: string[];
}

export function summarizePayload(
  payload: WikidataPayload,
  techSpecs: TechSpecs = {},
  entityType?: EntityType,
): PayloadSummary {
  const validationErrors = validatePayload(payload, entityType);
  const claimsByProperty: Record<string, number> = {};
  let claimCount = 0;
  const blockedProperties: string[] = [];

  if (payload.claims) {
    for (const [prop, arr] of Object.entries(payload.claims)) {
      if (entityType && !isPropertyAllowed(entityType, prop)) {
        blockedProperties.push(prop);
      }
      claimsByProperty[prop] = arr.length;
      claimCount += arr.length;
    }
  }

  return {
    labels: payload.labels ? Object.keys(payload.labels) : [],
    descriptions: payload.descriptions ? Object.keys(payload.descriptions) : [],
    aliases: payload.aliases ? Object.keys(payload.aliases) : [],
    claimCount,
    claimsByProperty,
    techSpecsExtracted: techSpecs,
    techSpecsUsage: "description_enrichment_only",
    validationErrors,
    isValid: validationErrors.filter(e => e.severity === "error").length === 0,
    confidence: calculateConfidence(payload, techSpecs),
    whitelistEnforced: true,
    blockedProperties,
  };
}
