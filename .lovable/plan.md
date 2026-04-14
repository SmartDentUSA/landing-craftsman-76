
## Plano: reconstruir o Slide 6 como um layout próprio de CTA

### Diagnóstico
O problema agora não é só overflow. As últimas correções evitaram corte, mas **desmontaram a composição** do último card:
1. **O Slide 6 ainda usa o layout genérico dos slides 2–5**. Isso empilha tudo no topo e deixa um vazio enorme embaixo.
2. **Preview, PNG e vídeo ficaram diferentes entre si**. O PNG recebeu parte dos ajustes, mas o renderer de vídeo ainda usa o layout antigo e desenha o CTA em linha única.
3. **Título/corpo entram crus demais no Slide 6**. Quando vêm longos ou repetidos, o card fica visualmente quebrado mesmo sem “estourar”.

### O que vou implementar
1. **Criar um renderer exclusivo para o Slide 6 em `src/components/EngagementCarouselPreview.tsx`**
   - parar de reaproveitar o bloco genérico
   - montar áreas fixas para: título, mídia, corpo curto e CTA
   - ancorar o botão mais perto da parte inferior
   - devolver uma altura mais equilibrada para a mídia, em vez da faixa muito baixa atual

2. **Unificar o Slide 6 entre preview, PNG e WEBM**
   - extrair um config único com paddings, alturas, fontes, gaps e limites de linhas
   - usar essa mesma regra no preview HTML, no `generateEngagementSlidePNG()` e no `drawSlideFrameWithVideo()`

3. **Corrigir o CTA nos exports**
   - trocar o `fillText(...)` simples por um helper com quebra de linha real
   - deixar a altura do botão adaptável ao texto
   - manter largura segura e centralização correta no PNG e no vídeo

4. **Adicionar sanitização visual só para exibição**
   - limpar espaços/quebras exageradas
   - reduzir repetição óbvia entre título e corpo
   - limitar visualmente o que aparece no Slide 6 sem apagar nem sobrescrever o texto salvo

### Arquivo
- `src/components/EngagementCarouselPreview.tsx`

### Detalhes técnicos
- adicionar um branch explícito `if (slideNum === 6)` no preview JSX
- criar helpers compartilhados para:
  - conteúdo exibido do slide 6
  - texto centralizado com quebra de linha
  - clamp de linhas no canvas
- atualizar também a parte de vídeo, porque hoje ela ainda está com a lógica antiga do Slide 6

### Resultado esperado
- o último slide volta a parecer um **card de CTA**, não um slide comum espremido
- o conteúdo fica distribuído de forma equilibrada
- o botão fica correto no preview, no PNG e no WEBM
- não será preciso regenerar o carrossel só para o slide voltar a ficar apresentável
