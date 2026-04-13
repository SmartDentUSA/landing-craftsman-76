

## Plano: Corrigir acesso ao sistema

### Problema 1: Supabase Database Timeout
O banco Supabase esta retornando "Connection terminated due to connection timeout". Isso faz todas as queries falharem (landing pages, categorias, Clinical Brain, etc). Isso e um problema de infraestrutura -- o projeto Supabase pode estar pausado ou com instabilidade.

**Acao**: Verificar no Supabase Dashboard se o projeto esta ativo. Se estiver pausado, reativar.

### Problema 2: Loop infinito no Dashboard (bug de codigo)
O `useEffect` na linha 246-250 dispara `fetchBlogPosts` toda vez que `approvedLandingPagesIds` ou `fetchBlogPosts` mudam. Porem:
- `debouncedFetchBlogPosts` captura `landingPages` no closure (linha 116)
- Quando `landingPages` muda, `debouncedFetchBlogPosts` recria -> `fetchBlogPosts` recria -> useEffect dispara novamente
- Quando as queries falham (timeout), o estado reseta, causando novo ciclo

Isso gera dezenas de chamadas por segundo ao Supabase, piorando o timeout.

### Correcao no codigo

**Arquivo**: `src/pages/Dashboard.tsx`

1. **Remover `fetchBlogPosts` das dependencias do useEffect** -- usar ref para a funcao em vez de dependencia direta
2. **Estabilizar `debouncedFetchBlogPosts`** -- passar `landingPages` como argumento em vez de capturar no closure
3. **Adicionar guard contra chamadas quando nao ha landing pages** -- evitar queries desnecessarias

Mudancas especificas:
- Linha 116-150: Refatorar `debouncedFetchBlogPosts` para receber `landingPages` como parametro
- Linha 166-169: Remover wrapper `fetchBlogPosts` desnecessario
- Linha 246-250: Chamar `debouncedFetchBlogPosts` diretamente com `landingPages`, remover `fetchBlogPosts` da lista de dependencias

### Resultado esperado
- Loop infinito eliminado
- Dashboard carrega normalmente quando Supabase responde
- Menos pressao no banco de dados

### Arquivo editado
- `src/pages/Dashboard.tsx` (~15 linhas alteradas)

