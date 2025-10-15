-- ============================================================
-- MIGRAÇÃO: RLS para blog_posts
-- Data: 2025-01-XX
-- Descrição: Ativa RLS e cria políticas de acesso para blog_posts
-- ============================================================

-- 1️⃣ Ativar Row Level Security na tabela blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Política: Todos podem visualizar posts publicados
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

-- 3️⃣ Política: Usuários autenticados podem visualizar seus próprios posts (qualquer status)
CREATE POLICY "Authenticated users can view own blog posts"
ON public.blog_posts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM landing_pages lp 
    WHERE lp.id = blog_posts.landing_page_id 
    AND lp.user_id = auth.uid()
  )
);

-- 4️⃣ Política: Apenas admins podem gerenciar todos os posts (já existente, mas garantindo)
-- (A política "Only admins can manage blog_posts" já cobre INSERT, UPDATE, DELETE)

-- ✅ Verificação
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'blog_posts';