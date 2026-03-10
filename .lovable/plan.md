

## Plano: Substituir FTP por Git Deploy (KingHost) para www.smartdent.com.br

### Contexto da Imagem
O KingHost Git Deploy usa o repo **SmartDentUSA/landing-craftsman-76** (este projeto Lovable), branch **main**, deploy em **/www/**. Ele cria automaticamente a branch `stable-website`, GitHub Actions e webhook.

### Como funciona o fluxo

```text
Edge Function gera HTML → Commit via GitHub API no repo (public/blog/...) → Push main → GitHub Actions build → KingHost sync /www/ → www.smartdent.com.br
```

Os arquivos HTML gerados são commitados na pasta `public/` do repo. O Vite copia `public/` para `dist/` no build. O KingHost deploya `dist/` para `/www/`.

### Alterações

**1. Nova Edge Function: `supabase/functions/publish-git-deploy/index.ts`**
- Recebe `{ lpId, domain, pagePath, isHomepage }`
- Busca HTML de `cloned_landing_pages`
- Usa GitHub API (`PUT /repos/SmartDentUSA/landing-craftsman-76/contents/public{pagePath}`) para commitar o HTML
- Atualiza `publish_status` para `published`
- Requer secret `GITHUB_DEPLOY_TOKEN` (Personal Access Token com `contents:write`)

**2. `supabase/config.toml`** — Adicionar `[functions.publish-git-deploy]` com `verify_jwt = true`

**3. Expandir `publish_method` em 5 arquivos:**

| Arquivo | Mudança |
|---------|---------|
| `TrackingSEOTab.tsx` | Tipo L428 → `'cloudflare' \| 'ftp' \| 'git-deploy'`. Adicionar 3a opção "🔀 Git Deploy" no RadioGroup (L434-448). Adicionar seção config Git Deploy com campos `git_repo` (fixo: SmartDentUSA/landing-craftsman-76), `git_branch` (fixo: main), `git_base_path` (fixo: public). |
| `LPPublishDialog.tsx` | Tipo L20 → incluir `'git-deploy'`. Roteamento L195 → adicionar caso `git-deploy` → `publish-git-deploy`. |
| `LPClonePanel.tsx` | Tipo L89 → incluir `'git-deploy'`. Filtro L210-214 → incluir `git-deploy`. Roteamento L522-523 → caso `git-deploy`. Labels L966, L1148, L1482 → badge "🔀 Git". |
| `ProductBlogPublisherPanel.tsx` | Tipo L25 → incluir `'git-deploy'`. Filtro L111-115 → incluir `git-deploy`. |
| `CompanyProfileManager.tsx` | Tipo L83 → incluir `'git-deploy'`. |

**4. Secret necessário**
- `GITHUB_DEPLOY_TOKEN`: Personal Access Token com permissão `contents:write` no repo SmartDentUSA/landing-craftsman-76

**5. Dados no banco**
- No `seo_domains` do `company_profile`, para smartdent.com.br: mudar `publish_method` de `ftp` para `git-deploy`, adicionar `git_repo: "SmartDentUSA/landing-craftsman-76"`, `git_branch: "main"`, `git_base_path: "public"`

### O que NÃO muda
- Domínios Cloudflare permanecem inalterados
- Edge functions FTP existentes permanecem
- Nenhuma tabela alterada

