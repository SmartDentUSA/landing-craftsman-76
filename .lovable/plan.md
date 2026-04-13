

## Plano: Corrigir conteudo SEO/AI aparecendo visivel no HTML do e-commerce

### Problema
O HTML gerado pelo `generate-ecommerce-html` injeta blocos semanticos para SEO/AI que aparecem como texto visivel na Loja Integrada. A Loja Integrada so usa o campo `descricao_completa` (HTML puro) e:
1. Nao carrega CSS externo, entao `class="visually-hidden"` nao esconde nada
2. Provavelmente strip ou renderiza `<script type="application/ld+json">` como texto
3. Blocos fora do `</article></main>` ficam soltos

### Blocos afetados no `generate-ecommerce-html/index.ts`

1. **GEO Context** (linhas 2504-2528) — usa `class="visually-hidden"` SEM inline style. Aparece toda a descricao da empresa, setor, expertise, etc.

2. **JSON-LD principal** (linha 2604) — `<script type="application/ld+json">` com Product + WebPage + FAQPage + Organization + DefinedTermSet. Loja Integrada renderiza como texto.

3. **Entity Index HTML** (linha 2607) — `generateEntityIndexHTML()` gera links Wikidata com `VISUALLY_HIDDEN_STYLE` inline (OK para CSS, mas a Loja Integrada pode nao respeitar).

4. **Entity Index JSON-LD** (linha 2616) — outro `<script>` tag renderizado como texto.

5. **Thing JSON-LD Wikidata** (linhas 2634-2643) — mais um `<script>` tag.

### Correcao

**Remover TODOS os blocos que nao sao conteudo visual** do HTML destinado a Loja Integrada. Esses blocos so fazem sentido em paginas que voce controla (landing pages, blog). Na Loja Integrada, a plataforma ja tem seu proprio `<head>`, Schema, etc.

Alteracoes em `supabase/functions/generate-ecommerce-html/index.ts`:

1. **Remover bloco GEO Context** (linhas 2489-2528) — empresa ja esta no Schema da Loja Integrada
2. **Remover `<script>` JSON-LD principal** (linha 2604) — a Loja Integrada nao suporta scripts no `descricao_completa`
3. **Remover Entity Index HTML** (linha 2607)
4. **Remover Entity Index JSON-LD** (linhas 2609-2616)
5. **Remover MedicalEntity push** (linhas 2618-2627) — ja esta depois do JSON-LD, mas tambem desnecessario
6. **Remover Thing JSON-LD Wikidata** (linhas 2632-2644)
7. **Manter** o `</article></main>` fechamento (linha 2630)

Essencialmente, o HTML do e-commerce deve terminar em `</section></article></main>` sem nenhum bloco de schema/AI depois.

### Arquivo editado
- `supabase/functions/generate-ecommerce-html/index.ts` (~60 linhas removidas)

### Apos correcao
- Deploy da edge function
- Gerar HTML novamente para o produto
- Enviar para Loja Integrada e verificar que nao aparece texto de schema

