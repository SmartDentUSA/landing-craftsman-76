## Diagnóstico confirmado

As páginas LP Clone **não têm `noindex`**. Verifiquei direto nas páginas vivas:

```
$ curl https://mediti700.com.br/medit_i700_wireless/
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">  ← injetada por nós
<meta name="robots" content="max-image-preview:large" />                                ← original WP (não removida)
```

O Google está marcando como **"Página alternativa com tag canônica adequada"** (categoria do GSC que aparece como "não indexada"). Causa real:

### Bug 1 — canonical aponta para outro domínio (CRÍTICO)

`supabase/functions/clone-landing-page/index.ts` (linhas 256-262 e 1694) monta o canonical com `companyData.website_url`, que é fixo `https://smartdent.com.br`. Resultado real em todos os domínios:

| URL servida                                      | Canonical declarado                                                        |
|--------------------------------------------------|----------------------------------------------------------------------------|
| `https://mediti700.com.br/medit_i700_wireless/`  | `https://smartdent.com.br//medit-scanner-intraoral-medit-i700-wireless`    |
| `https://mediti700.com.br/`                      | `https://smartdent.com.br//medit-scanner-intraoral-medit-i700`             |
| `https://mediti900.com/`                         | `https://smartdent.com.br//medit-scanner-intraoral-medit-i900`             |

O Google obedece o canonical: descarta a URL servida e tenta indexar o destino apontado (que muitas vezes nem existe). É exatamente o que está acontecendo — **todos os domínios sem páginas indexadas**.

Bônus do mesmo bug: **double slash** (`smartdent.com.br//slug`) — canonical inválido.

### Bug 2 — duas tags `<meta name="robots">` no HTML final

A regex de sanitização (linhas 1655-1666) remove `description`, `og:*`, `twitter:*`, `canonical`, `keywords`, `geo.*`, `ICBM`, `ld+json`, mas **não remove `<meta name="robots">`** original do WordPress clonado. Sobrevivem duas tags conflitantes na mesma página.

---

## Plano de correção

### Edição 1 — `supabase/functions/clone-landing-page/index.ts`

**A) Canonical correto por target_domain**
- Propagar `targetDomain` e `pagePath` (já existem em `cloned_landing_pages`) até o bloco que injeta `seoTags` (linha 1990).
- Substituir a montagem do canonical por:
  ```ts
  const canonicalHost = (targetDomain || websiteUrl)
    .replace(/^https?:\/\//, '').replace(/\/$/, '');
  const canonicalPathClean = (pagePath || `/${slug}`).replace(/\/+$/, '') || '/';
  const canonical = canonicalPathClean === '/'
    ? `https://${canonicalHost}/`
    : `https://${canonicalHost}${canonicalPathClean}`;
  ```
- Aplicar a mesma fórmula no fallback `seoConfig.canonical || websiteUrl` (linha 1694).
- Atualizar todos os usos derivados (`og:url`, `@id` do `webpage`/`product`, `BreadcrumbList`) para usarem o novo `canonical` — eles já referenciam a mesma variável, então a correção propaga.

**B) Strip da meta robots herdada do HTML clonado**
Adicionar à lista de regex em `result.replace(...)` (após linha 1666):
```ts
.replace(/<meta[^>]*name=["']robots["'][^>]*>/gi, '')
.replace(/<meta[^>]*name=["']googlebot["'][^>]*>/gi, '')
.replace(/<meta[^>]*name=["']bingbot["'][^>]*>/gi, '')
```

### Edição 2 — Republicação em massa

Listar todos os `target_domain` distintos com `publish_status='success'` e disparar `republish-domain-cloudflare-bulk` para cada um. Vou usar:
```sql
SELECT DISTINCT target_domain
FROM cloned_landing_pages
WHERE publish_status='success';
```
e iterar chamando a edge function (uma única deployment por domínio, conforme já implementado).

### Edição 3 — Validação automática pós-deploy
Para cada domínio republicado:
```bash
curl -s https://<dominio>/<path> \
  | grep -E '<link[^>]*canonical|<meta[^>]*robots'
```
Critério de aceite:
- **1** `<meta name="robots">` apenas, contendo `index, follow`.
- Canonical com **mesmo host da URL servida**, sem `//` duplicado.
- `og:url` igual ao canonical.

### Edição 4 — Solicitar reindexação
Após validar, instruir você a:
- Submeter os sitemaps de cada domínio no GSC (já existem via `generate-sitemap`).
- Usar "Inspecionar URL → Solicitar indexação" em 1-2 URLs amostrais por domínio.

---

## O que NÃO vou alterar
- `robots.txt` (sem bloqueio).
- Headers `X-Robots-Tag` (não existem).
- Geradores de blog, e-commerce, SPIN, local SEO (canonicals deles já estão corretos).
- Lógica de SEO/Schema/Tracking — só canonical + sanitização de meta robots.

Após aprovação, aplico as 2 correções e disparo a republicação em todos os domínios afetados.