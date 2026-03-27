

# Wikidata Write Engine Hardening — 11 Edits

All changes in `supabase/functions/wikidata-sync/index.ts`. No migrations needed (circuit breaker already enabled via last migration).

---

## Edit 1: Add `normalizeLabel` helper (insert before line 165)

```typescript
function normalizeLabel(label: string): string {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
```

## Edit 2: Fix `findExistingEntity` exact match (line 174)

Replace `r.label?.toLowerCase().trim() === label.toLowerCase().trim()` with:
```typescript
normalizeLabel(r.label || "") === normalizeLabel(label)
```

## Edit 3: State-aware idempotency (lines 1101-1105)

Replace the hash-only skip block with:

```typescript
const sameHash = existing?.payload_hash === payloadHash;
const hasQid = !!existing?.wikidata_qid;

if (sameHash && hasQid && existing?.sync_status === "synced") {
  writeDecision = "skip";
  syncStatus = "synced";
  wikidataQid = existing.wikidata_qid;
  entityMapId = existing.id;
} else if (sameHash && hasQid) {
  writeDecision = "update";
  syncStatus = existing.sync_status;
  wikidataQid = existing.wikidata_qid;
  entityMapId = existing.id;
} else if (sameHash && !hasQid) {
  writeDecision = "create";
  syncStatus = existing.sync_status;
  entityMapId = existing.id;
}
```

The `else` falls through to the existing upsert logic at line 1106.

## Edits 4-7: Insert block between lines 1161 and 1162

Single insertion covering orphan recovery, anti-dup, payload guard, and logging:

```typescript
// --- Edit 4: Orphan QID recovery ---
let repairSource: string | null = null;
if (!wikidataQid) {
  if (entityType === "company") {
    const { data: srcData } = await db.from("company_profile").select("wikidata_id").eq("id", internalId).maybeSingle();
    if (srcData?.wikidata_id) wikidataQid = srcData.wikidata_id;
  } else {
    const { data: srcData } = await db.from("products_repository").select("wikidata_item_id").eq("id", internalId).maybeSingle();
    if (srcData?.wikidata_item_id) wikidataQid = srcData.wikidata_item_id;
  }
  if (wikidataQid) {
    writeDecision = "update";
    repairSource = "orphan_qid";
    console.log(`[wikidata-sync] Repair: orphan QID ${wikidataQid} from source`);
  }
}

// --- Edit 5: Anti-dup multi-label + aliases ---
if (!wikidataQid && writeDecision === "create") {
  const labelCandidates = [
    payload.labels?.pt?.value,
    payload.labels?.en?.value,
    ...(payload.aliases?.pt || []).map((a: any) => a.value || a),
    ...(payload.aliases?.en || []).map((a: any) => a.value || a),
  ].filter(Boolean) as string[];
  for (const lbl of labelCandidates) {
    const found = await findExistingEntity(normalizeLabel(lbl));
    if (found) {
      wikidataQid = found;
      writeDecision = "update";
      repairSource = "anti_dup_match";
      console.log(`[wikidata-sync] Anti-dup: ${found} via "${lbl}"`);
      break;
    }
  }
}

// --- Edit 6: Payload validation guard ---
if (writeDecision !== "skip" && writeDecision !== "abort") {
  const requiredLangs = ["pt", "en"];
  const missingLangs = requiredLangs.filter(lang => {
    const val = payload.labels?.[lang]?.value;
    return !val || !val.trim() || val.trim().length < 2;
  });
  if (missingLangs.length) {
    return logAndReturn(db, {
      action: "resolve_and_persist", entityType, internalId, payloadHash,
      writeDecision: "abort", success: false,
      errorCode: "INVALID_PAYLOAD",
      errorMessage: `Missing/invalid labels for: ${missingLangs.join(", ")}`,
      durationMs: Date.now() - startTime,
    });
  }
}

// --- Edit 7: Structured logging ---
const sameHashFlag = existing?.payload_hash === payloadHash;
console.log("[wikidata-sync] Decision context:", JSON.stringify({
  phase: "pre_write", entityType, internalId,
  decision: writeDecision, syncStatus,
  hasQid: !!wikidataQid, sameHash: sameHashFlag,
  targetQid: wikidataQid, entityMapId, writeEnabled,
  repairMode: writeDecision === "update" && sameHashFlag,
  repairSource,
}));
```

Note: `existing` is only defined inside the RPC fallback block (line 1094). For the RPC-success path, `sameHashFlag` will be `undefined === payloadHash` which is `false` -- correct behavior since the RPC path handles its own logic.

## Edit 8: Expand write gate (line 1163)

Replace:
```typescript
if (writeEnabled && (writeDecision === "create" || writeDecision === "update")) {
```
With:
```typescript
if (writeEnabled && writeDecision !== "skip" && writeDecision !== "abort") {
```

## Edit 9: Force update + anti-dup recheck (after line 1178)

After `const targetQid = wikidataQid || existingQid || null;`, insert:

```typescript
if (targetQid && writeDecision === "create") writeDecision = "update";

// Anti-dup recheck (race condition mitigation)
let finalTargetQid = targetQid;
if (!finalTargetQid && writeDecision === "create" && ptLabel) {
  const recheck = await findExistingEntity(normalizeLabel(ptLabel));
  if (recheck) {
    finalTargetQid = recheck;
    writeDecision = "update";
    console.log("[wikidata-sync] Anti-dup recheck:", recheck);
  }
}
```

Then update the `withRetry` call at line 1179 to use `finalTargetQid` instead of `targetQid`.

## Edit 10: Read-after-write verification (after line 1211)

After `console.log(... Live write complete ...)`:

```typescript
const capturedQid = finalQid;
setTimeout(async () => {
  try {
    const vRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${capturedQid}&props=labels|descriptions|claims&format=json`);
    const vJson = await vRes.json();
    const e = vJson?.entities?.[capturedQid];
    const labelPt = e?.labels?.pt?.value;
    const labelEn = e?.labels?.en?.value;
    const validLabels = [labelPt, labelEn].filter(v => v && v.trim().length >= 2);
    const hasCoreData = validLabels.length > 0 && Object.keys(e?.claims || {}).length > 0;
    console.log(`[wikidata-sync] Verify: ${capturedQid} hasCoreData=${hasCoreData} labels=${validLabels.length}`);
    if (!hasCoreData) console.warn(`[wikidata-sync] ⚠ Weak write: ${capturedQid}`);
  } catch { /* non-blocking */ }
}, 1500);
```

## Edit 11: Expand `withRetry` defaults (line 1518)

Update default `retryOn` to include Wikidata transient errors:
```typescript
const { max = 3, delays = [600, 1500, 3000], retryOn = ["API_RATE_LIMIT", "NETWORK_ERROR", "maxlag", "readonly", "timeout"] } = options;
```

And update call site at line 1181:
```typescript
retryOn: ["API_RATE_LIMIT", "NETWORK_ERROR", "maxlag", "readonly", "timeout"]
```

---

## Summary

| # | Edit | Purpose |
|---|---|---|
| 1 | `normalizeLabel` | NFD accent stripping |
| 2 | `findExistingEntity` | Normalized comparison |
| 3 | Idempotency | State-aware skip/update/create |
| 4 | Orphan recovery | QID from source tables |
| 5 | Anti-dup | Multi-label + aliases search |
| 6 | Payload guard | Min 2 chars, required pt/en |
| 7 | Structured logging | Decision context + repairSource |
| 8 | Write gate | Negative logic |
| 9 | Force update + recheck | Race condition mitigation |
| 10 | Read-after-write | Validate labels/claims post-write |
| 11 | Retry expansion | maxlag/readonly/timeout |

Edge function auto-deploys after changes.

