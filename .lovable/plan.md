# Correção — 🎨 Carrossel Visual / 💫 Experiência (Slide 4)

## Problema observado
1. **"Ajustar (Contain / Padrão)"** não tem efeito visual — o `coverMode` está no painel mas nunca é aplicado ao `<video>` nem à imagem (wrapper hardcoda `objectFit: 'cover'` em `StrategicCarouselPreview.tsx:438`).
2. Com **"Mostrar faixa lateral" = Desativado**, o Slide 4 some com o vídeo/imagem: o `Slide4Experience` renderiza a imagem **apenas dentro da faixa lateral** (linha 1253) e desenha `background: bgColor4` opaco sobre o slide inteiro (linhas 1251 e 1276), tapando qualquer vídeo full-bleed que esteja no z=1 do wrapper.

Resultado prático: ao desligar a faixa, o painel direito vira um retângulo sólido sem mídia.

## Mudanças (escopo cirúrgico)

**Arquivo único:** `src/components/StrategicCarouselPreview.tsx`

### 1. Aplicar `coverMode` à mídia no wrapper (linhas ~427-443)
- Ler `coverMode` do `slideTexts[slideNum]` (default `'cover'`).
- Trocar `objectFit: 'cover'` por `objectFit: coverMode` no `<video>` full-bleed.
- Adicionar render de **imagem full-bleed** (`<img>` no mesmo slot z=1) quando `mediaType !== 'video'` e o slide estiver em modo full-bleed (slides 1, 2, 6 sempre; slides 3/4/5 quando `sideStripVisible === 'false'`). Respeita `objectFit: coverMode`.

### 2. `Slide4Experience` (linhas 1232-1307) — modo full-bleed quando faixa OFF
- Quando `sideStripVisible === false`:
  - Trocar `background: bgColor4` do root e do painel direito por `background: 'transparent'` para deixar o vídeo/imagem do wrapper aparecer.
  - Manter o painel direito ocupando 100% da largura (já feito) e adicionar `textShadow` leve para legibilidade sobre mídia (sem máscara — usuário controla via `maskOpacity` existente).
- Quando `sideStripVisible === true`: comportamento atual inalterado.

### 3. Paridade no export (linha ~2278 — `getSlideHTMLContent` case 4)
- Replicar a mesma lógica no HTML estático de export do Slide 4: respeitar `sideStripVisible`, `coverMode`, vídeo/imagem full-bleed, fundo transparente quando faixa OFF.
- Mesma mudança de `objectFit` no `<video>`/`<img>` full-bleed dos demais slides para manter paridade preview ↔ export.

## Fora do escopo
- Layouts de outros slides (somente o wrapper compartilhado e o Slide 4 ganham nova lógica).
- Tipografia, máscara, faixa central do Slide 1, lógica de logos, geração de vídeo composta.
- Slides 3 e 5 ganham apenas o **render de imagem full-bleed** quando faixa OFF (mesma correção do wrapper) — sem mexer em seus layouts internos. Se preferir limitar somente ao Slide 4, removo nas linhas 3/5 antes de aplicar.

## Validação
- Build TS.
- Conferir no preview: Slide 4 com faixa ON (atual) + faixa OFF mostrando vídeo full-bleed + alternar cover/contain afetando o recorte.
