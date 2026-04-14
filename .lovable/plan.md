<final-text>Plano: destravar o acesso ao app

Do I know what the issue is? Sim.

Diagnóstico
- O usuário está tentando acessar pelo Preview/iframe, e os logs mostram `Failed to fetch` e `Tempo limite de autenticação esgotado` no login.
- O app ainda faz consultas ao Supabase na rota pública `/auth`, porque `CategoryProvider` envolve todo o `App` e dispara `useProductCategories` / `useCategoryConfig` logo na abertura.
- `src/hooks/useAuthReady.ts` está agressivo demais: em falha genérica de rede, ele limpa a sessão salva como se ela estivesse inválida. Isso pode derrubar sessões boas e bloquear o acesso.
- Há vários pontos consultando sessão diretamente, fora da fonte central de auth, o que aumenta corrida de estados e erros na inicialização.

O que vou implementar
1. Corrigir `src/hooks/useAuthReady.ts`
- Parar de limpar sessão local em erro genérico de rede/timeout.
- Só invalidar a sessão quando houver sinal claro de token/sessão inválida.
- Separar melhor “falha de conexão” de “sessão inválida”.

2. Ajustar `src/pages/Auth.tsx`
- No Preview, deixar a UX explícita: abrir o site publicado em vez de insistir num login que já está falhando nesse ambiente.
- Melhorar mensagens de erro para distinguir rede/Preview de credenciais inválidas.
- Manter “Limpar sessão local” apenas como ação manual.

3. Tirar carga protegida das rotas públicas
- Remover `CategoryProvider` do topo global em `src/App.tsx` ou aplicá-lo só na área autenticada.
- Fazer `useProductCategories` e `useCategoryConfig` não carregarem dados ao abrir `/`, `/auth` e outras rotas públicas.

4. Blindar consultas que rodam cedo demais
- Ajustar `Dashboard.tsx`, `useLandingPagesSupabase.ts`, `OAuthSettingsCard.tsx`, `useCompanyReviews.ts` e `useLinksRepository.ts` para só consultar depois de `isReady && user`.
- Reduzir uso espalhado de `supabase.auth.getSession()` e reaproveitar `useAuthReady()`.

5. Refinar `src/components/ProtectedRoute.tsx`
- Manter a rota protegida sem redirects agressivos em falha de rede.
- Mostrar recuperação clara sem destruir sessão válida.

Resultado esperado
- O app para de “se autodeslogar” em instabilidade de rede.
- A tela de login deixa de falhar sem contexto no Preview.
- Rotas públicas abrem sem disparar consultas protegidas e toasts desnecessários.
- No site publicado, o login volta a concluir e o dashboard deixa de entrar em loop de erro.

Arquivos principais
- `src/hooks/useAuthReady.ts`
- `src/pages/Auth.tsx`
- `src/App.tsx`
- `src/contexts/CategoryContext.tsx`
- `src/hooks/useProductCategories.ts`
- `src/hooks/useCategoryConfig.ts`
- `src/hooks/useLandingPagesSupabase.ts`
- `src/hooks/useLinksRepository.ts`
- `src/hooks/useCompanyReviews.ts`
- `src/components/OAuthSettingsCard.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Dashboard.tsx`

Verificação
- Abrir `/auth` no Preview e confirmar que a UI direciona corretamente para o site publicado.
- Fazer login no site publicado.
- Recarregar `/dashboard` autenticado.
- Confirmar que `/auth` não dispara erros de `categories_config`.
- Deixar a aba aberta alguns minutos e validar que a sessão não some sozinha.

Detalhe técnico
- Sem migração de banco nesta etapa.
- Se o site publicado ainda falhar depois disso, o próximo passo é revisar a instabilidade do Supabase, porque já existem sinais de timeout/conexão nos logs.</final-text>