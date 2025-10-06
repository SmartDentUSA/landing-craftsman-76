import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId, clientSecret, redirectUri } = await req.json();
    const effectiveRedirectUri =
      redirectUri || Deno.env.get("GOOGLE_BUSINESS_REDIRECT_URI") || "https://landing-craftsman-76.lovable.app/oauth2/callback";
    const expectedRedirectUri = Deno.env.get("GOOGLE_BUSINESS_REDIRECT_URI") || "https://landing-craftsman-76.lovable.app/oauth2/callback";

    if (!code || !clientId || !clientSecret || !effectiveRedirectUri) {
      return json({
        success: false,
        error: "missing_params",
        error_description: "Parâmetros obrigatórios ausentes",
        details: { clientIdLast6: clientId?.slice(-6), redirectUri: effectiveRedirectUri },
      });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: effectiveRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    console.log("exchange-google-business-code", {
      ok: tokenRes.ok,
      status: tokenRes.status,
      google_error: tokenData?.error,
      google_error_description: tokenData?.error_description,
      clientIdLast6: clientId.slice(-6),
      redirectUriReceived: effectiveRedirectUri,
      expectedRedirectUri,
      redirectMatch: effectiveRedirectUri === expectedRedirectUri,
      codePreview: String(code).slice(0, 10) + "...",
      codeLength: code.length,
    });

    if (!tokenRes.ok || !tokenData?.refresh_token) {
      let probableCause = "unknown";
      
      if (tokenData?.error === "invalid_grant") {
        if (tokenData?.error_description?.includes("redirect_uri")) {
          probableCause = "redirect_uri_mismatch";
        } else if (tokenData?.error_description?.includes("Bad Request")) {
          probableCause = "code_expired_or_reused";
        }
      }

      return json({
        success: false,
        error: tokenData?.error || "unknown_error",
        error_description: tokenData?.error_description || "Falha ao trocar código por token",
        probable_cause: probableCause,
        details: {
          status: tokenRes.status,
          redirectMatch: effectiveRedirectUri === expectedRedirectUri,
          clientIdLast6: clientId.slice(-6),
        },
      });
    }

    return json({
      success: true,
      refresh_token: tokenData.refresh_token,
    });
  } catch (err) {
    console.error("exchange-google-business-code exception", err);
    return json({
      success: false,
      error: "exception",
      error_description: "Erro inesperado na Edge Function",
    });
  }
});
