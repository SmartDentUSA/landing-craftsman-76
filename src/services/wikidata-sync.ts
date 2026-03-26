import { supabase } from '@/integrations/supabase/client';

export async function syncCompanyToWikidata() {
  const { data, error } = await supabase.functions.invoke('wikidata-sync', {
    body: { action: 'sync_company' }
  });
  if (error) return { success: false, error: error.message };
  return data;
}

export async function syncProductToWikidata(productId: string) {
  const { data, error } = await supabase.functions.invoke('wikidata-sync', {
    body: { action: 'sync_product', productId }
  });
  if (error) return { success: false, error: error.message };
  return data;
}
