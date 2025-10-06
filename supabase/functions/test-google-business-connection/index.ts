import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logPreview(value: string, label: string = ''): void {
  const preview = value.length > 50 ? `${value.substring(0, 50)}...` : value;
  console.log(`${label}: ${preview}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    let clientId, clientSecret, refreshToken;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        const { data: credsData } = await supabaseClient
          .from('google_business_oauth_credentials')
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

    if (!clientId) clientId = Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
    if (!clientSecret) clientSecret = Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');
    if (!refreshToken) refreshToken = Deno.env.get('GOOGLE_BUSINESS_REFRESH_TOKEN');

    console.log('🔍 Checking Google Business OAuth credentials...');
    
    if (!clientId || !clientSecret || !refreshToken) {
      const missing = [];
      if (!clientId) missing.push('GOOGLE_BUSINESS_CLIENT_ID');
      if (!clientSecret) missing.push('GOOGLE_BUSINESS_CLIENT_SECRET');
      if (!refreshToken) missing.push('GOOGLE_BUSINESS_REFRESH_TOKEN');
      
      console.log('❌ Missing secrets:', missing.join(', '));
      
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Missing Google Business OAuth credentials',
          missing 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logPreview(clientId, '✅ Client ID');
    logPreview(clientSecret, '✅ Client Secret');
    logPreview(refreshToken, '✅ Refresh Token');
    
    // Detectar formato antigo de token
    if (refreshToken?.startsWith("4/")) {
      console.warn("⚠️ Token formato antigo detectado (OAuth Playground). Recomenda-se gerar novo via app.");
    }
    console.log(`🔍 Token type: ${refreshToken?.startsWith("1/") ? "Production" : "Playground/Test"}`);

    console.log('🔄 Exchanging refresh_token for access_token...');
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
      
      const suggestion = refreshToken?.startsWith("4/")
        ? "Token antigo detectado. Gere novo via fluxo OAuth do app (não use OAuth Playground)"
        : "Verifique se redirect URI e escopos estão corretos no GCP";

      return new Response(
        JSON.stringify({ 
          ok: false,
          error: tokenData.error_description || 'Failed to refresh access token',
          suggestion,
          details: {
            ...tokenData,
            clientIdLast6: clientId.slice(-6),
            refreshTokenPreview: refreshToken.slice(0, 10) + "...",
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    logPreview(accessToken, '✅ New Access Token');

    console.log('🧪 Testing Google Business API connection...');
    const apiResponse = await fetch(
      'https://mybusiness.googleapis.com/v4/accounts',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('❌ Google Business API test failed:', apiData);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: apiData.error?.message || 'Google Business API test failed',
          details: apiData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountCount = apiData.accounts?.length || 0;
    const accountName = apiData.accounts?.[0]?.accountName || 'Unknown';
    
    console.log('✅ Google Business API connection successful!');
    console.log(`🏢 Account: ${accountName} (${accountCount} account(s) found)`);

    return new Response(
      JSON.stringify({ 
        ok: true,
        accountCount,
        accountName,
        message: 'Google Business OAuth credentials are valid'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in test-google-business-connection:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Failed to test Google Business connection',
        details: (error as Error).message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
