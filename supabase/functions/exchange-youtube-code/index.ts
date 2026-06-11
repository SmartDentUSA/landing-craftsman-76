import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ✅ WHITELIST de origens permitidas
const ALLOWED = new Set([
  "https://landing-craftsman-76.lovable.app",
  "https://b282ae68-9aa1-4f3f-8597-81ef6773926f.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function sanitizeRedirectUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  try {
    const u = new URL(uri);
    const normalized = `${u.origin}/oauth2/callback`;
    return ALLOWED.has(u.origin) ? normalized : undefined;
  } catch {
    return undefined;
  }
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId, clientSecret, redirectUri } = await req.json();
    
    // ✅ SANITIZAR redirectUri antes de usar
    const incoming = sanitizeRedirectUri(redirectUri);
    const envFallback = Deno.env.get("YOUTUBE_REDIRECT_URI") || 
                        "https://landing-craftsman-76.lovable.app/oauth2/callback";
    const effectiveRedirectUri = incoming ?? envFallback;
    
    console.log("🔁 redirect_uri usado:", effectiveRedirectUri);

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

    // 🔎 Log estruturado (sem dados sensíveis)
    console.log("exchange-youtube-code", {
      ok: tokenRes.ok,
      status: tokenRes.status,
      google_error: tokenData?.error,
      google_error_description: tokenData?.error_description,
      clientIdLast6: clientId.slice(-6),
      redirectUri: effectiveRedirectUri,
      codePreview: String(code).slice(0, 6) + "...",
    });

    if (!tokenRes.ok || !tokenData?.refresh_token) {
      return json({
        success: false,
        error: tokenData?.error || "unknown_error",
        error_description:
          tokenData?.error_description || "Falha ao trocar código por token",
        details: {
          status: tokenRes.status,
          clientIdLast6: clientId.slice(-6),
          redirectUri: effectiveRedirectUri,
        },
      });
    }

    return json({
      success: true,
      refresh_token: tokenData.refresh_token,
    });
  } catch (err) {
    console.error("exchange-youtube-code exception", err);
    return json({
      success: false,
      error: "exception",
      error_description: "Erro inesperado na Edge Function",
    });
  }
});
