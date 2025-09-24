-- Corrigir dados da landing page que está com data: null
UPDATE landing_pages 
SET data = jsonb_build_object(
  'banner', jsonb_build_object(
    'title', 'Smart Dent Campanha Q1',
    'subtitle', 'Soluções odontológicas de qualidade para profissionais'
  ),
  'brand', jsonb_build_object(
    'name', 'Smart Dent',
    'description', 'Especializada em equipamentos e materiais odontológicos'
  ),
  'seo', jsonb_build_object(
    'meta_description', 'Descubra as melhores soluções odontológicas da Smart Dent. Equipamentos de qualidade, materiais confiáveis e atendimento especializado.',
    'intelligent_links', jsonb_build_object()
  ),
  'solutions', jsonb_build_array(
    jsonb_build_object(
      'title', 'Equipamentos Odontológicos',
      'description', 'Equipamentos de alta qualidade para consultórios e clínicas odontológicas'
    ),
    jsonb_build_object(
      'title', 'Materiais Especializados', 
      'description', 'Materiais odontológicos confiáveis para tratamentos diversos'
    )
  ),
  'faq', jsonb_build_array(
    jsonb_build_object(
      'question', 'Quais são os diferenciais da Smart Dent?',
      'answer', 'Oferecemos produtos de qualidade superior, atendimento especializado e suporte técnico completo.'
    ),
    jsonb_build_object(
      'question', 'Como solicitar um orçamento?',
      'answer', 'Entre em contato conosco através dos canais de atendimento para receber um orçamento personalizado.'
    )
  )
)
WHERE id = 'lp_1758075930044' AND data IS NULL;