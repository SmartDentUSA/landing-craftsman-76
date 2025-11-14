-- Add workflow_stages field to products_repository
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS workflow_stages jsonb DEFAULT '{
  "scan": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  },
  "design": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  },
  "print": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  },
  "process": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  },
  "finish": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  },
  "install": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  }
}'::jsonb;

-- Create GIN index for semantic search on workflow_stages
CREATE INDEX IF NOT EXISTS idx_workflow_stages_gin ON products_repository USING GIN (workflow_stages);

-- Update Bio Vitality product as example (if exists)
UPDATE products_repository
SET workflow_stages = '{
  "scan": {
    "applicable": false,
    "role": null,
    "description": null,
    "pain_points_addressed": [],
    "competitive_advantages": [],
    "related_materials": []
  },
  "design": {
    "applicable": true,
    "role": "principal",
    "description": "Utilizado no planejamento de restaurações estéticas em CAD, permitindo visualização precisa da anatomia final",
    "pain_points_addressed": ["Previsibilidade de resultado", "Tempo de planejamento"],
    "competitive_advantages": ["Alta translucidez", "Gradiente de cor natural"],
    "related_materials": []
  },
  "print": {
    "applicable": true,
    "role": "principal",
    "description": "Resina específica para impressão 3D de restaurações definitivas com alta precisão",
    "pain_points_addressed": ["Qualidade de impressão", "Resistência mecânica", "Biocompatibilidade"],
    "competitive_advantages": ["147 MPa resistência flexural", "ISO 10993 completa", "Baixa contração"],
    "related_materials": []
  },
  "process": {
    "applicable": true,
    "role": "consumivel",
    "description": "Requer pós-processamento com lavagem em IPA e polimerização final",
    "pain_points_addressed": ["Tempo de processamento", "Qualidade superficial"],
    "competitive_advantages": ["Protocolo simplificado", "Cura rápida"],
    "related_materials": []
  },
  "finish": {
    "applicable": true,
    "role": "principal",
    "description": "Acabamento e polimento para obter superfície lisa e estética similar ao dente natural",
    "pain_points_addressed": ["Estética final", "Brilho superficial"],
    "competitive_advantages": ["Alta polibilidade", "Estabilidade de cor"],
    "related_materials": []
  },
  "install": {
    "applicable": true,
    "role": "principal",
    "description": "Cimentação com protocolo adesivo convencional, compatível com sistemas universais",
    "pain_points_addressed": ["Adesão ao substrato", "Longevidade clínica"],
    "competitive_advantages": ["Compatibilidade química", "Retenção superior"],
    "related_materials": []
  }
}'::jsonb
WHERE name ILIKE '%Bio Vitality%';

COMMENT ON COLUMN products_repository.workflow_stages IS 'Estágios do workflow odontológico digital onde o produto é aplicável: SCAN > DESIGN > PRINT > PROCESS > FINISH > INSTALL';