

# Fix: Anti-dup matching category QIDs instead of creating product items

## Problem

`findExistingEntity` searches Wikidata via `wbsearchentities` and finds category items like Q1780993 (dental composite) as "exact matches" for product labels like "Resina Composta Direta - DA2". This causes the system to:

1. Set `writeDecision = "update"` instead of `"create"`
2. Update the **category item** (Q1780993) with product-specific data instead of creating a new product item

This happens in 3 places:
- Edit 5 anti-dup (line 1207)
- Pre-write anti-dup (line 1258)
- Anti-dup recheck (line 1271)

## Root Cause

`findExistingEntity` does a naive label comparison without checking what **type** of entity it found. Category QIDs (Q1780993, Q3834994, Q2631097, etc.) are well-known class items, not product instances.

## Fix (2 changes in `supabase/functions/wikidata-sync/index.ts`)

### 1. Add a blocklist of known category QIDs

Extract all QIDs from `CATEGORY_FALLBACK_MAP` into a Set, and filter them out of anti-dup results:

```typescript
const CATEGORY_QIDS = new Set(Object.values(CATEGORY_FALLBACK_MAP));
```

### 2. Update `findExistingEntity` to reject category QIDs

After finding an exact match, check if it's a known category QID. If so, skip it and continue searching:

```typescript
async function findExistingEntity(label: string): Promise<string | null> {
  const res = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=pt&format=json&limit=5`,
  );
  if (!res.ok) return null;

  const json = await res.json();
  const matches = json.search?.filter(
    (r: { id?: string; label?: string }) =>
      normalizeLabel(r.label || "") === normalizeLabel(label) &&
      !CATEGORY_QIDS.has(r.id)
  );
  
  if (matches?.length > 0) {
    return matches[0].id;
  }
  return null;
}
```

This ensures:
- Category items (Q1780993, Q3834994, Q2631097, etc.) are never treated as duplicates
- Products with genuinely matching labels are still caught
- The `CATEGORY_FALLBACK_MAP` acts as both the P279 resolver **and** the anti-dup exclusion list -- single source of truth

### Summary

| What | Before | After |
|---|---|---|
| Product "Resina Composta X" | Matches Q1780993 → update category | Skips Q1780993 → creates new item |
| Actual duplicate product | Matches correctly | Still matches correctly |
| Category QIDs | Treated as duplicates | Excluded from anti-dup |

One file changed. No migrations needed.

