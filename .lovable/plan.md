

# AUDITORIA COMPLETA DO SISTEMA — Smart Dent Content Intelligence Platform

---

## 1. MAPA DO SISTEMA

### 1.1 Arquitetura Geral

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite + Tailwind)              │
├─────────────┬──────────────┬──────────────┬────────────────────────┤
│  Dashboard  │  Editor LP   │ Repositório  │  Páginas Auxiliares    │
│  (7 cards)  │  (8153 lin.) │  (15 abas)   │  Auth, Blog, Clone    │
├─────────────┴──────────────┴──────────────┴────────────────────────┤
│               63+ Hooks │ 13 Services/SEO │ 15+ Libs              │
├────────────────────────────────────────────────────────────────────┤
│                    BACKEND (91 Edge Functions)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────────┐  │
│  │ Geração  │ Publicar │ Importar │ Integrar │ Utilitários      │  │
│  │ Conteúdo │ Deploy   │ Dados    │ OAuth    │ Migração/Test    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│               26 _shared helpers │ 40+ Tabelas Supabase           │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Páginas da Aplicação (19 páginas)

| Página | Arquivo | Função | Status |
|--------|---------|--------|--------|
| Index | Index.tsx | Landing pública | ✅ Ativo |
| Dashboard | Dashboard.tsx | Gestão de LPs + Blogs | ✅ Ativo |
| Editor | Editor.tsx (8153 linhas!) | Editor completo de LP | ⚠️ Monolítico |
| Repository | Repository.tsx | Hub central (15 abas) | ✅ Ativo |
| BlogEditor | BlogEditor.tsx | Editor de blog posts | ✅ Ativo |
| Auth/AuthLaunch | Auth.tsx | Login/Cadastro | ✅ Ativo |
| LPClone | LPClone.tsx | Clonar LPs | ✅ Ativo |
| CloudflareSettings | CloudflareSettings.tsx | Config Cloudflare | ✅ Ativo |
| PublicationSettings | PublicationSettings.tsx | Config publicação multi-domínio | ✅ Ativo |
| RAGMetricsDashboard | RAGMetricsDashboard.tsx | Métricas do chatbot Dra. L.I.A. | ✅ Ativo |
| CodeView | CodeView.tsx | Visualizar código HTML | ✅ Ativo |
| BlogImageTest | BlogImageTest.tsx | Debug de imagens blog | ⚠️ Ferramenta dev |
| NotFound | NotFound.tsx | Página 404 | ✅ Ativo |
| OAuthCallback/Launch | - | Fluxo OAuth | ✅ Ativo |
| PasswordReset | PasswordReset.tsx | Reset de senha | ✅ Ativo |
| YouTubeOAuthSettings | - | Config YouTube OAuth | ✅ Ativo |
| GoogleBusinessOAuthSettings | - | Config Google Business OAuth | ✅ Ativo |

---

## 2. EDGE FUNCTIONS — AUDITORIA COMPLETA (91 funções)

### 2.1 Geração de Conteúdo IA (Core)

| # | Edge Function | O que faz | Componente UI | Status |
|---|-------------|-----------|--------------|--------|
| 1 | `generate-product-ai-content` | Gera benefits, keywords, features via IA | ProductAIGenerator | ✅ |
| 2 | `generate-product-blog` | Blog comercial/técnico por produto | DualBlogGeneratorWithKOL | ✅ |
| 3 | `strategic-blog-generator` | Blog estratégico contextual (LP + produtos) | StrategicBlogPreview | ✅ |
| 4 | `generate-ad-copies` | Google Ads headlines/descriptions | GoogleAdsTab | ✅ |
| 5 | `generate-social-content` | WhatsApp, Instagram, TikTok, YouTube | Múltiplos geradores | ✅ |
| 6 | `generate-ecommerce-html` | HTML e-commerce para Loja Integrada | ProductEcommerceGenerator | ✅ |
| 7 | `generate-display-banners` | Banners HTML5 Google Display Ads | google-ads/ | ✅ |
| 8 | `generate-instagram-carousel` | Carrossel 6 slides Instagram | InstagramCopyGenerator | ✅ |
| 9 | `generate-instagram-reels-script` | Script para Reels | InstagramCopyGenerator | ✅ |
| 10 | `generate-carousel-slide` | Slide individual carrossel | StrategicCarouselPreview | ✅ |
| 11 | `generate-carousel-hook` | Hook para carrossel | StrategicCarouselPreview | ✅ |
| 12 | `generate-tiktok-content` | Script TikTok viral | TikTokContentGenerator | ✅ |
| 13 | `generate-youtube-script` | Script YouTube | YouTubeDescriptionGenerator | ✅ |
| 14 | `generate-merchant-feed` | Feed XML Google Shopping | GoogleMerchantManager | ✅ |
| 15 | `generate-landing-page-faqs` | FAQs para LP | Editor | ✅ |
| 16 | `generate-product-faqs` | FAQs para produto | ProductEditModal | ✅ |
| 17 | `generate-clinical-brain` | Clinical Brain regras anti-alucinação | ClinicalBrain/ | ✅ |
| 18 | `generate-client-photo` | Foto de cliente via IA | ClientPhotoUploader | ✅ |
| 19 | `generate-content-from-interests` | Conteúdo baseado em interesses do lead | LIA system | ✅ |
| 20 | `generate-product-card-from-transcription` | Card de produto via transcrição | - | ⚠️ Verificar uso |
| 21 | `generate-robots-txt` | robots.txt dinâmico | Auto | ✅ |
| 22 | `generate-sitemap` | Sitemap XML | Auto | ✅ |
| 23 | `generate-video-sitemap` | Sitemap de vídeos | Auto | ✅ |

### 2.2 SPIN Selling (8 funções)

| # | Edge Function | O que gera | Status |
|---|-------------|-----------|--------|
| 24 | `generate-spin-sales-pitch` | Sales Pitch SPIN | ✅ |
| 25 | `generate-spin-journey` | Jornada (Desejo/Dor/Resultado) | ✅ |
| 26 | `generate-spin-metrics` | 3 métricas de caso de sucesso | ✅ |
| 27 | `generate-spin-faqs` | 10 FAQs SPIN | ✅ |
| 28 | `generate-spin-campaign` | Campanha WhatsApp SPIN | ✅ |
| 29 | `generate-spin-landing-page` | Landing Page SPIN (hero, CTA, etc.) | ✅ |
| 30 | `generate-spin-hero-banner` | Banner hero SPIN | ✅ |

### 2.3 SEO & Otimização (4 funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 31 | `ai-seo-generator` | ✅ |
| 32 | `auto-seo-enhancer` | ✅ |
| 33 | `consolidate-keywords` | ✅ |
| 34 | `validate-schema` | ✅ |

### 2.4 Publicação & Deploy (7 funções)

| # | Edge Function | Destino | Status |
|---|-------------|---------|--------|
| 35 | `publish-cloudflare-pages` | Cloudflare Pages | ✅ |
| 36 | `publish-ftp-pages` | Servidor FTP | ✅ |
| 37 | `publish-git-kinghost` | GitHub → KingHost | ✅ |
| 38 | `publish-blog-post` | Blog em domínios | ✅ |
| 39 | `publish-product-blog-cloudflare` | Blog produto Cloudflare | ✅ |
| 40 | `unpublish-pages` | Despublicar | ✅ |
| 41 | `republish-domain-pages` | Republicar domínio | ✅ |

### 2.5 Importação & Extração (10 funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 42 | `extract-youtube-captions` | ✅ |
| 43 | `extract-google-reviews` | ✅ |
| 44 | `extract-product-data` | ✅ |
| 45 | `import-loja-integrada-api` | ✅ |
| 46 | `import-repository-csv` | ✅ |
| 47 | `import-systemb-authors` | ✅ |
| 48 | `transcribe-landing-page-pdf` | ✅ |
| 49 | `transcribe-product-document` | ✅ |
| 50 | `parse-testimonials` | ✅ |
| 51 | `process-nps-csv` | ✅ |

### 2.6 Knowledge System (6 funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 52 | `knowledge-base` | ✅ |
| 53 | `knowledge-feed` | ✅ |
| 54 | `index-knowledge-base` | ✅ |
| 55 | `refresh-knowledge-base` | ✅ |
| 56 | `rag-chat` | ✅ (Dra. L.I.A.) |
| 57 | `evaluate-interaction` | ✅ |

### 2.7 Integração & OAuth (8 funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 58 | `exchange-oauth-code` | ✅ |
| 59 | `exchange-google-business-code` | ✅ |
| 60 | `exchange-youtube-code` | ✅ |
| 61 | `refresh-google-token` | ✅ |
| 62 | `test-cloudflare-connection` | ✅ |
| 63 | `test-ftp-connection` | ✅ |
| 64 | `test-google-business-connection` | ✅ |
| 65 | `test-youtube-connection` | ✅ |
| 66 | `test-wordpress-connection` | ⚠️ Sem UI correspondente visível |

### 2.8 Migração & Utilitários (15+ funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 67 | `clone-landing-page` | ✅ |
| 68 | `save-landing-page` | ✅ |
| 69 | `cloudflare-direct-upload` | ✅ |
| 70 | `migrate-external-images` | ✅ |
| 71 | `migrate-images-gallery` | ✅ |
| 72 | `migrate-products-to-repository` | ✅ |
| 73 | `migrate-video-data` | ✅ |
| 74 | `moderate-reviews` | ✅ |
| 75 | `optimize-image` | ✅ |
| 76 | `populate-review-photos` | ✅ |
| 77 | `upload-image` | ✅ |
| 78 | `update-secret` | ✅ |
| 79 | `update-loja-integrada-product` | ✅ |
| 80 | `rename-category` | ✅ |

### 2.9 Exportação (6 funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 81 | `export-complete-handbook` | ✅ |
| 82 | `export-google-ads-csv` | ✅ |
| 83 | `export-product-ai-playbook` | ✅ |
| 84 | `export-product-google-ads-csv` | ✅ |
| 85 | `export-repository-csv` | ✅ |
| 86 | `export-spin-apostila` | ✅ |

### 2.10 Sistema B & Content Pipeline (5+ funções)

| # | Edge Function | Status |
|---|-------------|--------|
| 87 | `content-submission` | ✅ |
| 88 | `process-content-submission` | ✅ |
| 89 | `process-job-queue` | ✅ |
| 90 | `sync-system-b-documents` | ✅ |
| 91 | `debug-systemb-product` | ⚠️ Debug only |
| 92 | `preview-product-blog` | ✅ |
| 93 | `get-product-data` | ✅ |

---

## 3. INCONSISTÊNCIAS E PROBLEMAS IDENTIFICADOS

### 3.1 Problemas Críticos

| # | Problema | Impacto | Onde |
|---|---------|---------|------|
| 1 | **Editor.tsx com 8153 linhas** | Manutenibilidade crítica, performance lenta | src/pages/Editor.tsx |
| 2 | **ProductEditModal.tsx com 4568 linhas** | Mesmo problema de monolito | src/components/ProductEditModal.tsx |
| 3 | **template-engine.ts com 6475 linhas** | Dificuldade de manutenção | src/lib/template-engine.ts |
| 4 | **InstagramCopyGenerator.tsx com 2177 linhas** | Componente sobrecarregado | src/components/ |

### 3.2 Possíveis Inconsistências

| # | Item | Detalhe |
|---|------|---------|
| 1 | `test-wordpress-connection` | Edge function existe mas sem UI no frontend — se WordPress não é usado, remover |
| 2 | `generate-product-card-from-transcription` | Verificar se tem componente UI que a consome |
| 3 | `BlogImageTest.tsx` | Página de teste/debug — não deveria estar em produção |
| 4 | `debug-systemb-product` | Edge function de debug — deveria ser removida em prod |
| 5 | Importações duplicadas de `generate-blog` | `generateBlogHTML` importado de dois caminhos diferentes no Editor.tsx (linhas 63 e 69) |
| 6 | `generate-social-content` vs geradores individuais | Existe tanto `generate-social-content` (consolidado) quanto `generate-tiktok-content` separado — possível duplicação |

### 3.3 Qualidade de Código

| Item | Observação |
|------|-----------|
| Shared helpers (26 arquivos) | Bem organizados e reutilizados |
| Tracking injection | Centralizado (v2.0) — excelente |
| Schema helpers | 10+ helpers especializados — bem arquitetado |
| Hooks (63 hooks) | Muitos hooks especializados — boa separação de concerns |
| Anti-hallucination | Clinical Brain v2.0 implementado — robusto |
| AI usage tracking | `track-ai-usage.ts` — rastreamento de tokens implementado |

---

## 4. FLUXO COMPLETO DE CONTEÚDO — Exemplo: "Rayshape Edge Mini"

### 4.1 Pré-requisitos (O que inserir no sistema)

Para gerar TODOS os conteúdos possíveis para o produto "Rayshape Edge Mini", é necessário ter preenchido:

**A) No Repositório de Produtos (ProductEditModal):**
- Nome: "Rayshape Edge Mini"
- Descrição completa (~300 palavras)
- Categoria: "Impressoras 3D" / Subcategoria: "Resina"
- Preço / Preço promocional
- URL da imagem principal
- Galeria de imagens (3-5)
- URL do produto na Loja Integrada
- Benefits (5-8 itens): ex: "Impressão ultrarrápida", "Alta precisão de 50μm"
- Features (5-8 itens): ex: "Tela touch 5 polegadas", "Volume 127x80x200mm"
- Keywords (10+): ex: "impressora 3d dental", "rayshape edge mini preço"
- Target Audience: ex: "Protéticos, Cirurgiões-Dentistas"
- Tags: "impressão 3d", "resina"
- FAQs (5-10 perguntas)
- Vídeos: URLs YouTube (demo, review, técnico)
- Sales Pitch (texto de vendas 200-500 palavras)
- Workflow Stages (ex: "Scan → Design → Impressão → Pós-cura")
- Concorrentes (tabela comparativa)
- Clinical Brain: regras anti-alucinação
- Variações (se houver modelos)

**B) No Perfil da Empresa (CompanyProfileManager):**
- Dados completos (nome, CNPJ, endereço, etc.)
- Social media links (WhatsApp, Instagram, YouTube, etc.)
- Tracking pixels (GTM, Meta, TikTok)
- SEO domains configurados
- NPS metrics
- Milestones/Timeline
- Reviews/Depoimentos aprovados
- KOLs (Key Opinion Leaders)
- Navegação/Footer config

**C) Na Landing Page (Editor):**
- LP criada com produtos selecionados (incluir Rayshape Edge Mini)
- Banner, Solutions, FAQ, SEO configurados
- Vídeos, depoimentos, parceiros

### 4.2 Conteúdos Geráveis (Exemplo Rayshape Edge Mini)

#### 1. **WhatsApp Marketing** (generate-social-content type='whatsapp')
```
📱 Exemplo de saída:
"🔬 Precisão que transforma seu laboratório!

A Rayshape Edge Mini imprime modelos, guias cirúrgicos e provisórios com resolução de 50μm — em minutos, não horas.

✅ Volume ideal: 127x80x200mm
✅ Tela touch intuitiva
✅ Resinas validadas para uso odontológico

Conheça a impressora 3D que cabe no seu consultório:
👉 smartdent.com.br/produtos/rayshape-edge-mini"
```

#### 2. **WhatsApp Promo (De/Por)** (generate-social-content type='whatsapp_promo_variation')
```
"🎉 OFERTA IMPERDÍVEL!
Rayshape Edge Mini
De R$ 24.990 → Por R$ 19.990
Economia de R$ 5.000! 💰

Impressora 3D dental compacta com alta precisão.
Garanta a sua: wa.me/5511999999999"
```

#### 3. **Sequência WhatsApp 7 msgs** (generate-social-content type='whatsapp_sequence')
```
Msg 1: Apresentação + dor
Msg 2: Solução + benefício
Msg 3: Caso de uso
Msg 4: Diferencial técnico
Msg 5: Prova social
Msg 6: Urgência/oferta
Msg 7: CTA final
```

#### 4. **Instagram Feed** (generate-social-content type='instagram')
```
"A revolução da impressão 3D no consultório. 🦷

A Rayshape Edge Mini entrega precisão de 50μm em um equipamento compacto que cabe na sua bancada...

#impressora3d #odontologiadigital #smartdent #rayshape"
```

#### 5. **Instagram Carrossel 6 Slides** (generate-instagram-carousel)
```
Slide 1 (Gancho): "Você ainda depende de laboratórios externos?"
Slide 2 (Solução): "Conheça a Rayshape Edge Mini"
Slide 3 (Diferencial): "Precisão de 50μm + cura rápida"
Slide 4 (Experiência): "Do scan à peça pronta em horas"
Slide 5 (Autoridade): "Tecnologia Smart Dent"
Slide 6 (CTA): "Link na Bio 👆"
```

#### 6. **Instagram Reels Script** (generate-instagram-reels-script)
```
[HOOK - 3s]: "Uma impressora 3D por menos de 20 mil?"
[DESENVOLVIMENTO - 15s]: Mostrar operação, peças impressas
[PROVA - 10s]: Resultado final em mãos
[CTA - 5s]: "Link na bio!"
```

#### 7. **TikTok Script** (generate-tiktok-content)
```
Hook: "POV: seu laboratório imprime guias em 30 minutos"
Script: Mostrar fluxo rápido, antes/depois
Hashtags: #odonto #impressora3d #dental #fyp
CTA: "Quer saber o preço? Comenta PREÇO"
```

#### 8. **YouTube Description** (generate-social-content type='youtube')
```
"Rayshape Edge Mini — Review Completo | Smart Dent

Neste vídeo apresentamos a Rayshape Edge Mini, impressora 3D compacta...

⏱ Timestamps:
00:00 Introdução
02:30 Unboxing
05:00 Primeira impressão...

🔗 Links importantes:
► Comprar: smartdent.com.br/...
► Instagram: @smartdentoficial..."
```

#### 9. **Blog Comercial** (generate-product-blog type='commercial')
```
Título: "Rayshape Edge Mini: A Impressora 3D Ideal para Consultórios"
~1500 palavras focando em benefícios práticos, ROI, facilidade
Meta: "Descubra como a Rayshape Edge Mini pode transformar..."
```

#### 10. **Blog Técnico** (generate-product-blog type='technical')
```
Título: "Especificações Técnicas da Rayshape Edge Mini"
~2000 palavras com specs detalhadas, comparativos, dados técnicos
```

#### 11. **Blog Estratégico** (strategic-blog-generator)
```
Artigo contextual combinando LP + múltiplos produtos
~2500 palavras, dual-domain (Dentala + Eodonto)
```

#### 12. **Google Ads Headlines/Descriptions** (generate-ad-copies)
```
Headlines (30 chars max):
"Rayshape Edge Mini | 50μm"
"Impressora 3D Dental"
"Impressão em Minutos"

Descriptions (90 chars max):
"Impressora 3D dental compacta. Precisão de 50μm. Entrega rápida. Conheça!"
```

#### 13. **Google Display Banners** (generate-display-banners)
```
16 formatos (300x250, 728x90, 160x600, etc.)
HTML5/CSS com foto real do produto
Exportados como ZIP
```

#### 14. **E-commerce HTML** (generate-ecommerce-html)
```
HTML completo para Loja Integrada com:
- Schema.org Product
- Benefícios visuais
- FAQ accordion
- Vídeos embutidos
- SEO otimizado
```

#### 15. **Google Merchant Feed XML** (generate-merchant-feed)
```xml
<item>
  <g:id>rayshape-edge-mini</g:id>
  <g:title>Rayshape Edge Mini</g:title>
  <g:price>19990.00 BRL</g:price>
  <g:availability>in_stock</g:availability>
  ...
</item>
```

#### 16. **SPIN Selling** (7 funções SPIN)
```
Sales Pitch: Narrativa consultiva SPIN (300-500 palavras)
Journey: Desejo → Dor → Resultado
Metrics: 3 métricas reais
FAQs: 10 perguntas estruturadas
Campaign: Mensagem WhatsApp SPIN
Landing Page: Hero, CTA, depoimentos
```

---

## 5. REPOSITÓRIO (15 ABAS) — Checklist de Uso

| Aba | Função | Dados a preencher |
|-----|--------|-------------------|
| Repositório | CRUD de produtos | Todos os campos do produto |
| Categorias | Config por categoria | Keywords, audience, Clinical Brain rules |
| Links | URLs centralizadas | Links de blog, produto, landing pages |
| Prompts IA | Customizar prompts | Prompts de cada edge function |
| Google Merchant | Feed XML Shopping | (automático dos produtos) |
| YouTube OAuth | Conectar YouTube API | Client ID, Secret, Token |
| Google Business | Conectar Google Reviews | Client ID, Secret, Token |
| Cupons | Promoções WhatsApp | Código, desconto, validade |
| Pós-Venda | Mensagens robô | Sequência de mensagens |
| CS | Customer Success | Sequência CS |
| SPIN Selling | Estratégias comerciais | Combinações de produtos |
| Vídeos Externos | Biblioteca Sistema B | URLs, transcrições |
| Migração Imagens | Migrar p/ Supabase | (automático) |
| LP Clone & Blogs | Clonar e publicar | Selecionar LPs |
| Apostila | Exportar handbook | (automático) |

---

## 6. CHECKLIST DE CONTEÚDOS FALTANTES

### 6.1 Perfil da Empresa (CompanyProfileManager)

- [ ] Nome da empresa completo
- [ ] Descrição (200+ palavras)
- [ ] Setor / Público-alvo
- [ ] Missão / Visão / Valores
- [ ] Endereço completo (rua, número, CEP, cidade, estado)
- [ ] Latitude/Longitude (geolocalização)
- [ ] Telefone / Email
- [ ] Website URL
- [ ] Logo (URL ou upload Supabase)
- [ ] CNPJ / Razão Social
- [ ] Fundador (nome, LinkedIn, título)
- [ ] Ano de fundação
- [ ] Número de funcionários
- [ ] Horário de funcionamento (JSON)
- [ ] Áreas de atendimento
- [ ] **Social Media Links** (WhatsApp, Instagram, YouTube, Facebook, TikTok, LinkedIn, Telegram, Pinterest, Threads, Kwai, X)
- [ ] **Tracking Pixels** (GTM container ID, Meta Pixel ID, TikTok Pixel ID, Google Analytics ID)
- [ ] **SEO Domains** (método publicação por domínio: Cloudflare/FTP/Git)
- [ ] **SEO Context Keywords** (palavras-chave estratégicas)
- [ ] **SEO Market Positioning** (posicionamento)
- [ ] **SEO Competitive Advantages**
- [ ] **SEO Technical Expertise**
- [ ] **SEO Service Areas**
- [ ] **NPS Metrics** (importar CSV)
- [ ] **Company Videos** (YouTube, Instagram, técnicos, depoimentos)
- [ ] **Reviews Google** (importar via Google Business OAuth)
- [ ] **Reviews Manuais**
- [ ] **KOLs** (Key Opinion Leaders com nome, foto, mini-CV, especialidade)
- [ ] **Milestones** (timeline da empresa)
- [ ] **YouTube Tags** (globais)
- [ ] **YouTube Company Footer** (rodapé padrão para descrições)
- [ ] **Navegação/Footer** (links, locations, social)
- [ ] **Parcerias Internacionais**

### 6.2 Por Produto (ProductEditModal)

- [ ] Nome + Descrição (200+ palavras)
- [ ] Categoria + Subcategoria (do CategoryManager)
- [ ] Preço / Preço Promocional / Moeda
- [ ] Imagem principal + Galeria (3-5 imagens)
- [ ] URL produto (Loja Integrada)
- [ ] Slug + Canonical URL
- [ ] **Benefits** (5-8 via IA ou manual)
- [ ] **Features** (5-8 via IA ou manual)
- [ ] **Keywords** (10+ via IA ou manual)
- [ ] **Target Audience** (via IA ou categoria)
- [ ] **Search Intent Keywords**
- [ ] **Market Keywords**
- [ ] **Tags**
- [ ] **Sales Pitch** (200-500 palavras)
- [ ] **FAQs** (5-10 perguntas/respostas)
- [ ] **Vídeos** (YouTube URLs com descrições)
- [ ] **Workflow Stages** (etapas de uso)
- [ ] **Concorrentes** (tabela comparativa)
- [ ] **Clinical Brain** (forbidden_products, required_products, rules)
- [ ] **Variações** (modelos, cores, tamanhos)
- [ ] **Documentos técnicos** (PDFs transcritos)
- [ ] **Bot Trigger Words** (palavras para chatbot)
- [ ] **SEO Title Override / SEO Description Override**
- [ ] Aprovado = true / Use in AI = true

### 6.3 Por Landing Page (Editor)

- [ ] Nome da LP
- [ ] Template selecionado
- [ ] Produtos selecionados (vincular)
- [ ] **Banner** (título, subtítulo, imagens, CTA)
- [ ] **Solutions** (5 itens com imagem, título, descrição)
- [ ] **Advisory** (título, parágrafo)
- [ ] **Desktop Info** (título, texto, imagem)
- [ ] **FAQ** (10+ perguntas)
- [ ] **SEO** (título, description, canonical, keywords, robots)
- [ ] **Schema** (Organization, Product, FAQPage)
- [ ] **Email Config**
- [ ] **Vídeo** (URL, título)
- [ ] **CTA Final** (título, parágrafo, botões)
- [ ] **Partners** (logos de parceiros)
- [ ] **Footer** (links, social, locations)
- [ ] **Menu** (navegação)
- [ ] **Reviews Section Visible** (toggle)

---

## 7. MANUAL DO USUÁRIO — Fluxo Ideal

### Passo 1: Configurar a Empresa
1. Acesse **Dashboard** → **Perfil da Empresa** (via Repositório)
2. Preencha TODOS os campos do checklist 6.1
3. Configure tracking pixels (GTM obrigatório)
4. Adicione domínios SEO

### Passo 2: Configurar Categorias
1. Acesse **Repositório** → aba **Categorias**
2. Crie categorias e subcategorias (ex: "Impressoras 3D" > "Resina")
3. Configure keywords, audience e regras Clinical Brain por categoria

### Passo 3: Cadastrar Produtos
1. Acesse **Repositório** → aba **Repositório**
2. Clique **+ Novo Produto**
3. Preencha TODOS os campos do checklist 6.2
4. Use botão **"Gerar com IA"** para benefits, features, keywords
5. Adicione vídeos e documentos
6. Marque como **Aprovado** e **Usar em IA**

### Passo 4: Gerar Conteúdo por Produto
No card do produto, clique nos ícones:
- 📱 **WhatsApp** → Mensagem promocional
- 📸 **Instagram** → Feed + Carrossel + Reels
- 🎵 **TikTok** → Script viral
- 🎬 **YouTube** → Descrição completa
- 📝 **Blog** → Comercial + Técnico
- 🛒 **E-commerce** → HTML para Loja Integrada
- 🎯 **Google Ads** → Headlines + Descriptions + Display Banners
- 🛍️ **Merchant** → Feed XML Shopping

### Passo 5: Criar Landing Page
1. **Dashboard** → **Nova LP**
2. Vincule produtos
3. Preenche todas as seções (checklist 6.3)
4. Gere SEO com IA
5. Gere Blog Estratégico
6. Preview e publique

### Passo 6: Publicar
1. Selecione destino (Cloudflare / FTP / Git Deploy)
2. Publique LP, blogs e páginas de produtos
3. Verifique na URL publicada

### Passo 7: SPIN Selling (Opcional)
1. **Repositório** → aba **SPIN Selling**
2. Selecione combinação de produtos
3. Gere Sales Pitch → Journey → Metrics → FAQs → Campaign → LP SPIN

### Passo 8: Monitorar
1. **Dashboard** → Qualidade do Conteúdo
2. **RAG Metrics** → Métricas da Dra. L.I.A.
3. **Token Usage** → Consumo de IA

---

## 8. RECOMENDAÇÕES DE MELHORIA

| Prioridade | Ação | Benefício |
|-----------|------|----------|
| 🔴 Alta | Refatorar Editor.tsx (8153 linhas) em subcomponentes | Manutenibilidade |
| 🔴 Alta | Refatorar ProductEditModal.tsx (4568 linhas) | Performance |
| 🟡 Média | Remover `BlogImageTest.tsx` e `debug-systemb-product` de prod | Limpeza |
| 🟡 Média | Verificar se `test-wordpress-connection` é necessário | Limpeza |
| 🟡 Média | Unificar ou documentar a relação entre `generate-social-content` e geradores individuais (`generate-tiktok-content`, etc.) | Clareza |
| 🟢 Baixa | Adicionar testes automatizados (atualmente só 1 test file básico) | Qualidade |
| 🟢 Baixa | Documentar API de cada edge function com exemplos de input/output | Onboarding |

---

## 9. RESUMO EXECUTIVO

O sistema Smart Dent Content Intelligence Platform é uma plataforma **extremamente robusta e abrangente** com:

- **91+ Edge Functions** cobrindo geração de conteúdo, SEO, publicação, integrações e analytics
- **40+ tabelas Supabase** com RLS policies bem configuradas
- **15 abas de configuração** no Repositório Central
- **8+ geradores de HTML** (LP, Blog, E-commerce, SPIN, Clone, etc.)
- **26 shared helpers** para reuso de código
- **63 hooks React** especializados
- **Dual-AI Competition** (Gemini vs DeepSeek)
- **Clinical Brain v2.0** anti-alucinação
- **Multi-destination publishing** (Cloudflare, FTP, Git/KingHost)
- **Knowledge Graph** com AI-readiness e crawlability

Os principais pontos de atenção são os **arquivos monolíticos** (Editor.tsx, ProductEditModal.tsx, template-engine.ts) que ultrapassam 4000-8000 linhas, e algumas **possíveis funções orphan** que precisam de verificação.

A qualidade da arquitetura é **alta**, com boa separação de concerns nos helpers, tracking centralizado e schemas SEO bem implementados.

