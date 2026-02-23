import { supabase } from '@/integrations/supabase/client';

const STORAGE_PREFIX = '__storage__:';

/**
 * Resolves landing_page_html that may be a storage reference.
 * If the value starts with "__storage__:", fetches the actual HTML from Supabase Storage.
 * Otherwise returns the value as-is.
 */
export async function resolveStorageHtml(value: string | null): Promise<string | null> {
  if (!value) return null;
  
  if (!value.startsWith(STORAGE_PREFIX)) {
    return value;
  }

  const storagePath = value.slice(STORAGE_PREFIX.length);
  console.log('📦 Resolvendo HTML do Storage:', storagePath);

  const { data } = supabase.storage
    .from('landing-pages-html')
    .getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    console.error('❌ Não foi possível obter URL pública do Storage');
    return null;
  }

  const publicUrl = data.publicUrl + '?t=' + Date.now();
  console.log('🔗 Buscando HTML com cache-bust:', publicUrl);
  const response = await fetch(publicUrl);
  if (!response.ok) {
    console.error('❌ Erro ao buscar HTML do Storage:', response.status);
    return null;
  }

  const html = await response.text();
  console.log('✅ HTML resolvido do Storage:', html.length, 'caracteres');
  return html;
}
