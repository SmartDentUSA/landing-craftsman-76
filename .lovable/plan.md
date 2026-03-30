

## Atualizar secrets OAuth do Wikidata no Supabase

### Situação

Você criou um **novo** OAuth consumer no Wikidata ("Smart Dent Content Intelligence Platform 2"). Os tokens exibidos são diferentes dos que estão no Supabase. É necessário atualizar os 4 secrets.

### Ação do usuário (manual)

Acesse [Edge Functions Secrets](https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/settings/functions) e atualize:

| Secret name | Novo valor |
|---|---|
| `WIKIDATA_CONSUMER_KEY` | `a536f3526c3efb9e7d36c7509852f887` |
| `WIKIDATA_CONSUMER_SECRET` | `e9a955d65a9fbc7300d687ddf21bf002e7975f76` |
| `WIKIDATA_ACCESS_TOKEN` | `2b7e09aee757650ee2268b0463744c9e` |
| `WIKIDATA_ACCESS_SECRET` | `156a1adbea1f91738656239e2a4a528c63f2c8e8` |

### Alteração de código necessária

Remover `bot: "1"` do `wikidata-sync/index.ts` (linha 233). Mesmo com o grant "High-volume (bot) access" no consumer, a flag `bot` no `wbeditentity` exige que a **conta do usuário** tenha a flag bot concedida pela comunidade Wikidata — o que provavelmente não é o caso. Isso era a causa do erro "You do not have the permissions needed".

### Redeploy

Após as 2 ações (atualizar secrets + remover `bot: "1"`), redeploy da edge function `wikidata-sync`.

### Resultado esperado

- OAuth funciona com os novos tokens
- `wbeditentity` executa sem erro de permissão
- Items são criados/atualizados com sucesso no Wikidata

