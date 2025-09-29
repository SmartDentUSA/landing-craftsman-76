-- Atualização manual e direta de todos os prompts com anti-alucinação

-- 1. Atualizar explicitamente cada prompt do Instagram
UPDATE prompts_configuration 
SET custom_prompt = custom_prompt || E'\n\nIMPORTANTE - INSTRUÇÕES ANTI-ALUCINAÇÃO:\n- Utilize EXCLUSIVAMENTE as informações fornecidas nos dados do produto e empresa\n- NÃO invente informações adicionais, especificações técnicas ou benefícios não mencionados\n- Caso algum dado não esteja disponível, indique naturalmente a ausência sem criar conteúdo fictício\n- PROIBIDO usar termos genéricos como: "tecnologia avançada", "acabamento superior", "precisão milimétrica", "biocompatível", "resistência superior", "qualidade premium" se não estiverem nos dados fornecidos\n- Base todo o conteúdo em evidências reais dos dados fornecidos\n- Use apenas características e benefícios explicitamente mencionados nos dados'
WHERE edge_function_id = 'generate-instagram-copy';

-- 2. Atualizar explicitamente cada prompt do Blog
UPDATE prompts_configuration 
SET custom_prompt = custom_prompt || E'\n\nIMPORTANTE - INSTRUÇÕES ANTI-ALUCINAÇÃO:\n- Utilize EXCLUSIVAMENTE as informações fornecidas em DADOS DO PRODUTO e DADOS DA EMPRESA\n- NÃO invente informações adicionais, especificações técnicas ou benefícios não mencionados\n- Caso algum dado não esteja disponível, indique de forma natural a ausência da informação, sem criar conteúdo fictício\n- PROIBIDO usar termos genéricos como: "tecnologia avançada", "acabamento superior", "precisão milimétrica", "biocompatível", "resistência superior", "qualidade premium" se não estiverem nos dados fornecidos\n- NÃO UTILIZAR as palavras "informativo técnico" e "informativo comercial"\n- Base todo o conteúdo em evidências reais dos dados fornecidos\n- Use apenas características e benefícios explicitamente mencionados nos dados'
WHERE edge_function_id = 'generate-product-blog';

-- 3. Atualizar prompt do Strategic Blog
UPDATE prompts_configuration 
SET custom_prompt = custom_prompt || E'\n\nIMPORTANTE - INSTRUÇÕES ANTI-ALUCINAÇÃO:\n- Utilize EXCLUSIVAMENTE as informações fornecidas nos dados contextuais\n- NÃO invente informações adicionais, especificações técnicas ou benefícios não mencionados\n- Caso algum dado não esteja disponível, indique de forma natural a ausência da informação, sem criar conteúdo fictício\n- PROIBIDO usar termos genéricos como: "tecnologia avançada", "acabamento superior", "precisão milimétrica", "biocompatível", "resistência superior", "qualidade premium" se não estiverem nos dados fornecidos\n- Base todo o conteúdo em evidências reais dos dados fornecidos\n- Use apenas características e benefícios explicitamente mencionados nos dados'
WHERE edge_function_id = 'strategic-blog-generator';