
# Dois Fixes: Filtrar Descrições de Imagem + Tabela no Slide 3 (Cientificidade)

## Problema 1 — Texto de imagem aparecendo no card

O texto "Gráfico 3D estilizado e elegante mostrando as nanopartículas..." é uma **sugestão visual** que a IA insere na copy como descrição de imagem. A função `buildImpactNarrative()` (Slide 4) e o parsing do `Slide3Technical` (Slide 3) não filtram essas linhas — então elas aparecem como headline ou corpo.

### Solução
Adicionar a função auxiliar `isVisualDescriptionLine()` no `StrategicCarouselPreview.tsx` e aplicá-la nos dois slides antes de usar qualquer linha como texto:

```typescript
function isVisualDescriptionLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    /^\[.{10,}\]/.test(line) ||   // [Imagem: ...]
    lower.includes('gráfico') ||
    lower.includes('ilustração') ||
    lower.includes('imagem mostrando') ||
    lower.includes('design deve') ||
    lower.includes('estilizado') ||
    lower.includes('flutuando em') ||
    lower.includes('cores como') ||
    lower.includes('nanopartículas') ||
    (lower.includes('visualmente') && lower.includes('mostr'))
  );
}
```

Aplicar em:
- **Slide 3**: filtrar `lines` antes de extrair `benefitsHeadline`, `benefitsBody`, `benefitsBullets`
- **Slide 4**: filtrar `lines` em `buildImpactNarrative()` antes de extrair headline, body e bullets do `feedCopyProblemSolution`

---

## Problema 2 — Tabela `competitor_comparison` no Card 3 (Cientificidade)

A tabela de comparação com concorrentes (`competitor_comparison`) já existe no produto (campo no banco), mas:
- **Não é passada** como prop do `InstagramCopyGenerator` para o `StrategicCarouselPreview`
- **Não é renderizada** no `Slide3Technical`

### Plano de implementação

**Passo 1 — Expandir `ProductData` interface em `StrategicCarouselPreview.tsx`:**

```typescript
interface CompetitorComparison {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  table_headers: string[];
  table_data: Array<Record<string, string>>;
}

interface ProductData {
  // ...campos existentes...
  competitorComparison?: CompetitorComparison;
}
```

**Passo 2 — Adicionar prop `competitorComparison` em `InstagramCopyGeneratorProps`:**

```typescript
interface InstagramCopyGeneratorProps {
  // ...props existentes...
  competitorComparison?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    table_headers: string[];
    table_data: Array<Record<string, string>>;
  };
}
```

**Passo 3 — Passar `competitorComparison` no `productData` do `StrategicCarouselPreview`:**

```typescript
productData={{
  // ...campos existentes...
  competitorComparison: competitorComparison,
}}
```

**Passo 4 — Renderizar a tabela no `Slide3Technical`:**

Quando `competitorComparison?.enabled && table_headers.length > 0 && table_data.length > 0`, exibir uma tabela compacta no painel direito do Slide 3, acima ou no lugar dos bullets do `feedCopyBenefits`:

```
┌─────────────────────────────────────────────────────┐
│ [3]                                                 │
│                                                     │
│  [IMAGEM]  │  TÍTULO ("Por que confiar?")           │
│            │  ─────── (divider)                     │
│            │  HEADLINE (do feedCopyBenefits)        │
│            │                                        │
│            │  ┌────────┬────────┬────────┐          │
│            │  │ Header │ Coluna │ Coluna │          │
│            │  ├────────┼────────┼────────┤          │
│            │  │ Linha 1│  val   │  val   │          │
│            │  │ Linha 2│  val   │  val   │          │
│            │  └────────┴────────┴────────┘          │
└─────────────────────────────────────────────────────┘
```

**Hierarquia no Slide 3 (nova ordem):**
1. `feedCopyBenefits` extraído (headline + corpo)
2. **Tabela `competitor_comparison`** (se habilitada e com dados) — substituindo ou completando os bullets
3. Fallback: `feedCopyBenefits` bullets
4. Fallback final: specs técnicas / features

**Estilo da tabela no slide (em px, para canvas 1080×1350):**
- Cabeçalho da tabela: `background: primaryColor`, texto branco, `fontSize: 22px`, `fontWeight: 700`
- Linhas pares: `background: rgba(255,255,255,0.06)`
- Linhas ímpares: `background: rgba(255,255,255,0.02)`
- Bordas: `1px solid rgba(255,255,255,0.12)`
- Texto das células: `color: #e0e0e0`, `fontSize: 20px`
- Primeira coluna (nome do produto/concorrente): bold

**Passo 5 — Passar `competitorComparison` no `generateSlidePNG()` (export ZIP):**

```typescript
const productData = {
  name: productName,
  // ...campos existentes...
  competitorComparison: competitorComparison,
};
```

---

## Localização dos Callers — onde buscar `competitorComparison`

O `InstagramCopyGenerator` é aberto por chamadores que já têm os dados do produto. É necessário verificar onde o componente é instanciado para adicionar a nova prop.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 1) Interface `ProductData` + `CompetitorComparison`; 2) `isVisualDescriptionLine()` helper; 3) Aplicar filtro em Slide 3 e Slide 4; 4) Renderizar tabela no `Slide3Technical` |
| `src/components/InstagramCopyGenerator.tsx` | 1) Adicionar prop `competitorComparison`; 2) Passá-la no `productData` do `StrategicCarouselPreview` e no export ZIP |
| Componentes que abrem `InstagramCopyGenerator` | Passar `competitorComparison` como prop (buscar e atualizar todos os callers) |

**Zero chamadas de API extras. Usa dados já carregados do banco.**
