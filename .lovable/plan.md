

# Plano: Forcar consolidacao de tabelas duplicadas

## Diagnostico

O prompt ja contem regras de consolidacao (adicionadas na correcao anterior), mas o modelo Gemini 2.5 Flash ainda retornou **2 tabelas** para o PDF que contem **1 unica tabela** comparativa de scanners intraorais em 3 paginas.

**Por que o prompt nao foi suficiente:**
- A descricao do campo `extracted_tables` no tool calling diz "TODAS as tabelas encontradas no PDF", o que incentiva a IA a separar
- O modelo tende a priorizar as instrucoes do schema do tool calling sobre o system prompt
- Confiar apenas no prompt para consolidacao nao e robusto o suficiente

## Solucao: Prompt mais forte + Post-processing no servidor

### Correcao 1: Reforcar prompt e descricao do tool calling

**Arquivo:** `supabase/functions/transcribe-landing-page-pdf/index.ts`

Alteracoes no SYSTEM_PROMPT:
- Tornar a regra de consolidacao mais enfatica e repetitiva
- Adicionar exemplo explicito do PDF de scanners (tabela que se estende por paginas)

Alteracoes no schema do tool calling:
- Mudar a descricao de `extracted_tables` de "TODAS as tabelas encontradas no PDF" para "Tabelas do PDF ja consolidadas. Se paginas diferentes comparam os MESMOS itens, retorne como UMA unica tabela"

### Correcao 2: Post-processing automatico no servidor

**Arquivo:** `supabase/functions/transcribe-landing-page-pdf/index.ts`

Apos receber a resposta da IA, adicionar logica de merge automatico:

```text
1. Percorrer o array extracted_tables
2. Se duas ou mais tabelas tiverem os MESMOS headers (ou headers com overlap > 80%), merge automatico:
   - Manter headers da primeira tabela
   - Concatenar rows de todas as tabelas com mesmos headers
   - Adicionar linha separadora com o titulo da tabela seguinte como categoria
3. Retornar o array consolidado
```

Esta logica garante que mesmo que a IA retorne multiplas tabelas fragmentadas, o servidor as consolida antes de enviar ao frontend.

### Correcao 3: Atualizar descricao no USER_PROMPT

Adicionar instrucao direta no USER_PROMPT reforçando:

```text
IMPORTANTE: Este documento pode conter UMA tabela que se estende por varias paginas.
Se as colunas forem as mesmas em diferentes paginas, consolide em UMA UNICA tabela.
```

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/transcribe-landing-page-pdf/index.ts` | Reforcar prompt + adicionar post-processing de merge de tabelas |

## Resultado Esperado

- O PDF de scanners intraorais retornara **1 unica tabela** com todas as linhas consolidadas
- Linhas separadoras (ex: "--- Software base ---") separarao as secoes dentro da mesma tabela
- Se um PDF realmente tiver tabelas DIFERENTES (headers distintos), elas continuarao como entradas separadas
- A solucao e robusta pois nao depende apenas do modelo seguir o prompt

