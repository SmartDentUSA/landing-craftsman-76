

## Plano: Corrigir layout do Slide 6 (CTA)

### Problemas identificados no screenshot
1. **Espaço vazio enorme** entre o texto do corpo e o CTA — causado por `justifyContent: 'center'` no container flex, que distribui os elementos verticalmente
2. **CTA cortado horizontalmente** — o texto do botão é muito longo e ultrapassa as laterais do quadro porque não há `maxWidth` nem quebra de linha forçada
3. **Título ainda muito grande** — ocupa muitas linhas, comprimindo o espaço disponível

### Correções em `src/components/EngagementCarouselPreview.tsx`

**1. Mudar `justifyContent` para `'flex-start'` no slide 6** (linha 642)
- Elementos ficam empilhados do topo para baixo, sem espaço vazio no meio

**2. Adicionar `maxWidth` e quebra de texto no CTA** (linhas 660-672)
- `maxWidth: '90%'` para o botão não ultrapassar as laterais
- `wordBreak: 'break-word'` para texto longo quebrar em múltiplas linhas
- Reduzir fontSize do CTA de 36px para 28px

**3. Reduzir título do slide 6** de 44px para 36px

**4. Atualizar lógica PNG correspondente** para refletir as mesmas proporções

### Arquivo
- `src/components/EngagementCarouselPreview.tsx`

### Resultado
- Conteúdo do slide 6 flui de cima para baixo sem gaps
- CTA visível por completo, centralizado, com texto quebrando se necessário

