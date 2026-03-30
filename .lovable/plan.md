
Objetivo: eliminar definitivamente o erro `mwoauth-invalid-authorization: Invalid signature` no fluxo Wikidata e dar diagnóstico acionável no próprio app.

Diagnóstico atual (com base em código + logs):
- O erro continua ocorrendo em `getWikidataCsrfToken` (GET), antes mesmo do `wbeditentity`.
- A assinatura usa `oauth-1.0a`, mas o transporte usa `URLSearchParams`; essa combinação pode gerar divergência de canonicalização/encoding entre o que é assinado e o que é enviado.
- O botão/UI atual só mostra erro genérico de credenciais, sem expor resultado do `test_oauth` para triagem rápida.

Plano de implementação:
1) Padronizar assinatura e serialização (fonte única de verdade)
- Em `supabase/functions/wikidata-sync/index.ts`, criar helpers internos para:
  - serialização RFC3986 determinística (query/body),
  - montagem de URL GET e body POST a partir do MESMO objeto de parâmetros usado na assinatura.
- Ajustar `buildOAuthHeader` para assinar sempre com:
  - `url` base (sem query),
  - `data` explícito (GET e POST).
- Aplicar isso em:
  - `getWikidataCsrfToken`,
  - `executeWbEditEntity`,
  - `handleTestOAuth` (siteinfo).

2) Fortalecer diagnóstico `test_oauth`
- Expandir retorno de `test_oauth` com campos seguros de debug (sem vazar segredo):
  - método, endpoint, status HTTP, presença de token CSRF, categoria de erro (`invalid_signature`, `invalid_token`, `timestamp/nonce`, `other`).
- Manter mascaramento parcial dos secrets e melhorar mensagem para separar:
  - “segredo ausente/inválido” vs
  - “assinatura divergente”.

3) Expor teste OAuth no frontend
- Em `src/services/wikidata-sync.ts`: adicionar função `testWikidataOAuth()` para chamar `action: "test_oauth"`.
- Em `src/components/WikidataSyncButton.tsx`: adicionar botão “Test OAuth” e feedback claro com resultado técnico resumido (success/fail + motivo principal).
- Ajustar toasts de erro OAuth para incluir recomendação contextual com base no erro retornado (não assumir sempre “regenere token”).

4) Validação end-to-end após implementação
- Fluxo 1: clicar “Test OAuth” e confirmar:
  - `siteinfo` OK,
  - `csrfTokenStatus = valid`.
- Fluxo 2: `Resolve` + `Publish` no mesmo produto que falhava.
- Fluxo 3: conferir logs da função:
  - sem `WIKIDATA_OAUTH_INVALID_AUTHORIZATION`,
  - com sucesso em CSRF e `wbeditentity`.

Arquivos impactados:
- `supabase/functions/wikidata-sync/index.ts`
- `src/services/wikidata-sync.ts`
- `src/components/WikidataSyncButton.tsx`

Critério de aceite:
- `test_oauth` passa de forma consistente.
- `resolve_and_persist`/`execute_write` não retornam mais “Invalid signature”.
- UI passa a mostrar diagnóstico útil sem depender de inspeção manual de logs.
