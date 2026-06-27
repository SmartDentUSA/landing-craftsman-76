## Problema

No **🎯 Carrossel Engajamento**, mesmo definindo a mesma escala (ex.: 100%) do logo em todos os cards, o tamanho exportado varia entre slides — principalmente quando se mistura slides de imagem (exportados como PNG via `html2canvas`) com slides de vídeo (exportados via `canvas.drawImage` em MP4).

## Causa

Existem duas convenções diferentes de sizing para o mesmo logo, no mesmo arquivo `src/components/EngagementCarouselPreview.tsx`:

1. **PNG (LogoOverlay, linhas 316–356)** dimensiona pela **largura**:
   ```ts
   width: baseSize * (scale/100), height: 'auto', maxHeight: baseSize * (scale/100)
   ```
   Logos largos ficam achatados; logos quadrados ocupam 140×140; logos altos são clampados pelo `maxHeight`.

2. **Vídeo (`drawLogos`, linhas 1556–1565)** dimensiona pela **altura**:
   ```ts
   h = LOGO_BASE * scale; w = h * (naturalWidth / naturalHeight);
   ```
   A altura é constante; a largura varia conforme a proporção natural.

Resultado: para o mesmo arquivo de logo e o mesmo slider, um slide-imagem exporta com dimensão visível diferente de um slide-vídeo. Também explica por que logos com proporções diferentes "parecem" tamanhos diferentes mesmo com a mesma escala.

## Correção (mínima, só apresentação)

Padronizar o `LogoOverlay` para usar **altura constante** (igual ao `drawLogos` do vídeo e à convenção do `CarouselLogosOverlay` do Strategic):

Em `LogoOverlay` (linhas 316–356) trocar para cada logo:
```ts
height: baseSize * (scale/100),
width: 'auto',
// remover maxHeight
```

Com isso:
- Preview, PNG e MP4 passam a usar a mesma referência (altura = 140·scale).
- A largura segue a proporção natural do arquivo automaticamente — mesma escala = mesma altura visual em todos os 6 slides, independente de imagem ou vídeo.

Nenhuma outra lógica é alterada (uploads, persistência, posições top/right e bottom/left permanecem iguais).