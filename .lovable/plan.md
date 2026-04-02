

## Fix Google OAuth — Diagnóstico e Correção

### Problemas encontrados

A configuração no Google Console esta correta (client_id, origens, redirect URIs). Porem o fluxo de troca de token nunca completa por 5 razoes:

1. **redirect_uri mismatch na troca**: A funcao `exchange-oauth-code` constroi `redirect_uri` a partir do header `origin` da requisicao HTTP. Mas `supabase.functions.invoke()` envia como origin o dominio do Supabase, nao o dominio do app. O Google exige que o redirect_uri na troca seja identico ao usado na autorizacao (`landing-craftsman-76.lovable.app/oauth2/callback`).

2. **Validacao de origin bloqueia chamadas**: A funcao valida `origin` contra uma lista fixa. Chamadas via `supabase.functions.invoke` podem ter origin diferente (preview domain, ou ate vazio).

3. **Funcao `exchange-oauth-code-direct` nao existe**: O fallback no `OAuthCallback.tsx` chama uma funcao que nunca foi criada. Quando `sessionStorage` perde o `config_id` (ex: por redirect cross-domain), o fluxo cai nesse fallback e falha silenciosamente.

4. **sessionStorage perdido no redirect**: Quando o usuario inicia OAuth no preview (`id-preview--...lovable.app`), o `oauth.ts` redireciona para Google com `redirect_uri = landing-craftsman-76.lovable.app/oauth2/callback`. Ao retornar, o callback esta em `landing-craftsman-76.lovable.app` — dominio diferente do que salvou o sessionStorage. O `config_id` e perdido.

5. **Tabela `oauth_credentials` vazia**: Nenhum token foi salvo com sucesso. As funcoes que consultam essa tabela retornam null.

### Solucao

#### 1) Fixar redirect_uri no exchange (edge function)
Em vez de usar o `origin` do request, passar o `redirect_uri` como parametro do body (vindo do frontend que sabe qual redirect usou). Validar que esteja na lista permitida.

**Arquivo**: `supabase/functions/exchange-oauth-code/index.ts`
- Aceitar `redirect_uri` no body
- Validar contra lista de URIs permitidos
- Remover validacao de origin (desnecessaria com JWT + redirect_uri validado)

#### 2) Persistir config_id no state do OAuth (nao sessionStorage)
Em vez de salvar `config_id` no sessionStorage (que se perde no cross-domain redirect), codificar no parametro `state` da URL OAuth. O Google retorna `state` intacto no callback.

**Arquivo**: `src/lib/oauth.ts`
- Mudar `state` de apenas `provider` para `provider:config_id`

**Arquivo**: `src/hooks/useOAuth.ts`
- Remover uso de sessionStorage para config_id

**Arquivo**: `src/pages/OAuthCallback.tsx`
- Parsear `state` como `provider:config_id`
- Enviar `redirect_uri` correto no body do exchange
- Remover fallback para funcao inexistente

#### 3) Criar `exchange-oauth-code-direct` como fallback real
Para casos onde nao ha config_id (ex: re-autenticacao via settings), criar funcao simples que usa GOOGLE_CLIENT_ID/SECRET do env.

**Arquivo**: `supabase/functions/exchange-oauth-code-direct/index.ts`
- Aceitar `code`, `provider`, `redirect_uri`
- Usar secrets GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
- Salvar em `oauth_credentials`

#### 4) Adicionar preview domain as origens permitidas
**Arquivo**: `src/lib/oauth.ts`
- Adicionar `https://id-preview--b282ae68-9aa1-4f3f-8597-81ef6773926f.lovable.app`

**Arquivo**: Google Console
- Adicionar redirect URI: `https://id-preview--b282ae68-9aa1-4f3f-8597-81ef6773926f.lovable.app/oauth2/callback`
- OU: sempre usar o canonico (ja funciona, so precisa fixar o exchange)

### Ordem de implementacao
1. `exchange-oauth-code/index.ts` — aceitar redirect_uri no body, remover origin check
2. `src/lib/oauth.ts` — codificar config_id no state
3. `src/pages/OAuthCallback.tsx` — parsear state, enviar redirect_uri
4. `supabase/functions/exchange-oauth-code-direct/index.ts` — criar fallback
5. Deploy das edge functions

### Resultado esperado
- OAuth completa o ciclo: authorize → callback → exchange → token salvo em oauth_credentials
- Reviews, YouTube e SEO Local passam a ter token valido
- Funciona tanto no dominio publicado quanto no preview

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| `supabase/functions/exchange-oauth-code/index.ts` | Editar (aceitar redirect_uri, remover origin check) |
| `src/lib/oauth.ts` | Editar (state = provider:config_id) |
| `src/hooks/useOAuth.ts` | Editar (remover sessionStorage) |
| `src/pages/OAuthCallback.tsx` | Editar (parsear state, enviar redirect_uri) |
| `supabase/functions/exchange-oauth-code-direct/index.ts` | Criar novo |

### Acao do usuario (Google Console)
Nenhuma mudanca necessaria no Console — o redirect URI `landing-craftsman-76.lovable.app/oauth2/callback` ja esta cadastrado e sera usado como canonico para todas as origens.

