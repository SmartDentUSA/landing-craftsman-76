

# Vincular produtos ao Wikidata da empresa nos geradores HTML

## Problema atual

O campo `wikidata_item_id` dos produtos é salvo no banco mas **nunca consumido**. Os geradores de HTML/JSON-LD não criam nenhum vínculo semântico entre o produto e a empresa. O dado está "morto".

## O que precisa existir

Nos HTMLs gerados (Landing Pages, E-commerce, Blog), cada produto deve ter um bloco JSON-LD que:

1. Identifique o produto como instância da categoria Wikidata (ex: `sameAs: wikidata.org/entity/Q1780993`)
2. Vincule à empresa como `manufacturer` / `brand` com `sameAs` apontando para o QID da empresa (Q138636902)
3. Crie a relação semântica completa para IAs e motores de busca

Exemplo do JSON-LD desejado:
```text
{
  "@type": "Product",
  "name": "Atos Resina Composta Direta - DA2",
  "category": "Dental Composite",
  "sameAs": "https://www.wikidata.org/entity/Q1780993",
  "manufacturer": {
    "@type": "Organization",
    "name": "Smart Dent",
    "sameAs": "https://www.wikidata.org/entity/Q138636902"
  },
  "brand": {
    "@type": "Brand",
    "name": "Smart Dent"
  }
}
```

## Plano

### 1. Atualizar `fetchKnowledgeGraph.ts` para incluir `wikidata_item_id`

O Knowledge Graph já puxa dados dos produtos mas não inclui o campo `wikidata_item_id`. Adicionar ao select para que os geradores tenham acesso.

### 2. Atualizar `mustache-template-engine.ts` — bloco Product JSON-LD

No template engine que gera o HTML das landing pages, enriquecer o JSON-LD de cada produto com:
- `sameAs` apontando para `wikidata.org/entity/{wikidata_item_id}` (quando disponível)
- `manufacturer` com `sameAs` apontando para `wikidata.org/entity/{company.wikidata_id}`
- `brand` com nome da empresa

### 3. Atualizar `ai-readiness-helpers.ts` — enriquecer entidades de produto

Criar uma função `enrichProductWithWikidata()` que receba o produto + company profile e retorne o bloco JSON-LD completo com os vínculos semânticos.

### 4. Atualizar os demais geradores de HTML

Verificar e aplicar o mesmo padrão nos outros geradores (blog, e-commerce, SPIN) que referenciam produtos, garantindo que o vínculo `produto → categoria Wikidata → empresa` esteja presente em todas as páginas.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/_shared/fetchKnowledgeGraph.ts` | Incluir `wikidata_item_id` no select de produtos |
| `supabase/functions/_shared/mustache-template-engine.ts` | Adicionar `sameAs`, `manufacturer`, `brand` no JSON-LD de Product |
| `supabase/functions/_shared/ai-readiness-helpers.ts` | Nova função `enrichProductWithWikidata()` |
| Geradores HTML (blog, e-commerce, SPIN) | Consumir `wikidata_item_id` nos blocos JSON-LD |

### Resultado

Após a implementação, cada página gerada terá o grafo semântico completo:

```text
Smart Dent (Q138636902) --[manufacturer]--> Atos Resina Composta
                                              |
                                              sameAs → Q1780993 (dental composite)
```

Isso cria **autoridade semântica**: motores de busca e IAs entendem que a Smart Dent é fabricante/distribuidora de produtos da categoria "dental composite", reforçando E-E-A-T.

