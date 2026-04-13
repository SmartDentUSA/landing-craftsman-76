

## Plano: Corrigir erro "Erro ao ativar acesso" no Dashboard

### Diagnostico

O erro ocorre ao chamar `supabase.rpc('promote_user_to_admin')`. Ha dois problemas:

1. **Instabilidade do Supabase** — os erros "Connection terminated" que vimos antes podem fazer o RPC falhar silenciosamente
2. **Erro generico sem detalhes** — o catch block nao mostra qual erro ocorreu, dificultando o debug
3. **Banner aparece mesmo quando o usuario ja e admin** — se a query `user_roles` falha, `userRole` fica como `'user'` e o banner aparece desnecessariamente

### Correcoes em `src/pages/Dashboard.tsx`

1. **Adicionar log do erro real** no catch do `handlePromoteToAdmin` para diagnosticar a causa exata:
   ```typescript
   console.error('Promote to admin failed:', error);
   ```

2. **Usar `has_role` RPC como fallback** no `getCurrentUser` — se a query direta a `user_roles` falhar, tentar o RPC `has_role` que ja existe e e SECURITY DEFINER

3. **Melhorar mensagem de erro** — mostrar o erro real na descricao do toast para facilitar debug

4. **Adicionar retry automatico** — se o RPC falhar por timeout, tentar uma segunda vez apos 2s

### Verificacao adicional

Seria util verificar no Supabase se a funcao `promote_user_to_admin` existe e esta acessivel. Posso rodar uma query de teste.

### Arquivo editado
- `src/pages/Dashboard.tsx` (~10 linhas alteradas)

