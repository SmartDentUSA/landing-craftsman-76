import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Trunca logs sensíveis para até 50 caracteres
 */
function logPreview(value: string, label: string = ''): void {
  const preview = value.length > 50 ? `${value.substring(0, 50)}...` : value;
  console.log(`${label}: ${preview}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client to read from database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Try to get credentials from database first (per-user config)
    const authHeader = req.headers.get('Authorization');
    let clientId, clientSecret, refreshToken;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        const { data: credsData } = await supabaseClient
          .from('youtube_oauth_credentials')
          .select('client_id, client_secret, refresh_token')
          .eq('user_id', user.id)
          .single();

        if (credsData) {
          clientId = credsData.client_id;
          clientSecret = credsData.client_secret;
          refreshToken = credsData.refresh_token;
          console.log('✅ Using credentials from database for user:', user.id);
        }
      }
    }

    // Fallback to environment variables
    if (!clientId) clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
    if (!clientSecret) clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
    if (!refreshToken) refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');

    console.log('🔍 Checking YouTube OAuth credentials...');
    
    if (!clientId || !clientSecret || !refreshToken) {
      const missing = [];
      if (!clientId) missing.push('YOUTUBE_CLIENT_ID');
      if (!clientSecret) missing.push('YOUTUBE_CLIENT_SECRET');
      if (!refreshToken) missing.push('YOUTUBE_REFRESH_TOKEN');
      
      console.log('❌ Missing secrets:', missing.join(', '));
      
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Missing YouTube OAuth credentials',
          missing 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let credentialSource = clientId === Deno.env.get('YOUTUBE_CLIENT_ID') ? 'environment' : 'database';

    logPreview(clientId, '✅ Client ID');
    logPreview(clientSecret, '✅ Client Secret');
    logPreview(refreshToken, '✅ Refresh Token');

    // Trocar refresh_token por access_token
    console.log('🔄 Exchanging refresh_token for access_token...');
    let tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    let tokenData = await tokenResponse.json();

    // 🔥 FALLBACK: Se OAuth falhou com deleted_client ou invalid_grant, tentar env vars
    if (!tokenResponse.ok && (tokenData.error === 'deleted_client' || tokenData.error === 'invalid_grant')) {
      console.error(`❌ Token refresh failed (${tokenData.error}):`, tokenData);
      
      const envClientId = Deno.env.get('YOUTUBE_CLIENT_ID');
      const envClientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
      const envRefreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');
      
      if (envClientId && envClientSecret && envRefreshToken && credentialSource !== 'environment') {
        console.log('🔄 Retrying with environment variables fallback...');
        
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: envClientId,
            client_secret: envClientSecret,
            refresh_token: envRefreshToken,
            grant_type: 'refresh_token',
          }),
        });
        
        tokenData = await tokenResponse.json();
        
        if (tokenResponse.ok) {
          clientId = envClientId;
          clientSecret = envClientSecret;
          refreshToken = envRefreshToken;
          credentialSource = 'environment_fallback';
          console.log('✅ Token refresh successful with env vars fallback!');
        }
      }
    }

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
    logPreview(accessToken, '✅ New Access Token');

    // Testar API do YouTube
    console.log('🧪 Testing YouTube API connection...');
    const apiResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('❌ YouTube API test failed:', apiData);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: apiData.error?.message || 'YouTube API test failed',
          details: apiData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelCount = apiData.items?.length || 0;
    const channelName = apiData.items?.[0]?.snippet?.title || 'Unknown';
    
    console.log('✅ YouTube API connection successful!');
    console.log(`📺 Channel: ${channelName} (${channelCount} channel(s) found)`);

    return new Response(
      JSON.stringify({ 
        ok: true,
        channelCount,
        channelName,
        credentialSource,
        message: `YouTube OAuth credentials are valid (Source: ${credentialSource})`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in test-youtube-connection:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Failed to test YouTube connection',
        details: (error as Error).message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
