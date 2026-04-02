import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Unified Google token resolver.
 * Priority chain:
 *   1. oauth_credentials table (new flow, per-user, per-provider)
 *   2. google_oauth_tokens table (legacy flow, scope-based)
 *   3. Environment variables (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET + per-scope refresh)
 *
 * For each source, if the token is expired it attempts a refresh using
 * the appropriate client_id + client_secret.
 */

type Scope = 'business' | 'youtube'

interface TokenResult {
  access_token: string
  source: string
}

const PROVIDER_MAP: Record<Scope, string> = {
  business: 'googleBusiness',
  youtube: 'youtube',
}

const SCOPE_FILTER: Record<Scope, string> = {
  business: 'https://www.googleapis.com/auth/business.manage',
  youtube: 'https://www.googleapis.com/auth/youtube.force-ssl',
}

/**
 * Get a valid Google access token for the given scope.
 * Returns null only if no credentials are found anywhere.
 */
export async function getValidGoogleToken(
  supabase: SupabaseClient,
  scope: Scope,
  userId?: string
): Promise<string | null> {
  const result = await resolveToken(supabase, scope, userId)
  return result?.access_token ?? null
}

async function resolveToken(
  supabase: SupabaseClient,
  scope: Scope,
  userId?: string
): Promise<TokenResult | null> {

  // ─── Source 1: oauth_credentials (new unified flow) ───
  const provider = PROVIDER_MAP[scope]
  
  let oauthCredsQuery = supabase
    .from('oauth_credentials')
    .select('refresh_token, client_id, client_secret, user_id')
    .eq('provider', provider)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (userId) {
    oauthCredsQuery = oauthCredsQuery.eq('user_id', userId)
  }

  const { data: oauthCreds } = await oauthCredsQuery.maybeSingle()

  if (oauthCreds?.refresh_token) {
    // Use per-user client_id/secret if stored, otherwise fall back to env
    const clientId = oauthCreds.client_id || Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = oauthCreds.client_secret || Deno.env.get('GOOGLE_CLIENT_SECRET')
    
    if (clientId && clientSecret) {
      console.log(`[google-auth] Trying oauth_credentials (provider=${provider})`)
      const token = await refreshAccessToken(clientId, clientSecret, oauthCreds.refresh_token)
      if (token) return { access_token: token, source: 'oauth_credentials' }
    }
  }

  // ─── Source 2: google_oauth_tokens (legacy) ───
  const scopeFilter = SCOPE_FILTER[scope]
  
  const { data: legacyRow } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .contains('scopes', [scopeFilter])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (legacyRow) {
    // Check if still valid (60s buffer)
    if (legacyRow.expires_at && new Date(legacyRow.expires_at) > new Date(Date.now() + 60_000)) {
      console.log(`[google-auth] Using cached legacy token (scope=${scope})`)
      return { access_token: legacyRow.provider_token, source: 'google_oauth_tokens_cache' }
    }

    // Try refresh
    if (legacyRow.provider_refresh_token) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
      
      if (clientId && clientSecret) {
        console.log(`[google-auth] Refreshing legacy token (scope=${scope})`)
        const token = await refreshAccessToken(clientId, clientSecret, legacyRow.provider_refresh_token)
        if (token) {
          // Update the legacy row
          await supabase
            .from('google_oauth_tokens')
            .update({
              provider_token: token,
              expires_at: new Date(Date.now() + 3500_000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', legacyRow.id)
          
          return { access_token: token, source: 'google_oauth_tokens_refreshed' }
        }
      }
    }
  }

  // ─── Source 3: Environment variables only ───
  const envClientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const envClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const envRefreshToken = scope === 'youtube'
    ? Deno.env.get('YOUTUBE_REFRESH_TOKEN')
    : Deno.env.get('GOOGLE_BUSINESS_REFRESH_TOKEN')

  if (envClientId && envClientSecret && envRefreshToken) {
    console.log(`[google-auth] Trying env vars (scope=${scope})`)
    const token = await refreshAccessToken(envClientId, envClientSecret, envRefreshToken)
    if (token) return { access_token: token, source: 'environment' }
  }

  console.error(`[google-auth] No valid credentials found for scope=${scope}`)
  return null
}

async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.access_token) {
      console.error(`[google-auth] Refresh failed: ${data.error} — ${data.error_description}`)
      return null
    }

    return data.access_token
  } catch (err) {
    console.error('[google-auth] Refresh exception:', err)
    return null
  }
}
