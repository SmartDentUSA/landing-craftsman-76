

# Dashboard LP Cards: Add publish status + URL, remove "Gerar Blog Post"

## Changes in `src/pages/Dashboard.tsx`

### 1. Fetch published URLs for each LP
Query `cloned_landing_pages` to get publication info (published_url, publish_status) grouped by `source_landing_page_id`. Add this as a lookup map.

### 2. Show green "Publicado" badge + URL
For each LP card, if a matching `cloned_landing_pages` record exists with `publish_status = 'published'`:
- Show a green badge "Publicado"
- Show the `published_url` as a clickable link below the existing metadata line

### 3. Remove "Gerar Blog Post" button
Delete the button block (lines 589-597) that navigates to `/blog-generator/{id}`.

### Visual result per card
```text
┌──────────────────────────────────────────────────────┐
│ Scanner Intraoral    [Aprovado] [🟢 Publicado]       │
│ Template: ... | Versão: v3 | Modificado em: ...      │
│ 🔗 https://smartdent.com.br/produtos/scanner/       │
│                        [Editar] [Excluir] [Publicar] │
└──────────────────────────────────────────────────────┘
```

### Scope
- Single file: `src/pages/Dashboard.tsx`
- Add `useEffect` to query `cloned_landing_pages` for published URLs
- Add green badge + URL display in card
- Remove blog button

