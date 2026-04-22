

## Diagnóstico do upload de vídeo no carrossel do produto

### O que eu já confirmei (read-only)

| Item | Status |
|---|---|
| Bucket `product-images` | Existe, público |
| `file_size_limit` do bucket | **NÃO definido** → cai no teto global do projeto Supabase (default 50 MB) |
| `allowed_mime_types` | **NÃO definido** → aceita qualquer tipo |
| Policies RLS | OK (autenticado pode INSERT, há ainda uma policy redundante exigindo admin) |
| Uploads recentes do seu produto | **3 vídeos MP4 de 2 MB gravados hoje entre 23:11 e 23:14** — ou seja, o pipeline funciona |
| Vídeos maiores (25 MB) | Subiram normal mais cedo (22:32, 22:46, 22:49, 22:56, 23:04) |

Componente envolvido: `src/components/EngagementCarouselPreview.tsx` → `src/components/EngagementCarouselSection.tsx` (`handleImageFileUpload`, linha 182). Upload vai para `product-images/engagement-carousel/<productId>/slide_<n>_video_<ts>.<ext>`.

### Hipóteses por ordem de probabilidade

**1. Arquivo acima do limite** (mais provável): vídeo > 50 MB bate no teto global do Supabase e o upload é rejeitado silenciosamente; o toast de erro aparece muito rápido e depois a UI volta ao estado anterior.

**2. `videoSrc` blob expirado após reload**: o componente prioriza `videoSrc` (blob URL local) sobre `videoStorageUrl`. Se você recarregou a página, o blob morre, mas o `videoStorageUrl` salvo no DB deveria assumir. Se está vendo "vídeo sumiu" em vez de "upload falha", é isso.

**3. Sessão expirada**: RLS exige `auth.role() = 'authenticated'`. Se o token expirou, INSERT é bloqueado com erro de policy.

**4. Toast de erro escondido**: o `toast` de erro é mostrado uma única vez e fica em uma região do canto que pode estar coberta pelo editor expandido.

### O que precisa ser corrigido (Fase 1)

Independentemente de qual hipótese seja, há 4 melhorias que resolvem o problema raiz e previnem recorrência:

1. **Aumentar/definir `file_size_limit` do bucket** explicitamente para 100 MB (vídeos de produto comumente passam de 50). Migration:
   ```sql
   UPDATE storage.buckets
   SET file_size_limit = 104857600,           -- 100 MB
       allowed_mime_types = ARRAY[
         'image/png','image/jpeg','image/webp','image/gif',
         'video/mp4','video/quicktime','video/webm','video/x-m4v'
       ]
   WHERE id = 'product-images';
   ```
2. **Validação client-side antes do upload** em `handleImageFileUpload`: checar `file.size > 100MB` e mostrar toast claro com tamanho real do arquivo (`"O arquivo tem 78 MB, limite 100 MB"`). Hoje não há nenhuma validação prévia.
3. **Logs estruturados na falha**: adicionar `console.error('[CAROUSEL_VIDEO_UPLOAD_FAIL]', { slideNum, fileSize, fileType, error })` e tornar o toast persistente (`duration: 8000`) para o usuário ver.
4. **Limpar policy duplicada**: remover `Admins can upload product images` e `Admins can delete product images` (redundantes com as `Authenticated *`). Não é causa do bug, mas está poluindo o RLS.
5. **Bonus — corrigir prioridade de fonte do vídeo**: em `resolveVideoSource()`, preferir `videoStorageUrl` quando ele existe e é HTTPS, usando `videoSrc` (blob) só como fallback otimista durante o upload em curso. Isso evita o "vídeo sumiu após reload".

### Perguntas que vou fazer antes de mexer (Fase 0)

Para escolher exatamente entre as 4 hipóteses e não corrigir o que não está quebrado:

- Que tamanho tem o arquivo que você tentou agora?
- Aparece algum toast vermelho de erro ao clicar em Upload?
- Em qual slide (1 a 6)? Acontece em todos ou só em um específico?
- O vídeo aparece por um instante e some, ou nem chega a aparecer?

### Sobre o build error do Cloudflare R2

O erro `dist upload failed: ... R2 temp-access-credentials ... Client.Timeout` é da infra de deploy do Lovable falando com a Cloudflare na hora de subir o `dist/` — **não é do seu código**, não tem relação com o upload de vídeo (que vai pelo Supabase Storage, não pela R2). Reexecutar o build resolve. Se persistir em vários builds seguidos, é incidente do lado Lovable/Cloudflare.

### Ordem de execução depois da aprovação

```text
FASE 0 — perguntar ao usuário (4 perguntas curtas)
   └─ confirmar hipótese principal

FASE 1 — fix mínimo (sempre aplicar)
   ├─ Migration: file_size_limit + allowed_mime_types em product-images
   ├─ Migration: drop policies "Admins can upload/delete product images" (redundantes)
   ├─ EngagementCarouselSection.tsx: validação de tamanho + tipo + log + toast persistente
   └─ EngagementCarouselPreview.tsx: resolveVideoSource prioriza URL persistida

FASE 2 — só se hipótese 3 (sessão) for confirmada
   └─ adicionar verificação de session ativa antes do upload com refresh automático
```

### Arquivos que serão alterados

- Migration nova (storage.buckets + drop policies)
- `src/components/EngagementCarouselSection.tsx` (validação + logs)
- `src/components/EngagementCarouselPreview.tsx` (`resolveVideoSource`)

### Risco

Aumentar `file_size_limit` para 100 MB pode aumentar consumo de Storage. Mitigação: já estamos usando `upsert: true` então re-uploads no mesmo slide sobrescrevem em vez de acumular.

