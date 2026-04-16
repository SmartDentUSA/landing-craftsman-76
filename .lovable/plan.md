

## Plano: Corrigir erro "Cannot read properties of undefined (reading 'publishedUrl')"

### Causa raiz
A linha 540 de `LPClonePanel.tsx` acessa `data.deployment.publishedUrl`, mas a Edge Function `publish-git-kinghost` retorna `publishedUrl` diretamente na raiz do objeto (sem wrapper `deployment`). Já a `publish-cloudflare-pages` retorna dentro de `data.deployment.publishedUrl`.

### Correção
Alterar a linha 540 para ser compatível com ambos os formatos de resposta:

```typescript
// De:
toast.success(`Publicado em ${data.deployment.publishedUrl}`);

// Para:
toast.success(`Publicado em ${data.deployment?.publishedUrl || data.publishedUrl || 'sucesso'}`);
```

### Arquivo afetado
- `src/components/LPClonePanel.tsx` — linha 540 (apenas 1 linha alterada)

