import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

// Deep merge utility for JSON-like objects
function isObject(item: any) {
  return item && typeof item === "object" && !Array.isArray(item);
}

function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
  const output = { ...target } as T;
  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source)) {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }
  return output;
}

interface SavePayload {
  id: string;
  overwrite?: boolean;
  updates: {
    name?: string;
    status?: string;
    template?: string;
    data?: Record<string, any> | null;
    selected_product_ids?: string[] | null;
    embed?: string | null;
    blog_generated?: boolean | null;
    blog_generated_at?: string | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!anonKey || !serviceRoleKey || !supabaseUrl) {
      console.error("Missing Supabase env vars");
      return new Response(
        JSON.stringify({ ok: false, error: "Server misconfiguration" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth error or no user:", userError);
      return new Response(
        JSON.stringify({ ok: false, error: "Não autenticado" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = (await req.json()) as SavePayload;
    if (!body?.id || !body?.updates || typeof body.updates !== "object") {
      return new Response(
        JSON.stringify({ ok: false, error: "Payload inválido" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const id = body.id;
    const updates = body.updates;
    const overwrite = body.overwrite === true;

    console.log("[save-landing-page] Incoming:", {
      id,
      updateKeys: Object.keys(updates),
      userId: user.id,
      overwrite,
    });

    // Fetch current LP to get owner and data for merge
    const { data: lp, error: lpErr } = await serviceClient
      .from("landing_pages")
      .select("id, user_id, data")
      .eq("id", id)
      .maybeSingle();

    if (lpErr || !lp) {
      console.error("LP not found or error:", lpErr);
      return new Response(
        JSON.stringify({ ok: false, error: "Landing page não encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesErr } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesErr) {
      console.error("Error fetching roles:", rolesErr);
    }

    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    const isOwner = lp.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ ok: false, error: "Sem permissão para salvar" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Build update object
    const currentData = (lp.data && typeof lp.data === "object") ? lp.data : {};
    const incomingData = updates.data && typeof updates.data === "object" ? updates.data : undefined;

    // Se overwrite = true, substituir integralmente; senão, fazer merge
    const finalData = overwrite ? incomingData : (incomingData ? deepMerge(currentData, incomingData) : undefined);

    const updatePayload: Record<string, any> = {
      last_modified: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (typeof updates.name !== "undefined") updatePayload.name = updates.name;
    if (typeof updates.status !== "undefined") updatePayload.status = updates.status;
    if (typeof updates.template !== "undefined") updatePayload.template = updates.template;
    if (typeof updates.embed !== "undefined") updatePayload.embed = updates.embed;
    if (typeof updates.blog_generated !== "undefined") updatePayload.blog_generated = updates.blog_generated;
    if (typeof updates.blog_generated_at !== "undefined") updatePayload.blog_generated_at = updates.blog_generated_at;
    if (typeof updates.selected_product_ids !== "undefined") updatePayload.selected_product_ids = updates.selected_product_ids;
    if (typeof finalData !== "undefined") updatePayload.data = finalData;

    console.log("[save-landing-page] Update payload keys:", Object.keys(updatePayload));

    const { data: updated, error: updErr } = await serviceClient
      .from("landing_pages")
      .update(updatePayload)
      .eq("id", id)
      .select("id, updated_at")
      .maybeSingle();

    if (updErr || !updated) {
      console.error("Update failed:", updErr);
      return new Response(
        JSON.stringify({ ok: false, error: updErr?.message || "Falha ao atualizar" }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, updated_at: updated.updated_at }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e: any) {
    console.error("[save-landing-page] Exception:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Erro inesperado" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
