// ============================================================
// Wikidata Payload Builder v4.0 — Write-Mode Hardened
// Spec-compliant, whitelist-enforced, idempotent, auditable
// Canonicalized, SHA-256 hashed, write-guard enabled
// ============================================================

// ── 1. STRICT TYPES ────────────────────────────────────────

export interface WikidataEntityId {
  "entity-type": "item";
  "numeric-id": number;
  id: string;
}

export interface WikidataStringValue {
  type: "string";
  value: string;
}

export interface WikidataUrlValue {
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

export type WikidataDatatype =
  | "wikibase-item"
  | "string"
  | "url"
  | "time"
  | "quantity"
  | "globe-coordinate"
  | "external-id";

export interface WikidataSnak {
  snaktype: "value" | "novalue" | "somevalue";
  property: string;
  datavalue?: WikidataDataValue;
  datatype?: WikidataDatatype;
}

export interface WikidataReference {
  snaks: Record<string, WikidataSnak[]>;
  "snaks-order": string[];
}

export interface WikidataClaim {
  mainsnak: WikidataSnak;
  type: "statement";
  rank: "normal" | "preferred" | "deprecated";
  qualifiers?: Record<string, WikidataSnak[]>;
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

// ── 2. WHITELIST RÍGIDA ────────────────────────────────────

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
    "P31",   // instance of (MUST be Q2424752)
    "P176",  // manufacturer
    "P973",  // described at URL
    "P495",  // country of origin (conditional)
  ] as const,
} as const;

type EntityType = keyof typeof PROPERTY_WHITELIST;

function isPropertyAllowed(entityType: EntityType, property: string): boolean {
  return (PROPERTY_WHITELIST[entityType] as readonly string[]).includes(property);
}

function addClaimWhitelisted(
  entityType: EntityType,
  claims: Record<string, WikidataClaim[]>,
  property: string,
  datavalue: WikidataDataValue,
  datatype: WikidataDatatype,
  references?: WikidataReference[],
): void {
  if (!isPropertyAllowed(entityType, property)) {
    throw new Error(
      `[WHITELIST VIOLATION] Property ${property} is NOT allowed for entity type "${entityType}". ` +
      `Allowed: ${PROPERTY_WHITELIST[entityType].join(", ")}`
    );
  }
  if (!claims[property]) claims[property] = [];
  claims[property].push(buildClaim(property, datavalue, datatype, references));
}

// ── 3. VALIDAÇÕES CRÍTICAS ─────────────────────────────────

function isValidQID(value: string): boolean {
  return /^Q\d+$/.test(value);
}

export function assertValidQID(value: string, context: string): void {
  if (!isValidQID(value)) {
    throw new Error(
      `[QID VALIDATION FAILED] Invalid QID "${value}" in context: ${context}. ` +
      `Must match pattern /^Q\\d+$/. Received type: ${typeof value}`
    );
  }
}

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
        errors.push({ path: `labels.${lang}`, message: `Label exceeds 250 chars: ${label.value.length}`, severity: "error" });
      }
    }
  }

  // Validate descriptions
  if (payload.descriptions) {
    for (const [lang, desc] of Object.entries(payload.descriptions)) {
      if (desc.value && desc.value.length > 250) {
        errors.push({ path: `descriptions.${lang}`, message: `Description exceeds 250 chars: ${desc.value.length}`, severity: "error" });
      }
    }
  }

  // Validate claims
  if (payload.claims) {
    for (const [property, claimArray] of Object.entries(payload.claims)) {
      if (!/^P\d+$/.test(property)) {
        errors.push({ path: `claims.${property}`, message: `Invalid property format: ${property}`, severity: "error" });
      }

      if (entityType && !isPropertyAllowed(entityType, property)) {
        errors.push({ path: `claims.${property}`, message: `Property ${property} BLOCKED by ${entityType} whitelist`, severity: "error" });
      }

      for (let i = 0; i < claimArray.length; i++) {
        const claim = claimArray[i];
        const cp = `claims.${property}[${i}]`;

        // snaktype must be "value"
        if (claim.mainsnak.snaktype !== "value") {
          errors.push({ path: cp, message: `snaktype must be "value", got "${claim.mainsnak.snaktype}"`, severity: "error" });
        }

        // datavalue must exist when snaktype is "value"
        if (claim.mainsnak.snaktype === "value" && !claim.mainsnak.datavalue) {
          errors.push({ path: cp, message: "snaktype is 'value' but datavalue is missing", severity: "error" });
        }

        const dv = claim.mainsnak.datavalue;
        if (!dv) continue;

        // Validate QIDs in entity-id values
        if (dv.type === "wikibase-entityid") {
          const qid = (dv.value as WikidataEntityId).id;
          if (!isValidQID(qid)) {
            errors.push({ path: cp, message: `Invalid QID in datavalue: "${qid}"`, severity: "error" });
          }
          const numericId = (dv.value as WikidataEntityId)["numeric-id"];
          if (typeof numericId !== "number" || numericId <= 0) {
            errors.push({ path: cp, message: `Invalid numeric-id: ${numericId}`, severity: "error" });
          }
        }

        // Validate time format
        if (dv.type === "time") {
          const tv = (dv as WikidataTimeValue).value;
          if (!tv.time.match(/^\+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
            errors.push({ path: cp, message: `Invalid time format: "${tv.time}". Expected +YYYY-MM-DDT00:00:00Z`, severity: "error" });
          }
          if (tv.timezone !== 0) {
            errors.push({ path: cp, message: `Timezone must be 0, got ${tv.timezone}`, severity: "error" });
          }
          if (tv.calendarmodel !== "http://www.wikidata.org/entity/Q1985727") {
            errors.push({ path: cp, message: `Invalid calendarmodel: ${tv.calendarmodel}`, severity: "error" });
          }
        }

        // Validate coordinates
        if (dv.type === "globecoordinate") {
          const coord = (dv as WikidataGlobeCoordinateValue).value;
          if (coord.latitude < -90 || coord.latitude > 90) {
            errors.push({ path: cp, message: `Latitude out of range: ${coord.latitude} (must be -90..90)`, severity: "error" });
          }
          if (coord.longitude < -180 || coord.longitude > 180) {
            errors.push({ path: cp, message: `Longitude out of range: ${coord.longitude} (must be -180..180)`, severity: "error" });
          }
          if (coord.globe !== "http://www.wikidata.org/entity/Q2") {
            errors.push({ path: cp, message: `Invalid globe: ${coord.globe}`, severity: "error" });
          }
        }

        // Validate references structure
        if (claim.references) {
          for (let r = 0; r < claim.references.length; r++) {
            const ref = claim.references[r];
            const rp = `${cp}.references[${r}]`;
            if (!ref["snaks-order"]?.length) {
              errors.push({ path: rp, message: "Reference missing snaks-order", severity: "warning" });
            }
            if (!ref.snaks || Object.keys(ref.snaks).length === 0) {
              errors.push({ path: rp, message: "Reference has empty snaks", severity: "error" });
            }
            if (!ref.snaks["P854"] && !ref.snaks["P248"]) {
              errors.push({ path: rp, message: "Reference lacks P854 (URL) and P248 (stated in) — insufficient sourcing", severity: "warning" });
            }
            if (!ref.snaks["P813"]) {
              errors.push({ path: rp, message: "Reference missing P813 (retrieved date) — weakens authority", severity: "warning" });
            }
          }
        }
      }
    }
  }

  return errors;
}

// ── 4. CLAIM BUILDER (CORE) ────────────────────────────────

function buildClaim(
  property: string,
  datavalue: WikidataDataValue,
  datatype: WikidataDatatype,
  references?: WikidataReference[],
): WikidataClaim {
  const claim: WikidataClaim = {
    mainsnak: {
      snaktype: "value",
      property,
      datavalue,
      datatype,
    },
    type: "statement",
    rank: "normal",
  };
  if (references?.length) {
    claim.references = references;
  }
  return claim;
}

// Value builders

function entityId(qid: string): WikidataDataValue {
  assertValidQID(qid, "entityId()");
  const numericId = parseInt(qid.replace("Q", ""), 10);
  return {
    type: "wikibase-entityid",
    value: { "entity-type": "item", "numeric-id": numericId, id: qid },
  };
}

function stringVal(val: string): WikidataDataValue {
  if (!val || typeof val !== "string") {
    throw new Error(`[VALUE ERROR] stringVal requires non-empty string, got: ${typeof val}`);
  }
  return { type: "string", value: val };
}

function urlVal(val: string): WikidataDataValue {
  if (!val || !val.startsWith("http")) {
    throw new Error(`[VALUE ERROR] urlVal requires valid URL, got: "${val}"`);
  }
  return { type: "string", value: val };
}

function timeVal(year: number): WikidataDataValue {
  if (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear()) {
    throw new Error(`[VALUE ERROR] timeVal year out of range: ${year}`);
  }
  return {
    type: "time",
    value: {
      time: `+${String(year).padStart(4, "0")}-00-00T00:00:00Z`,
      timezone: 0,
      before: 0,
      after: 0,
      precision: 9, // year precision
      calendarmodel: "http://www.wikidata.org/entity/Q1985727",
    },
  };
}

function timeDayVal(date: Date): WikidataDataValue {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return {
    type: "time",
    value: {
      time: `+${y}-${m}-${d}T00:00:00Z`,
      timezone: 0,
      before: 0,
      after: 0,
      precision: 11, // day precision
      calendarmodel: "http://www.wikidata.org/entity/Q1985727",
    },
  };
}

function globeCoordinate(lat: number, lon: number): WikidataDataValue {
  if (lat < -90 || lat > 90) throw new Error(`[VALUE ERROR] Latitude out of range: ${lat}`);
  if (lon < -180 || lon > 180) throw new Error(`[VALUE ERROR] Longitude out of range: ${lon}`);
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

// ── 5. REFERÊNCIAS PADRÃO ──────────────────────────────────

export function buildAuthorityReference(url: string, sourceQID?: string): WikidataReference {
  if (!url || !url.startsWith("http")) {
    throw new Error(`[REFERENCE ERROR] Invalid reference URL: "${url}"`);
  }

  const snaks: Record<string, WikidataSnak[]> = {};
  const snaksOrder: string[] = [];

  // P248: stated in (source entity)
  if (sourceQID) {
    if (isValidQID(sourceQID)) {
      snaks["P248"] = [{
        snaktype: "value",
        property: "P248",
        datavalue: entityId(sourceQID),
        datatype: "wikibase-item",
      }];
      snaksOrder.push("P248");
    } else {
      console.warn(`[Reference] Invalid sourceQID "${sourceQID}" — skipping P248`);
    }
  }

  // P854: reference URL
  snaks["P854"] = [{
    snaktype: "value",
    property: "P854",
    datavalue: stringVal(url),
    datatype: "url",
  }];
  snaksOrder.push("P854");

  // P813: retrieved (today)
  snaks["P813"] = [{
    snaktype: "value",
    property: "P813",
    datavalue: timeDayVal(new Date()),
    datatype: "time",
  }];
  snaksOrder.push("P813");

  return { snaks, "snaks-order": snaksOrder };
}

// ── 6. COMPANY PAYLOAD BUILDER ─────────────────────────────

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
  const buildLog: string[] = [];

  const siteRef = company.website_url
    ? [buildAuthorityReference(company.website_url, company.wikidata_id || undefined)]
    : undefined;

  const add = (p: string, v: WikidataDataValue, dt: WikidataDatatype, refs?: WikidataReference[]) => {
    try {
      addClaimWhitelisted("company", claims, p, v, dt, refs);
      buildLog.push(`✓ ${p} added`);
    } catch (e) {
      buildLog.push(`✗ ${p} blocked: ${(e as Error).message}`);
      throw e; // re-throw whitelist violations
    }
  };

  // Labels (9. Multilinguagem)
  const name = company.company_name?.trim();
  if (name) {
    payload.labels = buildMultilingualLabels(name);
  }

  // Descriptions
  const desc = company.company_description?.trim();
  if (desc) {
    const shortDesc = desc.length > 250 ? desc.slice(0, 247) + "..." : desc;
    payload.descriptions = {
      pt: { language: "pt", value: shortDesc },
      "pt-br": { language: "pt-br", value: shortDesc },
      // EN/ES placeholders - ready for Gemini integration
    };
  }

  // Aliases
  const aliasValues: WikidataLabel[] = [];
  if (company.legal_name && company.legal_name.trim() !== company.company_name?.trim()) {
    aliasValues.push({ language: "pt", value: company.legal_name.trim() });
  }
  if (aliasValues.length > 0) {
    payload.aliases = { pt: aliasValues };
  }

  // ── Claims ──

  // P31: instance of → Q4830453 (business enterprise)
  add("P31", entityId("Q4830453"), "wikibase-item");

  // P17: country → Q155 (Brazil)
  add("P17", entityId("Q155"), "wikibase-item");

  // P856: official website
  if (company.website_url?.startsWith("http")) {
    add("P856", urlVal(company.website_url), "url", siteRef);
  }

  // P571: inception (founded year)
  if (company.founded_year && company.founded_year > 1800 && company.founded_year <= new Date().getFullYear()) {
    add("P571", timeVal(company.founded_year), "time", siteRef);
  }

  // P625: coordinate location
  if (
    company.latitude != null && company.longitude != null &&
    company.latitude >= -90 && company.latitude <= 90 &&
    company.longitude >= -180 && company.longitude <= 180
  ) {
    add("P625", globeCoordinate(company.latitude, company.longitude), "globe-coordinate");
  }

  // P154: logo image (Commons filename)
  if (company.company_logo_url) {
    add("P154", stringVal(company.company_logo_url), "string");
  }

  // P968: email address
  if (company.contact_email && company.contact_email.includes("@")) {
    add("P968", stringVal(company.contact_email), "string");
  }

  // P1329: phone number
  if (company.contact_phone) {
    add("P1329", stringVal(company.contact_phone), "string");
  }

  // P3225: DUNS number
  if (company.duns_number) {
    add("P3225", stringVal(company.duns_number), "external-id");
  }

  // P6204: CNPJ (tax ID)
  if (company.tax_id) {
    add("P6204", stringVal(company.tax_id), "external-id");
  }

  // P973: described at URL
  if (company.website_url?.startsWith("http")) {
    add("P973", urlVal(company.website_url), "url");
  }

  // P1651: YouTube video IDs
  const ytIds = extractYouTubeIds(company.company_videos);
  for (const id of ytIds.slice(0, 10)) {
    add("P1651", stringVal(id), "external-id");
  }

  // P2397: YouTube channel ID
  if (company.youtube_channel) {
    const channelMatch = company.youtube_channel.match(
      /youtube\.com\/(?:channel\/|c\/|@)([a-zA-Z0-9_-]+)/,
    );
    if (channelMatch) {
      add("P2397", stringVal(channelMatch[1]), "external-id");
    }
  }

  // P1327: partner organization (from institutional_links)
  if (Array.isArray(company.institutional_links)) {
    for (const link of company.institutional_links) {
      if (link && typeof link === "object") {
        const rec = link as Record<string, unknown>;
        const url = (rec.url || rec.link) as string | undefined;
        if (typeof url === "string" && url.startsWith("http")) {
          add("P1327", urlVal(url), "url");
        }
      }
    }
  }

  // P2003: Instagram username
  if (company.social_media_links && typeof company.social_media_links === "object") {
    const social = company.social_media_links as Record<string, unknown>;
    if (typeof social.instagram === "string" && social.instagram) {
      const igMatch = social.instagram.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      if (igMatch) add("P2003", stringVal(igMatch[1]), "external-id");
    }
  }

  if (Object.keys(claims).length > 0) {
    payload.claims = claims;
  }

  return payload;
}

// ── 7. PRODUCT PAYLOAD BUILDER ─────────────────────────────

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
  // Strict QID validation for manufacturer
  assertValidQID(companyQid, "buildProductPayload(companyQid)");

  const payload: WikidataPayload = {};
  const claims: Record<string, WikidataClaim[]> = {};

  // 8. Extract tech specs for description enrichment ONLY (never claims)
  const specs = extractTechSpecs(product.features, product.description);

  const productRef = product.product_url?.startsWith("http")
    ? [buildAuthorityReference(product.product_url, companyQid)]
    : undefined;

  const add = (p: string, v: WikidataDataValue, dt: WikidataDatatype, refs?: WikidataReference[]) =>
    addClaimWhitelisted("product", claims, p, v, dt, refs);

  // Labels (9. Multilinguagem)
  const name = product.name?.trim();
  if (name) {
    payload.labels = buildMultilingualLabels(name);
  }

  // Description enriched with tech specs
  const desc = product.description?.trim();
  if (desc) {
    const shortDesc = desc.length > 250 ? desc.slice(0, 247) + "..." : desc;
    const enrichedPt = buildEnrichedDescription(shortDesc, specs, "pt");
    const enrichedEn = buildEnrichedDescription(shortDesc, specs, "en");
    payload.descriptions = {
      pt: { language: "pt", value: enrichedPt },
      "pt-br": { language: "pt-br", value: enrichedPt },
      en: { language: "en", value: enrichedEn },
    };
  }

  // Aliases — tech spec keywords for discoverability
  const aliasValues: WikidataLabel[] = [];
  if (product.brand && product.brand.trim() !== product.name?.trim()) {
    aliasValues.push({ language: "pt", value: product.brand.trim() });
  }
  if (specs.flexuralStrengthMPa) {
    aliasValues.push({ language: "pt", value: `${specs.flexuralStrengthMPa} MPa` });
  }
  if (specs.shoreHardness) {
    aliasValues.push({ language: "pt", value: `Shore ${specs.shoreHardness.scale} ${specs.shoreHardness.value}` });
  }
  if (aliasValues.length > 0) {
    payload.aliases = { pt: aliasValues };
  }

  // ── Claims (whitelist-enforced, NO P2076/P1306 EVER) ──

  // P31: instance of → Q2424752 (product model) — FIXED, NO EXCEPTIONS
  add("P31", entityId("Q2424752"), "wikibase-item", productRef);

  // P176: manufacturer → company QID (validated)
  add("P176", entityId(companyQid), "wikibase-item", productRef);

  // P973: described at URL
  if (product.product_url?.startsWith("http")) {
    add("P973", urlVal(product.product_url), "url");
  }

  // P495: country of origin → Q155 ONLY if explicitly "Brasil"/"Brazil"
  const country = product.country?.trim().toLowerCase();
  if (country === "brasil" || country === "brazil") {
    add("P495", entityId("Q155"), "wikibase-item", productRef);
  }

  if (Object.keys(claims).length > 0) {
    payload.claims = claims;
  }

  return payload;
}

// ── 8. TECH SPEC EXTRACTION (NEVER CLAIMS) ─────────────────

export interface TechSpecs {
  flexuralStrengthMPa?: number;
  shoreHardness?: { scale: "A" | "D"; value: number };
  radiopacity?: number;
  translucency?: number;
  depthOfCureMm?: number;
  workingTimeSeconds?: number;
}

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

// ── 9. MULTILINGUAGEM ──────────────────────────────────────

function buildMultilingualLabels(name: string): Record<string, WikidataLabel> {
  // PT-BR: obrigatório. EN/ES: placeholder estrutural (não inventar traduções)
  return {
    pt: { language: "pt", value: name },
    "pt-br": { language: "pt-br", value: name },
    // EN placeholder — ready for Gemini integration
    // es placeholder — ready for Gemini integration
  };
}

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

// ── 10. CANONICALIZAÇÃO DETERMINÍSTICA + SHA-256 ───────────

/**
 * Canonicaliza payload recursivamente:
 * - Ordena keys em objetos
 * - Remove null/undefined
 * - Ordena arrays de claims por property + datavalue determinístico
 */
export function canonicalizePayload(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj
      .map(item => canonicalizePayload(item))
      .filter(item => item !== undefined)
      .sort((a, b) => {
        const sa = JSON.stringify(a);
        const sb = JSON.stringify(b);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    const val = canonicalizePayload((obj as Record<string, unknown>)[key]);
    if (val !== undefined) {
      sorted[key] = val;
    }
  }
  return sorted;
}

/**
 * SHA-256 hash do payload canonicalizado (crypto.subtle nativo Deno)
 */
export async function hashPayload(payload: WikidataPayload): Promise<string> {
  const canonical = canonicalizePayload(payload);
  const json = JSON.stringify(canonical);
  const encoded = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function generateClaimHash(claim: WikidataClaim): string {
  const canonical = canonicalizePayload({
    property: claim.mainsnak.property,
    datavalue: claim.mainsnak.datavalue,
    references: claim.references?.map(r => ({ snaks: r.snaks })),
  });
  const json = JSON.stringify(canonical);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `claim_${Math.abs(hash).toString(36)}`;
}

export function deduplicateClaims(payload: WikidataPayload): { payload: WikidataPayload; duplicatesRemoved: number } {
  if (!payload.claims) return { payload, duplicatesRemoved: 0 };

  let duplicatesRemoved = 0;
  const deduped: Record<string, WikidataClaim[]> = {};

  for (const [property, claimArray] of Object.entries(payload.claims)) {
    const seen = new Set<string>();
    deduped[property] = [];
    for (const claim of claimArray) {
      const hash = generateClaimHash(claim);
      if (seen.has(hash)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(hash);
      deduped[property].push(claim);
    }
  }

  return {
    payload: { ...payload, claims: deduped },
    duplicatesRemoved,
  };
}

// ── 11. SEMANTIC SCORE ─────────────────────────────────────

export interface SemanticScore {
  references: number;      // 0-1
  connectivity: number;    // 0-1 (QID usage ratio)
  completeness: number;    // 0-1
  consistency: number;     // 0-1
  overall: number;         // 0-1
  grade: "A" | "B" | "C" | "D" | "F";
  passed: boolean;         // overall >= 0.7
  details: string[];
}

export function evaluateSemanticScore(
  payload: WikidataPayload,
  entityType: EntityType,
): SemanticScore {
  const details: string[] = [];

  // References score
  let claimsWithRefs = 0;
  let totalClaims = 0;
  let qidClaims = 0;
  let hasExternalRefs = false;

  if (payload.claims) {
    for (const claimArray of Object.values(payload.claims)) {
      for (const claim of claimArray) {
        totalClaims++;
        if (claim.references?.length) {
          claimsWithRefs++;
          // Check for external URLs in references
          for (const ref of claim.references) {
            if (ref.snaks["P854"]) {
              const refUrl = ref.snaks["P854"][0]?.datavalue;
              if (refUrl?.type === "string" && typeof refUrl.value === "string") {
                // External = not company's own domain
                const refHost = refUrl.value.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
                const ownWebsite = payload.claims?.["P856"]?.[0]?.mainsnak?.datavalue;
                const ownHost = ownWebsite?.type === "string" && typeof ownWebsite.value === "string"
                  ? ownWebsite.value.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "")
                  : "";
                if (refHost && ownHost && refHost !== ownHost) {
                  hasExternalRefs = true;
                }
              }
            }
          }
        }
        if (claim.mainsnak.datavalue?.type === "wikibase-entityid") qidClaims++;
      }
    }
  }

  const references = totalClaims > 0 ? claimsWithRefs / totalClaims : 0;
  details.push(`References: ${claimsWithRefs}/${totalClaims} claims sourced`);

  // Connectivity (QID usage)
  const connectivity = totalClaims > 0 ? qidClaims / totalClaims : 0;
  details.push(`Connectivity: ${qidClaims}/${totalClaims} claims use QIDs`);

  // Completeness
  let completenessScore = 0;
  let completenessMax = 0;

  completenessMax += 2;
  if (payload.labels && Object.keys(payload.labels).length > 0) completenessScore += 1;
  if (payload.labels && Object.keys(payload.labels).length >= 2) completenessScore += 1;

  completenessMax += 1;
  if (payload.descriptions && Object.keys(payload.descriptions).length > 0) completenessScore += 1;

  completenessMax += 1;
  if (payload.aliases && Object.keys(payload.aliases).length > 0) completenessScore += 1;

  const requiredProps = entityType === "company" ? ["P31", "P17", "P856"] : ["P31", "P176"];
  for (const prop of requiredProps) {
    completenessMax += 1;
    if (payload.claims?.[prop]?.length) {
      completenessScore += 1;
    } else {
      details.push(`MISSING required property: ${prop}`);
    }
  }

  const completeness = completenessMax > 0 ? completenessScore / completenessMax : 0;
  details.push(`Completeness: ${completenessScore}/${completenessMax}`);

  // Consistency (validation passes)
  const validationErrors = validatePayload(payload, entityType);
  const hardErrors = validationErrors.filter(e => e.severity === "error");
  const consistency = hardErrors.length === 0 ? 1.0 : Math.max(0, 1 - (hardErrors.length * 0.2));
  if (hardErrors.length > 0) {
    details.push(`Consistency: ${hardErrors.length} validation errors`);
  }

  // External reference bonus (+0.15)
  const externalRefBonus = hasExternalRefs ? 0.15 : 0;
  if (hasExternalRefs) {
    details.push(`External references detected: +0.15 bonus`);
  }

  // Overall weighted score
  const rawOverall = 
    references * 0.25 +
    connectivity * 0.20 +
    completeness * 0.35 +
    consistency * 0.20 +
    externalRefBonus;

  const overall = Math.round(Math.min(1.0, rawOverall) * 100) / 100;

  let grade: SemanticScore["grade"] = "F";
  if (overall >= 0.9) grade = "A";
  else if (overall >= 0.8) grade = "B";
  else if (overall >= 0.7) grade = "C";
  else if (overall >= 0.5) grade = "D";

  const passed = overall >= 0.7;
  if (!passed) {
    details.push(`⚠️ SEMANTIC SCORE BELOW THRESHOLD: ${overall} < 0.7`);
  }

  return {
    references,
    connectivity,
    completeness,
    consistency,
    overall,
    grade,
    passed,
    details,
  };
}

// ── 14. PREPARAÇÃO PARA ESCRITA FUTURA ─────────────────────

export interface WbEditEntityRequest {
  action: "wbeditentity";
  data: string;
  format: "json";
  // NOTE: 'new' and 'id' will be added by the OAuth transport layer
}

export function buildWbEditEntityPayload(payload: WikidataPayload): WbEditEntityRequest {
  return {
    action: "wbeditentity",
    data: JSON.stringify(payload),
    format: "json",
  };
}

// ── SUMMARY GENERATOR ──────────────────────────────────────

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
  semanticScore: SemanticScore;
  whitelistEnforced: boolean;
  blockedProperties: string[];
  duplicatesRemoved: number;
  wbEditEntityReady: WbEditEntityRequest;
  idempotencyHashes: Record<string, string[]>;
}

export function summarizePayload(
  payload: WikidataPayload,
  techSpecs: TechSpecs = {},
  entityType: EntityType,
): PayloadSummary {
  // Deduplicate first
  const { payload: dedupedPayload, duplicatesRemoved } = deduplicateClaims(payload);

  const validationErrors = validatePayload(dedupedPayload, entityType);
  const semanticScore = evaluateSemanticScore(dedupedPayload, entityType);
  const claimsByProperty: Record<string, number> = {};
  const idempotencyHashes: Record<string, string[]> = {};
  let claimCount = 0;
  const blockedProperties: string[] = [];

  if (dedupedPayload.claims) {
    for (const [prop, arr] of Object.entries(dedupedPayload.claims)) {
      if (!isPropertyAllowed(entityType, prop)) {
        blockedProperties.push(prop);
      }
      claimsByProperty[prop] = arr.length;
      claimCount += arr.length;
      idempotencyHashes[prop] = arr.map(c => generateClaimHash(c));
    }
  }

  return {
    labels: dedupedPayload.labels ? Object.keys(dedupedPayload.labels) : [],
    descriptions: dedupedPayload.descriptions ? Object.keys(dedupedPayload.descriptions) : [],
    aliases: dedupedPayload.aliases ? Object.keys(dedupedPayload.aliases) : [],
    claimCount,
    claimsByProperty,
    techSpecsExtracted: techSpecs,
    techSpecsUsage: "description_enrichment_only",
    validationErrors,
    isValid: validationErrors.filter(e => e.severity === "error").length === 0,
    semanticScore,
    whitelistEnforced: true,
    blockedProperties,
    duplicatesRemoved,
    wbEditEntityReady: buildWbEditEntityPayload(dedupedPayload),
    idempotencyHashes,
  };
}

// ── HELPERS ────────────────────────────────────────────────

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
