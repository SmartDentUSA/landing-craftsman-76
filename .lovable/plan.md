

# Despublicação Real: Remover arquivos do Cloudflare/FTP automaticamente

## Problema Atual
O botão "Despublicar" (X) apenas atualiza o banco de dados (`publish_status → draft`, `published_url → null`). Os arquivos HTML permanecem acessíveis no Cloudflare Pages e no servidor FTP.

## Solução

Criar uma edge function `unpublish-pages` que recebe o `lpId`, identifica o método de publicação (Cloudflare ou FTP), e remove/substitui o arquivo no servidor remoto antes de atualizar o banco.

### 1. Nova Edge Function: `unpublish-pages`

**Lógica:**
- Recebe `lpId` (LP) ou `publicationId` (Blog)
- Busca o registro no banco para obter `target_domain`, `page_path`, `is_homepage`
- Busca o `publish_method` do domínio em `company_profile.seo_domains`
- **FTP**: Conecta via FTP, navega até o diretório e substitui `index.html` por uma página de redirecionamento 301 (ou deleta com `DELE`)
- **Cloudflare**: Faz deploy de uma página vazia/redirect via Cloudflare Pages API (Cloudflare Pages não suporta deleção individual de arquivos — a abordagem é fazer um novo deploy sem o arquivo, ou substituí-lo por um redirect)
- Atualiza o banco: `publish_status → draft`, `published_url → null`
- Regenera `nav-data.js` (FTP) para remover o link da página despublicada

### 2. Atualizar `LPClonePanel.tsx`

- `unpublishMutation`: Em vez de só atualizar o banco, invocar `unpublish-pages` edge function
- `unpublishBlogMutation`: Mesma lógica para blogs
- Adicionar diálogo de confirmação antes de despublicar

### 3. Estratégia por método

| Método | Ação | Detalhes |
|--------|------|----------|
| **FTP** | `DELE index.html` no diretório remoto | Simples e direto. Após deletar, regenera `nav-data.js` |
| **Cloudflare** | Deploy de redirect HTML | Substitui o conteúdo por uma página com `<meta http-equiv="refresh">` apontando para a home, pois CF Pages não tem API de deleção individual |

### 4. Arquivo da Edge Function

- `supabase/functions/unpublish-pages/index.ts`
- Reutiliza a classe `FTPClient` do `publish-ftp-pages`
- Para Cloudflare, reutiliza a lógica de deploy do `publish-cloudflare-pages` mas com HTML de redirect
- Registrar em `config.toml` com `verify_jwt = false`

### Resumo de arquivos
- **Criar**: `supabase/functions/unpublish-pages/index.ts`
- **Editar**: `supabase/config.toml` (registrar função)
- **Editar**: `src/components/LPClonePanel.tsx` (chamar edge function + confirmação)

