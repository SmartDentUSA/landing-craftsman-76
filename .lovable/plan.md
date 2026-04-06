

## Fix: Carrossel Engajamento nao persiste dados

### Causa raiz

Dois problemas criticos:

1. **Closures obsoletas nos saves com debounce**: `handleSlideTextChange` chama `persistData(updated, slideImageMap)` capturando o `slideImageMap` do momento da renderizacao — se imagens mudaram depois, o save antigo sobrescreve com dados velhos (e vice-versa para `handleImageChange` que captura `slideTexts` antigos).

2. **Imagens salvas como base64 gigante no JSONB**: Uploads de imagem sao convertidos para data URL (base64) e salvos dentro do campo `instagram_copies` JSONB. Um unico JPEG em base64 pode ter 1-5MB. Com 6 slides, isso ultrapassa limites praticos do Supabase para update de JSONB, causando falha silenciosa (sem tratamento de erro no retorno do `.update()`).

### Solucao

**1. Corrigir closures com useRef** (`EngagementCarouselSection.tsx`)
- Criar `slideTextsRef` e `slideImageMapRef` que sempre apontam para o estado atual
- `persistData` le dos refs em vez de receber parametros
- Debounce unico com `useRef<NodeJS.Timeout>` em vez de multiplos `setTimeout` soltos

**2. Upload de imagens para Supabase Storage** (`EngagementCarouselSection.tsx` + `EngagementCarouselPreview.tsx`)
- Ao fazer upload de imagem, enviar para bucket `product-images` (ja existe no projeto)
- Salvar a URL publica no `slideImageMap` em vez de base64
- Isso reduz o JSONB de megabytes para poucos bytes por slide
- Videos: salvar thumbnail no Storage tambem, manter blob URL apenas para preview local (nao persistir)

**3. Adicionar verificacao de erro no persist** (`EngagementCarouselSection.tsx`)
- Checar `error` no retorno do `.update()` do Supabase
- Mostrar toast de erro se o save falhar

### Alteracoes

| Arquivo | Acao |
|---|---|
| `src/components/EngagementCarouselSection.tsx` | Refs para estado atual, debounce unificado, upload de imagens para Storage, error handling no persist |
| `src/components/EngagementCarouselPreview.tsx` | `onImageChange` passa `File` ou `Blob` em vez de data URL; componente pai faz upload |

### Resultado esperado
- Salvar funciona de forma confiavel (JSONB leve, sem closures obsoletas)
- Imagens persistem entre sessoes via URLs do Storage
- Erros de save sao visiveis ao usuario

