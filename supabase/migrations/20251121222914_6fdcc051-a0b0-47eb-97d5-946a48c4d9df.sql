-- FASE 4.3: Migração Retroativa de Metadados para Soluções SPIN
-- Popula metadados nas soluções antigas que não possuem artifact_chain

CREATE OR REPLACE FUNCTION backfill_spin_metadata()
RETURNS void AS $$
DECLARE
  solution RECORD;
  calculated_metadata jsonb;
  data_quality_score integer;
  confidence_score integer;
  fields_present integer;
BEGIN
  FOR solution IN 
    SELECT * FROM spin_selling_solutions 
    WHERE metadata = '{"artifact_chain":{},"generation_history":[],"quality_metrics":{}}'::jsonb
       OR metadata IS NULL
       OR metadata->>'artifact_chain' IS NULL
       OR (metadata->'artifact_chain'->>'pitch_version') IS NULL
  LOOP
    -- Calcular data_quality_score baseado em campos presentes
    data_quality_score := 0;
    
    IF solution.sales_pitch IS NOT NULL AND length(solution.sales_pitch) > 100 THEN
      data_quality_score := data_quality_score + 30;
    END IF;
    
    IF solution.faq IS NOT NULL AND jsonb_array_length(solution.faq) > 0 THEN
      data_quality_score := data_quality_score + 20;
    END IF;
    
    IF solution.success_cases IS NOT NULL AND jsonb_array_length(solution.success_cases) > 0 THEN
      data_quality_score := data_quality_score + 20;
    END IF;
    
    IF solution.pain_metrics IS NOT NULL THEN
      data_quality_score := data_quality_score + 15;
    END IF;
    
    IF solution.spin_journey IS NOT NULL THEN
      data_quality_score := data_quality_score + 15;
    END IF;
    
    -- Calcular confidence_score baseado em completude
    fields_present := 0;
    IF solution.sales_pitch IS NOT NULL THEN fields_present := fields_present + 1; END IF;
    IF solution.faq IS NOT NULL AND jsonb_array_length(solution.faq) > 0 THEN fields_present := fields_present + 1; END IF;
    IF solution.success_cases IS NOT NULL AND jsonb_array_length(solution.success_cases) > 0 THEN fields_present := fields_present + 1; END IF;
    IF solution.pain_metrics IS NOT NULL THEN fields_present := fields_present + 1; END IF;
    IF solution.spin_journey IS NOT NULL THEN fields_present := fields_present + 1; END IF;
    
    confidence_score := ROUND((fields_present::numeric / 5) * 100);
    
    -- Criar metadata retroativo
    calculated_metadata := jsonb_build_object(
      'artifact_chain', jsonb_build_object(
        'pitch_version', '1.0.0-migrated',
        'generated_by', 'backfill-migration',
        'timestamp', COALESCE(solution.updated_at, solution.created_at),
        'model_used', 'legacy/pre-fase4',
        'data_quality_score', data_quality_score,
        'pain_type', solution.pain_type
      ),
      'quality_metrics', jsonb_build_object(
        'data_quality_score', data_quality_score,
        'confidence_score', confidence_score,
        'validation_score', 0,
        'is_migrated', true
      ),
      'generation_history', jsonb_build_array(
        jsonb_build_object(
          'version', '1.0.0-migrated',
          'generated_at', COALESCE(solution.created_at, now()),
          'data_quality', data_quality_score,
          'note', 'Metadados populados retroativamente via migração automática'
        )
      )
    );
    
    UPDATE spin_selling_solutions
    SET metadata = calculated_metadata
    WHERE id = solution.id;
    
    RAISE NOTICE 'Solução % ("%") migrada com data_quality=% confidence=%', 
      solution.id, solution.title, data_quality_score, confidence_score;
  END LOOP;
  
  RAISE NOTICE 'Migração retroativa de metadados concluída!';
END;
$$ LANGUAGE plpgsql;

-- Executar a função de migração
SELECT backfill_spin_metadata();

-- Limpar a função (opcional, mas mantém o banco limpo)
DROP FUNCTION IF EXISTS backfill_spin_metadata();