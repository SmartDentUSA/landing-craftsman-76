

# Adicionar campo `wikidata_id` ao Perfil da Empresa

## Objetivo

Criar um campo `wikidata_id` no perfil da empresa que será usado em dois lugares:
- **JSON-LD**: Injetado no array `sameAs` de Organization/LocalBusiness como `https://www.wikidata.org/wiki/{ID}`
- **Footer HTML**: Link semântico com `itemprop="sameAs"` para navegação e SEO

## Alterações

### 1. Migração: Adicionar coluna `wikidata_id` à tabela `company_profile`
```sql
ALTER TABLE company_profile ADD COLUMN wikidata_id text;
```

### 2. `src/components/CompanyProfileManager.tsx`
- Adicionar `wikidata_id` ao state, load e save do perfil
- Adicionar input na aba de SEO ou dados da empresa com label "Wikidata ID" e placeholder "Q138636902"

### 3. `supabase/functions/_shared/seo-fine-tuning.ts` — `expandFounderSameAs()`
- Adicionar verificação de `company.wikidata_id` e push de `https://www.wikidata.org/wiki/${wikidata_id}` ao array `sameAs`

### 4. `src/lib/company-profile-helper.ts`
- Adicionar `wikidata_id?: string` à interface `CompanyProfileData`

### 5. Edge Functions que geram footer HTML (template-engine, generate-ecommerce, generate-spin, clone, blog)
- No bloco de footer, adicionar link Wikidata quando `wikidata_id` estiver presente:
```html
<a href="https://www.wikidata.org/wiki/{ID}" target="_blank" rel="noopener" itemprop="sameAs">
  Entidade de Conhecimento Oficial
</a>
```

### 6. `src/lib/schema-reviews.ts` — `generateReviewsAndLocalBusinessForFooter()`
- Adicionar `wikidata_id` ao array `sameAs` do LocalBusiness schema

### Arquivos alterados
- Migração SQL (nova coluna)
- `src/components/CompanyProfileManager.tsx`
- `src/lib/company-profile-helper.ts`
- `supabase/functions/_shared/seo-fine-tuning.ts`
- `src/lib/schema-reviews.ts`
- Edge Functions de geração HTML (footer link)

