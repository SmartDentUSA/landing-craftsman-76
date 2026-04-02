

## Diagnóstico: Por que nada funciona no Google APIs

### Problemas identificados

**Problema 1 — Gemini API retorna vazio (generate-local-seo-page, respond-review-ai, update-youtube-metadata)**

As 4 edge functions novas usam a API direta do Google (`generativelanguage.googleapis.com`) com modelo `gemini-1.5-flash`. Todas as outras ~20 edge functions funcionais do projeto usam a **Lovable AI Gateway** (`ai.gateway.lovable.dev`) com modelo `google/gemini-2.5-flash` e `LOVABLE_API_KEY`.

O `GOOGLE_AI_API_KEY` funciona para embeddings mas está falhando para `generateContent` — provavelmente `gemini-1.5-flash` está deprecated ou a key não tem permissão para esse modelo. Resultado: 100% dos calls retornam empty response.

**Problema 2 — respond-review-ai retorna `generated: 0`**

Correto: todas as 30 reviews em `raw_reviews` já têm `response_from_owner` preenchido. A query filtra `WHERE response_from_owner IS NULL` e encontra 0 registros. Não é bug — é falta de dados novos.

**Problema 3 — generate-local-seo-page retorna `generated: 0`**

Existem 18 targets com `status='approved'` e `html_generated=false`, mas o Gemini retorna vazio para todos (ver Problema 1).

### Correção

**Migrar as 4 edge functions para usar a Lovable AI Gateway** (mesmo padrão das funções que funcionam):

- **Endpoint**: `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Auth**: `Bearer ${LOVABLE_API_KEY}` (já existe como secret)
- **Model**: `google/gemini-2.5-flash`
- **Response format**: `data.choices[0].message.content` (OpenAI-compatible)

**Arquivos a modificar:**

| Edge Function | Mudança |
|---|---|
| `respond-review-ai/index.ts` | Trocar fetch Gemini direto → Lovable Gateway |
| `generate-local-seo-page/index.ts` | Trocar fetch Gemini direto → Lovable Gateway |
| `update-youtube-metadata/index.ts` | Trocar fetch Gemini direto → Lovable Gateway |
| `publish-gbp-post/index.ts` | Já não usa Gemini (só publica), sem mudança de AI |

Em cada função, a mudança é:
```typescript
// ANTES (não funciona):
const geminiRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  { body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
)
const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

// DEPOIS (padrão do projeto):
const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  })
})
const text = data.choices?.[0]?.message?.content
```

Adicionar logging da resposta Gemini quando vazia para debug futuro.

**Para respond-review-ai**: a lógica de filtro está correta. Como todas as reviews já têm resposta, o botão "Gerar Respostas" não terá efeito até que novas reviews sem resposta apareçam (via `extract-google-reviews`).

### Resultado esperado
- `generate-local-seo-page` gera HTML para os 18 targets aprovados
- `respond-review-ai` funciona quando houver reviews sem resposta
- `update-youtube-metadata` gera metadados para vídeos na fila
- Todas usam o mesmo gateway AI que o resto do projeto

