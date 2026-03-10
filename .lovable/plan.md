

# Upsert homepage instead of duplicating

## Problem
When publishing with "Definir como página principal (/)", the code always `INSERT`s a new row in `cloned_landing_pages`. This creates duplicates. It should find any existing homepage for that domain and update it instead.

## Solution
In `LPPublishDialog.tsx`, before inserting, check if an existing `cloned_landing_pages` record exists with `target_domain = selectedDomain AND is_homepage = true`. If found, `UPDATE` that record. Otherwise, `INSERT` a new one.

Also apply the same logic for non-homepage pages: check by `target_domain + page_path` to prevent duplicates for any path.

## Changes — `src/components/LPPublishDialog.tsx`

Replace the insert block (lines 164-185) with:

```typescript
// 4. Upsert into cloned_landing_pages (overwrite if same domain+path exists)
const basePayload = {
  name: landingPage.name,
  original_html: htmlCode,
  transformed_html: htmlCode,
  cta_url: previewUrl,
  target_domain: selectedDomain,
  page_path: pagePath,
  is_homepage: isHomepage,
  status: 'ready' as const,
  publish_status: 'pending' as const,
  source_landing_page_id: landingPage.id,
};

// Check for existing record with same domain + path
let existingQuery = supabase
  .from('cloned_landing_pages')
  .select('id')
  .eq('target_domain', selectedDomain);

if (isHomepage) {
  existingQuery = existingQuery.eq('is_homepage', true);
} else {
  existingQuery = existingQuery.eq('page_path', pagePath);
}

const { data: existing } = await existingQuery.maybeSingle();

let clonedLPId: string;

if (existing) {
  // Update existing record
  const { error: updateError } = await supabase
    .from('cloned_landing_pages')
    .update({ ...basePayload, updated_at: new Date().toISOString() })
    .eq('id', existing.id);
  if (updateError) throw updateError;
  clonedLPId = existing.id;
} else {
  // Insert new record
  const { data: newLP, error: insertError } = await supabase
    .from('cloned_landing_pages')
    .insert({ ...basePayload, user_id: user.id })
    .select('id')
    .single();
  if (insertError) throw insertError;
  clonedLPId = newLP.id;
}
```

Then use `clonedLPId` instead of `clonedLP.id` in the edge function call (line 197).

### File changed
- `src/components/LPPublishDialog.tsx`

