

# Gerar Apostila DOCX da Solucao SPIN + Injetar na Base de Conhecimento

## Resumo

Adicionar um botao "Gerar Apostila" dentro do modal "Editar Solucao SPIN" que:
1. Coleta TODOS os dados da solucao SPIN (titulo, dor, produtos, casos de sucesso, quotes, metricas, FAQ, pitch, jornada, comparacao concorrentes, landing page, WhatsApp, etc.)
2. Busca dados completos dos produtos selecionados (`products_repository`)
3. Gera um documento Markdown estruturado completo (apostila)
4. Faz download como arquivo `.md` (estrutura pronta para DOCX)
5. Salva o conteudo da apostila no campo `metadata.apostila_content` da solucao SPIN
6. Atualiza o endpoint Knowledge Base (ai_training) para incluir a apostila quando presente
7. Atualiza o export JSON/ai_training de cada produto selecionado para referenciar a solucao SPIN

## Detalhes Tecnicos

### 1. Nova Edge Function: `export-spin-apostila`

**Arquivo:** `supabase/functions/export-spin-apostila/index.ts`

Responsabilidades:
- Receber `solution_id` via POST
- Buscar solucao SPIN completa (`spin_selling_solutions`)
- Buscar dados completos de todos os produtos selecionados (`products_repository`) incluindo: nome, descricao, beneficios, features, especificacoes tecnicas, FAQ, keywords, videos, imagens, clinical brain, anti-hallucination rules, competitor_comparison, etc.
- Buscar video testimonials globais (`video_testimonials`)
- Buscar company profile (para contexto)
- Gerar Markdown estruturado com secoes:
  1. Cabecalho (titulo, tipo de dor, prioridade)
  2. Pitch de Vendas
  3. Jornada SPIN (desire/pain/result)
  4. Metricas de Impacto
  5. Produtos Selecionados (dados completos de cada produto)
  6. Casos de Sucesso (com fotos, especialidade, resultados)
  7. Citacoes Reais (quotes de clientes)
  8. FAQ da Solucao
  9. Tabela de Comparacao com Concorrentes
  10. Mensagem WhatsApp completa
  11. Storytelling gerado
  12. Videos vinculados
  13. URL personalizada
- Salvar o Markdown gerado no campo `metadata.apostila_content` e `metadata.apostila_generated_at` da solucao
- Retornar o Markdown para download

### 2. Componente Frontend: Botao na barra de acoes do modal

**Arquivo:** `src/components/SpinSolutionEditModal.tsx`

- Adicionar import do icone `BookOpen` do lucide-react
- Adicionar estado `isGeneratingApostila`
- Criar funcao `generateApostila()` que:
  - Chama `supabase.functions.invoke('export-spin-apostila', { body: { solution_id } })`
  - Faz download do Markdown como arquivo `.md`
  - Exibe toast de sucesso
- Adicionar botao "Gerar Apostila" na barra de acoes (ao lado de "Cancelar" e "Atualizar"), visivel apenas quando `solutionId` existe (solucao ja salva)

### 3. Enriquecer Knowledge Base (ai_training)

**Arquivo:** `supabase/functions/knowledge-base/index.ts`

Na secao de SPIN Selling Solutions (linha ~1025), adicionar apos os dados existentes:

```
// Se a solucao tem apostila gerada, incluir conteudo completo
if (solution.metadata?.apostila_content) {
  text += `\n### APOSTILA COMPLETA DA SOLUÇÃO\n`;
  text += solution.metadata.apostila_content;
  text += `\n`;
}
```

Isso garante que ao acessar `?format=ai_training`, o conteudo completo da apostila aparece dentro da secao SPIN correspondente.

### 4. Enriquecer Export JSON de cada produto

**Arquivo:** `supabase/functions/knowledge-base/index.ts`

Na secao de produtos (formato ai_training e json), apos os dados do produto, verificar se o produto esta em alguma solucao SPIN que tem apostila:

```
// Dentro do loop de produtos, buscar solucoes SPIN que referenciam este produto
if (data.spin_solutions) {
  const relatedSpins = data.spin_solutions.filter(
    (sol: any) => sol.product_ids?.includes(p.id) && sol.metadata?.apostila_content
  );
  if (relatedSpins.length > 0) {
    text += `\n### SOLUÇÕES SPIN RELACIONADAS\n`;
    relatedSpins.forEach((sol: any) => {
      text += `- **${sol.title}** (Dor: ${sol.pain_type})\n`;
      text += `  Pitch: ${sol.sales_pitch || 'N/A'}\n`;
      if (sol.spin_journey) {
        text += `  Jornada: ${JSON.stringify(sol.spin_journey)}\n`;
      }
    });
  }
}
```

### 5. Config.toml

Adicionar entrada para a nova edge function:

```toml
[functions.export-spin-apostila]
verify_jwt = false
```

## Fluxo do Usuario

1. Abre "Editar Solucao SPIN"
2. Preenche/edita todos os dados
3. Clica em "Gerar Apostila"
4. Sistema gera documento Markdown completo com TUDO
5. Download automatico do arquivo `.md`
6. Conteudo salvo no `metadata.apostila_content`
7. Na proxima chamada ao Knowledge Base (`?format=ai_training`), a apostila aparece
8. Nos exports JSON/ai_training de cada produto, a referencia SPIN aparece

