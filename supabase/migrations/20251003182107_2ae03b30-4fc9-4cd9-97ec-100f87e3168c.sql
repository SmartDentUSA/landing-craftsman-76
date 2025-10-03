-- Create cs_messages table for Customer Success messages
CREATE TABLE public.cs_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products_repository(id) ON DELETE CASCADE,
  message_order INTEGER NOT NULL,
  message_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_cs_messages_product_id ON public.cs_messages(product_id);
CREATE INDEX idx_cs_messages_message_order ON public.cs_messages(message_order);

-- Enable Row Level Security
ALTER TABLE public.cs_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view cs_messages"
ON public.cs_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage cs_messages"
ON public.cs_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at column
CREATE TRIGGER update_cs_messages_updated_at
BEFORE UPDATE ON public.cs_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();