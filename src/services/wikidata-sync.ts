import { supabase } from '@/integrations/supabase/client';

interface WikidataSyncResult {
  success: boolean;
  wikidataQid?: string;
  error?: string;
}

function normalizeResponse(data: any): WikidataSyncResult {
  if (!data) return { success: false, error: 'Resposta vazia da edge function' };

  const qid = data.wikidataQid || data.qid || data.wikidata_id || data.wikidata_item_id || data.wikidataItemId;
  const success = data.success === true || !!qid;
  const error = data.error || data.message || data.errorMessage;

  if (success && qid) {
    return { success: true, wikidataQid: qid };
  }

  return {
    success: false,
    error: error || `Resposta inesperada: ${JSON.stringify(data).slice(0, 200)}`
  };
}

export async function syncCompanyToWikidata(): Promise<WikidataSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('wikidata-sync', {
      body: { action: 'sync_company' }
    });

    console.log('[Wikidata] sync_company response:', { data, error });

    if (error) {
      console.error('[Wikidata] sync_company error:', error);
      return { success: false, error: error.message || 'Erro na edge function' };
    }

    return normalizeResponse(data);
  } catch (err) {
    console.error('[Wikidata] sync_company exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function syncProductToWikidata(productId: string): Promise<WikidataSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('wikidata-sync', {
      body: { action: 'sync_product', productId }
    });

    console.log('[Wikidata] sync_product response:', { data, error, productId });

    if (error) {
      console.error('[Wikidata] sync_product error:', error);
      return { success: false, error: error.message || 'Erro na edge function' };
    }

    return normalizeResponse(data);
  } catch (err) {
    console.error('[Wikidata] sync_product exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}
