-- Criar tabela para configuração de prompts personalizados
CREATE TABLE public.prompts_configuration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edge_function_id TEXT NOT NULL,
  prompt_name TEXT NOT NULL,
  custom_prompt TEXT NOT NULL,
  selected_data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(edge_function_id, prompt_name)
);

-- Enable Row Level Security
ALTER TABLE public.prompts_configuration ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Only admins can manage prompts_configuration" 
ON public.prompts_configuration 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompts_configuration_updated_at
BEFORE UPDATE ON public.prompts_configuration
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();