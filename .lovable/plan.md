
# Importação Automática Mensal de KOLs do Sistema B

## Estratégia: pg_cron + Nova Edge Function

Sem nenhuma UI nova. A solução é 100% backend:

1. **Nova edge function** `import-systemb-authors` — busca o payload do Sistema B, localiza os autores/especialistas e faz upsert na tabela `key_opinion_leaders`
2. **pg_cron job** agendado para rodar no **1º dia de cada mês às 03:00** — chama a edge function automaticamente via HTTP

O pg_cron já está habilitado no projeto (confirmado: tabela `cron.job` existe). Não há nenhum job cadastrado ainda.

## Descoberta da Estrutura do Sistema B

Com base nos logs existentes em `sync-system-b-documents/index.ts`, o payload do Sistema B tem as seguintes chaves confirmadas na raiz:
- `produtos.resinas`
- `documentos_catalogo`
- `avaliacoes_google`
- `perfil_empresa` → contém `reputacao_google`

Os autores/KOLs provavelmente estão em:
- `perfil_empresa.equipe`
- `perfil_empresa.profissionais`
- `autores`
- `key_opinion_leaders`
- `profissionais`

A edge function tentará **todos esses caminhos** e usará o primeiro que retornar dados. Também logará as chaves raiz do payload para diagnóstico nos logs do Supabase.

## Arquivos a Criar/Modificar

### 1. `supabase/functions/import-systemb-authors/index.ts` (NOVO)

Estrutura da função:

```
POST/GET → busca payload Sistema B
  ↓
Loga chaves raiz para diagnóstico
  ↓
Tenta localizar autores em múltiplos caminhos:
  - payload.autores
  - payload.profissionais
  - payload.key_opinion_leaders
  - payload.perfil_empresa.equipe
  - payload.perfil_empresa.profissionais
  ↓
Para cada autor encontrado:
  - Mapeia campos para o formato key_opinion_leaders
  - upsert por full_name (evitar duplicatas)
  - approved: false por padrão (requer revisão manual do admin)
  ↓
Retorna summary: { encontrados, importados, ignorados }
```

Mapeamento de campos (tentativa de múltiplos nomes de campo):
| Campo Sistema B | Campo Destino |
|---|---|
| `nome` / `name` / `nome_completo` | `full_name` |
| `foto` / `photo_url` / `foto_url` / `imagem` | `photo_url` |
| `bio` / `mini_cv` / `descricao` / `biografia` | `mini_cv` |
| `especialidade` / `specialty` / `cargo` | `specialty` |
| `instagram` / `instagram_url` | `instagram_url` |
| `youtube` / `youtube_url` | `youtube_url` |
| `lattes` / `lattes_url` / `curriculo_lattes` | `lattes_url` |
| `site` / `website` / `website_url` / `url` | `website_url` |
| `ordem` / `display_order` | `display_order` |

### 2. `supabase/config.toml` (MODIFICAR)

Adicionar ao final:
```toml
[functions.import-systemb-authors]
verify_jwt = false
```

### 3. SQL via Insert Tool (NÃO é migration — é dado de configuração do cron)

Cadastrar o job no pg_cron para executar **no 1º dia de cada mês às 03:00 UTC**:

```sql
SELECT cron.schedule(
  'import-systemb-authors-monthly',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/import-systemb-authors',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmdyaXB1YW51d3dvbG10a25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDkxNzMsImV4cCI6MjA3MTcyNTE3M30.ibYoIlzxAFoXjFCAy7WrKKixiDcG318dxEm8gqGKOjk"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

Nota: usa `pg_net` (já disponível via Supabase) para fazer o HTTP POST. O cron schedule `0 3 1 * *` significa: minuto 0, hora 3, dia 1 do mês, todo mês.

## Fluxo Completo

```text
1º dia do mês às 03:00 UTC
  ↓
pg_cron dispara → net.http_post → /import-systemb-authors
  ↓
Edge function acorda e busca:
  https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready
  ↓
Analisa payload → localiza lista de autores/especialistas
  ↓
Para cada autor:
  upsert key_opinion_leaders (deduplicação por full_name)
  approved = false (aguarda revisão manual)
  ↓
Loga resultado nos Edge Function Logs do Supabase
  ↓
Admin pode ver os novos KOLs importados no mês seguinte
e aprovar individualmente na tela de KOLs
```

## Segurança e Resiliência

- `AbortController` com timeout de 30s para o fetch do Sistema B
- Tratamento de erro individual por autor (falha em um não para a importação)
- `upsert` por `full_name` — re-executar não cria duplicatas
- `approved: false` por padrão — nenhum KOL não revisado aparece nos endpoints públicos
- Caso o Sistema B esteja fora do ar, a função retorna erro e o pg_cron registra na tabela `cron.job_run_details` para diagnóstico posterior

## Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---|---|---|
| `supabase/functions/import-systemb-authors/index.ts` | NOVO | Edge function de importação |
| `supabase/config.toml` | MODIFICAR | Registrar nova função |
| SQL via Insert Tool | DADO | Cadastrar job no pg_cron |
