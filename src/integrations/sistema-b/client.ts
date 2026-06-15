import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase ISOLADO apontando para o Sistema B (okeogjgqijbfkudfjadz).
 * Uso restrito: upload de mídia carrossel ao bucket `wa-media`.
 * NÃO usar para queries de tabelas — System B é read-only/imutável.
 */
const SISTEMA_B_URL = import.meta.env.VITE_SISTEMA_B_SUPABASE_URL as string;
const SISTEMA_B_ANON = import.meta.env.VITE_SISTEMA_B_SUPABASE_ANON_KEY as string;

export const sistemaBClient = createClient(SISTEMA_B_URL, SISTEMA_B_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const SISTEMA_B_APP_URL = import.meta.env.VITE_SISTEMA_B_URL as string;
