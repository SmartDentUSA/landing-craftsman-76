

## Fix: Erro "Cannot access 'companyName' before initialization" no E-commerce HTML

### Causa raiz

Dentro da funcao `buildEcommerceHTML` (linhas 1859-2650), a variavel `companyName` e declarada com `const` na linha 2526, mas e usada muito antes — nas linhas 1972, 1993, 2000, 2012, 2014, etc. Em JavaScript/TypeScript, variaveis `const` sao "hoisted" mas ficam em "temporal dead zone" ate a linha da declaracao. Qualquer acesso antes disso causa `ReferenceError`.

### Fix

**Arquivo: `supabase/functions/generate-ecommerce-html/index.ts`**

Mover a declaracao de `companyName`, `companyUrl` e `productUrl` (atualmente nas linhas 2526-2528) para o inicio da funcao `buildEcommerceHTML`, logo apos a linha 1866 (primeira linha do corpo da funcao):

```typescript
// Mover estas 3 linhas de ~2526 para ~1867:
const companyName = company?.company_name || 'Smart Dent';
const companyUrl = company?.website_url || 'https://smartdent.com.br';
const productUrl = product.product_url || '#';
```

Remover as declaracoes duplicadas das linhas 2526-2528.

### Resultado esperado
- Geracao de HTML E-commerce volta a funcionar sem erro
- Todas as referencias a `companyName` no corpo da funcao acessam o valor correto

