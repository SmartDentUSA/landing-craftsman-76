

## Plano: Corrigir tela travada em "Verificando autenticação..."

### Problema
O `ProtectedRoute` trava porque a chamada RPC `has_role` fica pendente indefinidamente quando ha problemas de conectividade com o Supabase (vistos nos logs: "Failed to fetch"). O timeout de 12s existe, mas pode ser invalidado por re-montagens do componente ou pelo evento `SIGNED_IN` que chama `checkAuth()` novamente.

### Raiz do problema
1. A funcao `checkAuth` tem retries com delays (1s+2s+3s = 6s) antes de sequer tentar o RPC
2. O RPC `has_role` nao tem timeout proprio — se o Supabase nao responder, fica pendente para sempre
3. O evento `onAuthStateChange(SIGNED_IN)` chama `checkAuth()` de novo, reiniciando todo o ciclo
4. Em re-montagens (navegacao), o estado `loading=true` reseta e o timeout de 12s recomeça

### Correcao em `src/components/ProtectedRoute.tsx`

1. **Adicionar timeout ao RPC `has_role`** — usar `Promise.race` com timeout de 5s. Se expirar, assumir role='user' e prosseguir
2. **Reduzir retries de sessao** — de 3 tentativas (6s de delay) para 2 (3s de delay), ja que o usuario ja esta autenticado
3. **Nao re-executar checkAuth no SIGNED_IN** — o user ja esta setado pelo onAuthStateChange. Apenas verificar role diretamente sem o ciclo completo de retries
4. **Setar user imediatamente ao encontrar sessao** — mover `setUser` para antes do RPC, assim o timeout mostra o conteudo com role='user' em vez da tela de erro

### Resultado esperado
- Se sessao existe: mostrar conteudo em <3s (user com role default 'user')
- Se RPC responde: atualizar role corretamente
- Se RPC falha/trava: prosseguir com role='user' (somente leitura)
- Se sem sessao: redirecionar para /auth em <3s

### Arquivo editado
- `src/components/ProtectedRoute.tsx`

