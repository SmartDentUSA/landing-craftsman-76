

# O que existe hoje e o que falta

## Onde está a UI de configuração FTP

1. **Credenciais FTP** → `/publication-settings` (acessível pelo Dashboard). Lá tem o campo "Nome do Perfil" (`profile_name`) + host/user/password/port/remote_path. Porém o título do card ainda diz **"SFTP (eodonto.com)"** — precisa de um segundo card ou renomear para suportar múltiplos perfis (ex: `kinghost_smartdent`).

2. **Domínio smartdent.com.br no seo_domains** → Precisa ser inserido via SQL no `company_profile.seo_domains` JSONB. Sem isso, o domínio não aparece no dropdown do LPClonePanel.

3. **Homepage** → Já existe checkbox "Definir como Página Principal (/)" no bloco "Publicar em Domínio" dentro da aba **LP Clone & Blogs** (Repository → LP Clone). Funciona corretamente.

4. **Caminho da página (categorias)** → Já existe o input "Caminho da Página" que gera URLs tipo `/produtos/slug`, `/solucoes/slug`. Porém **não há seletor de categoria baseado no `url_structure`** do domínio — o usuário digita manualmente.

5. **Links incrementais no footer** → **Não existe**. Não há mecanismo para, ao publicar uma página via FTP, atualizar automaticamente o menu/footer de outras páginas já publicadas.

---

## O que precisa ser construído

### A. Melhorar PublicationSettings para múltiplos perfis FTP
- Permitir criar/editar múltiplos perfis (cards dinâmicos ou lista)
- Cada perfil com `profile_name` único (ex: `kinghost_smartdent`, `eodonto_sftp`)

### B. Seletor de categoria/url_structure no LPClonePanel
- Quando o domínio selecionado tem `url_structure`, mostrar um dropdown com as categorias disponíveis (produtos, blog, guias, compare, spin)
- Ao selecionar, preencher automaticamente o prefixo do caminho (ex: `/produtos/` + slug)

### C. Sistema de footer incremental
- Ao publicar uma página FTP, registrar a URL na tabela `cloned_landing_pages`
- Gerar um `footer.html` ou `navigation.json` com todas as páginas publicadas naquele domínio
- Re-upload do footer em todas as páginas existentes (ou usar um JS include dinâmico)

### D. SQL para inserir smartdent.com.br no seo_domains
- UPDATE no `company_profile` para append do objeto JSON com `publish_method: 'ftp'`

---

## Plano de implementação

### 1. SQL: Inserir domínio smartdent.com.br
UPDATE `company_profile.seo_domains` para incluir o objeto com `publish_method: 'ftp'`, `ftp_profile: 'kinghost_smartdent'`, e `url_structure`.

### 2. PublicationSettings — suportar múltiplos perfis FTP
Modificar `src/pages/PublicationSettings.tsx`:
- Buscar todos os registros de `publication_settings` do usuário (não apenas `maybeSingle`)
- Renderizar um card por perfil FTP existente + botão "Adicionar Perfil FTP"
- Cada card editável com profile_name, host, user, password, port, remote_path

### 3. LPClonePanel — seletor de categoria por url_structure
Modificar `src/components/LPClonePanel.tsx`:
- Quando um domínio FTP é selecionado e tem `url_structure`, mostrar um `<Select>` com as categorias (Produtos, Blog, Guias, Compare, Soluções SPIN)
- Ao selecionar categoria, auto-preencher o prefixo do `pagePath` (ex: `/produtos/`)
- O usuário completa com o slug

### 4. Footer incremental — mecanismo de navegação dinâmica
Modificar `supabase/functions/publish-ftp-pages/index.ts`:
- Após publicar uma página, buscar todas as páginas publicadas naquele domínio
- Gerar um bloco `<nav>` com links para todas as páginas
- Injetar esse bloco no HTML antes de `</body>` de **todas** as páginas do domínio (re-upload via FTP)
- Alternativa mais leve: gerar um `sitemap.json` e um `nav-footer.js` que carrega dinamicamente os links — upload apenas desse JS + o HTML novo

### 5. Edge Function — atualizar publish-ftp-pages
- Após upload da página nova, gerar e fazer upload de `nav-data.json` com lista de todas as páginas
- Injetar script `<script src="/nav-data.json">` no footer de cada HTML

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Modificar | `src/pages/PublicationSettings.tsx` (múltiplos perfis) |
| Modificar | `src/components/LPClonePanel.tsx` (seletor categoria + url_structure) |
| Modificar | `supabase/functions/publish-ftp-pages/index.ts` (footer incremental) |
| SQL | UPDATE company_profile seo_domains (append smartdent.com.br) |

