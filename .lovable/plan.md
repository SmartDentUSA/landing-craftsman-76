# Apostila Completa — Exportar TUDO

## Diagnóstico

A função `supabase/functions/export-complete-handbook/index.ts` (acionada pelo botão "Exportar Apostila Completa" em `CompleteHandbookExporter.tsx`) busca o produto com `select('*')` mas a seção `generateProductsMarkdown` só renderiza ~8 campos. Dezenas de campos ricos do `products_repository` ficam de fora. A seção da empresa está mais completa, mas também tem lacunas (vários blocos JSON com inteligência clínica/comercial não saem).

## O que está saindo hoje por produto
SKU, preço, marca, subcategoria, disponibilidade, URL, descrição, benefícios, specs técnicas, FAQ, keywords.

## O que vou adicionar por produto
- **Identidade & e-commerce:** slug, canonical_url, gtin, mpn, ean, condition, currency, google_product_category, stock_quantity, featured, showcase, approved, active
- **Atributos físicos:** color, size, material, weight, height, width, depth
- **Mídia:** image_url, images_gallery (todas), youtube_videos, instagram_videos, tiktok_videos, technical_videos, testimonial_videos, video_captions (transcrições)
- **Documentos técnicos:** technical_documents (nome + URL download), document_transcriptions
- **Conteúdo de vendas/IA:** sales_pitch, applications, features, target_audience, individual_blog_content, ecommerce_html (referência)
- **Conteúdo social pronto:** instagram_copies, youtube_descriptions, tiktok_content, whatsapp_messages, whatsapp_sequences, after_sales_messages
- **Recursos & CTAs:** resource_cta1/2/3, resource_descriptions, tutorial_resources, offer_discount_cta
- **Workflow/Fluxo clínico:** workflow_stages completo (etapas com `description`, `competitive_advantages`, `related_products`)
- **Inteligência competitiva:** competitor_comparison (tabela markdown), required_products, forbidden_products
- **Anti-alucinação:** anti_hallucination_rules (never_claim, never_mix_with, always_require, always_explain)
- **Keywords expandidas:** market_keywords, search_intent_keywords, bot_trigger_words, tags
- **SEO overrides:** seo_title_override, seo_description_override
- **Variações:** variations (todas as variantes com preço/SKU/atributos)
- **Metadata:** created_at, updated_at

## O que vou adicionar à seção empresa
Revisar `generateCompanyMarkdown` para emitir TODOS os campos JSON do `company_profile` que hoje são ignorados: blocos como `commercial_intelligence`, `clinical_brain`, `brand_voice`, `content_strategy`, `ai_training_data`, etc. — fallback genérico para qualquer chave não mapeada.

## Garantia de cobertura total
Para evitar que qualquer campo novo do schema fique de fora no futuro, adicionar ao final de cada produto e da empresa um bloco:

```text
<details><summary>📦 Dados Brutos (JSON Completo)</summary>

```json
{ ... registro completo ... }
```
</details>
```

Isso garante que mesmo se um campo não tiver renderização customizada, ele aparece no documento — útil para conversão DOCX e para alimentar IA externa.

## Arquivos a editar
- `supabase/functions/export-complete-handbook/index.ts` — refatorar `generateProductsMarkdown` (renderizar todos os campos listados + JSON bruto) e expandir `generateCompanyMarkdown` (campos faltantes + JSON bruto)
- Nenhuma mudança em UI ou banco de dados

## Validação
Após editar, peço para você clicar "Exportar Apostila Completa" e confiro:
1. Tamanho do `.md` aumenta significativamente
2. Um produto de exemplo tem workflow_stages, whatsapp_messages, technical_documents e o bloco JSON bruto
3. A seção empresa fecha com JSON bruto contendo todos os campos
