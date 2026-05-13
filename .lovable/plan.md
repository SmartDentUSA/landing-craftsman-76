## Diagnóstico (a partir dos relatórios do Search Console + estado real)

Cruzei os 7 XLSX com o que está no banco e o que cada domínio devolve hoje. Os "404" e "Cópia sem canônica" reportados pelo Google têm causas concretas e reproduzíveis:

### 1) Homepages 404 (causa #1 das indexações zeradas)
A raiz `/` retorna 404 nestes domínios:
- dentala.com.br, eodonto.com, rayshape.com.br, rayshape3d.com.br, truioconnect.com.br, minivat.com, printsafebr.com.br

Confirmação no banco: nenhuma linha com `page_path = '/'` para esses domínios em `cloned_landing_pages`. O snapshot bulk publicado no Cloudflare Pages, portanto, não inclui `index.html` na raiz. Sem homepage o Google "rastreia" os artigos do blog mas trata o site como quebrado e limita a indexação.

### 2) Sitemap publica `/robots.txt`, `/sitemap.xml` e `/feed.xml` como URLs de página
Esses três caminhos foram cadastrados como `cloned_landing_pages` (publish_status = success/pending_deploy) e entram no sitemap como `<url><loc>` normal. O Search Console marca como 404 ou duplicata. Eles devem ser arquivos servidos pelo publisher, não páginas SEO.

### 3) Slugs quebrados gerados pelo clonador (em /en e /es)
Exemplo real (rayshape):
- `/en/blog/ental-3-re-printing-ssential-hecklist` (deveria ser `dental-3d-pre-printing-essential-checklist`)
- `/es/blog/preparacao-da-impressora-3d-guia-essencial-1-es` (slug PT salvo como ES)

Padrão: o slugifier está cortando a primeira letra de cada palavra após traduzir, e o fallback em ES está reusando o slug PT acrescentando "-1-es". Isso gera 404 cruzados, canonicals inconsistentes e páginas órfãs.

### 4) Divergência sitemap × canonical por trailing slash
Sitemap publica `https://dentala.com.br/blog/x` (sem barra). Cloudflare Pages responde 308 → `/blog/x/` e a página servida tem `<link rel="canonical" href=".../x/">`. Resultado no GSC: "Página com redirecionamento" e "Cópia sem canônica selecionada pelo usuário". Solução: o sitemap deve conter exatamente a URL canônica final.

### 5) Páginas duplicadas em DB com `pending_deploy`
Cada domínio tem 3 registros `pending_deploy` (justamente robots/sitemap/feed). Eles ficam órfãos no painel e poluem qualquer query de "publicadas".

---

## Plano de correção

### Fase 1 — Limpar o sitemap (deploy imediato)
1. Em `supabase/functions/generate-sitemap/index.ts`, filtrar `cloned_landing_pages` excluindo `page_path` em `('/robots.txt','/sitemap.xml','/feed.xml','/feed','/sitemap','/sitemap_index.xml')` e qualquer caminho terminado em `.xml` ou `.txt`.
2. Normalizar todas as `<loc>` para terminar com `/` (exceto a raiz e arquivos), batendo com a canônica que o Cloudflare serve.
3. Remover do XML qualquer entrada cuja `lang` não corresponda ao prefixo (`/es/...` deve ter `lang='es'`).
4. Manter a homepage do domínio APENAS se existir registro `page_path='/'` publicado.

### Fase 2 — Garantir homepage `/` em todos os domínios
Para cada domínio sem `/`, criar uma página de Marca/Hub mínima (hero + lista de últimos artigos do blog do domínio + CTA Smart Dent), reutilizando o template do blog index. Domínios afetados:
- dentala.com.br, eodonto.com, rayshape.com.br, rayshape3d.com.br, truioconnect.com.br, minivat.com, printsafebr.com.br

Implementação: nova função `generate-domain-homepage` (ou estender `generate-blog-index`) que cria/atualiza um registro `cloned_landing_pages` com `page_path='/'`, `is_homepage=true`, canonical = `https://{dominio}/`. Em seguida disparar `republish-domain-cloudflare-bulk` para cada domínio.

### Fase 3 — Arrumar o slugifier multilíngue
Em `supabase/functions/clone-landing-page/index.ts` (e helpers de slug):
1. Não aplicar nenhum corte de "letra inicial". Investigar o regex que está produzindo `ental-3-re-printing-ssential-hecklist` — provavelmente um `replace(/^[bcdfgjkpt]/, '')` ou uma lib de transliteração mal usada.
2. Para `lang != 'pt'`, exigir um título traduzido antes de gerar o slug; nunca cair em "slug PT + sufixo `-1-es`". Se a tradução falhar, abortar e marcar a página como `error` (não publicar lixo).
3. Backfill: rodar uma migration que liste todos os slugs em `/en/...` e `/es/...` que (a) divergem do padrão idiomático ou (b) estão truncados (primeiros 3 chars do slug não batem com primeiros 3 chars do título normalizado), e marcar `publish_status='error'` para reprocessamento manual ou regerar via função.

### Fase 4 — Robots/sitemap/feed deixam de ser páginas
1. Excluir do banco todos os registros com `page_path` em `('/robots.txt','/sitemap.xml','/feed.xml')` (44 linhas no total).
2. O publisher do Cloudflare Pages já gera/serve `/robots.txt` e `/sitemap.xml` próprios — confirmar em `republish-domain-cloudflare-bulk` que esses dois arquivos são montados a partir de fontes oficiais (robots template + função `generate-sitemap`) e não a partir de `cloned_landing_pages`.

### Fase 5 — Republicação em massa + ping ao Google
1. Rodar `republish-domain-cloudflare-bulk` para os 9 domínios afetados.
2. `curl https://www.google.com/ping?sitemap=https://{dominio}/sitemap.xml` para cada um.
3. No GSC, "Validar correção" em cada erro listado nos XLSX.

### Fase 6 — Validação
- `curl -I https://{dominio}/` → 200 em todos os 9 domínios.
- `curl -s https://{dominio}/sitemap.xml | grep -c '<loc>'` bate com `count(*)` de `cloned_landing_pages` publicadas (excluídos robots/feed/sitemap).
- Spot-check de 5 URLs por domínio: 1 canonical, 1 robots `index, follow`, sitemap loc == canonical.
- Teste no Rich Results e URL Inspection do GSC para 2 URLs por domínio.

---

## Detalhes técnicos (referência)

Arquivos tocados:
- `supabase/functions/generate-sitemap/index.ts` — filtros + normalização trailing slash.
- `supabase/functions/clone-landing-page/index.ts` — slugifier e gating multilíngue.
- `supabase/functions/republish-domain-cloudflare-bulk/index.ts` — confirmar geração de `/robots.txt` e `/sitemap.xml` a partir de fonte oficial.
- Nova função `generate-domain-homepage` (ou estender `generate-blog-index`).
- Migration: `DELETE FROM cloned_landing_pages WHERE page_path IN ('/robots.txt','/sitemap.xml','/feed.xml')`.
- Migration de auditoria/marcação dos slugs `/en/...` e `/es/...` quebrados.

Domínios sem `/` que precisam homepage criada (7):
```
dentala.com.br, eodonto.com, rayshape.com.br, rayshape3d.com.br,
truioconnect.com.br, minivat.com, printsafebr.com.br
```

Métricas a acompanhar no GSC após validar:
- "Não encontrado (404)": queda de >80% em 7 dias.
- "Cópia sem página canônica selecionada pelo usuário": queda para 0–2.
- "Indexados": começa a subir após o primeiro recrawl (3–10 dias).
