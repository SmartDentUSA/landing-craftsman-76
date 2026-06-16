## Objetivo
Resolver os erros "Erro ao carregar links externos" e "Erro ao carregar produtos do repositório" e a sumiço das LPs publicadas, liberando leitura/escrita das tabelas envolvidas para todos os usuários autenticados (e leitura pública onde fizer sentido).

## Diagnóstico
As mensagens vêm de hooks que consultam tabelas no Supabase (`external_links`, `products_repository`, `cloned_landing_pages`, `landing_pages`, etc.). Após a remoção do guard de admin, o front passou a tentar ler como usuário comum — e as tabelas exigem role `admin` (ou simplesmente não têm GRANT para `authenticated`/`anon`). Resultado: PostgREST devolve "permission denied" e o toast de erro aparece, além das LPs publicadas sumirem do Dashboard.

## Plano (1 migration de permissões + verificação)

1. **Migration única** ajustando permissões das tabelas usadas pela UI logada, sem alterar dados nem estrutura:
   - `external_links`: `GRANT SELECT, INSERT, UPDATE, DELETE` para `authenticated`; `GRANT SELECT` para `anon` (links públicos aprovados); policies permissivas equivalentes (`USING (true)` para SELECT de aprovados, full CRUD para authenticated).
   - `products_repository`: `GRANT SELECT, INSERT, UPDATE, DELETE` para `authenticated`; policy `USING (true) WITH CHECK (true)` para authenticated.
   - `cloned_landing_pages` e `landing_pages`: idem — `authenticated` com CRUD completo via policy permissiva, para que o Dashboard volte a enxergar as LPs publicadas (Home, QRCode, Comparativo Scanners).
   - Para qualquer outra tabela do repositório usada nos hooks listados (keywords, categorias, cupons, KOLs, reviews, prompts, etc.) aplicar o mesmo padrão: CRUD para `authenticated`, sem `anon`.
   - Manter `service_role` com `ALL` em todas.
   - **Não tocar** em System B (`okeogjgqijbfkudfjadz`) nem em tabelas de auth/storage.

2. **Verificação pós-migration**:
   - Recarregar `/repository` e o Dashboard.
   - Confirmar que os toasts de erro somem e que as LPs publicadas (Home → smartdent.com.br, QRCode, Comparativo Scanners) voltam a aparecer com selo "Publicado" e URL.

## Aviso de segurança
Liberar CRUD para todo usuário autenticado significa que **qualquer pessoa logada pode editar/excluir** produtos, links, LPs etc. Como o sistema é interno (apenas operadores logam), isso é aceitável, mas o ideal a médio prazo é reintroduzir o role `admin` via `user_roles` + `has_role()` nas policies. Posso fazer isso num passo seguinte se quiser.

## Fora do escopo
- Nenhuma mudança em conteúdo publicado (smartdent.com.br continua no ar como está).
- Nenhuma mudança em System B.
- Nenhuma alteração de UI além do que voltar a renderizar naturalmente.