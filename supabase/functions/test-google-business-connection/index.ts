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

    console.log('🔍 Checking Google Business OAuth credentials...');

    // Parse request body for optional credentials
    const body = await req.json().catch(() => ({}));
    const {
      clientId: bodyClientId,
      clientSecret: bodyClientSecret,
      refreshToken: bodyRefreshToken,
    } = body;

    let clientId, clientSecret, refreshToken;
    let credentialSource = 'environment';

    // Priority: body > database > environment
    if (bodyClientId && bodyClientSecret && bodyRefreshToken) {
      console.log('🔵 Using credentials from request body (form data)');
      clientId = bodyClientId;
      clientSecret = bodyClientSecret;
      refreshToken = bodyRefreshToken;
      credentialSource = 'form';
    } else {
      // Try database if user is authenticated
      const authHeader = req.headers.get('Authorization');
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
            credentialSource = 'database';
            console.log('✅ Using credentials from database for user:', user.id);
          }
        }
      }

      // Fallback to environment variables
      if (!clientId || !clientSecret || !refreshToken) {
        console.log('⚠️ Using credentials from environment variables');
        clientId = clientId || Deno.env.get('GOOGLE_BUSINESS_CLIENT_ID');
        clientSecret = clientSecret || Deno.env.get('GOOGLE_BUSINESS_CLIENT_SECRET');
        refreshToken = refreshToken || Deno.env.get('GOOGLE_BUSINESS_REFRESH_TOKEN');
        if (!credentialSource || credentialSource === 'environment') {
          credentialSource = 'environment';
        }
      }
    }
    
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

    // Validar formato das credenciais ANTES de usar
    if (!clientId.includes('.apps.googleusercontent.com')) {
      console.error('❌ Client ID com formato inválido:', clientId.slice(0, 30));
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Invalid Client ID format',
          suggestion: 'Client ID deve terminar com .apps.googleusercontent.com',
          details: { clientIdPreview: clientId.slice(0, 30) + '...' }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (clientId.startsWith('GOCSPX-')) {
      console.error('❌ Client Secret detectado no campo Client ID!');
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Client Secret in Client ID field',
          suggestion: 'Você colocou o Client Secret no lugar do Client ID. Corrija as credenciais.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação relaxada do Client Secret (aceitar qualquer formato)
    if (!clientSecret || clientSecret.trim().length < 10) {
      console.error('❌ Client Secret muito curto ou inválido');
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Invalid Client Secret',
          suggestion: 'Client Secret muito curto. Verifique se colou corretamente.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (refreshToken.startsWith('GOCSPX-')) {
      console.error('❌ Client Secret detectado no campo Refresh Token!');
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Client Secret in Refresh Token field',
          suggestion: 'Você colocou o Client Secret no lugar do Refresh Token. Gere um token válido via OAuth.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (refreshToken.includes('.apps.googleusercontent.com')) {
      console.error('❌ Client ID detectado no campo Refresh Token!');
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'client_id_in_refresh_token',
          suggestion: 'Você colou o Client ID no lugar do Refresh Token. Use o campo Client ID separado.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (refreshToken.startsWith('4/')) {
      console.error('❌ Código de autorização detectado no campo Refresh Token!');
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'authorization_code_in_refresh',
          suggestion: 'Você colou um código OAuth (4/...) no lugar do Refresh Token. Use o botão "Trocar por Token" no modal para obter o Refresh Token válido (1//).',
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
    
    // Try Business Information API first (newer), fallback to Account Management
    let apiResponse = await fetch(
      'https://mybusinessbusinessinformation.googleapis.com/v1/accounts',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let apiUsed = 'Business Information API';

    // Fallback to Account Management API if first fails
    if (!apiResponse.ok) {
      console.log('⚠️ Business Information API failed, trying Account Management API...');
      apiResponse = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      apiUsed = 'Account Management API';
    }

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error(`❌ ${apiUsed} test failed:`, apiData);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: apiData.error?.message || `Falha ao testar conexão com ${apiUsed}`,
          details: { ...apiData, apiUsed }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountCount = apiData.accounts?.length || 0;
    const accountName = apiData.accounts?.[0]?.accountName || 'Unknown';
    
    console.log(`✅ ${apiUsed} connection successful!`);
    console.log(`🏢 Account: ${accountName} (${accountCount} account(s) found)`);

    return new Response(
      JSON.stringify({ 
        ok: true,
        accountCount,
        accountName,
        credentialSource,
        apiUsed,
        message: `Google Business OAuth credentials are valid (Source: ${credentialSource}, API: ${apiUsed})`
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
        credentialSource: credentialSource || 'unknown',
        details: (error as Error).message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
