

# Estender faixa animada full-width nos templates HTML gerados

## Problema
A alteração anterior foi feita apenas no componente React (`InfinitePartnersCarousel.tsx`) usado no preview do editor. O HTML final gerado pelo **template engine** (`src/lib/template-engine.ts`) ainda envolve a faixa com `<div class="container">`, que limita a largura.

## Alteração

### `src/lib/template-engine.ts`

1. **Linha 2066**: Remover `<div class="container">` — o conteúdo fica diretamente dentro da `<section>`
2. **Linha ~2105**: Remover o `</div>` correspondente ao container
3. **CSS (linhas 1012-1014)**: Manter `padding: 3rem 0` e `background` na `.animated-banner-section` — sem max-width, já que a section é naturalmente full-width

Resultado: O HTML publicado terá a faixa de logos ocupando 100% da largura da viewport, igual ao preview do editor.

