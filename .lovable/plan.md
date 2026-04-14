

## Plano: Corrigir bloqueio de acesso ao Repositório

### Problema
A rota `/repository` exige `requiredRole="admin"`, mas a verificação de role está retornando `'user'` para seu usuário. Isso acontece porque o `checkRoleWithTimeout` no `useAuthReady.ts` faz fallback para `'user'` em caso de timeout ou erro no RPC `has_role`.

### Diagnóstico necessário
Antes de alterar código, preciso verificar se seu usuário tem a role `admin` no banco. Vou consultar a tabela `user_roles` via Supabase.

### Ações

**1. Verificar se existe registro admin na tabela `user_roles`**
- Consultar via `supabase--read_query` se há uma entrada com `role = 'admin'` para o seu `user_id`

**2a. Se NÃO existir o registro:**
- Criar migration para inserir a role `admin` para o seu usuário
- Ou usar o RPC `promote_user_to_admin` se já existir

**2b. Se existir mas o RPC falhar:**
- Aumentar o `RPC_TIMEOUT_MS` no `useAuthReady.ts` (atualmente pode estar muito curto)
- Adicionar log mais detalhado para entender a falha

**3. Alternativa rápida (se for só seu usuário)**
- O `ProtectedRoute` poderia ser ajustado para não exigir `admin` no `/repository`, se todos os usuários autenticados devem ter acesso

### Arquivo
- `src/hooks/useAuthReady.ts` — ajuste de timeout se necessário
- `src/App.tsx` — remover `requiredRole="admin"` do `/repository` se a intenção é acesso geral
- Migration SQL — se precisar inserir role

### Resultado
Acesso ao Repositório restaurado sem a tela de "Acesso Restrito".

