// supabase/functions/_shared/company-profile.ts
// Fonte única de verdade para os dados da empresa.
// Extraído de: clone-landing-page/index.ts, generate-ecommerce-html/index.ts,
//              generate-spin-landing-page/generateHTML.ts, _shared/product-blog-html-v2.ts

export const COMPANY_PROFILE = {
  // ── Identidade ──
  brand: "Smart Dent",
  legalName: "Smart Dent USA LLC",
  taxID: "12.345.678/0001-90",
  foundingDate: "2018",
  orgID: "https://smartdentusa.com/#organization",

  // ── Web ──
  siteURL: "https://smartdent.com.br",
  logoURL: "https://pgfgripuanuwwolmtknn.supabase.co/storage/v1/object/public/product-images/smartdent-logo.png",
  aiCrawlers: "index, follow, max-snippet:-1",

  // ── Endereço ──
  address: {
    street: "Av. Paulista, 1000",
    city: "São Paulo",
    region: "SP",
    postalCode: "01310-100",
    country: "Brasil",
  },
  geo: {
    latitude: -23.5505,
    longitude: -46.6333,
  },

  // ── Contato ──
  phone: "(11) 4200-7008",
  email: "contato@smartdent.com.br",

  // ── Fundador ──
  founder: {
    name: "",
    credential: "",
    linkedin: "",
    schemaID: "https://smartdentusa.com/#founder",
  },

  // ── SEO/AI ──
  description: "Smart Dent - Odontologia Digital Simples, Eficiente e Lucrativa. Scanners intraorais, impressoras 3D e soluções CAD/CAM para dentistas.",
  targetAudience: "dentistas, clínicas odontológicas, laboratórios dentais",
  mainTechnologies: [] as string[],
  certifications: [] as string[],
  knowsAbout: ["equipamentos odontológicos", "scanners intraorais", "impressoras 3D dentais", "CAD/CAM odontológico", "odontologia digital"],
  proprietary: [] as string[],
  partners: [] as string[],

  // ── Social ──
  social: {
    facebook: "",
    instagram: "https://instagram.com/smartdentoficial",
    youtube: "https://youtube.com/@smartdentoficial",
    linkedin: "",
  },
} as const;

export type CompanyProfile = typeof COMPANY_PROFILE;

/**
 * Mapeia COMPANY_PROFILE para o formato esperado pelas funções existentes
 * que usavam o objeto SMART_DENT_DATA hardcoded.
 */
export const SMART_DENT_DATA = {
  company_name: COMPANY_PROFILE.brand,
  website_url: COMPANY_PROFILE.siteURL,
  company_logo_url: COMPANY_PROFILE.logoURL,
  contact_phone: COMPANY_PROFILE.phone,
  contact_email: COMPANY_PROFILE.email,
  city: COMPANY_PROFILE.address.city,
  state: COMPANY_PROFILE.address.region,
  country: COMPANY_PROFILE.address.country,
  postal_code: COMPANY_PROFILE.address.postalCode,
  street_address: COMPANY_PROFILE.address.street,
  tax_id: COMPANY_PROFILE.taxID,
  instagram_profile: COMPANY_PROFILE.social.instagram,
  youtube_channel: COMPANY_PROFILE.social.youtube,
  company_description: COMPANY_PROFILE.description,
} as const;
