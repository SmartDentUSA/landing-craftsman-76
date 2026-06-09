## Problema

O console mostra erro recorrente no Dashboard:

```
duplicate key value violates unique constraint "company_profile_singleton"
```

Origem: `src/hooks/useCompanyReviews.ts` → função `loadCompanyReviews`.

Hoje ela faz:
1. `SELECT company_reviews FROM company_profile WHERE user_id = <user>` com `.maybeSingle()`.
2. Se não encontra, faz `INSERT` em `company_profile` com o `user_id` atual.

Isso conflita com a regra do projeto: **`company_profile` é singleton — só pode existir UMA linha** (garantida pelo constraint `company_profile_singleton`).

Quando o usuário logado **não é dono** da linha existente, o `SELECT` por `user_id` retorna `null`, o código tenta `INSERT`, o Postgres rejeita pelo constraint, o hook lança erro, o toast/erro dispara re-render do Dashboard, e em alguns fluxos o `ProtectedRoute` chega a re-checar sessão — gerando a sensação de "sistema saindo e voltando" entre páginas.

## Correção

Editar apenas `src/hooks/useCompanyReviews.ts`:

1. **`loadCompanyReviews`**: remover o filtro `.eq("user_id", user.id)`. Buscar a única linha do singleton:
   ```ts
   supabase.from("company_profile").select("company_reviews").limit(1).maybeSingle()
   ```
2. **Bloco de auto-criação**: só executar o `INSERT` se realmente não existir nenhuma linha (caso raro de banco vazio). Antes do insert, fazer um `select count` ou `select id limit 1` sem filtro de user; se já existir linha, retornar o default vazio em vez de inserir.
3. **`saveCompanyReviews`**: trocar `.update(...).eq("user_id", user.id)` por update na única linha existente (buscar `id` primeiro, depois `update().eq("id", id)`). Isso evita silenciosamente "não atualizar nada" quando o usuário logado não é o owner do singleton.
4. Manter o tratamento de erro existente, mas não jogar toast quando o erro for o próprio `23505` do singleton (defensivo).

## Validação

- Recarregar `/dashboard` e confirmar no console que **não aparece mais** `duplicate key value violates unique constraint "company_profile_singleton"`.
- Confirmar que a navegação fica estável (sem reload/redirect inesperado).
- Confirmar que reviews continuam carregando/salvando normalmente.

## Fora de escopo

- Não mexer em RLS, schema do banco, ou em outros hooks.
- Não tocar nas Edge Functions de exportação de apostila (assunto anterior já encerrado).
