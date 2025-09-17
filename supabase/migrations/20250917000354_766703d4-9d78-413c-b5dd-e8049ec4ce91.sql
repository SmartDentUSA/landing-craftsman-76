-- Criar tabela para configurações de publicação
CREATE TABLE public.publication_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ftp_host TEXT,
  ftp_user TEXT,
  ftp_password_encrypted TEXT,
  wordpress_url TEXT,
  wordpress_user TEXT,
  wordpress_app_password_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Criar tabela para blog posts
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  published_domains TEXT[] DEFAULT '{}',
  youtube_video_url TEXT,
  schema_json_ld JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.publication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Políticas para publication_settings
CREATE POLICY "Only admins can manage publication_settings" 
ON public.publication_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para blog_posts
CREATE POLICY "Only admins can manage blog_posts" 
ON public.blog_posts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_publication_settings_updated_at
BEFORE UPDATE ON public.publication_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();