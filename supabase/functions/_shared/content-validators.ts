// ========================================
// SISTEMA DE VALIDAÇÃO DE CONTEÚDO v1.0.0
// ========================================

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface RegenerationConfig {
  maxAttempts: number;
  minScore: number;
  onFailure: (attempt: number, result: ValidationResult) => void;
}

// ========================================
// VALIDADORES GOOGLE ADS
// ========================================

export function validateGoogleAdsHeadline(headline: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const length = headline.length;

  // CRITICAL: Limite rígido de 30 caracteres
  if (length > 30) {
    errors.push(`Headline excede 30 chars (${length})`);
    score -= 50;
  } else if (length === 30) {
    warnings.push('Headline no limite exato (30 chars)');
    score -= 5;
  }

  // Validações de qualidade
  if (length < 10) {
    errors.push(`Headline muito curto (${length} chars)`);
    score -= 30;
  }

  if (!/[?!]/.test(headline) && !/\b(descubra|saiba|conheça|garanta)\b/i.test(headline)) {
    warnings.push('Headline sem CTA ou pontuação impactante');
    score -= 10;
  }

  if (/\b(melhor|líder|#1|mais)\b/i.test(headline)) {
    warnings.push('Contém claim possivelmente proibido');
    score -= 15;
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
    metadata: { length, limit: 30 }
  };
}

export function validateGoogleAdsDescription(description: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const length = description.length;

  // CRITICAL: Limite rígido de 90 caracteres
  if (length > 90) {
    errors.push(`Description excede 90 chars (${length})`);
    score -= 50;
  } else if (length > 85) {
    warnings.push('Description próxima do limite (85-90 chars)');
    score -= 5;
  }

  // Validações de qualidade
  if (length < 40) {
    errors.push(`Description muito curta (${length} chars)`);
    score -= 30;
  }

  if (!/[.!?]$/.test(description)) {
    warnings.push('Description sem pontuação final');
    score -= 5;
  }

  if (/\b(melhor|líder|#1|garantido)\b/i.test(description)) {
    warnings.push('Contém claim possivelmente proibido');
    score -= 15;
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
    metadata: { length, limit: 90 }
  };
}

export function validateGoogleAdsPath(path: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const cleaned = path.toLowerCase().replace(/[^a-z0-9]/g, '');
  const length = cleaned.length;

  // CRITICAL: Limite rígido de 15 caracteres
  if (length > 15) {
    errors.push(`Path excede 15 chars (${length})`);
    score -= 50;
  }

  if (length < 3) {
    errors.push(`Path muito curto (${length} chars)`);
    score -= 30;
  }

  if (/[^a-z0-9-]/.test(path)) {
    warnings.push('Path contém caracteres especiais que serão removidos');
    score -= 10;
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
    metadata: { original: path, cleaned, length, limit: 15 }
  };
}

// ========================================
// VALIDADORES WHATSAPP
// ========================================

export function validateWhatsAppMessage(
  message: string,
  requiredHook: string,
  painType: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  const length = message.length;

  // Validação de hook emocional
  const hookLower = requiredHook.toLowerCase();
  const messageLower = message.toLowerCase();
  
  if (!messageLower.includes(hookLower.substring(0, 20))) {
    errors.push(`Emotional hook ausente ou não detectado (esperado: ${hookLower.substring(0, 30)}...)`);
    score -= 40;
  }

  // Validação de estrutura de storytelling
  const hasContext = /\b(imagine|pense em|você já|quantas vezes)\b/i.test(message);
  const hasProblem = /\b(problema|dificuldade|desafio|frustração)\b/i.test(message);
  const hasSolution = /\b(solução|resolver|eliminar|acabar com)\b/i.test(message);
  const hasCTA = /\b(descubra|conheça|saiba|garanta|acesse)\b/i.test(message);

  let structureScore = 0;
  if (hasContext) structureScore += 25;
  if (hasProblem) structureScore += 25;
  if (hasSolution) structureScore += 25;
  if (hasCTA) structureScore += 25;

  if (structureScore < 75) {
    warnings.push(`Estrutura de storytelling incompleta (${structureScore}% completa)`);
    score -= (100 - structureScore) / 2;
  }

  // Validação de comprimento
  if (length < 100) {
    errors.push(`Mensagem muito curta (${length} chars, mínimo 100)`);
    score -= 30;
  }

  if (length > 500) {
    warnings.push(`Mensagem muito longa (${length} chars, ideal < 400)`);
    score -= 10;
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
    metadata: {
      length,
      painType,
      hookDetected: messageLower.includes(hookLower.substring(0, 20)),
      structureScore,
      hasContext,
      hasProblem,
      hasSolution,
      hasCTA
    }
  };
}

// ========================================
// VALIDADORES SPIN JOURNEY
// ========================================

export function validateSpinJourney(
  journey: { desire?: string; pain?: string; result?: string },
  successCases: any[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Validação de campos obrigatórios
  if (!journey.desire || journey.desire.trim().length < 50) {
    errors.push('Campo "desire" ausente ou muito curto (mínimo 50 chars)');
    score -= 35;
  }

  if (!journey.pain || journey.pain.trim().length < 50) {
    errors.push('Campo "pain" ausente ou muito curto (mínimo 50 chars)');
    score -= 35;
  }

  if (!journey.result || journey.result.trim().length < 50) {
    errors.push('Campo "result" ausente ou muito curto (mínimo 50 chars)');
    score -= 35;
  }

  // Validação de menção a success cases no "result"
  if (journey.result && successCases && successCases.length > 0) {
    const resultLower = journey.result.toLowerCase();
    const hasCaseReference = 
      /\b(caso|exemplo|cliente|empresa|resultado real)\b/i.test(journey.result) ||
      successCases.some(sc => {
        const customerName = sc.customer_data?.name?.toLowerCase();
        return customerName && resultLower.includes(customerName);
      });

    if (!hasCaseReference) {
      warnings.push('Campo "result" não menciona success cases disponíveis');
      score -= 20;
    }
  }

  // Validação de cross-referência Pain → Result
  if (journey.pain && journey.result) {
    const painKeywords = journey.pain.toLowerCase().match(/\b(custo|tempo|erro|falha|problema|dificuldade)\w*/g) || [];
    const resultLower = journey.result.toLowerCase();
    
    const crossReferencedKeywords = painKeywords.filter(kw => resultLower.includes(kw));
    const crossRefPercent = painKeywords.length > 0 
      ? (crossReferencedKeywords.length / painKeywords.length) * 100 
      : 0;

    if (crossRefPercent < 30) {
      warnings.push(`Baixa correlação Pain→Result (${Math.round(crossRefPercent)}%)`);
      score -= 15;
    }
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
    metadata: {
      desireLength: journey.desire?.length || 0,
      painLength: journey.pain?.length || 0,
      resultLength: journey.result?.length || 0,
      successCasesAvailable: successCases?.length || 0
    }
  };
}

// ========================================
// SISTEMA DE REGENERAÇÃO AUTOMÁTICA
// ========================================

export async function regenerateWithValidation<T>(
  generateFn: () => Promise<T>,
  validateFn: (result: T) => ValidationResult,
  config: RegenerationConfig
): Promise<{ result: T; validation: ValidationResult; attempts: number }> {
  let attempts = 0;
  let lastResult: T | null = null;
  let lastValidation: ValidationResult | null = null;

  while (attempts < config.maxAttempts) {
    attempts++;
    
    try {
      lastResult = await generateFn();
      lastValidation = validateFn(lastResult);

      console.log(`[Regeneration] Attempt ${attempts}/${config.maxAttempts}:`, {
        score: lastValidation.score,
        isValid: lastValidation.isValid,
        errors: lastValidation.errors,
        warnings: lastValidation.warnings
      });

      if (lastValidation.isValid && lastValidation.score >= config.minScore) {
        console.log(`[Regeneration] ✅ Success on attempt ${attempts}`);
        return { result: lastResult, validation: lastValidation, attempts };
      }

      config.onFailure(attempts, lastValidation);

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Regeneration] Error on attempt ${attempts}:`, error);
      config.onFailure(attempts, {
        isValid: false,
        score: 0,
        errors: [`Generation error: ${errMsg}`],
        warnings: [],
        metadata: { error: String(error) }
      });
    }
  }

  // Fallback: retornar último resultado mesmo que inválido
  console.error(`[Regeneration] ❌ Failed after ${attempts} attempts`);
  return {
    result: lastResult!,
    validation: lastValidation!,
    attempts
  };
}

// ========================================
// FALLBACKS PARA EDGE CASES
// ========================================

export const DEFAULT_FALLBACKS = {
  googleAds: {
    headline: 'Soluções Profissionais Aqui',
    description: 'Descubra produtos e serviços de qualidade. Acesse agora e transforme seus resultados.',
    path: 'solucoes'
  },
  whatsApp: {
    message: 'Olá! Temos uma solução especial que pode resolver seus desafios. Descubra como podemos ajudar você a alcançar melhores resultados. Entre em contato e saiba mais!',
    emotionalHook: 'Imagine resolver seus desafios de forma profissional'
  },
  spinJourney: {
    desire: 'O cliente deseja melhorar seus resultados e alcançar maior eficiência operacional.',
    pain: 'Enfrenta desafios relacionados a custos elevados e processos ineficientes.',
    result: 'Com a solução adequada, é possível reduzir custos e aumentar a produtividade de forma significativa.'
  }
};

export function applyFallback<T extends keyof typeof DEFAULT_FALLBACKS>(
  category: T,
  field: keyof typeof DEFAULT_FALLBACKS[T],
  reason: string
): string {
  console.warn(`[Fallback] Aplicando fallback para ${category}.${String(field)}: ${reason}`);
  return DEFAULT_FALLBACKS[category][field] as string;
}
