
# Reformular Prompt do `generate-instagram-carousel` — Nova Estrutura de 6 Slides Smart Dent

## O que muda e por quê

Atualmente a edge function `generate-instagram-carousel` gera **7 slides** com estrutura genérica (Dor → Virada → Diferencial Técnico → Vantagens → Resultado → CTA). O usuário quer que o sistema siga a **metodologia Smart Dent de 6 slides**, específica para produtos odontológicos e com **restrição explícita de preços/condições comerciais**.

---

## Diferenças entre a estrutura atual e a nova

| Posição | Atual (7 slides) | Nova (6 slides) |
|---|---|---|
| 1 | Capa (Gancho) — genérico | **Gancho** — dor/problema real do produto |
| 2 | A Dor (Identificação) | **Solução** — produto como saída ideal |
| 3 | Virada de Chave | **Diferencial Técnico** — dados técnicos reais |
| 4 | Diferencial Técnico | **Experiência/Fluxo** — como fica o dia a dia |
| 5 | Vantagens Práticas | **Autoridade Smart Dent** — reforço de marca |
| 6 | Resultado Final | **CTA** — sem preço, foco no próximo passo |
| 7 | CTA | *(removido)* |

---

## Mudanças na Edge Function `generate-instagram-carousel`

### 1. Ampliar o `SELECT` do banco — buscar mais campos

O query atual só pega 7 campos. A nova estrutura precisa de mais dados para gerar com fidelidade:

```typescript
// Atual
.select('name, benefits, features, keywords, applications, target_audience, sales_pitch')

// Novo — adicionar category, technical_specifications, description, competitor_comparison
.select('name, benefits, features, keywords, applications, target_audience, sales_pitch, category, technical_specifications, description, competitor_comparison')
```

### 2. Substituir `APPROACH_DESCRIPTIONS` por `SLIDE_ROLES` fixos

A nova estrutura não depende de "abordagens" variáveis — cada slide tem papel fixo:

```typescript
const SLIDE_ROLES = {
  1: { name: 'Gancho', role: 'Identifique a maior dor/problema que o produto resolve. Use a Descrição e Keywords para criar pergunta ou afirmação de impacto.' },
  2: { name: 'Solução', role: 'Apresente o produto como a solução ideal. Destaque a principal conveniência (ex: pincel aplicador, rapidez, exclusividade).' },
  3: { name: 'Diferencial Técnico', role: 'Use dados técnicos reais (ex: elimina chalk effect, substitui jateamento) para explicar por que o produto funciona. Foque no benefício técnico real.' },
  4: { name: 'Experiência / Fluxo', role: 'Descreva como a vida do técnico/dentista fica mais fácil com o produto no dia a dia. Tom: fluência clínica.' },
  5: { name: 'Autoridade Smart Dent', role: 'Reforce que é tecnologia Smart Dent e mencione a categoria do produto. Credibilidade de marca.' },
  6: { name: 'CTA', role: 'Chamada para ação clara (Link na Bio ou Comentário). NUNCA inclua valores monetários. Foco no próximo passo.' },
};
```

### 3. Reformular o `systemPrompt`

```typescript
const systemPrompt = `Você é um Especialista em Copywriting para Instagram e Estrategista de Marketing Digital para a Smart Dent.
Sua especialidade é transformar especificações técnicas de produtos odontológicos em narrativas de vendas de alta conversão para carrosséis.

MISSÃO: Usar SOMENTE as informações fornecidas no contexto do produto. Nunca inventar dados, números, claims clínicos ou características não documentadas.

REGRAS DE ESTILO:
- Linguagem técnica, porém acessível para dentistas e TPDs
- Destaque termos específicos da área (ex: IPA, alta carga inorgânica, chalk effect, caracterização)
- Textos curtos e escaneáveis (máximo 3 tópicos por slide)
- PROIBIDO citar preços, condições comerciais ou valores monetários

ESTRUTURA OBRIGATÓRIA DOS 6 SLIDES:
Slide 1 — GANCHO: Identifique a maior dor ou problema que o produto resolve (use Descrição e Keywords) e crie pergunta ou afirmação de impacto.
Slide 2 — SOLUÇÃO: Apresente o produto como a solução ideal. Destaque a principal conveniência.
Slide 3 — DIFERENCIAL TÉCNICO: Use dados técnicos reais para explicar por que o produto funciona. Foco no benefício técnico real, não em promessas genéricas.
Slide 4 — EXPERIÊNCIA/FLUXO: Descreva como a vida do técnico/dentista fica mais fácil com o produto no dia a dia.
Slide 5 — AUTORIDADE SMART DENT: Reforce que é tecnologia Smart Dent e mencione a categoria do produto.
Slide 6 — CTA: Chamada para ação clara (Link na Bio ou Comentário). NUNCA inclua valores monetários.

ANTI-ALUCINAÇÃO (OBRIGATÓRIO):
- Use APENAS dados presentes abaixo
- NÃO invente especificações, números ou resultados clínicos
- Se um dado não existir, escreva de forma neutra
- NUNCA mencione preços, promoções ou condições de pagamento

Retorne APENAS um JSON válido, sem markdown.`;
```

### 4. Reformular o `userPrompt`

```typescript
const userPrompt = `PRODUTO: ${product.name}
CATEGORIA: ${product.category || 'Não informado'}
DESCRIÇÃO: ${product.description || 'Não informado'}
BENEFÍCIOS: ${benefits}
DIFERENCIAIS TÉCNICOS: ${features}
APLICAÇÕES: ${product.applications || ''}
PALAVRAS-CHAVE: ${keywords}
PÚBLICO-ALVO: ${product.target_audience || 'Profissionais da área'}
ESPECIFICAÇÕES TÉCNICAS: ${technicalSpecs}
SALES PITCH: ${product.sales_pitch || 'Não disponível'}

Gere um CARROSSEL de 6 slides para Instagram.

Retorne APENAS este JSON (sem markdown, sem explicações):
{
  "slides": [
    { "position": 1, "title": "Gancho", "text": "...", "image_suggestion": "..." },
    { "position": 2, "title": "Solução", "text": "...", "image_suggestion": "..." },
    { "position": 3, "title": "Diferencial Técnico", "text": "...", "image_suggestion": "..." },
    { "position": 4, "title": "Experiência / Fluxo", "text": "...", "image_suggestion": "..." },
    { "position": 5, "title": "Autoridade Smart Dent", "text": "...", "image_suggestion": "..." },
    { "position": 6, "title": "CTA", "text": "...", "image_suggestion": "..." }
  ]
}`;
```

### 5. Ajustar validação de `slides.length` — de 7 para 6

```typescript
// Atual
if (!Array.isArray(slides) || slides.length !== 7) {

// Novo
if (!Array.isArray(slides) || slides.length !== 6) {
```

---

## Mudanças no `InstagramCopyGenerator.tsx`

### Atualizar `SLIDE_TITLES` — de 7 para 6 entradas

```typescript
const SLIDE_TITLES: Record<number, string> = {
  1: 'Gancho',
  2: 'Solução',
  3: 'Diferencial Técnico',
  4: 'Experiência / Fluxo',
  5: 'Autoridade Smart Dent',
  6: 'CTA (Chamada para Ação)'
};
```

### Ajustar `feedCarousels` — estrutura inicial de estados permanece (approach é mantido para compatibilidade)

A exibição dos slides no painel de texto de carrossel usa `SLIDE_TITLES` para rotular — isso já refletirá os 6 slides automaticamente.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-instagram-carousel/index.ts` | 1) Ampliar SELECT para incluir `category`, `description`, `technical_specifications`; 2) Substituir `APPROACH_DESCRIPTIONS` + `SLIDE_STRUCTURE` pelo novo `SLIDE_ROLES`; 3) Reformular `systemPrompt` com metodologia Smart Dent; 4) Reformular `userPrompt` com campos extras; 5) Validar `slides.length === 6` |
| `src/components/InstagramCopyGenerator.tsx` | Atualizar `SLIDE_TITLES` para 6 slides com nomes corretos |

**Zero impacto no carrossel visual estratégico (6 slides) — ele é gerado por caminho separado.**
**Zero impacto nas copies de Feed/Reels — são geradas por `generate-social-content`.**
