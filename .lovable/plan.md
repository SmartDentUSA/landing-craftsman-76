

## Plano: Corrigir redirects persistentes para /support-resources e /manuais

### Problema raiz
O `republish-domain-pages` sobrescreve o HTML de TODOS os registros publicados no domínio, incluindo os redirects. Isso acontece porque a função não distingue páginas normais de redirects — ela re-injeta tracking e nav em tudo.

### Solução (2 partes)

**Parte 1: Blindar o `republish-domain-pages` contra redirects**

Adicionar uma verificação no loop de atualização: se o `original_html` contiver `meta http-equiv="refresh"`, pular essa página (não re-injetar tracking/nav, não sobrescrever `transformed_html`). Isso garante que redirects nunca mais sejam sobrescritos.

Trecho a adicionar no loop `for (const page of pagesToUpdate)`:
```typescript
// Skip redirect pages — they must not be modified
if ((page.original_html || '').includes('http-equiv="refresh"')) {
  console.log(`⏭️ Skipping redirect page: ${page.page_path}`);
  continue;
}
```

**Parte 2: Restaurar os dados e republicar**

1. Atualizar os 2 registros no banco (`original_html` e `transformed_html`) com o HTML de redirect correto
2. Invocar `publish-git-kinghost` para cada um, commitando os HTMLs no `stable-website`

Registros afetados:
- `5b76749b-268e-4412-ab22-0ea59a31d00c` → `/support-resources`
- `6416ca26-6d1c-424a-a6de-ffdc6444b4e4` → `/manuais`

Ambos redirecionam para `https://parametros.smartdent.com.br/support-resources`.

### HTML de redirect (idêntico para ambos)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=https://parametros.smartdent.com.br/support-resources">
  <link rel="canonical" href="https://parametros.smartdent.com.br/support-resources">
  <title>Redirecionando...</title>
  <script>window.location.href="https://parametros.smartdent.com.br/support-resources";</script>
</head>
<body>
  <p>Redirecionando para <a href="https://parametros.smartdent.com.br/support-resources">parametros.smartdent.com.br/support-resources</a>...</p>
</body>
</html>
```

### Resultado
- Os dois redirects voltam a funcionar imediatamente
- Futuras execuções de `republish-domain-pages` não sobrescrevem mais páginas de redirect

