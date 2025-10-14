import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Link {
  name: string;
  url: string;
  category?: string;
}

/**
 * Enriquece conteúdo HTML com links inteligentes automáticos
 * Aplica APENAS 1x por termo (primeira ocorrência)
 */
export async function enrichContentWithLinks(content: string, domain: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: links, error } = await supabase
    .from('external_links')
    .select('name, url, category')
    .eq('approved', true)
    .order('name', { ascending: true });

  if (error || !links?.length) {
    console.log('⚠️ No approved links found or error:', error?.message);
    return content;
  }

  console.log(`🔗 Processing ${links.length} approved links...`);

  const usedTerms = new Set<string>();
  let enrichedContent = content;

  // Ordenar por comprimento decrescente (termos mais longos primeiro)
  const sortedLinks = links.sort((a, b) => b.name.length - a.name.length);

  sortedLinks.forEach((link: Link) => {
    const termLower = link.name.toLowerCase();
    
    // Pular se já foi usado
    if (usedTerms.has(termLower)) return;

    // Regex para encontrar termo completo (word boundary)
    const regex = new RegExp(`\\b(${escapeRegex(link.name)})\\b`, 'i');
    
    // Substituir apenas primeira ocorrência
    enrichedContent = enrichedContent.replace(regex, (match) => {
      usedTerms.add(termLower);
      return `<a href="${link.url}" target="_blank" rel="noopener">${match}</a>`;
    });
  });

  console.log(`✅ Applied ${usedTerms.size} intelligent links`);
  return enrichedContent;
}

/**
 * Escapa caracteres especiais para regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
