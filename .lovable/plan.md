
Objetivo: eliminar o erro genérico “edge function non 2xx status code” no fluxo Wikidata e corrigir a causa real de falha de publicação.

1) Diagnóstico confirmado (baseado em código + logs)
- A Edge Function `wikidata-sync` está retornando 401/400 em erros de domínio, e o client mostra mensagem genérica.
- Causa raiz atual do publish: `mwoauth-invalid-authorization` com `Invalid signature` no CSRF (`getWikidataCsrfToken`), não timeout.
- Há também warning recorrente de RPC ausente: `resolve_wikidata_entity` (fallback está funcionando, mas com ruído).

2) Ajustes no backend (Edge Function)
- Arquivo: `supabase/functions/wikidata-sync/index.ts`
- Harden de secrets OAuth:
  - Sanitizar `Deno.env.get(...)` com `trim()` e validação de formato mínimo (sem logar valor sensível).
  - Retornar erro explícito quando detectar segredo inválido (ex.: whitespace acidental).
- Padronizar erro OAuth em todos os caminhos:
  - Em `handleExecuteWrite`, mapear `WIKIDATA_OAUTH_INVALID_AUTHORIZATION` igual ao `resolve_and_persist` (hoje cai como `WRITE_FAILED` genérico).
- Melhorar diagnósticos seguros:
  - Logar apenas presença/tamanho dos segredos e tipo de falha (sem expor segredo).
  - Incluir `errorCode` consistente no JSON de resposta.

3) Ajustes no frontend para remover mensagem genérica
- Arquivo: `src/services/wikidata-sync.ts`
- Criar helper para extrair body JSON de `supabase.functions.invoke` quando vier non-2xx (via `error.context`), priorizando `errorCode` e `error`.
- Aplicar helper em:
  - `resolveWikidataEntity`
  - `executeWikidataWrite`
  - `syncCompanyToWikidata` / `syncProductToWikidata`
- Resultado: UI passa a exibir “Credenciais OAuth inválidas/assinatura inválida” em vez de “non 2xx”.

4) UX de ação corretiva no botão Wikidata
- Arquivo: `src/components/WikidataSyncButton.tsx`
- Tratamento dedicado para `WIKIDATA_OAUTH_INVALID_AUTHORIZATION`:
  - Toast com instrução direta: regenerar `ACCESS_TOKEN/ACCESS_SECRET` do mesmo OAuth consumer aprovado e reinserir secrets.
  - Manter estado visual de falha sem quebrar fluxo de preview/resolve.

5) Limpeza de ruído técnico (opcional, recomendado)
- Criar migration para função SQL `public.resolve_wikidata_entity(...)` (assinatura esperada no código), removendo warning de fallback e melhorando consistência de lock/upsert.

Critérios de aceite
- No clique em “Resolve/Publish”, a UI não mostra mais erro genérico “non 2xx”; mostra mensagem específica.
- Logs da `wikidata-sync` passam a indicar claramente se o problema é assinatura OAuth vs segredo ausente.
- Após credenciais OAuth válidas, publish retorna `success: true` e `wikidataQid` com `syncStatus: synced`.

Detalhes técnicos (resumo)
- Arquivos impactados:  
  - `supabase/functions/wikidata-sync/index.ts`  
  - `src/services/wikidata-sync.ts`  
  - `src/components/WikidataSyncButton.tsx`  
  - (opcional) migration SQL para `resolve_wikidata_entity`.
- Estratégia: manter HTTP semântica no backend, mas tornar o client resiliente a non-2xx com parsing do payload de erro.
