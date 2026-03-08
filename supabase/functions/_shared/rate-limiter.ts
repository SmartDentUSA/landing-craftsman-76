/**
 * Global Rate Limiter for Edge Functions
 * Uses ai_token_usage table to count recent requests per function.
 * No new tables needed.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  windowSeconds?: number;
}

interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfter?: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  'rag-chat': { maxRequestsPerMinute: 60 },
  'generate-ecommerce-html': { maxRequestsPerMinute: 30 },
  'generate-social-content': { maxRequestsPerMinute: 30 },
  'generate-product-ai-content': { maxRequestsPerMinute: 30 },
  'process-content-submission': { maxRequestsPerMinute: 20 },
};

export async function checkRateLimit(
  edgeFunctionId: string,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const config = {
    ...DEFAULT_LIMITS[edgeFunctionId] || { maxRequestsPerMinute: 60 },
    ...customConfig,
  };

  const windowSeconds = config.windowSeconds || 60;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from('ai_token_usage')
    .select('id', { count: 'exact', head: true })
    .eq('edge_function_id', edgeFunctionId)
    .gte('created_at', since);

  if (error) {
    console.warn(`[rate-limiter] Error checking rate for ${edgeFunctionId}:`, error.message);
    // Fail open — allow request if we can't check
    return { allowed: true, currentCount: 0, limit: config.maxRequestsPerMinute };
  }

  const currentCount = count || 0;
  const allowed = currentCount < config.maxRequestsPerMinute;

  return {
    allowed,
    currentCount,
    limit: config.maxRequestsPerMinute,
    retryAfter: allowed ? undefined : windowSeconds,
  };
}

/**
 * Helper to return a 429 response when rate limited
 */
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      current: result.currentCount,
      limit: result.limit,
      retry_after_seconds: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
      },
    }
  );
}
