-- Limpar blogs existentes com JSON wrapping
UPDATE blog_posts
SET content = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        content,
        '```json\s*\{[^}]*"content":\s*"',
        '',
        'g'
      ),
      '"\}\s*```',
      '',
      'g'
    ),
    '^\{.*?"content":\s*"',
    '',
    'g'
  ),
  '".*?\}$',
  '',
  'g'
)
WHERE content LIKE '%```json%'
   OR content LIKE '%"title":%'
   OR content LIKE '%"content":%';