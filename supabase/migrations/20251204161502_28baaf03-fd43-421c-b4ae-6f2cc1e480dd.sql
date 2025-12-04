-- Normalizar nomes dos tracking pixels no seo_domains
-- Renomeia: gtm → google_tag_manager, ga4 → google_analytics, meta → meta_pixel, tiktok → tiktok_pixel
UPDATE company_profile 
SET seo_domains = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem ? 'tracking_pixels' AND (
        elem->'tracking_pixels' ? 'gtm' OR 
        elem->'tracking_pixels' ? 'ga4' OR 
        elem->'tracking_pixels' ? 'meta' OR 
        elem->'tracking_pixels' ? 'tiktok'
      ) THEN
        jsonb_set(
          elem,
          '{tracking_pixels}',
          jsonb_build_object(
            'google_tag_manager', COALESCE(elem->'tracking_pixels'->'gtm', elem->'tracking_pixels'->'google_tag_manager', '{"enabled": false, "container_id": null}'::jsonb),
            'google_analytics', COALESCE(elem->'tracking_pixels'->'ga4', elem->'tracking_pixels'->'google_analytics', '{"enabled": false, "measurement_id": null}'::jsonb),
            'meta_pixel', COALESCE(elem->'tracking_pixels'->'meta', elem->'tracking_pixels'->'meta_pixel', '{"enabled": false, "pixel_id": null}'::jsonb),
            'tiktok_pixel', COALESCE(elem->'tracking_pixels'->'tiktok', elem->'tracking_pixels'->'tiktok_pixel', '{"enabled": false, "pixel_id": null}'::jsonb)
          )
        )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(seo_domains) AS elem
)
WHERE seo_domains IS NOT NULL 
AND seo_domains::text LIKE '%tracking_pixels%';