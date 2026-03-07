

# Auditoria AI-Ready Semantic Article Structure — Estado Atual

## Checklist por Gerador

```text
ARQUITETURA IDEAL              │ ecommerce │ SPIN  │ blog-v2 │ clone-LP │ template-engine │
═══════════════════════════════╪═══════════╪═══════╪═════════╪══════════╪═════════════════╡
HEAD                           │           │       │         │          │                 │
 ├ SEO (title/desc/canonical)  │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 ├ OpenGraph                   │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 ├ Twitter Cards               │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 ├ AI policy meta              │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 └ JSON-LD @graph              │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
                               │           │       │         │          │                 │
BODY                           │           │       │         │          │                 │
 ├ <header>                    │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 │                             │           │       │         │          │                 │
 ├ <article> wrapper           │ ❌        │ ✅    │ ✅      │ ❌       │ ❌              │
 │   ├ H1                      │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 │   ├ AI summary block        │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 │   ├ Hero image              │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
 │   │                         │           │       │         │          │                 │
 │   ├ Definition paragraph    │ ✅        │ ✅    │ ✅      │ ⚠️ gen   │ ⚠️ Mustache     │
 │   ├ Technology explanation   │ ✅        │ ✅    │ ✅      │ ⚠️ gen   │ ⚠️ Mustache     │
 │   ├ Clinical application    │ ✅        │ ✅    │ ✅      │ ⚠️ gen   │ ⚠️ Mustache     │
 │   │                         │           │       │         │          │                 │
 │   ├ LLM knowledge layer     │ ✅        │ ❌    │ ✅      │ ❌       │ ❌              │
 │   │                         │           │       │         │          │                 │
 │   └ Entity index            │ ✅*       │ ❌    │ ✅*     │ ✅       │ ✅              │
 │                             │           │       │         │          │                 │
 └ <footer>                    │ ✅        │ ✅    │ ✅      │ ✅       │ ✅              │
                               │           │       │         │          │                 │
JSON-LD EXTRAS                 │           │       │         │          │                 │
 ├ DefinedTermSet              │ ✅        │ ✅    │ ✅      │ ✅       │ ❌              │
 ├ isAccessibleForFree         │ ✅        │ ✅    │ ✅      │ ✅       │ ❌              │
 └ SearchAction                │ ✅        │ ✅    │ ✅      │ ✅       │ ❌              │

* Entity Index: ecommerce e blog geram mas posicao pode estar fora do <article>
```

## Resumo dos Problemas

### ❌ FAIL — 7 itens

1. **`<article>` wrapper ausente em ecommerce** — Conteudo e montado com `html +=` direto, sem wrapper `<article>`. Conteudo fica solto no body.

2. **`<article>` wrapper ausente em clone-LP** — HTML clonado nao e envolvido em `<article>`.

3. **`<article>` wrapper ausente em template-engine** — Usa `<main id="main-content">` mas sem `<article>` interno.

4. **LLM Knowledge Layer ausente em SPIN** — Importa `generateAISummaryBlock` e chama-o, mas **nunca chama** `generateLLMKnowledgeLayer`. O import esta no arquivo mas a funcao nao e usada.

5. **LLM Knowledge Layer ausente em clone-LP** — Nao importa nem chama `generateLLMKnowledgeLayer`.

6. **LLM Knowledge Layer ausente em template-engine** — Client-side, nenhuma logica de knowledge layer existe.

7. **Entity Index ausente em SPIN** — Importa `generateEntityIndexHTML` mas **nunca chama** no HTML output.

### ❌ FAIL — 3 itens (template-engine exclusivo)

8. **DefinedTermSet ausente no template-engine** — JSON-LD nao inclui DefinedTermSet.

9. **isAccessibleForFree ausente no template-engine** — Schemas de Article nao incluem este campo.

10. **SearchAction ausente no template-engine** — WebSite schema nao tem potentialAction.

---

## Plano de Correcao — 5 arquivos, 10 fixes

### Fix 1: `<article>` wrapper em ecommerce
**Arquivo**: `generate-ecommerce-html/index.ts` (~linha 1924)
Envolver todo o conteudo do produto (H1 ate entity index) em `<article class="indexable-content" itemscope itemtype="https://schema.org/Product">`.

### Fix 2: `<article>` wrapper em clone-LP
**Arquivo**: `clone-landing-page/index.ts`
Injetar `<article>` wrapper no conteudo principal antes do `</body>` inject.

### Fix 3: `<article>` wrapper em template-engine
**Arquivo**: `src/lib/template-engine.ts` (~linha 2014)
Adicionar `<article class="indexable-content">` dentro do `<main>`, apos o H1 e AI summary.

### Fix 4: LLM Knowledge Layer no SPIN
**Arquivo**: `generate-spin-landing-page/generateHTML.ts` (~linha 2686, antes do `</article>`)
Chamar `generateLLMKnowledgeLayer()` com dados da solution (pain_description, sales_pitch, benefits).

### Fix 5: Entity Index no SPIN
**Arquivo**: `generate-spin-landing-page/generateHTML.ts` (~linha 2690, antes do `</main>`)
Chamar `generateEntityIndexHTML()` com o spinContentText ja disponivel.

### Fix 6: LLM Knowledge Layer no clone-LP
**Arquivo**: `clone-landing-page/index.ts` (~linha 2082)
Importar `generateLLMKnowledgeLayer` e injetar junto com AI Summary antes do `</body>`.

### Fix 7: LLM Knowledge Layer no template-engine
**Arquivo**: `src/lib/template-engine.ts`
Adicionar variavel Mustache `{{{llm_knowledge_block}}}` e gerar client-side com dados do produto/servico.

### Fix 8-10: DefinedTermSet + isAccessibleForFree + SearchAction no template-engine
**Arquivo**: `src/lib/template-engine.ts` (funcao de JSON-LD)
Injetar DefinedTermSet usando WIKIDATA_QUICK_MAP, adicionar `isAccessibleForFree: true` e `SearchAction` no schema.

