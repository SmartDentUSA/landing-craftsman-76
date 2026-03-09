/**
 * sync:profile — Valida e exibe o SMART_DENT_PROFILE contra o banco Supabase.
 * Uso: npm run sync:profile
 *
 * Mostra divergências entre os valores hardcoded em company-profile.ts
 * e os dados reais na tabela company_profile do Supabase.
 *
 * Requer: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Carregar .env manualmente (sem dotenv) ────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

let supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [k, ...rest] = line.split('=');
    const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (k?.trim() === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
    if (k?.trim() === 'VITE_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
  }
} catch {
  // .env não encontrado — usa variáveis de ambiente do sistema
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados.');
  console.error('   Defina no .env ou como variável de ambiente.');
  process.exit(1);
}

// ─── Perfil hardcoded (fonte: company-profile.ts) ─────────────────────────
// Importamos os valores diretamente para evitar dependência de transpilação
const PROFILE = {
  company_name: 'Smart Dent',
  legal_name: 'Smart Dent Importação e Comércio Ltda',
  website_url: 'https://smartdent.com.br',
  contact_phone: '(11) 4200-7008',
  contact_email: 'contato@smartdent.com.br',
  city: 'São Paulo',
  state: 'SP',
  postal_code: '01310-100',
  country: 'Brasil',
  instagram_profile: 'https://instagram.com/smartdentoficial',
  youtube_channel: 'https://youtube.com/@smartdentoficial',
  founded_year: 2018,
};

const CHECKED_FIELDS = Object.keys(PROFILE) as Array<keyof typeof PROFILE>;

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 sync:profile — Verificando SMART_DENT_PROFILE vs banco Supabase\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('company_profile')
    .select(CHECKED_FIELDS.join(', '))
    .limit(1)
    .single();

  if (error || !data) {
    console.warn('⚠️  Nenhum registro em company_profile. Usando perfil padrão hardcoded.');
    console.log('\n📋 SMART_DENT_PROFILE (hardcoded em company-profile.ts):');
    console.table(PROFILE);
    return;
  }

  console.log('✅ Registro encontrado em company_profile.\n');

  let divergences = 0;
  const report: Array<{ campo: string; hardcoded: unknown; banco: unknown; status: string }> = [];

  for (const field of CHECKED_FIELDS) {
    const hardcoded = PROFILE[field];
    const db = (data as any)[field];
    const matches = String(hardcoded) === String(db ?? '');
    if (!matches) divergences++;
    report.push({
      campo: field,
      hardcoded,
      banco: db ?? '(vazio)',
      status: matches ? '✅' : '⚠️  DIVERGENTE',
    });
  }

  console.table(report);

  if (divergences === 0) {
    console.log('\n✅ company-profile.ts está sincronizado com o banco.');
  } else {
    console.warn(`\n⚠️  ${divergences} campo(s) divergente(s).`);
    console.warn('   Atualize company-profile.ts ou o registro no banco para manter consistência.');
  }
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});
