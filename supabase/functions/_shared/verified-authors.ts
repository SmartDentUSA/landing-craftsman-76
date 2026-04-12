// ============================================================
// AUTORES VERIFICADOS — Deno-compatible (sem path aliases)
// Duplicado de src/data/authors.ts para uso em edge functions
// ============================================================

export interface VerifiedAuthorIdentifier {
  name: string;
  value: string;
  url: string;
}

export interface VerifiedAuthor {
  id: string;
  name: string;
  academicTitle: string;
  specialty: string;
  miniBio: string;
  role?: string;
  email?: string;
  website?: string;
  institution?: string;
  institutionUrl?: string;
  department?: string;
  orcid?: string;
  googleScholar?: string;
  fapesp?: string;
  lattes?: string;
  unespPortal?: string;
  dimensions?: string;
  identifiers: VerifiedAuthorIdentifier[];
  sameAs: string[];
}

// ============================================================
// WEBER RICCI
// ============================================================
const WEBER_RICCI: VerifiedAuthor = {
  id: "a19ef0a8-6ca4-4dab-98ff-c7ab92da6f73",
  name: "Prof. Dr. Weber Adad Ricci",
  academicTitle: "Prof. Dr.",
  specialty: "Reabilitação Oral, Prótese Dentária e Odontologia Digital",
  miniBio: "Doutor em Reabilitação Oral/Prótese — FOAr/UNESP (2005). Professor RTC MS-3.1 — Depto. Odontologia Social, FOAr/UNESP. Autor dos livros Lógica 01 e 02.",
  role: "Professor RTC MS-3.1",
  email: "weber.ricci@unesp.br",
  website: "https://www.weberricci.com.br",
  institution: "Universidade Estadual Paulista — UNESP",
  institutionUrl: "https://www.unesp.br",
  department: "Departamento de Odontologia Social — FOAr/UNESP",
  orcid: "0000-0003-0996-3201",
  lattes: "http://lattes.cnpq.br/9477202648340031",
  unespPortal: "http://portaldocentes.unesp.br/portaldocentes/docentes/110476",
  dimensions: "https://app.dimensions.ai/details/entities/publication/author/ur.01003106306.26",
  identifiers: [
    { name: "ORCID", value: "0000-0003-0996-3201", url: "https://orcid.org/0000-0003-0996-3201" },
    { name: "Scopus", value: "55509352400", url: "https://www.scopus.com/authid/detail.uri?authorId=55509352400" },
    { name: "Lattes", value: "9477202648340031", url: "http://lattes.cnpq.br/9477202648340031" },
    { name: "Portal UNESP", value: "110476", url: "http://portaldocentes.unesp.br/portaldocentes/docentes/110476" },
    { name: "Dimensions", value: "ur.01003106306.26", url: "https://app.dimensions.ai/details/entities/publication/author/ur.01003106306.26" },
  ],
  sameAs: [
    "https://orcid.org/0000-0003-0996-3201",
    "https://www.scopus.com/authid/detail.uri?authorId=55509352400",
    "http://lattes.cnpq.br/9477202648340031",
    "http://portaldocentes.unesp.br/portaldocentes/docentes/110476",
    "https://www.weberricci.com.br",
    "https://www.instagram.com/wricci",
    "https://app.dimensions.ai/details/entities/publication/author/ur.01003106306.26",
  ],
};

// ============================================================
// MARCELO DEL GUERRA
// ============================================================
const MARCELO_DEL_GUERRA: VerifiedAuthor = {
  id: "e35f1b00-01ab-46c5-bdec-20e532926068",
  name: "Dr. Marcelo Del Guerra",
  academicTitle: "Dr.",
  specialty: "Engenharia Mecatrônica · Manufatura Avançada · CAD/CAM · Impressão 3D",
  miniBio: "Doutor em Engenharia de Produção Mecânica — EESC/USP (2009). Fundador e Sócio Diretor da Smart Dent. Pesquisador FAPESP PIPE (ID 1694).",
  role: "Doutor em Engenharia de Produção Mecânica (2009) · Fundador Smart Dent",
  website: "https://smartdent.com.br",
  institution: "Escola de Engenharia de São Carlos — EESC/USP",
  institutionUrl: "https://eesc.usp.br",
  department: "Núcleo de Manufatura Avançada — NUMA",
  googleScholar: "https://scholar.google.com/citations?user=0sKZ0wMAAAAJ&hl=pt-BR",
  fapesp: "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/",
  lattes: "https://buscatextual.cnpq.br/buscatextual/visualizacv.do?id=K4766815J6",
  identifiers: [
    { name: "Google Scholar", value: "0sKZ0wMAAAAJ", url: "https://scholar.google.com/citations?user=0sKZ0wMAAAAJ&hl=pt-BR" },
    { name: "Lattes", value: "K4766815J6", url: "https://buscatextual.cnpq.br/buscatextual/visualizacv.do?id=K4766815J6" },
    { name: "FAPESP ID", value: "1694", url: "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/" },
  ],
  sameAs: [
    "https://scholar.google.com/citations?user=0sKZ0wMAAAAJ&hl=pt-BR",
    "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/",
    "https://buscatextual.cnpq.br/buscatextual/visualizacv.do?id=K4766815J6",
    "https://br.linkedin.com/in/marcelo-del-guerra-70193166",
    "https://www.zoominfo.com/p/Marcelo-Del-guerra/14084162887",
    "https://www.wikidata.org/entity/Q138636902",
  ],
};

// ============================================================
// MARCELO CESTARI
// ============================================================
const MARCELO_CESTARI: VerifiedAuthor = {
  id: "31a2debe-d4a9-44d7-8b0d-984fa7cb59ce",
  name: "Marcelo Cestari",
  academicTitle: "",
  specialty: "Engenharia de Materiais · Próteses de Alta Performance · Escaneamento Digital",
  miniBio: "Administrador e Diretor da MMTech — Smart Dent (co-fundador, 2009). 1.343 citações Google Scholar.",
  role: "Administrador e Diretor — MMTech | Co-fundador Smart Dent",
  website: "https://smartdent.com.br",
  googleScholar: "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ",
  identifiers: [
    { name: "Google Scholar", value: "5vx3EBsAAAAJ", url: "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ" },
  ],
  sameAs: [
    "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ",
    "https://www.wikidata.org/entity/Q138636902",
    "https://smartdent.com.br",
  ],
};

// ============================================================
// Lookup map by ID
// ============================================================
export const VERIFIED_AUTHORS: Record<string, VerifiedAuthor> = {
  [WEBER_RICCI.id]: WEBER_RICCI,
  [MARCELO_DEL_GUERRA.id]: MARCELO_DEL_GUERRA,
  [MARCELO_CESTARI.id]: MARCELO_CESTARI,
};

/**
 * Busca autor verificado por ID. Retorna null se não for um autor verificado.
 */
export function getVerifiedAuthor(authorId: string): VerifiedAuthor | null {
  return VERIFIED_AUTHORS[authorId] || null;
}

/**
 * Gera Person Schema JSON-LD completo para um autor verificado
 */
export function generateVerifiedPersonSchema(author: VerifiedAuthor): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@type": "Person",
    name: author.name,
    jobTitle: author.role ?? author.specialty,
    description: author.miniBio,
  };

  if (author.website) schema.url = author.website;
  if (author.email) schema.email = author.email;

  if (author.institution) {
    schema.worksFor = {
      "@type": "EducationalOrganization",
      name: author.institution,
      sameAs: author.institutionUrl,
    };
    schema.alumniOf = {
      "@type": "EducationalOrganization",
      name: author.institution,
      sameAs: author.institutionUrl,
    };
  }

  if (author.identifiers.length > 0) {
    schema.identifier = author.identifiers.map((id) => ({
      "@type": "PropertyValue",
      name: id.name,
      value: id.value,
      url: id.url,
    }));
  }

  if (author.sameAs.length > 0) {
    schema.sameAs = author.sameAs;
  }

  return schema;
}

// Organization Schema foi consolidado em seo-fine-tuning.ts
// Use: import { generateSmartDentOrganizationSchema } from './seo-fine-tuning.ts'
