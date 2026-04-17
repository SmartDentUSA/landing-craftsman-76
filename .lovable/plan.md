

## Análise do pedido

O usuário pediu duas melhorias no gerador de Google Ads:

1. **Acessibilidade nos banners HTML**: adicionar `alt` descritivo nas tags `<img>` dos banners de Display
2. **Extensões de Anúncio no CSV**: incluir colunas para Sitelinks e Callouts (Frases de Chamariz) no export CSV

## Investigação realizada

**Banners HTML** (`src/components/google-ads/display-templates.ts`):
- Linha ~155: `<img class="product-img" src="product.jpg" alt="Produto">` — alt genérico, não descritivo
- Linha ~159: `<img class="logo" src="logo.png" alt="Logo">` — alt genérico
- Função `generateBannerHTML` recebe `headline` e `productImageUrl` mas não usa para o alt

**CSV Builder** (`src/lib/google-ads/csv-builder.ts`):
- Já existe `buildSitelinksSection()` — mas só gera 5 colunas básicas (`Sitelink text`, `Sitelink final URL`)
- **NÃO existe** `buildCalloutsSection()` — precisa criar
- Sitelinks atuais faltam colunas opcionais que aumentam CTR: `Sitelink description 1`, `Sitelink description 2`
- Tipo `GoogleAdsCampaignConfig` não tem campo `callouts: string[]` — precisa adicionar

## Plano de implementação

### 1. Acessibilidade dos banners (alt descritivo)

**Arquivo:** `src/components/google-ads/display-templates.ts`

Alterar a função `generateBannerHTML` para gerar alts descritivos:
- `product-img` → `alt="${headline} — ${ctaText}"` (ex: "Resina Bio Vitality — Compre agora")
- `logo` → `alt="Logo Smart Dent"` (ou nome da marca, fallback "Logo da empresa")
- Sanitizar aspas no alt para não quebrar o HTML (`replace(/"/g, '&quot;')`)

### 2. Extensões: Sitelinks com descrições + nova seção de Callouts

**Arquivo 1:** `src/types/google-ads.ts`
- Adicionar `callouts: string[]` em `GoogleAdsCampaignConfig`
- Estender tipo `Sitelink` com `description1?: string` e `description2?: string` (opcionais)

**Arquivo 2:** `src/lib/google-ads/csv-builder.ts`
- **Atualizar `buildSitelinksSection`**: adicionar colunas `Sitelink description 1` e `Sitelink description 2` ao header e às rows
- **Criar `buildCalloutsSection`**: nova seção com header `Campaign,Ad extension type,Callout text` e 1 row por callout (limite 25 caracteres por callout, validar)
- Adicionar `buildCalloutsSection(campaignName, config.callouts)` na lista de seções de `buildFullCSV`

**Arquivo 3:** `src/lib/google-ads/ads-generator.ts` (se existir — verificar) ou onde Sitelinks são montados a partir de `ecommerce_links`/`custom_institutional_links`
- Garantir que descriptions vazias sejam tratadas como string vazia (não `undefined`)
- Se houver gerador automático de callouts (ex: a partir de benefits do produto), conectá-lo; senão deixar `config.callouts = []` como default e criar UI futuramente

### 3. UI (opcional, mínima nesta entrega)

Se houver painel de configuração da campanha (`GoogleAdsConfigPanel.tsx` ou similar), adicionar:
- Textarea "Frases de Chamariz (Callouts)" — uma por linha, máx 25 chars cada
- Sub-campos opcionais nos sitelinks existentes para descrições

**Decisão:** vou inspecionar se o painel existe. Se sim, adiciono o input de callouts. Se for apenas backend/lógica, pulo a UI nesta rodada e expongo o campo no tipo para uso programático.

## Arquivos afetados

- `src/types/google-ads.ts` — adicionar `callouts: string[]` e descriptions opcionais em `Sitelink`
- `src/lib/google-ads/csv-builder.ts` — atualizar Sitelinks header/rows + nova seção Callouts
- `src/components/google-ads/display-templates.ts` — alts descritivos
- `src/components/google-ads/GoogleAdsConfigPanel.tsx` (se existir) — input de callouts
- Eventuais defaults/mocks de `GoogleAdsCampaignConfig` — adicionar `callouts: []`

## Riscos

- Se já houver código que faz `Object.keys(config)` ou serializa o config, adicionar `callouts` é seguro (campo novo, opcional)
- Limites do Google Ads: máx 20 callouts por campanha, 25 caracteres cada — vou validar e truncar no builder
- Sitelinks: descrições têm máx 35 caracteres cada — sanitizar no builder

