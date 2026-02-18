
# Slide 3: Extrair Headline, Corpo e Bullets do feedCopyBenefits

## Situação Atual

No `Slide3Technical` (linhas 515–519), quando `feedCopyBenefits` existe, o texto é exibido como um único parágrafo bruto:

```typescript
<p style={{ ... whiteSpace: 'pre-line' }}>
  {feedBenefits.slice(0, 500)}
</p>
```

Isso joga todo o texto junto sem estrutura visual — igual ao problema já resolvido no Slide 4.

## O Que Mudar

Aplicar a **mesma lógica de extração estruturada** que já existe no Slide 4 (`buildImpactNarrative` com `feedCopyProblemSolution`):

1. **Headline** → primeira linha não-vazia da copy (até 80 chars), exibida em destaque
2. **Corpo** → demais linhas de texto corrido (até 250 chars)
3. **Bullets** → linhas que começam com emoji ou marcador (`•`, `-`, `✅`, `🔥`, etc.)

## Implementação Técnica

### Arquivo: `src/components/StrategicCarouselPreview.tsx` — Função `Slide3Technical` (linhas 491–519)

Substituir o bloco atual de exibição do `feedBenefits` por lógica estruturada:

```typescript
// Parsing estruturado do feedCopyBenefits
let benefitsHeadline = '';
let benefitsBody = '';
let benefitsBullets: string[] = [];

if (feedBenefits) {
  const lines = feedBenefits.split('\n').map(l => l.trim()).filter(Boolean);
  benefitsHeadline = lines[0]?.slice(0, 80) || '';
  const bulletLines = lines.filter(l => /^[•\-✅🔥⚡🎯💡🌟⭐🏆💎👉➡️]/.test(l)).slice(0, 4);
  const bodyLines = lines.slice(1).filter(l => !bulletLines.includes(l));
  benefitsBody = bodyLines.join(' ').slice(0, 200);
  benefitsBullets = bulletLines;
}
```

### Layout Visual do Slide 3 (quando feedCopyBenefits existe)

```
┌─────────────────────────────────────────────────────┐
│ [3]                                                 │
│                                                     │
│  [IMAGEM]  │  TÍTULO EDITÁVEL                       │
│            │  ─────── (divider)                     │
│            │  HEADLINE (1ª linha — destaque)        │
│            │                                        │
│            │  Corpo de texto                        │
│            │                                        │
│            │  ✅ Bullet 1                           │
│            │  🔥 Bullet 2                           │
│            │  ⚡ Bullet 3                           │
└─────────────────────────────────────────────────────┘
```

**Estilos:**
- **Headline**: cor do `primaryColor`, bold, ~36px
- **Corpo**: `#d8d8d8`, ~26px, lineHeight 1.6
- **Bullets**: cada item com mini-card ou linha com accent color à esquerda

## Arquivo a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | Bloco `feedBenefits` no `Slide3Technical` — extrai headline/body/bullets e renderiza com hierarquia visual |

**1 arquivo, mudança cirúrgica. Zero impacto no fallback (specs/features continua igual).**
