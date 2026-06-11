## Objetivo
Corrigir o achado de segurança `unauth_oauth_exchange`: as edge functions `exchange-youtube-code` e `exchange-google-business-code` aceitam `clientSecret` no body e repassam ao Google sem qualquer verificação de JWT, funcionando como proxy OAuth aberto.

## Abordagem
Adicionar guarda de autenticação JWT no topo de ambas as funções, seguindo exatamente o padrão já usado em `exchange-oauth-code/index.ts` (que é a versão segura/canônica).

## Alterações

### 1. `supabase/functions/exchange-youtube-code/index.ts`
- Importar `createClient` do `npm:@supabase/supabase-js@2`.
- Antes de qualquer parsing do body, validar o header `Authorization`:
  - Criar client Supabase com o JWT do caller (URL + ANON_KEY).
  - Chamar `supabase.auth.getUser()`.
  - Se erro ou sem user → retornar `401 { error: "unauthorized" }` com `corsHeaders`.
- Logar `user.id` junto com os demais logs estruturados (sem dados sensíveis).
- Manter todo o resto da lógica (sanitização de redirect_uri, troca com Google, respostas) inalterado.

### 2. `supabase/functions/exchange-google-business-code/index.ts`
- Mesma mudança: bloco de auth idêntico no início do handler, retornando 401 quando não autenticado.
- Demais validações (formato do client_id, client_secret, redirect_uri) permanecem como estão.

### 3. Verificação dos callers
- `src/pages/YouTubeOAuthSettings.tsx` e `src/pages/GoogleBusinessOAuthSettings.tsx` já invocam via `supabase.functions.invoke(...)`, que envia automaticamente o JWT do usuário logado — nenhuma mudança de frontend é necessária.

## Fora de escopo
- Outros achados de segurança listados (service role hardcoded, AI generators abertos, XSS no `ProductEditModal`) serão tratados separadamente.
- Não vou deprecar/remover as funções antigas; apenas fechar a brecha de auth, preservando o comportamento atual para os callers existentes.

## Validação
Após implementar, marcar o finding `unauth_oauth_exchange` como corrigido e atualizar a security memory.
