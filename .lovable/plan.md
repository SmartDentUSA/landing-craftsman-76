

# Corrigir Cache CDN na Busca do HTML do Storage

## Problema Confirmado

O log diagnostico confirma: **3 tabelas "Comparativo:" estao presentes no HTML final** antes do upload ao Storage. O upload com `upsert: true` funciona corretamente. Porem, o HTML exibido no frontend mostra apenas 2 tabelas.

**Causa raiz:** O Supabase Storage usa CDN com cache agressivo para URLs publicas. Quando o arquivo e atualizado via `upsert`, o CDN continua servindo a versao anterior (cacheada) que continha apenas 2 tabelas. O `resolveStorageHtml` busca a URL publica sem nenhum mecanismo de cache-busting.

## Solucao

### 1. `src/lib/resolve-storage-html.ts` - Adicionar cache-busting

Adicionar um parametro `?t=<timestamp>` na URL publica para forcar o CDN a buscar a versao mais recente:

```typescript
const publicUrl = data.publicUrl + '?t=' + Date.now();
const response = await fetch(publicUrl);
```

### 2. `supabase/functions/generate-spin-landing-page/index.ts` - Adicionar cache-control no upload

Configurar o header `cacheControl` no upload para reduzir o TTL do cache:

```typescript
const { error: storageError } = await serviceClient.storage
  .from('landing-pages-html')
  .upload(storagePath, htmlBlob, {
    contentType: 'text/html; charset=utf-8',
    upsert: true,
    cacheControl: '0',  // Sem cache no CDN
  });
```

## Secao Tecnica

### Mudanca 1 - resolve-storage-html.ts (linha 29)
```typescript
// ANTES:
const response = await fetch(data.publicUrl);

// DEPOIS:
const publicUrl = data.publicUrl + '?t=' + Date.now();
console.log('🔗 Buscando HTML com cache-bust:', publicUrl);
const response = await fetch(publicUrl);
```

### Mudanca 2 - index.ts (upload com cacheControl)
```typescript
// ANTES:
.upload(storagePath, htmlBlob, {
  contentType: 'text/html; charset=utf-8',
  upsert: true,
});

// DEPOIS:
.upload(storagePath, htmlBlob, {
  contentType: 'text/html; charset=utf-8',
  upsert: true,
  cacheControl: '0',
});
```

### Resultado esperado
Apos essas 2 mudancas, ao re-gerar a landing page, o frontend buscara a versao mais recente do HTML do Storage, incluindo todas as 3 tabelas comparativas.
