

# Fix: Remove `public/` prefix from Git deploy paths

## Problem
KingHost maps the repo root to `/public_html/`, so files at `public/index.html` end up at `/public_html/public/index.html` — resulting in blank pages.

## Changes in `supabase/functions/publish-git-kinghost/index.ts`

### 1. Fix `repoPath` (lines 151-153)
Remove `public/` prefix:
```typescript
const repoPath = isHomepage
  ? 'index.html'
  : `${pagePath.startsWith('/') ? pagePath.slice(1) : pagePath}/index.html`;
```

### 2. Fix `nav-data.js` path (line 250)
Change `'public/nav-data.js'` → `'nav-data.js'`

Two lines changed, both removing the `public/` prefix.

