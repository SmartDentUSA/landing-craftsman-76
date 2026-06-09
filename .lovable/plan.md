## Diagnóstico

O toast "Não foi possível carregar as configurações de prompts" vem de `src/hooks/usePromptsConfiguration.ts` (catch do `loadConfigurations`).

Olhando o console real do preview, o erro de fundo é **`TypeError: Failed to fetch`** — mesmo padrão que aparece em `useLinksRepository.ts` (external_links, internal_links). Testando direto da sandbox, a API do Supabase (`prompts_configuration`) responde **HTTP 200** com a anon key. Portanto:

- Não é RLS (RLS retorna 401/403, não "Failed to fetch").
- Não é schema/coluna inválida.
- É **falha de rede no browser**: requisição abortada antes de chegar no Supabase. Causas típicas: extensão/ad-blocker, perda momentânea de conectividade, ou aba reativada após hibernação (Vite/Supabase fetch é cancelado).

O hook hoje:
- Não distingue erro de rede de erro de servidor — joga o mesmo toast genérico.
- Não tem retry.
- O `useEffect` dispara só uma vez no mount, então qualquer falha de rede momentânea trava o componente até reload manual.

## Correção (somente frontend)

Editar `src/hooks/usePromptsConfiguration.ts`:

1. **Detectar erro de rede** (`error?.message?.includes('Failed to fetch')` ou `TypeError`) e, nesse caso:
   - Tentar 1 retry automático com backoff de 1.5s.
   - Se ainda falhar, mostrar toast **diferente** explicando que é problema de conexão ("Falha de conexão ao carregar prompts — verifique sua internet ou extensões de bloqueio") e **não** o genérico.
2. **Logar o erro real** com `code`, `message`, `details` no `console.error` para facilitar diagnóstico futuro.
3. **Evitar spam de toast**: se já houver um toast de erro ativo do mesmo hook nesta sessão, suprimir o segundo.
4. Manter a mesma assinatura pública do hook (sem mudanças em quem consome).

Aplicar o mesmo padrão mínimo (retry 1x + log com `code/message`) em `useLinksRepository.ts` (`loadExternalLinks`, `loadInternalLinks`) para parar a enxurrada de "Failed to fetch" no console da página `/repository`.

## Validação

- Recarregar `/repository` e confirmar:
  - O toast vermelho de prompts não aparece em condições normais.
  - Se ainda aparecer, o console mostra agora `code`/`message`/`details` reais (não só `TypeError: Failed to fetch`) — assim conseguimos diagnosticar a causa real (ex.: ad-blocker bloqueando `*.supabase.co`).
- Sem mexer em backend, RLS, schema ou Edge Functions.

## Observação

Se mesmo após o fix o erro persistir, o próximo passo é checar: (a) extensões do navegador (uBlock/AdGuard tendem a bloquear domínios), (b) DNS/VPN corporativa, (c) abrir o preview em janela anônima sem extensões. Isso será mais fácil de confirmar com o log detalhado que esse plano adiciona.
