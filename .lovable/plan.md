

## Plano: Substituir FTP por Git Deploy para www.smartdent.com.br

### Resumo
Adicionar `git-deploy` como terceiro método de publicação. Para smartdent.com.br, trocar de FTP para Git Deploy. Domínios Cloudflare permanecem inalterados.

### Alterações

**1. Nova Edge Function: `supabase/functions/publish-git-deploy/index.ts`**
- Recebe `{ lpId, domain, pagePath, isHomepage }`
- Busca HTML de `cloned_landing_pages`
- Busca config Git do domínio em `company_profile.seo_domains` (campos `git_repo`, `git_branch`, `git_base_path`)
- Usa GitHub API (`PUT /repos/{owner}/{repo}/contents/{path}`) para commitar o HTML
- Atualiza `publish_status` para `published` no banco
- Requer secret `GITHUB_DEPLOY_TOKEN`

**2. `supabase/config.toml`** — Adicionar entrada `[functions.publish-git-deploy]`

**3. Expandir tipo `publish_method` em 5 arquivos:**

| Arquivo | Mudança |
|---------|---------|
| `TrackingSEOTab.tsx` | Adicionar 3a opção "🔀 Git Deploy" no RadioGroup (L434-447). Adicionar seção config Git Deploy (repo, branch, base_path) similar à seção FTP (L559-613). Tipo expandido L428. |
| `LPPublishDialog.tsx` | Tipo L20 → `'ftp' | 'cloudflare' | 'git-deploy'`. Roteamento L195 → adicionar caso `git-deploy` → `publish-git-deploy`. Badge L255 → incluir Git. |
| `LPClonePanel.tsx` | Tipo L89 → expandir. Filtro L210-214 → incluir `git-deploy`. Roteamento L522-523 → adicionar caso. Labels L966, L1148, L1482 → badge Git. |
| `ProductBlogPublisherPanel.tsx` | Tipo L25 → expandir. Filtro L111-115 → incluir `git-deploy`. |
| `CompanyProfileManager.tsx` | Tipo L83 → expandir. |

**4. Secret necessário**
- `GITHUB_DEPLOY_TOKEN`: Personal Access Token com permissão `contents:write` no repo SmartDent. Será solicitado antes da implementação.

**5. Dados no banco**
- Atualizar `seo_domains` do `company_profile`: para o domínio smartdent.com.br, mudar `publish_method` de `ftp` para `git-deploy` e adicionar campos `git_repo`, `git_branch`, `git_base_path`.

### O que NÃO muda
- Nenhum domínio Cloudflare é afetado
- Edge functions FTP existentes permanecem (podem ser usadas por outros domínios no futuro)
- Nenhuma tabela alterada

