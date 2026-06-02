## Expansão do `knowledge-export-full` — Cobertura 100% + HTML formatado

Objetivo: garantir que o endpoint exporte **literalmente tudo** que o sistema gera (cards, tabelas, mensagens, mídias, campanhas, atendimentos, prompts), com HTML pronto para indexação/IA e JSON estruturado espelhando cada tabela.

### Novos blocos a incluir

1. **`campaign_templates`** — templates promocionais WhatsApp (campanhas, sazonais, lançamentos)
2. **`lia_attendances`** — histórico Dra. L.I.A. (perguntas, respostas, leads, conversões)
3. **`lia_leads`** — leads capturados via Copilot Comercial
4. **`whatsapp_templates`** — templates oficiais Meta/WhatsApp aprovados
5. **`approved_reviews`** + **`video_testimonials`** com `html_card` formatado individual
6. **`company_milestones`** com `html_card` (timeline E-E-A-T) + JSON-LD Event
7. **`authors`** (autores E-E-A-T de `src/data/authors.ts` espelhados)
8. **`coupons`** globais (não só por produto) com validade
9. **`generated_pages`** ampliado: incluir `landing_page`, `spin_landing_page`, `consolidated_blog`, não só `product_blog`
10. **`spin_solutions`** com `html_card` completo (hero, jornada SPIN, métricas, FAQ, CTA, WhatsApp)
11. **`instagram_carousels`** gerados (slides, captions, hashtags)
12. **`tracking_config`** (GTM-NZ64Q899) + **`wikidata_qid`** (Q138636902)
13. **`prompts_configuration`** (somente os públicos/system prompts versionados)

### Cards HTML adicionais a renderizar

- `renderReviewCard(r)` — estrela, autor, texto, data, JSON-LD Review
- `renderTestimonialVideoCard(v)` — `<video>` + transcript + JSON-LD VideoObject
- `renderMilestoneCard(m)` — ano, título, descrição, JSON-LD Event
- `renderSpinCard(s)` — pitch + jornada + métricas + WhatsApp completo + JSON-LD Service
- `renderKolCard(k)` — foto, bio, credenciais, JSON-LD Person
- `renderCampaignTemplateCard(t)` — gatilho, sequência de mensagens, mídias
- `renderLandingPageCard(lp)` — usa `consolidated_html_cache` quando existir

### Novos parâmetros

- `include` ganha chaves: `campaigns`, `lia`, `whatsapp_templates`, `authors`, `coupons`, `carousels`, `prompts`
- `format=html` agrega TODOS os cards (produtos + reviews + milestones + spin + kols + landing pages + blogs + campanhas) em um único documento `<main>` indexável
- `format=both` retorna JSON + `html_full` + `html_by_section` (objeto com HTML por bloco)
- `pretty=true` indenta JSON para inspeção
- `schema_only=true` retorna só os `@graph` JSON-LD consolidados

### HTML consolidado (semantic integrity)

Estrutura final do `format=html`:

```text
<!doctype html>
<html lang="pt-BR">
<head>
  meta + canonical + GTM-NZ64Q899 + JSON-LD @graph unificado
  (Organization, AggregateRating, Reviews, Products, Services, Events, Persons, VideoObjects, FAQPage)
</head>
<body>
  <main>
    <article class="indexable-content company-profile">...</article>
    <article class="indexable-content product-card">... × N</article>
    <article class="indexable-content spin-card">... × N</article>
    <article class="indexable-content milestone-card">... × N</article>
    <article class="indexable-content review-card">... × N</article>
    <article class="indexable-content testimonial-video-card">... × N</article>
    <article class="indexable-content kol-card">... × N</article>
    <article class="indexable-content landing-page-card">... × N</article>
    <article class="indexable-content blog-card">... × N</article>
    <article class="indexable-content campaign-template-card">... × N</article>
  </main>
</body>
```

### Detalhes técnicos

- Arquivo único: `supabase/functions/knowledge-export-full/index.ts` (mantém abaixo de 2500 linhas, extrai renderers para `_shared/knowledge-renderers.ts` se passar)
- Sem alterações de schema/DB — somente leitura
- Mantém `SERVICE_ROLE_KEY`, CORS público, cache `max-age=300, s-maxage=900`
- Continua usando `get_complete_knowledge_base` RPC + queries diretas para os blocos novos
- `messages.cs` e `messages.aftersales` já presentes — confirmados como "Sequência de 7 Mensagens / Pós-venda"
- SPIN WhatsApp completo já presente em `spin_solutions[].whatsapp_complete_message`
- Tabelas inexistentes (ex.: `campaign_templates`) → query com `try/catch` silencioso, retorna `[]` sem quebrar

### Documentação

- Atualizar `docs/KNOWLEDGE_BASE_API.md` com a lista completa de blocos, exemplos `curl` e shape JSON de cada card
- Adicionar exemplo `format=html` + `include=all` no `docs/knowledge-base-api.postman_collection.json`

### Validação pós-deploy

1. `curl ".../knowledge-export-full?format=json&include=all" | jq '.stats'` — confirmar contagens > 0
2. `curl ".../knowledge-export-full?format=html&include=all" -o /tmp/k.html` — abrir e validar `<article>` por seção
3. Rodar Rich Results Test no HTML gerado — todos os schemas válidos
