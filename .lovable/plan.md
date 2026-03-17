

# Padronizar Injeção de Tracking em Todos os Geradores HTML

## Problemas Identificados

1. **`enabled: false` no banco** — Todos os pixels estão desativados em `company_profile.tracking_pixels`. Nenhum gerador injeta nada.
2. **3 implementações diferentes de injeção** — O shared `_shared/tracking-injector.ts` é usado por 5 geradores, mas `publish-git-kinghost` e `publish-ftp-pages` têm funções **inline próprias** com formatos de campo diferentes (`gtm_id` vs `google_tag_manager.container_id`).
3. **Sem campo `enable_fallback_pixels`** — Não existe flag para controlar fallback de Meta/TikTok separadamente do GTM.
4. **Sem comentário de debug** no HTML gerado.
5. **TikTok pixel_id está `null`** no banco — precisa ser `D05CI83C77UE5QUU9FR0`.
6. **Frontend `src/lib/tracking-injector.ts`** tem sua própria implementação separada (não compartilhada com edge functions).

## Plano de Implementação

### 1. Atualizar `company_profile.tracking_pixels` no banco (UPDATE via insert tool)

```json
{
  "google_tag_manager": { "enabled": true, "container_id": "GTM-NZ64Q899" },
  "google_analytics": { "enabled": false, "measurement_id": "G-59WWJQN34P", "note": "Gerenciado via GTM" },
  "meta_pixel": { "enabled": false, "pixel_id": "167413567155597", "note": "Fallback - controlado por enable_fallback_pixels" },
  "tiktok_pixel": { "enabled": false, "pixel_id": "D05CI83C77UE5QUU9FR0", "note": "Fallback - controlado por enable_fallback_pixels" },
  "enable_fallback_pixels": false
}
```

- GTM `enabled: true` (sempre injetado)
- Meta e TikTok `enabled: false` mas com IDs preenchidos — ativados apenas quando `enable_fallback_pixels: true`

### 2. Reescrever `_shared/tracking-injector.ts` (o módulo central)

Nova lógica:
- **GTM sempre** se `container_id` presente (hardcode `GTM-NZ64Q899` como validação — rejeitar `GTM-MNPGDCH`)
- **GA4 nunca** quando GTM ativo (já está correto)
- **Meta + TikTok** apenas quando `enable_fallback_pixels === true` E pixel IDs preenchidos
- Nova função `generateTrackingDebugComment(generatorName, domain)` → comentário HTML de debug
- Nova função `generateFullTrackingBlock(trackingPixels, generatorName, domain)` → retorna `{ headScripts, bodyNoscript, debugComment }`

### 3. Atualizar os 5 geradores que usam o shared module

Cada gerador passa a chamar a nova API simplificada. Arquivos:
- `supabase/functions/generate-ecommerce-html/index.ts`
- `supabase/functions/generate-spin-landing-page/generateHTML.ts`
- `supabase/functions/publish-blog-post/index.ts`
- `supabase/functions/clone-landing-page/index.ts`
- `supabase/functions/_shared/product-blog-html-v2.ts`

Mudança: adicionar `debugComment` no topo do HTML e garantir noscript após `<body>`.

### 4. Eliminar funções inline duplicadas em publishers

- **`publish-git-kinghost/index.ts`** (linhas 41-86): Remover `injectTrackingPixels()` inline, importar do `_shared/tracking-injector.ts` e usar `injectTrackingIntoHTML()`
- **`publish-ftp-pages/index.ts`** (linhas 186-227): Idem — remover inline, importar shared

### 5. Atualizar frontend `src/lib/tracking-injector.ts`

Alinhar com a mesma lógica: respeitar `enable_fallback_pixels`, bloquear `GTM-MNPGDCH`, adicionar debug comment.

### 6. Deploy das edge functions alteradas

Deploy de: `generate-ecommerce-html`, `generate-spin-landing-page`, `publish-blog-post`, `clone-landing-page`, `publish-git-kinghost`, `publish-ftp-pages`

## Resumo de Arquivos a Editar

| Arquivo | Ação |
|---------|------|
| `company_profile.tracking_pixels` (DB) | UPDATE: ativar GTM, preencher TikTok ID, adicionar `enable_fallback_pixels` |
| `supabase/functions/_shared/tracking-injector.ts` | Reescrever: nova API, fallback flag, debug comment, blocklist GTM-MNPGDCH |
| `supabase/functions/generate-ecommerce-html/index.ts` | Adaptar ao novo API do injector + debug comment |
| `supabase/functions/generate-spin-landing-page/generateHTML.ts` | Idem |
| `supabase/functions/publish-blog-post/index.ts` | Idem |
| `supabase/functions/clone-landing-page/index.ts` | Idem |
| `supabase/functions/_shared/product-blog-html-v2.ts` | Idem |
| `supabase/functions/publish-git-kinghost/index.ts` | Remover inline, usar shared |
| `supabase/functions/publish-ftp-pages/index.ts` | Remover inline, usar shared |
| `src/lib/tracking-injector.ts` | Alinhar com nova lógica |

