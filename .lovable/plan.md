

# Auditoria Completa: Código Implementado vs. Produção

## Resumo Executivo

Foram encontrados **3 categorias de problemas** totalizando **9 edge functions sem deploy** e **1 sistema de tracking completamente inoperante**.

---

## 1. EDGE FUNCTIONS SEM DEPLOY (existem no código + são chamadas pelo frontend, mas NÃO estão no `config.toml`)

Estas **9 functions** têm código completo no repositório E são invocadas pelo frontend, porém **nunca foram registradas no `config.toml`**, o que significa que nunca foram deployadas e **falham em produção com 404**.

| # | Function | Chamada por (frontend) | Funcionalidade |
|---|----------|----------------------|----------------|
| 1 | `consolidate-keywords` | `useKeywordsRepository.ts` | Consolidação de keywords |
| 2 | `exchange-google-business-code` | `GoogleBusinessOAuthSettings.tsx` | OAuth Google Business |
| 3 | `exchange-youtube-code` | `YouTubeOAuthSettings.tsx` | OAuth YouTube |
| 4 | `export-repository-csv` | (provável export UI) | Export CSV repositório |
| 5 | `export-product-google-ads-csv` | `GoogleAdsProductTab.tsx` | Export CSV Google Ads por produto |
| 6 | `migrate-external-images` | `ImageMigrationManager.tsx` | Migração de imagens externas |
| 7 | `optimize-image` | `StrategicCarouselPreview.tsx` | Proxy/otimização de imagens |
| 8 | `rename-category` | `CategoryManager.tsx` | Renomear categorias/subcategorias |
| 9 | `save-landing-page` | `useLandingPagesSupabase.ts` | Salvar landing pages (deep merge) |

**Impacto:** Todas essas funcionalidades aparecem na UI mas **não funcionam** quando o usuário tenta usá-las.

---

## 2. SISTEMA DE TRACKING DE TOKENS IA — 100% INOPERANTE

A tabela `ai_token_usage` tem **ZERO registros**. Todo o sistema de monitoramento de custos IA está morto.

**Causa:** As 27+ edge functions que têm `trackFromResponse` no código foram editadas **após o último deploy**. As versões em produção (Supabase) não têm o código de tracking.

**Functions com tracking no código mas não deployadas (parcial):**
- `generate-product-blog`, `generate-product-ai-content`, `generate-social-content`
- `ai-seo-generator`, `generate-ad-copies`, `ai-content-generator`
- `generate-tiktok-content`, `generate-youtube-script`, `generate-instagram-reels-script`
- `extract-youtube-captions`, `strategic-blog-generator`
- `generate-spin-*` (6 functions), `generate-product-faqs`
- `transcribe-product-document`, `transcribe-landing-page-pdf`
- `generate-carousel-slide`, `generate-carousel-hook`
- `parse-testimonials`, `generate-landing-page-faqs`
- `generate-product-card-from-transcription`, `generate-clinical-brain`
- `generate-content-from-interests`, `generate-display-banners`

---

## 3. CONFIGURAÇÃO `generate-instagram-copy` ÓRFÃ

A tabela `prompts_configuration` tem 3 registros para `generate-instagram-copy` — mas essa function **não existe** nem no código nem no config.toml. São dados órfãos.

---

## Plano de Correção

### Etapa 1 — Adicionar as 9 functions ao `config.toml`
Adicionar entradas para: `consolidate-keywords`, `exchange-google-business-code`, `exchange-youtube-code`, `export-repository-csv`, `export-product-google-ads-csv`, `migrate-external-images`, `optimize-image`, `rename-category`, `save-landing-page`.

### Etapa 2 — Deploy em massa de TODAS as edge functions
Deployar todas as 80+ functions para que o tracking de tokens, as OAuth functions, e todas as funcionalidades que o frontend já invoca passem a funcionar.

### Etapa 3 — Limpar dados órfãos
Remover os 3 registros de `generate-instagram-copy` da tabela `prompts_configuration`.

### Resumo de arquivos
- **1 arquivo editado:** `supabase/config.toml` (9 novas entradas)
- **Deploy:** ~80 edge functions
- **1 query SQL:** DELETE dos registros órfãos

