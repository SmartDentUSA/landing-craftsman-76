## Plano: Propagar a aprovação FDA 510(k) K260152 da Smart Print Bio Vitality em todos os geradores de HTML

### Diagnóstico

A aprovação **FDA 510(k) clearance K260152** (data efetiva conforme documento submetido) é o **maior marco regulatório** já obtido pela Smart Dent: a Bio Vitality é a **única resina 3D da América Latina** aprovada pelo FDA para fabricação de **restaurações dentárias DEFINITIVAS** (coroas, facetas, inlays, onlays, dentes artificiais para próteses, próteses totais removíveis definitivas e próteses parciais/totais monolíticas).

Hoje o ecossistema tem **três representações conflitantes** desse fato, todas incompletas:

| Local | Estado atual | Problema |
|---|---|---|
| `src/data/authors.ts` → `VITALITY_PRODUCT` | `fdaClass: "Classe II"`, `fdaNumber: "3027526455"` | Tem só o **Establishment Number** (registro da fábrica), **não tem o 510(k) K260152** (clearance do produto) |
| `supabase/functions/_shared/seo-fine-tuning.ts` linhas 561-566, 604-609 | `"FDA Classe II nº 3027526455"` no schema Organization e MedicalDevice | Mesmo problema — confunde Establishment com 510(k) |
| `products_repository` (linha do produto, id `bf091211...`) → coluna `description` | Fala em "longa duração", "casos clínicos", "147 MPa" | **Não menciona FDA, K260152 nem "definitivo"** explicitamente como diferencial regulatório |
| Master prompt (`master-system-prompt.ts` linha 62) e SPIN (`spin-system-prompt.ts` linha 41) | Regra: *"NUNCA usar 'provisórios' para Vitality — SEMPRE usar 'longa duração'"* | Precisa **upgrade**: agora pode (e deve) usar **"definitivo / definitivas"** porque é o termo regulatório que o FDA aprovou |

Resultado prático: nenhum HTML gerado hoje (LP, Blog, Product Blog, Ecommerce, SPIN, Clone) cita o **K260152** nem afirma "definitivo" como claim regulatório validado.

### Fonte de verdade (do documento FDA enviado)

```
Submission Number:  K260152
Device Trade Name:  SMART PRINT BIO VITALITY
Indications for Use: light-curable resin for the fabrication of definitive
                     dental restorations — single crowns, veneers, inlays,
                     onlays, artificial teeth for dental prostheses,
                     removable definitive full dentures, individual and
                     removable monolithic full and partial dentures.
                     Anterior and posterior. Prescription Use (21 CFR 801 D).
Establishment Nº:   3027526455 (já registrado, mantém)
```

### Mudanças propostas

#### 1. `src/data/authors.ts` — `VITALITY_PRODUCT` (linhas 335-367)

Adicionar campos do clearance e a lista oficial de indicações aprovadas:

```ts
export const VITALITY_PRODUCT = {
  name: "Smart Print Bio Vitality",
  wikidata: "Q138790136",
  wikidataUrl: "https://www.wikidata.org/entity/Q138790136",

  // 🆕 FDA 510(k) Clearance — produto aprovado para definitivos
  fda510kNumber: "K260152",
  fda510kStatus: "Cleared",
  fda510kIndications: "Definitive dental restorations: single crowns, veneers, inlays, onlays, artificial teeth, removable definitive full dentures, monolithic full/partial dentures. Anterior and posterior. Prescription Use.",
  fdaProductClassification: "Classe II",
  fdaEstablishmentNumber: "3027526455",     // renomeado de fdaNumber para clareza
  fdaSubmissionUrl: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K260152",
  isFirstLATAMDefinitiveResin: true,

  anvisaClass: "Dispositivo Médico Classe II",
  // ... resto inalterado
};
```

Também ajustar o array `credentials` do `MARCELO_DEL_GUERRA` (linha 321) para incluir o K260152:
```ts
{ name: "FDA 510(k)", value: "K260152 (Bio Vitality — definitivos)", url: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K260152" },
{ name: "FDA Establishment", value: "3027526455", url: "https://www.accessdata.fda.gov" },
```

#### 2. `src/lib/authorSchemas.ts` — `generateVitalityProductSchema()` (linhas 156-182)

Atualizar o schema MedicalDevice JSON-LD para refletir o clearance:

```ts
description: `Resina nano-híbrida fotopolimerizável para impressão 3D odontológica.
  Única resina da América Latina com FDA 510(k) clearance K260152 para fabricação
  de restaurações DEFINITIVAS (coroas, facetas, inlays, onlays, dentes artificiais,
  próteses totais removíveis definitivas e próteses monolíticas).
  Resistência flexural ${p.flexuralStrengthAfinko} MPa (Afinko INMETRO ISO/IEC 17025).
  FDA Classe II — Establishment ${p.fdaEstablishmentNumber}.`,
identifier: [
  { "@type": "PropertyValue", name: "FDA 510(k) Clearance", value: p.fda510kNumber, url: p.fdaSubmissionUrl },
  { "@type": "PropertyValue", name: "FDA Establishment Number", value: p.fdaEstablishmentNumber },
  { "@type": "PropertyValue", name: "Wikidata", value: p.wikidata, url: p.wikidataUrl },
],
hasCredential: [
  {
    "@type": "EducationalOccupationalCredential",
    name: `FDA 510(k) Clearance ${p.fda510kNumber} — Definitive Dental Restorations`,
    credentialCategory: "regulatory",
    recognizedBy: { "@type": "GovernmentOrganization", name: "U.S. Food and Drug Administration" },
  },
],
```

#### 3. `supabase/functions/_shared/seo-fine-tuning.ts` (linhas 561-609)

Mesma atualização do shared schema usado pelos geradores Edge:

- **`hasCredential` da Organization** (linhas 561-566): adicionar **antes** dos credentials existentes uma entrada para `FDA 510(k) Clearance K260152` linkando ao FDA, mantendo o Establishment 3027526455 como credencial separada.
- **`itemOffered` MedicalDevice** (linhas 604-609): atualizar o `description` para citar K260152 + "definitive dental restorations" + lista resumida de indicações aprovadas.

#### 4. Master Prompt — `supabase/functions/_shared/master-system-prompt.ts` (linha 62) e `spin-system-prompt.ts` (linha 41)

Atualizar a regra global de Vitality para refletir a nova realidade regulatória:

**Antes:**
> Vitality ❌ NUNCA usar o termo "provisórios" — SEMPRE usar "longa duração"

**Depois:**
> Vitality ✅ É APROVADA PELO FDA 510(k) **K260152** para restaurações **DEFINITIVAS** — única da América Latina. Usar livremente "definitivas", "definitivos", "longa duração". ❌ NUNCA chamar de "provisórios" ou "temporários". Quando relevante, citar o clearance K260152 e as indicações: coroas, facetas, inlays, onlays, dentes artificiais, próteses totais removíveis definitivas, próteses monolíticas (anteriores e posteriores).

Isso vai permitir que **todos os geradores de IA** (blog, SPIN, ecommerce, clone, ad copies, carousel, instagram, copilot) citem o FDA 510(k) corretamente sem cair no guard anti-alucinação.

#### 5. `clinical-brain-guard.ts` (linha 146)

Atualizar a regra 8 do guard:

**Antes:** `8. CERTIFICAÇÕES VÁLIDAS: ISO 4049, ANVISA, FDA — apenas se no contexto.`
**Depois:** `8. CERTIFICAÇÕES VÁLIDAS: ISO 4049, ANVISA, FDA Establishment 3027526455, FDA 510(k) K260152 (Vitality — definitivos) — sempre permitidas para Vitality; outras certificações apenas se no contexto.`

#### 6. Banco — atualizar a linha do produto Vitality em `products_repository`

**Migration SQL** que faz dois updates seguros e idempotentes na linha `bf091211-09ad-4057-9cb8-d4adf78a442b`:

a) Anexar ao **início** do campo `description` um parágrafo curto destacando o clearance (sem apagar o conteúdo atual). Exemplo:
> **🇺🇸 Aprovada pelo FDA — clearance 510(k) K260152.** A Smart Print Bio Vitality é a **única resina 3D da América Latina** aprovada pela Food and Drug Administration para fabricação de **restaurações dentárias definitivas** — coroas, facetas, inlays, onlays, dentes artificiais para próteses, próteses totais removíveis definitivas e próteses monolíticas, em região anterior e posterior. *(prosseguir com texto atual...)*

b) Adicionar `{label: "FDA 510(k) Clearance", value: "K260152 — Restaurações Definitivas"}` ao array `technical_specifications` se ainda não existir.

Como a propagação aos HTMLs já existentes depende de republicação, **após o migration aplicar** o usuário pode rodar o já-existente botão **"🚀 Republicar Tudo (exceto www.smartdent.com.br)"** para que todos os blogs/LPs reprocessem o template com o novo campo.

#### 7. Templates Mustache (`mustache-template-engine.ts` + `product-blog-html-v2.ts`)

Os templates já iteram `{{#technical_specifications}}` então o item novo aparece automático. **Adicionar** um pequeno bloco condicional no header dos templates (acima do título do produto) que renderiza um **badge FDA** quando o produto tem `fda_510k_clearance` (campo derivado das technical_specifications):

```html
{{#fda_clearance_badge}}
<div class="fda-badge" itemprop="hasCredential">
  🇺🇸 FDA 510(k) Clearance <strong>{{fda_clearance_badge}}</strong> — Restaurações Definitivas
</div>
{{/fda_clearance_badge}}
```

Pré-processador Mustache extrai o número K260152 do array de specs e popula `fda_clearance_badge` no contexto.

### Arquivos modificados (resumo)

| Arquivo | O que muda |
|---|---|
| `src/data/authors.ts` | +6 campos no `VITALITY_PRODUCT`, +1 credencial em `MARCELO_DEL_GUERRA` |
| `src/lib/authorSchemas.ts` | `generateVitalityProductSchema()` ganha `hasCredential` + `identifier` com K260152 |
| `supabase/functions/_shared/seo-fine-tuning.ts` | `hasCredential` da Organization + `itemOffered.description` citando K260152 |
| `supabase/functions/_shared/master-system-prompt.ts` | Regra Vitality atualizada (linha 62) |
| `supabase/functions/_shared/spin-system-prompt.ts` | Regra Vitality atualizada (linha 41) |
| `supabase/functions/_shared/clinical-brain-guard.ts` | Regra 8 do guard inclui K260152 como sempre-válido para Vitality |
| `supabase/functions/_shared/mustache-template-engine.ts` | Pré-processador extrai `fda_clearance_badge` das specs |
| `supabase/functions/_shared/product-blog-html-v2.ts` | Bloco do badge FDA acima do título |
| **Migration SQL** | UPDATE em `products_repository` linha Vitality (description + technical_specifications) |

### Pós-implementação

1. Eu aplico o migration → o produto no banco passa a ter o claim FDA visível em qualquer geração nova.
2. Você clica em **"🚀 Republicar Tudo (exceto www.smartdent.com.br)"** → todos os blogs e LPs já publicados nas demais 30+ páginas (dentala.com.br, parametros.smartdent.com.br, landing.eodonto.com.br etc.) ganham o badge FDA + JSON-LD atualizado + texto atualizado da descrição.
3. Próximas gerações de blog/SPIN/ad copy/carousel já saem com o claim K260152 corretamente, sem alucinar.

### Fora de escopo

- Não toco em `www.smartdent.com.br` (mantemos o veto da regra anterior).
- Não crio nova Edge Function — só edito shared utilities e o template existente.
- Não regero conteúdos automaticamente; a propagação é via republicação dos HTMLs já existentes (template é re-renderizado com os dados novos do banco).
- Não incluo o badge FDA no SmartDent.com.br (estático, não passa pelo template Mustache do sistema).

### Risco

- A regra do master prompt está em arquivos que afetam **todas as gerações futuras de IA**. Se houver algum produto que mencione Vitality como peça secundária (ex: blog sobre +Flex citando Vitality como alternativa), a IA agora pode citar "definitivo" mesmo nesse contexto — o que é factualmente correto e desejável.
- O badge FDA no header do blog é **só para Vitality** (renderização condicional por presença do campo). Outros produtos não ganham nada.

### Confirmação visual esperada após republicar

Os blogs do Vitality (ex: o HTML que você anexou, `smart-print-bio-vitality-resina-3d-definitvo-sim.html`) vão ganhar:
- Badge `🇺🇸 FDA 510(k) Clearance K260152` no topo
- Linha `FDA 510(k) Clearance: K260152 — Restaurações Definitivas` na tabela de specs
- JSON-LD MedicalDevice com `hasCredential` + `identifier` apontando para o clearance
- Schema Organization com nova credencial regulatória do K260152
