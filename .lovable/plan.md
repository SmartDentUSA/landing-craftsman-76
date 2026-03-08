

## Problema Identificado

A Edge Function `test-ftp-connection` **não faz conexão real** ao servidor FTP. Ela apenas simula com um `setTimeout` e validação regex local. Por isso o KingHost mostra 0 conexões — nenhuma tentativa TCP real é feita.

Enquanto isso, `publish-ftp-pages` tem um cliente FTP real via `Deno.connect()` que funciona corretamente.

## Plano

Reescrever `supabase/functions/test-ftp-connection/index.ts` para usar um cliente FTP real (igual ao de `publish-ftp-pages`):

1. **Substituir a classe `SFTPClient` fake** por um mini cliente FTP real usando `Deno.connect()` na porta 21 (TCP)
2. **Fluxo do teste real**:
   - `Deno.connect({ hostname, port: 21 })` → esperar resposta `220`
   - `USER smartdent01` → esperar `331`
   - `PASS ***` → esperar `230`
   - `CWD /www/smartdent01` → esperar `250`
   - `QUIT` → encerrar
3. **Timeout de 15s** para não travar em conexões lentas
4. **Manter sanitização** de host (remover `https://`, espaços, barras)
5. **Retornar resultado real**: sucesso com detalhes do servidor, ou erro com a resposta FTP exata para debug
6. **Redeploy** da Edge Function

### Detalhes Técnicos

O código reutilizará o padrão de `publish-ftp-pages`: `Deno.connect()` + `ReadableStream` reader + encoder/decoder para ler respostas FTP linha a linha. A diferença é que só testa login + CWD, sem upload.

