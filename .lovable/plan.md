

# Publicação Incremental — Atualizar todas as páginas do domínio ao publicar uma nova

## Problema atual

Quando uma nova página (não-homepage) é publicada em um domínio, o `nav-data.js` é atualizado no Git deploy, mas:
1. **Git deploy**: O `nav-data.js` compartilhado funciona para navegação dinâmica (client-side JS), mas os links **estáticos** no HTML (`<noscript>`, rodapé embutido) das páginas já publicadas NÃO são atualizados
2. **FTP deploy**: Cada página tem seu HTML independente — as demais páginas ficam desatualizadas completamente
3. O template engine injeta links no footer via `institutional_links_html`, mas esses links são fixos no momento da geração

## Plano de implementação

### Etapa 1: Criar Edge Function `republish-domain-pages`

Nova Edge Function que recebe um `domain` e republica **todas** as páginas publicadas naquele domínio:

- Busca todos os registros em `cloned_landing_pages` com `target_domain = domain` e `publish_status = 'published'`
- Para cada página, busca o `source_landing_page_id` na tabela `landing_pages`, regenera o HTML via o mesmo fluxo (ou reutiliza o `original_html` existente)
- Injeta tracking + nav-data.js atualizado
- Faz o deploy de todas as páginas em um **único commit** (Git) ou sequencialmente (FTP)
- Para Git: cria todos os blobs + nav-data.js em uma única árvore/commit (atômico)
- Para FTP: faz upload sequencial de cada página

**Arquivo:** `supabase/functions/republish-domain-pages/index.ts`

### Etapa 2: Modificar `LPPublishDialog` — Disparar republish após publicação

Após a publicação bem-sucedida de uma página **não-homepage**, adicionar uma chamada assíncrona (fire-and-forget) à nova Edge Function:

```
// Após o publish principal ser bem-sucedido:
if (!isHomepage) {
  supabase.functions.invoke('republish-domain-pages', {
    body: { domain: selectedDomain, excludeLpId: clonedLPId }
  });
}
```

Isso dispara a republicação em background sem bloquear o usuário. Um toast informativo é exibido.

**Arquivo:** `src/components/LPPublishDialog.tsx` (linhas ~229-235)

### Etapa 3: Lógica da Edge Function `republish-domain-pages`

Fluxo detalhado:

1. Recebe `{ domain, excludeLpId? }` 
2. Busca `company_profile` para tracking pixels e `seo_domains` config
3. Determina `publish_method` do domínio (git/ftp/cloudflare)
4. Busca todas as páginas publicadas do domínio (`cloned_landing_pages`)
5. Gera a lista de navegação atualizada (incluindo a nova página recém-publicada)
6. Para cada página (exceto `excludeLpId` que acabou de ser publicada):
   - Pega o HTML existente (`transformed_html`)
   - Re-injeta o `<noscript>` com links estáticos atualizados no footer
   - Re-injeta tracking pixels
7. **Git deploy**: Cria blobs para todos os HTMLs + nav-data.js → um único commit atômico
8. **FTP deploy**: Upload sequencial de cada HTML + nav-data.js na raiz
9. Atualiza `published_at` de cada página republicada

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/republish-domain-pages/index.ts` | Criar (nova Edge Function) |
| `supabase/config.toml` | Adicionar config da nova função |
| `src/components/LPPublishDialog.tsx` | Adicionar chamada fire-and-forget após publish |

