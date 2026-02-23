

# Fix: Pitch de Vendas SPIN ignorando produtos selecionados no body

## Problema

Quando o usuario seleciona 3 produtos na UI e clica "Gerar Pitch", o frontend envia os 3 `product_ids` no body da requisicao. Porem, a edge function `generate-spin-sales-pitch` ignora esses IDs quando o `solutionId` ja existe no banco -- ela usa apenas os IDs armazenados na tabela `spin_selling_solutions`, que pode estar desatualizado (com apenas 2 produtos).

**Evidencia:** Request enviou 3 IDs, mas `artifact_chain.source_data_ids` retornou apenas 2.

## Correcao

### Arquivo: `supabase/functions/generate-spin-sales-pitch/index.ts`

Na secao onde `solutionId` existe (linha 41-53), priorizar os `product_ids` vindos do body sobre os armazenados no banco:

```
// ANTES (bug):
productIds = solution.selected_product_ids || solution.product_ids || [];

// DEPOIS (fix):
productIds = bodyProductIds?.length > 0 
  ? bodyProductIds 
  : (solution.selected_product_ids || solution.product_ids || []);
```

Isso garante que, se o frontend enviar `product_ids`, eles serao usados. Caso contrario, cai no fallback dos IDs do banco.

Nenhuma outra mudanca necessaria. Apenas 1 linha alterada + redeploy da edge function.

