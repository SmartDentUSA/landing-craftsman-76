import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let credentialSource = 'unknown';
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('🔍 Checking YouTube OAuth credentials...');

    let clientId: string | undefined, clientSecret: string | undefined, refreshToken: string | undefined;

    // Priority 1: oauth_credentials table (unified flow)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        // Try oauth_credentials first (new flow)
        const { data: creds } = await supabaseClient
          .from('oauth_credentials')
          .select('client_id, client_secret, refresh_token')
          .eq('user_id', user.id)
          .eq('provider', 'youtube')
          .maybeSingle();

        if (creds?.refresh_token) {
          clientId = creds.client_id;
          clientSecret = creds.client_secret;
          refreshToken = creds.refresh_token;
          credentialSource = 'oauth_credentials';
          console.log('✅ Found credentials in oauth_credentials');
        }

        // Fallback: google_oauth_tokens (legacy)
        if (!refreshToken) {
          const { data: legacyCreds } = await supabaseClient
            .from('google_oauth_tokens')
            .select('provider_refresh_token')
            .eq('user_id', user.id)
            .contains('scopes', ['https://www.googleapis.com/auth/youtube.force-ssl'])
            .maybeSingle();
          
          if (legacyCreds?.provider_refresh_token) {
            refreshToken = legacyCreds.provider_refresh_token;
            credentialSource = 'google_oauth_tokens';
            console.log('✅ Found credentials in google_oauth_tokens (legacy)');
          }
        }
      }
    }

    // Fallback: environment variables
    if (!clientId) clientId = Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('YOUTUBE_CLIENT_ID');
    if (!clientSecret) clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || Deno.env.get('YOUTUBE_CLIENT_SECRET');
    if (!refreshToken) {
      refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');
      if (refreshToken) credentialSource = 'environment';
    }

    if (!clientId || !clientSecret || !refreshToken) {
      const missing = [];
      if (!clientId) missing.push('CLIENT_ID');
      if (!clientSecret) missing.push('CLIENT_SECRET');
      if (!refreshToken) missing.push('REFRESH_TOKEN');
      
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing YouTube OAuth credentials', missing }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Refreshing token (source: ${credentialSource})...`);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('❌ Token refresh failed:', tokenData);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: tokenData.error_description || 'Failed to refresh access token',
          details: tokenData,
          credentialSource
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;

    console.log('🧪 Testing YouTube API...');
    const apiResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: apiData.error?.message || 'YouTube API test failed', details: apiData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelName = apiData.items?.[0]?.snippet?.title || 'Unknown';
    console.log(`✅ YouTube connected: ${channelName}`);

    return new Response(
      JSON.stringify({ 
        ok: true,
        channelCount: apiData.items?.length || 0,
        channelName,
        credentialSource,
        message: `YouTube conectado: ${channelName} (via ${credentialSource})`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to test YouTube connection', details: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
