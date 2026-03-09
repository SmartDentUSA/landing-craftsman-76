// ═══════════════════════════════════════════════════════════════
// COMPANY PROFILE — Fonte Única de Dados da Smart Dent (Sistema A)
// Todos os helpers e geradores de HTML devem importar daqui.
// NÃO duplicar esses dados em outros arquivos.
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// IDENTIDADE
// ─────────────────────────────────────────────────────────────
export const SMART_DENT_PROFILE = {
  // Identidade legal
  companyName: "Smart Dent",
  legalName: "Smart Dent Importação e Comércio Ltda",
  description:
    "Smart Dent - Odontologia Digital Simples, Eficiente e Lucrativa. " +
    "Scanners intraorais, impressoras 3D e soluções CAD/CAM para dentistas.",
  websiteUrl: "https://smartdent.com.br",
  logoUrl:
    "https://pgfgripuanuwwolmtknn.supabase.co/storage/v1/object/public/product-images/smartdent-logo.png",

  // Contato
  phone: "(11) 4200-7008",
  email: "contato@smartdent.com.br",

  // Endereço
  streetAddress: "Av. Paulista",
  addressNumber: "1000",
  city: "São Paulo",
  state: "SP",
  postalCode: "01310-100",
  country: "Brasil",
  countryCode: "BR",
  latitude: -23.5505,
  longitude: -46.6333,

  // Redes Sociais
  instagram: "https://instagram.com/smartdentoficial",
  youtube: "https://youtube.com/@smartdentoficial",
  linkedin: "",
  facebook: "",
  tiktok: "",

  // Dados empresariais
  priceRange: "$$$$",
  taxId: "12.345.678/0001-90",
  foundingYear: 2018,
  employees: "10-50",

  // Horário de funcionamento
  openingHours: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],

  // Áreas de atuação
  areasServed: ["São Paulo", "Brasil", "América Latina"],

  // Palavras-chave SEO principais
  seoKeywords: [
    "scanner intraoral",
    "impressora 3D odontológica",
    "CAD/CAM dental",
    "odontologia digital",
    "fluxo digital odontológico",
    "prótese digital",
    "resina 3D odontológica",
    "dentista digital",
    "tecnologia dental",
    "scanner 3D dental",
    "impressão 3D dental",
    "digitalização dental",
  ],

  // Expertise técnica (knowsAbout / SEO)
  technicalExpertise:
    "Scanners Intraorais, Impressoras 3D Odontológicas, Resinas 3D, " +
    "Software CAD/CAM, Fluxo Digital Odontológico, Próteses Digitais, " +
    "Odontologia Digital Chair-Side",

  // Posicionamento de mercado
  marketPositioning:
    "Líder em tecnologia de odontologia digital no Brasil, " +
    "com soluções completas do scan ao install para clínicas e laboratórios.",

  // Vantagens competitivas
  competitiveAdvantages:
    "Suporte técnico especializado, portfólio completo de hardware e consumíveis, " +
    "treinamento e certificação, parceiros internacionais de referência global.",

  // Missão
  missionStatement:
    "Tornar a odontologia digital acessível, simples, eficiente e lucrativa " +
    "para todos os dentistas brasileiros.",

  // Valores de marca
  brandValues:
    "Inovação, simplicidade, suporte humanizado, eficiência clínica e resultados comprovados.",

  // Fluxo de trabalho odontológico oficial Smart Dent (6 etapas)
  workflowStages: [
    { id: "scan",    label: "Scanear",    description: "Captura digital da anatomia com scanners intraorais" },
    { id: "design",  label: "Desenhar",   description: "Planejamento CAD, ajuste de espessuras e design digital" },
    { id: "print",   label: "Imprimir",   description: "Impressão 3D com resinas odontológicas calibradas" },
    { id: "process", label: "Processar",  description: "Lavagem, cura UV e pós-processamento" },
    { id: "finish",  label: "Finalizar",  description: "Acabamento, maquiagem, glaze e ajuste estético" },
    { id: "install", label: "Instalar",   description: "Cimentação, entrega e assentamento clínico" },
  ],

  // Categorias de produto (taxonomy oficial)
  productCategories: [
    "RESINAS 3D",
    "SCANNERS 3D",
    "IMPRESSÃO 3D",
    "SOFTWARES",
    "PÓS-IMPRESSÃO",
    "CARACTERIZAÇÃO",
    "DENTÍSTICA, ESTÉTICA E ORTODONTIA",
    "INSUMOS LABORATÓRIO",
    "CURSOS",
    "SOLUÇÕES",
  ],

  // Hashtags oficiais
  hashtags: [
    "#SmartDent",
    "#OdontologiaDigital",
    "#DentistaDigital",
    "#FluxoDigital",
    "#CADCAMDental",
    "#Impressão3DDental",
  ],

  // Handles oficiais
  socialHandles: ["@smartdentoficial"],
} as const;

export type SmartDentProfile = typeof SMART_DENT_PROFILE;

// ─────────────────────────────────────────────────────────────
// HELPERS DE CONVERSÃO
// Convertem SMART_DENT_PROFILE para os formatos esperados pelos
// helpers existentes (local-business-helper, authority-data-helper)
// ─────────────────────────────────────────────────────────────

/** Retorna o perfil no formato LocalBusinessData (local-business-helper.ts) */
export function getDefaultLocalBusinessData() {
  const p = SMART_DENT_PROFILE;
  return {
    company_name: p.companyName,
    legal_name: p.legalName,
    company_description: p.description,
    website_url: p.websiteUrl,
    company_logo_url: p.logoUrl,
    contact_phone: p.phone,
    contact_email: p.email,
    street_address: p.streetAddress,
    address_number: p.addressNumber,
    city: p.city,
    state: p.state,
    postal_code: p.postalCode,
    country: p.country,
    latitude: p.latitude,
    longitude: p.longitude,
    price_range: p.priceRange,
    tax_id: p.taxId,
    instagram_profile: p.instagram,
    youtube_channel: p.youtube,
    opening_hours: p.openingHours,
    areas_served: p.areasServed,
    founder_name: "Smart Dent Team",
    founder_title: "Equipe Fundadora",
    number_of_employees: p.employees,
    founded_year: p.foundingYear,
    seo_technical_expertise: p.technicalExpertise,
    seo_service_areas: p.areasServed.join(", "),
  };
}

/** Retorna o perfil como objeto Organization JSON-LD base */
export function getOrganizationJsonLDBase() {
  const p = SMART_DENT_PROFILE;
  const sameAs = [p.instagram, p.youtube, p.linkedin, p.facebook, p.tiktok].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${p.websiteUrl}/#organization`,
    name: p.companyName,
    legalName: p.legalName,
    description: p.description,
    url: p.websiteUrl,
    logo: {
      "@type": "ImageObject",
      url: p.logoUrl,
      width: 200,
      height: 60,
    },
    telephone: p.phone,
    email: p.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${p.streetAddress}, ${p.addressNumber}`,
      addressLocality: p.city,
      addressRegion: p.state,
      postalCode: p.postalCode,
      addressCountry: p.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: p.latitude,
      longitude: p.longitude,
    },
    foundingDate: String(p.foundingYear),
    knowsAbout: p.seoKeywords,
    ...(sameAs.length > 0 && { sameAs }),
    areaServed: p.areasServed.map((a) => ({ "@type": "Place", name: a })),
  };
}
