

# Corrigir Cards de Preview dos Videos

## Problema

Os cards de video na secao "Veja como funciona na pratica" estao com visual ruim porque:

1. **Conflito de CSS**: A classe `.video-link` (linhas 1668-1689) foi criada para um botao CTA standalone (inline-flex, padding 1.5rem 3rem, background white, box-shadow, font-size 24px). Porem, o mesmo `.video-link` e aplicado no `<a>` que envolve todo o conteudo do video card (linha 2789), fazendo o card inteiro se comportar como um botao
2. **Thumbnail pequena e distorcida**: O conflito de layout faz a thumbnail ficar comprimida
3. **Texto repetitivo**: O titulo "Video de [produto]" e redundante com o badge do produto embaixo

## Solucao

### 1. Separar o CSS do link do card vs link CTA

**Arquivo**: `supabase/functions/generate-spin-landing-page/generateHTML.ts`

Renomear a classe do link dentro dos video cards para `.video-card-link` e criar estilos proprios:

**CSS (substituir/adicionar apos linha 1795)**:
```css
.video-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  height: 100%;
}

.video-card-link:hover {
  text-decoration: none;
  color: inherit;
}
```

**HTML (linha 2789)**: Trocar `class="video-link"` por `class="video-card-link"`

### 2. Melhorar o layout visual dos cards

Ajustar os estilos dos video cards para um visual mais profissional:

```css
.video-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.video-thumbnail-wrapper {
  position: relative;
  aspect-ratio: 16/9;
  background: #1a1a2e;
  overflow: hidden;
}

.video-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-card:hover .video-thumbnail {
  transform: scale(1.05);
}

.video-info {
  padding: 1rem 1.2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.video-info h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-dark);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-info p {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.product-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-tech);
  background: rgba(238, 122, 62, 0.08);
  padding: 4px 10px;
  border-radius: 20px;
  margin-top: auto;
  width: fit-content;
}

.video-type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
}
```

### 3. Melhorar o grid para 3 colunas fixas em desktop

```css
.videos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 992px) {
  .videos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .videos-grid {
    grid-template-columns: 1fr;
  }
}
```

### Deploy
- Deploy da edge function `generate-spin-landing-page`
- Re-gerar a landing page para ver o resultado

