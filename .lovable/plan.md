

# Correção: LPPublishDialog envia HTML de Blog em vez de HTML da Landing Page

## Problema

No `LPPublishDialog.tsx` (linha 149), ao clicar "Publicar", o sistema chama `generateBlogHTML()` — o gerador de blog consolidado — que produz um HTML simplificado (~400 linhas). O correto é usar `generateHTML()` do template engine principal (via lógica do `useEnhancedTemplateEngine`), que produz o HTML completo da LP (~3000 linhas com todos os blocos AI-readiness).

## Correção (1 arquivo)

**`src/components/LPPublishDialog.tsx`**

1. **Remover** imports de `generateBlogHTML` e `getTrackingConfig` (linhas 12-13)
2. **Adicionar** imports de `generateHTML` de `@/lib/template-engine` e `getCompanyProfileForSEO` + `buildSEOMetaFromCompany` de `@/lib/company-profile-helper`
3. **Substituir** bloco de geração HTML (linhas 145-167) por:
   - Buscar `companyProfile` via `getCompanyProfileForSEO()`
   - Montar `enhancedData` a partir de `lpData.data` (mesma lógica do `useEnhancedTemplateEngine`)
   - Chamar `generateHTML(enhancedData)` — o template engine principal
   - Resultado: HTML idêntico ao do CodeView/Preview

