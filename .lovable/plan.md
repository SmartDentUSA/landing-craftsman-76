## Diagnóstico
O mais provável é que o botão `Republicar Tudo` não tenha apagado os registros do banco, mas tenha sobrescrito o deployment ativo do Cloudflare com snapshots incompletos.

Hoje o fluxo de Cloudflare publica **uma página por deployment**:
- `LPClonePanel.tsx` chama `publish-cloudflare-pages` item a item
- `publish-cloudflare-pages/index.ts` cria um `manifest` com **apenas 1 arquivo**
- `publish-product-blog-cloudflare/index.ts` faz o mesmo para blogs
- em Cloudflare Pages, o deployment ativo passa a refletir esse snapshot parcial

Resultado prático: a última página publicada continua no ar e as anteriores somem, parecendo que “tudo foi despublicado”.

Também encontrei um segundo problema: o sistema mistura `publish_status = 'success'` e `publish_status = 'published'`, então várias consultas enxergam conjuntos diferentes de páginas “online”, o que atrapalha recuperação, navegação, sitemap e painel.

## Plano
1. Implementar recuperação dos domínios afetados
- Criar um fluxo de restauração por domínio Cloudflare que reconstrói o site a partir do banco.
- Incluir LPs, blogs e arquivos especiais já armazenados com HTML/publicação associada.
- Considerar tanto registros com status `success` quanto `published`, além de `published_url` existente, para não deixar conteúdo válido de fora.

2. Corrigir a arquitetura de publicação Cloudflare
- Parar de fazer deployment Cloudflare “uma página por vez” para bulk/manual em domínios multi-página.
- Trocar para um deployment **por domínio**, com manifest completo contendo todas as rotas que devem permanecer online.
- Reaproveitar o padrão já existente em `publish-static-cloudflare/index.ts`, que monta manifest com vários arquivos.

3. Corrigir o botão `Republicar Tudo`
- Agrupar itens por domínio e método de publicação.
- Para Cloudflare, o botão deve disparar uma republicação por domínio, não por item.
- Manter a UI mostrando progresso por item/domínio, mas sem executar deployments destrutivos em sequência.

4. Normalizar status de publicação
- Padronizar LPs Cloudflare para usar o mesmo status final do restante do sistema.
- Atualizar consultas e filtros que hoje dependem só de `published` ou só de `success`.
- Revisar especialmente:
  - `republish-domain-pages/index.ts`
  - `Dashboard.tsx`
  - `clone-landing-page/index.ts`
  - geradores de sitemap/blog index
  - checks de despublicação e badges do painel

5. Validar manual vs em massa
- Testar em um domínio Cloudflare com várias páginas e em um domínio com blog.
- Confirmar que:
  - republicar uma página não derruba as demais
  - `Republicar Tudo` preserva todas as URLs já vivas
  - status e painel continuam coerentes
  - URLs antigas voltam ao ar após a restauração

## Recuperação esperada
A boa notícia é que isso parece ser **problema de snapshot/deployment**, não perda definitiva de conteúdo.
Se o HTML continua salvo nas tabelas de publicação, dá para restaurar os domínios afetados republicando o conjunto completo de arquivos.

## Detalhes técnicos
Arquivos principais a ajustar:
- `src/components/LPClonePanel.tsx`
- `supabase/functions/publish-cloudflare-pages/index.ts`
- `supabase/functions/publish-product-blog-cloudflare/index.ts`
- `supabase/functions/republish-domain-pages/index.ts`
- `src/pages/Dashboard.tsx`
- `supabase/functions/clone-landing-page/index.ts`
- `supabase/functions/generate-sitemap/index.ts`

Fluxo atual problemático:
```text
Republicar Tudo
  -> publica LP/blog individualmente
  -> cada publish Cloudflare cria manifest com 1 rota
  -> novo deployment substitui o snapshot anterior
  -> rotas antigas somem do domínio
```

Fluxo corrigido:
```text
Republicar Tudo
  -> agrupa por domínio
  -> monta manifest completo com todas as rotas do domínio
  -> cria 1 deployment por domínio
  -> todas as rotas permanecem online
```

Se você aprovar, eu sigo com a correção e priorizo primeiro a restauração segura dos domínios afetados.