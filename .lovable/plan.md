## Plano: criar página `/blog` central (índice estilo portal de notícias) para cada domínio

### Diagnóstico

Hoje os links no rodapé global apontam para URLs do tipo:

```
https://blzdental.com.br/blog
https://dentala.com.br/blog
https://eodonto.com/blog
https://mediti700.com.br/blog
... (10 domínios no total)
```

Mas **nenhum desses paths existe** — a query `cloned_landing_pages WHERE page_path IN ('/blog','/blog/')` retorna **0 registros**. Os blogs individuais existem (`/blog/<slug>`), mas a página-índice nunca foi gerada. Resultado: todos os links `→ Blog X` no footer dão 404.

Distribuição atual de blogs publicados por domínio:

| Domínio | Blogs publicados | Idiomas |
|---|---|---|
| dentala.com.br | 59 | pt + ES/EN existentes |
| eodonto.com | 34 | pt |
| mediti600.com.br | 8 | pt |
| blzdental.com.br | 3 | pt |
| labtechdent.com.br | 3 | pt |
| truioconnect.com.br | 1 | pt |
| mediti700/900, rayshape3d | 0 | — (LPs sem blogs ainda) |

### Solução: gerador automático de índice de blog por domínio

Criar uma **nova edge function** `generate-blog-index` que, dado um `target_domain`, monta dinamicamente um HTML estático com:

- **Hero/header** — nome do site, descrição vinda de `seo_domains[].description`, breadcrumb, contagem de posts
- **Grid de cards "estilo portal de notícias"** — cada card mostra:
  - Imagem destacada (extraída do `og:image` do post via regex no `transformed_html`)
  - Categoria/brand badge
  - Título (do campo `name`)
  - Excerpt (extraído do `meta description` do post)
  - Data de publicação + slug do autor
  - Link para o `published_url`
- **Filtros por idioma** (PT/EN/ES) quando o domínio tiver posts traduzidos (caso do `dentala.com.br`)
- **Paginação** — 12 posts por página, com `/blog`, `/blog/page/2`, etc. (server-rendered estático)
- **Sidebar** com:
  - Navegação cruzada para blogs irmãos (`Blog BLZ`, `Blog Medit i700`, etc., usando `seo_domains`)
  - Link de volta para a homepage do domínio
- **JSON-LD `Blog` + `ItemList`** schema completo para SEO/Rich Results
- **Footer global** já usado nos demais HTMLs (mesma navegação multi-site)
- **Tracking pixels** injetados via `injectTrackingIntoHTML` (igual aos blogs individuais)

### Arquitetura de publicação (reusa o que já funciona)

A função grava os HTMLs gerados em `cloned_landing_pages` com:
- `target_domain` = domínio
- `page_path` = `/blog` (e `/blog/page/2`, `/blog/page/3` se houver mais de 12 posts)
- `is_homepage` = `false`
- `name` = `"Blog — <SiteName>"`
- `original_html` + `transformed_html` = HTML gerado
- `publish_status` = `'pending'`

A partir daí, a publicação real reusa o pipeline existente (`publish-cloudflare-pages`, `publish-git-kinghost` ou `publish-ftp-pages` conforme `seo_domains[].publish_method`). Como o sistema já trata `cloned_landing_pages` como source-of-truth para HTMLs estáticos, **nenhuma mudança no pipeline de publicação é necessária**.

### Plano técnico detalhado

#### 1. Nova edge function `supabase/functions/generate-blog-index/index.ts`

```ts
serve(async (req) => {
  const { domain, lang = 'pt', regenerateAll = false } = await req.json();
  
  // 1. Carrega seo_domains[] e identifica config do domínio
  const domainConfig = company.seo_domains.find(d => d.domain === domain);
  
  // 2. Busca todos os blogs daquele domínio nesse idioma:
  const posts = await db.from('cloned_landing_pages')
    .select('name, page_path, published_url, transformed_html, brand, product, created_at, lang')
    .eq('target_domain', domain)
    .eq('publish_status', 'success')
    .like('page_path', '/blog/%')   // só posts, exclui o próprio /blog
    .eq('lang', lang)
    .order('created_at', { ascending: false });
  
  // 3. Para cada post, extrai do transformed_html:
  //    - og:image  → imagem do card
  //    - meta description → excerpt
  //    - article:published_time → data formatada
  //    - article:author → autor
  
  // 4. Renderiza HTML server-side com cards + paginação
  const html = renderBlogIndex({ domainConfig, posts, lang, page: 1 });
  
  // 5. Upsert em cloned_landing_pages (page_path='/blog', is_homepage=false)
  //    Para idiomas adicionais: page_path='/es/blog', '/en/blog'
  
  // 6. Marca publish_status='pending' para o pipeline normal pegar
});
```

#### 2. Template visual `_shared/blog-index-template.ts`

Inspiração: layout do arquivo `Modelo_para_Blog.txt` (portal estilo Mention/WordPress) — mas **não copiamos** o HTML do WordPress. Geramos HTML semântico limpo com:

```html
<main class="blog-index">
  <header class="blog-hero">
    <nav class="breadcrumb">Home / Blog</nav>
    <h1>{SiteName} — Insights, Guias e Tutoriais</h1>
    <p class="lead">{seo_domains[].description}</p>
    <div class="meta-bar">
      <span>📰 {totalPosts} artigos publicados</span>
      <div class="lang-switcher">PT | EN | ES</div>
    </div>
  </header>

  <section class="posts-grid">
    {#each posts}
      <article class="post-card">
        <a href="{published_url}">
          <div class="post-thumb" style="background-image:url({og_image})">
            <span class="post-category">{brand || category}</span>
          </div>
          <div class="post-body">
            <time datetime="{created_at}">{formattedDate}</time>
            <h2>{name}</h2>
            <p class="excerpt">{description}</p>
            <span class="read-more">Ler artigo →</span>
          </div>
        </a>
      </article>
    {/each}
  </section>

  <nav class="pagination">
    <a href="/blog/page/1">1</a> <a href="/blog/page/2">2</a> ...
  </nav>

  <aside class="sister-blogs">
    <h3>Outros blogs do ecossistema Smart Dent</h3>
    {#each seo_domains}<a href="https://{d.domain}/blog">📚 {d.name}</a>{/each}
  </aside>
</main>
```

CSS responsivo embutido (mobile-first, grid 1 col → 2 col tablet → 3 col desktop). Tema visual coerente com o footer existente (escuro, accent dourado/azul conforme o domínio).

#### 3. JSON-LD Blog + ItemList

```json
{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Blog Dentala",
  "url": "https://dentala.com.br/blog",
  "description": "...",
  "publisher": { "@type": "Organization", "name": "Smart Dent", ... },
  "blogPost": [ /* 12 BlogPosting objects da página atual */ ]
}
```

#### 4. Botão "Gerar páginas /blog para todos os domínios" no painel `LPClonePanel`

Adicionar bloco UI:

```
┌─────────────────────────────────────────────┐
│ 📰 Índices de Blog                          │
│                                             │
│ 9 domínios elegíveis (≥1 blog publicado)    │
│ Status: 0/9 com /blog gerado                │
│                                             │
│ [🚀 Gerar /blog para todos os domínios]     │
│ [↻ Regenerar índices existentes]            │
└─────────────────────────────────────────────┘
```

Loop sequencial chama `generate-blog-index` para cada domínio com >0 posts publicados. Após geração, dispara o pipeline de publicação (mesmo botão "Republicar Tudo" que você já usa) para subir os HTMLs.

#### 5. Auto-regeneração ao publicar novo blog

Adicionar hook no fim de `clone-landing-page` (ou wherever a publicação de blog termina): se `target_domain` tem `/blog` index existente, agenda uma regeneração automática para incluir o novo post na lista. Isso mantém o índice sempre sincronizado sem ação manual.

#### 6. Suporte a múltiplos idiomas (caso `dentala.com.br`)

Para domínios com posts EN/ES, a função gera **3 índices independentes**:
- `/blog` (PT)
- `/en/blog` (EN, se houver posts EN)
- `/es/blog` (ES, se houver posts ES)

Cada um com seu próprio listing + lang switcher cruzando entre as três versões.

### Arquivos criados/modificados

| Arquivo | Tipo | O que faz |
|---|---|---|
| `supabase/functions/generate-blog-index/index.ts` | NOVO | Edge function que gera o HTML do índice e faz upsert em `cloned_landing_pages` |
| `supabase/functions/_shared/blog-index-template.ts` | NOVO | Template HTML+CSS+JSON-LD do índice |
| `supabase/functions/_shared/blog-index-extractors.ts` | NOVO | Helpers para extrair og:image / description / data dos `transformed_html` dos posts |
| `src/components/LPClonePanel.tsx` | edit | Adiciona o bloco "📰 Índices de Blog" com botões de geração/regeneração |
| `supabase/functions/clone-landing-page/index.ts` | edit | Hook ao final: se publicou blog em domínio com `/blog` index, agendar regeneração |

### Pós-implementação (fluxo do usuário)

1. Você clica em **"🚀 Gerar /blog para todos os domínios"** → 9 chamadas em paralelo geram os HTMLs e fazem upsert em `cloned_landing_pages`.
2. Você clica em **"🚀 Republicar Tudo (exceto www.smartdent.com.br)"** (botão que já existe) → o pipeline normal sobe os HTMLs para Cloudflare/Git/FTP.
3. Os 9 links `→ Blog X` no footer agora abrem páginas reais com cards de todos os posts daquele domínio.

### Fora de escopo

- Não toco em `www.smartdent.com.br` (mantém o veto de sempre).
- Não cria comentários, busca, ou tagging — é puramente um índice estático.
- Não reusa o HTML literal do `Modelo_para_Blog.txt` (é WordPress + Elementor, ~880 linhas de framework). Usa **só como referência visual** de "portal de notícias".
- Não cria rota `/blog/category/X` — só `/blog` paginado. (Adição futura possível.)

### Risco

- Se um post não tiver `og:image` extraível do `transformed_html`, o card cai em uma cor sólida + ícone genérico (graceful degradation, não quebra o layout).
- Para domínios com **0 posts publicados** (mediti700, mediti900, rayshape3d), a função pula a geração e deixa o link `→ Blog X` ainda apontando para 404 — recomendação visual: esconder o link no footer enquanto não houver conteúdo, ou mostrar uma página "Em breve" estática (escolha sua preferência abaixo).
