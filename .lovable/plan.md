

## Plano: Integrar autores verificados e Organization Schema em TODOS os geradores de HTML

### Auditoria realizada

**Geradores que JA usam `verified-authors.ts`** (3/8):
- `publish-blog-post` — OK
- `clone-landing-page` — OK
- `generate-spin-landing-page` — OK

**Geradores que NAO usam `verified-authors.ts`** (5/8):
- `generate-ecommerce-html` — sem verified authors, sem Organization schema completo
- `publish-product-blog-cloudflare` — sem verified authors, sem Organization schema completo
- `generate-local-seo-page` — sem verified authors, sem Organization schema completo
- `process-content-submission` — usa Organization generico do banco, sem verified authors
- `republish-domain-pages` — sem nenhum import de SEO/schema

**Frontend `template-engine.ts`** — usa `advancedSchemaEnhancer` para Organization (dados do banco), mas nao usa os autores verificados estaticos nem o Organization enriquecido com fundadores/Wikidata/NUMA

**Duplicacao**: `generateSmartDentOrganizationSchema()` existe tanto em `verified-authors.ts` quanto em `seo-fine-tuning.ts` (identicas) — consolidar em `seo-fine-tuning.ts` como fonte unica

### O que sera feito

**1. Consolidar Organization Schema**
- Remover `generateSmartDentOrganizationSchema` de `verified-authors.ts`
- Manter apenas em `seo-fine-tuning.ts` (ja importado por todos)
- Enriquecer com enderecos USA, `hasCredential` (FDA, ANVISA, ISO), `knowsAbout` expandido e `Smart Print Bio Vitality` (Wikidata Q138790136)
- Atualizar imports em `clone-landing-page` e `generate-spin-landing-page` que importavam de `verified-authors.ts`

**2. Integrar verified authors nos 5 geradores faltantes**
- `generate-ecommerce-html/index.ts` — importar `getVerifiedAuthor`, `generateVerifiedPersonSchema` e `generateSmartDentOrganizationSchema`; injetar no `@graph` quando KOL for autor verificado
- `publish-product-blog-cloudflare/index.ts` — idem; na funcao `generateProductBlogHTML`, injetar Person schema verificado quando `author_kol_id` corresponder
- `generate-local-seo-page/index.ts` — importar e injetar Organization schema completo no `@graph`
- `process-content-submission/index.ts` — substituir Organization generico pelo schema completo
- `republish-domain-pages` — se gera HTML, adicionar imports (verificar se apenas re-publica HTML existente)

**3. Enriquecer template-engine.ts (frontend)**
- Importar `AUTHORS` de `src/data/authors.ts` e `generateOrganizationSchema` de `src/lib/authorSchemas.ts`
- Na secao de Person Schema do fundador (linha ~4662), verificar se o `founder_name` do company profile corresponde a um autor verificado e usar os dados completos (identifiers, sameAs, ORCID, etc.)
- Adicionar Organization schema enriquecido (com fundadores, Wikidata, NUMA) como fallback quando `advancedSchemaEnhancer` nao estiver disponivel

**4. Adicionar informacoes institucionais completas ao company_profile**
- Verificar se o `company_profile` no banco tem os campos: `wikidata_id`, `founder_linkedin`, `founder_name`, `founder_title` preenchidos com os dados verificados
- Se ausentes, criar migration para atualizar o registro unico com:
  - `wikidata_id`: "Q138636902"
  - `founder_name`: "Dr. Marcelo Del Guerra"
  - `founder_title`: "PhD Engenharia de Producao Mecanica, EESC/USP · Fundador Smart Dent"
  - `founder_linkedin`: "https://br.linkedin.com/in/marcelo-del-guerra-70193166"

### Arquivos editados
- `supabase/functions/_shared/verified-authors.ts` (remover Organization duplicado)
- `supabase/functions/_shared/seo-fine-tuning.ts` (enriquecer Organization com FDA, ANVISA, enderecos)
- `supabase/functions/generate-ecommerce-html/index.ts` (adicionar verified authors + Org schema)
- `supabase/functions/publish-product-blog-cloudflare/index.ts` (adicionar verified authors + Org schema)
- `supabase/functions/generate-local-seo-page/index.ts` (adicionar Org schema completo)
- `supabase/functions/process-content-submission/index.ts` (substituir Org generico)
- `supabase/functions/clone-landing-page/index.ts` (atualizar import de Org schema)
- `supabase/functions/generate-spin-landing-page/generateHTML.ts` (atualizar import de Org schema)
- `src/lib/template-engine.ts` (usar autores verificados no Person schema do fundador)
- Migration SQL (atualizar company_profile com dados verificados)

### Resultado
Todos os 8 geradores de HTML + o template engine frontend emitirao:
1. Organization Schema completo (fundadores, Wikidata, NUMA, FDA, ANVISA)
2. Person Schema verificado para Weber Ricci, Marcelo Del Guerra e Marcelo Cestari quando aplicavel
3. Dados institucionais consistentes entre todos os canais

