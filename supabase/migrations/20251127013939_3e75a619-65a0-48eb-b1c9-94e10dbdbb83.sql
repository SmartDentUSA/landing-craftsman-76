-- Adicionar suporte para blog posts e landing pages no get_complete_knowledge_base

DROP FUNCTION IF EXISTS public.get_complete_knowledge_base(boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_complete_knowledge_base(
  p_include_company boolean DEFAULT true,
  p_include_categories boolean DEFAULT true,
  p_include_links boolean DEFAULT true,
  p_include_products boolean DEFAULT true,
  p_include_video_testimonials boolean DEFAULT true,
  p_include_google_reviews boolean DEFAULT true,
  p_include_kols boolean DEFAULT false,
  p_include_spin_solutions boolean DEFAULT true,
  p_include_blog_posts boolean DEFAULT false,
  p_include_landing_pages boolean DEFAULT false,
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
  video_testimonials_data JSONB;
  google_reviews_data JSONB;
  kols_data JSONB;
  spin_solutions_data JSONB;
  blog_posts_data JSONB;
  landing_pages_data JSONB;
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
  
  -- 5. Video Testimonials
  IF p_include_video_testimonials THEN
    SELECT jsonb_agg(to_jsonb(vt.*) ORDER BY vt.display_order NULLS LAST, vt.created_at DESC) INTO video_testimonials_data
    FROM video_testimonials vt
    WHERE (NOT p_approved_only OR vt.approved = true);
    result := result || jsonb_build_object('video_testimonials', video_testimonials_data);
  END IF;
  
  -- 6. Google Reviews (Approved)
  IF p_include_google_reviews THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'approved_review', to_jsonb(ar.*),
        'raw_review', to_jsonb(rr.*)
      ) ORDER BY ar.display_order NULLS LAST, ar.created_at DESC
    ) INTO google_reviews_data
    FROM approved_reviews ar
    LEFT JOIN raw_reviews rr ON ar.raw_review_id = rr.id;
    result := result || jsonb_build_object('google_reviews', google_reviews_data);
  END IF;
  
  -- 7. Key Opinion Leaders (Optional)
  IF p_include_kols THEN
    SELECT jsonb_agg(to_jsonb(kol.*) ORDER BY kol.display_order NULLS LAST, kol.created_at DESC) INTO kols_data
    FROM key_opinion_leaders kol
    WHERE (NOT p_approved_only OR kol.approved = true);
    result := result || jsonb_build_object('key_opinion_leaders', kols_data);
  END IF;
  
  -- 8. SPIN Selling Solutions
  IF p_include_spin_solutions THEN
    SELECT jsonb_agg(to_jsonb(ss.*) ORDER BY ss.priority ASC, ss.created_at DESC) INTO spin_solutions_data
    FROM spin_selling_solutions ss
    WHERE ss.active = true;
    result := result || jsonb_build_object('spin_solutions', spin_solutions_data);
  END IF;
  
  -- 9. Blog Posts (NEW)
  IF p_include_blog_posts THEN
    SELECT jsonb_agg(to_jsonb(bp.*) ORDER BY bp.published_at DESC NULLS LAST) INTO blog_posts_data
    FROM blog_posts bp
    WHERE bp.status = 'published';
    result := result || jsonb_build_object('blog_posts', blog_posts_data);
  END IF;
  
  -- 10. Landing Pages (NEW)
  IF p_include_landing_pages THEN
    SELECT jsonb_agg(to_jsonb(lp.*) ORDER BY lp.created_at DESC) INTO landing_pages_data
    FROM landing_pages lp
    WHERE (NOT p_approved_only OR lp.status = 'published');
    result := result || jsonb_build_object('landing_pages', landing_pages_data);
  END IF;
  
  RETURN result;
END;
$function$;