

# Corrigir sincronização Wikidata de produtos

## Diagnóstico

Os logs confirmam: a edge function funciona, mas retorna **zero candidatos** para produtos. Causa: os produtos da Smart Dent são muito específicos/nicho (ex: "Atos Resina Composta Direta - DA2") e não existem como entidades individuais no Wikidata.

O campo `brand` está `null` na maioria dos produtos, o que também enfraquece a busca.

## Estratégia

Para produtos nicho, a abordagem correta é mapear para a **categoria genérica** mais próxima no Wikidata, não para o produto exato. Exemplos:
- "Atos Resina Composta Direta" → Q2648150 (dental composite / resina composta)
- "Impressora 3D Elegoo Mars" → Q59890062 (resin 3D printer)
- "Resina 3D Smart Print" → Q11474 (photopolymer resin)

## Plano

### 1. Expandir queries de busca na edge function

Atualmente busca apenas `name` e `brand + name`. Adicionar:
- `category` e `subcategory` do produto (já existem no banco)
- Termos genéricos extraídos do nome (ex: "resina composta", "impressora 3d")
- Busca pelo tipo do produto sem marca/modelo

### 2. Incluir `category` e `subcategory` na query do banco

Alterar o `select` em `handleProductSync` para incluir `category, subcategory`.

### 3. Adicionar mapa de fallback por categoria

Criar um mapeamento direto `categoria → QID` para as categorias conhecidas do projeto:

```text
RESINAS COMPOSTAS     → Q2648150  (dental composite)
IMPRESSORAS 3D        → Q59890062 (3D printer)
RESINAS 3D            → Q11474    (resin)
SCANNERS 3D           → Q1753819  (3D scanner)
SOFTWARES             → Q7397     (software)
CARACTERIZAÇÃO        → Q12345... (dental ceramics)
```

Se a busca dinâmica não encontrar match acima do threshold, usar o fallback da categoria.

### 4. Reduzir threshold de score para produtos

De 55 para 35, já que produtos nicho terão matches menos fortes mas ainda válidos semanticamente.

### 5. Melhorar extração de termos de busca

Extrair do nome do produto apenas os termos genéricos, removendo códigos (DA2), marcas e números de modelo.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/wikidata-sync/index.ts` | Expandir `handleProductSync` e `searchProductCandidates` com category/subcategory, fallback map, threshold ajustado |

### Detalhe técnico

A edge function será re-deployada automaticamente após a alteração. Nenhuma mudança no frontend é necessária — o `WikidataSyncButton` já está correto.

