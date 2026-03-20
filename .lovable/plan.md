

# Fix: Exportação LLM falhando por timeout no banco de dados

## Causa raiz

Os logs da Edge Function `knowledge-base` mostram:
```
"canceling statement due to statement timeout"
```

A query `SELECT * FROM products_repository` com `limit: 1000` está retornando **todas as colunas** (incluindo campos JSONB massivos como `technical_documents`, `clinical_brain`, `original_data`, etc.), causando timeout no Supabase.

O cache está expirado (3h TTL), então toda chamada bate direto no banco.

## Plano de correção

### 1. Otimizar query de produtos — selecionar apenas colunas necessárias

**Arquivo:** `supabase/functions/knowledge-base/index.ts` (linhas 1828-1831)

Substituir `select('*')` por uma lista explícita de colunas essenciais para RAG/LLM, excluindo campos pesados desnecessários:

```typescript
const essentialColumns = 'id,name,description,category,subcategory,price,promo_price,currency,brand,image_url,images_gallery,product_url,slug,canonical_url,keywords,benefits,features,target_audience,search_intent_keywords,market_keywords,tags,sales_pitch,faq,youtube_videos,workflow_stages,competitors,clinical_brain_rules,anti_hallucination_rules,required_products,forbidden_products,seo_title_override,seo_description_override,approved,use_in_ai,availability,condition,gtin,mpn,google_product_category,display_order,created_at';

let query = supabase
  .from('products_repository')
  .select(essentialColumns)
  .order('name');
```

Isso exclui `original_data`, `technical_documents` (já buscados separadamente), `resource_cta1/2/3`, e outros campos pesados não usados no RAG.

### 2. Reduzir limit padrão no frontend

**Arquivo:** `src/components/RepositoryPanel.tsx` (linha 818)

Mudar `limit: 1000` para `limit: 200` (mais razoável para exportação).

### 3. Adicionar tratamento de timeout com retry

**Arquivo:** `supabase/functions/knowledge-base/index.ts` (linhas 1846-1851)

Adicionar retry com select reduzido caso a primeira query falhe:

```typescript
let { data: products, error: productsError } = await query;

if (productsError?.code === '57014') {
  // Timeout — retry com colunas mínimas
  console.warn('⚠️ Product query timeout, retrying with minimal columns...');
  const { data: minProducts, error: retryError } = await supabase
    .from('products_repository')
    .select('id,name,description,category,price,keywords,benefits,features,slug,image_url,approved')
    .eq('approved', true)
    .limit(100);
  
  if (retryError) throw retryError;
  products = minProducts;
}
```

### 4. Remover busca duplicada de technical_documents

A query principal já busca tudo com `SELECT *`, e depois linhas 1948-1970 fazem **outra query** para `technical_documents`. Com a otimização do passo 1, essa segunda query se torna o único local onde buscamos docs técnicos — mantê-la mas apenas se necessário.

## Resultado esperado

- Query de produtos reduzida de ~50 colunas para ~35 colunas essenciais
- Limit reduzido de 1000 para 200
- Fallback automático em caso de timeout
- Exportação LLM volta a funcionar

