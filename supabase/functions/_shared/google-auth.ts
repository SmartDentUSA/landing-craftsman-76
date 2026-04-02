import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getValidGoogleToken(
  supabase: SupabaseClient,
  scope: 'business' | 'youtube'
): Promise<string | null> {
  const scopeFilter = scope === 'business'
    ? 'https://www.googleapis.com/auth/business.manage'
    : 'https://www.googleapis.com/auth/youtube.force-ssl'

  const { data: tokenRow } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .contains('scopes', [scopeFilter])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!tokenRow) return null

  // Token still valid (with 60s buffer)
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) > new Date(Date.now() + 60_000)) {
    return tokenRow.provider_token
  }

  // Refresh via existing edge function
  const res = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-google-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ token_id: tokenRow.id }),
    }
  )

  const refreshed = await res.json()
  return refreshed?.access_token ?? null
}
