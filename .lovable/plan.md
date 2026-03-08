
# Conectar Landing Pages do Editor ao Publisher FTP/Cloudflare

## Resumo

Criar um botão "Publicar" na lista de LPs do Dashboard que abre um Dialog com seletor de dominio, categoria, slug e homepage. Ao publicar, gera HTML, insere em `cloned_landing_pages` e chama a edge function correta.

## Entregas

### 1. Migration SQL: `source_landing_page_id`
Adicionar coluna `source_landing_page_id text` em `cloned_landing_pages` com index parcial. Isso vincula LPs publicadas a sua origem no editor.

### 2. Novo componente: `src/components/LPPublishDialog.tsx`
Dialog completo com:
- **Select de dominio** — busca `seo_domains` de `company_profile`, filtra enabled, mostra badge `[FTP]` ou `[Cloudflare]`
- **Checkbox homepage** — define pagePath como `/`
- **Select de categoria** — aparece apenas se o dominio selecionado tem `url_structure` (Produtos, Blog, Guias, Compare, SPIN)
- **Input de slug** — auto-gerado do nome da LP, editavel
- **Preview da URL** — mostra URL final em tempo real
- **Botao Publicar** — executa o pipeline completo

Pipeline do handlePublish:
1. Gera HTML via `generateBlogHTML()` (mesmo gerador usado em `handleCopyCode`)
2. Insere registro em `cloned_landing_pages` com `source_landing_page_id = lp.id`
3. Determina method: `domainConfig.publish_method === 'ftp' ? 'publish-ftp-pages' : 'publish-cloudflare-pages'`
4. Chama `supabase.functions.invoke(functionName, { body: { lpId, domain, pagePath, isHomepage } })`
5. Atualiza UI com resultado

### 3. Modificar: `src/pages/Dashboard.tsx`
Na seção de LPs aprovadas (linha ~1164), adicionar botao "Publicar" ao lado de "Copiar Codigo":
```
{landingPage.status === 'approved' && (
  <Button onClick={() => { setPublishLP(landingPage); setPublishOpen(true); }}>
    <Upload /> Publicar
  </Button>
)}
```

State adicional:
- `publishOpen: boolean`
- `publishLP: LandingPage | null`

Import e render do `<LPPublishDialog>` no final do JSX.

## Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `src/components/LPPublishDialog.tsx` |
| Modificar | `src/pages/Dashboard.tsx` (add publish button + dialog state) |
| Migration | ADD COLUMN `source_landing_page_id` to `cloned_landing_pages` |

## Fluxo final

```text
Dashboard "Suas Landing Pages"
   │ [Publicar] button (approved only)
   ▼
LPPublishDialog
   │ Select domain → Select category → Slug
   ▼
generateBlogHTML() → HTML
   │
   ▼
INSERT cloned_landing_pages
   │
   ▼
supabase.functions.invoke(
  'publish-ftp-pages' | 'publish-cloudflare-pages'
)
   │
   ▼
FTP / Cloudflare
```
