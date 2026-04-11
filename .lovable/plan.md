

## Plano: Credenciais de Autores Verificadas e Perfil Institucional E-E-A-T

### Contexto
O projeto gera HTML via edge functions (Supabase) para landing pages, blogs e SPIN pages. O sistema de Person Schema atual (`supabase/functions/_shared/person-schema-helper.ts`) busca dados de KOLs do banco (`key_opinion_leaders`), com campos limitados. Os autores verificados (Weber Ricci, Marcelo Del Guerra, Marcelo Cestari) e o perfil institucional Smart Dent precisam ser integrados como dados estáticos de alta fidelidade para E-E-A-T.

### O que sera feito

**1. Criar `src/data/authors.ts`**
- Todos os 4 registros conforme fornecido: WEBER_RICCI, MARCELO_DEL_GUERRA, MARCELO_CESTARI, SMART_DENT_TEAM
- Incluir VITALITY_PRODUCT com dados verificados
- Export consolidado AUTHORS

**2. Criar `src/lib/authorSchemas.ts`**
- `generatePersonSchema(author)` — JSON-LD completo com identifiers, sameAs, alumniOf, worksFor
- `generateOrganizationSchema()` — Smart Dent com ambos fundadores
- `generateVitalityProductSchema()` — MedicalDevice schema
- `getArticleSchemas(authorId)` — retorna array de schemas por autor (usando imports diretos, sem require)

**3. Criar `src/components/AuthorCard.tsx`**
- Componente React/Tailwind com variantes "mini" e "full"
- Badges coloridos por tipo de identificador acadêmico (ORCID, Scopus, Lattes, etc.)
- Links sociais e acadêmicos

**4. Expandir `supabase/functions/_shared/person-schema-helper.ts`**
- Adicionar campos ao `PersonSchemaData`: `orcid`, `scopusId`, `googleScholarId`, `fapespId`, `dimensionsUrl`, `identifier[]`
- Atualizar `generatePersonSchema()` para incluir `identifier` (PropertyValue) e expandir `sameAs` com ORCID, Scopus, Dimensions, Google Scholar
- Isso faz com que blogs e landing pages geradas pelas edge functions tambem emitam schemas enriquecidos quando o KOL tiver esses campos no banco

**5. Atualizar geradores de HTML nas edge functions**
- Em `publish-blog-post/index.ts`, `clone-landing-page/index.ts` e `generate-spin-landing-page/generateHTML.ts`: quando o autor for um dos autores verificados (por ID), usar os dados estáticos completos de `authors.ts` em vez de apenas os dados do banco
- Nota: como as edge functions rodam no Deno (Supabase), os dados dos autores verificados serao duplicados num arquivo `_shared/verified-authors.ts` compatível com Deno (sem path aliases `@/`)

**6. Injetar Organization Schema globalmente**
- Atualizar `seo-fine-tuning.ts` para exportar uma funcao `generateSmartDentOrganizationSchema()` com o schema completo (ambos fundadores, Wikidata, foundingLocation NUMA/USP)
- Os geradores de HTML que ja usam `seo-fine-tuning.ts` passarao a incluir o Organization schema no `@graph`

### Arquivos criados
- `src/data/authors.ts`
- `src/lib/authorSchemas.ts`
- `src/components/AuthorCard.tsx`
- `supabase/functions/_shared/verified-authors.ts`

### Arquivos editados
- `supabase/functions/_shared/person-schema-helper.ts` (expandir interface e schema)
- `supabase/functions/_shared/seo-fine-tuning.ts` (Organization schema global)
- `supabase/functions/publish-blog-post/index.ts` (usar autores verificados)
- `supabase/functions/clone-landing-page/index.ts` (usar autores verificados)
- `supabase/functions/generate-spin-landing-page/generateHTML.ts` (usar autores verificados)

### Detalhes tecnicos
- Edge functions usam Deno — o arquivo `verified-authors.ts` sera independente (sem path aliases)
- O `AuthorCard` usa Tailwind + shadcn/ui Badge, sem dependencias externas
- A funcao `getArticleSchemas` usara imports estaticos (nao `require`) para compatibilidade ESM
- Os IDs dos autores verificados serao usados como chave de lookup nos geradores

