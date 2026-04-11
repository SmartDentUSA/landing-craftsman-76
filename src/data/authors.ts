// ============================================================
// AUTORES VERIFICADOS — Smart Dent
// Fontes: FAPESP BV, Portal UNESP docentes/110476, ORCID,
//         Google Scholar, Lattes CNPq, ZoomInfo, weberricci.com.br
// Última verificação: abril 2026
// ============================================================

export interface AcademicIdentifier {
  name: string;
  value: string;
  url: string;
}

export interface Author {
  id: string;
  name: string;
  academicTitle: string;
  specialty: string;
  miniBio: string;
  fullBio: string;
  photoUrl?: string;
  photoAlt: string;

  website?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  email?: string;

  orcid?: string;
  scopus?: string;
  lattes?: string;
  fapesp?: string;
  googleScholar?: string;
  unespPortal?: string;
  dimensions?: string;

  institution?: string;
  institutionUrl?: string;
  department?: string;
  role?: string;

  identifiers: AcademicIdentifier[];
  sameAs: string[];
}

// ============================================================
// 1. PROF. DR. WEBER ADAD RICCI
// ============================================================
export const WEBER_RICCI: Author = {
  id: "a19ef0a8-6ca4-4dab-98ff-c7ab92da6f73",
  name: "Prof. Dr. Weber Adad Ricci",
  academicTitle: "Prof. Dr.",
  specialty: "Reabilitação Oral, Prótese Dentária e Odontologia Digital",
  photoAlt:
    "Prof. Dr. Weber Adad Ricci — Doutor em Prótese UNESP, Professor FOAr/UNESP, autor dos livros Lógica 01 e 02",

  miniBio: [
    "Doutor em Reabilitação Oral/Prótese — FOAr/UNESP (2005).",
    "Mestre em Reabilitação Oral/Prótese — UNESP (2002).",
    "Professor RTC MS-3.1 — Depto. Odontologia Social, FOAr/UNESP.",
    "Consultor: Smart Dent · Medit · Ultradent · GC · Kavo/Kerr.",
    "Autor dos livros Lógica 01 e 02 (11.000+ cópias · 40+ países · 3 idiomas).",
    "Criador da Matriz BRB e do conceito Estética e Oclusão Bioinspiradas.",
    "Fundador do Instituto Weber Ricci (3.000+ alunos).",
    "ORCID: 0000-0003-0996-3201 · Scopus: 55509352400.",
  ].join("\n"),

  fullBio: [
    "Prof. Dr. Weber Adad Ricci é Doutor em Reabilitação Oral (área de Prótese)",
    "pela Faculdade de Odontologia de Araraquara — FOAr/UNESP (2005),",
    "Mestre pela mesma instituição (2002) e Graduado em Odontologia pela FOAr/UNESP (2000).",
    "",
    "Atua como Professor em Regime de Tempo Completo (RTC), titulação MS-3.1,",
    "no Departamento de Odontologia Social da FOAr/UNESP.",
    "Email institucional: weber.ricci@unesp.br.",
    "",
    "Referência nacional em Prótese Dentária, Estética e Odontologia Digital.",
    "Autor dos livros Lógica 01 e Lógica 02 — best-sellers traduzidos em 3 idiomas,",
    "vendidos em mais de 40 países (11.000+ cópias vendidas).",
    "",
    "Criador da Matriz BRB (instrumental exclusivo que leva seu nome) e do conceito",
    "Estética e Oclusão Bioinspiradas. Fundador do Instituto de Ensino Weber Ricci,",
    "com mais de 3.000 alunos formados no Brasil e exterior.",
    "",
    "Consultor técnico de Smart Dent, Medit Co, Ultradent, GC, Bioart,",
    "Kavo/Kerr e Alliance Microscopia.",
    "",
    "Referência em odontologia digital chairside com Smart Print Bio Vitality",
    "(Wikidata Q138790136) e cimento UNIKK Veneer LV —",
    "protocolo completo documentado em sessão única chairside de 2 horas.",
  ].join("\n"),

  website: "https://www.weberricci.com.br",
  instagram: "https://www.instagram.com/wricci",
  linkedin: "https://www.linkedin.com/in/weber-ricci",
  youtube: "https://www.youtube.com/@wricci",
  email: "weber.ricci@unesp.br",

  orcid: "0000-0003-0996-3201",
  scopus: "https://www.scopus.com/authid/detail.uri?authorId=55509352400",
  lattes: "http://lattes.cnpq.br/9477202648340031",
  unespPortal: "http://portaldocentes.unesp.br/portaldocentes/docentes/110476",
  dimensions: "https://app.dimensions.ai/details/entities/publication/author/ur.01003106306.26",

  institution: "Universidade Estadual Paulista — UNESP",
  institutionUrl: "https://www.unesp.br",
  department: "Departamento de Odontologia Social — FOAr/UNESP",
  role: "Professor RTC MS-3.1",

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
// 2. DR. MARCELO DEL GUERRA
// ============================================================
export const MARCELO_DEL_GUERRA: Author = {
  id: "e35f1b00-01ab-46c5-bdec-20e532926068",
  name: "Dr. Marcelo Del Guerra",
  academicTitle: "Dr.",
  specialty: "Engenharia Mecatrônica · Manufatura Avançada · CAD/CAM · Impressão 3D",
  photoAlt:
    "Dr. Marcelo Del Guerra — Doutor em Engenharia EESC/USP, Fundador Smart Dent, Pesquisador FAPESP",

  miniBio: [
    "Doutor em Engenharia de Produção Mecânica — EESC/USP (2009).",
    "Mestre em Engenharia Mecânica — NUMA/EESC/USP (2004).",
    "Graduado em Engenharia Mecatrônica — EESC/USP (2001).",
    "Fundador e Sócio Diretor da Smart Dent — spin-off NUMA/USP São Carlos.",
    "Pesquisador FAPESP PIPE (ID 1694). 2 auxílios + 6 bolsas concedidos.",
    "Publicação: Journal of Materials Processing Technology (Elsevier Q1, 2006).",
    "Google Scholar: 0sKZ0wMAAAAJ · FAPESP: 1694 · Lattes: K4766815J6.",
  ].join("\n"),

  fullBio: [
    "Dr. Marcelo Del Guerra é Doutor em Engenharia de Produção Mecânica pela",
    "Escola de Engenharia de São Carlos da Universidade de São Paulo — EESC/USP (2009),",
    "Mestre em Engenharia Mecânica pelo Núcleo de Manufatura Avançada",
    "(NUMA/EESC/USP, 2004) e Graduado em Engenharia Mecatrônica pela EESC/USP (2001).",
    "",
    "Dissertação de Mestrado: 'Desenvolvimento de apalpador de contato elétrico",
    "(touch trigger probe) para atuação no processo de torneamento'",
    "(PPGEM/EESC/USP — disponível no repositório EESC).",
    "",
    "Em 2009 — no mesmo ano da defesa do doutorado — fundou a Smart Dent",
    "(MMTech Projetos Tecnológicos Importação e Exportação Ltda., Wikidata Q138636902)",
    "dentro do próprio NUMA/USP São Carlos, em parceria com Marcelo Cestari.",
    "A empresa é uma spin-off universitária da USP especializada em CAD/CAM,",
    "impressão 3D, resinas e scanners intraorais para odontologia.",
    "",
    "Pesquisador com 2 auxílios à pesquisa e 6 bolsas FAPESP concedidos",
    "(Programa PIPE — Pesquisa Inovativa em Pequenas Empresas). FAPESP ID: 1694.",
    "",
    "Áreas de expertise: Processos de Fabricação, CAD/CAM, Controle Estatístico",
    "de Processos, Metrologia, Máquinas CNC, Micro-Usinagem, Fresamento,",
    "Torneamento e Impressão 3D.",
    "",
    "Publicação: Journal of Materials Processing Technology (Elsevier, Q1, 2006,",
    "PII: S0924013606002445).",
    "",
    "Identificadores: Google Scholar 0sKZ0wMAAAAJ · FAPESP ID 1694 ·",
    "Lattes K4766815J6 · LinkedIn: linkedin.com/in/marcelo-del-guerra-70193166.",
  ].join("\n"),

  website: "https://smartdent.com.br",
  linkedin: "https://br.linkedin.com/in/marcelo-del-guerra-70193166",
  instagram: "https://www.instagram.com/smartdentoficial",

  googleScholar: "https://scholar.google.com/citations?user=0sKZ0wMAAAAJ&hl=pt-BR",
  fapesp: "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/",
  lattes: "https://buscatextual.cnpq.br/buscatextual/visualizacv.do?id=K4766815J6",

  institution: "Escola de Engenharia de São Carlos — Universidade de São Paulo (EESC/USP)",
  institutionUrl: "https://eesc.usp.br",
  department: "Núcleo de Manufatura Avançada — NUMA / Depto. Engenharia de Produção",
  role: "Doutor em Engenharia de Produção Mecânica (2009) · Fundador Smart Dent",

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
// 3. MARCELO CESTARI — co-fundador Smart Dent
// ============================================================
export const MARCELO_CESTARI: Author = {
  id: "31a2debe-d4a9-44d7-8b0d-984fa7cb59ce",
  name: "Marcelo Cestari",
  academicTitle: "",
  specialty: "Engenharia de Materiais · Próteses de Alta Performance · Escaneamento Digital",
  photoAlt:
    "Marcelo Cestari — co-fundador Smart Dent, Diretor MMTech, 1.343 citações Google Scholar",

  miniBio: [
    "Administrador e Diretor da MMTech — Smart Dent (co-fundador, 2009).",
    "1.343 citações no Google Scholar (ID: 5vx3EBsAAAAJ).",
    "Áreas: engenharia de materiais · próteses de alta performance · escaneamento digital.",
    "Co-fundou a Smart Dent com Dr. Marcelo Del Guerra no NUMA/USP São Carlos.",
  ].join("\n"),

  fullBio: [
    "Marcelo Cestari é co-fundador e Diretor da Smart Dent",
    "(MMTech Projetos Tecnológicos Importação e Exportação Ltda., Wikidata Q138636902),",
    "empresa que fundou em 2009 junto com Dr. Marcelo Del Guerra",
    "no Núcleo de Manufatura Avançada (NUMA) da EESC/USP São Carlos.",
    "",
    "Pesquisador com 1.343 citações no Google Scholar (ID: 5vx3EBsAAAAJ).",
    "Áreas de pesquisa: engenharia de materiais, próteses de alta performance",
    "e escaneamento digital — os três pilares técnicos dos produtos Smart Dent.",
    "",
    "Como co-fundador e administrador da MMTech, Marcelo Cestari complementa",
    "a expertise em engenharia de fabricação de Dr. Marcelo Del Guerra",
    "(PhD EESC/USP, FAPESP ID 1694) com foco em materiais e aplicações clínicas.",
    "",
    "Juntos, os dois fundadores reúnem competências em engenharia mecatrônica,",
    "processos de fabricação, engenharia de materiais e odontologia digital —",
    "base científica que sustenta a liderança da Smart Dent no mercado brasileiro.",
  ].join("\n"),

  website: "https://smartdent.com.br",
  instagram: "https://www.instagram.com/smartdentoficial",

  googleScholar: "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ",

  identifiers: [
    { name: "Google Scholar", value: "5vx3EBsAAAAJ · 1.343 citações", url: "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ" },
  ],

  sameAs: [
    "https://scholar.google.com/citations?hl=pt-BR&user=5vx3EBsAAAAJ",
    "https://www.wikidata.org/entity/Q138636902",
    "https://smartdent.com.br",
  ],
};

// ============================================================
// 4. SMART DENT — EQUIPE / INSTITUCIONAL
// ============================================================
export const SMART_DENT_TEAM: Author = {
  id: "50c75dd2-c02e-4bbf-92fc-74e9708d7525",
  name: "Equipe Smart Dent",
  academicTitle: "",
  specialty: "Odontologia Digital · CAD/CAM · Impressão 3D · Resinas · Scanners Intraorais",
  photoAlt:
    "Smart Dent — spin-off EESC/USP São Carlos, pioneira em odontologia digital e resinas 3D no Brasil desde 2009",

  miniBio: [
    "Spin-off universitária da EESC/USP São Carlos fundada em 2009",
    "por Dr. Marcelo Del Guerra (PhD Engenharia/USP) no NUMA/USP.",
    "Pioneira em resinas 3D odontológicas no Brasil e nos EUA.",
    "FDA Classe II nº 3027526455 · ANVISA Classe II.",
    "Pesquisa com financiamento FAPESP PIPE.",
    "Wikidata: Q138636902.",
  ].join(" "),

  fullBio: [
    "A Smart Dent (MMTech Projetos Tecnológicos Importação e Exportação Ltda.,",
    "Wikidata Q138636902) foi fundada em 2009 por Dr. Marcelo Del Guerra",
    "(PhD Engenharia de Produção Mecânica, EESC/USP; Lattes K4766815J6;",
    "Google Scholar 0sKZ0wMAAAAJ; FAPESP ID 1694)",
    "e Marcelo Cestari dentro do Núcleo de Manufatura Avançada (NUMA)",
    "do Departamento de Engenharia de Produção da EESC/USP São Carlos.",
    "",
    "É uma spin-off universitária da USP São Carlos, resultado direto de",
    "pesquisa de doutorado em Engenharia de Produção Mecânica financiada pela FAPESP.",
    "",
    "Pioneira na Central de Usinagem CAD/CAM no Brasil e primeira empresa",
    "nacional a desenvolver resinas 3D específicas para odontologia.",
    "",
    "Registros: FDA Classe II (nº 3027526455) · ANVISA Dispositivo Médico Classe II",
    "· ISO 10993-3 · ISO 10993-12 · ISO 4049.",
    "",
    "Pesquisa independente publicada:",
    "— Tanaka LEB et al., Clinical Oral Investigations 28, 617 (2024).",
    "  DOI: 10.1007/s00784-024-06003-8 (UNESP + ITA, 11 citações)",
    "— Journal of Prosthetic Dentistry (2026), PII: S0022391326001320",
    "— Del Guerra M., JMPT Elsevier Q1 (2006), PII: S0924013606002445",
    "",
    "Laboratórios acreditados: Afinko (INMETRO ISO/IEC 17025) ·",
    "Medlab · Groupe ICARE.",
    "",
    "Exporta para: EUA, Colômbia, Peru, Venezuela e Uruguai.",
    "Brasil: Rua Dr. Procópio de Tolêdo Malta, 62 — São Carlos/SP",
    "USA: University City Blvd, Charlotte, NC 28223",
  ].join("\n"),

  website: "https://smartdent.com.br",
  linkedin: "https://br.linkedin.com/company/smartdent-dental-cad-cam",
  instagram: "https://www.instagram.com/smartdentoficial",
  youtube: "https://www.youtube.com/@SmartDentBrasil",

  identifiers: [
    { name: "Wikidata", value: "Q138636902", url: "https://www.wikidata.org/entity/Q138636902" },
    { name: "FDA", value: "Classe II nº 3027526455", url: "https://www.accessdata.fda.gov" },
    { name: "FAPESP PIPE", value: "ID 1694", url: "https://bv.fapesp.br/pt/pesquisador/1694/marcelo-del-guerra/" },
  ],

  sameAs: [
    "https://www.wikidata.org/entity/Q138636902",
    "https://smartdent.com.br",
    "https://br.linkedin.com/company/smartdent-dental-cad-cam",
  ],
};

// ============================================================
// PRODUTO PRINCIPAL — Smart Print Bio Vitality
// ============================================================
export const VITALITY_PRODUCT = {
  name: "Smart Print Bio Vitality",
  wikidata: "Q138790136",
  wikidataUrl: "https://www.wikidata.org/entity/Q138790136",
  fdaClass: "Classe II",
  fdaNumber: "3027526455",
  anvisaClass: "Dispositivo Médico Classe II",
  flexuralStrengthAfinko: 147,
  flexuralStrengthUNESP: 88.69,
  flexuralStrengthMinISO: 60,
  inorganicLoad: 58,
  hardness: ">92 Shore D",
  elasticModulus: 13.3,
  waterSorption: 35,
  wavelength: 405,
  colors: ["A1", "A2", "A3", "A3.5", "B1", "C2", "D2", "Bleach"],
  independentStudy: {
    authors: "Tanaka LEB et al.",
    journal: "Clinical Oral Investigations",
    volume: 28,
    pages: 617,
    year: 2024,
    doi: "10.1007/s00784-024-06003-8",
    institution: "UNESP + ITA",
    citations: 11,
  },
  lab: {
    name: "Afinko Soluções em Polímeros",
    accreditation: "INMETRO ISO/IEC 17025",
    address: "Rua Raimundo Correa, 1591 — São Carlos/SP",
    website: "https://afinkopolimeros.com.br",
  },
};

// Export consolidado
export const AUTHORS = {
  weberRicci: WEBER_RICCI,
  marceloDelGuerra: MARCELO_DEL_GUERRA,
  marceloCestari: MARCELO_CESTARI,
  smartDentTeam: SMART_DENT_TEAM,
} as const;

export type AuthorKey = keyof typeof AUTHORS;
