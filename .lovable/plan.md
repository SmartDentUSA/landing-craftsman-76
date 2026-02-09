
# Plano: Corrigir renderizacao HTML nas respostas das FAQs

## Problema

Na linha 2326 de `src/lib/template-engine.ts`, o template usa `{{answer}}` (double-mustache) que **escapa HTML**, fazendo com que tags como `<p>`, `<strong>`, `<ul>` apareçam como texto visivel em vez de serem renderizadas como HTML.

Alem disso, a IA gera respostas ja envolvidas em tags `<p>`, e o template adiciona outra `<p>` por fora, criando `<p>` duplicado.

## Correcao

### Arquivo: `src/lib/template-engine.ts` (linha 2326)

Substituir:
```html
<p itemprop="text">{{answer}}</p>
```

Por:
```html
<div itemprop="text">{{{answer}}}</div>
```

Mudancas:
1. **Triple-mustache `{{{answer}}}`**: Renderiza HTML sem escapar
2. **`<div>` em vez de `<p>`**: Evita `<p>` aninhado dentro de `<p>` (invalido em HTML), ja que a IA gera respostas com `<p>` interno

## Impacto

- As respostas das FAQs serao renderizadas com formatacao rica (negrito, listas, paragrafos)
- Sem tags HTML visiveis como texto
- HTML semanticamente valido (sem `<p>` dentro de `<p>`)
- Necessario re-exportar/re-gerar o codigo da landing page para ver a correcao
