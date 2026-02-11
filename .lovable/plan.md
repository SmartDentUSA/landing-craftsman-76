
# Plano: 5 Melhorias Criticas do Laudo Tecnico

## Resumo

Corrigir os 5 pontos criticos identificados no laudo tecnico para elevar as notas de SEO-GEO-AI de todos os geradores.

---

## 1. Remover fallback hardcoded 698 do SPIN Landing Page

**Arquivo:** `supabase/functions/generate-spin-landing-page/generateHTML.ts` (linha 270)

Trocar `aggregateRating?.reviewCount || 698` por `aggregateRating?.reviewCount || 30` (fallback seguro = contagem minima real da tabela raw_reviews).

**Tambem corrigir nos Knowledge Base endpoints:**
- `supabase/functions/knowledge-base/index.ts` (linhas 312 e 1442)
- `supabase/functions/refresh-knowledge-base/index.ts` (linha 217)

Nesses arquivos, trocar `|| 698` por `|| 30` para manter consistencia com o valor dinamico real.

---

## 2. Ativar enrichSchemaWithAIContext no template-engine.ts

**Arquivo:** `src/lib/template-engine.ts` (~linha 5029-5034)

Antes de serializar o `schemaGraph` em JSON (linha 5031), chamar `enrichSchemaWithAIContext` como "safety net":

```text
// Import dinamico
const { enrichSchemaWithAIContext } = await import('@/services/seo/advancedSchemaEnhancer');

// Enriquecer schemas com about/mentions/mainEntity como safety net
const enrichedGraph = enrichSchemaWithAIContext(schemaGraph, companyProfile, data.selectedProductsForSEO || []);

// Serializar o graph enriquecido
processedData.schema_json_ld = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": enrichedGraph
});
```

Isso garante que QUALQUER LP gerada pelo template engine receba automaticamente `about`, `mentions`, `mainEntity` e `speakable` caso algum desses campos esteja ausente.

---

## 3. Adicionar entityDefinitionInjector (GEO Context) no E-commerce

**Arquivo:** `supabase/functions/generate-ecommerce-html/index.ts` (~linha 2373-2382)

O e-commerce ja possui `authorityContextHTML` mas nao tem o bloco GEO Entity Definition estruturado. Adicionar um bloco `<aside class="geo-context">` com microdata Organization apos o Authority Context, usando os dados de `company` ja disponiveis no escopo.

O bloco incluira: nome da empresa, descricao, setor, area de atuacao, certificacoes, e expertise tecnica -- identico ao padrao do `entityDefinitionInjector.ts` mas implementado inline (pois edge functions nao importam modulos do `src/`).

---

## 4. Adicionar entityDefinitionInjector (GEO Context) no Clone LP

**Arquivo:** `supabase/functions/clone-landing-page/index.ts`

O clone ja possui um bloco `geo-context` basico (linha ~2408-2412) com apenas 1 paragrafo. Expandir esse bloco para incluir campos estruturados completos: setor, expertise, publico-alvo, areas de servico, certificacoes -- alinhado com o padrao Enterprise do `entityDefinitionInjector.ts`.

Isso sera feito na funcao `injectSEO` que ja monta o footer GEO context.

---

## 5. Aplicar lazy loading automatico em imagens do Clone LP

**Arquivo:** `supabase/functions/clone-landing-page/index.ts`

Adicionar uma funcao `addLazyLoadingToImages` no `processLandingPage` (apos o Step 4.5 de rewrite image attributes, ~linha 2564):

```text
function addLazyLoadingToImages(html: string): string {
  // Adicionar loading="lazy" e decoding="async" em <img> sem esses atributos
  // Excecao: primeira imagem (hero/LCP) recebe loading="eager" + fetchpriority="high"
  let imgIndex = 0;
  return html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    if (attrs.includes('loading=')) return match; // ja tem
    imgIndex++;
    if (imgIndex === 1) {
      return `<img${attrs} loading="eager" fetchpriority="high">`;
    }
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
}
```

Chamar essa funcao apos `rewriteImageAttributes` no pipeline de processamento.

---

## Secao Tecnica

### Arquivos modificados

| Arquivo | Alteracao |
|---------|----------|
| `generate-spin-landing-page/generateHTML.ts` | `|| 698` -> `|| 30` (linha 270) |
| `knowledge-base/index.ts` | `|| 698` -> `|| 30` (linhas 312 e 1442) |
| `refresh-knowledge-base/index.ts` | `|| 698` -> `|| 30` (linha 217) |
| `src/lib/template-engine.ts` | Chamar `enrichSchemaWithAIContext` antes da serializacao (~linha 5030) |
| `generate-ecommerce-html/index.ts` | Injetar bloco GEO Entity Definition apos authority context (~linha 2381) |
| `clone-landing-page/index.ts` | Expandir geo-context existente + adicionar `addLazyLoadingToImages` |

### Edge Functions a re-deployar
- generate-spin-landing-page
- knowledge-base
- refresh-knowledge-base
- generate-ecommerce-html
- clone-landing-page

### Impacto esperado
- Eliminacao total do fallback 698 em todo o sistema
- Safety net automatica via enrichSchemaWithAIContext no template engine
- GEO Entity Definition presente em TODOS os geradores (antes faltava em E-commerce e Clone)
- Core Web Vitals (LCP/CLS) melhorados no Clone LP via lazy loading automatico
