import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_REDIRECT_URIS = new Set([
  "https://landing-craftsman-76.lovable.app/oauth2/callback",
  "https://b282ae68-9aa1-4f3f-8597-81ef6773926f.lovableproject.com/oauth2/callback",
  "https://id-preview--b282ae68-9aa1-4f3f-8597-81ef6773926f.lovable.app/oauth2/callback",
  "http://localhost:5173/oauth2/callback",
  "http://localhost:3000/oauth2/callback",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { code, provider, redirect_uri } = await req.json();

    if (!code || !provider || !redirect_uri) {
      return new Response(JSON.stringify({
        success: false, error: "missing_params"
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!ALLOWED_REDIRECT_URIS.has(redirect_uri)) {
      return new Response(JSON.stringify({
        success: false, error: "invalid_redirect_uri"
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("❌ GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurados");
      return new Response(JSON.stringify({
        success: false, error: "missing_env_secrets",
        error_description: "GOOGLE_CLIENT_ID/SECRET não configurados no servidor"
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("🔁 Direct exchange", { provider, user_id: user.id, redirect_uri });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData?.refresh_token) {
      console.error("❌ Token exchange failed:", tokenData);
      return new Response(JSON.stringify({
        success: false,
        error: tokenData?.error || "token_exchange_failed",
        error_description: tokenData?.error_description,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: upsertError } = await supabase
      .from("oauth_credentials")
      .upsert({
        user_id: user.id,
        provider,
        refresh_token: tokenData.refresh_token,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" });

    if (upsertError) {
      console.error("❌ Save failed:", upsertError);
      return new Response(JSON.stringify({ success: false, error: "save_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Direct exchange success", { provider, user_id: user.id });

    return new Response(JSON.stringify({
      success: true, refresh_token: tokenData.refresh_token,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("💥 Exception:", err);
    return new Response(JSON.stringify({
      success: false, error: "exception", message: String(err)
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
