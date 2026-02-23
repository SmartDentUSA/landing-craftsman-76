

# Extrair Cidade e Estado nos Depoimentos SPIN

## Problema

A edge function `parse-testimonials` nao extrai os campos `city` e `state` do texto, mesmo quando estao presentes (ex: "Recife (PE)", "Curitiba (PR)"). O frontend tambem ignora esses campos, setando-os como strings vazias.

## Correcao

### 1. Edge Function: `supabase/functions/parse-testimonials/index.ts`

Adicionar `city` e `state` no schema da tool de extracao:

```
// Adicionar dentro de "properties" do item:
city: { type: "string", description: "Cidade da pessoa, ex: Recife, Curitiba" },
state: { type: "string", description: "Sigla do estado (UF), ex: PE, PR, SP" }
```

Adicionar ambos ao array `required`.

### 2. Frontend: `src/components/SpinSolutionEditModal.tsx`

Atualizar o mapeamento (linhas 585-596) para usar os campos extraidos:

```
city: t.city || '',
state: t.state || '',
```

Em vez dos valores hardcoded vazios atuais.

## Resultado

Os 10 depoimentos serao importados com cidade e estado preenchidos automaticamente pela IA (ex: city="Recife", state="PE").

