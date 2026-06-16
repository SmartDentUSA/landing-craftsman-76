## Causa raiz

O produto **Resina 3D Smart Print Bio Vitality** tem 6 especificações técnicas salvas corretamente no banco (`products_repository.technical_specifications`). Confirmado via API.

O bloco de preview já foi restaurado em `ModernProductCard.tsx` (linhas 705-712) e renderiza condicionalmente quando `product.technical_specifications.length > 0`.

O problema está em `src/components/RepositoryPanel.tsx`: a query de listagem (`PRODUCT_REPOSITORY_LIST_COLUMNS`, linha 114-120) — propositalmente "leve", sem JSONBs pesados — **não inclui** a coluna `technical_specifications`. Resultado: o `data.technical_specifications` chega `undefined` no mapeamento (linha 465), vira `[]`, e o card esconde o preview para todos os 92 produtos que têm specs.

## Correção

Adicionar `'technical_specifications'` ao array `PRODUCT_REPOSITORY_LIST_COLUMNS` em `src/components/RepositoryPanel.tsx` (linha 114-120).

```ts
const PRODUCT_REPOSITORY_LIST_COLUMNS = [
  'id', 'name', 'description', 'price', 'promo_price', 'currency',
  'category', 'subcategory', 'image_url', 'product_url',
  'use_in_ai_generation', 'approved', 'display_order',
  'show_in_resources', 'selected', 'brand', 'gtin', 'ean', 'mpn',
  'wikidata_item_id',
  'technical_specifications', // ← adicionar
].join(', ');
```

Nenhuma outra mudança necessária:
- Mapeamento (linhas 465-467) já trata o campo corretamente.
- Card já renderiza o preview condicionalmente.
- Modal de edição, schema, save handler — intactos.

## Impacto

- Os 92 produtos com especificações passam a mostrar o preview no card.
- Os 28 produtos sem especificações continuam sem renderizar nada (comportamento existente).
- Custo: 1 coluna JSONB a mais no SELECT da lista; tolerável dado o filtro `approved` e a ordenação já existentes. Nenhum risco de timeout esperado (a coluna é pequena — média de ~6 entradas label/value por produto).