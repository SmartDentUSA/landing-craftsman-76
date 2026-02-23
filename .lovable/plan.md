
# Remover Secao "Sobre Smart Dent" da Landing Page

## O que sera feito

Remover o bloco `entity-definition` (linhas 2614-2621) do arquivo `generateHTML.ts` que renderiza a secao "Sobre [Empresa]" com a descricao tecnica e a missao.

## Detalhes tecnicos

**Arquivo:** `supabase/functions/generate-spin-landing-page/generateHTML.ts`

Remover as linhas 2614-2621:

```
<div class="content-block entity-definition">
  <h3>Sobre ${escapeHtml(sanitizeCompanyName(company?.company_name))}</h3>
  <p>${escapeHtml(company?.seo_technical_expertise || ...)}</p>
  ${company?.mission_statement ? `<p><strong>Missão:</strong> ...` : ''}
</div>
```

Tambem remover os estilos CSS associados a `.entity-definition` para manter o codigo limpo.

**Deploy:** Re-deploy da edge function `generate-spin-landing-page` e re-gerar a landing page para confirmar.
