-- Criar função SQL para retornar base de conhecimento completa
CREATE OR REPLACE FUNCTION get_complete_knowledge_base(
  p_include_company BOOLEAN DEFAULT true,
  p_include_categories BOOLEAN DEFAULT true,
  p_include_links BOOLEAN DEFAULT true,
  p_include_products BOOLEAN DEFAULT true,
  p_approved_only BOOLEAN DEFAULT true,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::jsonb;
  company_data JSONB;
  categories_data JSONB;
  links_data JSONB;
  products_data JSONB;
BEGIN
  -- 1. Company Profile
  IF p_include_company THEN
    SELECT to_jsonb(cp.*) INTO company_data
    FROM company_profile cp
    LIMIT 1;
    result := result || jsonb_build_object('company_profile', company_data);
  END IF;
  
  -- 2. Categories Config
  IF p_include_categories THEN
    SELECT jsonb_agg(to_jsonb(cc.*)) INTO categories_data
    FROM categories_config cc
    WHERE p_category IS NULL OR cc.category = p_category;
    result := result || jsonb_build_object('categories_config', categories_data);
  END IF;
  
  -- 3. External Links (Keywords Repository)
  IF p_include_links THEN
    SELECT jsonb_agg(to_jsonb(el.*) ORDER BY el.relevance_score DESC NULLS LAST) INTO links_data
    FROM external_links el
    WHERE (NOT p_approved_only OR el.approved = true)
    AND (p_category IS NULL OR el.category = p_category);
    result := result || jsonb_build_object('external_links', links_data);
  END IF;
  
  -- 4. Products with all relations
  IF p_include_products THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'product', to_jsonb(pr.*),
        'cs_messages', (
          SELECT jsonb_agg(to_jsonb(cs.*) ORDER BY cs.message_order)
          FROM cs_messages cs 
          WHERE cs.product_id = pr.id AND cs.is_active = true
        ),
        'aftersales_messages', (
          SELECT jsonb_agg(to_jsonb(am.*) ORDER BY am.message_order)
          FROM aftersales_messages am 
          WHERE am.product_id = pr.id AND am.is_active = true
        ),
        'coupons', (
          SELECT jsonb_agg(to_jsonb(pc.*))
          FROM product_coupons pc 
          WHERE pc.product_id = pr.id
        ),
        'google_ads', (
          SELECT jsonb_agg(to_jsonb(ga.*))
          FROM google_ads_campaigns ga 
          WHERE ga.product_id = pr.id
        ),
        'completion_score', (
          SELECT to_jsonb(ct.*)
          FROM content_completion_tracking ct 
          WHERE ct.entity_type = 'product' 
          AND ct.entity_id = pr.id::text
        )
      )
    ) INTO products_data
    FROM products_repository pr
    WHERE (NOT p_approved_only OR pr.approved = true)
    AND (p_category IS NULL OR pr.category = p_category)
    ORDER BY pr.display_order NULLS LAST, pr.created_at DESC
    LIMIT p_limit OFFSET p_offset;
    
    result := result || jsonb_build_object('products', products_data);
  END IF;
  
  RETURN result;
END;
$$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_company_profile_user ON company_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_config_category ON categories_config(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_external_links_approved_category ON external_links(approved, category) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_external_links_keyword_type ON external_links(keyword_type, search_intent);
CREATE INDEX IF NOT EXISTS idx_external_links_relevance ON external_links(relevance_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_products_approved_category ON products_repository(approved, category) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products_repository(display_order NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_messages_product ON cs_messages(product_id, message_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_aftersales_messages_product ON aftersales_messages(product_id, message_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_product_coupons_product ON product_coupons(product_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_product ON google_ads_campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_content_completion_product ON content_completion_tracking(entity_type, entity_id) WHERE entity_type = 'product';

-- Comentários para documentação
COMMENT ON FUNCTION get_complete_knowledge_base IS 'Retorna base de conhecimento completa com 250+ campos para integração externa';
COMMENT ON INDEX idx_external_links_approved_category IS 'Performance para filtros de categoria em links aprovados';
COMMENT ON INDEX idx_products_display_order IS 'Otimiza ordenação de produtos por prioridade';
