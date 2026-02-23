
## Corrigir Videos de Depoimentos Ausentes na Landing Page

### Problema Identificado

A secao de depoimentos (linha 3021 do `generateHTML.ts`) so e renderizada quando `successCases.length > 0`:

```text
${successCases.length > 0 ? `
  <!-- Seção de Depoimentos com Carrossel -->
  ...
` : ''}
```

Internamente (linhas 3029-3033), o codigo ja sabe usar `aiContent.testimonials` (depoimentos da tabela `video_testimonials`) como fallback quando nao ha `success_cases`. Porem, a condicao externa impede a secao inteira de aparecer quando `successCases` esta vazio.

Resultado: se a solucao SPIN nao tem `success_cases` cadastrados, os depoimentos reais do banco de dados (`video_testimonials`) nunca sao exibidos.

### Solucao

**Arquivo:** `supabase/functions/generate-spin-landing-page/generateHTML.ts`

Alterar a condicao externa da secao de depoimentos (linha 3021) de:

```
${successCases.length > 0 ? `
```

Para:

```
${(successCases.length > 0 || (aiContent?.testimonials && aiContent.testimonials.length > 0)) ? `
```

Isso garante que a secao apareca quando existirem:
- `success_cases` especificos da solucao, **OU**
- depoimentos reais vindos da tabela `video_testimonials`

### Deploy
- Re-deploy da edge function `generate-spin-landing-page`
- Re-gerar a landing page para confirmar que os depoimentos aparecem
