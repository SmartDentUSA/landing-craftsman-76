
Problema confirmado: o bloqueio não está mais no `findExistingEntity`. O QID `Q1780993` agora está vindo de outro caminho: o fluxo `sync_product` ainda usa `category fallback` e grava esse QID no produto.

O que encontrei
- `findExistingEntity` já exclui `CATEGORY_QIDS`, então a correção anti-dup foi aplicada.
- Mas em `supabase/functions/wikidata-sync/index.ts`, o método `handleProductSync()` ainda faz isto:
  1. busca candidatos
  2. se não houver match forte (`best.score < 35`)
  3. chama `getCategoryFallbackQid(...)`
  4. salva `wikidata_item_id = fallbackQid` no produto
- Os logs confirmam exatamente isso:
  - `Using category fallback { fallbackQid: "Q1780993" }`

Root cause real
- Existem dois fluxos diferentes:
  - `sync_product`: resolve e grava um QID “melhor esforço”, e ainda aceita category fallback
  - `resolve_and_persist`: pipeline de escrita com anti-dup corrigido
- O usuário está vendo `Q1780993` porque `sync_product` continua persistindo categoria genérica antes da criação real do item.

Plano de correção
1. Remover a gravação automática de category fallback em `handleProductSync`
- Quando só existir fallback de categoria, não atualizar `products_repository.wikidata_item_id`.
- Em vez disso, retornar uma resposta explícita de “fallback suggestion” / “no exact entity found”.
- Manter o fallback apenas como contexto semântico para payload/classe, não como item resolvido do produto.

2. Restringir `handleProductSync` para só persistir QIDs específicos
- Persistir `best.qid` apenas quando houver match forte real.
- Se o melhor resultado vier de categoria genérica, tratar como não resolvido.
- Opcionalmente reaproveitar `getCategoryQids()` para bloquear qualquer persistência de QID genérico também nesse fluxo.

3. Ajustar a resposta da edge function
- Hoje ela retorna sucesso com `source: "category_fallback"`.
- Alterar para algo como:
  - `success: false`
  - `needsCreate: true`
  - `fallbackQid`
  - `reason: "generic_category_only"`
- Assim a UI não interpreta categoria como item existente.

4. Revisar o cliente que chama `sync_product`
- Em `src/services/wikidata-sync.ts` e `src/components/WikidataSyncButton.tsx`, garantir que só exiba “sincronizado” quando houver um QID válido de item realmente resolvido/criado.
- Se vier `generic_category_only`, mostrar mensagem do tipo:
  - “Categoria identificada, mas nenhum item específico encontrado. Use publicar/criar item.”

5. Proteger o pipeline contra resíduos antigos
- No `resolve_and_persist`, se `products_repository.wikidata_item_id` já contiver um QID que esteja em `getCategoryQids()`, não tratá-lo como QID órfão válido para update.
- Isso evita que produtos já contaminados com `Q1780993` entrem no fluxo como se fossem item existente.

Resultado esperado
- `Q1780993` continua podendo ser usado como classe/categoria de referência.
- Mas nunca mais será salvo como `wikidata_item_id` de um produto específico.
- Quando não houver item exato no Wikidata, o sistema seguirá para criação de um novo item, em vez de “localizar e retornar” a categoria genérica.

Arquivos envolvidos
- `supabase/functions/wikidata-sync/index.ts`
- `src/services/wikidata-sync.ts`
- `src/components/WikidataSyncButton.tsx`

Detalhe técnico
```text
Hoje:
sync_product
  -> sem match forte
  -> category fallback Q1780993
  -> salva no produto
  -> resolve_and_persist depois enxerga QID existente
  -> update em vez de create

Após correção:
sync_product
  -> sem match forte
  -> category fallback só como dica semântica
  -> NÃO salva no produto
  -> resolve_and_persist sem QID específico
  -> create
```
