-- Função para calcular score de produtos (120 pontos totais)
CREATE OR REPLACE FUNCTION public.calculate_product_score(product_id UUID)
RETURNS JSONB AS $$
DECLARE
  prod RECORD;
  score_basic INTEGER := 0;
  score_seo INTEGER := 0;
  score_keywords INTEGER := 0;
  score_images INTEGER := 0;
  score_specs INTEGER := 0;
  score_ai INTEGER := 0;
  score_videos INTEGER := 0;
  score_ctas INTEGER := 0;
  score_merchant INTEGER := 0;
  missing TEXT[] := '{}';
  required TEXT[] := '{}';
  total_score INTEGER;
  percentage INTEGER;
BEGIN
  SELECT * FROM products_repository WHERE id = product_id INTO prod;
  
  IF prod IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado', product_id;
  END IF;
  
  -- 📋 DADOS BÁSICOS (15 pts)
  IF prod.name IS NOT NULL AND LENGTH(TRIM(prod.name)) > 0 THEN
    score_basic := score_basic + 5;
  ELSE
    missing := array_append(missing, 'Nome do Produto');
    required := array_append(required, 'name');
  END IF;
  
  IF prod.description IS NOT NULL AND LENGTH(TRIM(prod.description)) >= 50 THEN
    score_basic := score_basic + 5;
  ELSE
    missing := array_append(missing, 'Descrição (min 50 chars)');
  END IF;
  
  IF prod.price IS NOT NULL AND prod.price > 0 THEN
    score_basic := score_basic + 3;
  ELSE
    missing := array_append(missing, 'Preço');
    required := array_append(required, 'price');
  END IF;
  
  IF prod.promo_price IS NOT NULL THEN
    score_basic := score_basic + 2;
  END IF;
  
  -- 🎯 SEO & CATEGORIZAÇÃO (20 pts)
  IF prod.category IS NOT NULL THEN
    score_seo := score_seo + 5;
  ELSE
    missing := array_append(missing, 'Categoria');
    required := array_append(required, 'category');
  END IF;
  
  IF prod.subcategory IS NOT NULL THEN
    score_seo := score_seo + 3;
  END IF;
  
  IF prod.seo_title_override IS NOT NULL THEN
    score_seo := score_seo + 4;
  END IF;
  
  IF prod.seo_description_override IS NOT NULL THEN
    score_seo := score_seo + 4;
  END IF;
  
  IF prod.slug IS NOT NULL THEN
    score_seo := score_seo + 2;
  END IF;
  
  IF prod.canonical_url IS NOT NULL THEN
    score_seo := score_seo + 2;
  END IF;
  
  -- 🔑 KEYWORDS & PÚBLICO (15 pts)
  IF jsonb_array_length(COALESCE(prod.keywords, '[]'::jsonb)) >= 3 THEN
    score_keywords := score_keywords + 5;
  ELSIF jsonb_array_length(COALESCE(prod.keywords, '[]'::jsonb)) > 0 THEN
    score_keywords := score_keywords + 2;
    missing := array_append(missing, 'Keywords (mínimo 3)');
  ELSE
    missing := array_append(missing, 'Keywords');
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.target_audience, '[]'::jsonb)) > 0 THEN
    score_keywords := score_keywords + 3;
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.search_intent_keywords, '[]'::jsonb)) > 0 THEN
    score_keywords := score_keywords + 3;
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.market_keywords, '[]'::jsonb)) > 0 THEN
    score_keywords := score_keywords + 4;
  END IF;
  
  -- 📷 IMAGENS & GALERIA (15 pts)
  IF prod.image_url IS NOT NULL THEN
    score_images := score_images + 5;
  ELSE
    missing := array_append(missing, 'Imagem Principal');
    required := array_append(required, 'image_url');
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.images_gallery, '[]'::jsonb)) >= 3 THEN
    score_images := score_images + 10;
  ELSIF jsonb_array_length(COALESCE(prod.images_gallery, '[]'::jsonb)) > 0 THEN
    score_images := score_images + 5;
    missing := array_append(missing, 'Galeria (mínimo 3 imagens)');
  ELSE
    missing := array_append(missing, 'Galeria de Imagens');
  END IF;
  
  -- 🔧 ESPECIFICAÇÕES TÉCNICAS (15 pts)
  IF jsonb_array_length(COALESCE(prod.technical_specifications, '[]'::jsonb)) >= 5 THEN
    score_specs := score_specs + 10;
  ELSIF jsonb_array_length(COALESCE(prod.technical_specifications, '[]'::jsonb)) > 0 THEN
    score_specs := score_specs + 5;
    missing := array_append(missing, 'Especificações Técnicas (mínimo 5)');
  ELSE
    missing := array_append(missing, 'Especificações Técnicas');
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.faq, '[]'::jsonb)) >= 3 THEN
    score_specs := score_specs + 5;
  ELSIF jsonb_array_length(COALESCE(prod.faq, '[]'::jsonb)) > 0 THEN
    score_specs := score_specs + 2;
    missing := array_append(missing, 'FAQ (mínimo 3)');
  ELSE
    missing := array_append(missing, 'FAQ do Produto');
  END IF;
  
  -- 🤖 CONTEÚDO AI (20 pts)
  IF jsonb_array_length(COALESCE(prod.benefits, '[]'::jsonb)) >= 3 THEN
    score_ai := score_ai + 7;
  ELSIF jsonb_array_length(COALESCE(prod.benefits, '[]'::jsonb)) > 0 THEN
    score_ai := score_ai + 3;
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.features, '[]'::jsonb)) >= 3 THEN
    score_ai := score_ai + 7;
  ELSIF jsonb_array_length(COALESCE(prod.features, '[]'::jsonb)) > 0 THEN
    score_ai := score_ai + 3;
  END IF;
  
  IF prod.ai_generated_keywords = TRUE THEN
    score_ai := score_ai + 3;
  END IF;
  
  IF prod.ai_generated_category = TRUE THEN
    score_ai := score_ai + 3;
  END IF;
  
  -- 🎥 VÍDEOS (15 pts)
  IF jsonb_array_length(COALESCE(prod.youtube_videos, '[]'::jsonb)) > 0 THEN
    score_videos := score_videos + 4;
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.instagram_videos, '[]'::jsonb)) > 0 THEN
    score_videos := score_videos + 3;
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.technical_videos, '[]'::jsonb)) > 0 THEN
    score_videos := score_videos + 4;
  END IF;
  
  IF jsonb_array_length(COALESCE(prod.testimonial_videos, '[]'::jsonb)) > 0 THEN
    score_videos := score_videos + 4;
  END IF;
  
  -- 🎯 CTAs & RECURSOS (10 pts)
  IF prod.product_url IS NOT NULL THEN
    score_ctas := score_ctas + 4;
  ELSE
    missing := array_append(missing, 'URL do Produto');
  END IF;
  
  IF prod.resource_cta1->>'visible' = 'true' THEN
    score_ctas := score_ctas + 2;
  END IF;
  
  IF prod.resource_cta2->>'visible' = 'true' THEN
    score_ctas := score_ctas + 2;
  END IF;
  
  IF prod.resource_cta3->>'visible' = 'true' THEN
    score_ctas := score_ctas + 2;
  END IF;
  
  -- 🛒 GOOGLE MERCHANT (10 pts)
  IF prod.gtin IS NOT NULL THEN
    score_merchant := score_merchant + 3;
  END IF;
  
  IF prod.mpn IS NOT NULL THEN
    score_merchant := score_merchant + 2;
  END IF;
  
  IF prod.brand IS NOT NULL THEN
    score_merchant := score_merchant + 2;
  END IF;
  
  IF prod.google_product_category IS NOT NULL THEN
    score_merchant := score_merchant + 3;
  END IF;
  
  total_score := score_basic + score_seo + score_keywords + score_images + 
                 score_specs + score_ai + score_videos + score_ctas + score_merchant;
  
  percentage := ROUND((total_score::NUMERIC / 120) * 100);
  
  RETURN jsonb_build_object(
    'total_score', total_score,
    'max_score', 120,
    'percentage', percentage,
    'details', jsonb_build_object(
      'basic_info', jsonb_build_object('score', score_basic, 'max', 15),
      'seo_categories', jsonb_build_object('score', score_seo, 'max', 20),
      'keywords_audience', jsonb_build_object('score', score_keywords, 'max', 15),
      'images_gallery', jsonb_build_object('score', score_images, 'max', 15),
      'technical_specs', jsonb_build_object('score', score_specs, 'max', 15),
      'ai_content', jsonb_build_object('score', score_ai, 'max', 20),
      'videos', jsonb_build_object('score', score_videos, 'max', 15),
      'ctas_resources', jsonb_build_object('score', score_ctas, 'max', 10),
      'google_merchant', jsonb_build_object('score', score_merchant, 'max', 10)
    ),
    'missing_fields', to_jsonb(missing),
    'required_fields', to_jsonb(required)
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular score quando produto é atualizado
CREATE OR REPLACE FUNCTION public.update_product_completion_score()
RETURNS TRIGGER AS $$
DECLARE
  score_data JSONB;
  total_percentage INTEGER;
  status_value TEXT;
BEGIN
  score_data := calculate_product_score(NEW.id);
  total_percentage := (score_data->>'percentage')::INTEGER;
  
  IF total_percentage >= 90 THEN
    status_value := 'complete';
  ELSIF total_percentage >= 70 THEN
    status_value := 'good';
  ELSIF total_percentage >= 50 THEN
    status_value := 'regular';
  ELSE
    status_value := 'critical';
  END IF;
  
  INSERT INTO content_completion_tracking (
    entity_type,
    entity_id,
    completion_score,
    completion_status,
    score_details,
    missing_fields,
    required_fields,
    last_calculated_at
  ) VALUES (
    'product',
    NEW.id::TEXT,
    total_percentage,
    status_value,
    score_data->'details',
    ARRAY(SELECT jsonb_array_elements_text(score_data->'missing_fields')),
    ARRAY(SELECT jsonb_array_elements_text(score_data->'required_fields')),
    NOW()
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    completion_score = EXCLUDED.completion_score,
    completion_status = EXCLUDED.completion_status,
    score_details = EXCLUDED.score_details,
    missing_fields = EXCLUDED.missing_fields,
    required_fields = EXCLUDED.required_fields,
    last_calculated_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_product_completion ON products_repository;
CREATE TRIGGER trigger_update_product_completion
AFTER INSERT OR UPDATE ON products_repository
FOR EACH ROW
EXECUTE FUNCTION update_product_completion_score();