import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ORIGINS = new Set([
  "https://landing-craftsman-76.lovable.app",
  "https://b282ae68-9aa1-4f3f-8597-81ef6773926f.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

type Provider = "youtube" | "googleBusiness";

interface Body {
  code: string;
  provider: Provider;
  config_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🟢 exchange-oauth-code init", { 
      origin: req.headers.get("origin"),
      method: req.method 
    });

    // 🔒 Security #1: Validar origem real
    const origin = req.headers.get("origin") || "";
    if (!ALLOWED_ORIGINS.has(origin)) {
      console.error("❌ Origem não autorizada:", origin);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "forbidden_origin",
        error_description: "Origem não autorizada para OAuth"
      }), {
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Valid origin:", origin);

    // 🔒 Security #2: Autenticar usuário via JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { 
        global: { 
          headers: { Authorization: req.headers.get("Authorization") || "" } 
        } 
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ Não autenticado:", authError);
      return new Response(JSON.stringify({
        success: false,
        error: "unauthorized",
        error_description: "Autenticação necessária"
      }), {
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Authenticated user:", user.id);

    // 🔧 Parse do corpo da requisição
    const { code, provider, config_id } = await req.json() as Body;

    // Validar parâmetros obrigatórios
    if (!code || !provider || !config_id) {
      console.error("❌ Parâmetros ausentes:", { 
        code: !!code, 
        provider, 
        config_id: !!config_id 
      });
      return new Response(JSON.stringify({
        success: false,
        error: "missing_params",
        error_description: "code, provider e config_id são obrigatórios"
      }), {
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validar formato do código OAuth
    if (!code.startsWith("4/")) {
      console.error("❌ Código inválido:", code.slice(0, 10));
      return new Response(JSON.stringify({
        success: false,
        error: "invalid_code_format",
        error_description: "Código OAuth deve iniciar com '4/'"
      }), {
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("🔁 Exchanging code", {
      provider,
      user_id: user.id,
      code_preview: code.slice(0, 10) + "...",
      config_id
    });

    // 🔒 Security #3: Buscar Client Secret seguro no backend
    const { data: config, error: configError } = await supabase
      .from("oauth_client_configs")
      .select("client_id, client_secret")
      .eq("id", config_id)
      .eq("owner_user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();

    if (configError || !config) {
      console.error("❌ Configuração não encontrada:", { 
        config_id, 
        user_id: user.id, 
        provider,
        error: configError 
      });
      return new Response(JSON.stringify({
        success: false,
        error: "config_not_found",
        error_description: "Configuração OAuth não encontrada ou sem permissão"
      }), {
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 🔒 Security #4: Construir redirect_uri validado
    const redirect_uri = `${origin}/oauth2/callback`;

    console.log("🔄 Token exchange with Google:", {
      redirect_uri,
      client_id_last6: config.client_id.slice(-6)
    });

    // 🔄 Trocar código por token com Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData?.refresh_token) {
      console.error("❌ Falha na troca de token:", {
        status: tokenRes.status,
        error: tokenData?.error,
        error_description: tokenData?.error_description
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: tokenData?.error || "token_exchange_failed",
        error_description: tokenData?.error_description || "Falha ao trocar código por token",
        details: {
          status: tokenRes.status,
          redirect_uri
        }
      }), {
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 💾 Salvar refresh_token
    const { error: upsertError } = await supabase
      .from("oauth_credentials")
      .upsert({
        user_id: user.id,
        provider,
        refresh_token: tokenData.refresh_token,
        config_id,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: "user_id,provider" 
      });

    if (upsertError) {
      console.error("❌ Erro ao salvar credenciais:", upsertError);
      return new Response(JSON.stringify({
        success: false,
        error: "save_failed",
        error_description: "Erro ao salvar refresh_token"
      }), {
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Token gerado com sucesso", {
      provider,
      user_id: user.id,
      refresh_token_preview: tokenData.refresh_token.slice(0, 10) + "..."
    });

    return new Response(JSON.stringify({
      success: true,
      refresh_token: tokenData.refresh_token,
    }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("💥 Exceção na exchange-oauth-code:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "exception",
      error_description: "Erro inesperado no servidor",
      message: String(err)
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
