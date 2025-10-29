-- Criar tabela spin_selling_solutions
CREATE TABLE public.spin_selling_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pain_type TEXT NOT NULL CHECK (pain_type IN (
    'delivery_speed',
    'competitive_edge',
    'patient_loss',
    'training_fear',
    'high_lab_costs',
    'lab_dependency',
    'financial_roi',
    'quality_durability'
  )),
  priority INTEGER DEFAULT 1,
  frequency TEXT,
  product_ids UUID[] DEFAULT '{}',
  real_quotes JSONB DEFAULT '[]'::jsonb,
  pain_metrics JSONB DEFAULT '{}'::jsonb,
  google_ads_headline TEXT,
  whatsapp_hook TEXT,
  storytelling_hook TEXT,
  case_study_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger de updated_at
CREATE TRIGGER update_spin_selling_solutions_updated_at
  BEFORE UPDATE ON public.spin_selling_solutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.spin_selling_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spin_selling_solutions"
  ON public.spin_selling_solutions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users view active solutions"
  ON public.spin_selling_solutions FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

-- Popular dados iniciais (exemplo)
INSERT INTO public.spin_selling_solutions (
  title,
  pain_type,
  priority,
  frequency,
  product_ids,
  real_quotes,
  pain_metrics,
  google_ads_headline,
  whatsapp_hook,
  storytelling_hook
) VALUES (
  'Solução Velocidade Total',
  'delivery_speed',
  1,
  '14/20 reuniões comerciais',
  '{}',
  '[{"quote": "Placas de bruxismo no mesmo dia", "timestamp": "02:20", "speaker": "Cliente satisfeito"}]'::jsonb,
  '{"lab_time": "40 dias", "digital_time": "24 horas", "patient_loss": "50%", "revenue_loss": "R$ 15.000/mês"}'::jsonb,
  'Entregue Placas de Bruxismo em 24h - Sistema Digital Completo',
  'Imagina entregar uma placa de bruxismo no mesmo dia da consulta? Com Scanner + Impressora 3D você faz isso e ainda fatura R$ 15 mil a mais por mês!',
  'Dr. João perdia 50% dos pacientes esperando 40 dias pelo laboratório. Hoje entrega tudo em 24h e nunca mais perdeu um paciente.'
);