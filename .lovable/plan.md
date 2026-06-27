Escopo: APENAS `🎨 Carrossel Visual` (`src/components/StrategicCarouselPreview.tsx`). Sem mexer no Engajamento, sem migrations, sem alterar lógica de export (apenas reflete os toggles que já estão no render).

## 1. Slide 3 — 🔬 Cientificidade

**Remover/condicionar dois elementos:**

- `headlineVisible` (toggle, default `true`) — controla o parágrafo grande `benefitsHeadline` renderizado em `primaryColor` (linhas ~952-956). Quando `false`, esconde por completo o bloco da headline colorida, mantendo body + bullets/tabela.
- `sideStripVisible` (toggle, default `true`) — controla a faixa lateral esquerda de 42% que segura a imagem (linhas 934-941, incluindo o gradiente de transição). Quando `false`:
  - Esconde a coluna esquerda inteira.
  - O bloco de texto da direita passa a ocupar 100% (`flex: 1` → `width: 100%`) com padding rebalanceado (`100px 80px 80px 80px`).

Adicionar ambos os campos em `SLIDE_EDITOR_FIELDS[3]`.

## 2. Slide 1 — 🎯 Gancho

**Substituir transparência fixa (0.78) por slider + tornar tudo opcional:**

- `faixaVisible` — já existe; manter.
- `faixaOpacity` (slider 0–100, default 78) — substitui o `0.78` hardcoded em `rgba(...,0.78)` (linha 704). Valor lido como `Number(texts?.faixaOpacity ?? 78) / 100`.
- `hookVisible` (toggle, default true) — esconde o `<p>` do gancho dentro da faixa.
- `nameVisible` (toggle, default true) — esconde o nome do produto no rodapé (linhas 714-716) e o gradiente do rodapé associado (linha 713) quando off.
- `badgeVisible` (toggle, default true) — esconde a bolinha "1" do topo-esquerdo (linhas 684-687).

**Auto-cor do texto quando faixa desabilitada:** quando `faixaVisible === false`, mover o texto do gancho para fora da faixa (overlay centralizado equivalente, sem fundo) e calcular a cor automaticamente: usar `getLuminance` da imagem é caro; em vez disso usar a `bgColor` do slide como referência (`bgLuminance > 0.5 ? '#111' : '#fff'`) + manter `textShadow` reforçado para contraste contra a imagem. Quando faixa ligada, manter `color: #ffffff` como hoje.

## 3. Slides 2, 4, 5, 6 — toggles granulares dos blocos visuais

Adicionar toggles para esconder/mostrar os elementos visuais identificáveis de cada layout, mantendo defaults `true` (nenhuma mudança visual sem ação do usuário):

- **Slide 2 (Apresentação):** `badgeVisible` (número "2"), `categoryVisible`, `introLabelVisible`, `nameVisible`.
- **Slide 4 (Benefício):** `badgeVisible`, `labelVisible`, `keywordVisible`, `benefitVisible`.
- **Slide 5 (Selos):** `badgeVisible`, `titleVisible`, e um toggle individual `badge1Visible`/`badge2Visible`/`badge3Visible`.
- **Slide 6 (CTA):** `badgeVisible`, `productNameVisible`, `ctaButtonVisible`, `linkLabelVisible`, `footerVisible`.

Cada toggle apenas envelopa a renderização do elemento correspondente em `{(texts?.xxxVisible ?? 'true') !== 'false' && (...)}`. Sem reflow agressivo: o flex existente reabsorve naturalmente os gaps.

## 4. Tipos

Estender cada entrada em `SlideTextsType` (linhas 65-70) com os novos campos opcionais (`string`, valores `'true'|'false'` para toggles, `string` numérico para slider — seguindo o padrão atual do arquivo).

## 5. Editor

Acrescentar os novos campos em `SLIDE_EDITOR_FIELDS[1..6]` antes dos `COMMON_MEDIA_FIELDS`, usando os tipos já suportados (`toggle`, `slider`). Sem mudanças no componente do painel do editor (já trata `toggle` e `slider`).

## 6. Paridade no render canvas (export PNG/MP4)

`renderStrategicSlideToCanvas` (e funções correlatas usadas por `EngagementCarouselSection`/ZIP) usam os mesmos componentes React montados off-DOM via `html2canvas`. Como toda a lógica de toggle vive dentro dos componentes `Slide1Hook`/`Slide2Solution`/.../`Slide6CTA`, os PNGs e o vídeo passam a refletir os toggles sem alteração extra no pipeline de export.

## 7. Verificação

- Abrir Slide 3 → ✏️ → desligar "Headline colorida" → preview e PNG sem o parágrafo em cor primária.
- Slide 3 → desligar "Faixa lateral" → texto ocupa todo o card.
- Slide 1 → mexer no slider "Transparência da faixa" → fundo da faixa muda em tempo real.
- Slide 1 → desligar "Mostrar faixa central" com fundo claro → texto do gancho aparece em cor escura legível; com fundo escuro, em branco.
- Slides 2/4/5/6 → cada toggle remove apenas o elemento alvo, sem quebrar o layout.
- Baixar ZIP e enviar SmartOps → arquivos refletem todos os toggles.

Sem mudanças em outros arquivos.