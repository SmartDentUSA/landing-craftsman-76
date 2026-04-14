

## Plano: Corrigir exportação ZIP do Carrossel de Engajamento

### Diagnóstico

O código da exportação está correto em estrutura, mas há dois pontos que causam o travamento silencioso:

1. **`fetchAsDataUrl` pode travar indefinidamente** — a chamada à edge function `optimize-image` não tem timeout. Se a função demorar (imagens grandes), o `fetch` fica pendurado para sempre sem nenhum feedback ao usuário.

2. **`generateEngagementSlideVideo` trava em vídeos CORS-bloqueados** — o `videoEl.onloadeddata` com `crossOrigin = 'anonymous'` nunca dispara se o storage bloquear CORS, e não há timeout.

3. **Sem feedback visual** — o botão muda para loading mas se travar, o usuário vê "nada acontece" porque o catch externo nunca é atingido (não é erro, é hang).

### Correções

**1. Adicionar timeout em `fetchAsDataUrl`** (`src/components/StrategicCarouselPreview.tsx`)
- Envolver cada tentativa (edge function + fetch direto) em `Promise.race` com timeout de 10 segundos
- Adicionar `console.warn` nos catches para rastreabilidade

**2. Adicionar timeout em `generateEngagementSlideVideo`** (`src/components/EngagementCarouselPreview.tsx`)
- Timeout de 15s no carregamento do vídeo (`onloadeddata`)
- Se falhar, cair no fallback PNG automaticamente

**3. Adicionar timeout por slide no export** (`src/components/EngagementCarouselSection.tsx`)
- Cada slide tem 30s máximo via `Promise.race`
- Se um slide falhar/travar, é pulado e o export continua com os demais
- Toast de progresso: "Exportando slide 3/6..."
- Toast final informa se algum slide foi pulado

### Arquivos alterados
- `src/components/StrategicCarouselPreview.tsx` — timeout no `fetchAsDataUrl`
- `src/components/EngagementCarouselPreview.tsx` — timeout no load de vídeo
- `src/components/EngagementCarouselSection.tsx` — timeout por slide + feedback de progresso

### Resultado
- Export nunca trava — sempre termina em tempo finito
- Usuário vê progresso slide a slide
- Slides problemáticos são pulados com aviso, ZIP sai com o que funcionou

