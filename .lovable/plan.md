
# System A – Knowledge Brain: Job Queue & Enhanced Architecture

## Current State

| Component | Status |
|-----------|--------|
| `fetchKnowledgeGraph()` | ✅ Exists (651 lines) |
| `buildProductGraph()` | ✅ Exists |
| `buildBlogGraph()` | ✅ Exists |
| 80+ Edge Functions | ✅ Deployed |
| `content_submissions` table | ❌ Missing |
| `content_jobs` table | ❌ Missing |
| `generated_pages` table | ❌ Missing |
| `page_publications` table | ❌ Missing |
| `content_entity_links` table | ❌ Missing |

---

## Implementation Plan

### Phase 1: Database Schema (5 new tables)

**1. `content_submissions`** — Versioned content inbox
```sql
- id, source_system, content_type, title, raw_content
- tags, metadata, origin, extracted_entities, related_products
- processing_status, editorial_status
- version, parent_submission_id (for history)
- created_at, updated_at
```

**2. `content_jobs`** — Job queue for async processing
```sql
- id, submission_id, job_type (process_submission | regenerate_page)
- status (pending | running | completed | failed)
- attempts, max_attempts, last_error
- scheduled_at, started_at, finished_at
- priority (for ordering)
```

**3. `generated_pages`** — Final SEO pages
```sql
- id, title, slug, path (SEO-friendly URL structure)
- html_content, structured_content, entities
- knowledge_graph_snapshot, schema_json_ld
- content_hash (SHA256 for dedup)
- embedding VECTOR(768) (for RAG)
- seo_score, published, regeneration_required
- source_submission_id
```

**4. `page_publications`** — Publication history for rollback
```sql
- id, page_id, version
- html_snapshot, published_url, published_domain
- published_at
```

**5. `content_entity_links`** — Normalized entity relationships
```sql
- id, page_id, entity_type, entity_id
- relevance_score
- created_at
```

### Phase 2: Edge Functions (3 new)

**1. `content-submission`** — POST endpoint for System B
- Validates `metadata.intent` (seo | education | comparison | commercial)
- Creates submission record
- Creates job in `content_jobs` with `job_type: 'process_submission'`
- Returns submission ID for tracking

**2. `process-content-submission`** — Worker function (16-step pipeline)
```
1. Load submission
2. Normalize content
3. Extract entities (AI)
4. Fetch Knowledge Graph
5. Build topic/product graph
6. Link entities
7. Generate structured content
8. Generate SEO metadata
9. Generate Schema JSON-LD
10. Generate HTML
11. Generate internal links
12. Compute SHA256 hash
13. Check duplicates
14. Generate embeddings
15. Save to generated_pages + entity_links
16. Create publication record
```

**3. `process-job-queue`** — Cron worker (processes pending jobs)
- Fetches oldest pending jobs (FIFO with priority)
- Marks as `running`, calls processor
- Handles retries (max 3 attempts)
- Updates status to `completed` or `failed`

### Phase 3: Knowledge Graph Extensions

**Add to `fetchKnowledgeGraph.ts`:**

```typescript
// buildTopicGraph() — Navigate by topic instead of product
export function buildTopicGraph(
  knowledgeGraph: KnowledgeGraph,
  topic: string  // e.g., "implantodontia", "fluxo-digital"
)

// generateInternalLinks() — Auto-connect pages by entities
export function generateInternalLinks(
  knowledgeGraph: KnowledgeGraph,
  currentEntities: string[]
): Array<{ title: string; path: string; relevance: number }>
```

### Phase 4: Update config.toml

Register 3 new Edge Functions:
```toml
[functions.content-submission]
verify_jwt = false

[functions.process-content-submission]
verify_jwt = true

[functions.process-job-queue]
verify_jwt = true
```

---

## Architecture Flow

```text
              SYSTEM B (External)
                     │
         POST /content-submission
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│               SYSTEM A – KNOWLEDGE BRAIN           │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐    ┌──────────────┐             │
│  │ CONTENT      │───▶│ JOB QUEUE    │             │
│  │ SUBMISSIONS  │    │ content_jobs │             │
│  │ (versioned)  │    │ (async)      │             │
│  └──────────────┘    └──────┬───────┘             │
│                             │                      │
│                    ┌────────▼────────┐            │
│                    │ WORKER          │            │
│                    │ process-job     │            │
│                    └────────┬────────┘            │
│                             │                      │
│  ┌──────────────────────────▼──────────────────┐  │
│  │           KNOWLEDGE GRAPH                    │  │
│  │   fetchKnowledgeGraph()                      │  │
│  │   buildProductGraph() | buildBlogGraph()    │  │
│  │   buildTopicGraph()   | generateInternalLinks│ │
│  └──────────────────────────┬──────────────────┘  │
│                             │                      │
│  ┌──────────────────────────▼──────────────────┐  │
│  │           GENERATED PAGES                    │  │
│  │   html_content + embeddings + schema        │  │
│  │   content_entity_links (normalized)         │  │
│  └──────────────────────────┬──────────────────┘  │
│                             │                      │
│  ┌──────────────────────────▼──────────────────┐  │
│  │         PAGE PUBLICATIONS                    │  │
│  │   Version history + Rollback support        │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
                     │
                     ▼
              PUBLIC OUTPUT
        SEO Pages | RAG Chat | APIs
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| SQL Migration | Create | 5 tables + indexes + RLS + triggers |
| `supabase/functions/content-submission/index.ts` | Create | POST endpoint |
| `supabase/functions/process-content-submission/index.ts` | Create | Processing pipeline |
| `supabase/functions/process-job-queue/index.ts` | Create | Cron worker |
| `supabase/functions/_shared/fetchKnowledgeGraph.ts` | Modify | Add `buildTopicGraph()` + `generateInternalLinks()` |
| `supabase/config.toml` | Modify | Register 3 new functions |

**Estimated: ~1000 lines of new code**
