

## Remover a Secao "Narrativa SPIN" da Landing Page

A secao que aparece na imagem e o bloco de texto narrativo SPIN (classe `spin-narrative`), que exibe um paragrafo longo gerado pela IA sobre o contexto do problema/solucao.

### O que sera feito

Remover completamente a renderizacao dessa secao no HTML gerado, para que ela nao apareca mais nas landing pages SPIN Selling.

### Detalhes tecnicos

**Arquivo: `supabase/functions/generate-spin-landing-page/generateHTML.ts`**

Remover o bloco nas linhas 2535-2544 que renderiza a secao `spin-narrative`:

```
${aiContent?.spinNarrative ? `
<!-- Contexto Narrativo SPIN -->
<div class="container section-padding">
  <section class="spin-context">
    <p class="spin-narrative" ...>
      ${escapeHtml(aiContent.spinNarrative)}
    </p>
  </section>
</div>
` : ''}
```

Tambem remover os estilos CSS associados (`.spin-narrative` e `.spin-narrative strong`) para manter o codigo limpo.

**Deploy:** Re-deploy da edge function `generate-spin-landing-page` apos a mudanca.

**Nota:** A geracao do conteudo `spinNarrative` pela IA no `index.ts` sera mantida para nao quebrar a estrutura de dados, mas simplesmente nao sera renderizada no HTML.

