

## Plano: Corrigir referencia `company` no generate-ecommerce-html

### Problema
Na correcao anterior, o parametro foi renomeado de `company` para `companyData`, mas o corpo da funcao tem ~90 referencias a `company` (nao `companyData`). Apenas as linhas 1871-1872 foram atualizadas para `companyData`, mas todo o resto continua usando `company`.

### Correcao
Reverter o parametro para `company` (como era originalmente) e ajustar as 2 linhas que foram mudadas para `companyData?.` de volta para `company?.`:

Linha 1867: `companyData: any` → `company: any`
Linha 1871: `companyData?.company_name` → `company?.company_name`
Linha 1872: `companyData?.website_url` → `company?.website_url`

Isso resolve todas as ~90 referencias de uma vez.

### Apos correcao
- Deploy da edge function `generate-ecommerce-html`

### Arquivo editado
- `supabase/functions/generate-ecommerce-html/index.ts` (3 linhas)

