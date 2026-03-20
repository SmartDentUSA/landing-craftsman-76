

# Fix: Repositório não carrega — 2 problemas encontrados

## Diagnóstico

### Problema 1: Tabela `company_profile` tem 2 registros
Existem 2 linhas:
- `edeec15d` — "Nova Empresa" (criada em 14/out, 00:26 — registro fantasma)
- `3b20b85d` — "Smart Dent" (criada em 14/out, 02:15 — o registro real)

Isso causa o erro `PGRST116: JSON object requested, multiple (or no) rows returned` que aparece repetidamente nos logs. Qualquer código que use `.single()` ou `.maybeSingle()` na tabela `company_profile` falha ou retorna resultado inesperado.

### Problema 2: Query de produtos usa `SELECT *` com join de `variations`
O `RepositoryPanel.tsx` faz `select('*, variations')` sem limitar colunas, puxando campos JSONB pesados (`original_data`, `technical_documents`, `clinical_brain`, etc.) de 120+ produtos. Isso causa timeout (erro `57014`) no Supabase, como já visto nos logs do `save-landing-page`.

## Plano de correção

### Etapa 1: Remover registro duplicado de `company_profile`
SQL migration para deletar o registro "Nova Empresa" (`id = edeec15d-4147-4382-bda4-e640e243ed19`), mantendo apenas o "Smart Dent".

### Etapa 2: Otimizar query de produtos no RepositoryPanel
**Arquivo:** `src/components/RepositoryPanel.tsx` (linhas 364-371)

Substituir `select('*, variations')` por uma lista explícita de colunas necessárias para o painel, excluindo campos pesados como `original_data`, `technical_documents`, `clinical_brain`:

```typescript
const { data, error } = await supabase
  .from('products_repository')
  .select('id,name,description,category,subcategory,price,promo_price,currency,brand,image_url,images_gallery,product_url,slug,canonical_url,keywords,benefits,features,target_audience,search_intent_keywords,market_keywords,tags,sales_pitch,faq,youtube_videos,instagram_videos,technical_videos,testimonial_videos,video_captions,technical_specifications,bot_trigger_words,approved,use_in_ai,availability,condition,gtin,mpn,google_product_category,display_order,created_at,selected,show_in_resources,resource_cta1,resource_cta2,resource_cta3,offer_discount_cta,individual_blog_content,seo_title_override,seo_description_override,ai_generated_keywords,ai_generated_category,stock_managed,stock_quantity,min_order_quantity,max_order_quantity,variations')
  .eq('approved', showUnapproved ? false : true)
  .order('display_order', { ascending: true });
```

### Arquivos a editar
| Arquivo | Acao |
|---------|------|
| SQL Migration | Deletar registro "Nova Empresa" duplicado |
| `src/components/RepositoryPanel.tsx` | Otimizar select de produtos |

