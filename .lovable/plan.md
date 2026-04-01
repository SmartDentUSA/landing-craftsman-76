

## Implementação: 4 Edge Functions + Aba "Google APIs"

### Pré-requisitos: Secrets faltantes

Os seguintes secrets **não existem** e precisam ser adicionados:
- `GOOGLE_BUSINESS_ACCOUNT_ID` — ID da conta Google Business
- `GOOGLE_BUSINESS_LOCATION_ID` — ID do local GBP

O `GOOGLE_AI_API_KEY` já existe e será usado para chamadas Gemini (em vez de `GEMINI_API_KEY` mencionado na spec — o projeto já usa `GOOGLE_AI_API_KEY` para a API Generative Language do Google).

### Arquivo compartilhado

**Criar `supabase/functions/_shared/google-auth.ts`**
- Helper `getValidGoogleToken(supabase, scope)` conforme especificado
- Busca token em `google_oauth_tokens`, verifica expiração, chama `refresh-google-token` se necessário

### Edge Function 1: `respond-review-ai`
**Arquivo:** `supabase/functions/respond-review-ai/index.ts`

- `mode='generate'`: busca reviews sem resposta, gera via Gemini (`gemini-1.5-flash` via `GOOGLE_AI_API_KEY`), insere em `review_responses` com `status='pending'`
- `mode='post'`: busca `review_responses` pendentes, posta via Google Business API usando `getValidGoogleToken`, atualiza status
- `mode='batch'`: executa generate + post em sequência
- CORS padrão, `createClient` com `SUPABASE_SERVICE_ROLE_KEY`

### Edge Function 2: `publish-gbp-post`
**Arquivo:** `supabase/functions/publish-gbp-post/index.ts`

- Recebe dados do post (summary, tipo, CTA, imagem, agendamento)
- Se `schedule_for` futuro: insere em `gbp_posts_log` com `status='scheduled'`
- Caso contrário: publica via Google Business API, salva resultado em `gbp_posts_log`

### Edge Function 3: `update-youtube-metadata`
**Arquivo:** `supabase/functions/update-youtube-metadata/index.ts`

- `mode='generate'`: busca fila pendente, gera metadados via Gemini, salva sugestões
- `mode='update'`: busca aprovados, aplica via YouTube Data API v3 usando `getValidGoogleToken('youtube')`
- `mode='both'`: generate + update em sequência

### Edge Function 4: `generate-local-seo-page`
**Arquivo:** `supabase/functions/generate-local-seo-page/index.ts`

- Busca targets aprovados sem HTML gerado
- Busca produtos relacionados, company_profile, top reviews
- Gera HTML via Gemini
- Atualiza `local_seo_targets` com HTML e status

### Frontend: Nova aba "Google APIs"

**Criar `src/components/repository/GoogleApisTab.tsx`**

Componente com 4 cards (Accordion ou seções verticais):

1. **Respostas de Reviews** — tabela com JOIN `raw_reviews` + `review_responses`, botões "Gerar Respostas" e "Postar Pendentes", edição inline
2. **Posts GBP** — formulário de novo post + tabela histórico de `gbp_posts_log`
3. **Fila YouTube** — tabela `youtube_metadata_queue`, botões gerar/aplicar, modal diff, adicionar vídeo manual
4. **SEO Local** — tabela `local_seo_targets` com filtros UF/Status, botões gerar, modal preview iframe, modal adicionar target

Usa `useQuery` para fetch, `useMutation` para ações, `useToast` para feedback, loading states em botões.

**Modificar `src/pages/Repository.tsx`**
- Adicionar `'google-apis'` ao union type do `activeView`
- Importar `GoogleApisTab`
- Adicionar `TabsTrigger` e `TabsContent` na lista existente (não remover nada)

### Arquivos criados/modificados

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/google-auth.ts` | Criar |
| `supabase/functions/respond-review-ai/index.ts` | Criar |
| `supabase/functions/publish-gbp-post/index.ts` | Criar |
| `supabase/functions/update-youtube-metadata/index.ts` | Criar |
| `supabase/functions/generate-local-seo-page/index.ts` | Criar |
| `src/components/repository/GoogleApisTab.tsx` | Criar |
| `src/pages/Repository.tsx` | Editar (adicionar aba) |

Nenhuma tabela existente será alterada. Nenhuma edge function existente será modificada.

