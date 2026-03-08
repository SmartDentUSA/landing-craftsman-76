

# FTP Publishing para smartdent.com.br — Plano de Implementacao

## Entregas

1. **Migration SQL** — `profile_name` em `publication_settings` com partial unique index
2. **Data UPDATE** — Append smartdent.com.br ao `seo_domains` JSONB
3. **Edge Function** — `publish-ftp-pages` com FTP real via `Deno.connect()`
4. **Frontend** — Router em `LPClonePanel.tsx` + `ProductBlogPublisherPanel.tsx` + campo `profile_name` em `PublicationSettings.tsx`

---

## 1. Migration SQL

```sql
ALTER TABLE publication_settings
ADD COLUMN IF NOT EXISTS profile_name text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_publication_settings_profile
ON publication_settings(profile_name)
WHERE profile_name IS NOT NULL;
```

## 2. Data UPDATE (via insert tool)

Append smartdent.com.br ao array `seo_domains` em `company_profile` com:
```json
{
  "name": "Smart Dent",
  "domain": "smartdent.com.br",
  "enabled": true,
  "publish_method": "ftp",
  "ftp_profile": "kinghost_smartdent",
  "priority": 10,
  "ftp_remote_path": "/public_html",
  "url_structure": {
    "products": "/produtos/{slug}",
    "blog": "/blog/{slug}",
    "guides": "/guias/{slug}",
    "compare": "/compare/{slug}",
    "spin": "/solucoes/{slug}"
  }
}
```

## 3. Edge Function `publish-ftp-pages`

**Novo:** `supabase/functions/publish-ftp-pages/index.ts`

Config: `verify_jwt = false` (valida JWT em codigo via `getClaims()`)

Pipeline:
1. CORS + auth via `getClaims()`
2. Busca LP HTML de `cloned_landing_pages`
3. Busca domain config de `company_profile.seo_domains` → extrai `ftp_profile`
4. Busca credenciais de `publication_settings` WHERE `profile_name = ftp_profile`
5. Injeta tracking pixels (reutiliza logica `generateTrackingScripts` + `injectTrackingScripts` inline)
6. FTP via `Deno.connect()`: USER → PASS → TYPE I → CWD → `ensureDirectory()` (MKD, ignore 550) → PASV → STOR → QUIT
7. Timeout wrapper 30s
8. Atualiza `cloned_landing_pages`: `publish_status`, `published_url`, `published_at`, `publish_error`

## 4. Frontend

### 4.1 `LPClonePanel.tsx`

**Interface SEODomain** (linha 83): adicionar `publish_method?: 'cloudflare' | 'ftp'`, `ftp_profile?: string`, `enabled?: boolean`, `ftp_remote_path?: string`

**Filtro** (linha 204):
```typescript
const enabledDomains = seoDomains.filter(d =>
  d.enabled !== false && (
    d.publish_method === 'ftp' ||
    (d.cloudflare_enabled && d.cloudflare_project_name)
  )
);
```

**publishMutation** (linha 510): router baseado em `publish_method`:
```typescript
const domainConfig = seoDomains.find(d => d.domain === lp.target_domain);
const method = domainConfig?.publish_method ?? 'cloudflare';
const functionName = method === 'ftp' ? 'publish-ftp-pages' : 'publish-cloudflare-pages';
```

**Badge** no seletor de dominio: `[FTP]` ou `[Cloudflare]` ao lado do nome.

### 4.2 `ProductBlogPublisherPanel.tsx`

**Interface SEODomain** (linha 20): mesmos campos extras.

**Filtro** (linha 108): mesma logica.

**publishMutation** (linha 169): manter `publish-product-blog-cloudflare` para Cloudflare; blogs via FTP serao fase futura.

### 4.3 `PublicationSettings.tsx`

Adicionar campo `profile_name` ao formulario FTP (Input com label "Nome do Perfil" e placeholder "kinghost_smartdent"). Incluir no state, load e save.

### 4.4 `supabase/config.toml`

```toml
[functions.publish-ftp-pages]
verify_jwt = false
```

---

## Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `supabase/functions/publish-ftp-pages/index.ts` |
| Modificar | `src/components/LPClonePanel.tsx` |
| Modificar | `src/components/ProductBlogPublisherPanel.tsx` |
| Modificar | `src/pages/PublicationSettings.tsx` |
| Modificar | `supabase/config.toml` |
| Migration | ADD COLUMN profile_name + partial unique index |
| Data | UPDATE company_profile seo_domains (append smartdent) |

