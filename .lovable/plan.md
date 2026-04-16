

## Plano: Template HTML + CSS standalone para visualização de artigo

### O que será entregue
Um único arquivo `article-template.html` (autocontido — CSS inline em `<style>`, sem dependências externas exceto a fonte Poppins do Google Fonts) que serve como **template estático reutilizável** para visualizar artigos da base de conhecimento. Sem React, sem build, abrir direto no navegador.

### Decisão de formato
Como é um arquivo estático para uso fora do React app (template para gerar artigos via Edge Function, copiar/colar em outros sistemas, etc.), vou gerar como **artifact** em `/mnt/documents/` — não como rota dentro do app.

### Seções incluídas (na ordem)

1. **Header + Breadcrumb** — logo placeholder à esquerda, breadcrumb (`Início › Base de Conhecimento › Categoria › Artigo`) com separador `›`
2. **Hero** — imagem de capa full-width (16:9), badge de categoria colorida, H1 (título), meta (autor + data + tempo de leitura)
3. **Corpo do artigo** — container max-width 720px, parágrafos, H2/H3 com hierarquia, blockquote, listas, code inline. Conteúdo Lorem placeholder representativo
4. **Caixa de autor** — card com foto circular 80px, nome, cargo, mini-bio, badges de credenciais (ORCID, Lattes), links sociais
5. **FAQ accordion** — 4 perguntas em `<details>`/`<summary>` nativos (zero JS), com chevron rotacionando via CSS `[open]`
6. **Produtos recomendados** — grid responsivo 3 colunas (desktop) / 1 coluna (mobile), cards com imagem, nome, descrição curta, CTA "Ver produto"
7. **Footer** — 3 colunas (sobre, links rápidos, redes sociais) + copyright

### Design system aplicado (espelhando o app)

**Fonte:** Poppins (300, 400, 500, 600, 700) via Google Fonts

**Cores (HSL, idênticas ao `index.css`):**
- `--primary: 192 95% 35%` (verde-azulado brasileiro)
- `--background: 250 100% 99%`, `--foreground: 222 15% 8%`
- `--muted: 220 15% 96%`, `--border: 220 13% 91%`
- `--accent: 280 65% 96%`
- Gradiente hero: `linear-gradient(135deg, hsl(192 95% 35%) 0%, hsl(280 65% 50%) 100%)`

**Espaçamento:** escala `--spacing-xs` (4px) → `--spacing-2xl` (48px) do `design-system.css`

**Outros tokens:**
- `--radius: 0.75rem`
- Sombras: `--shadow-soft`, `--shadow-medium`, `--shadow-large`
- Transição: `cubic-bezier(0.4, 0, 0.2, 1)` 0.3s

### Acessibilidade & responsividade
- HTML semântico: `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`
- `aria-label` no breadcrumb, `aria-current="page"` no item ativo
- FAQ usando `<details>`/`<summary>` (acessível nativo)
- Mobile-first com breakpoint único em 768px (grid colapsa, hero menor)
- Imagens com `loading="lazy"` e `alt` descritivo

### Arquivos a criar
- `/mnt/documents/article-template.html` (~600 linhas, CSS interno)

### Após gerar
Renderizo screenshot da página completa (desktop + mobile) para QA visual antes de entregar, e disponibilizo via `<lov-artifact>` para download.

