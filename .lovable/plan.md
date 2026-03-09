

# Nav-Data.js for Git Deploy (publish-git-kinghost)

## Summary

Add the same `nav-data.js` incremental navigation system that already exists in `publish-ftp-pages` to `publish-git-kinghost`. After publishing a LP, the function will:

1. Inject `<script src="/nav-data.js" defer>` into the HTML before `</body>`
2. Query all published LPs + blogs for that domain
3. Generate `nav-data.js` with the same self-rendering script used by FTP
4. Push `nav-data.js` to `public/nav-data.js` in the same Git commit (or a follow-up commit)

## Changes

### `supabase/functions/publish-git-kinghost/index.ts`

**A. Inject nav-data.js script tag** (after tracking pixels injection, before blob creation ~line 140):
```typescript
const navScriptTag = `<script src="/nav-data.js" defer></script>`;
if (html.includes('</body>')) {
  html = html.replace('</body>', `${navScriptTag}\n</body>`);
} else {
  html += navScriptTag;
}
```

**B. After DB update (~line 219), add nav-data.js generation and push:**

1. Query `cloned_landing_pages` where `target_domain = domain` and `publish_status = 'published'`
2. Also query `product_blog_publications` for same domain
3. Build `navItems` array (same format as FTP version)
4. Generate the self-executing JS script (same as FTP's nav-data.js)
5. Create a second blob + tree + commit to push `public/nav-data.js`

**Key detail:** The Git tree API supports multiple files in one tree. We can optimize by including both the HTML blob AND the nav-data.js blob in a **single commit** instead of two separate commits. This means restructuring the flow slightly:

```text
1. Create HTML blob
2. Query all published pages for domain
3. Generate nav-data.js content
4. Create nav-data.js blob
5. Create tree with BOTH files
6. Create single commit
7. Update branch ref
```

This is more efficient (1 commit instead of 2) and avoids race conditions.

**C. Include `product_blog_publications` in the query** to also list blog posts in the navigation, matching the user's specification.

### No other files change

The FTP and Cloudflare functions already have their own nav-data implementations. The template engine and frontend are not affected.

## Technical Notes

- The nav-data.js script is self-contained with inline styles — no CSS dependencies
- The script skips rendering if fewer than 2 pages exist
- Current page is excluded from the nav links (`item.url === window.location.href`)
- The `product_blog_publications` table has columns: `title`, `published_url`, `page_path`, `target_domain`, `publish_status`

