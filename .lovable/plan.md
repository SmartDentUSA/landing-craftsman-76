

## Plano: corrigir bugs de layout dos slides do Carrossel Visual

### Diagnóstico revisado

A paridade Preview ↔ PNG **já está 100% correta** depois do fix anterior — ambos renderizam o mesmo `StrategicSlideRender` (mesmo JSX, mesmas props). Confirmei isso lendo o código: linha 1066 (preview) e linha 1199 (export PNG) instanciam exatamente os mesmos componentes (`Slide1Hook`, `Slide2Solution`, etc.).

**O problema real**: os bugs de layout existem **dentro dos próprios componentes** e ficam visíveis no PNG (1080×1350px nativo) mas **escondidos no preview** porque ele renderiza em escala 22% (`SLIDE_SCALE = 0.22 → 237×297px`). Em miniatura você não percebe que o texto colide ou estoura.

Os PNGs mostram 4 bugs reais nos componentes:

| Slide | Bug visível | Causa no JSX |
|---|---|---|
| 1 | Texto do gancho com **fundo sem contraste** (texto branco com sombra fraca sobre área clara da imagem) | Overlay opacity baixo + ausência de backdrop sólido atrás do texto |
| 2 | Texto preto "Entendemos a sua dúvida…" **colado/encostando** na imagem screenshot FDA gigante | Imagem com `maxHeight: 85%` ocupa quase tudo + zero gap garantido entre imagem e bloco de texto inferior |
| 4 | Kicker truncado "16 ANOS DE PESQUISA…5 AN" + título com palavra cortada "OVEREDÍTO" | Falta `wordBreak`/`overflowWrap` + container sem largura máxima respeitando padding |
| 5 | Título de 4 linhas (86px) **sobreposto** aos 3 cards de bullets (120px cada) | `flex column + justify-content: center` sem `overflow` controlado: total = ~1300px > 1350-160 padding = 1190px disponível → cards sobem por cima do título |

Slide 3 e 6 estão OK.

### Correções por slide (todas no mesmo arquivo)

**`src/components/StrategicCarouselPreview.tsx`**

**Slide 1 (Hook)** — adicionar backdrop sólido translúcido atrás do texto do gancho:
- Wrap do `<h1>` em `<div>` com `background: rgba(0,0,0,0.55)`, `padding: 32px 48px`, `borderRadius: 16` para garantir leitura sobre qualquer imagem
- Manter texto branco e drop-shadow já existentes

**Slide 2 (Apresentação)** — garantir respiro entre imagem e texto:
- Trocar `maxHeight: '85%'` da imagem para `'65%'`, garantindo zona inferior protegida
- Adicionar `gap` mínimo de 60px entre o flex container da imagem e o bloco de intro+nome
- Adicionar `marginTop: 40` no bloco de texto inferior

**Slide 4 (Experiência)** — corrigir truncamento de palavras:
- Kicker e título: trocar `WebkitLineClamp` por `wordBreak: 'break-word', overflowWrap: 'anywhere'` quando texto é longo
- Garantir `maxWidth: '100%'` no container de texto da coluna direita (40% width)
- Reduzir font-size do título de 86px → 72px quando o texto tem mais de 60 chars

**Slide 5 (Segurança)** — resolver colisão título vs cards:
- Trocar layout `flex column + justify-content: center` por `flex column + justify-content: flex-start + paddingTop: 120`
- Adicionar `flexShrink: 0` em todos os cards para não comprimirem
- Reduzir font-size do título de 86px → 64px (quebra natural em 2-3 linhas em vez de 4)
- Reduzir altura mínima dos cards de `minHeight: 120` → `minHeight: 96`
- Garantir `gap: 32` entre título e bloco de cards

### Fora de escopo

- Não vou mexer no `StrategicSlideRender` nem no `generateSlidePNG` — eles estão corretos.
- Não vou mexer no Carrossel de Engajamento (já corrigido turno anterior).

### Validação esperada

Após o fix, os 6 PNGs e o preview vão **ambos** ficar visualmente corretos (eles continuam idênticos entre si, mas agora os layouts em si não quebram em 1080×1350). O preview pequeno (22%) também vai se beneficiar — texto não colide mais.

### Arquivos modificados

- `src/components/StrategicCarouselPreview.tsx` — ajustes pontuais nos componentes `Slide1Hook` (~5 linhas), `Slide2Solution` (~5 linhas), `Slide4Experience` (~10 linhas), `Slide5Security` (~10 linhas). Total ~30 linhas alteradas.

### Risco

Mudar font-size do título do Slide 5 de 86 → 64px é uma decisão visual — vai ficar menos impactante mas mais legível. Se preferir manter 86px e em vez disso truncar com `WebkitLineClamp: 2` + ellipsis, é só dizer.

