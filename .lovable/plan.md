

# Corrigir Wikidata ID no HTML gerado — Pegar do Perfil da Empresa

## Problema

O `generateSameAsSchema()` em `authority-data-helper.ts` **não inclui** o `wikidata_id` do perfil da empresa no array `sameAs` do Organization/LocalBusiness. O campo existe no banco (`company_profile.wikidata_id`) e no frontend, mas não é propagado para os geradores HTML.

## Causa raiz

1. `AuthorityData` interface não tem campo `wikidataId`
2. `fetchAuthorityData()` não extrai `wikidata_id` do `companyProfile`
3. `generateSameAsSchema()` não adiciona a URL Wikidata ao `sameAs`

## Alterações

### 1. `supabase/functions/_shared/authority-data-helper.ts`

**Interface `AuthorityData`** (linha ~20): Adicionar `wikidataId?: string`

**`fetchAuthorityData()`** (linha ~351): Adicionar `wikidataId: companyProfile.wikidata_id || undefined` ao objeto retornado

**`generateSameAsSchema()`** (linha ~455): Receber `AuthorityData` inteiro (já recebe) e adicionar:
```typescript
if (authority.wikidataId) {
  const wikidataUrl = `https://www.wikidata.org/wiki/${authority.wikidataId}`;
  if (!sameAs.includes(wikidataUrl)) sameAs.push(wikidataUrl);
}
```

### Resultado

Todos os geradores (Ecommerce, SPIN, Blog, Clone) que chamam `generateSameAsSchema(authorityData)` passarão automaticamente a incluir o Wikidata ID da empresa no `sameAs`, sem necessidade de alterar nenhum outro arquivo.

### Arquivo alterado
- `supabase/functions/_shared/authority-data-helper.ts`

