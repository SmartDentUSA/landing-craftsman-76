// ============================================================================
// CLINICAL BRAIN — TYPES
// Interfaces e tipos para o sistema Clinical Brain
// ============================================================================

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

export interface AntiHallucinationRules {
  never_claim: string[];
  never_mix_with: string[];
  never_use_in_stages: string[];
  always_require: string[];
  always_explain: string[];
}

export const DEFAULT_ANTI_HALLUCINATION_RULES: AntiHallucinationRules = {
  never_claim: [],
  never_mix_with: [],
  never_use_in_stages: [],
  always_require: [],
  always_explain: []
};

// ============================================================================
// NOTA: PRODUCT_TYPES REMOVIDO
// ============================================================================
// Os tipos de produto agora são dinâmicos, vindos do banco de dados
// via useProductCategories(). O formato é:
// - "CATEGORIA" (ex: "RESINAS 3D")
// - "CATEGORIA > SUBCATEGORIA" (ex: "RESINAS 3D > Biocompatíveis")
//
// O mapeamento de ícones está em icons-map.ts
// O mapeamento de tons de voz está em master-system-prompt.ts (getToneByProductType)
// ============================================================================
