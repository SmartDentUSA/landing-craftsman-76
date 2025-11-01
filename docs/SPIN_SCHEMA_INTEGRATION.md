# Integração SPIN com Schema.org

## Visão Geral

Quando produtos são selecionados no Editor de Landing Pages, o sistema automaticamente:

1. **Busca soluções SPIN** que contêm esses produtos
2. **Enriquece o Schema.org** com dados SPIN relacionados
3. **Expõe para IAs de busca** todo o contexto SPIN

## Schemas Gerados

### 1. WebPage (Solução SPIN)
- Título e descrição da solução
- Sales pitch completo
- URL da landing page SPIN

### 2. Table (Comparação com Concorrentes)
- Título da tabela
- Número de linhas/colunas
- Referência ao tipo de dor

### 3. ItemList + Review (Casos de Sucesso)
- Nome do cliente
- Especialidade e localização
- Resultados alcançados
- Rating 5/5

### 4. FAQPage (FAQs Específicos)
- Perguntas e respostas da solução SPIN
- Separado das FAQs gerais da landing page

### 5. PropertyValue (Métricas de Impacto)
- Métricas personalizadas (ex: "Redução de 12 minutos")
- Descrição contextualizada

## Exemplo de Saída

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "Aumente sua Produtividade em 50%",
      "description": "Com nosso sistema CAD/CAM...",
      "url": "https://smartdent.com.br/produtividade"
    },
    {
      "@type": "Table",
      "name": "Por que escolher nossa solução?",
      "numberOfRows": 3,
      "numberOfColumns": 4
    },
    {
      "@type": "ItemList",
      "name": "Casos de Sucesso - Produtividade",
      "itemListElement": [
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Dr. João Silva"
          },
          "reviewBody": "Reduzi tempo de entrega de 15 para 2 dias"
        }
      ]
    }
  ]
}
```

## Knowledge Base API

As soluções SPIN também são exportadas via Knowledge Base API:

```
GET /functions/v1/knowledge-base?format=ai_training&include_spin_solutions=true
```

### Formato AI Training (Markdown)

```markdown
## SOLUÇÕES SPIN SELLING (3)

### Aumente sua Produtividade em 50%
**Tipo de Dor:** delivery_speed
**Prioridade:** 1

**Pitch de Vendas Completo:**
[Texto completo do pitch...]

**Comparação com Concorrentes:**
Por que escolher nossa solução?

| Característica | Nossa Solução | Concorrente A | Concorrente B |
|---|---|---|---|
| Tempo de Entrega | 2 dias | 5-7 dias | 7-10 dias |
| Garantia | 5 anos | 2 anos | 1 ano |
```

## Benefícios para SEO

- ✅ **Descoberta Automática**: IAs encontram conteúdo SPIN relacionado aos produtos
- ✅ **Contexto Rico**: Tabelas de comparação indexadas
- ✅ **Casos de Sucesso**: Depoimentos estruturados
- ✅ **FAQs Contextualizadas**: Perguntas específicas da solução
- ✅ **Métricas Quantificáveis**: Dados de impacto estruturados
