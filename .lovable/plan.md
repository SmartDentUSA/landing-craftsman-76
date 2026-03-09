

# Fix: Stack overflow in publish-git-kinghost

## Problem
The chunked base64 conversion still crashes on large HTML because `btoa(binary)` receives a massive concatenated string. The `binary` variable itself can be hundreds of KB.

## Solution
Use GitHub's blob API with `"encoding": "utf-8"` instead of base64. This eliminates all base64 conversion entirely.

## Change: `supabase/functions/publish-git-kinghost/index.ts`

**Lines 159-178** — Replace the entire base64 encoding block with a direct UTF-8 blob:

```typescript
// Step C: Create blob with HTML content (utf-8 — no base64 needed)
const blobData = await ghFetch('/git/blobs', githubToken, {
  method: 'POST',
  body: JSON.stringify({
    content: html,
    encoding: 'utf-8',
  }),
});
```

This removes ~12 lines of chunked encoding code and replaces with 1 API call.

## Scope
- Single file change
- No frontend changes
- No database changes

