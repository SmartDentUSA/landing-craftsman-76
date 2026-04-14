
Do I know what the issue is? Sim. Pelo código atual, o login está frágil em dois pontos principais e há um terceiro fator de ambiente:
- `src/hooks/useAuthReady.ts` ainda pode deixar o app preso em “Verificando autenticação...” se a restauração da sessão travar ou demorar demais.
- `src/pages/Auth.tsx` não usa o estado centralizado e depende do `onAuthStateChange` para concluir o redirecionamento após `signInWithPassword`, então o login pode “dar certo” mas não avançar.
- Este projeto já teve limitação no Preview com autenticação; hoje a UI não trata isso bem e o usuário fica sem saída clara.

Plano de correção

1. Fortalecer a inicialização da sessão em `src/hooks/useAuthReady.ts`
- Registrar `onAuthStateChange` antes da checagem inicial.
- Adicionar timeout/fallback para `getSession()`.
- Expor um estado mais claro de auth (`loading`, `ready`, `timeout`, `error`) para parar o spinner infinito.

2. Corrigir o fluxo de login em `src/pages/Auth.tsx`
- Trocar o estado local pela fonte única (`useAuthReady`).
- Após `signInWithPassword`, fazer fallback explícito para concluir a sessão/navegação, em vez de depender só do evento.
- Melhorar a mensagem de erro com o retorno real do Supabase.
- Adicionar ação “limpar sessão e tentar novamente” para remover sessão local corrompida.

3. Melhorar `src/components/ProtectedRoute.tsx`
- Se a auth inicial falhar ou expirar no timeout, mostrar tela de recuperação em vez de spinner eterno.
- Manter redirect para `/auth` apenas quando a ausência de sessão estiver confirmada.

4. Tratar Preview x URL publicada
- Detectar quando o usuário estiver no Preview/iframe.
- Exibir aviso claro de que a autenticação deve ser feita na URL publicada quando o Preview bloquear auth.
- Incluir atalho para abrir `/auth` no app publicado.

5. Revisar `src/integrations/supabase/client.ts`
- Explicitar opções de auth relevantes para recuperação/OAuth (ex.: `detectSessionInUrl`) para deixar o comportamento mais previsível.

Resultado esperado
- O login com email/senha deixa de ficar “parado”.
- `/dashboard` não fica preso em “Verificando autenticação...”.
- Sessão local quebrada não impede novo login.
- No Preview, o usuário recebe orientação clara em vez de falha silenciosa.

Arquivos principais
- `src/hooks/useAuthReady.ts`
- `src/pages/Auth.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/integrations/supabase/client.ts`

Verificação
- Fazer login com email/senha na URL publicada.
- Recarregar `/dashboard` já autenticado.
- Testar o botão de limpar sessão e entrar de novo.
- Abrir no Preview e confirmar que aparece orientação clara, sem travar no spinner.

Detalhes técnicos
- Sem migração de banco.
- Correção focada no client-side de autenticação, recuperação de sessão e UX de erro.
