
Correção do Wikidata — causa confirmada e plano

Diagnóstico confirmado
- O problema atual não é de produto, permissão de admin nem flag desligada.
- A edge `wikidata-sync` está falhando no primeiro request OAuth assinado com:
  `mwoauth-invalid-authorization: Invalid signature`
- Os 4 secrets existem e estão presentes:
  - `WIKIDATA_CONSUMER_KEY`
  - `WIKIDATA_CONSUMER_SECRET`
  - `WIKIDATA_ACCESS_TOKEN`
  - `WIKIDATA_ACCESS_SECRET`
- O flag `WIKIDATA_WRITE_ENABLED` está ativo.
- Então a quebra real está no fluxo OAuth de escrita do Wikidata.
- Hoje o botão “Resolve” pode acabar entrando em escrita real quando o modo live está ativo, então ele bate no erro mesmo antes de você clicar em “Publish”.

O que vou implementar
1. Separar preview de escrita real
- Ajustar `resolve_and_persist` para nunca publicar.
- Ele deve apenas:
  - montar payload
  - validar score
  - persistir estado `pending`
  - retornar diagnóstico
- Deixar `execute_write` como único caminho que realmente chama `wbeditentity`.

2. Melhorar o diagnóstico OAuth na edge
- Em `supabase/functions/wikidata-sync/index.ts`:
  - padronizar a classificação dos erros OAuth
  - retornar a fase exata da falha: `siteinfo`, `csrf` ou `write`
  - devolver um erro estruturado para o front distinguir:
    - `invalid_signature`
    - `invalid_token`
    - `timestamp_nonce`
    - `missing_secrets`
- Isso vai transformar o erro atual em um diagnóstico claro em vez de toast genérico.

3. Melhorar a interface do botão Wikidata
- Em `src/components/WikidataSyncButton.tsx` e `src/services/wikidata-sync.ts`:
  - mostrar o motivo real da falha inline
  - impedir tentativa de “Publish” quando o `Test OAuth` falhar
  - manter “Resolve” funcionando mesmo com OAuth quebrado
- Resultado: você continua conseguindo revisar payload e decisão sem travar o fluxo.

4. Adicionar teste do signer OAuth
- Criar teste específico para o signer da edge:
  - GET assinado (`siteinfo` / `csrf`)
  - POST assinado (`wbeditentity`)
  - montagem canônica de parâmetros
- Objetivo: evitar regressão e confirmar que o problema restante, se houver, é segredo inválido e não código.

Ação necessária sua
- Como o log mostra `Invalid signature` logo no primeiro request assinado, a causa mais provável é par de credenciais desalinhado.
- Será necessário regenerar, no mesmo OAuth consumer aprovado:
  - `WIKIDATA_ACCESS_TOKEN`
  - `WIKIDATA_ACCESS_SECRET`
- Se o consumer foi recriado ou teve secret trocado, então precisa rotacionar os 4 juntos:
  - `WIKIDATA_CONSUMER_KEY`
  - `WIKIDATA_CONSUMER_SECRET`
  - `WIKIDATA_ACCESS_TOKEN`
  - `WIKIDATA_ACCESS_SECRET`

Arquivos afetados
- `supabase/functions/wikidata-sync/index.ts`
- `src/services/wikidata-sync.ts`
- `src/components/WikidataSyncButton.tsx`
- `supabase/functions/wikidata-sync/*_test.ts` (novo)

Sem mudanças de banco
- Não vou alterar tabelas nem schema para este ajuste.

Resultado esperado
- “Resolve” volta a funcionar como preview seguro
- “Publish” só tenta escrita quando o OAuth estiver realmente válido
- O sistema passa a mostrar a causa exata da falha
- Depois da rotação correta dos secrets, a escrita no Wikidata deve voltar a funcionar
