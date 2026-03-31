

## Correção: Data "Modificado em" mostrando 17/03 em vez de 31/03

### Causa raiz

O Dashboard exibe `last_modified` (linha 644), que depende do código da aplicação para ser atualizado. Porém a tabela `landing_pages` também tem uma coluna `updated_at` que é **automaticamente atualizada por trigger do banco** (`update_updated_at_column`) em toda operação de update — tornando-a sempre precisa.

É provável que em algum caminho de salvamento (ex: via `admin_update_landing_page` RPC ou outro fluxo) o `last_modified` não tenha sido atualizado corretamente, ficando preso em 17/03.

### Correção

**Arquivo: `src/hooks/useLandingPagesSupabase.ts`**

1. Adicionar `updated_at` à interface `LandingPage` (como `Date`)
2. No `loadLandingPages`, converter `page.updated_at` para Date

**Arquivo: `src/pages/Dashboard.tsx`**

3. Na linha 643-647, usar `updated_at` (que vem do trigger do banco e é sempre confiável) em vez de `last_modified`:

```tsx
Modificado em: {
  landingPage.updated_at instanceof Date 
    ? landingPage.updated_at.toLocaleDateString('pt-BR')
    : new Date(landingPage.updated_at).toLocaleDateString('pt-BR')
}
```

Isso garante que a data exibida reflita sempre o último update real no banco de dados.

