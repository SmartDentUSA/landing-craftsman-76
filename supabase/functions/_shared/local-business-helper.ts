// ═══════════════════════════════════════════════════════════
// 🏢 LOCAL BUSINESS SCHEMA HELPER - FASE 2 GEO LOCAL SEO
// ═══════════════════════════════════════════════════════════

export interface LocalBusinessData {
  // Dados básicos
  company_name: string;
  legal_name?: string;
  company_description?: string;
  website_url?: string;
  company_logo_url?: string;
  
  // Contato
  contact_phone?: string;
  contact_email?: string;
  
  // Endereço estruturado
  street_address?: string;
  address_number?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  
  // 🌍 GEO Coordinates
  latitude?: number;
  longitude?: number;
  
  // 📅 Horário de funcionamento
  opening_hours?: Array<{
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }>;
  
  // 💰 Faixa de preço
  price_range?: string;
  
  // 🗺️ Áreas atendidas
  areas_served?: string[];
  
  // 👤 Fundador (E-E-A-T)
  founder_name?: string;
  founder_title?: string;
  founder_linkedin?: string;
  
  // Identificadores
  tax_id?: string;
  duns_number?: string;
  
  // Funcionários
  number_of_employees?: string;
  founded_year?: number;
  
  // Redes sociais
  instagram_profile?: string;
  youtube_channel?: string;
  
  // SEO adicional
  seo_service_areas?: string;
  seo_technical_expertise?: string;
}

// ═══════════════════════════════════════════════════════════
// 📌 DADOS PADRÃO SMART DENT (FALLBACK)
// Fonte única: company-profile.ts — não duplicar aqui.
// ═══════════════════════════════════════════════════════════
import { getDefaultLocalBusinessData } from './company-profile.ts';
const DEFAULT_LOCAL_BUSINESS: LocalBusinessData = getDefaultLocalBusinessData();

// ═══════════════════════════════════════════════════════════
// 🔧 GERADOR DE LOCALBUSINESS SCHEMA
// ═══════════════════════════════════════════════════════════
export function generateLocalBusinessSchema(data: LocalBusinessData): any {
  const websiteUrl = data.website_url || DEFAULT_LOCAL_BUSINESS.website_url;
  
  const schema: any = {
    "@type": "LocalBusiness",
    "@id": `${websiteUrl}/#localbusiness`,
    "name": data.company_name || DEFAULT_LOCAL_BUSINESS.company_name,
    "legalName": data.legal_name || data.company_name || DEFAULT_LOCAL_BUSINESS.company_name,
    "description": data.company_description || DEFAULT_LOCAL_BUSINESS.company_description,
    "url": websiteUrl
  };
  
  // Logo
  const logoUrl = data.company_logo_url || DEFAULT_LOCAL_BUSINESS.company_logo_url;
  if (logoUrl) {
    schema.logo = {
      "@type": "ImageObject",
      "url": logoUrl,
      "width": 200,
      "height": 60
    };
    schema.image = logoUrl;
  }
  
  // PostalAddress
  const city = data.city || DEFAULT_LOCAL_BUSINESS.city;
  const streetAddress = data.street_address || DEFAULT_LOCAL_BUSINESS.street_address;
  const addressNumber = data.address_number || DEFAULT_LOCAL_BUSINESS.address_number;
  
  schema.address = {
    "@type": "PostalAddress",
    "streetAddress": [streetAddress, addressNumber].filter(Boolean).join(', '),
    "addressLocality": city,
    "addressRegion": data.state || DEFAULT_LOCAL_BUSINESS.state,
    "postalCode": data.postal_code || DEFAULT_LOCAL_BUSINESS.postal_code,
    "addressCountry": data.country || DEFAULT_LOCAL_BUSINESS.country || "BR"
  };
  
  // 🌍 GeoCoordinates (CRÍTICO para GEO Local SEO)
  const lat = data.latitude || DEFAULT_LOCAL_BUSINESS.latitude;
  const lng = data.longitude || DEFAULT_LOCAL_BUSINESS.longitude;
  if (lat && lng) {
    schema.geo = {
      "@type": "GeoCoordinates",
      "latitude": lat,
      "longitude": lng
    };
  }
  
  // 📅 OpeningHoursSpecification
  const hours = data.opening_hours || DEFAULT_LOCAL_BUSINESS.opening_hours;
  if (hours && Array.isArray(hours) && hours.length > 0) {
    schema.openingHoursSpecification = hours.map(h => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": h.dayOfWeek,
      "opens": h.opens,
      "closes": h.closes
    }));
  }
  
  // 💰 PriceRange
  const priceRange = data.price_range || DEFAULT_LOCAL_BUSINESS.price_range;
  if (priceRange) {
    schema.priceRange = priceRange;
  }
  
  // 🗺️ AreaServed
  const areas = data.areas_served || DEFAULT_LOCAL_BUSINESS.areas_served;
  if (areas && areas.length > 0) {
    schema.areaServed = areas.map(area => ({
      "@type": "Place",
      "name": area
    }));
  }
  
  // 👤 Founder (E-E-A-T)
  const founderName = data.founder_name || DEFAULT_LOCAL_BUSINESS.founder_name;
  if (founderName) {
    schema.founder = {
      "@type": "Person",
      "name": founderName,
      "jobTitle": data.founder_title || DEFAULT_LOCAL_BUSINESS.founder_title || "Fundador"
    };
    if (data.founder_linkedin) {
      schema.founder.sameAs = data.founder_linkedin;
    }
  }
  
  // Contato
  const phone = data.contact_phone || DEFAULT_LOCAL_BUSINESS.contact_phone;
  const email = data.contact_email || DEFAULT_LOCAL_BUSINESS.contact_email;
  if (phone) schema.telephone = phone;
  if (email) schema.email = email;
  
  // Identificadores
  const taxId = data.tax_id || DEFAULT_LOCAL_BUSINESS.tax_id;
  if (taxId) schema.taxID = taxId;
  if (data.duns_number) schema.duns = data.duns_number;
  
  // Funcionários
  const employees = data.number_of_employees || DEFAULT_LOCAL_BUSINESS.number_of_employees;
  if (employees) {
    schema.numberOfEmployees = {
      "@type": "QuantitativeValue",
      "value": employees
    };
  }
  
  // Ano de fundação
  const foundedYear = data.founded_year || DEFAULT_LOCAL_BUSINESS.founded_year;
  if (foundedYear) {
    schema.foundingDate = foundedYear.toString();
  }
  
  // Redes sociais
  const sameAs = [
    data.instagram_profile || DEFAULT_LOCAL_BUSINESS.instagram_profile,
    data.youtube_channel || DEFAULT_LOCAL_BUSINESS.youtube_channel
  ].filter(Boolean);
  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }
  
  // knowsAbout (SEO)
  if (data.seo_technical_expertise) {
    schema.knowsAbout = data.seo_technical_expertise.split(',').map(s => s.trim());
  }
  
  return schema;
}

// ═══════════════════════════════════════════════════════════
// 📡 BUSCAR DADOS DO BANCO COM FALLBACK
// ═══════════════════════════════════════════════════════════
export async function fetchLocalBusinessData(supabase: any): Promise<LocalBusinessData> {
  try {
    const { data, error } = await supabase
      .from('company_profile')
      .select(`
        company_name, legal_name, company_description, website_url, company_logo_url,
        contact_phone, contact_email, street_address, address_number, city, state,
        postal_code, country, latitude, longitude, opening_hours, price_range,
        areas_served, founder_name, founder_title, founder_linkedin, tax_id,
        duns_number, number_of_employees, founded_year, instagram_profile, youtube_channel,
        seo_service_areas, seo_technical_expertise
      `)
      .limit(1)
      .single();
    
    if (error || !data) {
      console.warn('⚠️ [LocalBusiness] Usando dados padrão Smart Dent (sem dados no banco)');
      return DEFAULT_LOCAL_BUSINESS;
    }
    
    // Merge com defaults para campos vazios
    const result: LocalBusinessData = {
      ...DEFAULT_LOCAL_BUSINESS,
      ...data,
      // Parsear campos numéricos
      latitude: data.latitude ? parseFloat(data.latitude) : DEFAULT_LOCAL_BUSINESS.latitude,
      longitude: data.longitude ? parseFloat(data.longitude) : DEFAULT_LOCAL_BUSINESS.longitude,
      founded_year: data.founded_year || DEFAULT_LOCAL_BUSINESS.founded_year,
      // Parsear arrays
      opening_hours: data.opening_hours && Array.isArray(data.opening_hours) 
        ? data.opening_hours 
        : DEFAULT_LOCAL_BUSINESS.opening_hours,
      areas_served: data.areas_served && Array.isArray(data.areas_served)
        ? data.areas_served
        : DEFAULT_LOCAL_BUSINESS.areas_served
    };
    
    console.log(`✅ [LocalBusiness] Dados carregados: ${result.company_name} (${result.city}/${result.state})`);
    return result;
  } catch (err) {
    console.error('❌ [LocalBusiness] Erro ao buscar dados:', err);
    return DEFAULT_LOCAL_BUSINESS;
  }
}

// ═══════════════════════════════════════════════════════════
// 🖼️ GERAR HTML GEO CONTEXT (MICRODATA OCULTO)
// ═══════════════════════════════════════════════════════════
export function generateGeoContextHTML(data: LocalBusinessData): string {
  const lat = data.latitude || DEFAULT_LOCAL_BUSINESS.latitude;
  const lng = data.longitude || DEFAULT_LOCAL_BUSINESS.longitude;
  const phone = data.contact_phone || DEFAULT_LOCAL_BUSINESS.contact_phone;
  const priceRange = data.price_range || DEFAULT_LOCAL_BUSINESS.price_range;
  const streetAddress = [data.street_address, data.address_number].filter(Boolean).join(', ') || 
    [DEFAULT_LOCAL_BUSINESS.street_address, DEFAULT_LOCAL_BUSINESS.address_number].join(', ');
  const city = data.city || DEFAULT_LOCAL_BUSINESS.city;
  const state = data.state || DEFAULT_LOCAL_BUSINESS.state;
  const postalCode = data.postal_code || DEFAULT_LOCAL_BUSINESS.postal_code;
  const companyName = data.company_name || DEFAULT_LOCAL_BUSINESS.company_name;
  
  return `
<!-- GEO Context for AI Crawlers (Hidden) -->
<aside class="geo-context visually-hidden" itemscope itemtype="https://schema.org/LocalBusiness" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">
  <meta itemprop="name" content="${companyName}">
  <meta itemprop="telephone" content="${phone}">
  <meta itemprop="priceRange" content="${priceRange}">
  <div itemprop="geo" itemscope itemtype="https://schema.org/GeoCoordinates">
    <meta itemprop="latitude" content="${lat}">
    <meta itemprop="longitude" content="${lng}">
  </div>
  <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
    <meta itemprop="streetAddress" content="${streetAddress}">
    <meta itemprop="addressLocality" content="${city}">
    <meta itemprop="addressRegion" content="${state}">
    <meta itemprop="postalCode" content="${postalCode}">
  </div>
</aside>
`;
}
