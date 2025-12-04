UPDATE company_profile 
SET seo_domains = '[
  {
    "name": "Mediti 900",
    "domain": "mediti900.com.br",
    "description": "Site principal Mediti 900",
    "priority": 1,
    "use_for_seo": true,
    "use_for_schema": true,
    "use_for_footer": true,
    "cloudflare_enabled": true,
    "cloudflare_project_name": "mediti900",
    "cloudflare_zone_id": "79adb634fb6eb79ba246baf3b418a3ac",
    "cloudflare_status": "active",
    "tracking_pixels": {
      "google_tag_manager": { "enabled": false, "container_id": null },
      "meta_pixel": { "enabled": false, "pixel_id": null },
      "tiktok_pixel": { "enabled": false, "pixel_id": null },
      "google_analytics": { "enabled": false, "measurement_id": null }
    }
  }
]'::jsonb,
updated_at = now()
WHERE id = 'edeec15d-4147-4382-bda4-e640e243ed19'