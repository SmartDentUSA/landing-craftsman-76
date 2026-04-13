

## Plano: Corrigir `companyData is not defined` no generate-ecommerce-html

### Problema
A funcao `buildEcommerceHTML` recebe o parametro como `company` (linha 1867), mas o corpo da funcao referencia `companyData` em ~37 ocorrencias. Isso causa `ReferenceError: companyData is not defined` em runtime.

### Correcao
Na linha 1867 de `supabase/functions/generate-ecommerce-html/index.ts`, renomear o parametro de `company` para `companyData`:

```
function buildEcommerceHTML(
  product: any, 
  benefits: string[], 
  options: any, 
  companyData: any,      // ← renomear de 'company' para 'companyData'
  technicalDocsWithDescriptions: any[] = []
): string {
```

Tambem verificar se `companyName` e `companyUrl` (linhas 1871-1872) usam `company?.` — precisam ser atualizados para `companyData?.` (ja sao, pois o corpo ja usa `companyData`... mas `company` era o parametro, entao na verdade o corpo todo usava um nome errado).

### Apos correcao
- Deploy da edge function `generate-ecommerce-html`
- Testar geracao de HTML

### Arquivo editado
- `supabase/functions/generate-ecommerce-html/index.ts` (1 linha alterada)

