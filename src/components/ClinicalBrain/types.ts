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

export const PRODUCT_TYPES = [
  { value: 'resina_rigida', label: 'Resina Rígida', icon: 'Layers' },
  { value: 'resina_flexivel', label: 'Resina Flexível', icon: 'Waves' },
  { value: 'scanner', label: 'Scanner Intraoral', icon: 'ScanLine' },
  { value: 'impressora', label: 'Impressora 3D', icon: 'Printer' },
  { value: 'software', label: 'Software CAD/CAM', icon: 'Monitor' },
  { value: 'acessorio', label: 'Acessório', icon: 'Wrench' },
  { value: 'cimento', label: 'Cimento Odontológico', icon: 'FlaskConical' },
  { value: 'cabine_uv', label: 'Cabine UV', icon: 'Sun' }
] as const;

export type ProductType = typeof PRODUCT_TYPES[number]['value'];
