

## Fix: Erro ao gerar carrossel de engajamento

### Causa raiz

A edge function `generate-instagram-carousel` (linha 35) exige que `feedCopy` seja truthy:
```
if (!productId || !feedCopy || !approach) { return 400 }
```

O frontend envia `feedCopy: feedCopy || ''` — quando `feedCopy` é `undefined` (prop opcional), vira string vazia `''`, e `!''` é `true`, causando erro 400.

### Fix

**Arquivo: `src/components/EngagementCarouselSection.tsx`** (linha 148-149)

Enviar um fallback não-vazio quando feedCopy está ausente:
```ts
feedCopy: feedCopy || productName || 'Gerar conteúdo',
```

Isso garante que o campo nunca seja vazio, usando o nome do produto como contexto mínimo para a IA.

### Resultado
- Botão "Gerar Carrossel" funciona mesmo sem feedCopy preenchido
- A IA usa o nome do produto como contexto quando não há copy de feed disponível

