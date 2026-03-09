

# Change Git deploy branch from `stable-website` to `main`

## Change

**File:** `supabase/functions/publish-git-kinghost/index.ts`

Line 11: Change the `BRANCH` constant from `'stable-website'` to `'main'`.

```typescript
const BRANCH = 'main';
```

This single constant controls all branch references in the function (ref lookup, commit push), so no other lines need changing.

