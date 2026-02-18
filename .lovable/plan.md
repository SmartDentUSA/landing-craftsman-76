
# Fix Slide 4: Texto "💫 Experiência" Saindo Fora do Card

## Diagnóstico

No `Slide4Experience` (linha 527 de `StrategicCarouselPreview.tsx`), o painel direito (que contém o label, keyword e benefit) está definido com:

```tsx
<div style={{ width: '50%', background: primaryColor, display: 'flex', flexDirection: 'column',
  justifyContent: 'center', padding: '80px 70px', overflow: 'visible' }}>
```

O `overflow: 'visible'` permite que qualquer conteúdo que exceda as bordas do painel (50% da largura do slide) transborde visualmente para além dos limites do card. Quando o slide é escalado a 22% para preview via `transform: scale(0.22)`, esse overflow fica claramente visível — o texto "💫 Experiência" aparece fora do card.

## Causa Raiz

```text
SLIDE_W = 1080px total
Painel direito = 50% = 540px

padding: '80px 70px' → área útil = 540 - 140 = 400px de largura

keyword com fontSize=90 + textos longos → pode exceder 400px
overflow: 'visible' → texto vaza para fora do card
```

O `overflow: 'visible'` foi provavelmente deixado intencional para o keyword "crescer" visualmente além do painel, mas o efeito colateral é o texto transbordar o card inteiro.

## Solução

Trocar `overflow: 'visible'` por `overflow: 'hidden'` no painel direito do Slide 4.

## Mudança Técnica

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

**Linha 527** — Trocar `overflow: 'visible'` por `overflow: 'hidden'`:

```tsx
// ANTES (linha 527):
<div style={{ width: '50%', background: primaryColor, display: 'flex', flexDirection: 'column',
  justifyContent: 'center', padding: '80px 70px', overflow: 'visible' }}>

// DEPOIS:
<div style={{ width: '50%', background: primaryColor, display: 'flex', flexDirection: 'column',
  justifyContent: 'center', padding: '80px 70px', overflow: 'hidden' }}>
```

## Impacto

| Item | Status |
|---|---|
| Texto "💫 Experiência" dentro do card | ✅ Corrigido |
| Outros slides | ✅ Não afetados |
| Canvas export | ✅ Não afetado (canvas já respeita limites por natureza) |

Apenas **1 linha**, **1 arquivo**.
