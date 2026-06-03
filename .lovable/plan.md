## Correção do endpoint `knowledge-export-full` — landing_pages aprovadas no markdown

### Problema
Hoje, com `approved_only=true` (default), o filtro é `status = 'published'`. Existem 5 landing pages com `status = 'approved'` e 0 com `published`, então o resultado vem vazio nos formatos JSON/markdown/txt.

### Mudança
Em `supabase/functions/knowledge-export-full/index.ts`, linha 523:

- Substituir:
  ```ts
  if (approvedOnly) q = q.eq("status", "published");
  ```
- Por:
  ```ts
  if (approvedOnly) q = q.in("status", ["approved", "published"]);
  ```

Assim, com o default `approved_only=true`, o endpoint retorna tanto landing pages `approved` quanto `published` — incluindo as 5 atualmente aprovadas. O comportamento opt-in `approved_only=false` continua retornando tudo.

### Validação
1. `curl ".../knowledge-export-full?format=json&include=landing_pages"` → `total_landing_pages >= 5`.
2. `curl ".../knowledge-export-full?format=markdown&include=landing_pages&embed_html=true"` → seção `landing_pages` populada com os `html_card` das 5 LPs.
3. Conferir que `products`, `milestones`, `reviews` continuam intactos (nenhuma outra branch alterada).

### Fora do escopo (decisão)
A inclusão direta da tabela `blog_posts` para resolver `blogs=0` **não** será feita nesta mudança — fica como tarefa separada, pois envolve definir mapeamento de campos (`blog_posts` → schema de `generated_pages`) e política de aprovação distinta. Esta correção foca exclusivamente em `landing_pages`, conforme pedido.
