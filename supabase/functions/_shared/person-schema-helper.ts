// ═══════════════════════════════════════════════════════════
// 🎯 FASE 3: Person Schema Helper (E-E-A-T)
// Gera schema de autores/KOLs para SEO e Google Knowledge Graph
// ═══════════════════════════════════════════════════════════

export interface PersonSchemaData {
  id: string;
  full_name: string;
  specialty?: string;
  mini_cv?: string;
  photo_url?: string;
  lattes_url?: string;
  website_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  affiliation?: {
    name: string;
    url: string;
  };
}

/**
 * Gera Person Schema (JSON-LD) para E-E-A-T
 * @param data Dados do KOL/Autor
 * @returns Schema JSON-LD do tipo Person
 */
export function generatePersonSchema(data: PersonSchemaData): any {
  // Coletar links de perfis verificáveis (sameAs)
  const sameAs = [
    data.lattes_url,
    data.website_url,
    data.instagram_url,
    data.youtube_url
  ].filter(Boolean);

  const personSchema: any = {
    "@type": "Person",
    "@id": `#person-${data.id}`,
    "name": data.full_name
  };

  // Adicionar campos opcionais se existirem
  if (data.mini_cv) {
    personSchema.description = data.mini_cv;
  }

  if (data.photo_url) {
    personSchema.image = data.photo_url;
  }

  if (data.specialty) {
    personSchema.jobTitle = data.specialty;
  }

  if (sameAs.length > 0) {
    personSchema.sameAs = sameAs;
  }

  if (data.affiliation) {
    personSchema.affiliation = {
      "@type": "Organization",
      "name": data.affiliation.name,
      "url": data.affiliation.url
    };
  }

  return personSchema;
}

/**
 * Busca dados do KOL pelo ID no Supabase
 * @param supabase Cliente Supabase
 * @param kolId UUID do KOL
 * @param companyAffiliation Dados de afiliação da empresa (opcional)
 * @returns PersonSchemaData ou null se não encontrado
 */
export async function fetchKOLData(
  supabase: any, 
  kolId: string,
  companyAffiliation?: { name: string; url: string }
): Promise<PersonSchemaData | null> {
  try {
    const { data, error } = await supabase
      .from('key_opinion_leaders')
      .select('*')
      .eq('id', kolId)
      .eq('approved', true)
      .single();

    if (error || !data) {
      console.warn(`⚠️ [Person Schema] KOL não encontrado: ${kolId}`);
      return null;
    }

    console.log(`✅ [Person Schema] KOL carregado: ${data.full_name} (${data.specialty || 'sem especialidade'})`);

    return {
      id: data.id,
      full_name: data.full_name,
      specialty: data.specialty,
      mini_cv: data.mini_cv,
      photo_url: data.photo_url,
      lattes_url: data.lattes_url,
      website_url: data.website_url,
      instagram_url: data.instagram_url,
      youtube_url: data.youtube_url,
      affiliation: companyAffiliation || {
        name: "Smart Dent",
        url: "https://smartdent.com.br"
      }
    };
  } catch (err) {
    console.error('❌ [Person Schema] Erro ao buscar KOL:', err);
    return null;
  }
}

/**
 * Cria referência para o autor no BlogPosting schema
 * @param authorId ID do autor
 * @returns Referência JSON-LD
 */
export function createAuthorReference(authorId: string): any {
  return { "@id": `#person-${authorId}` };
}

/**
 * Gera HTML oculto com microdata para E-E-A-T
 * @param data Dados do KOL/Autor
 * @returns HTML string com microdata
 */
export function generatePersonMicrodataHTML(data: PersonSchemaData): string {
  const sameAsLinks = [
    data.lattes_url,
    data.website_url,
    data.instagram_url,
    data.youtube_url
  ].filter(Boolean);

  return `
    <!-- ✅ E-E-A-T: Author Microdata (visually hidden) -->
    <div class="author-eeat visually-hidden" itemscope itemtype="https://schema.org/Person" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">
      <meta itemprop="name" content="${data.full_name || ''}">
      ${data.specialty ? `<meta itemprop="jobTitle" content="${data.specialty}">` : ''}
      ${data.mini_cv ? `<meta itemprop="description" content="${data.mini_cv.substring(0, 200)}">` : ''}
      ${data.photo_url ? `<meta itemprop="image" content="${data.photo_url}">` : ''}
      ${sameAsLinks.map(url => `<link itemprop="sameAs" href="${url}">`).join('\n      ')}
      ${data.affiliation ? `
      <span itemprop="affiliation" itemscope itemtype="https://schema.org/Organization">
        <meta itemprop="name" content="${data.affiliation.name}">
        <link itemprop="url" href="${data.affiliation.url}">
      </span>` : ''}
    </div>
  `.trim();
}

/**
 * Busca todos os KOLs aprovados
 * @param supabase Cliente Supabase
 * @returns Array de PersonSchemaData
 */
export async function fetchAllApprovedKOLs(supabase: any): Promise<PersonSchemaData[]> {
  try {
    const { data, error } = await supabase
      .from('key_opinion_leaders')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error || !data) {
      console.warn('⚠️ [Person Schema] Nenhum KOL aprovado encontrado');
      return [];
    }

    console.log(`✅ [Person Schema] ${data.length} KOLs aprovados carregados`);

    return data.map((kol: any) => ({
      id: kol.id,
      full_name: kol.full_name,
      specialty: kol.specialty,
      mini_cv: kol.mini_cv,
      photo_url: kol.photo_url,
      lattes_url: kol.lattes_url,
      website_url: kol.website_url,
      instagram_url: kol.instagram_url,
      youtube_url: kol.youtube_url,
      affiliation: {
        name: "Smart Dent",
        url: "https://smartdent.com.br"
      }
    }));
  } catch (err) {
    console.error('❌ [Person Schema] Erro ao buscar KOLs:', err);
    return [];
  }
}
