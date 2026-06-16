import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase ISOLADO apontando para o Sistema B (okeogjgqijbfkudfjadz).
 * Uso restrito: upload de mídia carrossel ao bucket `wa-media`.
 * NÃO usar para queries de tabelas — System B é read-only/imutável.
 */
const SISTEMA_B_URL = import.meta.env.VITE_SISTEMA_B_SUPABASE_URL as string;
const SISTEMA_B_ANON = import.meta.env.VITE_SISTEMA_B_SUPABASE_ANON_KEY as string;

// Diagnóstico em runtime — confirma se as envs chegaram ao build do Lovable
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log("[SISTEMA_B] URL:", SISTEMA_B_URL || "(vazio)");
  // eslint-disable-next-line no-console
  console.log("[SISTEMA_B] Anon key presente:", !!SISTEMA_B_ANON, "len:", SISTEMA_B_ANON?.length || 0);
  if (!SISTEMA_B_URL || !SISTEMA_B_ANON) {
    // eslint-disable-next-line no-console
    console.error(
      "[SISTEMA_B] Envs ausentes. Configure VITE_SISTEMA_B_SUPABASE_URL e VITE_SISTEMA_B_SUPABASE_ANON_KEY em Settings → Environment Variables do Lovable.",
    );
  }
}

export const sistemaBClient = createClient(SISTEMA_B_URL, SISTEMA_B_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      apikey: SISTEMA_B_ANON,
      Authorization: `Bearer ${SISTEMA_B_ANON}`,
    },
  },
});

export const SISTEMA_B_APP_URL = import.meta.env.VITE_SISTEMA_B_URL as string;
export const SISTEMA_B_ANON_KEY = SISTEMA_B_ANON;
export const SISTEMA_B_SUPABASE_URL = SISTEMA_B_URL;
