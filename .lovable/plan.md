# Correção da Captura dos Slides — Engagement Carousel → SmartOps

## Diagnóstico

A indexação está correta: o loop em `handleSendSmartOps` itera `i = 1..6`, empurra blobs nessa ordem, e o `uploadCarouselToSmartOps` salva como `slide-${i+1}.png` (i 0-based) → mapeamento 1:1 (`blobs[0] → slide-1.png`). **Não há off-by-one.** Os problemas vêm da renderização antes da captura:

### Problema A — Slide 1 em branco
`generateEngagementSlidePNG` faz `root.render(...)` e logo depois um único `requestAnimationFrame` antes de procurar `<img>`. React pode ainda não ter comitado o DOM nesse primeiro frame, então `container.querySelectorAll('img')` retorna 0, o código cai no fallback `setTimeout(resolve, 50)` e o `html2canvas` snapshota **antes da imagem decodificar**. Slide 1 (layout *full-bleed*) é o que mais sofre porque a imagem ocupa 100% do canvas — sem ela sobra só o gradiente preto + o badge "1" + texto branco recortado (daí "lide 1" visível).

Pior ainda: no slide 1 o `<img onError>` faz `style.display = 'none'`, então qualquer hiccup de decode esconde a imagem silenciosamente e o snapshot fica preto.

### Problema B — Imagens "diferentes" no Sistema B
Mesma raiz: quando o `await img.decode()` não acontece, o html2canvas captura o `<img>` ainda **sem pixels decodificados** (mostra a versão cacheada/anterior do browser, ou um placeholder cinza do user-agent). Como o navegador costuma ter cache de PNGs já vistos no `EngagementCarouselPreview` em tela, o snapshot pega frames antigos/parciais — daí a sensação de "imagem de outro carrossel".

Nada no `sistemaBClient.upload` mistura arquivos: cada `path` é único (`carrosseis/<slug>/<uuid>/slide-N.png`).

## Mudanças (escopo mínimo, só captura)

### 1. `src/components/EngagementCarouselPreview.tsx` — `generateEngagementSlidePNG`
Substituir o bloco `requestAnimationFrame(...)` (linhas ~906-924) por uma espera robusta:

- Aguardar **dois** `requestAnimationFrame` em sequência (garante commit do React + layout).
- Após isso, para cada `<img>` dentro do container, aguardar `img.decode()` (não só `onload`) com timeout individual de 4 s; ignorar erro do `decode` mas continuar.
- Aguardar mais um `requestAnimationFrame` final + 50 ms de folga antes do `html2canvas`.
- Aumentar `imageTimeout` do html2canvas para 8000 ms.

### 2. `src/components/EngagementCarouselPreview.tsx` — Slide 1 render (linha ~629)
Remover o `onError` que faz `style.display = 'none'` no `<img>` do slide 1. Falha de imagem deve deixar o `<img>` no DOM (quebrado, mas ainda na árvore) para que possamos detectar via logs em vez de gerar PNG silenciosamente preto. Mesma mudança nos slides 2-5 se tiverem o mesmo `onError` (verificar e remover).

### 3. `src/components/EngagementCarouselSection.tsx` — `handleSendSmartOps` (linhas 477-528)
Apenas instrumentação (sem mudar fluxo):
- Logar `slideImageMap[i]` (URL completa) e tamanho do `imgDataUrl` antes de chamar `generateEngagementSlidePNG`.
- Se `blob.size < 10_000` bytes, logar `console.warn('[SMARTOPS_ENGAJ] slide N suspeito — PNG muito pequeno', { size })` (PNG legítimo 1080×1350 raramente cai abaixo disso).

### 4. Sem outras mudanças
- **Não** mexer em `smartops-upload.ts` (indexação já está correta).
- **Não** mexer em `sistema-b/client.ts`.
- **Não** mexer em RLS, policies, schema, edge functions.

## Arquivos tocados
- `src/components/EngagementCarouselPreview.tsx` (espera de render + remoção do `onError` que oculta img)
- `src/components/EngagementCarouselSection.tsx` (logs diagnósticos no `handleSendSmartOps`)

## Validação
Após aprovar, reenviar o carrossel e conferir no console:
- `[SMARTOPS_ENGAJ] preparando slide 1/6` deve mostrar a URL real da imagem e `imgDataUrl` com tamanho > 50 KB.
- `[SMARTOPS_ENGAJ] slide 1 pronto (NNNN bytes)` deve mostrar > 100 KB.
- Nenhum aviso `slide N suspeito`.
- Slide 1 no Sistema B deve conter a imagem (não mais o placeholder com "lide 1").
