

## Plano: Criar Edge Function `sync-system-b-articles` no Smart Dent (Sistema A)

### Contexto
O usuário forneceu o código completo da Edge Function que precisa ser criada no projeto Supabase **pgfgripuanuwwolmtknn** (Sistema A — Smart Dent). Ela:
- Busca artigos do Sistema B (`okeogjgqijbfkudfjadz`) via `knowledge-feed`
- Faz roteamento por domínio com base em `keyword_rules` da tabela `domain_config`
- Persiste em `systemb_articles` com upsert por `systemb_id`
- Modo `enrich` cruza com `products_repository` para gerar `answer_block` e `ai_context`

O botão de UI que dispara essa função (`SystemBArticlesSync`) já está implementado e aponta para `sync-system-b-articles?mode=full&max_pages=7`. Falta apenas a função no backend.

### Verificações pendentes (durante implementação)
1. Conferir se as tabelas `domain_config` e `systemb_articles` já existem no Sistema A com o schema esperado pelo código (colunas: `systemb_id`, `target_domain`, `publish_status`, `synced_at`, `enriched_json`, `enriched_at`, etc.).
2. Se faltarem colunas/tabelas, criar via migration antes de deployar a função.
3. `products_repository` já existe (referenciada em memória).

### O que será feito

**1. Criar a Edge Function**
- Arquivo: `supabase/functions/sync-system-b-articles/index.ts`
- Código exatamente como o usuário forneceu (já está pronto, validado por ele)
- A função usa `verify_jwt = false` implicitamente (não valida JWT no código) — compatível com o padrão Lovable atual
- Usa `SUPABASE_SERVICE_ROLE_KEY` (já disponível como env nativo nas Edge Functions, não precisa adicionar secret)
- Chave anon do Sistema B está hardcoded no código (é pública, sem risco)

**2. Verificar/criar schema do banco**
- Inspecionar `domain_config` e `systemb_articles` no Sistema A
- Se ausentes ou incompletas → criar migration com:
  - `domain_config(domain, keyword_rules text[], product_categories text[], is_hub bool, active bool, priority int)`
  - `systemb_articles(id uuid pk, systemb_id text unique, title, slug, target_domain, publish_status, synced_at, enriched_json jsonb, enriched_at, + todos campos do FeedItem)`
  - RLS apropriado (somente service role escreve; leitura autenticada)
  - Seed inicial de `domain_config` com hub `eodonto.com` e domínios não-hub

**3. Não mexer no frontend**
O componente `SystemBArticlesSync.tsx` já está correto e funcional. Apenas a função estava faltando.

### Resultado esperado após deploy
Ao clicar "Sincronizar Artigos Sistema B", o botão chama a função que:
- Busca até 7 páginas × 100 artigos do Sistema B
- Roteia cada artigo para o domínio com maior score de keywords
- Faz upsert em `systemb_articles`
- Roda enrich cruzando com `products_repository`
- Retorna JSON com `stats.articles_upserted` e `stats.domain_distribution`

### Riscos / observações
- Schema de `systemb_articles` precisa bater 100% com o que o `buildArticleRecord` insere — qualquer coluna faltante fará o upsert quebrar
- Tabela `domain_config` precisa ter pelo menos um registro com `is_hub=true`, senão o fallback hub vira string literal "eodonto.com"
- Se a função demorar > 60s, será cortada pelo limite default de Edge Function (mitigação: já tem `max_pages=7` × 100 = 700 artigos, deve caber)

### Arquivos afetados
- **Criar:** `supabase/functions/sync-system-b-articles/index.ts` (~250 linhas)
- **Possível migration:** `domain_config` + `systemb_articles` (apenas se não existirem com schema correto)
- **Não editar:** `SystemBArticlesSync.tsx`, `Repository.tsx` (já prontos)

