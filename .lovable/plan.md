

## Transformar Carrossel Engajamento em Editor Visual Completo

### Situacao atual
O "Carrossel Engajamento" e apenas texto (titulo + corpo + sugestao de imagem). O "Carrossel Visual" (StrategicCarouselPreview.tsx, ~1867 linhas) tem preview visual com canvas 1080x1350, upload de imagem, editor de texto inline, export PNG, controles de cor/escala/fonte.

O usuario quer que o Engajamento tenha as mesmas capacidades visuais, porem com um layout diferente inspirado nas imagens de referencia (@brandsdecoded): fundo escuro, texto grande bold com palavras em cor destaque (laranja/vermelho), imagem centralizada, header com marca, e suporte a video alem de imagem.

### Layout dos slides (baseado nas referencias)

Cada slide segue este padrao:
- **Header**: barra superior com "Powered by [marca]" a esquerda, "@handle" centro, "2026 //" direita
- **Bloco de texto**: tipografia grande, bold, com palavras-chave em cor destaque (laranja). Frases curtas e impactantes
- **Imagem/Video**: foto ou video centralizado, proporcao ~16:9 dentro do card
- **Texto inferior**: paragrafo de apoio em fonte menor, com trechos em cor destaque
- **Fundo**: escuro (#1a1a1a) ou claro (#f5f5f5) alternando entre slides

### Plano de implementacao

**Arquivo 1: `src/components/EngagementCarouselPreview.tsx`** (CRIAR — ~800-1000 linhas)

Componente visual completo seguindo a arquitetura do StrategicCarouselPreview:

1. **6 slides renderizados em canvas 1080x1350** com layout @brandsdecoded:
   - Slide 1 (Capa/Gancho): fundo escuro + imagem + texto grande bold
   - Slide 2 (Problema): fundo claro + texto + imagem
   - Slide 3 (Solucao): fundo escuro + texto com destaque + imagem
   - Slide 4 (Prova): fundo claro + texto + imagem
   - Slide 5 (Autoridade): fundo escuro + texto + imagem
   - Slide 6 (CTA): fundo escuro + texto CTA + imagem

2. **Funcionalidades iguais ao Carrossel Visual**:
   - Upload de imagem por slide (reutilizar pattern do SlideWrapper)
   - **Upload de video** por slide (aceitar video/*, exibir `<video>` no preview, gerar thumbnail para export PNG)
   - Editor inline de textos (textarea com bold/italic/uppercase)
   - Controles de cor (fundo, cor de destaque do texto)
   - Escala de imagem por slide (slider 50-150%)
   - Seletor de fonte e tamanho global
   - Export individual e em lote como PNG via Canvas 2D

3. **Renderizacao de texto rico**: suporte a `**bold**` e `{destaque}` para aplicar cor accent em palavras especificas

4. **Media type toggle**: botao por slide para alternar entre imagem e video. Videos mostram thumbnail no preview e frame no export

**Arquivo 2: `src/components/EngagementCarouselSection.tsx`** (REESCREVER)

Transformar de componente texto-only para wrapper que:
- Gera conteudo via IA (manter edge function existente)
- Mapeia slides gerados para o estado do editor visual
- Renderiza `<EngagementCarouselPreview>` com todos os controles
- Persiste configuracoes visuais (imagens, cores, textos editados) no campo `engagement_carousel` do `instagram_copies`
- Botoes "Exportar PNGs" e "Baixar ZIP" (reutilizar logica do JSZip existente)

**Arquivo 3: `src/components/InstagramCopyGenerator.tsx`** (EDITAR)

- Substituir o `<EngagementCarouselSection>` simples pelo novo com props adicionais (productImages, primaryColor, accentColor)
- Passar as mesmas imagens do produto ja carregadas

### Detalhes tecnicos

- **Video upload**: `<input accept="image/*,video/*">`. Para video, criar thumbnail via `<canvas>` + `<video>.currentTime`. No export PNG, desenhar o frame do video no canvas
- **Texto com destaque**: parser simples — `{texto}` renderiza com `accentColor`, `**texto**` renderiza bold. Combinaveis
- **Persistencia**: salvar `slideImageMap`, `slideTexts`, `mediaType` (image|video) por slide no JSON do banco
- **Export PNG**: funcao `generateEngagementSlidePNG()` similar a `generateSlidePNG()` existente, com o layout @brandsdecoded

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/components/EngagementCarouselPreview.tsx` | **Criar** |
| `src/components/EngagementCarouselSection.tsx` | Reescrever |
| `src/components/InstagramCopyGenerator.tsx` | Editar (passar props extras) |

### Resultado esperado
- Carrossel Engajamento gera imagens visuais no estilo @brandsdecoded (fundo escuro, texto grande, destaques em cor)
- Upload de imagem E video por slide
- Editor inline com formatacao (bold, destaque colorido, uppercase)
- Export como PNG 1080x1350
- Mesmas funcionalidades do Carrossel Visual mas com layout editorial/storytelling

