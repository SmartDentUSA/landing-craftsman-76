import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, clientId, clientSecret, redirectUri } = await req.json();

    if (!code || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code, clientId, clientSecret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use redirect_uri from request or default to localhost
    const effectiveRedirectUri = redirectUri || 
      Deno.env.get('YOUTUBE_REDIRECT_URI') || 
      'http://localhost:3000/oauth2/callback';

    logPreview(code, '🔐 Exchange Code');
    console.log('📍 Redirect URI:', effectiveRedirectUri);

    // Trocar code por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: effectiveRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      return new Response(
        JSON.stringify({ 
          error: tokenData.error_description || 'Failed to exchange code for tokens',
          details: tokenData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ 
          error: 'No refresh_token received. Make sure to include access_type=offline in authorization URL' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logPreview(access_token, '✅ Access Token');
    logPreview(refresh_token, '✅ Refresh Token');
    console.log('⏰ Expires in:', expires_in, 'seconds');

    return new Response(
      JSON.stringify({ 
        success: true,
        access_token,
        refresh_token,
        expires_in
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in exchange-youtube-code:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to exchange code',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
