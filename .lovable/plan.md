

## Fix: `companyProfile is not defined` in clone-landing-page

### Diagnóstico
O log de erro mostra:
```
ReferenceError: companyProfile is not defined
    at injectSEO (index.ts:1807)
```

A função `injectSEO` recebe o parâmetro como `companyData` (linha 1626), mas nas linhas 1818-1825 o código referencia `companyProfile` — uma variável que não existe nesse escopo.

### Correção
No arquivo `supabase/functions/clone-landing-page/index.ts`, substituir todas as referências a `companyProfile` dentro de `injectSEO` por `companyData`:

- Linha 1818: `companyProfile?.wikidata_id` → `companyData?.wikidata_id`
- Linha 1820: `companyProfile?.wikidata_id` → `companyData?.wikidata_id`
- Linha 1823: `companyProfile?.company_name` → `companyData?.company_name`
- Linha 1825: `companyProfile.wikidata_id` → `companyData.wikidata_id`

### Segundo erro nos logs
Há também um warning: `column video_testimonials.city does not exist`. Isso não bloqueia o pipeline mas indica que a tabela `video_testimonials` não possui a coluna `city`. Pode ser corrigido com uma migration adicionando a coluna, ou removendo a referência no código.

### Resultado esperado
Após o deploy, a edge function `clone-landing-page` não falhará mais com `ReferenceError` e retornará o HTML processado com sucesso.

