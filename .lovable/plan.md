
# Plano: Headlines e Descriptions Atrativos para Google Ads (RSA)

## Problema Atual

Os anuncios RSA do produto estao fracos por 3 razoes:

1. **Preview inicial usa textos genericos hardcoded** -- o usuario ve "Comprar [Nome]", "[Categoria] de Qualidade" antes de clicar "Regenerar IA"
2. **A chamada da IA no produto nao envia os dados certos** -- o `generateAdCopies` envia campos que nao batem com a interface esperada pela edge function (`productId`/`productData` em vez de `seoTitle`/`primaryKeyword`)
3. **O prompt pede apenas 6-8 headlines** quando o Google RSA aceita e recomenda **15 headlines** e **4 descriptions** para melhor performance
4. **Dados ricos do produto sao ignorados** -- `sales_pitch`, `features`, `benefits`, `product_url` nao chegam ao prompt

## Solucao

### 1. Alterar `src/components/google-ads/GoogleAdsProductTab.tsx`

**generateAdCopies (linhas 209-279)**: Corrigir a chamada para enviar os campos corretos:

```text
Antes:
  supabase.functions.invoke('ai-content-generator', {
    body: { type: 'google_ads', productId, productData, keywords }
  })

Depois:
  supabase.functions.invoke('generate-ad-copies', {
    body: {
      seoTitle: product.name,
      seoDescription: product.description || product.sales_pitch,
      primaryKeyword: product.keywords?.[0] || product.name,
      targetAudience: product.category || 'profissionais',
      productContext: {
        name, description, category, subcategory,
        benefits, features, sales_pitch, product_url
      }
    }
  })
```

Chamar a edge function **`generate-ad-copies`** diretamente (que ja tem prompt sofisticado com 15 headlines, pinning, validacao) em vez de `ai-content-generator`.

**validateAndPreview (linhas 166-174)**: Chamar `generateAdCopies` automaticamente na primeira carga, em vez de mostrar headlines genericos.

### 2. Alterar `supabase/functions/generate-ad-copies/index.ts`

Enriquecer o prompt com contexto do produto quando `productContext` for recebido:

- Adicionar `productContext` ao `GenerateRequest` interface
- No prompt, incluir secoes de **beneficios**, **features**, **sales_pitch** e **URL do produto** quando disponiveis
- Manter o prompt existente (15 headlines, 4 descriptions, pinning structure) que ja e excelente
- Adicionar instrucoes para usar beneficios reais nos headlines das posicoes 7-10

### 3. Resultado esperado

| Antes | Depois |
|-------|--------|
| 3 headlines genericos | 15 headlines otimizados com dados reais |
| 2 descriptions vagas | 4 descriptions com beneficios e numeros |
| Paths genericos | Paths baseados em categoria real |
| Requer clique manual "Regenerar IA" | Geracao automatica na abertura |

## Secao Tecnica

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/google-ads/GoogleAdsProductTab.tsx` | Corrigir chamada para `generate-ad-copies`, enviar dados completos do produto, auto-gerar na carga |
| `supabase/functions/generate-ad-copies/index.ts` | Aceitar `productContext` e enriquecer prompt com beneficios/features/sales_pitch |

### Fluxo corrigido

```text
Produto abre modal Google Ads
  -> validateAndPreview carrega sitelinks/videos (como antes)
  -> generateAdCopies() chamado automaticamente
    -> invoke('generate-ad-copies', { ...dados ricos do produto })
    -> IA gera 15 headlines + 4 descriptions com dados REAIS
    -> Preview atualizado com copys atrativas
```

### Dados do produto enviados ao prompt

```text
- name: nome completo
- description: descricao do produto
- sales_pitch: discurso comercial (argumento de venda)
- benefits: lista de beneficios reais
- features: caracteristicas tecnicas
- category / subcategory: para headlines de posicao 1-3
- keywords: para relevancia com buscas
- product_url: para paths
```
