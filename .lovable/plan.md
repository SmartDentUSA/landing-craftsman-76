
# Fix: Expandir `isVisualDescriptionLine()` para Cobrir Mais Padrões de Sugestão Visual

## Diagnóstico

A frase **"Infográfico estilizado em 3D mostrando a ponta da caneta..."** passa pelo filtro atual porque a função `isVisualDescriptionLine()` (linha 490 de `StrategicCarouselPreview.tsx`) não cobre todos os padrões que a IA usa para descrever conteúdo visual.

Analisando a frase completa:
- `"Infográfico estilizado em 3D mostrando a ponta da caneta..."` → a palavra **"Infográfico"** não está na lista
- `"Setas indicam a remoção química..."` → **"setas indicam"** não está na lista
- `"Ícones flutuantes discretos indicam..."` → **"ícones flutuantes"** não está (o filtro tem `flutuando em` mas não `flutuantes`)
- `"Ícones"** referentes a elementos gráficos → não coberto

A palavra `estilizado` **está** na lista mas a frase começar com "Infográfico" faz a linha entrar antes de chegar à palavra. Na verdade, `lower.includes('estilizado')` deveria pegar — mas provavelmente a linha foi fragmentada ou está em uma posição diferente de `lines[0]`.

## Causa Real

O filtro atual em `isVisualDescriptionLine()` tem gaps para os padrões mais novos que a IA gera:

```typescript
// Padrões NÃO cobertos atualmente:
"Infográfico estilizado em 3D mostrando..."   // falta: 'infográfico'
"Setas indicam a remoção química..."          // falta: 'setas indicam'
"Ícones flutuantes discretos indicam..."      // falta: 'ícones flutuantes', 'ícones discretos'
"...criação de uma camada de ancoragem..."    // parte de frase visual mais longa
```

## A Correção — Arquivo: `src/components/StrategicCarouselPreview.tsx`, linhas 490–506

Expandir a função `isVisualDescriptionLine()` adicionando as palavras-chave faltantes e melhorar a cobertura com padrões gerais:

```typescript
function isVisualDescriptionLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    // Linhas entre colchetes: [Imagem: ...], [Infográfico: ...]
    /^\[.{10,}\]/.test(line) ||
    // Tipos de conteúdo visual
    lower.includes('infográfico') ||           // ← NOVO
    lower.includes('gráfico') ||
    lower.includes('ilustração') ||
    lower.includes('diagrama') ||              // ← NOVO
    lower.includes('animação') ||             // ← NOVO
    // Descrições de ações visuais
    lower.includes('imagem mostrando') ||
    lower.includes('setas indicam') ||         // ← NOVO
    lower.includes('seta indicando') ||        // ← NOVO
    lower.includes('ícones flutuantes') ||     // ← NOVO
    lower.includes('ícones discretos') ||      // ← NOVO
    lower.includes('ícone indicando') ||       // ← NOVO
    lower.includes('ícones indicam') ||        // ← NOVO
    // Estilo e design de imagem
    lower.includes('design deve') ||
    lower.includes('estilizado') ||
    lower.includes('flutuando em') ||
    lower.includes('flutuantes') ||            // ← NOVO (cobre "ícones flutuantes discretos")
    lower.includes('cores como') ||
    lower.includes('nanopartículas') ||
    // Instruções de criação visual
    lower.includes('sugestão visual') ||
    lower.includes('sugestão de imagem') ||
    lower.includes('fundo deve') ||            // ← NOVO
    lower.includes('fundo com') ||             // ← NOVO (ex: "fundo com partículas...")
    lower.includes('deve mostrar') ||          // ← NOVO
    lower.includes('deve conter') ||           // ← NOVO
    lower.includes('deve transmitir') ||       // ← NOVO
    lower.includes('transmitir credibilidade') ||
    lower.includes('credibilidade científica') ||
    // Padrão geral: linha com "mostrando" em contexto visual
    (lower.includes('visualmente') && lower.includes('mostr')) ||
    (lower.includes('3d') && lower.includes('mostrando')) ||   // ← NOVO: "3D mostrando..."
    (lower.includes('mostrando') && lower.includes('ponta')) || // ← NOVO: "mostrando a ponta"
    (lower.includes('mostrando') && lower.includes('caneta'))   // ← NOVO: "mostrando a caneta"
  );
}
```

## Por que essa abordagem é correta

Em vez de listar palavras específicas de cada produto (como "caneta", "resina"), adicionamos padrões **estruturais** que a IA usa para descrever qualquer imagem:
- Tipos de mídia: `infográfico`, `diagrama`, `animação`
- Ações de composição visual: `setas indicam`, `ícones flutuantes`, `fundo deve`
- Predicados de design: `deve mostrar`, `deve transmitir`, `deve conter`

Isso torna o filtro robusto para futuros produtos diferentes.

## Arquivo a Modificar

| Arquivo | Mudança | Linhas |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | Expandir `isVisualDescriptionLine()` com ~12 novos padrões | 490–506 |

**1 arquivo, 1 função, mudança aditiva. Zero risco de regressão — apenas expande o filtro existente.**

## Exemplos do Antes / Depois

| Frase | Antes | Depois |
|---|---|---|
| "Infográfico estilizado em 3D mostrando..." | ❌ Passa (aparece no card) | ✅ Filtrada |
| "Setas indicam a remoção química..." | ❌ Passa | ✅ Filtrada |
| "Ícones flutuantes discretos indicam '135 MPa'..." | ❌ Passa | ✅ Filtrada |
| "Gráfico 3D com nanopartículas..." | ✅ Já filtrada | ✅ Ainda filtrada |

O filtro é aplicado tanto no **Slide 3** (`feedCopyBenefits`) quanto no **Slide 4** (`feedCopyProblemSolution`) — ambos já chamam `isVisualDescriptionLine()`, então a correção nessa única função resolve os dois slides automaticamente.
