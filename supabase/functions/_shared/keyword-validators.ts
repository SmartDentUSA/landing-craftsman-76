/**
 * Shared keyword validation for Google Ads exporters.
 * Combines structural checks (length, URLs, numeric-only) with semantic blocklist.
 */

import { detectMetaPattern, normalize } from './text-utils.ts';

export interface KeywordValidationContext {
  source?: string;
  productId?: string | null;
  productName?: string | null;
}

export interface KeywordValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a single keyword. Returns { valid, reason }.
 * Logs structured warning when blocked by semantic pattern (for falso-negativo analysis).
 */
export function validateKeyword(text: string, context: KeywordValidationContext = {}): KeywordValidationResult {
  if (!text || typeof text !== 'string') return { valid: false, reason: 'EMPTY' };
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 80) return { valid: false, reason: 'LENGTH' };
  if (trimmed.includes('://') || trimmed.includes('[object')) return { valid: false, reason: 'STRUCTURAL_URL' };
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) return { valid: false, reason: 'STRUCTURAL_PATH' };
  if (trimmed.includes('.com') || trimmed.includes('.br') || trimmed.includes('.net')) return { valid: false, reason: 'STRUCTURAL_TLD' };
  if (trimmed.match(/^[\d\s\-\/]+$/)) return { valid: false, reason: 'NUMERIC_ONLY' };

  const metaReason = detectMetaPattern(trimmed);
  if (metaReason) {
    console.warn('[KW_BLOCKED]', JSON.stringify({
      keyword: trimmed,
      source: context.source ?? 'unknown',
      pattern_matched: metaReason,
      product_id: context.productId ?? null,
      product_name: context.productName ?? null,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, reason: `SEMANTIC:${metaReason}` };
  }

  return { valid: true };
}

/**
 * Convenience boolean wrapper that preserves the legacy isValidKeyword signature.
 */
export function isValidKeyword(text: string, context: KeywordValidationContext = {}): boolean {
  return validateKeyword(text, context).valid;
}

/**
 * Filter an array of keyword-like objects, collecting blocked samples for benchmark logging.
 * Returns { valid, blocked, blockedSamples (max 10) }.
 */
export function filterKeywordsWithSamples<T extends { text: string; source?: string }>(
  keywords: T[],
  context: { productId?: string | null; productName?: string | null } = {}
): { valid: T[]; blockedCount: number; blockedSamples: string[] } {
  const valid: T[] = [];
  const blockedSamples: string[] = [];
  let blockedCount = 0;
  const seen = new Set<string>();

  for (const kw of keywords) {
    const result = validateKeyword(kw.text, { source: kw.source, ...context });
    if (result.valid) {
      const key = normalize(kw.text);
      if (!seen.has(key)) {
        seen.add(key);
        valid.push(kw);
      }
    } else {
      blockedCount++;
      if (blockedSamples.length < 10) blockedSamples.push(`${kw.text} [${result.reason}]`);
    }
  }

  return { valid, blockedCount, blockedSamples };
}
