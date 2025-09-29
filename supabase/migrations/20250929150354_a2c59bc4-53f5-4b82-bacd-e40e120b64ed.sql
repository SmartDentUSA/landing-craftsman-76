-- Add use_intelligent_links field to prompts_configuration table
ALTER TABLE public.prompts_configuration 
ADD COLUMN use_intelligent_links boolean DEFAULT true;