import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidGoogleToken } from "../_shared/google-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: "unauthorized"
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // Parse optional scope from body
    let scope: 'business' | 'youtube' = 'business';
    try {
      const body = await req.json();
      if (body?.scope === 'youtube') scope = 'youtube';
    } catch { /* default to business */ }

    // Use the unified token resolver
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = await getValidGoogleToken(serviceSupabase, scope, user.id);

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: "no_valid_credentials",
        message: "Nenhuma credencial válida encontrada. Reconecte via OAuth."
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    return new Response(JSON.stringify({
      success: true,
      access_token: token,
      source: "unified_resolver"
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: "exception",
      message: String(err)
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
