

## Plano: corrigir deformação de imagens nos slides 🔬 Cientificidade e 💫 Experiência

### Diagnóstico

Os slides 3 (Cientificidade) e 4 (Experiência) renderizam a imagem do produto numa **coluna vertical de proporção extrema**: 42% × 100% do canvas → **453 × 1350px** (proporção ~1:3).

Como a imagem do produto é tipicamente quadrada (ex: 1000×1000) ou paisagem, o `objectFit: 'cover'` precisa **ampliar a imagem ~3x para preencher essa altura**, cortando enormes pedaços laterais e fazendo o produto aparecer gigante, desfocado e mostrando só um detalhe central. Quando o usuário sobe o `imageScale` (slider de zoom), piora ainda mais — vira um "macro" deformado.

Comparando com os outros slides:
- **Slide 2** já usa layout adequado: imagem com `maxHeight: 65%` + `objectFit: contain` — proporção respeitada
- **Slide 3 e 4** (problemáticos): `width 42% × height 100%` + `objectFit: cover` + `transform: scale()` — recorte agressivo que distorce visualmente

### Causa raiz

```text
Container imagem (Slide 3 e 4): 453 × 1350px (1:3)
Imagem real do produto:          1000 × 1000px (1:1)
objectFit: cover força:           cobrir 1350 de altura
                                  → escala 1.35x
                                  → corta 50% da largura
                                  → produto aparece super-zoom + cortado
+ transform: scale(imageScale/100) ainda multiplica
```

### Correção proposta

Aplicar o mesmo padrão do Slide 2 nos Slides 3 e 4, em **`src/components/StrategicCarouselPreview.tsx`**:

**Slide 3 — Cientificidade (`Slide3Technical`, linhas 649-656):**
- Trocar layout do bloco de imagem: container vira `flex` centralizado
- Imagem com `maxWidth: '100%', maxHeight: '70%', objectFit: 'contain'` (não corta, respeita proporção)
- Adicionar fundo discreto (`background: rgba(255,255,255,0.04)` ou similar) para preencher área restante sem ficar vazia
- Manter `transform: scale(imageScale/100)` mas agora atuando sobre uma imagem já bem dimensionada

**Slide 4 — Experiência (`Slide4Experience`, linhas 913-921):**
- Mesma correção: container `flex` centralizado, imagem com `objectFit: 'contain'` e `maxHeight: '70%'`
- Manter o feather/gradient lateral direito que faz o blend com o painel de texto

**Resultado esperado:**
- Imagens aparecem completas, sem distorção, sem corte agressivo
- Slider `imageScale` continua funcional para zoom fino
- Layout mantém a divisão 42% imagem / 58% texto
- Estética continua coerente entre slides 2, 3 e 4

### Arquivos modificados

- `src/components/StrategicCarouselPreview.tsx` — ~15 linhas alteradas (blocos de imagem dos componentes `Slide3Technical` e `Slide4Experience`)

### Fora de escopo

- Slides 1, 2, 5, 6 — sem mudanças, já estão OK
- Lógica de texto/cards — não muda
- Pipeline de export PNG (`generateSlidePNG`) — não muda; como ele usa o mesmo `StrategicSlideRender`, a correção propaga automaticamente para os PNGs do ZIP

### Risco

Imagens que eram pensadas para o "efeito macro" (ex: textura de superfície) vão aparecer menores e completas. Se você preferir manter o efeito cover mas evitar a deformação, alternativa é aplicar `objectPosition` dinâmico — mas a recomendação é `contain` por consistência com Slide 2 e respeito à proporção real.

