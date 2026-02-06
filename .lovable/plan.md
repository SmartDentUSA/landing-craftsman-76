

# Plano: Corrigir Alucinacoes no Gerador YouTube

## Diagnostico

A investigacao revelou **3 causas raiz** que permitem a IA inventar informacoes nos roteiros e descricoes de YouTube:

### Causa 1: Clinical Brain DESATIVADO por padrao

O frontend (`YouTubeDescriptionGenerator.tsx`, linha 173) chama a edge function **sem** enviar `use_clinical_brain: true`:

```typescript
// Chamada atual - SEM Clinical Brain
body: { productId }
```

Isso faz com que o sistema use um `baseSystemPrompt` generico de apenas 1 linha (linha 106):
```
"Voce e um especialista senior em roteiros audiovisuais tecnicos para YouTube..."
```

O poderoso Master System Prompt (com regras anti-alucinacao, compatibilidade de produtos, workflow odontologico) **nunca e ativado** para YouTube.

### Causa 2: Prompt de Descricao YouTube muito pobre

O prompt para descricoes YouTube (`generate-social-content`, linhas 673-697) recebe apenas 4 campos do produto:
- Nome, Descricao, Categoria, Beneficios

Enquanto o prompt do Instagram (linhas 698+) recebe **8 campos** incluindo Keywords, Features, Target Audience, Preco e Bot Trigger Words. Essa falta de contexto forca a IA a "preencher lacunas" inventando dados.

### Causa 3: System Prompt generico para descricoes

O system prompt da funcao `generateWithDualAI` (linha 986-987) para YouTube e apenas:
```
"Voce e especialista em SEO para YouTube. Sempre retorne apenas JSON valido, sem markdown."
```

Zero instrucoes sobre precisao factual, zero regras anti-alucinacao.

---

## Alteracoes Tecnicas

### Alteracao 1: Ativar Clinical Brain no YouTube Script

**Arquivo:** `src/components/YouTubeDescriptionGenerator.tsx`
**Linha:** 173

**De:**
```typescript
body: { productId }
```

**Para:**
```typescript
body: { productId, use_clinical_brain: true }
```

---

### Alteracao 2: Fortalecer o baseSystemPrompt do Roteiro

**Arquivo:** `supabase/functions/generate-youtube-script/index.ts`
**Linha:** 106

**De:**
```typescript
const baseSystemPrompt = 'Voce e um especialista senior em roteiros audiovisuais tecnicos para YouTube. Sempre retorne apenas JSON valido, sem markdown ou explicacoes adicionais.';
```

**Para:**
```typescript
const baseSystemPrompt = `Voce e um especialista senior em roteiros audiovisuais tecnicos para YouTube.

REGRA ABSOLUTA - ZERO ALUCINACAO:
- Use EXCLUSIVAMENTE as informacoes do produto fornecidas no prompt
- JAMAIS invente dados tecnicos, especificacoes, certificacoes ou numeros
- JAMAIS faca promessas clinicas, regulatorias ou de resultados nao documentados
- JAMAIS mencione produtos, marcas ou materiais que nao estejam explicitamente nos dados
- Se uma informacao nao foi fornecida, NAO a mencione no roteiro
- Prefira ser generico a inventar: "material de alta qualidade" em vez de inventar uma especificacao
- Todo claim tecnico DEVE estar presente nos dados do produto

Sempre retorne APENAS JSON valido, sem markdown ou explicacoes adicionais.`;
```

---

### Alteracao 3: Expandir o prompt de Descricao YouTube

**Arquivo:** `supabase/functions/generate-social-content/index.ts`
**Linhas:** 673-697

**De:** (prompt com apenas 4 campos)

**Para:**
```typescript
} else if (type === 'youtube') {
    return `Voce e um especialista em criacao de conteudo para YouTube e SEO de videos.

Gere uma descricao completa para video do YouTube baseada EXCLUSIVAMENTE nos dados fornecidos abaixo.

Informacoes do Produto:
- Nome: {product.name}
- Descricao: {product.description}
- Categoria: {product.category}
- Beneficios: {product.benefits}
- Caracteristicas: {product.features}
- Aplicacoes: {product.applications}
- Publico-alvo: {product.target_audience}
- Keywords SEO: {product.keywords}

Informacoes da Empresa:
- Nome: {company.company_name}
- Template de Rodape: {company.youtube_company_footer}

REGRAS ANTI-ALUCINACAO (OBRIGATORIO):
- Use APENAS dados presentes acima. NAO invente especificacoes, numeros ou beneficios
- NAO faca promessas clinicas ou regulatorias nao documentadas
- NAO mencione produtos ou marcas que nao estejam nos dados
- Se um campo diz "Nao informado", NAO invente conteudo para ele
- Tags devem ser baseadas nas keywords reais do produto

CRITICO: Retorne APENAS um JSON valido, sem blocos de codigo markdown, sem texto adicional.

Formato JSON esperado:
{
  "title_suggestion": "Titulo SEO baseado no nome real do produto",
  "description": "Descricao factual com dados reais do produto",
  "tags": ["tags", "baseadas", "nas", "keywords", "reais"]
}

IMPORTANTE: Nao use blocos de codigo markdown, retorne apenas o JSON puro.`;
```

---

### Alteracao 4: Adicionar substituicao de {product.features}

**Arquivo:** `supabase/functions/generate-social-content/index.ts`
**Apos linha 863** (depois de `processedPrompt.replace(/{product\.target_audience}/g, targetAudienceText)`)

**Adicionar:**
```typescript
// Processar features/caracteristicas
const featuresArray = Array.isArray(product.features) ? product.features : [];
const featuresText = featuresArray.join(', ') || 'Nao informadas';
processedPrompt = processedPrompt.replace(/{product\.features}/g, featuresText);
```

---

### Alteracao 5: Fortalecer systemPrompt de descricoes

**Arquivo:** `supabase/functions/generate-social-content/index.ts`
**Linhas:** 986-987

**De:**
```typescript
: type === 'youtube'
? 'Voce e especialista em SEO para YouTube. Sempre retorne apenas JSON valido, sem markdown.'
```

**Para:**
```typescript
: type === 'youtube'
? 'Voce e especialista em SEO para YouTube com foco em PRECISAO FACTUAL. Use EXCLUSIVAMENTE os dados do produto fornecidos. JAMAIS invente especificacoes, beneficios ou claims nao documentados. Sempre retorne apenas JSON valido, sem markdown.'
```

---

## Resumo das Alteracoes

| Arquivo | Localizacao | Correcao |
|---------|-------------|----------|
| `YouTubeDescriptionGenerator.tsx` | Linha 173 | Ativar `use_clinical_brain: true` |
| `generate-youtube-script/index.ts` | Linha 106 | Fortalecer baseSystemPrompt com regras anti-alucinacao |
| `generate-social-content/index.ts` | Linhas 673-697 | Expandir prompt YouTube com 8 campos + regras |
| `generate-social-content/index.ts` | Apos linha 863 | Adicionar substituicao de `{product.features}` |
| `generate-social-content/index.ts` | Linhas 986-987 | Fortalecer systemPrompt com foco em precisao |

---

## Resultado Esperado

- **Roteiros de Video**: Com Clinical Brain ativo, a IA recebera o MASTER_SYSTEM_PROMPT completo incluindo regras de compatibilidade, workflow odontologico, e campos anti-alucinacao do produto
- **Descricoes YouTube**: Receberao contexto completo (8 campos em vez de 4) e instrucoes explicitas contra invencao de dados
- **Ambos**: System prompts fortalecidos com regras de precisao factual em todas as camadas (system prompt + user prompt)
- **Zero alucinacoes** para dados que existem no card do produto

