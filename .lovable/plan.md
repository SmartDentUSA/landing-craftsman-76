

# Sistema de Publicação via Git Deploy para smartdent.com.br

## Resumo

Criar a Edge Function `publish-git-kinghost` que publica HTML via GitHub API REST na branch `stable-website`, e atualizar todos os componentes frontend para suportar o novo método `'git'`.

## Arquivos

### 1. CRIAR: `supabase/functions/publish-git-kinghost/index.ts`

Edge Function que implementa o fluxo Git completo via GitHub REST API (sem git CLI):

```text
GET /git/ref/heads/stable-website → sha do branch
GET /git/commits/{sha} → tree sha
POST /git/blobs (HTML base64) → blob sha
POST /git/trees (blob + path) → new tree sha
POST /git/commits (parent + tree) → new commit sha
PATCH /git/refs/heads/stable-website → avança ref
```

- Recebe `{ html?, pagePath, isHomepage, lpId, domain }`
- Se `html` não enviado, busca de `cloned_landing_pages` via `lpId`
- Token: `Deno.env.get("GITHUB_PAT_DEPLOY")`
- Repo fixo: `SmartDentUSA/landing-craftsman-76`, branch: `stable-website`
- Path no repo: `public{pagePath}/index.html` (ex: `public/produtos/scanner-3d/index.html`)
- Homepage: `public/index.html`
- Injeta tracking pixels (mesma lógica do publish-ftp-pages)
- Atualiza `cloned_landing_pages` com `published_url` e `publish_status = 'published'`
- Em caso de erro, atualiza `publish_status = 'error'`

### 2. EDITAR: `supabase/config.toml`

Adicionar:
```toml
[functions.publish-git-kinghost]
verify_jwt = false
```

### 3. EDITAR: 5 arquivos frontend (tipos + roteamento + badges)

| Arquivo | Mudança |
|---------|---------|
| `LPPublishDialog.tsx` L20 | `publish_method: 'ftp' \| 'cloudflare' \| 'git'` |
| `LPPublishDialog.tsx` L188-190 | Adicionar `=== 'git' → 'publish-git-kinghost'` |
| `LPClonePanel.tsx` L89 | `publish_method?: 'cloudflare' \| 'ftp' \| 'git'` |
| `LPClonePanel.tsx` L210-214 | Filtro `enabledDomains`: incluir `d.publish_method === 'git'` |
| `LPClonePanel.tsx` L522-523 | Roteamento: `method === 'git' → 'publish-git-kinghost'` |
| `LPClonePanel.tsx` L966, 1152, 1486 | Badge: `'git' → '🐙 Git'` |
| `CompanyProfileManager.tsx` L83 | Tipo: incluir `\| 'git'` |
| `ProductBlogPublisherPanel.tsx` L25 | Tipo: incluir `\| 'git'` |
| `ProductBlogPublisherPanel.tsx` L111-115 | Filtro: incluir `d.publish_method === 'git'` |
| `TrackingSEOTab.tsx` L428 | Tipo: `'cloudflare' \| 'ftp' \| 'git'` |
| `TrackingSEOTab.tsx` L433-448 | Adicionar 3a opção RadioGroup: "🐙 Git Deploy" com ícone `GitBranch` |

### O que NÃO muda
- Edge functions FTP e Cloudflare permanecem inalteradas
- Nenhuma tabela do banco é alterada
- CSS não é modificado
- Outros domínios não são afetados

### Nota sobre package-lock.json
Lovable não suporta execução de comandos npm. O `package-lock.json` é gerenciado automaticamente pelo sistema de build.

