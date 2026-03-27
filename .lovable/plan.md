

# Fix: Pipeline Blocked — `existing` Variable Out of Scope

## Root Cause

Line 1235 in `supabase/functions/wikidata-sync/index.ts` references `existing` which is `const`-declared inside the `if (upsertError)` block (line 1099). Since `const` is block-scoped, accessing it on line 1235 (outside that block) throws a `ReferenceError`, crashing the function.

The outer `catch` (line 1375) catches it and returns a 400 status with `INTERNAL_ERROR`, which the client surfaces as "Edge Function returned a non-2xx status code" → "Pipeline bloqueado".

## Evidence

Logs show:
1. `Repair: orphan QID Q1780993 from source` (line 1192 — last log before crash)
2. **No** "Decision context" log (line 1236 — never reached because line 1235 crashes)
3. **No** explicit error log (the `catch` at 1375 should log, but may be suppressed)

## Fix (1 Edit)

**File**: `supabase/functions/wikidata-sync/index.ts`

Hoist `existing` declaration to the same scope as `writeDecision` (line 1094), and assign it inside the block:

```
// Line 1094: Add declaration
let existingRecord: any = null;

// Inside if (upsertError) block, after line 1099:
// Change: const { data: existing } = await db...
// To:     const { data: existingData } = await db...
//         existingRecord = existingData;
// Then replace all references to `existing` within that block with `existingRecord`

// Line 1235: Fix reference
const sameHashFlag = existingRecord?.payload_hash === payloadHash;
```

This is a single variable rename + hoist. All 11 references to `existing` inside the `if (upsertError)` block get updated to `existingRecord`, and the structured logging on line 1235 uses `existingRecord` which is now in scope.

## Impact

- Unblocks the entire Wikidata sync pipeline
- Orphan recovery, anti-dup, payload guard, and structured logging will all execute correctly
- No behavior change — just fixes the scoping bug

