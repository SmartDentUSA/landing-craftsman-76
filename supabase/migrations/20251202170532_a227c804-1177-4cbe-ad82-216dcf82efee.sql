-- ============================================================================
-- MIGRATION: Add Clinical Brain fields to categories_config
-- ============================================================================

-- Add new columns for Clinical Brain integration
ALTER TABLE categories_config ADD COLUMN IF NOT EXISTS clinical_tone TEXT;
ALTER TABLE categories_config ADD COLUMN IF NOT EXISTS criticality_percent INTEGER DEFAULT 0;
ALTER TABLE categories_config ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'Package';
ALTER TABLE categories_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Note: anti_hallucination_rules column already exists in categories_config if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories_config' 
    AND column_name = 'anti_hallucination_rules'
  ) THEN
    ALTER TABLE categories_config ADD COLUMN anti_hallucination_rules JSONB DEFAULT '{
      "never_claim": [],
      "never_mix_with": [],
      "always_require": [],
      "always_explain": []
    }'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- POPULATE Clinical Data for all 31 categories
-- ============================================================================

-- RESINAS 3D
UPDATE categories_config SET 
  clinical_tone = 'científico, resistência mecânica, biocompatibilidade, precisão dimensional',
  criticality_percent = 35,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["aprovação ANVISA sem certificação", "biocompatibilidade sem teste ISO"], "never_mix_with": ["resinas convencionais não certificadas", "SLA industrial não validado"], "always_require": ["lavagem IPA adequada", "cura UV completa", "compatibilidade de impressora verificada"], "always_explain": ["tempo de cura recomendado", "indicações clínicas específicas", "contraindicações conhecidas"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'BIOCOMPATÍVEIS';

UPDATE categories_config SET 
  clinical_tone = 'técnico, prototipagem rápida, custo-benefício',
  criticality_percent = 10,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["uso intraoral", "biocompatibilidade"], "never_mix_with": ["aplicações clínicas diretas"], "always_require": ["parâmetros de impressão corretos"], "always_explain": ["limitações de uso", "aplicações recomendadas"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'USO GERAL';

UPDATE categories_config SET 
  clinical_tone = 'alta resistência, durabilidade, aplicações protéticas',
  criticality_percent = 30,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["resistência infinita", "substitui todos materiais"], "never_mix_with": ["resinas de modelo"], "always_require": ["pós-processamento adequado", "glazeamento quando indicado"], "always_explain": ["propriedades mecânicas", "indicações específicas"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'ALTA RESISTÊNCIA';

UPDATE categories_config SET 
  clinical_tone = 'estética, caracterização, naturalidade',
  criticality_percent = 25,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["resistência estrutural", "uso em áreas de stress"], "never_mix_with": ["resinas de infraestrutura"], "always_require": ["técnica de estratificação", "cura adequada"], "always_explain": ["propriedades ópticas", "técnicas de aplicação"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'ESTÉTICA';

UPDATE categories_config SET 
  clinical_tone = 'precisão, detalhamento, reprodutibilidade',
  criticality_percent = 15,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["uso clínico direto"], "never_mix_with": ["aplicações intraorais"], "always_require": ["calibração de impressora"], "always_explain": ["precisão dimensional", "limitações de uso"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'MODELOS';

UPDATE categories_config SET 
  clinical_tone = 'flexibilidade, conforto, adaptação',
  criticality_percent = 20,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["rigidez estrutural"], "never_mix_with": ["aplicações rígidas"], "always_require": ["parâmetros específicos de impressão"], "always_explain": ["propriedades de flexão", "aplicações ideais"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'FLEXÍVEIS';

UPDATE categories_config SET 
  clinical_tone = 'fundição, precisão de encaixe, burn-out limpo',
  criticality_percent = 20,
  icon_name = 'Layers',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["uso direto em boca"], "never_mix_with": ["resinas definitivas"], "always_require": ["ciclo de burn-out adequado", "revestimento compatível"], "always_explain": ["temperatura de queima", "resíduo de cinzas"]}'::jsonb
WHERE category = 'RESINAS 3D' AND subcategory = 'CALCINÁVEL';

-- SCANNERS 3D
UPDATE categories_config SET 
  clinical_tone = 'precisão digital, velocidade de captura, ergonomia clínica, conforto do paciente',
  criticality_percent = 25,
  icon_name = 'ScanLine',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["precisão de 2µ sem certificação", "compatibilidade universal sem verificação"], "never_mix_with": ["scanners industriais não calibrados para uso dental"], "always_require": ["calibração periódica", "protocolo de escaneamento validado", "treinamento operador"], "always_explain": ["campo de visão", "tipo de iluminação", "software compatível", "curva de aprendizado"]}'::jsonb
WHERE category = 'SCANNERS 3D' AND subcategory = 'SCANNER INTRAOAL (IOS)';

UPDATE categories_config SET 
  clinical_tone = 'produtividade laboratorial, precisão de modelo, automação',
  criticality_percent = 15,
  icon_name = 'ScanLine',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["substitui scanner intraoral"], "never_mix_with": ["escaneamento direto em paciente"], "always_require": ["modelo bem preparado", "calibração"], "always_explain": ["resolução", "velocidade de scan", "formatos de exportação"]}'::jsonb
WHERE category = 'SCANNERS 3D' AND subcategory = 'SCANNER DE BANCADA (DSS)';

-- IMPRESSÃO 3D
UPDATE categories_config SET 
  clinical_tone = 'repetibilidade, tolerâncias dimensionais, parâmetros de impressão, produtividade',
  criticality_percent = 20,
  icon_name = 'Printer',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["precisão sem calibração", "qualquer resina funciona"], "never_mix_with": ["resinas não validadas pelo fabricante"], "always_require": ["calibração regular", "manutenção preventiva", "resinas compatíveis"], "always_explain": ["resolução XY e Z", "volume de impressão", "tecnologia de cura"]}'::jsonb
WHERE category = 'IMPRESSÃO 3D' AND subcategory = 'IMPRESSORAS';

UPDATE categories_config SET 
  clinical_tone = 'consumíveis, manutenção, qualidade de impressão',
  criticality_percent = 10,
  icon_name = 'Printer',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["funciona em qualquer impressora"], "never_mix_with": ["peças não originais sem validação"], "always_require": ["compatibilidade verificada"], "always_explain": ["frequência de troca", "impacto na qualidade"]}'::jsonb
WHERE category = 'IMPRESSÃO 3D' AND subcategory = 'ACESSÓRIOS';

-- PÓS-IMPRESSÃO
UPDATE categories_config SET 
  clinical_tone = 'polimerização completa, normativas, segurança, propriedades finais',
  criticality_percent = 30,
  icon_name = 'Sun',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["cura completa sem equipamento adequado"], "never_mix_with": ["métodos de cura não validados"], "always_require": ["tempo de cura correto", "comprimento de onda adequado", "temperatura controlada"], "always_explain": ["protocolos por tipo de resina", "verificação de cura", "segurança UV"]}'::jsonb
WHERE category = 'PÓS-IMPRESSÃO' AND subcategory = 'EQUIPAMENTOS CURA';

UPDATE categories_config SET 
  clinical_tone = 'limpeza eficiente, remoção de resina, preparação para cura',
  criticality_percent = 20,
  icon_name = 'Sun',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["qualquer solvente funciona"], "never_mix_with": ["solventes não recomendados"], "always_require": ["IPA ou solvente validado", "tempo de lavagem adequado"], "always_explain": ["concentração de IPA", "frequência de troca", "descarte correto"]}'::jsonb
WHERE category = 'PÓS-IMPRESSÃO' AND subcategory = 'EQUIPAMENTOS LAVAGEM';

UPDATE categories_config SET 
  clinical_tone = 'consumíveis de pós-processamento, qualidade final',
  criticality_percent = 15,
  icon_name = 'Sun',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["substitutos genéricos equivalentes"], "never_mix_with": ["produtos não testados"], "always_require": ["especificações do fabricante"], "always_explain": ["uso correto", "armazenamento"]}'::jsonb
WHERE category = 'PÓS-IMPRESSÃO' AND subcategory = 'INSUMOS';

-- CARACTERIZAÇÃO
UPDATE categories_config SET 
  clinical_tone = 'estética avançada, personalização, naturalidade, arte dental',
  criticality_percent = 20,
  icon_name = 'Palette',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["qualquer técnica funciona"], "never_mix_with": ["materiais incompatíveis"], "always_require": ["compatibilidade com substrato", "técnica adequada"], "always_explain": ["sistema de cores", "técnicas de aplicação", "fotopolimerização"]}'::jsonb
WHERE category = 'CARACTERIZAÇÃO' AND subcategory = 'PIGMENTOS';

UPDATE categories_config SET 
  clinical_tone = 'brilho, proteção, acabamento profissional',
  criticality_percent = 15,
  icon_name = 'Palette',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["proteção permanente"], "never_mix_with": ["glazes incompatíveis"], "always_require": ["preparo de superfície", "aplicação correta"], "always_explain": ["tipos de glaze", "técnica de aplicação", "cura"]}'::jsonb
WHERE category = 'CARACTERIZAÇÃO' AND subcategory = 'GLAZES';

-- SOFTWARES
UPDATE categories_config SET 
  clinical_tone = 'fluxo digital, automação, inteligência artificial, produtividade',
  criticality_percent = 15,
  icon_name = 'Monitor',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["substitui conhecimento técnico", "100% automático sem revisão"], "never_mix_with": ["workflows não validados"], "always_require": ["treinamento adequado", "hardware compatível"], "always_explain": ["curva de aprendizado", "requisitos de sistema", "atualizações"]}'::jsonb
WHERE category = 'SOFTWARES' AND subcategory = 'CAD/CAM';

UPDATE categories_config SET 
  clinical_tone = 'planejamento, previsibilidade, comunicação com paciente',
  criticality_percent = 20,
  icon_name = 'Monitor',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["resultado garantido igual ao planejamento"], "never_mix_with": ["execução sem validação clínica"], "always_require": ["dados precisos de entrada", "validação do plano"], "always_explain": ["limitações do planejamento", "fatores clínicos"]}'::jsonb
WHERE category = 'SOFTWARES' AND subcategory = 'PLANEJAMENTO';

-- DENTÍSTICA, ESTÉTICA E ORTODONTIA
UPDATE categories_config SET 
  clinical_tone = 'clínico, evidência científica, técnica operatória',
  criticality_percent = 35,
  icon_name = 'FlaskConical',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["resultados sem técnica adequada"], "never_mix_with": ["protocolos não validados"], "always_require": ["indicação correta", "técnica adequada"], "always_explain": ["evidência científica", "limitações", "contraindicações"]}'::jsonb
WHERE category = 'DENTÍSTICA, ESTÉTICA E ORTODONTIA' AND subcategory = 'MATERIAIS RESTAURADORES';

UPDATE categories_config SET 
  clinical_tone = 'biomecânica, movimentação dentária, planejamento ortodôntico',
  criticality_percent = 30,
  icon_name = 'FlaskConical',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["movimento sem controle", "tempo de tratamento fixo"], "never_mix_with": ["protocolos não ortodônticos"], "always_require": ["diagnóstico adequado", "planejamento"], "always_explain": ["biomecânica", "limitações", "tempo estimado"]}'::jsonb
WHERE category = 'DENTÍSTICA, ESTÉTICA E ORTODONTIA' AND subcategory = 'ORTODONTIA';

-- INSUMOS LABORATÓRIO
UPDATE categories_config SET 
  clinical_tone = 'qualidade laboratorial, consistência, produtividade técnica',
  criticality_percent = 15,
  icon_name = 'Wrench',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["qualquer insumo serve"], "never_mix_with": ["produtos de baixa qualidade"], "always_require": ["especificações técnicas", "armazenamento correto"], "always_explain": ["uso adequado", "validade", "conservação"]}'::jsonb
WHERE category = 'INSUMOS LABORATÓRIO' AND subcategory = 'CONSUMÍVEIS';

UPDATE categories_config SET 
  clinical_tone = 'precisão laboratorial, durabilidade, ergonomia',
  criticality_percent = 10,
  icon_name = 'Wrench',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["ferramenta universal"], "never_mix_with": ["uso inadequado"], "always_require": ["manutenção", "uso correto"], "always_explain": ["aplicação específica", "cuidados"]}'::jsonb
WHERE category = 'INSUMOS LABORATÓRIO' AND subcategory = 'FERRAMENTAS';

-- CURSOS
UPDATE categories_config SET 
  clinical_tone = 'educacional, didático, hands-on, aprendizado prático',
  criticality_percent = 5,
  icon_name = 'GraduationCap',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["domínio instantâneo", "certificação sem prática"], "never_mix_with": ["promessas irreais"], "always_require": ["pré-requisitos quando aplicável"], "always_explain": ["carga horária", "conteúdo programático", "certificação"]}'::jsonb
WHERE category = 'CURSOS' AND subcategory = 'PRESENCIAIS';

UPDATE categories_config SET 
  clinical_tone = 'educacional, flexibilidade, acesso remoto',
  criticality_percent = 5,
  icon_name = 'GraduationCap',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["equivale a hands-on"], "never_mix_with": ["promessas de prática remota"], "always_require": ["conexão estável", "dedicação"], "always_explain": ["formato", "suporte", "certificação"]}'::jsonb
WHERE category = 'CURSOS' AND subcategory = 'ONLINE';

UPDATE categories_config SET 
  clinical_tone = 'educacional, imersão, networking profissional',
  criticality_percent = 5,
  icon_name = 'GraduationCap',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["conhecimento instantâneo"], "never_mix_with": ["promessas irreais"], "always_require": ["inscrição antecipada"], "always_explain": ["programação", "palestrantes", "local"]}'::jsonb
WHERE category = 'CURSOS' AND subcategory = 'WORKSHOPS E EVENTOS';

-- SOLUÇÕES
UPDATE categories_config SET 
  clinical_tone = 'workflow completo, produtividade clínica, integração chair-side, mesma sessão',
  criticality_percent = 40,
  icon_name = 'Lightbulb',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["qualquer caso em uma sessão", "sem curva de aprendizado"], "never_mix_with": ["equipamentos não integrados", "materiais não validados"], "always_require": ["workflow completo validado", "treinamento certificado", "suporte técnico"], "always_explain": ["casos indicados", "tempo real por procedimento", "investimento necessário", "ROI esperado"]}'::jsonb
WHERE category = 'SOLUÇÕES' AND subcategory = 'CHAIR SIDE PRINT';

UPDATE categories_config SET 
  clinical_tone = 'integração laboratorial, produtividade, escala de produção',
  criticality_percent = 35,
  icon_name = 'Lightbulb',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["automação total sem supervisão"], "never_mix_with": ["workflows não integrados"], "always_require": ["planejamento de implementação", "treinamento de equipe"], "always_explain": ["capacidade de produção", "integração com sistemas existentes", "suporte"]}'::jsonb
WHERE category = 'SOLUÇÕES' AND subcategory = 'SMART LAB';

UPDATE categories_config SET 
  clinical_tone = 'workflow ortodôntico digital, alinhadores, planejamento',
  criticality_percent = 35,
  icon_name = 'Lightbulb',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["tratamento automático", "sem supervisão profissional"], "never_mix_with": ["protocolos não ortodônticos"], "always_require": ["diagnóstico ortodôntico", "planejamento caso a caso"], "always_explain": ["indicações", "limitações", "acompanhamento necessário"]}'::jsonb
WHERE category = 'SOLUÇÕES' AND subcategory = 'SMART ALIGNER';

UPDATE categories_config SET 
  clinical_tone = 'guias cirúrgicos, precisão implantodôntica, segurança',
  criticality_percent = 45,
  icon_name = 'Lightbulb',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": ["cirurgia sem planejamento", "precisão absoluta"], "never_mix_with": ["protocolos não validados"], "always_require": ["tomografia adequada", "planejamento virtual", "validação do guia"], "always_explain": ["margem de segurança", "protocolo cirúrgico", "verificação pré-operatória"]}'::jsonb
WHERE category = 'SOLUÇÕES' AND subcategory = 'SMART GUIDE';

-- Update any remaining categories without clinical data
UPDATE categories_config SET 
  clinical_tone = 'profissional, técnico, consultivo',
  criticality_percent = 10,
  icon_name = 'Package',
  is_active = true,
  anti_hallucination_rules = '{"never_claim": [], "never_mix_with": [], "always_require": [], "always_explain": []}'::jsonb
WHERE clinical_tone IS NULL;