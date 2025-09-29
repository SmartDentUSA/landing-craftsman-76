-- Atualizar prompts existentes para evitar CTAs genéricos
UPDATE prompts_configuration 
SET custom_prompt = custom_prompt || '

IMPORTANTE - NÃO INCLUIR NO CONTEÚDO:
- CTAs genéricos como "Solicite uma Demonstração Personalizada", "Fale com Nossos Especialistas", "Baixe o Catálogo Completo"
- Rodapés com informações de contato (telefones, WhatsApp, horários)
- Frases como "O futuro da odontologia digital é simples, rápido e confiável"
- Assinaturas padronizadas da empresa como "Smart Dent - Soluções Inteligentes"
- Terminar o blog com informações de contato genéricas
- Informações de telefone no formato "(XX) XXXX-XXXX"

CONCLUSÃO: Finalize o conteúdo com uma conclusão específica do produto, sem CTAs corporativos.'
WHERE edge_function_id = 'generate-product-blog' AND (prompt_name LIKE '%Blog Comercial%' OR prompt_name LIKE '%Blog Técnico%');