-- Create RLS policies to allow authenticated users to read approved products and all blog posts

-- Policy for products_repository - allow authenticated users to read approved products
CREATE POLICY "Authenticated users can view approved products" 
ON public.products_repository 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND approved = true);

-- Policy for blog_posts - allow authenticated users to read all blog posts
CREATE POLICY "Authenticated users can view all blog_posts" 
ON public.blog_posts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);