/**
 * Process Job Queue
 * Cron worker that processes pending content jobs
 * 
 * POST /process-job-queue
 * { batch_size?: 5 }
 * 
 * Workflow:
 * 1. Fetch oldest pending jobs (FIFO with priority)
 * 2. Mark as running
 * 3. Call process-content-submission
 * 4. Handle retries (max 3 attempts)
 * 5. Update status to completed or failed
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT for security
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batch_size || 5, 10); // Max 10 jobs per batch

    console.log(`[process-job-queue] Starting batch processing (size: ${batchSize})`);

    // ═══════════════════════════════════════════════════════════
    // FETCH PENDING JOBS
    // ═══════════════════════════════════════════════════════════

    const { data: jobs, error: fetchError } = await supabase
      .from('content_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Only jobs with < max attempts
      .lte('scheduled_at', new Date().toISOString()) // Scheduled for now or past
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error('[process-job-queue] Failed to fetch jobs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log('[process-job-queue] No pending jobs found');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending jobs', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-job-queue] Found ${jobs.length} pending jobs`);

    const results: Array<{ job_id: string; status: string; error?: string }> = [];

    // ═══════════════════════════════════════════════════════════
    // PROCESS EACH JOB
    // ═══════════════════════════════════════════════════════════

    for (const job of jobs) {
      console.log(`[process-job-queue] Processing job: ${job.id} (type: ${job.job_type})`);

      // Mark as running
      await supabase
        .from('content_jobs')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString(),
          attempts: job.attempts + 1
        })
        .eq('id', job.id);

      try {
        // Process based on job type
        if (job.job_type === 'process_submission') {
          await processSubmissionJob(supabase, job, authHeader);
          
          // Mark as completed
          await supabase
            .from('content_jobs')
            .update({ 
              status: 'completed',
              finished_at: new Date().toISOString(),
              last_error: null
            })
            .eq('id', job.id);

          results.push({ job_id: job.id, status: 'completed' });
          console.log(`[process-job-queue] ✅ Job completed: ${job.id}`);

        } else if (job.job_type === 'regenerate_page') {
          await regeneratePageJob(supabase, job, authHeader);
          
          await supabase
            .from('content_jobs')
            .update({ 
              status: 'completed',
              finished_at: new Date().toISOString(),
              last_error: null
            })
            .eq('id', job.id);

          results.push({ job_id: job.id, status: 'completed' });
          console.log(`[process-job-queue] ✅ Regeneration completed: ${job.id}`);

        } else {
          throw new Error(`Unknown job type: ${job.job_type}`);
        }

      } catch (error: any) {
        console.error(`[process-job-queue] Job failed: ${job.id}`, error);

        const newAttempts = job.attempts + 1;
        const newStatus = newAttempts >= job.max_attempts ? 'failed' : 'pending';
        
        // Calculate exponential backoff for retry
        const backoffMinutes = Math.pow(2, newAttempts); // 2, 4, 8 minutes
        const nextScheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await supabase
          .from('content_jobs')
          .update({ 
            status: newStatus,
            last_error: error.message,
            finished_at: newStatus === 'failed' ? new Date().toISOString() : null,
            scheduled_at: newStatus === 'pending' ? nextScheduledAt.toISOString() : job.scheduled_at
          })
          .eq('id', job.id);

        results.push({ 
          job_id: job.id, 
          status: newStatus, 
          error: error.message 
        });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════

    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const retrying = results.filter(r => r.status === 'pending').length;

    console.log(`[process-job-queue] Batch complete: ${completed} completed, ${failed} failed, ${retrying} retrying`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        completed,
        failed,
        retrying,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-job-queue] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Queue processing failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ═══════════════════════════════════════════════════════════
// JOB PROCESSORS
// ═══════════════════════════════════════════════════════════

async function processSubmissionJob(supabase: any, job: any, authHeader: string): Promise<void> {
  if (!job.submission_id) {
    throw new Error('Job missing submission_id');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  
  // Call process-content-submission edge function
  const response = await fetch(`${supabaseUrl}/functions/v1/process-content-submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      submission_id: job.submission_id
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Processing failed');
  }
}

async function regeneratePageJob(supabase: any, job: any, authHeader: string): Promise<void> {
  // Get the page that needs regeneration
  const { data: page, error: pageError } = await supabase
    .from('generated_pages')
    .select('id, source_submission_id')
    .eq('id', job.metadata?.page_id)
    .single();

  if (pageError || !page) {
    throw new Error('Page not found for regeneration');
  }

  if (!page.source_submission_id) {
    throw new Error('Page has no source submission for regeneration');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // Delete the existing page
  await supabase
    .from('generated_pages')
    .delete()
    .eq('id', page.id);

  // Re-process the submission
  const response = await fetch(`${supabaseUrl}/functions/v1/process-content-submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      submission_id: page.source_submission_id
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Regeneration failed');
  }
}
