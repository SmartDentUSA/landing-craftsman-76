// ============================================================
// Wikidata Payload Builder — wbeditentity spec-compliant
// Builds validated payloads from company_profile & products_repository
// ============================================================

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
    time: string; // "+YYYY-MM-DDT00:00:00Z"
    timezone: 0;
    before: 0;
    after: 0;
    precision: number; // 9=year, 10=month, 11=day
    calendarmodel: "http://www.wikidata.org/entity/Q1985727";
  };
}

export interface WikidataQuantityValue {
  type: "quantity";
  value: {
    amount: string; // "+147" or "+82"
    unit: string; // "http://www.wikidata.org/entity/Q..." or "1" for dimensionless
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

export interface WikidataUrlValue {
  type: "string";
  value: string;
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

// ── Extracted Tech Specs ────────────────────────────────────

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
      precision: 9, // year
      calendarmodel: "http://www.wikidata.org/entity/Q1985727",
    },
  };
}

function quantityVal(amount: number, unitQid?: string): WikidataDataValue {
  return {
    type: "quantity",
    value: {
      amount: amount >= 0 ? `+${amount}` : `${amount}`,
      unit: unitQid
        ? `http://www.wikidata.org/entity/${unitQid}`
        : "1",
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

function buildReference(url: string): WikidataReference {
  return {
    snaks: {
      P854: [
        {
          snaktype: "value",
          property: "P854", // reference URL
          datavalue: stringVal(url),
        },
      ],
    },
    "snaks-order": ["P854"],
  };
}

function addClaim(
  claims: Record<string, WikidataClaim[]>,
  property: string,
  datavalue: WikidataDataValue,
  references?: WikidataReference[],
) {
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
    // Try known field patterns
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

// ── Tech Spec Parser ────────────────────────────────────────

export function extractTechSpecs(
  features?: unknown,
  description?: string | null,
): TechSpecs {
  const specs: TechSpecs = {};
  const texts: string[] = [];

  // Collect text from features array
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

  // Flexural Strength (MPa)
  const mpaMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*MPa/i);
  if (mpaMatch) {
    specs.flexuralStrengthMPa = parseFloat(mpaMatch[1].replace(",", "."));
  }

  // Shore Hardness
  const shoreMatch = combined.match(/Shore\s*([AD])\s*(\d+)/i);
  if (shoreMatch) {
    specs.shoreHardness = {
      scale: shoreMatch[1].toUpperCase() as "A" | "D",
      value: parseInt(shoreMatch[2], 10),
    };
  }

  // Radiopacity percentage
  const radioMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?radiopac/i);
  if (radioMatch) {
    specs.radiopacity = parseFloat(radioMatch[1].replace(",", "."));
  }

  // Translucency percentage
  const transMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?transluc/i);
  if (transMatch) {
    specs.translucency = parseFloat(transMatch[1].replace(",", "."));
  }

  // Depth of cure (mm)
  const depthMatch = combined.match(/(?:profundidade|depth)\s*(?:de\s+)?(?:cura|cure)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*mm/i);
  if (depthMatch) {
    specs.depthOfCureMm = parseFloat(depthMatch[1].replace(",", "."));
  }

  // Working time (seconds)
  const workMatch = combined.match(/(?:tempo|time)\s*(?:de\s+)?(?:trabalho|work)\s*(?:de\s+)?(\d+)\s*(?:s|seg|sec)/i);
  if (workMatch) {
    specs.workingTimeSeconds = parseInt(workMatch[1], 10);
  }

  return specs;
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

  // Labels
  const name = company.company_name?.trim();
  if (name) {
    payload.labels = {
      pt: { language: "pt", value: name },
      "pt-br": { language: "pt-br", value: name },
    };
    // TODO: Gemini translation for EN/ES
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

  // ── Claims ──

  // P31: instance of → Q4830453 (business enterprise)
  addClaim(claims, "P31", entityId("Q4830453"));

  // P17: country → Q155 (Brazil)
  addClaim(claims, "P17", entityId("Q155"));

  // P856: official website
  if (company.website_url) {
    addClaim(claims, "P856", stringVal(company.website_url));
  }

  // P571: inception (founded year)
  if (company.founded_year && company.founded_year > 1800 && company.founded_year <= new Date().getFullYear()) {
    addClaim(claims, "P571", timeVal(company.founded_year));
  }

  // P112: founded by
  if (company.founder_name?.trim()) {
    addClaim(claims, "P112", stringVal(company.founder_name.trim()));
  }

  // P625: coordinate location
  if (
    company.latitude != null &&
    company.longitude != null &&
    company.latitude >= -90 && company.latitude <= 90 &&
    company.longitude >= -180 && company.longitude <= 180
  ) {
    addClaim(claims, "P625", globeCoordinate(company.latitude, company.longitude));
  }

  // P154: logo image (Commons filename placeholder)
  if (company.company_logo_url) {
    addClaim(claims, "P154", stringVal(company.company_logo_url));
  }

  // P968: email address
  if (company.contact_email) {
    addClaim(claims, "P968", stringVal(company.contact_email));
  }

  // P1329: phone number
  if (company.contact_phone) {
    addClaim(claims, "P1329", stringVal(company.contact_phone));
  }

  // P3225: DUNS number
  if (company.duns_number) {
    addClaim(claims, "P3225", stringVal(company.duns_number));
  }

  // P6204: tax ID (CNPJ)
  if (company.tax_id) {
    addClaim(claims, "P6204", stringVal(company.tax_id));
  }

  // P1651: YouTube video IDs
  const ytIds = extractYouTubeIds(company.company_videos);
  for (const id of ytIds.slice(0, 10)) {
    addClaim(claims, "P1651", stringVal(id));
  }

  // P2397: YouTube channel ID
  if (company.youtube_channel) {
    const channelMatch = company.youtube_channel.match(
      /youtube\.com\/(?:channel\/|c\/|@)([a-zA-Z0-9_-]+)/,
    );
    if (channelMatch) {
      addClaim(claims, "P2397", stringVal(channelMatch[1]));
    }
  }

  // P1327: partner organization (from institutional_links)
  if (Array.isArray(company.institutional_links)) {
    for (const link of company.institutional_links) {
      if (link && typeof link === "object") {
        const rec = link as Record<string, unknown>;
        const url = (rec.url || rec.link) as string | undefined;
        if (typeof url === "string" && url.startsWith("http")) {
          addClaim(claims, "P1327", stringVal(url));
        }
      }
    }
  }

  // P553/P554: social media (Instagram, Facebook, etc.)
  if (company.social_media_links && typeof company.social_media_links === "object") {
    const social = company.social_media_links as Record<string, unknown>;
    if (typeof social.instagram === "string" && social.instagram) {
      const igMatch = (social.instagram as string).match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      if (igMatch) addClaim(claims, "P2003", stringVal(igMatch[1])); // P2003 = Instagram username
    }
    if (typeof social.facebook === "string" && social.facebook) {
      addClaim(claims, "P2013", stringVal(social.facebook as string)); // P2013 = Facebook ID
    }
    if (typeof social.linkedin === "string" && social.linkedin) {
      addClaim(claims, "P4264", stringVal(social.linkedin as string)); // P4264 = LinkedIn company ID
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
  ean?: string | null;
  gtin?: string | null;
  mpn?: string | null;
}

export function buildProductPayload(
  product: ProductInput,
  companyQid: string = "Q138636902",
): WikidataPayload {
  const payload: WikidataPayload = {};
  const claims: Record<string, WikidataClaim[]> = {};

  // Labels
  const name = product.name?.trim();
  if (name) {
    payload.labels = {
      pt: { language: "pt", value: name },
      "pt-br": { language: "pt-br", value: name },
    };
  }

  // Description
  const desc = product.description?.trim();
  if (desc) {
    const shortDesc = desc.length > 250 ? desc.slice(0, 247) + "..." : desc;
    payload.descriptions = {
      pt: { language: "pt", value: shortDesc },
      "pt-br": { language: "pt-br", value: shortDesc },
    };
  }

  // ── Claims ──

  // P31: instance of → product's wikidata category (e.g. Q1780993 = dental composite)
  if (product.wikidata_item_id && /^Q\d+$/.test(product.wikidata_item_id)) {
    addClaim(claims, "P31", entityId(product.wikidata_item_id));
  }

  // P176: manufacturer → company QID
  if (/^Q\d+$/.test(companyQid)) {
    addClaim(claims, "P176", entityId(companyQid));
  }

  // P495: country of origin → Q155 (Brazil)
  addClaim(claims, "P495", entityId("Q155"));

  // P3931: copyright holder → company QID
  if (/^Q\d+$/.test(companyQid)) {
    addClaim(claims, "P3931", entityId(companyQid));
  }

  // Build reference from technical documents
  const techDocRefs = extractTechDocReferences(product.technical_documents);

  // Tech specs extraction
  const specs = extractTechSpecs(product.features, product.description);

  // P2076: flexural strength (unit: Q11570 = MPa / megapascal)
  if (specs.flexuralStrengthMPa != null) {
    addClaim(
      claims,
      "P2076",
      quantityVal(specs.flexuralStrengthMPa, "Q11570"),
      techDocRefs.length ? techDocRefs : undefined,
    );
  }

  // P1306: Shore hardness (unit: Q28924869 = Shore durometer for D, dimensionless fallback)
  if (specs.shoreHardness) {
    const unitQid = specs.shoreHardness.scale === "D" ? "Q28924869" : "Q28924869";
    addClaim(
      claims,
      "P1306",
      quantityVal(specs.shoreHardness.value, unitQid),
      techDocRefs.length ? techDocRefs : undefined,
    );
  }

  // P18: image
  if (product.image_url) {
    addClaim(claims, "P18", stringVal(product.image_url));
  }

  // P856: official website (product URL)
  if (product.product_url) {
    addClaim(claims, "P856", stringVal(product.product_url));
  }

  // P3962: EAN-13
  if (product.ean || product.gtin) {
    addClaim(claims, "P3962", stringVal((product.ean || product.gtin)!));
  }

  // P1055: MPN (manufacturer part number)
  if (product.mpn) {
    addClaim(claims, "P1055", stringVal(product.mpn));
  }

  if (Object.keys(claims).length > 0) {
    payload.claims = claims;
  }

  return payload;
}

// ── Tech Document Reference Extractor ───────────────────────

function extractTechDocReferences(docs: unknown): WikidataReference[] {
  if (!Array.isArray(docs)) return [];
  const refs: WikidataReference[] = [];
  for (const doc of docs) {
    if (!doc || typeof doc !== "object") continue;
    const rec = doc as Record<string, unknown>;
    const url = (rec.url_download || rec.url || rec.file_url) as string | undefined;
    if (typeof url === "string" && url.startsWith("http")) {
      refs.push(buildReference(url));
    }
  }
  return refs.slice(0, 3); // Max 3 references
}

// ── Payload Validator ───────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
}

export function validatePayload(payload: WikidataPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate labels
  if (payload.labels) {
    for (const [lang, label] of Object.entries(payload.labels)) {
      if (!label.value?.trim()) {
        errors.push({ path: `labels.${lang}`, message: "Label value is empty" });
      }
      if (label.value && label.value.length > 250) {
        errors.push({ path: `labels.${lang}`, message: `Label too long: ${label.value.length} chars (max 250)` });
      }
    }
  }

  // Validate descriptions
  if (payload.descriptions) {
    for (const [lang, desc] of Object.entries(payload.descriptions)) {
      if (desc.value && desc.value.length > 250) {
        errors.push({ path: `descriptions.${lang}`, message: `Description too long: ${desc.value.length} chars (max 250)` });
      }
    }
  }

  // Validate claims
  if (payload.claims) {
    for (const [property, claimArray] of Object.entries(payload.claims)) {
      if (!property.match(/^P\d+$/)) {
        errors.push({ path: `claims.${property}`, message: `Invalid property ID: ${property}` });
      }
      for (let i = 0; i < claimArray.length; i++) {
        const claim = claimArray[i];
        const claimPath = `claims.${property}[${i}]`;

        if (claim.mainsnak.snaktype !== "value") {
          errors.push({ path: claimPath, message: `snaktype must be "value", got "${claim.mainsnak.snaktype}"` });
        }

        const dv = claim.mainsnak.datavalue;

        // Validate QIDs
        if (dv.type === "wikibase-entityid") {
          const qid = (dv.value as WikidataEntityId).id;
          if (!qid?.match(/^Q\d+$/)) {
            errors.push({ path: claimPath, message: `Invalid QID: ${qid}` });
          }
        }

        // Validate time format
        if (dv.type === "time") {
          const timeStr = (dv as WikidataTimeValue).value.time;
          if (!timeStr.match(/^\+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
            errors.push({ path: claimPath, message: `Invalid time format: ${timeStr}` });
          }
        }

        // Validate coordinates
        if (dv.type === "globecoordinate") {
          const coord = (dv as WikidataGlobeCoordinateValue).value;
          if (coord.latitude < -90 || coord.latitude > 90) {
            errors.push({ path: claimPath, message: `Invalid latitude: ${coord.latitude}` });
          }
          if (coord.longitude < -180 || coord.longitude > 180) {
            errors.push({ path: claimPath, message: `Invalid longitude: ${coord.longitude}` });
          }
        }

        // Validate quantity
        if (dv.type === "quantity") {
          const amt = (dv as WikidataQuantityValue).value.amount;
          if (!amt.match(/^[+-]?\d+(\.\d+)?$/)) {
            errors.push({ path: claimPath, message: `Invalid quantity amount: ${amt}` });
          }
        }
      }
    }
  }

  return errors;
}

// ── Summary Generator ───────────────────────────────────────

export interface PayloadSummary {
  labels: string[];
  descriptions: string[];
  aliases: string[];
  claimCount: number;
  claimsByProperty: Record<string, number>;
  techSpecsExtracted: TechSpecs;
  validationErrors: ValidationError[];
  isValid: boolean;
}

export function summarizePayload(
  payload: WikidataPayload,
  techSpecs: TechSpecs = {},
): PayloadSummary {
  const validationErrors = validatePayload(payload);
  const claimsByProperty: Record<string, number> = {};
  let claimCount = 0;

  if (payload.claims) {
    for (const [prop, arr] of Object.entries(payload.claims)) {
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
    validationErrors,
    isValid: validationErrors.length === 0,
  };
}
