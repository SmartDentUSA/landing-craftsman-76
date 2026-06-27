## Problema

No Slide 2 (✨ Apresentação) do **🎨 Carrossel Visual** aparece um quadrado cinza no meio do card.

## Causa

Em `src/components/StrategicCarouselPreview.tsx` (linhas 830–832), o layout "contain" do `Slide2Solution` renderiza um placeholder cinza fixo (`500x500 #e0e0e0`) sempre que `image` está vazio:

```tsx
) : (
  <div style={{ width: 500, height: 500, background: '#e0e0e0', borderRadius: 20 }} />
)}
```

Esse caminho é acionado em dois cenários comuns:
1. Quando o usuário ainda não escolheu uma foto do produto.
2. Quando `mediaType === 'video'` — o `SlideWrapper` faz `cloneElement` forçando `image=''` para que o vídeo de fundo apareça, mas o slide continua renderizando o placeholder por cima.

## Correção (mínima, só presentation)

Em `Slide2Solution`, remover o quadrado cinza:
- Substituir o bloco `else` por `null` (não renderiza nada quando não há imagem).
- Mantém o `flex: 1` do container pai para preservar o espaçamento do título/categoria.

Nenhuma outra lógica é alterada — modo cover, vídeo, logos e textos continuam intactos.