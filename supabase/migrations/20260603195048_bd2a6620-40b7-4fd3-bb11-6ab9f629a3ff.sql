UPDATE public.products_repository
SET seo_title_override = NULL
WHERE seo_title_override ~* 'smartphone|colch[aã]o|notebook|guia definitivo.*(escolher|como|escolha)|melhores.*2024|2024.*(comparativo|guia|an[aá]lise|modelos)';

UPDATE public.products_repository
SET seo_description_override = NULL
WHERE seo_description_override ILIKE '%melhores produtos premium%entrega rápida%'
   OR seo_description_override ILIKE '%nossos produtos premium com entrega rápida%'
   OR seo_description_override ILIKE '%anúncios personalizados no TikTok%'
   OR seo_description_override ILIKE '%anúncios personalizados no Google e Facebook%'
   OR seo_description_override ILIKE '%produtos de beleza com até 70%%'
   OR seo_description_override ILIKE '%melhores produtos para sua casa com qualidade e preço imbatível%'
   OR seo_description_override ILIKE '%melhores produtos para transformar sua rotina%'
   OR seo_description_override ILIKE '%ferramentas de gestão. Otimize processos%'
   OR seo_description_override ILIKE '%Transforme sua casa com móveis modernos%';