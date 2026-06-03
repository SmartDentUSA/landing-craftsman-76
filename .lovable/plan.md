## Diagnóstico

A lentidão vem de dois pontos principais no carregamento do dashboard:

1. **Todas as páginas pesadas são importadas no início do app**
   - `App.tsx` importa `Editor`, `Repository`, OAuth settings, métricas e outras telas grandes antes mesmo de abrir essas rotas.
   - O perfil mostra 248 scripts carregados e recursos pesados como `Editor.tsx`, `recharts`, `ProductEditModal` e `lucide-react`, elevando o primeiro carregamento para ~8,5s.

2. **O dashboard faz consultas pesadas e repetidas logo ao abrir**
   - `useBlogStatusMonitor` carrega todos os `blog_posts` com `select('*')` e depois carrega centenas de produtos associados (`allSelectedProductIds: 367`).
   - `useSelectedProducts` também usa `select('*')` em `products_repository`, contrariando a regra do projeto de nunca usar wildcard nessa tabela.
   - Isso trava a interface e faz qualquer clique parecer que “não funciona”.

## Plano de correção

### 1. Tornar rotas pesadas carregadas sob demanda

Alterar `src/App.tsx` para usar `React.lazy` + `Suspense` nas páginas pesadas:

- `Dashboard`
- `Editor`
- `CodeView`
- `Repository`
- configurações OAuth/Cloudflare/Publicação
- `LPClone`
- métricas RAG

Resultado esperado: abrir o sistema não baixa/editoria tudo de uma vez; cada tela carrega apenas quando acessada.

### 2. Remover consulta pesada automática do dashboard

Ajustar `src/hooks/useBlogStatusMonitor.ts` para:

- não carregar produtos de blogs automaticamente no mount;
- carregar apenas dados mínimos dos posts publicados, sem `select('*')`;
- remover logs repetitivos que disparam em renderizações;
- calcular contadores com dados leves.

Resultado esperado: dashboard aparece rápido e os botões ficam responsivos.

### 3. Corrigir `products_repository` sem wildcard

Alterar `src/hooks/useSelectedProducts.ts` para selecionar apenas colunas necessárias, seguindo a regra do projeto:

- `id`, `name`, `description`, `sales_pitch`, `benefits`, `features`, `keywords`, etc.
- manter `individual_blog_content` apenas quando necessário.

Resultado esperado: evitar timeout e reduzir payload ao buscar produtos.

### 4. Dar feedback imediato nos botões da lista

Adicionar estados de carregamento por LP no `Dashboard.tsx` para botões demorados:

- `Copiar Código`
- `Baixar HTML`
- `Duplicar`
- `Excluir`
- `Nova Landing Page`

Resultado esperado: ao clicar, o botão mostra spinner/desabilita, deixando claro que o sistema recebeu o clique.

### 5. Ajustar pequenos pontos que causam chamadas extras

- Evitar `fetchPublishedInfo()` rodando a cada alteração completa de `landingPages`; usar uma dependência estável por IDs/status.
- Corrigir `handleDuplicate`, que hoje chama `addLandingPage()` sem `await`, podendo mostrar sucesso antes de terminar.
- Trocar `.single()` por `.maybeSingle()` onde há risco de não retornar linha.

## Validação

Após implementar:

- medir novamente o perfil de performance no dashboard;
- confirmar que o dashboard não baixa `Editor.tsx`/`recharts` no carregamento inicial;
- clicar em `Copiar Código`, `Publicar`, `Baixar HTML` e `Editar` para confirmar resposta imediata;
- verificar que não há novos erros no console.