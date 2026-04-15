

## Plano: Adicionar rewrites para llms.txt e criar robots.txt

### O que será feito

1. **Criar `vercel.json`** na raiz do projeto com as regras de rewrite apontando `/llms.txt` e `/.well-known/llms.txt` para a Edge Function `llms-txt` no Supabase (`okeogjgqijbfkudfjadz`).

2. **Criar `public/robots.txt`** com as regras de permissão para agentes de IA (GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Anthropic-ai, Google-Extended) e o apontamento `LLMs: /llms.txt`.

### Detalhes técnicos

- `vercel.json` não existe ainda — será criado do zero com apenas o array `rewrites`.
- `public/robots.txt` também não existe — será criado com o conteúdo especificado.
- Nenhum arquivo existente será modificado.

### Nota sobre o título da mensagem

O título menciona "todos os domínios" — porém as instruções concretas pedem apenas alterações em `vercel.json` (que afeta o deploy Vercel/Lovable em `parametros.smartdent.com.br`) e `public/robots.txt`. Os domínios publicados via Cloudflare/KingHost não são afetados por estes arquivos. Se desejar replicar o `robots.txt` e rewrites nos outros domínios, será necessário um passo adicional após este.

