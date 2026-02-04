
# Plano: Gerador de Carrossel Instagram (7 Slides)

## Visão Geral

Adicionar um novo recurso dentro do componente `InstagramCopyGenerator` que gera automaticamente sugestões de carrossel (7 slides) para Instagram, baseado nos textos de Feed já criados. Cada variação (Storytelling, Benefits, Problem/Solution, Urgency) terá seu próprio carrossel com estrutura padronizada.

---

## Estrutura do Carrossel

Para cada variação do Feed, serão gerados 7 slides:

| Slide | Conteúdo | Objetivo |
|-------|----------|----------|
| **1. Capa (Gancho)** | Título impactante + sugestão visual | Parar o scroll, despertar curiosidade |
| **2. A Dor (Identificação)** | Problema do público + imagem sugestiva | Criar identificação emocional |
| **3. Virada de Chave** | Momento "aha!" + visual de transição | Mostrar que existe solução |
| **4. Diferencial Técnico** | Especificação técnica + visual do produto | Credibilidade e autoridade |
| **5. Vantagens Práticas** | Benefícios práticos + visual de uso | Tangibilizar o valor |
| **6. Resultado Final** | Transformação/resultado + before/after | Prova de valor |
| **7. CTA (Chamada para Ação)** | Texto + visual com botão/link | Converter interesse em ação |

---

## Alterações Técnicas

### Fase 1: Atualizar Tipos e Interfaces

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`

Adicionar novas interfaces para o carrossel:

```typescript
interface CarouselSlide {
  position: number;
  title: string;
  text: string;
  image_suggestion: string;
}

interface FeedCarousel {
  variation: number;
  approach: string;
  slides: CarouselSlide[];
  generated_at?: string;
}
```

---

### Fase 2: Adicionar Estados para Carrossel

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`

Adicionar novos estados:

```typescript
// === Estados para Carrossel ===
const [feedCarousels, setFeedCarousels] = useState<FeedCarousel[]>([
  { variation: 1, approach: 'storytelling', slides: [] },
  { variation: 2, approach: 'benefits', slides: [] },
  { variation: 3, approach: 'problem_solution', slides: [] },
  { variation: 4, approach: 'urgency', slides: [] }
]);
const [generatingCarousel, setGeneratingCarousel] = useState<number | null>(null);
const [activeCarouselSlide, setActiveCarouselSlide] = useState<Record<number, number>>({
  1: 1, 2: 1, 3: 1, 4: 1
});
```

---

### Fase 3: Criar Função de Geração de Carrossel

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`

Nova função que usa o texto do Feed para gerar carrossel:

```typescript
const generateCarouselFromFeed = async (variationNum: number) => {
  const feedVariation = feedCopies.find(v => v.variation === variationNum);
  if (!feedVariation?.copy) {
    toast({ title: "Erro", description: "Gere primeiro o texto do Feed", variant: "destructive" });
    return;
  }

  setGeneratingCarousel(variationNum);
  try {
    const { data, error } = await supabase.functions.invoke('generate-instagram-carousel', {
      body: {
        productId,
        feedCopy: feedVariation.copy,
        approach: feedVariation.approach
      }
    });

    if (error) throw error;

    if (data?.slides) {
      const updatedCarousels = [...feedCarousels];
      const index = updatedCarousels.findIndex(c => c.variation === variationNum);
      if (index !== -1) {
        updatedCarousels[index] = {
          ...updatedCarousels[index],
          slides: data.slides,
          generated_at: new Date().toISOString()
        };
        setFeedCarousels(updatedCarousels);
      }
      toast({ title: "Sucesso!", description: "Carrossel gerado com 7 slides!" });
    }
  } catch (error) {
    toast({ title: "Erro", description: "Não foi possível gerar o carrossel", variant: "destructive" });
  } finally {
    setGeneratingCarousel(null);
  }
};
```

---

### Fase 4: Adicionar UI do Carrossel

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`

Adicionar abaixo dos botões "Editar", "Copiar", "HTML" de cada variação do Feed:

```text
Layout Visual:
┌─────────────────────────────────────────────────────────┐
│ [Botões existentes: Editar | Copiar | HTML]             │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📸 Carrossel (7 Slides)              [🤖 Gerar IA]  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ◀ [1] [2] [3] [4] [5] [6] [7] ▶                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Slide 1: Capa (Gancho)                              │ │
│ │ ┌─────────────────┬─────────────────────────────┐   │ │
│ │ │ 💡 Sugestão de  │ Texto:                      │   │ │
│ │ │ Imagem:         │ "Você ainda está usando..." │   │ │
│ │ │ "Foto de        │                             │   │ │
│ │ │  profissional   │                             │   │ │
│ │ │  frustrado..."  │                             │   │ │
│ │ └─────────────────┴─────────────────────────────┘   │ │
│ │                                [Copiar] [HTML]      │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### Fase 5: Criar Edge Function para Geração

**Arquivo Novo:** `supabase/functions/generate-instagram-carousel/index.ts`

```text
Edge Function que:
1. Recebe: productId, feedCopy, approach
2. Busca dados do produto (nome, benefícios, diferenciais, keywords)
3. Usa IA (Lovable AI/Gemini) para gerar os 7 slides
4. Retorna JSON estruturado com slides

Prompt da IA incluirá:
- Contexto do produto
- Texto do Feed já gerado (para consistência)
- Abordagem específica (storytelling, benefits, etc.)
- Template de saída esperado (7 slides com título, texto, sugestão de imagem)
```

---

### Fase 6: Funções de Cópia e Exportação

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`

```typescript
const copyCarouselSlide = (slide: CarouselSlide, productName: string) => {
  const text = `SLIDE ${slide.position}: ${slide.title}

📸 SUGESTÃO DE IMAGEM:
${slide.image_suggestion}

✍️ TEXTO:
${slide.text}`;
  navigator.clipboard.writeText(text);
  toast({ title: "Copiado!", description: `Slide ${slide.position} copiado` });
};

const copyAllCarouselSlides = (carousel: FeedCarousel, productName: string) => {
  const text = carousel.slides.map(s => 
    `SLIDE ${s.position}: ${s.title}\n📸 ${s.image_suggestion}\n✍️ ${s.text}`
  ).join('\n\n---\n\n');
  navigator.clipboard.writeText(text);
  toast({ title: "Copiado!", description: "Todos os 7 slides copiados" });
};

const exportCarouselAsHTML = (carousel: FeedCarousel, productName: string) => {
  // Gerar HTML formatado para visualização em navegador
};
```

---

### Fase 7: Persistência dos Dados

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`

Salvar carrosséis no campo `instagram_copies` existente:

```typescript
const saveCarousel = async (variationNum: number) => {
  const { data: existingData } = await supabase
    .from('products_repository')
    .select('instagram_copies')
    .eq('id', productId)
    .single();

  const existingCopies = existingData?.instagram_copies || {};
  
  await supabase
    .from('products_repository')
    .update({
      instagram_copies: {
        ...existingCopies,
        feed_carousels: feedCarousels,
        last_carousel_update: new Date().toISOString()
      }
    })
    .eq('id', productId);
};
```

---

## Prompt da IA para Geração

```text
Você é um especialista em marketing digital para Instagram.

PRODUTO: {product_name}
BENEFÍCIOS: {benefits}
DIFERENCIAIS: {unique_selling_points}
PALAVRAS-CHAVE: {keywords}

ABORDAGEM: {approach} - {approach_description}

COPY DO FEED ORIGINAL:
{feed_copy}

---

Gere um CARROSSEL de 7 slides para Instagram baseado na copy acima.
Cada slide deve ter:
1. Título curto (máx 30 caracteres)
2. Texto para o slide (máx 150 caracteres)
3. Sugestão detalhada de imagem

ESTRUTURA OBRIGATÓRIA:
- Slide 1: CAPA (Gancho) - Pare o scroll, desperte curiosidade
- Slide 2: A DOR (Identificação) - Mostre que você entende o problema
- Slide 3: VIRADA DE CHAVE - O momento "aha!"
- Slide 4: DIFERENCIAL TÉCNICO - Credibilidade e especificações
- Slide 5: VANTAGENS PRÁTICAS - Benefícios tangíveis
- Slide 6: RESULTADO FINAL - Transformação/before-after
- Slide 7: CTA - Chamada para ação clara

Retorne APENAS JSON válido:
{
  "slides": [
    {
      "position": 1,
      "title": "Capa (Gancho)",
      "text": "Texto do slide...",
      "image_suggestion": "Descrição detalhada da imagem sugerida..."
    }
    // ... 7 slides total
  ]
}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/InstagramCopyGenerator.tsx` | Adicionar interfaces, estados, funções de geração, UI do carrossel |
| `supabase/functions/generate-instagram-carousel/index.ts` | **NOVO** - Edge function para gerar carrossel via IA |

---

## Fluxo de Uso

1. Usuário gera as 4 variações de **Copy para Feed**
2. Abaixo de cada variação (Storytelling, Benefits, etc.), aparece seção "📸 Carrossel (7 Slides)"
3. Usuário clica em "🤖 Gerar IA" para criar carrossel baseado naquela copy
4. IA gera os 7 slides com sugestões de imagem e texto
5. Usuário navega pelos slides (1-7), copia individualmente ou exporta tudo

---

## Resultado Final

Para cada variação de Feed:
- Storytelling → 7 slides de carrossel estilo narrativo
- Benefits → 7 slides focados em benefícios
- Problem/Solution → 7 slides estrutura problema→solução
- Urgency → 7 slides com gatilhos de urgência

Total: **28 slides** de carrossel por produto (4 variações × 7 slides)
