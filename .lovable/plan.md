

# Exibir Videos de Depoimentos dos Produtos na Landing Page

## Problema Identificado

Os depoimentos da tabela `video_testimonials` possuem campos `youtube_url` e `instagram_url` com links para videos reais dos clientes, mas esses campos sao **descartados** no mapeamento (linha 898-905 do `index.ts`):

```text
const realTestimonials = (videoTestimonials || []).map((testimonial) => ({
  quote: testimonial.testimonial_text,
  clientName: testimonial.client_name,
  clientPhoto: testimonial.photo_url || null,
  location: testimonial.location || null,
  profession: testimonial.profession || null,
  specialty: testimonial.specialty || null
  // youtube_url e instagram_url NAO sao incluidos!
}));
```

No HTML (linha 3056-3079), os cards de depoimento mostram apenas texto e foto, sem nenhum link ou embed de video.

## Solucao

### 1. Incluir URLs de video no mapeamento

**Arquivo:** `supabase/functions/generate-spin-landing-page/index.ts` (linhas 898-905)

Adicionar `youtube_url` e `instagram_url` ao objeto mapeado:

```typescript
const realTestimonials = (videoTestimonials || []).map((testimonial: any) => ({
  quote: testimonial.testimonial_text,
  clientName: testimonial.client_name,
  clientPhoto: testimonial.photo_url || null,
  location: testimonial.location || null,
  profession: testimonial.profession || null,
  specialty: testimonial.specialty || null,
  youtube_url: testimonial.youtube_url || null,
  instagram_url: testimonial.instagram_url || null
}));
```

### 2. Renderizar links de video nos cards de depoimento

**Arquivo:** `supabase/functions/generate-spin-landing-page/generateHTML.ts` (secao de testimonials, ~linha 3070)

Apos o bloco `.profile-info`, adicionar botoes com links para YouTube e Instagram quando disponiveis:

```html
<div class="testimonial-video-links">
  <!-- Link YouTube (se existir) -->
  <a href="..." target="_blank">
    <i class="fab fa-youtube"></i> Ver depoimento
  </a>
  <!-- Link Instagram (se existir) -->
  <a href="..." target="_blank">
    <i class="fab fa-instagram"></i> Ver no Instagram
  </a>
</div>
```

### 3. Adicionar CSS para os botoes de video

Estilizar `.testimonial-video-links` com botoes pequenos e discretos dentro dos cards de depoimento, usando as cores do YouTube (vermelho) e Instagram (gradiente).

### Deploy
- Re-deploy da edge function `generate-spin-landing-page`
- Re-gerar a landing page para confirmar que os links de video aparecem nos cards

