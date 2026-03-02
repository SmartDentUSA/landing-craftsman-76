/**
 * AI Token Usage Tracker
 * Logs token consumption from Lovable AI Gateway responses to ai_token_usage table
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Pricing per 1M tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'google/gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'google/gemini-3-flash-preview': { input: 0.15, output: 0.60 },
  'google/gemini-3-pro-preview': { input: 1.25, output: 10.00 },
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'openai/gpt-5': { input: 5.00, output: 15.00 },
  'openai/gpt-5-mini': { input: 0.40, output: 1.60 },
};

const DEFAULT_BRL_RATE = 5.50;

interface TrackAIUsageParams {
  edgeFunctionId: string;
  actionName: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  productName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Extract token usage from an AI Gateway JSON response object
 */
export function extractUsageFromResponse(data: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
} {
  const usage = data?.usage || {};
  return {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    model: data?.model || 'google/gemini-2.5-flash',
  };
}

/**
 * Calculate cost in USD and BRL for given token counts
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  brlRate: number = DEFAULT_BRL_RATE
): { costUsd: number; costBrl: number } {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['google/gemini-2.5-flash'];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  const costUsd = inputCost + outputCost;
  return {
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000, // 6 decimal places
    costBrl: Math.round(costUsd * brlRate * 1_000_000) / 1_000_000,
  };
}

/**
 * Log AI token usage to the ai_token_usage table.
 * Fire-and-forget — errors are logged but don't throw.
 */
export async function trackAIUsage(params: TrackAIUsageParams): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[track-ai-usage] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const model = params.model || 'google/gemini-2.5-flash';
    const promptTokens = params.promptTokens || 0;
    const completionTokens = params.completionTokens || 0;
    const totalTokens = params.totalTokens || promptTokens + completionTokens;

    const { costUsd, costBrl } = calculateCost(model, promptTokens, completionTokens);

    const { error } = await supabase.from('ai_token_usage').insert({
      edge_function_id: params.edgeFunctionId,
      action_name: params.actionName,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      cost_brl: costBrl,
      product_name: params.productName || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[track-ai-usage] Insert error:', error.message);
    } else {
      console.log(`[track-ai-usage] ✅ Logged ${totalTokens} tokens for ${params.edgeFunctionId}/${params.actionName}`);
    }
  } catch (err) {
    console.error('[track-ai-usage] Unexpected error:', err);
  }
}

/**
 * Convenience: track usage from a raw AI Gateway response object.
 */
export async function trackFromResponse(
  responseData: any,
  edgeFunctionId: string,
  actionName: string,
  productName?: string
): Promise<void> {
  const { promptTokens, completionTokens, totalTokens, model } = extractUsageFromResponse(responseData);
  await trackAIUsage({
    edgeFunctionId,
    actionName,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    productName,
  });
}
