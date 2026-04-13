import { BlogImageGalleryTester } from '@/components/BlogImageGalleryTester';

const BlogImageTest = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Teste de Images Gallery</h1>
          <p className="text-muted-foreground mt-2">
            Validação de múltiplas og:image no HTML gerado
          </p>
        </div>
        
        <BlogImageGalleryTester />
      </div>
    </div>
  );
};

export default BlogImageTest;
