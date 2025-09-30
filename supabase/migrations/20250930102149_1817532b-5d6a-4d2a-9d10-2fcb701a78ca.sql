-- Delete incorrect prompt configurations for generate-social-content
DELETE FROM prompts_configuration WHERE edge_function_id = 'generate-social-content';