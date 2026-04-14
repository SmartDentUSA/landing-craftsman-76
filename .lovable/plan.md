

## Plano: Corrigir CTA do Slide 6 (terceira tentativa)

### Problemas visíveis no screenshot
1. **Título ocupa metade do slide** — texto muito longo sem limite de linhas, fontSize 36 ainda grande demais
2. **Texto do corpo repete o conteúdo do título** abaixo da galeria, sem limite de altura efetivo
3. **Botão CTA cortado nas laterais** — o texto longo transborda mesmo com `maxWidth: 90%` porque o container tem `padding: 40px 60px`, sobrando só ~960px, e `wordBreak: 'break-word'` não está funcionando corretamente para texto sem espaços em português

### Correções em `src/components/EngagementCarouselPreview.tsx`

**1. Limitar título do slide 6**
- fontSize: 36 → **28**
- Adicionar `maxHeight: 160px` + `overflow: hidden` para no máximo ~5 linhas
- Adicionar `WebkitLineClamp: 5` com `-webkit-box` para corte elegante

**2. Limitar corpo do slide 6**
- maxHeight: 200 → **120px** (3 linhas no máximo)
- fontSize: 28 → **22**

**3. Corrigir CTA button**
- `maxWidth: '90%'` → `maxWidth: '100%'`, `width: '100%'`
- Adicionar `overflowWrap: 'break-word'` além de `wordBreak`
- fontSize: 28 → **24**
- padding: `16px 48px` → `14px 32px`
- O botão deve ocupar a largura disponível e quebrar o texto internamente

**4. Reduzir imagem do slide 6**
- height: 200 → **160px**

**5. Atualizar canvas PNG/video** com as mesmas proporções reduzidas

### Arquivo
- `src/components/EngagementCarouselPreview.tsx`

### Resultado
Todo o conteúdo do slide 6 cabe nos 1350px com margem de segurança. O CTA nunca é cortado — o texto quebra em múltiplas linhas dentro do botão.

