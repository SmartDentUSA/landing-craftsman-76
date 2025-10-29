-- Adicionar campo de Pitch de Vendas SPIN
ALTER TABLE spin_selling_solutions
ADD COLUMN IF NOT EXISTS sales_pitch TEXT;

-- Adicionar campo de FAQs (Perguntas Frequentes)
ALTER TABLE spin_selling_solutions
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN spin_selling_solutions.sales_pitch IS 
'Pitch de vendas preparado pelo time comercial com discurso rico integrando os produtos da solução. Usado pela IA para gerar conteúdo mais preciso em landing pages, WhatsApp, etc.';

COMMENT ON COLUMN spin_selling_solutions.faq IS 
'Array de até 5 FAQs (perguntas frequentes) com estrutura [{"question": string, "answer": string}]. Gerado manualmente ou por IA usando contexto completo da solução.';