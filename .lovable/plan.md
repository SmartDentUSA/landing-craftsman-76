## Problema

Mesmo após importar o produto da Loja Integrada, o botão **🚀 Enviar Loja Integrada** mostra "⚠️ Produto não vinculado".

Causa: o componente `ProductEcommerceGenerator` recebe `liProductId` como prop, vindo de `product.original_data?.li_product_id` no `ModernProductCard`. Se a lista de produtos foi renderizada antes da importação terminar (ou o refetch não incluiu `original_data` naquele momento), a prop chega `undefined` e a validação frontend bloqueia o envio, sem sequer tentar consultar o banco.

## Correção

No `ProductEcommerceGenerator.tsx`, tornar o handler resiliente: quando `liProductId` não está presente na prop, buscar direto de `products_repository` pelo `productId` antes de decidir bloquear.

### Fluxo novo do `handleSendToLojaIntegrada`

1. Se `liProductId` da prop existir, usa direto.
2. Senão, faz `SELECT original_data FROM products_repository WHERE id = productId` e lê `original_data.li_product_id`.
3. Se ainda assim não existir, aí sim mostra o toast "Produto não vinculado".
4. Caso contrário, segue chamando `update-loja-integrada-product` com o `liProductId` recém-obtido.

Isso elimina a dependência do estado do pai estar atualizado e resolve o caso "acabei de importar".

## Escopo

- Arquivo único: `src/components/ProductEcommerceGenerator.tsx`.
- Sem mudanças em edge functions, banco ou outros componentes.
- Comportamento inalterado para produtos que já têm o vínculo carregado.