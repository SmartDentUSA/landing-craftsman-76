/**
 * Content Submission Endpoint
 * Receives content from external systems (System B) and queues for processing
 * 
 * POST /content-submission
 * {
 *   source_system: "system_b",
 *   content_type: "landing" | "product" | "blog" | "review" | "video",
 *   title: "...",
 *   raw_content: "...",
 *   tags: [],
 *   metadata: {
 *     intent: "seo" | "education" | "comparison" | "commercial", // REQUIRED
 *     campaign?: "",
 *     product_id?: "",
 *     topic?: ""
 *   },
 *   origin: {
 *     url?: "",
 *     author?: "",
 *     external_id?: ""
 *   },
 *   parent_submission_id?: "" // For versioning
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_INTENTS = ['seo', 'education', 'comparison', 'commercial'];
const VALID_CONTENT_TYPES = ['landing', 'product', 'blog', 'review', 'video', 'topic', 'guide'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    console.log('[content-submission] Received:', JSON.stringify(body, null, 2));

    // ═══════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════

    // Required fields
    if (!body.source_system) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: source_system' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_CONTENT_TYPES.includes(body.content_type)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid content_type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.title || body.title.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Title must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate metadata.intent (REQUIRED)
    const metadata = body.metadata || {};
    if (!metadata.intent) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: metadata.intent',
          valid_intents: VALID_INTENTS
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_INTENTS.includes(metadata.intent)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid metadata.intent. Must be one of: ${VALID_INTENTS.join(', ')}`,
          received: metadata.intent
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // VERSIONING: Handle parent_submission_id
    // ═══════════════════════════════════════════════════════════

    let version = 1;
    let parentId = body.parent_submission_id || null;

    if (parentId) {
      // Fetch parent to calculate version
      const { data: parent, error: parentError } = await supabase
        .from('content_submissions')
        .select('version')
        .eq('id', parentId)
        .single();

      if (parentError || !parent) {
        console.warn('[content-submission] Parent not found:', parentId);
        // Continue without parent
        parentId = null;
      } else {
        version = (parent.version || 1) + 1;
        console.log(`[content-submission] Creating version ${version} from parent ${parentId}`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CREATE SUBMISSION
    // ═══════════════════════════════════════════════════════════

    const submission = {
      source_system: body.source_system,
      content_type: body.content_type,
      title: body.title.trim(),
      raw_content: body.raw_content || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      metadata: metadata,
      origin: body.origin || {},
      extracted_entities: null, // Will be filled by processor
      related_products: Array.isArray(body.related_products) ? body.related_products : [],
      processing_status: 'pending',
      editorial_status: 'draft',
      version: version,
      parent_submission_id: parentId,
    };

    const { data: insertedSubmission, error: insertError } = await supabase
      .from('content_submissions')
      .insert(submission)
      .select()
      .single();

    if (insertError) {
      console.error('[content-submission] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create submission', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[content-submission] ✅ Created submission:', insertedSubmission.id);

    // ═══════════════════════════════════════════════════════════
    // CREATE JOB IN QUEUE
    // ═══════════════════════════════════════════════════════════

    const job = {
      submission_id: insertedSubmission.id,
      job_type: 'process_submission',
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      priority: metadata.priority || 0,
      scheduled_at: new Date().toISOString(),
    };

    const { data: insertedJob, error: jobError } = await supabase
      .from('content_jobs')
      .insert(job)
      .select()
      .single();

    if (jobError) {
      console.error('[content-submission] Job creation error:', jobError);
      // Don't fail the request, job can be created later
    } else {
      console.log('[content-submission] ✅ Created job:', insertedJob.id);
    }

    // ═══════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: insertedSubmission.id,
        job_id: insertedJob?.id || null,
        version: version,
        status: 'queued',
        message: `Content submission created and queued for processing`
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[content-submission] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
