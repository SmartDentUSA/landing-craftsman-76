## Diagnóstico

Cruzei os 14 domínios com conteúdo publicado em `cloned_landing_pages` contra as propriedades verificadas no Google Search Console e os sitemaps já submetidos.

### Domínios com conteúdo publicado

| Domínio | Páginas | Propriedade no GSC | Sitemap submetido |
|---|---|---|---|
| smartdent.com.br | 105 | ✅ (sc-domain + https) | ⚠️ 11 sitemaps antigos, **todos com erro** (URLs com typo: `sitema.xml`, `sitemap.xm`, `SITEMAP.XML`, `video-sitemap.xml.`) |
| dentala.com.br | **172** | ❌ **NÃO existe no GSC** | — |
| eodonto.com | 100 | ✅ (sc-domain) | ❌ nenhum |
| rayshape3d.com.br | 14 | ✅ (sc-domain) | ❌ nenhum |
| rayshape.com.br | 12 | ✅ (sc-domain) | ❌ nenhum |
| labtechdent.com.br | 19 | ✅ (sc-domain) | ❌ nenhum |
| blzdental.com.br | 17 | ✅ (sc-domain) | ❌ nenhum |
| mediti600.com.br | 31 | ✅ (sc-domain + https) | ❌ nenhum |
| mediti700.com.br | 7 | ✅ (sc-domain) | ❌ nenhum |
| mediti900.com | 6 | ✅ (sc-domain) | ❌ nenhum |
| mediti900.com.br | 6 | ✅ (https only) | ❌ nenhum |
| truioconnect.com.br | 8 | ✅ (sc-domain) | ❌ nenhum |
| minivat.com | 4 | ✅ (sc-domain + https) | ✅ `sitemap.xml` (OK) e `sitemap.rss` (2 warnings) |
| printsafebr.com.br | 3 | ❌ **NÃO existe no GSC** | — |

### Resumo dos problemas

1. **2 domínios sem propriedade no GSC**: `dentala.com.br` (172 páginas órfãs!) e `printsafebr.com.br`.
2. **10 propriedades verificadas sem sitemap submetido**: GSC não está sendo notificado das URLs novas.
3. **smartdent.com.br polui­do** com 11 sitemaps antigos quebrados (typos) — precisa limpeza e re-submissão do correto.
4. **`domain_config.sitemap_url` está NULL** em: `smartdent.com.br`, `dentala.com.br`, `printsafebr.com.br`, `minivat.com`, `parametros.smartdent.com.br` e todos os domínios temáticos (facetadental, etc.). O `republish-domain-cloudflare-bulk` já gera `/sitemap.xml` em runtime, então a coluna é só metadado, mas deveria ser preenchida para consistência.

## Plano

### Fase 1 — Onboarding dos domínios faltantes (`dentala.com.br`, `printsafebr.com.br`)
Para propriedades novas no GSC, a verificação para domínios de cliente exige DNS TXT (recomendado) ou meta tag no HTML servido pelo Cloudflare. Como esses sites são publicados via Cloudflare Pages a partir do nosso pipeline, é viável injetar a meta tag de verificação no HTML do homepage gerado pela `republish-domain-cloudflare-bulk` → `buildHomepageHtml`.

Etapas:
1. Solicitar token META do GSC para `https://dentala.com.br/` e `https://printsafebr.com.br/`.
2. Armazenar tokens em `domain_config` (nova coluna `gsc_verification_token` ou em `content_intelligence` JSONB) — **a definir com você**.
3. Adaptar `buildHomepageHtml` (e o builder principal de `index.html` de cada página) para injetar `<meta name="google-site-verification" content="..." />` quando o token existir.
4. Republicar os 2 domínios.
5. Chamar `siteVerification/v1/webResource` para verificar.
6. Adicionar como propriedade via `PUT webmasters/v3/sites/{url}`.

### Fase 2 — Limpeza do smartdent.com.br
1. Deletar via API GSC os 9 sitemaps com typo (`sitema.xml`, `sitemap.xm`, `SITEMAP.XML`, `video-sitemap.xml.`, etc.).
2. Manter apenas os válidos após a Fase 3.

### Fase 3 — Submissão automática de sitemaps para os 14 domínios
1. Criar Edge Function nova `gsc-submit-sitemaps` que:
   - Lê todos domínios ativos de `domain_config` com publicações.
   - Para cada um, monta a `siteUrl` no formato GSC (prefere `sc-domain:<dominio>`; fallback `https://<dominio>/`).
   - Chama `PUT webmasters/v3/sites/{siteUrl}/sitemaps/{sitemapUrl}` para `https://<dominio>/sitemap.xml`.
   - Loga sucesso/erro em uma tabela `gsc_submission_log` (id, domain, sitemap_url, status_code, error, submitted_at).
   - Idempotente: pode rodar repetidamente.
2. Usar o secret `GOOGLE_SEARCH_CONSOLE_API_KEY` + `LOVABLE_API_KEY` via gateway `connector-gateway.lovable.dev`.
3. Atualizar `domain_config.sitemap_url` para `https://<dominio>/sitemap.xml` nos registros NULL relevantes.
4. Botão "Submeter sitemaps ao GSC" na UI (página de Publicação/SEO) chamando a função.

### Fase 4 — Verificação pós-submissão
1. Listar sitemaps de cada propriedade e confirmar `errors=0`.
2. Persistir contagem `lastSubmitted`, `contents.submitted/indexed` em `gsc_submission_log` para painel de monitoramento.

### Fora de escopo (manter pendente)
- Domínios temáticos sem conteúdo publicado (escaneamentointraoral, facetadental, fresagem­dental, guiacirurgico3d, implanteimediato, impressao3ddental, modelodental3d, protesedental3d, resina3ddental, splitedental, vitality3d) — não submeter sitemap enquanto não tiverem páginas.
- Slugifier multilingual (`/en/...`, `/es/...`) — pendência já registrada da iteração anterior.

## Perguntas antes de implementar

1. **Verificação dos novos domínios** (`dentala.com.br`, `printsafebr.com.br`): prefere DNS TXT (você cola manualmente na zona Cloudflare) ou injeção automática de meta tag no HTML pelo pipeline?
2. **Sitemap único ou múltiplos**: hoje servimos só `/sitemap.xml`. Deseja gerar separados (`sitemap-blog.xml`, `sitemap-lp.xml`) ou manter um só por domínio?
3. **Posso prosseguir com a Fase 3** (criar a Edge Function e submeter os sitemaps dos 12 domínios já verificados) **em paralelo** à resolução das Fases 1/2?
