<final-text>Plano: estabilizar a sessão e parar o falso “deslogando”

Diagnóstico
- Do I know what the issue is? Sim.
- O sistema provavelmente não está encerrando a sessão o tempo todo; o frontend está interpretando estados transitórios do Supabase como logout.
- `src/pages/Auth.tsx` faz polling de `supabase.auth.getSession()` a cada 2s e força redirect para `/dashboard`, criando disputa com o fluxo normal de auth.
- `src/components/ProtectedRoute.tsx` redireciona para `/auth` sempre que recebe um evento com `!session?.user`, mesmo quando ainda está restaurando a sessão ou em refresh.
- Há `ProtectedRoute` duplicado em várias telas (`App.tsx` + a própria página), o que duplica listeners, checagens de sessão e navegações. Isso afeta especialmente `/dashboard`, `/repository`, `/editor`, `/lp-clone` e `/blog-image-test`.
- Existem consultas autenticadas rodando cedo demais, antes de a sessão estar pronta, o que aumenta estados falsos de “não autenticado”.

O que vou implementar
1. Centralizar auth em `src/hooks/useAuthReady.ts`
   - Transformar o hook na fonte única para `isReady`, `user` e sessão restaurada.
   - Deixar `onAuthStateChange` síncrono, sem `async/await` no callback.

2. Refatorar `src/components/ProtectedRoute.tsx`
   - Parar de tratar qualquer `!session?.user` como `SIGNED_OUT`.
   - Só redirecionar para `/auth` depois que a autenticação estiver realmente pronta e confirmada sem sessão.
   - Separar “sessão pronta” de “role carregada”, mantendo a checagem de role em background sem derrubar o acesso.

3. Limpar `src/pages/Auth.tsx`
   - Remover o `setInterval` de 2s.
   - Fazer redirect apenas com base no estado estável de auth.
   - Manter login/signup/reset sem polling agressivo.

4. Eliminar `ProtectedRoute` duplicado
   - Deixar a proteção em um único nível.
   - Ajustar `src/App.tsx` para carregar `requiredRole="admin"` nas rotas certas.
   - Remover o wrapper interno das páginas: `Dashboard.tsx`, `Repository.tsx`, `Editor.tsx`, `LPClone.tsx` e `BlogImageTest.tsx`.

5. Blindar consultas dependentes de sessão
   - Adiar chamadas até `isReady && user`.
   - Fazer a primeira varredura nos pontos mais críticos: `Dashboard.tsx`, `useLandingPagesSupabase.ts`, `AdminStatusBadge.tsx` e `OAuthSettingsCard.tsx`.

Resultado esperado
- O usuário permanece logado ao navegar e ao recarregar páginas protegidas.
- O app só manda para `/auth` quando realmente não houver sessão.
- Menos chamadas redundantes ao Supabase.
- Menos falsos “não autenticado” nas telas administrativas.

Verificação
- Login com email e acesso ao `/dashboard`.
- Refresh direto em `/dashboard` e `/repository`.
- Ficar alguns minutos com a aba aberta para confirmar que não volta sozinho para `/auth`.
- Logout manual para garantir que só sai quando deve.
- Se ainda houver logout real depois disso, o próximo passo é revisar no Supabase Auth as políticas de sessão: single-session, inactivity timeout e max lifetime.

Detalhes técnicos
- Arquivos principais: `src/hooks/useAuthReady.ts`, `src/components/ProtectedRoute.tsx`, `src/pages/Auth.tsx`, `src/App.tsx`.
- Arquivos de apoio: `src/pages/Dashboard.tsx`, `src/pages/Repository.tsx`, `src/pages/Editor.tsx`, `src/pages/LPClone.tsx`, `src/pages/BlogImageTest.tsx`, `src/hooks/useLandingPagesSupabase.ts`, `src/components/AdminStatusBadge.tsx`, `src/components/OAuthSettingsCard.tsx`.
- Sem migração de banco nesta etapa.</final-text>