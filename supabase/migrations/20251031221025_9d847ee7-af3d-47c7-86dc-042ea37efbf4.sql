-- Adicionar campos para vídeo selecionado na landing page do SPIN
ALTER TABLE spin_selling_solutions 
ADD COLUMN selected_video_url TEXT,
ADD COLUMN selected_video_title TEXT;

COMMENT ON COLUMN spin_selling_solutions.selected_video_url IS 'URL do vídeo selecionado para exibir na landing page antes das métricas';
COMMENT ON COLUMN spin_selling_solutions.selected_video_title IS 'Título/descrição do vídeo selecionado';