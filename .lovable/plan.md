
## Objetivo

Disponibilizar **uma única URL pública, sem API key**, em **texto puro otimizado para LLM**, que o WhatsApp Business AI (Meta Business Agent) possa consumir como base de conhecimento da Smart Dent — produtos, empresa, FAQs, mensagens CS, reviews, milestones.

## URLs finais que você vai usar no WhatsApp Business AI

Após esta implementação, você vai cadastrar **3 fontes** no agente do WhatsApp:

1. **URL principal (contexto geral, HTML)**
   `https://www.smartdent.com.br` — site institucional

2. **Identidade canônica (já existe)**
   `https://www.smartdent.com.br/llms.txt`

3. **Base de conhecimento completa em texto puro (NOVA)**
   `https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-export-full?format=txt&include=all`

   Variantes úteis:
   - Só produtos: `?format=txt&include=products,company`
   - Markdown (melhor para alguns LLMs): `?format=markdown&include=all`
   - Só empresa + reviews + milestones (institucional): `?format=txt&include=company,reviews,milestones`

## O que muda no código

### Arquivo: `supabase/functions/knowledge-export-full/index.ts`

Adicionar dois novos formatos ao endpoint existente (que já é público, sem JWT, e já consulta todos os dados):

1. **`format=txt`** — texto puro, sem markdown, otimizado para token economy:
   - Cabeçalho com empresa (nome, CNPJ, fundação, fundadores, endereço, contato)
   - Para cada produto: nome, categoria, preço, descrição limpa (strip HTML), benefícios, características, especificações técnicas (lista chave: valor), FAQ (P/R), link
   - Reviews aprovados (autor, rating, texto)
   - Milestones (ano — título — descrição)
   - Landing pages (nome, status, URL)
   - Blogs publicados (título, resumo, URL)
   - Sem JSON, sem tags HTML, sem JSON-LD — apenas texto corrido com separadores `---`

2. **`format=markdown`** — mesma estrutura, mas com `#`, `##`, `-`, `**negrito**`, tabelas markdown para specs e bullets para benefícios. Melhor para Claude/GPT que entendem markdown nativamente.

3. Reutilizar funções já existentes (`stripHtml`, `asArray`, dados já carregados de `company`, `products`, `reviewsBlock`, `milestones`, `landingPages`, `blogs`) — apenas adicionar dois novos renderers de saída antes do bloco `format === "html"` (linha 774).

4. Content-Type:
   - `format=txt` → `text/plain; charset=utf-8`
   - `format=markdown` → `text/markdown; charset=utf-8`
   - Manter `Cache-Control: public, max-age=300, s-maxage=900`

### Sem alterações em

- Banco de dados (sem migration)
- Auth/RLS (endpoint já público com SERVICE_ROLE interno)
- Outros formatos existentes (`json`, `html`, `both`, `schema_only`) — preservados intactos

## Validação após implementação

```bash
curl "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-export-full?format=txt&include=all" | head -200
curl "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-export-full?format=markdown&include=products&limit=5"
```

Resultado esperado: texto limpo, legível por humanos e por LLMs, sem tags HTML, sem JSON.

## Detalhes técnicos

- O endpoint `knowledge-export-full` já agrega tudo o que o WhatsApp AI precisa (produtos com benefícios/FAQ/specs, mensagens CS por produto, reviews Google, milestones, LPs, blogs, empresa expandida com fundadores e regulatório).
- O `?approved_only=true` (default) já filtra apenas itens publicados/aprovados — seguro para uso público.
- Limite atual de produtos: `limit=50` por default, ajustável até maior via query param.
- Não precisa de cache extra: o endpoint já tem `s-maxage=900` (15 min) no Cloudflare edge.

## Fora de escopo

- Corrigir o `knowledge-base?format=ai_training` (erro `column products_repository.competitors`) — tarefa separada se quiser manter o endpoint legado com API key.
- Adicionar autenticação ao `knowledge-export-full` — manter público é o ponto da feature.
