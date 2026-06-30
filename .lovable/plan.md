## Causa raiz

O toast **"⚠️ Produto não vinculado"** vem de `ProductEcommerceGenerator.tsx:191`, que checa `liProductId`. Esse valor chega via `ModernProductCard.tsx:828` como `product.original_data?.li_product_id`.

O campo existe no banco (gravado por `import-loja-integrada-api` em `original_data.li_product_id`), mas o SELECT da lista do Repositório (`RepositoryPanel.tsx:114-120`, `PRODUCT_REPOSITORY_LIST_COLUMNS`) **não inclui `original_data`** — removido na otimização anti-timeout e nunca reintroduzido. Resultado: `original_data` chega `undefined`, `liProductId` fica `undefined`, e o botão bloqueia antes de chamar a edge function.

## Mudança (1 linha, frontend)

`src/components/RepositoryPanel.tsx` — adicionar `'original_data'` ao array `PRODUCT_REPOSITORY_LIST_COLUMNS` (linhas 114-120). O `EDIT_COLUMNS` herda automaticamente e o mapeamento em `linha 463` já trata o campo.

Nenhuma mudança em edge functions, schema, RLS ou outros componentes.

## Validação

1. Recarregar `/repository` em produto importado da Loja Integrada → badge **"LI: …"** aparece.
2. Clicar **🚀 Enviar Loja Integrada** → não dispara mais "Produto não vinculado"; console mostra `📤 Enviando HTML para Loja Integrada (ID: …)` e toast final "✅ Enviado com Sucesso!".
3. Produtos sem `li_product_id` continuam bloqueados como esperado.