

# Auditoria Tecnica Completa — Sistema de Geracao de HTML

## PASSO 1 — Geradores de HTML Identificados

O sistema possui **7 geradores de HTML distintos**:

```text
┌─────────────────────────────────────────────────────────────────┐
│  GERADOR                          │ TIPO           │ LINHAS    │
├─────────────────────────────────────────────────────────────────┤
│ 1. src/lib/template-engine.ts     │ Mustache LP    │ 6095      │
│ 2. supabase/functions/            │ Edge Fn SPIN   │ ~3200     │
│    generate-spin-landing-page/    │                │           │
│    generateHTML.ts                │                │           │
│ 3. supabase/functions/            │ Edge Fn Ecomm  │ 2502      │
│    generate-ecommerce-html/       │                │           │
│ 4. supabase/functions/            │ Edge Fn Clone  │ 2840      │
│    clone-landing-page/            │                │           │
│ 5. supabase/functions/_shared/    │ Mustache Blog  │ ~1700     │
│    product-blog-html-v2.ts        │                │           │
│ 6. supabase/functions/_shared/    │ Mustache Blog  │ ~900      │
│    mustache-template-engine.ts    │                │           │
│ 7. supabase/functions/            │ Blog Cloudflare│ ~900      │
│    publish-product-blog-cloudflare│                │           │
│ 8. supabase/functions/            │ Blog post      │ ~600      │
│    publish-blog-post/             │                │           │
│ 9. src/services/seo/              │ Semantic post  │ ~80       │
│    semanticHTMLEnhancer.ts        │ processor      │           │
└─────────────────────────────────────────────────────────────────┘
```

---

## PASSO 2 — SEO Tecnico

### PRESENTE (forte)
- Title tag via Mustache `{{seo_title}}` — todos os geradores
- Meta description — todos os geradores
- Canonical URL — todos os geradores
- Hierarquia H1→H2→H3 — presente nos blogs e ecommerce
- Alt text em imagens — presente em SPIN, blogs, ecommerce
- `meta_robots` forcado para `index, follow` — linha 3628 do template-engine
- Hreflang tags — implementado via `seo-fine-tuning.ts`
- Open Graph + Twitter Cards — completo
- Geo Location Tags (region, placename, ICBM) — presente
- Sitemap reference no `<head>` — presente

### PARCIAL
- `font-display: swap` — usado no Google Fonts link (via URL param `display=swap`), mas nao como declaracao CSS explicita para fontes custom
- `fetchpriority="high"` no LCP — presente em SPIN, product-blog-html-v2, e clone-landing-page; **ausente** no template-engine.ts (LP principal)
- Lazy loading — presente na maioria dos geradores; `content-visibility: auto` aplicado via CSS para `img[loading="lazy"]`

### AUSENTE
- Nenhum `<link rel="preload">` para hero image no template-engine.ts principal (LPs)
- Base64 inline nao e explicitamente bloqueado — SPIN verifica `!heroImageSrc.startsWith('data:')` mas outros geradores nao

---

## PASSO 3 — AI Crawler Readiness

### PRESENTE
- Meta tags `ai-content-type` e `ai-topic` — linhas 80-81 do template-engine.ts
- `<meta name="generator" content="Smart Dent CMS v3.0">` — linha 77

### CRITICO — AUSENTE
- **Nenhuma diretiva para AI bots no robots.txt**: O `generate-robots-txt` configura User-agents apenas para `*`, `Googlebot`, `Bingbot`, `Twitterbot`, `facebookexternalhit`. **Faltam completamente**:
  - `GPTBot` (OpenAI/ChatGPT)
  - `Google-Extended` (Gemini)
  - `CCBot` (Common Crawl / Claude)
  - `PerplexityBot`
  - `ClaudeBot` (Anthropic)
  - `Applebot-Extended` (Apple Intelligence)
- **Nenhum meta tag `ai-content-policy`** em nenhum gerador
- **Nenhum `data-ai-hint`** ou `data-noai` semântico nos HTMLs
- **Nenhum bloco de "AI Summary"** estruturado (resumo explícito para LLMs no topo do conteudo)

---

## PASSO 4 — Structured Data (JSON-LD)

### PRESENTE (excelente cobertura)
| Schema Type         | Onde                                           |
|---------------------|------------------------------------------------|
| Organization        | clone-LP, ecommerce, SPIN, blogs               |
| Product             | ecommerce, clone-LP, product-blog-v2           |
| FAQPage             | ecommerce, clone-LP, blogs, SPIN               |
| HowTo               | clone-LP (via shared module)                   |
| BreadcrumbList      | blogs, clone-LP, mustache-template             |
| Person (E-E-A-T)    | person-schema-helper.ts (KOLs/autores)         |
| WebPage              | ecommerce, clone-LP, SPIN                     |
| WebSite              | clone-LP                                       |
| LocalBusiness       | local-business-helper.ts                       |
| VideoObject          | SPIN, blogs                                   |
| Service             | seo-fine-tuning.ts                             |
| Article/BlogPosting  | blogs, mustache-template                      |

### Campos AI-Readiness no JSON-LD
- `mainEntity` — presente em ecommerce, clone-LP, blogs
- `about` — presente em ecommerce, clone-LP (como array de Things)
- `mentions` — presente em ecommerce, clone-LP
- `speakable` (SpeakableSpecification) — presente em ecommerce, clone-LP, SPIN, blogs
- `sameAs` — expandido via `expandFounderSameAs()` no seo-fine-tuning.ts

### AUSENTE no JSON-LD
- **`sameAs` com URIs Wikidata** — nenhum gerador usa links Wikidata (ver Passo 6)
- **`isPartOf` inconsistente** — presente no clone-LP mas ausente nos outros geradores
- **`potentialAction: SearchAction`** — ausente no WebSite schema (ajuda Google Sitelinks Search Box)

---

## PASSO 5 — Medical Authority

### PRESENTE (forte)
- `Person` schema com:
  - `jobTitle` (ex: "Cirurgião-Dentista")
  - `alumniOf` (EducationalOrganization)
  - `knowsAbout` (array de Things derivadas da especialidade)
  - `award` (premios e reconhecimentos)
  - `worksFor` (organizacao)
  - `honorificPrefix` ("Dr.", "Prof.")
- `hasCredential` com `recognizedBy`:
  - ANVISA → `GovernmentOrganization`
  - FDA → `GovernmentOrganization`
  - ISO → `Organization`
  - INMETRO/CE → `regulatory`
- `hasCredential` aplicado tanto a Organization quanto a Product schemas

### PARCIAL
- **CFO, CRO, OMD** — nao mapeados explicitamente como entidades `recognizedBy`. O sistema mapeia ANVISA, FDA, ISO, mas **falta**:
  - `CRO` (Conselho Regional de Odontologia) como recognizedBy para licencas profissionais
  - `CFO` (Conselho Federal de Odontologia) como autoridade regulatoria
- **medicalSpecialty** — ausente nos schemas de Person/Organization (campo Schema.org valido para MedicalOrganization)

---

## PASSO 6 — Entity Graph (Wikidata)

### AUSENTE COMPLETAMENTE
- **Zero referencias a Wikidata** em todo o codebase
- Os campos `about`, `mentions` e `knowsAbout` usam `{"@type": "Thing", "name": "Odontologia Digital"}` — sem `@id` ou `sameAs` apontando para entidades Wikidata
- Entidades como "Scanner Intraoral", "Zircônia", "CAD/CAM", "Implante Dentário" aparecem como strings de texto, **sem entity linking**

**Impacto**: LLMs e Knowledge Graphs (Google Knowledge Graph) nao conseguem disambiguar as entidades. Um `sameAs: "https://www.wikidata.org/entity/Q1234"` conectaria o conteudo ao grafo de conhecimento global.

---

## PASSO 7 — AI Readiness (LLM Citation)

### PRESENTE
- `SpeakableSpecification` com cssSelectors apontando para H1, H2, p.lead
- Geo context block como `<aside>` com microdata Organization
- Conteudo estruturado em sections semanticas (header, main, article, footer, nav)
- `semanticHTMLEnhancer.ts` converte divs para tags semanticas (section, article)

### AUSENTE
- **AI Summary Block** — nenhum gerador cria um bloco `<div class="ai-summary">` ou `<meta name="description" data-ai-summary>` com resumo estruturado para LLMs citarem
- **`data-ai-context`** — atributos semanticos que LLMs usam para entender contexto nao existem
- **Claim/citation markup** — nenhum uso de `ClaimReview` ou `Claim` schema para afirmacoes tecnicas/medicas
- **`isAccessibleForFree: true`** — ausente nos Article schemas (sinaliza para AI crawlers que o conteudo esta livre para treinamento)

---

## PASSO 8 — Relatorio Final com Scores

### Pontos Fortes
1. Cobertura excepcional de Schema.org (12+ tipos) com @graph pattern
2. E-E-A-T Person schema com alumniOf, knowsAbout, hasCredential — raro em plataformas brasileiras
3. SpeakableSpecification em todos os geradores principais
4. mainEntity + about + mentions pattern implementado consistentemente
5. hasCredential com recognizedBy para ANVISA/FDA/ISO
6. Hreflang multi-idioma implementado
7. Geo context blocks para Local SEO
8. Semantic HTML enforcer como post-processor

### Problemas Encontrados
1. **robots.txt ignora AI bots** — GPTBot, ClaudeBot, PerplexityBot nao tem regras
2. **Zero entity linking Wikidata** — entidades sao strings soltas
3. **Sem AI Summary block** — LLMs nao tem bloco estruturado para citar
4. **template-engine.ts (LP principal) sem fetchpriority** no hero image
5. **CRO/CFO/OMD ausentes** como authoridades regulatorias medicas
6. **Sem SearchAction** no WebSite schema
7. **isAccessibleForFree ausente** nos Article schemas

### Scores

| Dimensao                    | Score | Justificativa                                          |
|-----------------------------|-------|--------------------------------------------------------|
| **AI Crawler Readiness**    | 4/10  | Meta ai-content-type existe, mas robots.txt ignora     |
|                             |       | AI bots; sem ai-content-policy; sem data-ai-hint       |
| **LLM Citation Readiness**  | 6/10  | SpeakableSpecification + mainEntity/about/mentions     |
|                             |       | forte; falta AI Summary block e isAccessibleForFree    |
| **Medical Authority**       | 7/10  | hasCredential ANVISA/FDA/ISO excelente;                |
|                             |       | Person E-E-A-T forte; falta CRO/CFO e                 |
|                             |       | medicalSpecialty                                       |
| **Semantic Entity Graphs**  | 3/10  | Entidades mencionadas como strings; zero Wikidata;     |
|                             |       | sem entity disambiguation                             |

**Score geral: 5/10** — SEO tecnico classico esta em 9/10, mas a camada de AI-readiness esta subdesenvolvida.

---

## PASSO 9 — Melhorias Propostas

### 1. robots.txt — Adicionar AI Bot Directives
**Arquivo**: `supabase/functions/generate-robots-txt/index.ts`
**Onde**: Linha 66, array `userAgents`
**O que**: Adicionar `GPTBot`, `Google-Extended`, `CCBot`, `PerplexityBot`, `ClaudeBot`, `Applebot-Extended` com `Allow: /`

### 2. Entity Linking Wikidata
**Arquivos**: `seo-fine-tuning.ts`, `authority-data-helper.ts`, `person-schema-helper.ts`
**O que**: Criar mapa de entidades dentais com Wikidata IDs:
```text
Odontologia Digital → Q123456
Scanner Intraoral  → Q789012
Zircônia           → Q80235
CAD/CAM            → Q1071923
Implante Dentário  → Q1131395
```
Injetar como `sameAs` nos objetos `Thing` dentro de `about`, `mentions`, `knowsAbout`

### 3. AI Summary Block
**Arquivos**: Todos os geradores de HTML (template-engine.ts, generateHTML.ts, ecommerce, clone-LP, blogs)
**O que**: Injetar bloco semantico apos o H1:
```html
<div class="ai-summary" data-ai-hint="summary" role="doc-abstract">
  <p>[Resumo de 2-3 frases otimizado para citacao por LLMs]</p>
</div>
```

### 4. Medical Authority — CRO/CFO
**Arquivo**: `seo-fine-tuning.ts` funcao `generateHasCredential`
**O que**: Adicionar mapeamento para `CRO`, `CFO`, `OMD` como `GovernmentOrganization` com `recognizedBy`; adicionar `medicalSpecialty` ao Person/Organization schema

### 5. fetchpriority no template-engine.ts
**Arquivo**: `src/lib/template-engine.ts`
**Onde**: Hero image no template Mustache (~linha 33-112 do TEMPLATE_HTML)
**O que**: Adicionar `<link rel="preload" as="image" href="{{hero_image}}" fetchpriority="high">` e `loading="eager" fetchpriority="high"` na img do banner

### 6. isAccessibleForFree + SearchAction
**Arquivos**: Geradores de Article schema (blogs) e WebSite schema (clone-LP)
**O que**: Adicionar `"isAccessibleForFree": true` aos Article schemas; adicionar `"potentialAction": {"@type": "SearchAction", ...}` ao WebSite schema

### 7. Meta ai-content-policy
**Arquivo**: `src/lib/template-engine.ts` (TEMPLATE_HTML head)
**O que**: Adicionar `<meta name="ai-content-policy" content="allow-training, allow-citation">`

### Ordem de implementacao recomendada
1. robots.txt (impacto imediato, 1 arquivo)
2. Meta ai-content-policy (1 linha em 1 template)
3. Entity Linking Wikidata (maior impacto em SEO semantico)
4. AI Summary Block (maior impacto em LLM citation)
5. Medical Authority CRO/CFO (complemento)
6. fetchpriority no template-engine (performance)
7. isAccessibleForFree + SearchAction (complemento)

