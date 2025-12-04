-- Limpar URLs WordPress das landing pages clonadas existentes
-- Isso remove referências a wp-admin/admin-ajax.php que causam problemas de indexação

UPDATE cloned_landing_pages 
SET transformed_html = 
  -- Remove data-settings com WordPress URLs
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          transformed_html,
          'data-settings="[^"]*admin-ajax[^"]*"',
          'data-settings="{}"',
          'gi'
        ),
        'data-settings="[^"]*wp-admin[^"]*"',
        'data-settings="{}"',
        'gi'
      ),
      -- Remove scripts com admin-ajax
      '<script[^>]*>[^<]*admin-ajax[^<]*</script>',
      '',
      'gi'
    ),
    -- Remove action attributes com wp-admin
    'action="[^"]*wp-admin[^"]*"',
    '',
    'gi'
  ),
  updated_at = now()
WHERE transformed_html ILIKE '%wp-admin%' 
   OR transformed_html ILIKE '%admin-ajax%';