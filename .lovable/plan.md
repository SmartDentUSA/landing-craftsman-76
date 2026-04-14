

## Plano: Corrigir overflow do Slide 6 (CTA) no Carrossel de Engajamento

### Problema
No slide 6, o conteúdo (título grande + imagem 300px + texto do corpo + botão CTA) estoura os 1350px de altura. O botão CTA é cortado na parte inferior, como mostra o screenshot.

### Correções em `src/components/EngagementCarouselPreview.tsx`

**1. Reduzir imagem do slide 6 de 300px para 200px** (linha 649)

**2. Reduzir fonte e padding do slide 6:**
- Título: de 56px para 44px
- Texto do corpo: de 36px para 28px  
- CTA padding: de `28px 80px` para `20px 60px`
- CTA fontSize: de 44px para 36px
- Gap do container: de 28px para 20px no slide 6

**3. Limitar altura do texto do corpo no slide 6** com `maxHeight` e `overflow: hidden` para garantir que o CTA sempre caiba

**4. Atualizar a lógica PNG correspondente** (se houver posicionamento fixo do CTA no canvas) para usar as mesmas proporções reduzidas

### Resultado
Todos os elementos do slide 6 ficam visíveis dentro do quadro 1080x1350, com o botão CTA totalmente legível.

