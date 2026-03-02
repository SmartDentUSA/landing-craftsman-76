/**
 * Dual-AI Competition Module
 * Sistema de competição entre Lovable AI e DeepSeek para geração de conteúdo
 * Sempre gera com ambas AIs e seleciona automaticamente o melhor resultado
 */

import { trackFromResponse } from './track-ai-usage.ts';

interface ContentEvaluation {
  score: number;
  details: {
    structure: number;
    readability: number;
    keywords: number;
    accuracy: number;
    engagement: number;
  };
}

interface CompetitionResult {
  content: string;
  winner: 'lovable' | 'deepseek';
  score: number;
  lovableScore?: number;
  deepseekScore?: number;
}

export async function generateWithLovableAI(
  systemPrompt: string,
  userPrompt: string,
  trackingContext?: { edgeFunctionId: string; actionName: string; productName?: string }
): Promise<string> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_completion_tokens: 4000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Track token usage
  if (trackingContext) {
    await trackFromResponse(data, trackingContext.edgeFunctionId, trackingContext.actionName, trackingContext.productName);
  }

  return data.choices?.[0]?.message?.content || '';
}

export async function generateWithDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  trackingContext?: { edgeFunctionId: string; actionName: string; productName?: string }
): Promise<string> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepseekApiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Track token usage
  if (trackingContext) {
    await trackFromResponse(data, trackingContext.edgeFunctionId, trackingContext.actionName, trackingContext.productName);
  }

  return data.choices?.[0]?.message?.content || '';
}

export function evaluateContent(
  content: string,
  criteria: {
    minLength?: number;
    maxLength?: number;
    requiredKeywords?: string[];
    contentType: 'blog' | 'social' | 'product' | 'tiktok';
  }
): ContentEvaluation {
  const details = {
    structure: evaluateStructure(content, criteria.contentType),
    readability: evaluateReadability(content),
    keywords: evaluateKeywords(content, criteria.requiredKeywords || []),
    accuracy: evaluateAccuracy(content),
    engagement: evaluateEngagement(content, criteria.contentType)
  };

  const score = Object.values(details).reduce((sum, val) => sum + val, 0) / 5;

  return { score, details };
}

function evaluateStructure(content: string, type: string): number {
  let score = 50;

  switch (type) {
    case 'blog':
      if (content.includes('# ') || content.includes('## ')) score += 20;
      if (content.split('\n\n').length >= 5) score += 15;
      if (content.length >= 1200 && content.length <= 2500) score += 15;
      break;
    
    case 'social':
      if (content.length >= 100 && content.length <= 300) score += 25;
      if (content.includes('💬') || content.includes('📲')) score += 15;
      if (/\b(Comenta|Salva|Marca)\b/.test(content)) score += 10;
      break;
    
    case 'tiktok':
      if (content.includes('POV:') || content.includes('🔥')) score += 20;
      if (content.length >= 150 && content.length <= 500) score += 20;
      if (content.split('\n').length >= 3) score += 10;
      break;
    
    case 'product':
      // Para conteúdo de produto (benefits, keywords, features)
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) score += 30;
        if (content.length >= 200) score += 20;
      } catch {
        // Se não for JSON, avaliar como texto
        if (content.length >= 200) score += 25;
        if (content.split('\n').length >= 3) score += 25;
      }
      break;
  }

  return Math.min(100, score);
}

function evaluateReadability(content: string): number {
  let score = 50;
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;

  if (avgSentenceLength >= 10 && avgSentenceLength <= 20) score += 25;
  if (!content.includes('```json') && !content.includes('"title":')) score += 25;

  return Math.min(100, score);
}

function evaluateKeywords(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 50;
  
  const found = keywords.filter(kw => 
    content.toLowerCase().includes(kw.toLowerCase())
  ).length;
  
  return (found / keywords.length) * 100;
}

function evaluateAccuracy(content: string): number {
  let score = 100;
  
  const hallucinations = [
    /preço.*?\d+\.\d{3}/i,
    /garantia de \d+ anos/i,
    /comprovado por estudos/i,
    /100% eficaz/i
  ];
  
  hallucinations.forEach(pattern => {
    if (pattern.test(content)) score -= 20;
  });
  
  return Math.max(0, score);
}

function evaluateEngagement(content: string, type: string): number {
  let score = 50;
  
  const hasEmojis = /[\u{1F600}-\u{1F64F}]/u.test(content);
  const hasCTA = /\b(clique|acesse|veja|saiba|descubra|comenta)\b/i.test(content);
  const hasQuestion = /\?/.test(content);
  
  if (hasEmojis) score += 15;
  if (hasCTA) score += 20;
  if (hasQuestion) score += 15;
  
  return Math.min(100, score);
}

/**
 * Single AI generation (optimized for resource efficiency)
 * Uses only Lovable AI to avoid WORKER_LIMIT errors
 */
export async function compareAndSelectBest(
  systemPrompt: string,
  userPrompt: string,
  criteria: {
    minLength?: number;
    maxLength?: number;
    requiredKeywords?: string[];
    contentType: 'blog' | 'social' | 'product' | 'tiktok';
  },
  trackingContext?: { edgeFunctionId: string; actionName: string; productName?: string }
): Promise<CompetitionResult> {
  console.log('🤖 Generating with Lovable AI (single model)...');

  try {
    const content = await generateWithLovableAI(systemPrompt, userPrompt, trackingContext);
    
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const evaluation = evaluateContent(content, criteria);
    console.log(`✅ Generated successfully (score: ${evaluation.score.toFixed(1)})`);

    return { 
      content, 
      winner: 'lovable', 
      score: evaluation.score,
      lovableScore: evaluation.score
    };
  } catch (lovableError) {
    console.error('❌ Lovable AI failed, trying DeepSeek as fallback:', lovableError);
    
    const content = await generateWithDeepSeek(systemPrompt, userPrompt, trackingContext);
    
    if (!content) {
      throw new Error('Both AIs failed to generate content');
    }

    const evaluation = evaluateContent(content, criteria);
    console.log(`✅ Fallback to DeepSeek (score: ${evaluation.score.toFixed(1)})`);

    return { 
      content, 
      winner: 'deepseek', 
      score: evaluation.score,
      deepseekScore: evaluation.score
    };
  }
}
