## Plano: Diagnosticar e corrigir erro do ZIP — 🎨 Carrossel Visual

O toast atual só mostra "Não foi possível gerar o ZIP" e não há logs capturados do navegador, então não dá para identificar qual slide/etapa quebra. Plano em 2 passos.

### Passo 1 — Instrumentar `handleExportZip` em `src/components/InstagramCopyGenerator.tsx`

- Logar antes de cada slide: índice, `mediaType`, presença de `videoSrc`/`videoStorageUrl`, URL da imagem.
- Envolver cada chamada (`fetchAsDataUrl`, `generateSlidePNG`, `generateStrategicSlideVideo`) em try/catch com `console.error` detalhado (nome, mensagem, stack).
- Mostrar a mensagem real no toast de erro: `description: (error as Error)?.message ?? 'Erro desconhecido'`.
- Logar tamanho final do ZIP antes de disparar o download.

### Passo 2 — Corrigir a causa raiz

Após o usuário reproduzir e enviar o console, aplico o fix no slide/etapa específica (provavelmente: vídeo sem `videoSrc` válido após reload, CORS no `fetchAsDataUrl`, ou timeout em `generateStrategicSlideVideo`). Sem o log real, qualquer correção agora seria chute.

### Fora de escopo
Layouts, máscaras, tipografia e o gerador de Engajamento permanecem inalterados.
