

# Plano: Ajustar prompt de FAQs para foco em custo-beneficio e objetivo profissional

## Problema

O prompt atual do `generate-landing-page-faqs` contem diretrizes que mencionam "iniciantes" e geram conteudo subjetivo:
- "Qual item e mais indicado para iniciantes ou uso basico" (linha indesejada)
- "Qual oferece melhor custo-beneficio" (manter, mas reformular)
- "Destaques do modelo/item de alta performance" (subjetivo)

O usuario quer que as FAQs:
1. **Nunca** usem o termo "iniciantes"
2. Foquem em **custo-beneficio** e **objetivo de cada profissional**
3. Baseiem-se no que cada produto **entrega como diferencial** segundo o documento

## Correcao

### Arquivo: `supabase/functions/generate-landing-page-faqs/index.ts`

Reescrever a secao "COBERTURA TEMATICA OBRIGATORIA" do `SYSTEM_PROMPT`, substituindo:

**Remover:**
- "Qual item e mais indicado para iniciantes ou uso basico"
- "Destaques do modelo/item de alta performance"
- "Qual escolher para casos/aplicacoes especificos"

**Substituir por:**
- Qual o custo-beneficio de cada equipamento com base nas especificacoes do documento
- Qual equipamento atende melhor cada objetivo profissional (ex: volume de atendimento, precisao, mobilidade)
- Quais diferenciais tecnicos cada modelo entrega segundo os dados do documento
- Como as especificacoes tecnicas de cada modelo se traduzem em beneficios praticos para o profissional

**Adicionar proibicao explicita:**
- NAO usar o termo "iniciantes" ou "uso basico" em nenhuma FAQ
- NAO recomendar um equipamento como superior a outro
- Descrever cada equipamento pelo que ele entrega, sem juizo de valor comparativo

### Prompt atualizado (secao 5 - COBERTURA TEMATICA):

```
5. COBERTURA TEMATICA OBRIGATORIA (quando o documento permitir):
   - Diferencas de performance entre os itens/modelos comparados
   - Custo-beneficio de cada equipamento com base nas especificacoes do documento
   - Qual objetivo profissional cada modelo atende melhor (volume, precisao, mobilidade, etc.)
   - Quais diferenciais tecnicos cada modelo entrega segundo os dados
   - Diferencas entre modelos/versoes similares
   - Como especificacoes tecnicas se traduzem em beneficios praticos
   - Impacto de recursos tecnologicos (IA, automacao) na pratica profissional
   - Custos de manutencao e consumiveis de cada modelo
   - Funcionalidades exclusivas ou compartilhadas entre os modelos
```

**Adicionar na secao 6 (LINGUAGEM) as proibicoes:**

```
6. LINGUAGEM:
   - Tecnica, profissional e neutra
   - Sem termos promocionais ou adjetivos exagerados
   - NUNCA usar o termo "iniciantes" ou "uso basico"
   - NUNCA recomendar um equipamento como superior a outro
   - Descrever cada equipamento pelo que ele entrega como diferencial
   - Focar no objetivo profissional que cada modelo atende
```

## Impacto

- FAQs nunca mais usarao "iniciantes" ou "uso basico"
- Cada FAQ focara no que o produto entrega e qual objetivo profissional atende
- Tom neutro, descritivo e baseado em custo-beneficio real
- Necessario re-importar o PDF apos deploy para gerar novas FAQs

