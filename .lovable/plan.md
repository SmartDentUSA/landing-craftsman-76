

# Plano: Corrigir Exportação do IA Playbook - Dados N/A

## Problemas Identificados

Existem **4 problemas principais** que fazem com que dados apareçam como "N/A" no Playbook exportado, mesmo quando estão preenchidos no card do produto.

### Problema 1: Tabela de Comparação com Concorrentes (Critico)

O componente `CompetitorComparisonTable` salva os dados de forma **dinamica**, onde as chaves do objeto sao os nomes das colunas definidas pelo usuario (ex: "Caracteristica", "Nossa Solucao", "Concorrente A").

Porem, a funcao de exportacao tenta ler chaves **fixas** como `comp.competitor_name`, `comp.competitor_price`, `comp.our_advantages` - que **nao existem** no objeto salvo.

**JSON (linhas 1007-1017):**
```typescript
// ERRADO - chaves fixas que nao existem
competitor_name: comp.competitor_name || comp.name || comp[0] || '',
competitor_price: comp.competitor_price || comp.price || comp[1] || null,
```

**TXT (linhas 1241-1246):**
```typescript
// ERRADO - mesmas chaves fixas
${comp.competitor_name || comp.name || comp[0] || 'Concorrente'}
```

**Solucao:** Usar os `table_headers` para iterar dinamicamente sobre as colunas.

---

### Problema 2: Casos de Sucesso (SPIN Selling)

A exportacao busca `c.title` ou `c.name` (linha 1047), mas os dados sao salvos como `c.client_name`.

**De:**
```typescript
title: c.title || c.name || null,
```

**Para:**
```typescript
title: c.title || c.client_name || c.name || null,
```

---

### Problema 3: Citacoes Reais (SPIN Selling)

A exportacao busca `q.quote` ou `q.text` e `q.author`, mas os dados reais usam `q.pain`, `q.desire`, `q.expected_result` e `q.client_name`.

**De:**
```typescript
quote: q.quote || q.text || null,
author: q.author || null,
```

**Para:**
```typescript
quote: q.quote || q.text || q.pain || q.desire || q.expected_result || null,
author: q.author || q.client_name || null,
role: q.role || q.specialty || null,
```

---

### Problema 4: Instagram Copies - Formato Desatualizado

A exportacao espera `instagram_copies.copies[]` (formato antigo), mas o sistema atual salva como `feed_copies[]`, `reels_copies[]` e `story_copy`.

---

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/export-product-ai-playbook/index.ts`

#### Correcao 1: Competitor Comparison no JSON (linhas 1001-1024)

Substituir o mapeamento fixo por iteracao dinamica dos headers:

```typescript
competitor_comparison: {
  enabled: (product as any).competitor_comparison?.enabled || false,
  title: (product as any).competitor_comparison?.title || '',
  subtitle: (product as any).competitor_comparison?.subtitle || '',
  table_headers: (product as any).competitor_comparison?.table_headers || [],
  comparisons: ((product as any).competitor_comparison?.table_data || []).map((comp: any) => {
    const headers = (product as any).competitor_comparison?.table_headers || [];
    const mappedRow: Record<string, any> = {};
    
    // Mapear cada header para seu valor real
    headers.forEach((header: string) => {
      mappedRow[header] = comp[header] || '';
    });
    
    return mappedRow;
  }),
  summary: {
    total_competitors: ((product as any).competitor_comparison?.table_data || []).length,
    total_columns: ((product as any).competitor_comparison?.table_headers || []).length
  }
},
```

#### Correcao 2: Competitor Comparison no TXT (linhas 1236-1247)

Substituir por iteracao dinamica:

```typescript
## COMPARACAO COM CONCORRENTES
${(product as any).competitor_comparison?.enabled && ... ? `
Titulo: ${...}
Subtitulo: ${...}

Colunas: ${headers.join(' | ')}

${table_data.map((comp, idx) => {
  return `${idx + 1}. Registro:\n` + 
    headers.map(header => `   - ${header}: ${comp[header] || 'N/A'}`).join('\n');
}).join('\n\n')}
` : 'Comparacao nao configurada'}
```

#### Correcao 3: Success Cases SPIN (linha 1046-1050)

Adicionar fallback para `client_name`:

```typescript
success_cases: (sol.success_cases || []).map((c: any) => ({
  title: c.title || c.client_name || c.name || null,
  description: c.description || c.testimonial || null,
  result: c.result || c.outcome || null,
  specialty: c.specialty || null,
  location: c.location || null
})),
```

#### Correcao 4: Real Quotes SPIN (linha 1051-1055)

Adicionar fallbacks para campos reais:

```typescript
real_quotes: (sol.real_quotes || []).map((q: any) => ({
  quote: q.quote || q.text || q.pain || q.desire || q.expected_result || null,
  author: q.author || q.client_name || null,
  role: q.role || q.specialty || null,
  context: q.context || null
})),
```

#### Correcao 5: Instagram Copies - Atualizar formato (linhas 584-598)

Incluir os novos formatos `feed_copies`, `reels_copies`, `story_copy` e `feed_carousels`:

```typescript
instagram_copies: {
  // Formato antigo (compatibilidade)
  copies: (product.instagram_copies?.copies || []).map(...),
  // Formato novo (4 variacoes)
  feed_copies: product.instagram_copies?.feed_copies || [],
  reels_copies: product.instagram_copies?.reels_copies || [],
  story_copy: product.instagram_copies?.story_copy || null,
  feed_carousels: product.instagram_copies?.feed_carousels || [],
  total_copies: ...,
  last_generated: ...
},
```

#### Correcao 6: TXT - Instagram com novo formato (linhas 1447-1465)

Atualizar a secao de Instagram no TXT para incluir feed_copies e carrosseis.

---

## Resumo das Alteracoes

| Arquivo | Linhas | Correcao |
|---------|--------|----------|
| `export-product-ai-playbook/index.ts` | 1001-1024 | Competitor Comparison JSON - dinamico |
| `export-product-ai-playbook/index.ts` | 1236-1247 | Competitor Comparison TXT - dinamico |
| `export-product-ai-playbook/index.ts` | 1046-1050 | Success Cases - fallback client_name |
| `export-product-ai-playbook/index.ts` | 1051-1055 | Real Quotes - fallback campos reais |
| `export-product-ai-playbook/index.ts` | 584-598 | Instagram Copies - formato atualizado |
| `export-product-ai-playbook/index.ts` | 1447-1465 | Instagram TXT - formato atualizado |

---

## Resultado Esperado

- Tabela de Comparacao com Concorrentes exporta **todos os dados dinamicos** corretamente
- Casos de Sucesso SPIN mostram **nome do cliente** em vez de N/A
- Citacoes Reais SPIN mostram **conteudo real** (dor, desejo, resultado)
- Instagram Copies inclui **4 variacoes de Feed**, **carrosseis** e **stories**
- Zero campos N/A para dados que estao preenchidos no sistema

