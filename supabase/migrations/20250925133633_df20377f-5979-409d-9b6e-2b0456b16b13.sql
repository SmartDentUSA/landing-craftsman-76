-- Adicionar campos para blogs individuais por produto
ALTER TABLE public.products_repository 
ADD COLUMN individual_blog_content jsonb DEFAULT '{"commercial": null, "technical": null, "generated_at": null}'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.products_repository.individual_blog_content IS 'Armazena blogs comercial e técnico gerados individualmente para cada produto';