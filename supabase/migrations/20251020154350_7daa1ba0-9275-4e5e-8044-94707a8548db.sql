-- Fix get_complete_knowledge_base function - correct ORDER BY in product aggregation
DROP FUNCTION IF EXISTS public.get_complete_knowledge_base(boolean, boolean, boolean, boolean, boolean, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_complete_knowledge_base(
  p_include_company boolean DEFAULT true,
  p_include_categories boolean DEFAULT true,
  p_include_links boolean DEFAULT true,
  p_include_products boolean DEFAULT true,
  p_approved_only boolean DEFAULT true,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- 4. Products with all relations - FIXED ORDER BY
  IF p_include_products THEN
    SELECT jsonb_agg(produto_completo) INTO products_data
    FROM (
      SELECT jsonb_build_object(
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
      ) as produto_completo
      FROM products_repository pr
      WHERE (NOT p_approved_only OR pr.approved = true)
      AND (p_category IS NULL OR pr.category = p_category)
      ORDER BY pr.display_order NULLS LAST, pr.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ) produtos_ordenados;
    
    result := result || jsonb_build_object('products', products_data);
  END IF;
  
  RETURN result;
END;
$function$;