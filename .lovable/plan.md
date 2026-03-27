

# Fix: Payload builder only generates PT labels (EN missing)

## Root Cause

In `supabase/functions/_shared/wikidata-payload-builder.ts`, line 780-788:

```typescript
function buildMultilingualLabels(name: string): Record<string, WikidataLabel> {
  return {
    pt: { language: "pt", value: name },
    "pt-br": { language: "pt-br", value: name },
    // EN placeholder — ready for Gemini integration  ← NEVER SET
    // es placeholder — ready for Gemini integration  ← NEVER SET
  };
}
```

EN and ES labels are commented out. The same issue exists in:
- **Company descriptions** (lines 498-502): only `pt` and `pt-br`, no EN
- **Company aliases** (line 511): only `pt`
- **Product aliases** (line 687): only `pt`

Product descriptions (lines 668-672) **do** include EN — that's the only place it works.

## Critical Impact

The Edit 6 payload guard from the hardening plan requires both `pt` and `en` labels with min 2 chars. With the current builder, **every entity would be aborted** as invalid because `payload.labels.en` is always undefined.

## Fix

### File: `supabase/functions/_shared/wikidata-payload-builder.ts`

**1. `buildMultilingualLabels`** (line 780-788) — Add EN label using the same name (product names are typically already in a universal/commercial form):

```typescript
function buildMultilingualLabels(name: string): Record<string, WikidataLabel> {
  return {
    pt: { language: "pt", value: name },
    "pt-br": { language: "pt-br", value: name },
    en: { language: "en", value: name },
  };
}
```

**2. Company descriptions** (lines 498-502) — Add EN description:

```typescript
payload.descriptions = {
  pt: { language: "pt", value: shortDesc },
  "pt-br": { language: "pt-br", value: shortDesc },
  en: { language: "en", value: shortDesc },
};
```

**3. Company aliases** (line 511) — Add EN alias entry when available:

```typescript
if (aliasValues.length > 0) {
  payload.aliases = { pt: aliasValues, en: aliasValues };
}
```

**4. Product aliases** (line 686-688) — Same pattern:

```typescript
if (aliasValues.length > 0) {
  payload.aliases = { pt: aliasValues, en: aliasValues };
}
```

## Summary

| Location | Current | Fix |
|---|---|---|
| `buildMultilingualLabels` | pt, pt-br only | Add en |
| Company descriptions | pt, pt-br only | Add en |
| Company aliases | pt only | Add en mirror |
| Product aliases | pt only | Add en mirror |

Using the same PT value for EN is standard practice for commercial product names (e.g., "Atos Resina Composta Direta - DA2" is the same in any language). Future Gemini integration can generate proper translations later.

