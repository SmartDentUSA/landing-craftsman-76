import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache opcional (melhora performance)
const tokenCache = new Map<string, { token: string, expiresAt: number }>();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { 
        global: { 
          headers: { Authorization: req.headers.get("Authorization") || "" } 
        } 
      }
    );

    // Autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: "unauthorized"
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // Verificar cache
    const cached = tokenCache.get(user.id);
    if (cached && cached.expiresAt > Date.now() + 300000) {
      return new Response(JSON.stringify({
        success: true,
        access_token: cached.token,
        source: "cache"
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // Buscar refresh_token
    const { data: tokenData } = await supabase
      .from('google_oauth_tokens')
      .select('provider_token, provider_refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tokenData?.provider_refresh_token) {
      return new Response(JSON.stringify({
        success: false,
        error: "no_refresh_token"
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // Validar se token ainda é válido
    const now = Date.now();
    const expiresAt = new Date(tokenData.expires_at).getTime();
    
    if (expiresAt > now + 300000) {
      return new Response(JSON.stringify({
        success: true,
        access_token: tokenData.provider_token,
        source: "database"
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // Refresh no Google
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: tokenData.provider_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshRes.json();

    if (!refreshRes.ok || !refreshData?.access_token) {
      return new Response(JSON.stringify({
        success: false,
        error: "refresh_failed",
        details: refreshData.error_description
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // Atualizar banco
    const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();

    await supabase
      .from('google_oauth_tokens')
      .update({
        provider_token: refreshData.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    // Atualizar cache
    tokenCache.set(user.id, {
      token: refreshData.access_token,
      expiresAt: Date.now() + (refreshData.expires_in * 1000)
    });

    return new Response(JSON.stringify({
      success: true,
      access_token: refreshData.access_token,
      source: "google_refresh"
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: "exception",
      message: String(err)
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
