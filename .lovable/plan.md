

# Fix Wikidata Write Engine -- Real Publishing

## Root Causes

1. **Circuit breaker is OFF** -- `WIKIDATA_WRITE_ENABLED = false` in `system_flags`, so `resolve_and_persist` never reaches the write block (line 1134)
2. **OAuth 1.0a signing is broken** -- All params (including `oauth_*`) are sent as POST body via `URLSearchParams`. Wikidata expects OAuth params in the `Authorization` header, with only API params in the body
3. **CSRF GET request is broken** -- Same issue: OAuth params mixed into query string instead of Authorization header

## Fix Plan

### 1. SQL: Enable circuit breaker
```sql
UPDATE system_flags SET value = '{"enabled": true}' WHERE key = 'WIKIDATA_WRITE_ENABLED';
```

### 2. Fix OAuth 1.0a in `wikidata-sync/index.ts`

**a) New helper: `buildOAuthHeader(oauthParams)`**
- Takes the signed OAuth params and builds a proper `Authorization: OAuth ...` header string
- Only includes `oauth_*` keys in the header

**b) Fix `getWikidataCsrfToken()`**
- Sign all params (oauth + API) together for signature computation
- Send API params (`action`, `meta`, `type`, `format`) as query string
- Send OAuth params as `Authorization` header
- Do NOT mix them

**c) Fix `executeWbEditEntity()`**  
- Sign all params together for signature base string
- Send API params (`action`, `format`, `token`, `bot`, `data`, `summary`, `id`/`new`) as POST body
- Send OAuth params as `Authorization` header
- This is the critical fix -- currently the massive `data` JSON is being percent-encoded twice (once in signature, once in body alongside oauth params), which corrupts the signature

**d) Add response logging**
- Log the raw Wikidata API response for debugging
- Log CSRF token status

### 3. Redeploy edge function

### Files Modified

| File | Action |
|---|---|
| `supabase/functions/wikidata-sync/index.ts` | Fix OAuth header separation in `signOAuth1a`, `getWikidataCsrfToken`, `executeWbEditEntity` |
| SQL migration | Enable `WIKIDATA_WRITE_ENABLED` flag |

## Technical Detail: Correct OAuth 1.0a Flow

```text
CURRENT (BROKEN):
  sign(all_params) → URLSearchParams(all_signed_params) → POST body
  
CORRECT:
  sign(oauth_params + api_params) → Authorization: OAuth oauth_params
                                   → POST body: api_params only
```

The signature base string includes ALL params for computation, but the OAuth params are transmitted via the `Authorization` header, not in the body/query.

