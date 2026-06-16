## Objetivo

Liberar o acesso ao sistema removendo o bloqueio "Acesso Restrito" que aparece em rotas marcadas como `requiredRole='admin'`. Você está logado, mas o `has_role` RPC está retornando/timeout como `'user'`, ativando a tela de bloqueio.

## Mudança (1 arquivo)

**`src/components/ProtectedRoute.tsx`** — desativar o bloco de verificação de admin. Qualquer usuário autenticado passa.

Trecho a remover (linhas 96–116):

```tsx
// Admin check
if (requiredRole === 'admin' && userRole === 'user') {
  return ( ...Acesso Restrito... );
}
```

Substituído por um comentário:

```tsx
// Admin guard temporariamente desativado a pedido do usuário.
// Reativar quando o has_role RPC estiver confiável.
```

Nenhuma outra lógica de auth, hook ou tabela é tocada. `useAuthReady`, `/auth`, sessão Supabase e roles continuam exatamente iguais — apenas o gate visual de admin no `ProtectedRoute` é desligado.

## Resultado

- Login em `/auth` continua obrigatório.
- Após logar, todas as rotas (inclusive `/repository` e admin) abrem normalmente.
- Para reativar depois: restaurar o bloco removido.

Confirma que pode aplicar?