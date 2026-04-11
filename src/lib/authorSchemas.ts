// ============================================================
// GENERATORS DE SCHEMA JSON-LD PARA AUTORES
// Injete no <head> das páginas via Helmet ou equivalente
// ============================================================

import {
  type Author,
  WEBER_RICCI,
  MARCELO_DEL_GUERRA,
  MARCELO_CESTARI,
  VITALITY_PRODUCT,
} from "@/data/authors";

/** Gera schema.org/Person completo para um autor */
export function generatePersonSchema(author: Author): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role ?? author.specialty,
    description: author.miniBio,
  };

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

  if (author.identifiers?.length) {
    schema.identifier = author.identifiers.map((id) => ({
      "@type": "PropertyValue",
      name: id.name,
      value: id.value,
      url: id.url,
    }));
  }

  const allSameAs = [
    ...(author.sameAs ?? []),
    author.orcid ? `https://orcid.org/${author.orcid}` : null,
    author.googleScholar ?? null,
    author.fapesp ?? null,
    author.lattes ?? null,
    author.unespPortal ?? null,
    author.website ?? null,
    author.linkedin ?? null,
  ].filter(Boolean) as string[];

  schema.sameAs = [...new Set(allSameAs)];

  if (author.website) schema.url = author.website;
  if (author.email) schema.email = author.email;

  return JSON.stringify(schema, null, 2);
}

/** Gera schema.org/Organization para a Smart Dent */
export function generateOrganizationSchema(): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Smart Dent",
    legalName: "MMTech Projetos Tecnológicos Importação e Exportação Ltda.",
    foundingDate: "2009",
    description:
      "Spin-off universitária da EESC/USP São Carlos. Pioneira em CAD/CAM e resinas 3D odontológicas no Brasil. Fundada por Dr. Marcelo Del Guerra (PhD Engenharia/USP) no NUMA/USP.",
    url: "https://smartdent.com.br",
    sameAs: [
      "https://www.wikidata.org/entity/Q138636902",
      "https://br.linkedin.com/company/smartdent-dental-cad-cam",
      "https://www.instagram.com/smartdentoficial",
      "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/",
    ],
    founders: [
      {
        "@type": "Person",
        name: "Dr. Marcelo Del Guerra",
        description:
          "PhD Engenharia de Produção Mecânica, EESC/USP (2009). FAPESP ID 1694.",
        identifier: [
          { "@type": "PropertyValue", name: "Google Scholar", value: "0sKZ0wMAAAAJ" },
          { "@type": "PropertyValue", name: "Lattes", value: "K4766815J6" },
          { "@type": "PropertyValue", name: "FAPESP ID", value: "1694" },
        ],
        sameAs: [
          "https://scholar.google.com/citations?user=0sKZ0wMAAAAJ&hl=pt-BR",
          "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/",
          "https://buscatextual.cnpq.br/buscatextual/visualizacv.do?id=K4766815J6",
          "https://br.linkedin.com/in/marcelo-del-guerra-70193166",
        ],
        alumniOf: {
          "@type": "EducationalOrganization",
          name: "Escola de Engenharia de São Carlos — EESC/USP",
          sameAs: "https://eesc.usp.br",
        },
      },
      {
        "@type": "Person",
        name: "Marcelo Cestari",
        description:
          "Diretor MMTech. 1.343 citações Google Scholar. Engenharia de Materiais.",
        sameAs:
          "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ",
      },
    ],
    foundingLocation: {
      "@type": "Place",
      name: "Núcleo de Manufatura Avançada (NUMA) — EESC/USP São Carlos",
      address: {
        "@type": "PostalAddress",
        addressLocality: "São Carlos",
        addressRegion: "SP",
        addressCountry: "BR",
      },
    },
    address: [
      {
        "@type": "PostalAddress",
        streetAddress: "Rua Dr. Procópio de Tolêdo Malta, 62",
        addressLocality: "São Carlos",
        addressRegion: "SP",
        postalCode: "13562-291",
        addressCountry: "BR",
      },
      {
        "@type": "PostalAddress",
        streetAddress: "University City Blvd",
        addressLocality: "Charlotte",
        addressRegion: "NC",
        postalCode: "28223",
        addressCountry: "US",
      },
    ],
    telephone: "+55 16 3415-0530",
    knowsAbout: [
      "CAD/CAM Dental",
      "Impressão 3D Odontológica",
      "Resinas 3D Odontológicas",
      "Scanners Intraorais",
      "Odontologia Digital",
      "Smart Print Bio Vitality",
    ],
  };
  return JSON.stringify(schema, null, 2);
}

/** Gera schema.org/MedicalDevice para Smart Print Bio Vitality */
export function generateVitalityProductSchema(): string {
  const p = VITALITY_PRODUCT;
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalDevice",
    name: p.name,
    sameAs: p.wikidataUrl,
    manufacturer: {
      "@type": "Organization",
      name: "Smart Dent",
      sameAs: "https://www.wikidata.org/entity/Q138636902",
    },
    description: `Resina nano-híbrida para impressão 3D odontológica definitiva. Resistência flexural: ${p.flexuralStrengthAfinko} MPa (Afinko INMETRO ISO/IEC 17025). Carga inorgânica: ${p.inorganicLoad} wt%. FDA ${p.fdaClass} nº ${p.fdaNumber}. Wikidata: ${p.wikidata}.`,
    identifier: [
      { "@type": "PropertyValue", name: "FDA Registration", value: p.fdaNumber },
      { "@type": "PropertyValue", name: "Wikidata", value: p.wikidata, url: p.wikidataUrl },
    ],
    study: {
      "@type": "MedicalStudy",
      name: "Characterization of 3D printed composite for final dental restorations",
      identifier: p.independentStudy.doi,
      author: p.independentStudy.authors,
      url: `https://doi.org/${p.independentStudy.doi}`,
    },
  };
  return JSON.stringify(schema, null, 2);
}

/** Injeta todos os schemas relevantes para uma página de artigo */
export function getArticleSchemas(authorId: string): string[] {
  const schemas: string[] = [];

  if (authorId === WEBER_RICCI.id) {
    schemas.push(generatePersonSchema(WEBER_RICCI));
  }

  if (authorId === MARCELO_DEL_GUERRA.id) {
    schemas.push(generatePersonSchema(MARCELO_DEL_GUERRA));
  }

  if (authorId === MARCELO_CESTARI.id) {
    schemas.push(generatePersonSchema(MARCELO_CESTARI));
  }

  schemas.push(generateOrganizationSchema());
  return schemas;
}
