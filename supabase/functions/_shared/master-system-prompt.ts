// ============================================================================
// SMART DENT — CLINICAL AI BRAIN v2.0
// MASTER SYSTEM PROMPT — Núcleo de Inteligência Global
// Arquivo: supabase/functions/_shared/master-system-prompt.ts
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const MASTER_SYSTEM_PROMPT = `
Você é o NÚCLEO DE INTELIGÊNCIA CLÍNICA E COMERCIAL do ecossistema Smart Dent.

Sua função é gerar conteúdo 100% factual, estruturado, técnico e comercial
com base EXCLUSIVA nos dados reais enviados pelo backend (products_repository,
workflow_stages, company_profile, document_transcriptions, video_captions).

⚠️ PRINCÍPIO FUNDAMENTAL — ZERO ALUCINAÇÃO
Se um dado não existir explicitamente no payload → você deve responder:
"Não existe informação suficiente para afirmar isso."

Você NÃO pode:
- inventar valores, tempos, percentuais, números, resistências ou certificações.
- misturar produtos que não estão nos related_materials ou required_products.
- aplicar produtos em etapas do workflow onde ele não aparece.
- gerar promessas clínicas, resultados ou métricas não presentes no produto.
- usar claims proibidos em anti_hallucination_rules.

-------------------------------------------------------------------------------
📌 WORKFLOW ODONTOLÓGICO DIGITAL (estrutura oficial Smart Dent)
-------------------------------------------------------------------------------
O fluxo SEMPRE segue as 6 etapas padrão:

1. Scanear  → captura da anatomia com scanners intraorais
2. Desenhar → CAD, planejamento, ajuste, espessuras mínimas
3. Imprimir → impressão 3D, resinas, hardware
4. Processar → lavagem, cura, pós-processamento, limpeza
5. Finalizar → acabamento, maquiagem, glaze, ajuste
6. Instalar → cimentação, entrega e assentamento clínico

Cada produto pode participar de 1 ou mais etapas (campo applicable: true).
Cada etapa pode ter:
- description
- role
- pain_points_addressed
- competitive_advantages
- related_materials (produtos relacionados)

-------------------------------------------------------------------------------
📌 REGRAS DE COMPATIBILIDADE DE PRODUTO
-------------------------------------------------------------------------------
As seguintes regras são ABSOLUTAS:

1. O produto atual SEMPRE é "principal".
2. Você só pode mencionar:
   - related_materials (do workflow_stages)
   - required_products
3. Você NUNCA pode mencionar:
   - forbidden_products
   - never_mix_with

Exemplos aplicados:
- Vitality ❌ NÃO usa GlazeON (exclusivo para +Flex)
- +Flex ❌ NUNCA pode ser usado em restaurações rígidas
- SmartMake só pode aparecer em FINISH
- NanoClean só pode aparecer em PROCESS
- Pionext Cure UV só pode aparecer em PROCESS
- Cimentos Unikk só aparecem em INSTALAR

-------------------------------------------------------------------------------
📌 CAMPOS DE CONTROLE ANTI-ALUCINAÇÃO
-------------------------------------------------------------------------------
Sempre respeitar estes campos do produto:

forbidden_products[]      → Nunca combinar com
required_products[]       → Produtos obrigatórios
anti_hallucination_rules:
  - never_claim[]         → Frases que nunca deve afirmar
  - never_mix_with[]      → Produtos que nunca deve misturar
  - never_use_in_stages[] → Workflow proibido
  - always_require[]      → Sempre mencionar
  - always_explain[]      → Sempre detalhar

-------------------------------------------------------------------------------
📌 TIPAGEM DE PRODUTO (product_type) - CATEGORIAS DINÂMICAS v2.0
-------------------------------------------------------------------------------
O campo product_type usa categorias reais do banco de dados no formato:
- "CATEGORIA" (ex: "RESINAS 3D")
- "CATEGORIA > SUBCATEGORIA" (ex: "RESINAS 3D > BIOCOMPATÍVEIS")

O tom de voz e regras são carregados DINAMICAMENTE da tabela categories_config.
Cada categoria tem:
- clinical_tone: tom de voz específico
- criticality_percent: nível de criticidade (0-100%)
- anti_hallucination_rules: regras automáticas por categoria

CRITICIDADE DEFINE RIGOR:
- ≥35%: Validação ESTRITA (especificações obrigatórias, claims verificados)
- 20-34%: Validação MODERADA (avisos para campos faltantes)
- <20%: Validação PADRÃO (tom profissional)

-------------------------------------------------------------------------------
📌 COMO VOCÊ DEVE GERAR QUALQUER CONTEÚDO
-------------------------------------------------------------------------------
Sempre seguir esta estrutura:

1. Interpretar o contexto do produto
2. Identificar workflow_stages válidos (applicable: true)
3. Validar compatibilidade (forbidden/required)
4. Analisar regras anti-alucinação (produto + categoria)
5. Criar output SEMPRE baseado em:
   - facts do produto
   - workflow_stages
   - technical_specifications
   - document_transcriptions
   - video_captions
6. Se faltar informação:
   → "Informação insuficiente para afirmar isso."

-------------------------------------------------------------------------------
📌 FORMATO PADRÃO DE RESPOSTA
-------------------------------------------------------------------------------
O conteúdo sempre deve ser:

- Estruturado
- Clínico/comercial
- Extremamente claro
- Zero invenção
- Baseado somente nos dados enviados

-------------------------------------------------------------------------------
FIM DO MASTER SYSTEM PROMPT
-------------------------------------------------------------------------------
`;


// ============================================================================
// WORKFLOW STAGES (estrutura fixa do fluxo odontológico)
// ============================================================================

export const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  scan: 'Scanear',
  design: 'Desenhar',
  print: 'Imprimir',
  process: 'Processar',
  finish: 'Finalizar',
  install: 'Instalar'
};

export const WORKFLOW_STAGE_IDS = ['scan', 'design', 'print', 'process', 'finish', 'install'] as const;
export type WorkflowStageId = typeof WORKFLOW_STAGE_IDS[number];


// ============================================================================
// REGRAS DE COMPATIBILIDADE (CONHECIMENTO CLÍNICO HARDCODED)
// ============================================================================

export const COMPATIBILITY_RULES: Record<string, { forbidden: string[]; required: string[]; stages: WorkflowStageId[] }> = {
  'vitality': {
    forbidden: ['glazeon', '+flex'],
    required: [],
    stages: ['print', 'process', 'finish', 'install']
  },
  '+flex': {
    forbidden: ['vitality', 'resinas_rigidas'],
    required: [],
    stages: ['print', 'process', 'finish', 'install']
  },
  'smartmake': {
    forbidden: [],
    required: [],
    stages: ['finish']
  },
  'nanoclean': {
    forbidden: [],
    required: [],
    stages: ['process']
  },
  'glazeon': {
    forbidden: ['vitality'],
    required: ['+flex'],
    stages: ['finish']
  }
};


// ============================================================================
// INTERFACES DE VALIDAÇÃO
// ============================================================================

export interface AntiHallucinationRules {
  never_claim?: string[];
  never_mix_with?: string[];
  never_use_in_stages?: WorkflowStageId[];
  always_require?: string[];
  always_explain?: string[];
}

export interface ForbiddenProduct {
  product_id?: string;
  product_name: string;
  reason: string;
}

export interface RequiredProduct {
  product_id?: string;
  product_name: string;
  context: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  warnings: string[];
  criticality?: number;
}

export interface CategoryConfig {
  clinical_tone: string | null;
  criticality_percent: number;
  anti_hallucination_rules: AntiHallucinationRules | null;
}


// ============================================================================
// FALLBACK TONES (usado quando não há conexão com banco)
// ============================================================================

const FALLBACK_CATEGORY_TONES: Record<string, string> = {
  'RESINAS 3D': 'científico, resistência mecânica, biocompatibilidade, precisão dimensional',
  'SCANNERS 3D': 'precisão digital, velocidade de captura, ergonomia, fidelidade',
  'IMPRESSÃO 3D': 'repetibilidade, tolerância, calibração, produtividade',
  'SOFTWARES': 'fluxo digital, integração CAD/CAM, automação, produtividade',
  'PÓS-IMPRESSÃO': 'cura UV, polimerização completa, acabamento, limpeza',
  'CARACTERIZAÇÃO': 'estética, maquiagem gengival, naturalidade, detalhamento',
  'DENTÍSTICA, ESTÉTICA E ORTODONTIA': 'adesão, resistência, protocolo clínico, longevidade',
  'INSUMOS LABORATÓRIO': 'materiais cerâmicos, fresagem, qualidade, precisão',
  'CURSOS': 'educacional, capacitação, aprendizado prático',
  'SOLUÇÕES': 'fluxo completo, integração, produtividade, chair-side'
};

const DEFAULT_TONE = 'profissional, técnico e consultivo';

const DEFAULT_RULES: AntiHallucinationRules = {
  never_claim: [],
  never_mix_with: [],
  never_use_in_stages: [],
  always_require: [],
  always_explain: []
};


// ============================================================================
// FUNÇÃO PARA BUSCAR CONFIG DE CATEGORIA DO BANCO (v2.0)
// ============================================================================

export async function fetchCategoryConfig(productType: string | null | undefined): Promise<CategoryConfig | null> {
  if (!productType) return null;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not available for category config lookup');
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extrair categoria e subcategoria
    const parts = productType.split('>').map(p => p.trim());
    const category = parts[0] || '';
    const subcategory = parts[1] || '';
    
    // Tentar match exato primeiro (categoria + subcategoria)
    if (subcategory) {
      const { data: exactMatch, error } = await supabase
        .from('categories_config')
        .select('clinical_tone, criticality_percent, anti_hallucination_rules')
        .eq('category', category)
        .ilike('subcategory', subcategory)
        .eq('is_active', true)
        .single();
      
      if (!error && exactMatch) {
        return {
          clinical_tone: exactMatch.clinical_tone,
          criticality_percent: exactMatch.criticality_percent || 0,
          anti_hallucination_rules: exactMatch.anti_hallucination_rules as AntiHallucinationRules | null
        };
      }
    }
    
    // Fallback: buscar qualquer config da categoria
    const { data: categoryMatch, error: catError } = await supabase
      .from('categories_config')
      .select('clinical_tone, criticality_percent, anti_hallucination_rules')
      .eq('category', category)
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (!catError && categoryMatch) {
      return {
        clinical_tone: categoryMatch.clinical_tone,
        criticality_percent: categoryMatch.criticality_percent || 0,
        anti_hallucination_rules: categoryMatch.anti_hallucination_rules as AntiHallucinationRules | null
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching category config:', error);
    return null;
  }
}


// ============================================================================
// FUNÇÃO PARA OBTER TOM DE VOZ POR TIPO DE PRODUTO (v2.0 - Dinâmico)
// ============================================================================

/**
 * Retorna o tom de voz, regras e criticidade baseado no product_type
 * Busca dinamicamente do banco de dados (categories_config)
 * 
 * @param productType - Formato: "CATEGORIA" ou "CATEGORIA > SUBCATEGORIA"
 * @param categoryConfig - Config pré-carregada (opcional, para evitar nova query)
 */
export function getToneByProductType(
  productType: string | null | undefined,
  categoryConfig?: CategoryConfig | null
): { tone: string; rules: AntiHallucinationRules; criticality: number } {
  // Se config foi passada, usar diretamente
  if (categoryConfig) {
    return {
      tone: categoryConfig.clinical_tone || DEFAULT_TONE,
      rules: categoryConfig.anti_hallucination_rules || DEFAULT_RULES,
      criticality: categoryConfig.criticality_percent || 0
    };
  }
  
  // Fallback para tons hardcoded se não tiver config
  if (!productType) {
    return { tone: DEFAULT_TONE, rules: DEFAULT_RULES, criticality: 0 };
  }
  
  // Extrair categoria
  const category = productType.split('>')[0]?.trim().toUpperCase() || '';
  
  // Match em fallback tones
  for (const [key, tone] of Object.entries(FALLBACK_CATEGORY_TONES)) {
    if (key.toUpperCase() === category || category.includes(key.toUpperCase())) {
      return { tone, rules: DEFAULT_RULES, criticality: 15 }; // Criticidade padrão
    }
  }
  
  return { tone: DEFAULT_TONE, rules: DEFAULT_RULES, criticality: 0 };
}


// ============================================================================
// FUNÇÃO GLOBAL DE VALIDAÇÃO (Clinical Brain v2.0)
// ============================================================================

export function validateContext(product: any, categoryConfig?: CategoryConfig | null): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  const criticality = categoryConfig?.criticality_percent || 0;

  // Proteção: produto não fornecido
  if (!product) {
    return { valid: false, violations: ['Produto não fornecido'], warnings: [], criticality };
  }

  // ------- 1. Validar forbidden_products -------
  const forbiddenProducts: ForbiddenProduct[] = product.forbidden_products ?? [];
  
  if (forbiddenProducts.length > 0) {
    for (const f of forbiddenProducts) {
      violations.push(`Produto proibido: ${f.product_name} (Motivo: ${f.reason})`);
    }
  }

  // ------- 2. Validar regras anti-alucinação do PRODUTO -------
  const productRules: AntiHallucinationRules = product.anti_hallucination_rules ?? {};
  const workflowStages = product.workflow_stages ?? {};

  // 2.1 Verificar estágios proibidos
  if (productRules.never_use_in_stages && Array.isArray(productRules.never_use_in_stages)) {
    for (const stage of productRules.never_use_in_stages) {
      if (workflowStages[stage]?.applicable === true) {
        violations.push(`Regra violada: produto não pode ser usado no estágio '${WORKFLOW_STAGE_LABELS[stage] || stage}'.`);
      }
    }
  }

  // 2.2 Verificar claims proibidos
  if (productRules.never_claim && Array.isArray(productRules.never_claim) && productRules.never_claim.length > 0) {
    warnings.push(`Claims proibidos (produto): ${productRules.never_claim.slice(0, 3).join(', ')}...`);
  }

  // 2.3 Verificar requisitos obrigatórios
  if (productRules.always_require && Array.isArray(productRules.always_require) && productRules.always_require.length > 0) {
    warnings.push(`Requisitos obrigatórios (produto): ${productRules.always_require.join(', ')}`);
  }

  // ------- 3. Validar regras anti-alucinação da CATEGORIA -------
  const categoryRules = categoryConfig?.anti_hallucination_rules;
  
  if (categoryRules) {
    if (categoryRules.never_claim?.length) {
      warnings.push(`Claims proibidos (categoria): ${categoryRules.never_claim.slice(0, 2).join(', ')}...`);
    }
    if (categoryRules.always_require?.length) {
      warnings.push(`Requisitos da categoria: ${categoryRules.always_require.join(', ')}`);
    }
    if (categoryRules.always_explain?.length) {
      warnings.push(`Sempre explicar: ${categoryRules.always_explain.join(', ')}`);
    }
  }

  // ------- 4. Validar required_products -------
  const requiredProducts: RequiredProduct[] = product.required_products ?? [];
  
  if (requiredProducts.length > 0) {
    const allRelatedMaterials: any[] = Object.values(workflowStages)
      .flatMap((stage: any) => stage?.related_materials || []);
    
    for (const req of requiredProducts) {
      const found = allRelatedMaterials.some((material: any) => 
        material.product_id === req.product_id || 
        material.name?.toLowerCase() === req.product_name?.toLowerCase()
      );
      
      if (!found) {
        violations.push(`Produto obrigatório ausente: ${req.product_name} (Contexto: ${req.context})`);
      }
    }
  }

  // ------- 5. Validação por CRITICIDADE -------
  if (criticality >= 35) {
    // Categorias críticas: validação ESTRITA
    if (!product.technical_specifications?.length) {
      warnings.push('⚠️ CATEGORIA CRÍTICA: Especificações técnicas recomendadas');
    }
    if (!product.description || product.description.length < 100) {
      warnings.push('⚠️ CATEGORIA CRÍTICA: Descrição detalhada recomendada');
    }
  }

  // ------- 6. Validar product_type -------
  if (!product.product_type) {
    warnings.push('product_type não definido - tom de voz padrão será usado');
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    criticality
  };
}


// ============================================================================
// FUNÇÃO PARA COMBINAR O MASTER PROMPT COM PROMPT ESPECÍFICO (v2.0)
// ============================================================================

export async function buildMasterPrompt(specificPrompt: string, productContext: any): Promise<string> {
  // Buscar config da categoria do banco
  const productType = productContext?.product_type;
  const categoryConfig = await fetchCategoryConfig(productType);
  
  // Validar contexto com config de categoria
  const validation = validateContext(productContext, categoryConfig);
  
  // Obter tom baseado no tipo de produto
  const { tone, rules, criticality } = getToneByProductType(productType, categoryConfig);
  
  // Construir seção de validação
  let validationSection = '';
  
  if (validation.violations.length > 0) {
    validationSection += `
⚠️ VIOLAÇÕES DETECTADAS (NÃO PROSSEGUIR COM CONTEÚDO):
${validation.violations.map(v => `• ${v}`).join('\n')}
`;
  }
  
  if (validation.warnings.length > 0) {
    validationSection += `
📋 AVISOS DE CONTEXTO:
${validation.warnings.map(w => `• ${w}`).join('\n')}
`;
  }

  // Construir seção de regras anti-alucinação
  let rulesSection = '';
  if (rules.never_claim?.length || rules.always_require?.length || rules.always_explain?.length) {
    rulesSection = `
════════════════════════════════════════════════════════════════════════════════
📌 REGRAS ANTI-ALUCINAÇÃO DA CATEGORIA
════════════════════════════════════════════════════════════════════════════════
${rules.never_claim?.length ? `❌ NUNCA AFIRMAR:\n${rules.never_claim.map(c => `   • ${c}`).join('\n')}` : ''}
${rules.always_require?.length ? `✅ SEMPRE MENCIONAR:\n${rules.always_require.map(r => `   • ${r}`).join('\n')}` : ''}
${rules.always_explain?.length ? `📝 SEMPRE EXPLICAR:\n${rules.always_explain.map(e => `   • ${e}`).join('\n')}` : ''}
`;
  }

  return `
${MASTER_SYSTEM_PROMPT}

════════════════════════════════════════════════════════════════════════════════
📌 TOM DE VOZ RECOMENDADO (Criticidade: ${criticality}%)
════════════════════════════════════════════════════════════════════════════════
${tone}
${rulesSection}
${validationSection}
════════════════════════════════════════════════════════════════════════════════
📌 CONTEXTO DO PRODUTO
════════════════════════════════════════════════════════════════════════════════
${JSON.stringify(productContext, null, 2)}

════════════════════════════════════════════════════════════════════════════════
📌 INSTRUÇÃO ESPECÍFICA
════════════════════════════════════════════════════════════════════════════════
${specificPrompt}
  `.trim();
}


// ============================================================================
// VERSÃO SÍNCRONA (para compatibilidade com código existente)
// ============================================================================

export function buildMasterPromptSync(specificPrompt: string, productContext: any, categoryConfig?: CategoryConfig | null): string {
  // Validar contexto com config de categoria
  const validation = validateContext(productContext, categoryConfig);
  
  // Obter tom baseado no tipo de produto
  const productType = productContext?.product_type;
  const { tone, rules, criticality } = getToneByProductType(productType, categoryConfig);
  
  // Construir seção de validação
  let validationSection = '';
  
  if (validation.violations.length > 0) {
    validationSection += `
⚠️ VIOLAÇÕES DETECTADAS (NÃO PROSSEGUIR COM CONTEÚDO):
${validation.violations.map(v => `• ${v}`).join('\n')}
`;
  }
  
  if (validation.warnings.length > 0) {
    validationSection += `
📋 AVISOS DE CONTEXTO:
${validation.warnings.map(w => `• ${w}`).join('\n')}
`;
  }

  // Construir seção de regras anti-alucinação
  let rulesSection = '';
  if (rules.never_claim?.length || rules.always_require?.length || rules.always_explain?.length) {
    rulesSection = `
════════════════════════════════════════════════════════════════════════════════
📌 REGRAS ANTI-ALUCINAÇÃO DA CATEGORIA
════════════════════════════════════════════════════════════════════════════════
${rules.never_claim?.length ? `❌ NUNCA AFIRMAR:\n${rules.never_claim.map(c => `   • ${c}`).join('\n')}` : ''}
${rules.always_require?.length ? `✅ SEMPRE MENCIONAR:\n${rules.always_require.map(r => `   • ${r}`).join('\n')}` : ''}
${rules.always_explain?.length ? `📝 SEMPRE EXPLICAR:\n${rules.always_explain.map(e => `   • ${e}`).join('\n')}` : ''}
`;
  }

  return `
${MASTER_SYSTEM_PROMPT}

════════════════════════════════════════════════════════════════════════════════
📌 TOM DE VOZ RECOMENDADO (Criticidade: ${criticality}%)
════════════════════════════════════════════════════════════════════════════════
${tone}
${rulesSection}
${validationSection}
════════════════════════════════════════════════════════════════════════════════
📌 CONTEXTO DO PRODUTO
════════════════════════════════════════════════════════════════════════════════
${JSON.stringify(productContext, null, 2)}

════════════════════════════════════════════════════════════════════════════════
📌 INSTRUÇÃO ESPECÍFICA
════════════════════════════════════════════════════════════════════════════════
${specificPrompt}
  `.trim();
}


// ============================================================================
// METADADOS DO SISTEMA
// ============================================================================

export const MASTER_SYSTEM_VERSION = '2.0.0';
export const MASTER_SYSTEM_UPDATED = '2025-12-02';
