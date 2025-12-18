// Helper para gerar Schema.org para Marcos Históricos

export interface Milestone {
  id?: string;
  user_id: string;
  year: number;
  month?: number;
  day?: number;
  slug: string;
  title: string;
  description?: string;
  market_context?: string;
  strategic_decision?: string;
  impact?: string;
  legacy?: string;
  location?: { city: string; state: string; country: string };
  key_people?: Array<{ name: string; role: string }>;
  products_involved?: string[];
  technologies?: string[];
  certifications?: string[];
  image_url?: string;
  video_url?: string;
  display_order?: number;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Formata a data do marco para ISO 8601
 */
function formatMilestoneDate(milestone: Milestone): string {
  const { year, month, day } = milestone;
  if (day && month) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  return String(year);
}

/**
 * Gera Schema.org Event para um marco histórico
 */
export function generateMilestoneEventSchema(milestone: Milestone, organizationName: string = 'Smart Dent Brasil'): object {
  const location = milestone.location || { city: '', state: '', country: 'Brasil' };
  const locationName = [location.city, location.state, location.country]
    .filter(Boolean)
    .join(', ');

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": milestone.title,
    "startDate": formatMilestoneDate(milestone),
    "eventStatus": "https://schema.org/EventCompleted",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "organizer": {
      "@type": "Organization",
      "name": organizationName
    }
  };

  if (locationName) {
    schema.location = {
      "@type": "Place",
      "name": locationName,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location.city || undefined,
        "addressRegion": location.state || undefined,
        "addressCountry": location.country || 'Brasil'
      }
    };
  }

  if (milestone.description) {
    schema.description = milestone.description;
  }

  if (milestone.image_url) {
    schema.image = milestone.image_url;
  }

  // Adiciona pessoas-chave como performers/contributors
  if (milestone.key_people && milestone.key_people.length > 0) {
    schema.contributor = milestone.key_people.map(person => ({
      "@type": "Person",
      "name": person.name,
      "jobTitle": person.role
    }));
  }

  return schema;
}

/**
 * Gera Schema.org ItemList (Timeline) para todos os marcos
 */
export function generateTimelineSchema(
  milestones: Milestone[], 
  baseUrl: string,
  listName: string = 'Marcos Históricos'
): object {
  const sortedMilestones = [...milestones].sort((a, b) => a.year - b.year);
  
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": listName,
    "description": `Linha do tempo com os principais marcos históricos`,
    "numberOfItems": milestones.length,
    "itemListOrder": "https://schema.org/ItemListOrderAscending",
    "itemListElement": sortedMilestones.map((milestone, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": milestone.title,
      "url": `${baseUrl}/marcos/${milestone.slug}/`,
      "item": {
        "@type": "Event",
        "name": milestone.title,
        "startDate": formatMilestoneDate(milestone)
      }
    }))
  };
}

/**
 * Gera Schema.org Organization com foundingDate e founders
 */
export function generateOrganizationWithHistory(
  companyName: string,
  foundingYear: number,
  founders: Array<{ name: string; title?: string }>,
  knowsAbout: string[] = []
): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": companyName,
    "foundingDate": String(foundingYear)
  };

  if (founders && founders.length > 0) {
    schema.founders = founders.map(founder => ({
      "@type": "Person",
      "name": founder.name,
      ...(founder.title && { "jobTitle": founder.title })
    }));
  }

  if (knowsAbout && knowsAbout.length > 0) {
    schema.knowsAbout = knowsAbout;
  }

  return schema;
}

/**
 * Gera slug automático baseado no ano e título
 */
export function generateMilestoneSlug(year: number, title: string): string {
  const normalizedTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .substring(0, 50); // Limita tamanho
  
  return `${year}-${normalizedTitle}`;
}

/**
 * Formata data legível para exibição
 */
export function formatMilestoneDisplayDate(milestone: Milestone): string {
  const months = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const { year, month, day } = milestone;
  
  if (day && month) {
    return `${day} de ${months[month]} de ${year}`;
  }
  if (month) {
    return `${months[month]} de ${year}`;
  }
  return String(year);
}

/**
 * Gera JSON-LD completo para uma página de marco
 */
export function generateMilestonePageSchema(
  milestone: Milestone,
  companyName: string,
  baseUrl: string
): string {
  const eventSchema = generateMilestoneEventSchema(milestone, companyName);
  
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": milestone.title,
    "description": milestone.description || `Marco histórico: ${milestone.title}`,
    "url": `${baseUrl}/marcos/${milestone.slug}/`,
    "mainEntity": eventSchema,
    "datePublished": formatMilestoneDate(milestone),
    "inLanguage": "pt-BR"
  };

  return JSON.stringify([eventSchema, webPageSchema], null, 2);
}
