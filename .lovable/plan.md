

# Add FTP Publishing Config to Domain Cards in TrackingSEOTab

## Problem
The "Domínios SEO Multi-Site" section in Company Profile only shows Cloudflare Pages configuration. There's no way to configure FTP publishing (needed for smartdent.com.br on KingHost) from this UI. The `publish_method`, `ftp_profile`, `ftp_remote_path`, and `url_structure` fields must be set manually via SQL.

## Plan

### File: `src/components/TrackingSEOTab.tsx`

1. **Add `publish_method` selector** (radio or Select) at the top of each domain card, right after the domain identification inputs:
   - Options: `cloudflare` (default) | `ftp`
   - This controls which config section is shown

2. **Add FTP Configuration section** (sibling to the existing Cloudflare section), shown only when `publish_method === 'ftp'`:
   - **FTP Profile Name** (text input) — must match a `profile_name` in `publication_settings` table (e.g. `kinghost_smartdent`)
   - **Remote Path** (text input, default `/public_html`)
   - Status badge linking to Publication Settings page
   - Helper text: "Configure as credenciais FTP em Publication Settings"

3. **Conditionally show/hide Cloudflare vs FTP section** based on `publish_method`

4. **Update the "Adicionar Domínio" button** default object to include `publish_method: 'cloudflare'` and FTP fields

5. **Add `url_structure` editor** (collapsible) — simple key/value inputs for category URL patterns (e.g. `blog` → `/blog/{slug}`)

### File: `src/components/CompanyProfileManager.tsx`

6. **Update the `seo_domains` type** in the interface to include the new fields: `publish_method`, `ftp_profile`, `ftp_remote_path`, `url_structure`

### No database changes needed
The `seo_domains` column is already JSONB — new fields are stored automatically.

## UI Layout per Domain Card (after changes)

```text
┌─────────────────────────────────────────────┐
│ [Nome]  [Domínio]  [Descrição]              │
│                                              │
│ Método: (●) Cloudflare  (○) FTP             │
│                                              │
│ ┌─ Cloudflare Pages ──────────────────────┐ │
│ │ (existing UI, shown when cloudflare)    │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ FTP Config ────────────────────────────┐ │
│ │ Profile Name: [kinghost_smartdent]      │ │
│ │ Remote Path:  [/public_html]            │ │
│ │ ℹ️ Configure credenciais em Pub Settings │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ▸ URL Structure (collapsible)               │
│ ▸ Pixels e Analytics (existing)             │
│                                              │
│ [SEO] [Schema] [Footer]          [🗑 Delete]│
└─────────────────────────────────────────────┘
```

