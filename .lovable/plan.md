

## Clinical Brain Guard Global — Implementação Completa

### Resumo
Criar 2 arquivos _shared novos e integrar o guard anti-alucinação em 8 edge functions existentes, substituindo prompts inline por prompts centralizados com proteção clínica.

### Escopo e Ordem de Execução

**PASSO 1 — Criar `supabase/functions/_shared/clinical-brain-guard.ts`**
Arquivo novo com interfaces `ProductContext`, `CompanyContext`, e funções:
- `formatProductSpecs()`, `formatImpactMetrics()`, `formatForbiddenProducts()`, `formatRequiredProducts()`
- `buildProductBaseContext()` — contexto empresa + produto formatado
- `injectClinicalBrainGuard()` — bloco anti-alucinação com regras obrigatórias
- `buildFullPrompt()` — composição final: guard + contexto + prompt template

Conteúdo exato conforme especificado na tarefa.

**PASSO 2 — Criar `supabase/functions/_shared/prompt-templates.ts`**
Arquivo novo com objeto `PROMPTS` contendo ~30 templates organizados por canal:
- `PROMPTS.keywords` — primary, long_tail, negative
- `PROMPTS.google_ads` — rsa_headlines, rsa_descriptions, ad_groups, pmax_assets
- `PROMPTS.instagram` — feed_storytelling, feed_benefits, feed_problem_solution, feed_urgency
- `PROMPTS.reels.script`, `PROMPTS.tiktok.script`
- `PROMPTS.youtube` — title, description, tags, chapters
- `PROMPTS.whatsapp` — product_message, video_message, sequence_d0/d2/d5
- `PROMPTS.gbp.post`, `PROMPTS.linkedin.post`
- `PROMPTS.blog` — video_intro, commercial, technical
- `PROMPTS.spin.campaign`, `PROMPTS.ecommerce.specs_block`

Cada template usa placeholders como `{product.name}` que serão substituídos pelo `buildFullPrompt()`.

**PASSO 3 — Fix `generate-social-content/index.ts` (Bug WhatsApp)**
- Buscar interpolações de `impact_metrics` em strings (pesquisa mostrou que NÃO há referência direta neste arquivo, mas o bug vem do `processPromptVariables` que interpola `product.features` etc. sem tratar objetos)
- Adicionar import de `buildFullPrompt` e `PROMPTS`
- Substituir os prompts default de WhatsApp, YouTube e Instagram pelos templates centralizados
- Manter a lógica de `processPromptVariables` e `generateWithDualAI` existente, apenas trocando os templates

**PASSO 4 — Integrar em `generate-product-ai-content/index.ts`**
- Importar `buildFullPrompt` e `PROMPTS`
- Substituir prompts de keywords (primary, long_tail) pelos novos templates
- Adicionar suporte a keywords negativas

**PASSO 5 — Atualizar `generate-ad-copies/index.ts`**
- Importar guard e templates
- Substituir o mega-prompt inline (~100 linhas) por `buildFullPrompt(product, PROMPTS.google_ads.rsa_headlines)` etc.
- Manter a lógica de validação programática existente (`validateAndEnhanceCopies`)

**PASSO 6 — Integrar nos demais geradores**
Cada arquivo recebe import + substituição do prompt:

| Edge Function | Prompt Template |
|---|---|
| `generate-tiktok-content` | `PROMPTS.tiktok.script` |
| `publish-gbp-post` | `PROMPTS.gbp.post` (modo generate) |
| `generate-spin-campaign` | `PROMPTS.spin.campaign` |
| `generate-ecommerce-html` | `PROMPTS.ecommerce.specs_block` |
| `generate-instagram-reels-script` | `PROMPTS.reels.script` |
| `generate-product-blog` | `PROMPTS.blog.commercial` / `technical` |

**PASSO 7 — Deploy**
Deploy de todas as edge functions modificadas em sequência.

### Notas Técnicas

- **Nenhuma tabela alterada**. Nenhuma edge function nova criada (apenas 2 _shared novos + edição de 8 existentes).
- O `buildFullPrompt()` mapeia campos do banco (`product.*`) para a interface `ProductContext` dentro de cada edge function.
- As funções que já têm Clinical Brain parcial (`use_clinical_brain` flag) passarão a ter guard obrigatório sem flag.
- O arquivo `prompt-templates.ts` será extenso (~1500-2000 linhas) por conter todos os 30+ templates.
- **`generate-ecommerce-html`** é um arquivo de 2647 linhas — a edição será cirúrgica, apenas adicionando import e substituindo o bloco de prompt de specs.

### Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/clinical-brain-guard.ts` | **Criar** |
| `supabase/functions/_shared/prompt-templates.ts` | **Criar** |
| `supabase/functions/generate-social-content/index.ts` | Editar prompts |
| `supabase/functions/generate-product-ai-content/index.ts` | Editar prompts |
| `supabase/functions/generate-ad-copies/index.ts` | Editar prompts |
| `supabase/functions/generate-tiktok-content/index.ts` | Editar prompts |
| `supabase/functions/publish-gbp-post/index.ts` | Editar (add generate mode) |
| `supabase/functions/generate-spin-campaign/index.ts` | Editar prompts |
| `supabase/functions/generate-ecommerce-html/index.ts` | Editar prompts |
| `supabase/functions/generate-instagram-reels-script/index.ts` | Editar prompts |
| `supabase/functions/generate-product-blog/index.ts` | Editar prompts |

