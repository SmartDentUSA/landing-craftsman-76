import { supabase } from '@/integrations/supabase/client';

interface WikidataSyncResult {
  success: boolean;
  wikidataQid?: string;
  error?: string;
  errorCode?: string;
  needsCreate?: boolean;
  reason?: string;
  fallbackQid?: string;
  fallbackLabel?: string;
  fallbackDescription?: string;
}

interface WikidataPayloadResult {
  success: boolean;
  payload?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  error?: string;
}

export interface WikidataResolveResult {
  success: boolean;
  writeDecision?: 'create' | 'update' | 'skip' | 'abort';
  syncStatus?: 'synced' | 'pending' | 'collision' | 'failed' | 'skipped';
  semanticScore?: number;
  semanticGrade?: string;
  wikidataQid?: string;
  writeEnabled?: boolean;
  payloadHash?: string;
  collisionCandidates?: unknown[];
  error?: string;
  errorCode?: string;
  durationMs?: number;
}

export interface WikidataWriteResult {
  success: boolean;
  wikidataQid?: string;
  writeDecision?: string;
  syncStatus?: string;
  semanticScore?: number;
  semanticGrade?: string;
  durationMs?: number;
  error?: string;
  errorCode?: string;
}

// ── Helper: extract structured error from non-2xx edge function responses ──

function parseEdgeFunctionError(error: any): { error: string; errorCode?: string } {
  // supabase.functions.invoke puts the response body in error.context when non-2xx
  try {
    if (error?.context) {
      // error.context may be a Response object
      const ctx = error.context;
      if (ctx && typeof ctx === 'object') {
        // Try to get JSON body from the context if it was already parsed
        if (ctx.json && typeof ctx.json === 'function') {
          // Can't await here synchronously, handled below
        }
        // Some versions expose body directly
        if (ctx.error) return { error: ctx.error, errorCode: ctx.errorCode };
        if (ctx.errorMessage) return { error: ctx.errorMessage, errorCode: ctx.errorCode };
      }
    }
    // Fallback: parse the error message itself
    if (error?.message) {
      // The default message from supabase-js is "Edge Function returned a non-2xx status code"
      // Try to extract the real message
      const msg = error.message;
      if (msg.includes('WIKIDATA_OAUTH_INVALID_AUTHORIZATION')) {
        return {
          error: 'Credenciais OAuth do Wikidata inválidas. Atualize ACCESS_TOKEN/ACCESS_SECRET.',
          errorCode: 'WIKIDATA_OAUTH_INVALID_AUTHORIZATION',
        };
      }
      return { error: msg };
    }
  } catch {
    // ignore parse errors
  }
  return { error: error?.message || 'Erro na edge function' };
}

async function extractErrorFromResponse(error: any): Promise<{ error: string; errorCode?: string }> {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error || body?.errorMessage) {
        return {
          error: body.error || body.errorMessage,
          errorCode: body.errorCode,
        };
      }
    }
  } catch {
    // context.json() may fail if body already consumed
  }
  return parseEdgeFunctionError(error);
}

// ── Shared invoke helper ──

function normalizeResponse(data: any): WikidataSyncResult {
  if (!data) return { success: false, error: 'Resposta vazia da edge function' };

  // Handle "generic_category_only" — no item found, only category fallback
  if (data.needsCreate === true && data.reason === 'generic_category_only') {
    return {
      success: false,
      needsCreate: true,
      reason: data.reason,
      fallbackQid: data.fallbackQid,
      fallbackLabel: data.fallbackLabel,
      fallbackDescription: data.fallbackDescription,
      error: data.message,
    };
  }

  const qid = data.wikidataQid || data.qid || data.wikidata_id || data.wikidata_item_id || data.wikidataItemId;
  const success = data.success === true || !!qid;
  const error = data.error || data.message || data.errorMessage;

  if (success && qid) {
    return { success: true, wikidataQid: qid };
  }

  return {
    success: false,
    error: error || `Resposta inesperada: ${JSON.stringify(data).slice(0, 200)}`,
    errorCode: data.errorCode,
  };
}

async function invokeWikidataSync(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError) {
    console.error('[Wikidata] session error:', sessionError);
  }

  if (!accessToken) {
    return {
      data: null,
      error: new Error('Sessão expirada ou ausente. Faça login novamente.')
    };
  }

  return supabase.functions.invoke('wikidata-sync', {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function syncCompanyToWikidata(): Promise<WikidataSyncResult> {
  try {
    const { data, error } = await invokeWikidataSync({ action: 'sync_company' });

    console.log('[Wikidata] sync_company response:', { data, error });

    if (error) {
      console.error('[Wikidata] sync_company error:', error);
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error, errorCode: parsed.errorCode };
    }

    return normalizeResponse(data);
  } catch (err) {
    console.error('[Wikidata] sync_company exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function syncProductToWikidata(productId: string): Promise<WikidataSyncResult> {
  try {
    const { data, error } = await invokeWikidataSync({ action: 'sync_product', productId });

    console.log('[Wikidata] sync_product response:', { data, error, productId });

    if (error) {
      console.error('[Wikidata] sync_product error:', error);
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error, errorCode: parsed.errorCode };
    }

    return normalizeResponse(data);
  } catch (err) {
    console.error('[Wikidata] sync_product exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function buildCompanyWikidataPayload(): Promise<WikidataPayloadResult> {
  try {
    const { data, error } = await invokeWikidataSync({ action: 'build_company_payload' });

    console.log('[Wikidata] build_company_payload response:', { data, error });

    if (error) {
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error };
    }

    if (data?.success && data?.payload) {
      return { success: true, payload: data.payload, summary: data.summary };
    }

    return { success: false, error: data?.error || 'Resposta inesperada' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function buildProductWikidataPayload(productId: string): Promise<WikidataPayloadResult> {
  try {
    const { data, error } = await invokeWikidataSync({ action: 'build_product_payload', productId });

    console.log('[Wikidata] build_product_payload response:', { data, error, productId });

    if (error) {
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error };
    }

    if (data?.success && data?.payload) {
      return { success: true, payload: data.payload, summary: data.summary };
    }

    return { success: false, error: data?.error || 'Resposta inesperada' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function resolveWikidataEntity(
  entityType: 'company' | 'product',
  internalId: string,
): Promise<WikidataResolveResult> {
  try {
    const { data, error } = await invokeWikidataSync({
      action: 'resolve_and_persist',
      entityType,
      internalId,
    });

    console.log('[Wikidata] resolve_and_persist response:', { data, error, entityType, internalId });

    if (error) {
      console.error('[Wikidata] resolve_and_persist error:', error);
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error, errorCode: parsed.errorCode };
    }

    return {
      success: data?.success ?? false,
      writeDecision: data?.writeDecision,
      syncStatus: data?.syncStatus,
      semanticScore: data?.semanticScore,
      semanticGrade: data?.semanticGrade,
      wikidataQid: data?.wikidataQid,
      writeEnabled: data?.writeEnabled,
      payloadHash: data?.payloadHash,
      collisionCandidates: data?.collisionCandidates,
      error: data?.error,
      errorCode: data?.errorCode,
      durationMs: data?.durationMs,
    };
  } catch (err) {
    console.error('[Wikidata] resolve_and_persist exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function executeWikidataWrite(
  entityType: 'company' | 'product',
  internalId: string,
): Promise<WikidataWriteResult> {
  try {
    const { data, error } = await invokeWikidataSync({
      action: 'execute_write',
      entityType,
      internalId,
    });

    console.log('[Wikidata] execute_write response:', { data, error, entityType, internalId });

    if (error) {
      console.error('[Wikidata] execute_write error:', error);
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error, errorCode: parsed.errorCode };
    }

    return {
      success: data?.success ?? false,
      wikidataQid: data?.wikidataQid,
      writeDecision: data?.writeDecision,
      syncStatus: data?.syncStatus,
      semanticScore: data?.semanticScore,
      semanticGrade: data?.semanticGrade,
      durationMs: data?.durationMs,
      error: data?.error,
      errorCode: data?.errorCode,
    };
  } catch (err) {
    console.error('[Wikidata] execute_write exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

// ── Test OAuth ──

export interface WikidataTestOAuthResult {
  success: boolean;
  sitename?: string;
  csrfTokenStatus?: string;
  errorCategory?: string;
  secretFragments?: Record<string, string>;
  message?: string;
  error?: string;
}

export async function testWikidataOAuth(): Promise<WikidataTestOAuthResult> {
  try {
    const { data, error } = await invokeWikidataSync({ action: 'test_oauth' });

    console.log('[Wikidata] test_oauth response:', { data, error });

    if (error) {
      const parsed = await extractErrorFromResponse(error);
      return { success: false, error: parsed.error };
    }

    return {
      success: data?.success ?? false,
      sitename: data?.sitename,
      csrfTokenStatus: data?.csrfTokenStatus,
      errorCategory: data?.errorCategory,
      secretFragments: data?.secretFragments,
      message: data?.message,
      error: data?.error,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}
