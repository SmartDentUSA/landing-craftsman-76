

# Regra Terminológica: Vitality nunca "Provisórios", sempre "Longa duração"

## O que sera feito

Adicionar uma regra de terminologia obrigatória nos dois system prompts que governam toda a geração de conteúdo por IA, garantindo que nenhuma edge function use "provisórios" ao se referir a Vitality.

## Alteracoes

### 1. `supabase/functions/_shared/master-system-prompt.ts`

**Linha ~63** (seção "Exemplos aplicados" das regras de compatibilidade no prompt):

Adicionar nova regra após a linha do GlazeON:

```
- Vitality ❌ NÃO usa GlazeON (exclusivo para +Flex)
+ - Vitality ❌ NÃO usa GlazeON (exclusivo para +Flex)
+ - Vitality ❌ NUNCA usar o termo "provisórios" — SEMPRE usar "longa duração"
```

**Linha ~157** (objeto `COMPATIBILITY_RULES`, entrada `vitality`):

Adicionar campo de terminologia nos comentários ou na regra `never_claim`:

Não é necessário alterar o objeto TypeScript pois ele trata de compatibilidade de produto, não terminologia. A regra no prompt textual é suficiente.

### 2. `supabase/functions/_shared/spin-system-prompt.ts`

**Linha ~40** (seção "PRINCÍPIOS UNIVERSAIS"):

Adicionar nova regra após a linha sobre termos técnicos internos:

```
✅ Nunca usar termos técnicos internos do banco (lab_time → "tempo do laboratório")
+ ✅ Nunca usar "provisórios" para Vitality — SEMPRE usar "longa duração"
```

### 3. Re-deploy das edge functions afetadas

Todas as edge functions SPIN e Clinical Brain importam desses arquivos shared. Após a alteração, será necessário re-deploy de pelo menos as funções que geram conteúdo textual:
- `generate-spin-sales-pitch`
- `generate-spin-journey`
- `generate-spin-faqs`
- `generate-spin-campaign`
- `generate-spin-landing-page`
- `export-spin-apostila`

## Impacto

- Zero alteração visual ou funcional
- Toda geração futura de conteúdo IA respeitará a regra
- Conteúdo já gerado anteriormente não será afetado (precisa ser re-gerado manualmente se necessário)

