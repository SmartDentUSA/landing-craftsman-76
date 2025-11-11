import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateBlogHTML } from '@/services/seo/blogHTMLGenerator';

interface ValidationResult {
  totalOgImages: number;
  twitterImages: number;
  schemaImages: number;
  ogImageUrls: string[];
  passed: boolean;
  details: string[];
}

export const BlogImageGalleryTester = () => {
  const [landingPages, setLandingPages] = useState<any[]>([]);
  const [selectedLandingPageId, setSelectedLandingPageId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const loadLandingPages = async () => {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('id, embed')
      .order('embed');

    if (error) {
      toast.error('Erro ao carregar landing pages');
      return;
    }

    setLandingPages(data || []);
    
    // Auto-selecionar "Smart Dent Campanha Q1" se existir
    const smartDent = data?.find(lp => lp.embed?.includes('smart-dent-campanha-q1'));
    if (smartDent) {
      setSelectedLandingPageId(smartDent.id);
    }
  };

  const validateHtml = (html: string): ValidationResult => {
    const details: string[] = [];
    
    // Contar og:image tags
    const ogImageMatches = html.match(/<meta property="og:image" content="[^"]+"/g) || [];
    const totalOgImages = ogImageMatches.length;
    details.push(`✅ ${totalOgImages} tags og:image encontradas`);

    // Extrair URLs das imagens
    const ogImageUrls = ogImageMatches.map(tag => {
      const match = tag.match(/content="([^"]+)"/);
      return match ? match[1] : '';
    }).filter(url => url);

    ogImageUrls.forEach((url, i) => {
      details.push(`  ${i + 1}. ${url.split('/').pop()}`);
    });

    // Contar twitter:image tags
    const twitterImageMatches = html.match(/<meta name="twitter:image" content="[^"]+"/g) || [];
    const twitterImages = twitterImageMatches.length;
    details.push(`${twitterImages === 1 ? '✅' : '❌'} ${twitterImages} tag(s) twitter:image (esperado: 1)`);

    // Verificar schema.org Article image array
    const schemaMatch = html.match(/"@type":\s*"Article"[\s\S]*?"image":\s*(\[[^\]]+\])/);
    let schemaImages = 0;
    if (schemaMatch) {
      try {
        const imageArray = JSON.parse(schemaMatch[1]);
        schemaImages = Array.isArray(imageArray) ? imageArray.length : 0;
        details.push(`✅ Schema Article com ${schemaImages} imagens`);
      } catch {
        details.push(`❌ Erro ao parsear schema image array`);
      }
    } else {
      details.push(`❌ Schema Article não encontrado ou sem array de imagens`);
    }

    // Verificar og:image:alt tags
    const altMatches = html.match(/<meta property="og:image:alt" content="[^"]+"/g) || [];
    details.push(`${altMatches.length === totalOgImages ? '✅' : '⚠️'} ${altMatches.length} tags og:image:alt (esperado: ${totalOgImages})`);

    // Verificar og:image:width e height
    const widthMatches = html.match(/<meta property="og:image:width" content="[^"]+"/g) || [];
    const heightMatches = html.match(/<meta property="og:image:height" content="[^"]+"/g) || [];
    details.push(`${widthMatches.length === totalOgImages ? '✅' : '⚠️'} ${widthMatches.length} tags og:image:width`);
    details.push(`${heightMatches.length === totalOgImages ? '✅' : '⚠️'} ${heightMatches.length} tags og:image:height`);

    const passed = totalOgImages > 0 && twitterImages === 1 && schemaImages > 0;

    return {
      totalOgImages,
      twitterImages,
      schemaImages,
      ogImageUrls,
      passed,
      details
    };
  };

  const generateBlog = async () => {
    if (!selectedLandingPageId) {
      toast.error('Selecione uma landing page');
      return;
    }

    setLoading(true);
    setGeneratedHtml('');
    setValidation(null);

    try {
      console.log('🧪 TESTE 1: Iniciando geração de blog para validação de images_gallery');
      
      // Buscar landing page
      const { data: landingPage, error: lpError } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', selectedLandingPageId)
        .single();

      if (lpError) throw lpError;

      console.log('📄 Landing Page:', landingPage.embed);

      // Buscar produtos selecionados via data.selectedProducts
      const lpData = landingPage.data as any;
      const productIds = lpData?.selectedProducts || [];
      console.log('🔍 Product IDs:', productIds);

      if (productIds.length === 0) {
        toast.error('Landing page sem produtos selecionados');
        setLoading(false);
        return;
      }

      // Buscar produtos com images_gallery
      const { data: products, error: prodError } = await supabase
        .from('products_repository')
        .select('id, name, image_url, images_gallery')
        .in('id', productIds);

      if (prodError) throw prodError;

      console.log('📦 Produtos carregados:', products?.length);
      products?.forEach(p => {
        const gallery = Array.isArray(p.images_gallery) ? p.images_gallery : [];
        console.log(`  - ${p.name}: ${gallery.length} imagens na gallery`);
      });

      // Buscar blog post existente ou gerar novo
      let { data: blogPost, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', selectedLandingPageId)
        .contains('published_domains', ['dentala.com.br'])
        .maybeSingle();

      if (postError) {
        console.error('Erro ao buscar blog post:', postError);
      }

      // Se não existe, gerar novo
      if (!blogPost) {
        console.log('📝 Gerando novo blog...');
        const { data: blogData, error: blogError } = await supabase.functions.invoke('strategic-blog-generator', {
          body: {
            landingPageId: selectedLandingPageId,
            repositoryConfig: lpData
          }
        });

        if (blogError) throw blogError;

        // Buscar novamente o blog post recém-criado
        const { data: newBlogPost, error: newPostError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('landing_page_id', selectedLandingPageId)
          .contains('published_domains', ['dentala.com.br'])
          .single();

        if (newPostError) throw newPostError;
        blogPost = newBlogPost;
      }

      console.log('✅ Blog post obtido:', blogPost?.title);

      // Gerar HTML completo usando blogHTMLGenerator
      console.log('🔨 Gerando HTML final com images_gallery...');
      const html = await generateBlogHTML({
        blogs: [{
          title: blogPost.title || '',
          content: blogPost.content || '',
          meta_description: blogPost.meta_description || '',
          keywords: blogPost.keywords || []
        }],
        domain: 'dentala.com.br',
        canonicalUrl: `https://dentala.com.br/blog/${landingPage.embed}`,
        finalTitle: blogPost.title || '',
        finalDescription: blogPost.meta_description || '',
        selectedProducts: products,
        keywords: blogPost.keywords || []
      });

      setGeneratedHtml(html);

      // Validar HTML
      const validationResult = validateHtml(html);
      setValidation(validationResult);

      console.log('🔍 VALIDAÇÃO:', validationResult);

      if (validationResult.passed) {
        toast.success(`Teste aprovado! ${validationResult.totalOgImages} imagens og:image encontradas`);
      } else {
        toast.warning('Teste com avisos. Verifique os detalhes.');
      }

    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      toast.error(error.message || 'Erro ao gerar blog');
    } finally {
      setLoading(false);
    }
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(generatedHtml);
    toast.success('HTML copiado!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Teste de Multi og:image</CardTitle>
        <CardDescription>
          Validar geração de múltiplas tags og:image a partir de images_gallery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Landing Page</label>
          <div className="flex gap-2">
            <Select value={selectedLandingPageId} onValueChange={setSelectedLandingPageId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma landing page" />
              </SelectTrigger>
              <SelectContent>
                {landingPages.map(lp => (
                  <SelectItem key={lp.id} value={lp.id}>
                    {lp.embed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={loadLandingPages} variant="outline" size="sm">
              Carregar
            </Button>
          </div>
        </div>

        <Button 
          onClick={generateBlog} 
          disabled={loading || !selectedLandingPageId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando e Validando...
            </>
          ) : (
            'Gerar Blog e Validar'
          )}
        </Button>

        {validation && (
          <Alert className={validation.passed ? 'border-green-500' : 'border-yellow-500'}>
            <div className="flex items-start gap-2">
              {validation.passed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-500" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold mb-2">
                  {validation.passed ? 'Teste Aprovado ✅' : 'Teste com Avisos ⚠️'}
                </h4>
                <AlertDescription>
                  <div className="space-y-1 font-mono text-xs">
                    {validation.details.map((detail, i) => (
                      <div key={i}>{detail}</div>
                    ))}
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {generatedHtml && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">HTML Gerado ({generatedHtml.length} chars)</label>
              <Button onClick={copyHtml} size="sm" variant="outline">
                Copiar HTML
              </Button>
            </div>
            <div className="bg-muted p-4 rounded-md max-h-64 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap break-all">
                {generatedHtml.substring(0, 2000)}...
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
