

# Plano: Ativar AI-Readiness no HTML Gerado

## Diagnostico

O sistema possui helpers prontos em `ai-readiness-helpers.ts` (Wikidata linking, AI Summary Block, Article AI readiness) mas eles sao **codigo morto** — importados mas nunca chamados para injetar HTML. Alem disso, faltam 2 blocos novos que o usuario solicitou: **LLM Knowledge Layer** e **Entity Index**.

### Status atual por gerador

| Gerador | Wikidata (JSON-LD) | AI Summary (HTML) | Knowledge Layer | Entity Index | DefinedTermSet |
|---------|--------------------|--------------------|-----------------|--------------|----------------|
| ecommerce-html | `enrichGraphWithAIReadiness` chamado | importado, nunca chamado | ausente | ausente | ausente |
| clone-landing-page | `enrichGraphWithAIReadiness` chamado | importado, nunca chamado | ausente | ausente | ausente |
| product-blog-html-v2 | `enrichGraphWithAIReadiness` chamado | importado, nunca chamado | ausente | ausente | ausente |
| SPIN landing page | nenhum import | ausente | ausente | ausente | ausente |
| template-engine.ts (LP) | nenhum (client-side) | ausente | ausente | ausente | ausente |

---

## Implementacao (7 arquivos)

### 1. Expandir `ai-readiness-helpers.ts` com 3 novos blocos

Adicionar funcoes:
- **`generateLLMKnowledgeLayer()`** — gera bloco HTML semantico `<aside class="llm-knowledge" data-ai-hint="knowledge">` com definicao, tecnologia e aplicacao clinica (visually hidden, semanticamente acessivel)
- **`generateEntityIndexHTML()`** — gera bloco `<nav class="entity-index" data-ai-hint="entities">` com links Wikidata para entidades detectadas no conteudo
- **`generateDefinedTermSetSchema()`** — gera JSON-LD `DefinedTermSet` com termos do produto mapeados para Wikidata

### 2. Ativar nos 4 geradores server-side

**`generate-ecommerce-html/index.ts`** (~linha 1925, apos o H1):
- Chamar `generateAISummaryBlock()` com dados do produto
- Chamar `generateLLMKnowledgeLayer()` com definicao, tecnologia e aplicacao
- No final do HTML, chamar `generateEntityIndexHTML()`
- No schema @graph, adicionar `DefinedTermSet`

**`clone-landing-page/index.ts`**:
- Chamar `generateLandingPageAISummary()` (ja importado, nunca chamado)
- Adicionar entity index no footer

**`product-blog-html-v2.ts`**:
- Chamar `generateAISummaryBlock()` apos o H1 do artigo
- Adicionar knowledge layer e entity index

**`generate-spin-landing-page/generateHTML.ts`**:
- Importar e chamar `generateAISummaryBlock()` e `generateEntityIndexHTML()`

### 3. Template-engine.ts (client-side LP)

Adicionar variaveis Mustache para os blocos AI:
- `{{ai_summary_block}}` — injetado apos o H1
- `{{entity_index_block}}` — injetado antes do footer
- Popular essas variaveis na funcao `generateLandingPage()`

---

## Detalhes Tecnicos

### AI Summary Block (ja existe, so precisa chamar)
```html
<div class="ai-summary" data-ai-hint="summary" role="doc-abstract" 
     style="position:absolute;width:1px;height:1px;...clip:rect(0,0,0,0);">
  <p>A Atos Unichroma e uma resina composta unicromatica bulk fill...</p>
</div>
```

### LLM Knowledge Layer (novo)
```html
<aside class="llm-knowledge" data-ai-hint="knowledge" role="doc-glossary"
       style="position:absolute;width:1px;height:1px;...clip:rect(0,0,0,0);">
  <dl>
    <dt>Definicao</dt>
    <dd>Resina composta unicromatica bulk fill...</dd>
    <dt>Tecnologia</dt>
    <dd>SMART CARE FOTOCROMA...</dd>
    <dt>Aplicacao clinica</dt>
    <dd>Restauracoes classes I, II, III, IV e V</dd>
  </dl>
</aside>
```

### Entity Index (novo)
```html
<nav class="entity-index" data-ai-hint="entities" aria-label="Entidades Relacionadas"
     style="position:absolute;width:1px;height:1px;...clip:rect(0,0,0,0);">
  <ul>
    <li><a href="https://www.wikidata.org/entity/Q899928">Resina Composta</a></li>
    <li><a href="https://www.wikidata.org/entity/Q12128">Odontologia</a></li>
  </ul>
</nav>
```

### DefinedTermSet Schema (novo no JSON-LD)
```json
{
  "@type": "DefinedTermSet",
  "name": "Termos de Odontologia Digital",
  "hasDefinedTerm": [
    {
      "@type": "DefinedTerm",
      "name": "Scanner Intraoral",
      "description": "Dispositivo digital...",
      "sameAs": "https://www.wikidata.org/entity/Q113534653"
    }
  ]
}
```

---

## Ordem de execucao

1. Expandir `ai-readiness-helpers.ts` com as 3 novas funcoes
2. Ativar em `generate-ecommerce-html/index.ts`
3. Ativar em `clone-landing-page/index.ts`
4. Ativar em `product-blog-html-v2.ts`
5. Ativar em `generate-spin-landing-page/generateHTML.ts`
6. Ativar em `src/lib/template-engine.ts`

