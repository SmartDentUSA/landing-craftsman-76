

# Corrigir Wikidata IDs errados em 2 ficheiros

## Problema
Dois Wikidata QIDs estão incorretos e propagam-se para todo o HTML gerado:

| Entidade | QID Atual (errado) | QID Correto |
|---|---|---|
| Digital dentistry | Q2915883 | Q18351767 |
| CAD/CAM | Q1071923 | Q3033573 |

## Ficheiros a alterar

### 1. `supabase/functions/_shared/ai-readiness-helpers.ts`
- Linha 21: `'odontologia digital'` — alterar `Q2915883` para `Q18351767`
- Linhas 30-31: `'cad/cam'` e `'cadcam'` — alterar `Q1071923` para `Q3033573`

### 2. `src/lib/template-engine.ts`
- Linha 3670: `'odontologia digital'` — alterar `Q2915883` para `Q18351767`
- Linha 3671: `'cad/cam'` — alterar `Q1071923` para `Q3033573`

Todos os geradores que consomem estes mapas (Ecommerce, SPIN, Blog, Clone) passarão automaticamente a usar os QIDs corretos.

