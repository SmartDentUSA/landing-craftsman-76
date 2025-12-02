// ============================================================================
// SMART DENT — CLINICAL AI BRAIN v1.1
// MASTER SYSTEM PROMPT — Núcleo de Inteligência Global
// Arquivo: supabase/functions/_shared/master-system-prompt.ts
// ============================================================================

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
📌 TIPAGEM DE PRODUTO (product_type) - CATEGORIAS DINÂMICAS
-------------------------------------------------------------------------------
O campo product_type usa categorias reais do banco de dados no formato:
- "CATEGORIA" (ex: "RESINAS 3D")
- "CATEGORIA > SUBCATEGORIA" (ex: "RESINAS 3D > Biocompatíveis")

Ajustar automaticamente o tom baseado na categoria:

RESINAS 3D           → científico, mecânico, biocompatibilidade, precisão dimensional
SCANNERS 3D          → precisão digital, velocidade de captura, ergonomia, fidelidade
IMPRESSÃO 3D         → repetibilidade, tolerância, calibração, produtividade
SOFTWARES            → fluxo digital, integração CAD/CAM, automação, produtividade
PÓS-IMPRESSÃO        → cura UV, polimerização completa, acabamento, limpeza
CARACTERIZAÇÃO       → estética, maquiagem gengival, naturalidade, detalhamento
DENTÍSTICA...        → adesão, resistência, protocolo clínico, longevidade
INSUMOS LABORATÓRIO  → materiais cerâmicos, fresagem, qualidade, precisão
CURSOS               → educacional, capacitação, aprendizado prático
SOLUÇÕES             → fluxo completo, integração, produtividade, chair-side

-------------------------------------------------------------------------------
📌 COMO VOCÊ DEVE GERAR QUALQUER CONTEÚDO
-------------------------------------------------------------------------------
Sempre seguir esta estrutura:

1. Interpretar o contexto do produto
2. Identificar workflow_stages válidos (applicable: true)
3. Validar compatibilidade (forbidden/required)
4. Analisar regras anti-alucinação
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
}


// ============================================================================
// FUNÇÃO GLOBAL DE VALIDAÇÃO (Clinical Brain v1.1)
// ============================================================================

export function validateContext(product: any): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Proteção: produto não fornecido
  if (!product) {
    return { valid: false, violations: ['Produto não fornecido'], warnings: [] };
  }

  // ------- 1. Validar forbidden_products -------
  const forbiddenProducts: ForbiddenProduct[] = product.forbidden_products ?? [];
  
  if (forbiddenProducts.length > 0) {
    for (const f of forbiddenProducts) {
      violations.push(`Produto proibido: ${f.product_name} (Motivo: ${f.reason})`);
    }
  }

  // ------- 2. Validar regras anti-alucinação -------
  const rules: AntiHallucinationRules = product.anti_hallucination_rules ?? {};
  const workflowStages = product.workflow_stages ?? {};

  // 2.1 Verificar estágios proibidos
  if (rules.never_use_in_stages && Array.isArray(rules.never_use_in_stages)) {
    for (const stage of rules.never_use_in_stages) {
      if (workflowStages[stage]?.applicable === true) {
        violations.push(`Regra violada: produto não pode ser usado no estágio '${WORKFLOW_STAGE_LABELS[stage] || stage}'.`);
      }
    }
  }

  // 2.2 Verificar claims proibidos (warning apenas, para log)
  if (rules.never_claim && Array.isArray(rules.never_claim) && rules.never_claim.length > 0) {
    warnings.push(`Claims proibidos configurados: ${rules.never_claim.slice(0, 3).join(', ')}...`);
  }

  // 2.3 Verificar requisitos obrigatórios
  if (rules.always_require && Array.isArray(rules.always_require) && rules.always_require.length > 0) {
    warnings.push(`Requisitos obrigatórios: ${rules.always_require.join(', ')}`);
  }

  // ------- 3. Validar required_products -------
  const requiredProducts: RequiredProduct[] = product.required_products ?? [];
  
  if (requiredProducts.length > 0) {
    // Coletar todos os related_materials de todos os estágios do workflow
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

  // ------- 4. Validar product_type (warning se não definido) -------
  if (!product.product_type) {
    warnings.push('product_type não definido - tom de voz padrão será usado');
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings
  };
}


// ============================================================================
// MAPEAMENTO DE TONS POR CATEGORIA (categorias reais do banco)
// ============================================================================

const CATEGORY_TONE_MAP: Record<string, string> = {
  'RESINAS 3D': 'científico, mecânico, biocompatibilidade, precisão dimensional',
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

// Mapeamento de subcategorias para tons mais específicos
const SUBCATEGORY_TONE_MAP: Record<string, string> = {
  // RESINAS 3D
  'Biocompatíveis': 'biocompatibilidade classe IIa, resistência mecânica, certificações',
  'Uso Geral': 'versatilidade, custo-benefício, aplicações múltiplas',
  
  // SCANNERS 3D
  'IOS': 'scanner intraoral, captura in-vivo, velocidade clínica, conforto do paciente',
  'DSS': 'scanner de bancada, precisão laboratorial, digitalização de modelos',
  'Acessórios': 'complementos, ponteiras, calibração, manutenção',
  
  // IMPRESSÃO 3D
  'Impressoras Odontológicas': 'precisão dimensional, repetibilidade, resolução XY',
  
  // SOFTWARES
  'DentalCAD': 'desenho CAD, bibliotecas, anatomia, automação',
  'EXOPLAN': 'planejamento cirúrgico, guias, implantes',
  
  // PÓS-IMPRESSÃO
  'Cabines': 'cura UV, polimerização uniforme, segurança',
  'Acabamento': 'polimento, limpeza, remoção de suportes',
  
  // DENTÍSTICA
  'Cimentos': 'adesão, resistência, protocolo clínico',
  'Adesivos': 'união, força adesiva, técnica',
  
  // CURSOS
  'EAD': 'online, flexibilidade, autogestão',
  'Presenciais': 'hands-on, prática supervisionada, networking'
};

const DEFAULT_TONE = 'profissional, técnico e consultivo';


// ============================================================================
// FUNÇÃO PARA OBTER TOM DE VOZ POR TIPO DE PRODUTO (v1.1 - Categorias Dinâmicas)
// ============================================================================

/**
 * Retorna o tom de voz recomendado baseado no product_type
 * Aceita formatos:
 * - "CATEGORIA" (ex: "RESINAS 3D")
 * - "CATEGORIA > SUBCATEGORIA" (ex: "RESINAS 3D > Biocompatíveis")
 * 
 * Prioriza subcategoria se disponível, depois categoria, depois default
 */
export function getToneByProductType(productType: string | null | undefined): string {
  if (!productType) return DEFAULT_TONE;
  
  // Extrair categoria e subcategoria
  const parts = productType.split('>').map(p => p.trim());
  const category = parts[0]?.toUpperCase() || '';
  const subcategory = parts[1] || null;
  
  // 1. Tentar match exato de subcategoria (mais específico)
  if (subcategory && SUBCATEGORY_TONE_MAP[subcategory]) {
    return SUBCATEGORY_TONE_MAP[subcategory];
  }
  
  // 2. Tentar match de categoria
  // Match case-insensitive
  for (const [key, tone] of Object.entries(CATEGORY_TONE_MAP)) {
    if (key.toUpperCase() === category) {
      return tone;
    }
  }
  
  // 3. Match parcial (para variações de nome)
  for (const [key, tone] of Object.entries(CATEGORY_TONE_MAP)) {
    if (category.includes(key.toUpperCase()) || key.toUpperCase().includes(category)) {
      return tone;
    }
  }
  
  return DEFAULT_TONE;
}


// ============================================================================
// FUNÇÃO PARA COMBINAR O MASTER PROMPT COM PROMPT ESPECÍFICO
// ============================================================================

export function buildMasterPrompt(specificPrompt: string, productContext: any): string {
  // Validar contexto antes de construir
  const validation = validateContext(productContext);
  
  // Obter tom baseado no tipo de produto
  const productType = productContext?.product_type;
  const tone = getToneByProductType(productType);
  
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

  return `
${MASTER_SYSTEM_PROMPT}

════════════════════════════════════════════════════════════════════════════════
📌 TOM DE VOZ RECOMENDADO
════════════════════════════════════════════════════════════════════════════════
${tone}

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

export const MASTER_SYSTEM_VERSION = '1.1.0';
export const MASTER_SYSTEM_UPDATED = '2025-12-02';
