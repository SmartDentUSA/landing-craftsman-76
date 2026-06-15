## Implementação — Botão "📤 Enviar SmartOps"

Anon key recebida. Pronto para implementar exatamente o que foi descrito anteriormente:

### 1. `.env` (append)
```
VITE_SISTEMA_B_URL="https://parametros.smartdent.com.br"
VITE_SISTEMA_B_SUPABASE_URL="https://okeogjgqijbfkudfjadz.supabase.co"
VITE_SISTEMA_B_SUPABASE_ANON_KEY="eyJhbGciOi...TsXS38TaVtk"
```

### 2. `src/integrations/sistema-b/client.ts` (novo)
Cliente Supabase isolado apontando para `okeogjgqijbfkudfjadz`, somente para Storage (bucket `wa-media`). Não toca no cliente principal.

### 3. `src/lib/smartops-upload.ts` (novo)
- `slugify(name)` — lowercase, sem acentos, espaços→hífen.
- `uploadCarouselToSmartOps({ slides, produtoSlug, tipo })` — gera `ref = carrosseis/{slug}/{uuid}`, faz upload sequencial `slide-{n}.png` em `wa-media`, retorna `{ ref, total }`.
- `buildSocialPublisherUrl({ ref, produtoSlug, tipo, total })` → `${VITE_SISTEMA_B_URL}/ferramentas/social-publisher/criar?source=carrossel&ref=...&produto=...&tipo=...&total=...`.

### 4. `src/components/InstagramCopyGenerator.tsx`
- Extrair geração dos 6 PNGs (loop já em `handleExportZip`) para função interna `generateVisualSlideBlobs(): Promise<Blob[]>`, reusada pelo ZIP e pelo SmartOps.
- Estado `sendingSmartOps`. Handler `handleSendSmartOpsVisual` que chama o helper, mostra toasts e abre nova aba em sucesso.
- Botão `📤 Enviar SmartOps` (`variant="default"`, ícone `Send`, loading com `Loader2`) ao lado do `📦 Baixar ZIP` (linha ~2050), mesmas condições de disabled.

### 5. `src/components/EngagementCarouselSection.tsx`
- Extrair geração PNG (mesmo loop de `exportAllPNGs`, sempre PNG mesmo quando há vídeo — SmartOps recebe imagens) para `generateEngagementSlideBlobs(): Promise<Blob[]>`.
- Estado `sendingSmartOps` + `handleSendSmartOpsEngagement` análogo.
- Botão na mesma linha de `📦 Baixar ZIP` (linha ~526).

### Restrições respeitadas
- Não altera lógica de geração, downloads existentes, edge functions, schema.
- System B continua read-only no app (apenas upload para Storage, não DB).
- Nenhuma migration.

Aguardando o sistema mudar para **build mode** para aplicar as mudanças.
