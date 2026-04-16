
O usuário quer um botão que chama a edge function `sync-system-b-articles` em modo full com max_pages=7 e exibe o resultado.

**Pontos críticos:**
1. **NUNCA usar service role key no frontend** — isso expõe a chave master do banco. Vou usar o anon key padrão do cliente Supabase, que já está configurado.
2. A função `sync-system-b-articles` precisa existir. Vou verificar.
3. Onde colocar o botão? O componente `SystemBDocumentSync` já existe em `/repository` (rota atual). Faz sentido adicionar um componente irmão `SystemBArticlesSync` no mesmo local.

Deixa eu verificar rapidamente se a função existe e onde o componente é usado.
