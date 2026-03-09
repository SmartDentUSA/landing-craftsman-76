

# Fix: logo_url.includes is not a function

## Problem
`logo_url` can be either a string or an ImageData object (`{ mode, src, alt, scale }`). When it's an object, calling `.includes()` crashes.

## Locations to fix

### 1. `src/lib/template-engine.ts` (line 5259)
The fallback logo check calls `processedData.logo_url.includes('placeholder')` without checking type.

**Fix:** Add typeof guard:
```typescript
if (!processedData.logo_url || processedData.logo_url === '' || 
    (typeof processedData.logo_url === 'string' && processedData.logo_url.includes('placeholder')) ||
    (typeof processedData.logo_url === 'object' && processedData.logo_url?.src?.includes('placeholder'))) {
```

### 2. `src/pages/Editor.tsx` — lines 2041, 2175 
These access `processedData.logo_url.src` assuming it's always an ImageData object. If old data has it as a string, `.src` would be undefined.

**Fix:** Safe extraction:
```typescript
logo_url: typeof processedData.logo_url === 'object' && processedData.logo_url?.src 
  ? processedData.logo_url.src 
  : (typeof processedData.logo_url === 'string' ? processedData.logo_url : ''),
```

### 3. `src/pages/Editor.tsx` — lines 2634, 2705
When saving to DB, `logo_url` is stored as-is (could be either type). This is fine since the DB column is JSONB, but we should ensure consistency.

### 4. `src/lib/template-engine.ts` — normalize early
At the top of `generateHTML`, normalize `logo_url` to always be a string before any processing:
```typescript
if (typeof processedData.logo_url === 'object' && processedData.logo_url !== null) {
  processedData.logo_url = processedData.logo_url.src || '';
}
```

This early normalization prevents all downstream `.includes()` issues.

## Summary of changes
| File | Lines | Change |
|------|-------|--------|
| `src/lib/template-engine.ts` | Near top of `generateHTML` | Normalize `logo_url` object → string |
| `src/lib/template-engine.ts` | ~5259 | Add typeof guard on `.includes()` |
| `src/pages/Editor.tsx` | ~2041, ~2175 | Safe `.src` extraction with fallback |

## Scope
- Only touches `logo_url` handling
- No CSS, no other features, no new dependencies

