

## Fix: Video deve vir dentro do template do carrossel, não como arquivo separado

### Problema
Ao exportar o ZIP, o `.mp4` é adicionado como arquivo avulso (`engajamento_slide_1_video.mp4`) ao lado do PNG. O usuário espera que o vídeo tenha o mesmo layout/template do carrossel (textos, cores, gradient) aplicado sobre ele — não um vídeo cru separado.

### Solução

Criar uma função `generateEngagementSlideVideo` que usa a API `MediaRecorder` + Canvas para compor o vídeo com o template do carrossel por cima:

1. Renderizar o vídeo original dentro de um `<video>` offscreen
2. Em cada frame, desenhar o vídeo no canvas e aplicar o mesmo template (gradient, título, texto, badge) que o PNG usa
3. Gravar o canvas como WebM (MediaRecorder suporta nativamente) por N segundos
4. Adicionar o resultado ao ZIP como `engajamento_slide_{i}.webm` em vez de `.mp4` separado

**Porém**, isso é muito pesado no browser e o resultado seria `.webm` (não `.mp4`). A abordagem mais prática e imediata:

### Abordagem pragmática

Manter o `.mp4` no ZIP mas **dentro de uma pasta organizada** e **renomear** para ficar claro que pertence ao slide. Além disso, gerar o PNG do thumbnail com o template completo (já funciona) para que o usuário tenha a versão "template" como imagem.

**Mudança real pedida**: O vídeo deve ter o overlay do template. Como não é viável processar vídeo no browser com overlays em tempo real para export, a melhor solução é:

1. **No preview (card)**: O vídeo já toca dentro do template com textos sobrepostos via CSS — isso está correto
2. **No export ZIP**: Gerar um PNG com o primeiro frame + template completo (já funciona). Incluir o vídeo original como arquivo complementar, mas **nomeado claramente** dentro da mesma estrutura

### Alterações

| Arquivo | Ação |
|---|---|
| `src/components/EngagementCarouselSection.tsx` | Reorganizar ZIP: slides com vídeo geram PNG com template + vídeo original na mesma pasta. Renomear para `slide_1_capa.png` + `slide_1_video.mp4`. Toast explicativo. |

### Resultado esperado
- PNG do slide sempre tem o template completo (textos, gradient, cores)
- Vídeo original incluído como complemento com nome associado ao slide
- Estrutura do ZIP clara e organizada

