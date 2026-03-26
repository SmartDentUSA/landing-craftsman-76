

# Gerar Documento .MD — Mapeamento Completo do Perfil da Empresa

## Objetivo
Criar um arquivo Markdown detalhado (`/mnt/documents/company-profile-mapping.md`) documentando todos os campos, abas, componentes e consumidores do Company Profile para um engenheiro de software.

## Conteúdo do documento

O arquivo conterá:

1. **Visão geral da arquitetura** — tabela `company_profile` no Supabase como single source of truth
2. **Componente principal** — `src/components/CompanyProfileManager.tsx` (1779 linhas, 11 abas)
3. **Mapeamento completo de todos os 80+ campos** organizados por aba:
   - **Dados Básicos** (29 campos): nome, descrição, setor, público-alvo, endereço estruturado, geo, fundador, wikidata, missão/visão/cultura, metodologia, dados institucionais, horário, áreas de atuação, logo
   - **Redes Sociais** (10 campos): email, telefone, YouTube, Instagram, social_media_links (10+ plataformas), hashtags, handles, youtube_tags
   - **Vídeos** (5 campos): youtube_videos, instagram_videos, testimonial_videos, technical_videos, youtube_company_footer
   - **Reviews** (componente ReviewsSection)
   - **NPS & Interesses** (componente NPSInsightsTab)
   - **SEO Hidden** (5 campos): context_keywords, market_positioning, competitive_advantages, technical_expertise, service_areas
   - **Parcerias** (institutional_links com filtro international_partnership)
   - **TRK SEO** (tracking_pixels + seo_domains com config Cloudflare/FTP/Git)
   - **Navegação & Footer** (navigation_footer_config)
   - **Marcos Históricos** (CompanyMilestonesManager — tabela separada)
4. **Sub-componentes** — lista de todos os componentes filhos com caminho
5. **Hooks consumidores** — todos os hooks que leem company_profile
6. **Helpers/Libs** — company-profile-helper.ts, CompanyDataCollector.ts
7. **Edge Functions consumidoras** — lista das funções que fazem SELECT na tabela
8. **Constraint crítica** — regra de registro único

## Implementação

Um único script que escreve o .MD em `/mnt/documents/company-profile-mapping.md`.

