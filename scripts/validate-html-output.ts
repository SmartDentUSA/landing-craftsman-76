/**
 * validate:html — Valida HTML gerado pelas Edge Functions.
 * Uso: npm run validate:html
 *
 * Verifica presença de blocos obrigatórios de SEO/E-E-A-T nos HTMLs
 * produzidos pelos geradores. Útil para CI/CD e revisão pós-deploy.
 *
 * Requer: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
 * Opcionalmente: VALIDATE_HTML_LANDING_PAGE_ID=<uuid>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Carregar .env manualmente ─────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

let supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const targetId = process.env.VALIDATE_HTML_LANDING_PAGE_ID ?? '';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [k, ...rest] = line.split('=');
    const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (k?.trim() === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
    if (k?.trim() === 'VITE_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
  }
} catch { /* .env não encontrado */ }

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados.');
  process.exit(1);
}

// ─── Regras de validação ───────────────────────────────────────────────────
interface ValidationRule {
  name: string;
  pattern: RegExp | string;
  required: boolean;
  description: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  // Schema.org obrigatórios
  { name: 'JSON-LD presente',         pattern: /<script[^>]+application\/ld\+json/i,    required: true,  description: 'Bloco JSON-LD de schema.org' },
  { name: 'Organization schema',      pattern: /"@type"\s*:\s*"Organization"/,           required: true,  description: 'Schema de organização (E-E-A-T)' },
  { name: 'WebPage schema',           pattern: /"@type"\s*:\s*"(WebPage|Article|BlogPosting)"/, required: false, description: 'Schema de página/artigo' },
  { name: 'BreadcrumbList',           pattern: /"@type"\s*:\s*"BreadcrumbList"/,         required: false, description: 'Schema de breadcrumbs' },

  // Meta tags obrigatórias
  { name: 'Meta description',         pattern: /<meta[^>]+name="description"/i,          required: true,  description: 'Meta description' },
  { name: 'OG:title',                 pattern: /<meta[^>]+property="og:title"/i,         required: true,  description: 'Open Graph title' },
  { name: 'OG:image',                 pattern: /<meta[^>]+property="og:image"/i,         required: false, description: 'Open Graph image' },
  { name: 'Canonical URL',            pattern: /<link[^>]+rel="canonical"/i,             required: true,  description: 'URL canônica' },

  // E-E-A-T e Authority
  { name: 'Authority context',        pattern: /authority-context|authority-data/i,      required: false, description: 'Bloco de autoridade (E-E-A-T)' },
  { name: 'AI Summary block',         pattern: /ai-summary-block|data-ai-summary/i,      required: false, description: 'Bloco de resumo para IAs' },
  { name: 'LLM Knowledge layer',      pattern: /llm-knowledge-layer|data-llm-knowledge/i, required: false, description: 'Camada de conhecimento para LLMs' },
  { name: 'Geo context',             pattern: /geo-context|GeoCoordinates/i,             required: false, description: 'Contexto geográfico' },

  // Performance
  { name: 'Viewport meta',            pattern: /<meta[^>]+name="viewport"/i,             required: true,  description: 'Meta viewport (mobile)' },
  { name: 'Lang attribute',           pattern: /<html[^>]+lang=/i,                       required: true,  description: 'Atributo lang no html' },
  { name: 'Title tag',                pattern: /<title>/i,                               required: true,  description: 'Tag <title>' },
];

// ─── Validar um HTML ───────────────────────────────────────────────────────
function validateHtml(html: string, source: string): { passed: number; failed: number; warnings: number } {
  console.log(`\n📄 Validando: ${source}`);
  let passed = 0, failed = 0, warnings = 0;

  for (const rule of VALIDATION_RULES) {
    const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
    const found = pattern.test(html);

    if (found) {
      console.log(`  ✅ ${rule.name}`);
      passed++;
    } else if (rule.required) {
      console.error(`  ❌ ${rule.name} — ${rule.description} (OBRIGATÓRIO)`);
      failed++;
    } else {
      console.warn(`  ⚠️  ${rule.name} — ${rule.description} (recomendado)`);
      warnings++;
    }
  }

  return { passed, failed, warnings };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 validate:html — Validando HTML gerado pelas Edge Functions\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Buscar landing pages com HTML gerado
  const query = supabase
    .from('landing_pages')
    .select('id, name, generated_html, blog_html')
    .not('generated_html', 'is', null)
    .limit(targetId ? 1 : 5);

  if (targetId) {
    query.eq('id', targetId);
  }

  const { data: pages, error } = await query;

  if (error) {
    console.error('❌ Erro ao buscar landing pages:', error.message);
    process.exit(1);
  }

  if (!pages || pages.length === 0) {
    console.warn('⚠️  Nenhuma landing page com HTML gerado encontrada.');
    console.info('   Execute uma geração de LP primeiro, depois rode npm run validate:html');
    process.exit(0);
  }

  let totalPassed = 0, totalFailed = 0, totalWarnings = 0;

  for (const page of pages) {
    const htmlSources = [
      { label: `LP "${page.name}" (generated_html)`, html: page.generated_html },
      { label: `LP "${page.name}" (blog_html)`, html: page.blog_html },
    ].filter((s) => s.html && s.html.length > 100);

    for (const { label, html } of htmlSources) {
      const { passed, failed, warnings } = validateHtml(html, label);
      totalPassed += passed;
      totalFailed += failed;
      totalWarnings += warnings;
    }
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log(`📊 Resultado final: ${totalPassed} ✅  ${totalFailed} ❌  ${totalWarnings} ⚠️`);

  if (totalFailed > 0) {
    console.error(`\n❌ ${totalFailed} regra(s) obrigatória(s) ausente(s). Revise os geradores de HTML.`);
    process.exit(1);
  } else {
    console.log('\n✅ Todas as regras obrigatórias passaram.');
  }
}

main().catch((err) => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});
