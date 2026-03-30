

## Redeploy e teste da edge function wikidata-sync

### O que fazer
1. **Redeploy** da edge function `wikidata-sync` para carregar os novos secrets OAuth
2. **Teste** — o usuário clica em Resolve/Publish na UI para validar que a assinatura OAuth funciona

### Nenhuma alteração de código necessária
Os secrets estão com os nomes corretos. Apenas o redeploy é necessário.

### Resultado esperado
- CSRF token obtido com sucesso
- `resolve_and_persist` retorna `success: true` com `wikidataQid` e `syncStatus: synced`
- UI mostra confirmação verde em vez de erro

