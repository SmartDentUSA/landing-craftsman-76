
# Análise profunda — sincronizadores de Wikidata

## O que confirmei no código

### 1) Botão da empresa
O fluxo do botão da empresa está isolado corretamente.

**Arquivo:** `src/components/CompanyProfileManager.tsx`
- O botão Wikidata chama `handleWikidataSync()`
- `handleWikidataSync()` chama apenas `syncCompanyToWikidata()`
- `syncCompanyToWikidata()` envia para a edge function somente:
```ts
{ action: 'sync_company' }
```

**Arquivo:** `src/services/wikidata-sync.ts`
```ts
supabase.functions.invoke('wikidata-sync', {
  body: { action: 'sync_company' }
});
```

Conclusão: o botão da empresa **não envia produto**.

---

### 2) Botão dos produtos
O fluxo do botão do produto também está isolado corretamente.

**Arquivo:** `src/components/WikidataSyncButton.tsx`
- O botão chama `syncProductToWikidata(productId)`

**Arquivo:** `src/services/wikidata-sync.ts`
```ts
supabase.functions.invoke('wikidata-sync', {
  body: { action: 'sync_product', productId }
});
```

**Arquivo:** `src/components/ProductEditModal.tsx`
```tsx
<WikidataSyncButton
  productId={product?.id}
  wikidataItemId={(product as any)?.wikidata_item_id}
/>
```

Conclusão: o botão do card/modal **não envia dados da empresa**, apenas:
```ts
{ action: 'sync_product', productId }
```

---

## Onde o problema provavelmente está

### Problema crítico 1 — `company_profile` continua com 2 registros
Li o banco e encontrei:

- `edeec15d...` — **Nova Empresa**
- `3b20b85d...` — **Smart Dent** com `wikidata_id = Q138636902`

Isso é um forte candidato a quebrar a sincronização da empresa se a edge function usar `.single()` ou assumir linha única.

Impacto provável:
- `sync_company` pode falhar com erro de múltiplas linhas
- ou pode sincronizar o registro errado

Esse é o indício mais forte encontrado.

---

### Problema crítico 2 — contrato de resposta do frontend é rígido
Os dois botões esperam exatamente isto:
```ts
result.success && result.wikidataQid
```

Se a edge function retornar qualquer outro shape, por exemplo:
```json
{ "success": true, "qid": "Q123" }
```
ou
```json
{ "wikidata_id": "Q123" }
```
o frontend vai tratar como erro, mesmo que a função tenha funcionado.

Hoje o frontend depende estritamente de:
- `success`
- `wikidataQid`
- `error`

---

### Problema relevante 3 — badge do produto não atualiza após sucesso
No produto, o badge verde `W` depende de:
```tsx
wikidataItemId={(product as any)?.wikidata_item_id}
```

Esse valor vem do produto carregado ao abrir o modal. Após sincronizar com sucesso:
- o toast aparece
- mas o `wikidata_item_id` local **não é atualizado no estado do modal**
- então o badge pode não aparecer imediatamente

Isso não impede a sincronização, mas faz parecer que “não funcionou”.

---

### Problema relevante 4 — tipagem fraca no produto
No `RepositoryPanel.tsx`, a interface `Product` não expõe claramente `wikidata_item_id`, embora o banco tenha essa coluna. O código usa:
```tsx
(product as any)?.wikidata_item_id
```

Isso não quebra em runtime, mas mostra que esse fluxo foi acoplado de forma frágil e dificulta diagnóstico.

---

## O que NÃO encontrei como causa

- Não há evidência no frontend de que o botão da empresa esteja enviando produtos
- Não há evidência no frontend de que o botão do produto esteja enviando dados da empresa
- Os campos existem no schema tipado do Supabase:
  - `company_profile.wikidata_id`
  - `products_repository.wikidata_item_id`

---

## Evidências adicionais

### Banco
- `company_profile` tem 2 linhas
- os produtos mais recentes consultados estão com `wikidata_item_id = null`

### Logs
- Os logs da edge function `wikidata-sync` mostram boot/shutdown, mas não trouxeram erro útil no snapshot atual
- O snapshot de network/console não trouxe chamadas `wikidata-sync` no momento capturado, então não deu para provar pelo navegador a resposta exata da função

---

## Diagnóstico consolidado

### Empresa
O botão da empresa está implementado corretamente no frontend, mas a sincronização pode falhar por causa da **duplicidade em `company_profile`**.

### Produto
O botão do produto também está implementado corretamente no frontend, mas há 2 riscos:
1. a edge function pode estar retornando um formato diferente do esperado pelo frontend
2. mesmo em caso de sucesso, a UI do modal pode não refletir o novo `wikidata_item_id` sem refresh/reopen

---

## Plano cirúrgico de correção

1. **Eliminar a duplicidade de `company_profile`**
   - manter apenas o registro real da Smart Dent
   - garantir regra de registro único

2. **Auditar o contrato real da edge function `wikidata-sync`**
   - confirmar exatamente quais chaves ela retorna para:
     - `sync_company`
     - `sync_product`
   - alinhar frontend ao contrato real, se necessário

3. **Atualizar o estado local do produto após sync bem-sucedido**
   - após receber o QID, refletir `wikidata_item_id` no modal sem depender de reabrir a tela

4. **Fortalecer a tipagem do produto**
   - incluir `wikidata_item_id` explicitamente na interface do produto
   - remover dependência de cast com `as any`

5. **Adicionar diagnóstico visível no frontend**
   - log/toast mais explícito para diferenciar:
     - erro HTTP da edge function
     - resposta sem `wikidataQid`
     - sucesso sem persistência no banco

---

## Ordem recomendada

```text
1. Corrigir company_profile duplicado
2. Validar shape real da resposta da edge function
3. Ajustar atualização visual do produto após sync
4. Fortalecer tipagem e mensagens de erro
5. Testar empresa e produto ponta a ponta
```

## Resumo final
A separação dos botões está correta. O problema não parece ser “empresa chamando produto” nem “produto chamando empresa”. Os indícios mais fortes são:
- duplicidade da tabela `company_profile`
- possível divergência entre o retorno real da edge function e o retorno esperado no frontend
- ausência de atualização visual imediata do `wikidata_item_id` no modal do produto
