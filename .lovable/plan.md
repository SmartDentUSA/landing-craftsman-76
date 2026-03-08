

# Plano: Integração do Knowledge System nos Geradores de HTML

## Diagnóstico — O que já existe vs. O que falta

### Já implementado
- AI Summary Block (`ai-summary`, `doc-abstract`) — 5/5 geradores
- LLM Knowledge Layer (`llm-knowledge`, `doc-glossary`) — 5/5 geradores
- Entity Index HTML (Wikidata links) — 5/5 geradores
- DefinedTermSet JSON-LD — 5/5 geradores
- AI Policy meta (`ai-content-policy`) — 5/5 geradores
- JSON-LD @graph (Organization, Product, Person, FAQ, HowTo, etc.) — 5/5 geradores
- GEO Context + Authority Context — SPIN, clone-LP, ecommerce
- `<article class="indexable-content">` wrapper — 5/5 geradores

### Não existe (solicitado pelo usuário)

| Feature | Descrição | Impacto |
|---------|-----------|---------|
| **Entity Reference Meta Tags** | `<meta name="entity:product">`, `<meta name="entity:technology">`, `<meta name="entity:organization">` no HEAD | LLMs identificam entidades sem parsear o body |
| **AI Crawler Policy (expandida)** | `<meta name="ai-crawler-policy" content="allow: GPTBot, ClaudeBot, PerplexityBot, Google-Extended">` | Diretiva explícita por bot |
| **Citation Blocks** | `<blockquote cite="..." class="citation-block">` com dados de especialistas | LLMs citam trechos específicos |
| **LLM Knowledge Layer expandido** | Incluir entidade, categoria, empresa, aplicações, tecnologia, especialistas associados | Camada mais rica que a atual (apenas definição/tecnologia/aplicação) |
| **Entity Index JSON-LD** | Bloco separado com `ItemList` de entidades relacionadas | Complementa o Entity Index HTML |
| **Header com navegação semântica** | Links de categorias e produtos no header vindos do banco | Melhora crawlability |
| **Definition Paragraph** | Parágrafo semântico com `itemprop="description"` após AI Summary | Prioridade para extração |
| **MedicalEntity schema** | JSON-LD para entidades médicas/odontológicas quando aplicável | Google Health |

---

## Plano de Implementação — 3 Módulos

### Módulo 1: Expandir `ai-readiness-helpers.ts` (shared helper)

**Novas funções a criar:**

```text
generateEntityReferenceMetas(params)     → <meta name="entity:product" ...>
generateAICrawlerPolicyMeta()            → <meta name="ai-crawler-policy" ...>
generateCitationBlock(params)            → <blockquote class="citation-block" ...>
generateExpandedKnowledgeLayer(params)   → LLM Knowledge Layer com entidade, categoria, empresa, especialistas
generateEntityIndexJsonLD(params)        → ItemList JSON-LD de entidades relacionadas
generateDefinitionParagraph(params)      → <p itemprop="description" class="definition-paragraph">
```

**Expandir `generateLLMKnowledgeLayer`** para aceitar campos adicionais:
- `entity` (nome da entidade principal)
- `category` (categoria)
- `company` (empresa)
- `applications` (array)
- `associatedExperts` (array de nomes)
- `relatedProducts` (array)

### Módulo 2: Injetar nos 5 geradores (HEAD)

Em cada gerador, adicionar no `<head>`:

1. **Entity Reference Metas** — Extrair automaticamente do produto/solution/company:
   - `entity:product` = nome do produto
   - `entity:technology` = tecnologia principal (de features/keywords)
   - `entity:organization` = nome da empresa
   - `entity:category` = categoria
   - `entity:person` = especialista associado (KOL)

2. **AI Crawler Policy expandida** — Nova meta tag além da existente `ai-content-policy`

3. **Entity Index JSON-LD** — `ItemList` com produtos relacionados, categorias, tecnologias

**Arquivos afetados (HEAD):**
- `generate-ecommerce-html/index.ts` (buildSEOHead)
- `generate-spin-landing-page/generateHTML.ts` (HEAD section)
- `product-blog-html-v2.ts` (HEAD section)
- `clone-landing-page/index.ts` (seoTags injection)
- `src/lib/template-engine.ts` (TEMPLATE_HTML + Mustache vars)

### Módulo 3: Injetar nos 5 geradores (BODY)

Em cada gerador, adicionar no `<body>`:

1. **Definition Paragraph** — Após AI Summary, antes do conteúdo principal. Parágrafo semântico com `itemprop="description"` contendo definição clara da entidade.

2. **Citation Blocks** — Após seções de conteúdo. Usar dados de KOLs/especialistas para gerar blockquotes citáveis com `cite` attribute.

3. **Expanded Knowledge Layer** — Substituir chamada atual de `generateLLMKnowledgeLayer()` pela versão expandida incluindo entidade, empresa, especialistas associados, produtos relacionados.

4. **Entity Index JSON-LD** — Antes do `</article>`, adicionar `<script type="application/ld+json">` com `ItemList` de entidades.

**Arquivos afetados (BODY):**
- Mesmos 5 arquivos do Módulo 2

---

## Detalhamento Técnico

### `generateEntityReferenceMetas()`
```text
Input: { products: string[], technologies: string[], organization: string, categories: string[], persons: string[] }
Output: string (HTML meta tags)
```

### `generateCitationBlock()`
```text
Input: { quote: string, source: string, expertName?: string, expertRole?: string, date?: string }
Output: <blockquote cite="source" class="citation-block" data-ai-hint="citation"> ... </blockquote>
```

### `generateExpandedKnowledgeLayer()`
Evolução do `generateLLMKnowledgeLayer()` atual com campos adicionais:
```text
Input: {
  ...existing params,
  entity: string,
  category: string,
  company: string,
  applications: string[],
  associatedExperts: string[],
  relatedProducts: string[]
}
```

### `generateEntityIndexJsonLD()`
```text
Input: { entities: Array<{type, name, url?}>, pageName: string }
Output: JSON-LD ItemList schema
```

---

## Resumo de Alterações

| Arquivo | Alterações |
|---------|-----------|
| `_shared/ai-readiness-helpers.ts` | +6 novas funções, expandir LLM Knowledge Layer |
| `generate-ecommerce-html/index.ts` | HEAD: entity metas + crawler policy. BODY: definition paragraph + citation block + expanded knowledge + entity JSON-LD |
| `generate-spin-landing-page/generateHTML.ts` | HEAD: entity metas + crawler policy. BODY: definition paragraph + citation block + expanded knowledge + entity JSON-LD |
| `_shared/product-blog-html-v2.ts` | HEAD: entity metas + crawler policy. BODY: definition paragraph + citation block + expanded knowledge + entity JSON-LD |
| `clone-landing-page/index.ts` | HEAD: entity metas + crawler policy. BODY: definition paragraph + citation block + expanded knowledge + entity JSON-LD |
| `src/lib/template-engine.ts` | HEAD: Mustache vars para entity metas + crawler policy. BODY: Mustache vars para definition + citation + expanded knowledge + entity JSON-LD |

**Total: 6 arquivos, ~400 linhas de código novo**

