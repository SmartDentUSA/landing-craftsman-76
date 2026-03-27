

# Builder Automático de Payload `wbeditentity` — 100% Validado

## Contexto

O sistema atual apenas **lê** do Wikidata (busca entidades via `wbsearchentities`). Para escrita, precisamos construir payloads `wbeditentity` que respeitem 100% a especificação da Wikidata API. Este plano cria um **builder tipado e validado** que monta payloads atômicos a partir dos dados do `company_profile` e `products_repository`.

**Pré-requisito**: Os 4 secrets OAuth 1.0a (`WIKIDATA_CONSUMER_KEY`, `WIKIDATA_CONSUMER_SECRET`, `WIKIDATA_ACCESS_TOKEN`, `WIKIDATA_ACCESS_SECRET`) ainda **não existem**. O builder será construído de forma independente do transporte OAuth — pronto para uso assim que os tokens forem registrados.

---

## Arquitetura

```text
company_profile / products_repository
         │
         ▼
┌─────────────────────────┐
│  wikidata-payload-      │  ← NOVO: builder tipado
│  builder.ts             │
│                         │
│  buildCompanyPayload()  │  → { labels, descriptions, aliases, claims }
│  buildProductPayload()  │  → { labels, descriptions, claims }
│  buildClaim()           │  → claim individual validado
│  validatePayload()      │  → throw se inválido
└─────────────────────────┘
         │
         ▼
   JSON pronto para wbeditentity
```

---

## Plano de Implementação

### 1. Novo arquivo: `supabase/functions/_shared/wikidata-payload-builder.ts`

Módulo compartilhado com tipos e builders:

**Tipos Wikidata (spec-compliant):**
- `WikidataValue` (string, time, quantity, globecoordinate, url, wikibase-entityid)
- `WikidataClaim` (mainsnak + qualifiers + references)
- `WikidataPayload` (labels, descriptions, aliases, claims)

**Builder da Empresa** — `buildCompanyPayload(company)`:

| Propriedade Wikidata | Campo `company_profile` | Tipo de valor |
|---|---|---|
| P31 (instance of) | — | wikibase-entityid → Q4830453 |
| P17 (country) | country | wikibase-entityid → Q155 |
| P856 (website) | website_url | url |
| P571 (inception) | founded_year | time (+YYYY-00-00T00:00:00Z) |
| P112 (founded by) | founder_name | string |
| P625 (coordinates) | latitude, longitude | globecoordinate |
| P154 (logo image) | company_logo_url | string (Commons filename) |
| P1651 (YouTube video ID) | company_videos[].youtube_id | string (extraído) |
| P968 (email) | contact_email | string |
| P1329 (phone) | contact_phone | string |
| P3225 (DUNS) | duns_number | string |
| P6782 (ROR ID) | tax_id | string |
| P1327 (partner org) | institutional_links[].url | url (por parceiro) |

**Builder do Produto** — `buildProductPayload(product, companyQid)`:

| Propriedade Wikidata | Campo `products_repository` | Tipo de valor |
|---|---|---|
| P31 (instance of) | wikidata_item_id | wikibase-entityid (ex: Q1780993) |
| P176 (manufacturer) | — | wikibase-entityid → companyQid |
| P495 (country of origin) | — | wikibase-entityid → Q155 |
| P2076 (flexural strength) | features[] / description | quantity (MPa) — via parser regex |
| P1306 (Shore hardness) | features[] / description | quantity — via parser regex |
| P3931 (copyright holder) | — | wikibase-entityid → companyQid |
| P248 (stated in) | technical_documents[].url | referência em cada claim técnico |

**Parser de Specs Técnicos** — `extractTechSpecs(features, description)`:
```text
Regex: /(\d+(?:[.,]\d+)?)\s*MPa/i → flexuralStrength
Regex: /Shore\s*[AD]\s*(\d+)/i → shoreHardness
Regex: /(\d+(?:[.,]\d+)?)\s*%\s*(radiopac|transluc)/i → percentages
```

**Validador** — `validatePayload(payload)`:
- Verifica que todos os claims têm `mainsnak.snaktype` = "value"
- Valida formato de time (`+YYYY-00-00T00:00:00Z`)
- Valida coordenadas (lat -90..90, lon -180..180)
- Valida QIDs (regex `^Q\d+$`)
- Lança erro detalhado se inválido

**Labels/Descriptions multilíngue** — `buildMultilingualLabels()`:
- PT: direto dos campos do banco
- EN/ES: stub preparado para integração com Gemini (retorna apenas PT por ora, com TODO para tradução)

### 2. Atualizar `supabase/functions/wikidata-sync/index.ts`

Adicionar duas novas actions:

- `build_company_payload` — Busca `company_profile` completo, chama `buildCompanyPayload()`, retorna o JSON pronto (sem enviar ao Wikidata). Permite inspecionar e validar antes de escrita real.
- `build_product_payload` — Busca produto completo, chama `buildProductPayload()`, retorna o JSON validado.

Estas actions são **dry-run** — geram o payload mas não executam `wbeditentity`. A escrita real será habilitada quando os secrets OAuth estiverem configurados.

### 3. Atualizar `src/services/wikidata-sync.ts`

Adicionar funções:
- `buildCompanyWikidataPayload()` — invoca action `build_company_payload`
- `buildProductWikidataPayload(productId)` — invoca action `build_product_payload`

### 4. Atualizar `src/components/WikidataSyncButton.tsx`

Adicionar botão secundário "Preview Payload" que chama o builder em modo dry-run e exibe o JSON resultante em um dialog/modal para inspeção antes do envio real.

---

## Arquivos Alterados/Criados

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/wikidata-payload-builder.ts` | **Novo** — Builder tipado + validador |
| `supabase/functions/wikidata-sync/index.ts` | **Editar** — Actions `build_company_payload` e `build_product_payload` |
| `src/services/wikidata-sync.ts` | **Editar** — Funções de invocação dry-run |
| `src/components/WikidataSyncButton.tsx` | **Editar** — Botão "Preview Payload" |

## Resultado

Payload 100% validado e inspecionável antes de qualquer escrita no Wikidata. Zero risco de claims malformados ou dados inválidos.

