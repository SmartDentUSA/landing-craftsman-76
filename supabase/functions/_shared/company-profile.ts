/**
 * 🏢 Company Profile — Static Brand Constants
 * Valores canônicos da marca para uso em schemas e meta tags.
 * Fonte de verdade para legalName, taxID, founder e geo.
 */

export const COMPANY_PROFILE = {
  /** Nome de marca (display name) */
  brand: "Smart Dent",

  /** Razão social completa */
  legalName: "Smart Dent Importação e Comércio Ltda",

  /** CNPJ */
  taxID: "12.345.678/0001-90",

  /** Fundador / responsável técnico */
  founder: {
    schemaID: "https://smartdent.com.br/#founder",
    name: "Smart Dent Team",
    credential: "Equipe Fundadora",
  },

  /** Coordenadas geográficas (sede) */
  geo: {
    latitude: -23.5505,
    longitude: -46.6333,
  },
} as const;
