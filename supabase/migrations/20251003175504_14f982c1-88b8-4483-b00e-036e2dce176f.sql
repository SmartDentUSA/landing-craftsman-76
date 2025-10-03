-- Create aftersales_messages table
CREATE TABLE public.aftersales_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products_repository(id) ON DELETE CASCADE,
  message_order INTEGER NOT NULL,
  message_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_message_order CHECK (message_order >= 1 AND message_order <= 10),
  CONSTRAINT valid_message_content CHECK (length(trim(message_content)) >= 10),
  UNIQUE(product_id, message_order)
);

-- Enable RLS
ALTER TABLE public.aftersales_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view aftersales_messages"
ON public.aftersales_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage aftersales_messages"
ON public.aftersales_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_aftersales_messages_product_id ON public.aftersales_messages(product_id);
CREATE INDEX idx_aftersales_messages_order ON public.aftersales_messages(product_id, message_order);

-- Trigger for updated_at
CREATE TRIGGER update_aftersales_messages_updated_at
BEFORE UPDATE ON public.aftersales_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();