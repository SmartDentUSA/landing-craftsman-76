import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Copy, FileText, Globe, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processContentWithIntelligentLinks } from "@/lib/intelligent-links";
import useLandingPages from "@/hooks/useLandingPages";
import { useKOLs } from "@/hooks/useKOLs";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { buildMetaTags } from "@/services/seo/metaTagsBuilder";
import { sanitizeFileNameToAlt } from "@/lib/seo-image-helpers";

interface DualBlogGeneratorProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
}

interface BlogVersion {
  title: string;
  content: string;
  metaDescription?: string;
  meta_description?: string;
  keywords: string[];
}

interface DualBlogVersions {
  dentala: BlogVersion;
  eodonto: BlogVersion;
}

export function DualBlogGeneratorWithKOL({ landingPageId, landingPageData, selectedProductIds }: DualBlogGeneratorProps) {
  const [blogVersions, setBlogVersions] = useState<DualBlogVersions | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("none");
  
  const { toast } = useToast();
  const { markBlogGenerated } = useLandingPages();
  const { kols, loading: kolsLoading } = useKOLs(true); // Only approved KOLs
  const { loadProductsByIds } = useSelectedProducts();

  const generateDualVersions = async () => {
    setGenerating(true);
    setError(null);

    try {
      console.log("🔄 Gerando versões duplas do blog para:", landingPageId);

      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          type: 'dual_blog_versions',
          landingPageId,
          landingPage: landingPageData,
          contentData: landingPageData, // For compatibility with Edge Function
          selectedProductIds: selectedProductIds || [],
          include_offers: true
        }
      });

      if (error) throw error;

      console.log("🔍 DualBlogGeneratorWithKOL - Resposta da AI:", data);
      
      if (data?.success && data?.content) {
        console.log("✅ DualBlogGeneratorWithKOL - Conteúdo encontrado:", data.content);
        setBlogVersions(data.content);
        await saveBlogVersions(data.content);
        markBlogGenerated(landingPageId);
        
        toast({
          title: "Sucesso!",
          description: "Versões do blog geradas com sucesso para ambos os domínios",
        });
      }
    } catch (error) {
      console.error("❌ Erro ao gerar versões:", error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast({
        title: "Erro",
        description: "Falha ao gerar as versões do blog",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveBlogVersions = async (versions: DualBlogVersions) => {
    try {
      // Save Dentala version
      const { error: dentalaError } = await supabase
        .from('blog_posts')
        .upsert({
          landing_page_id: landingPageId,
          title: versions.dentala.title,
          content: versions.dentala.content,
          meta_description: versions.dentala.meta_description || versions.dentala.metaDescription || '',
          keywords: versions.dentala.keywords,
          published_domains: ['dentala.com.br'],
          status: 'generated',
          author_kol_id: selectedAuthorId === "none" ? null : selectedAuthorId
        }, {
          onConflict: 'landing_page_id,published_domains'
        });

      if (dentalaError) throw dentalaError;

      // Save Eodonto version
      const { error: eodontoError } = await supabase
        .from('blog_posts')
        .upsert({
          landing_page_id: landingPageId,
          title: versions.eodonto.title,
          content: versions.eodonto.content,
          meta_description: versions.eodonto.meta_description || versions.eodonto.metaDescription || '',
          keywords: versions.eodonto.keywords,
          published_domains: ['eodonto.com'],
          status: 'generated',
          author_kol_id: selectedAuthorId === "none" ? null : selectedAuthorId
        }, {
          onConflict: 'landing_page_id,published_domains'
        });

      if (eodontoError) throw eodontoError;
    } catch (error) {
      console.error('Error saving blog versions:', error);
      throw error;
    }
  };

  const normalizeUrl = (url: string, platform?: 'instagram' | 'youtube') => {
    if (!url) return '';
    
    // Handle Instagram specific formats
    if (platform === 'instagram') {
      if (url.startsWith('@')) {
        return `https://instagram.com/${url.substring(1)}`;
      }
      if (url.includes('instagram.com')) {
        return url.startsWith('http') ? url : `https://${url}`;
      }
      if (!url.includes('.')) {
        return `https://instagram.com/${url}`;
      }
    }
    
    // Handle YouTube specific formats
    if (platform === 'youtube') {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return url.startsWith('http') ? url : `https://${url}`;
      }
      if (!url.includes('.')) {
        return `https://youtube.com/c/${url}`;
      }
    }
    
    // Default URL normalization
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const generateCompleteHTML = async (blogVersion: BlogVersion, domain: string) => {
    // ✅ FASE 6: Buscar produtos e extrair galeria de imagens
    let imagesGallery: Array<{
      url: string;
      alt: string;
      width: number;
      height: number;
      is_main: boolean;
    }> = [];

    if (selectedProductIds && selectedProductIds.length > 0) {
      try {
        const products = await loadProductsByIds(selectedProductIds);
        
        imagesGallery = products
          .filter(p => p.images_gallery && Array.isArray(p.images_gallery) && p.images_gallery.length > 0)
          .flatMap(p => 
            p.images_gallery!.map(img => ({
              url: img.url,
              alt: img.alt || img.description || sanitizeFileNameToAlt(img.url) || p.name,
              width: img.width || 1200,
              height: img.height || 630,
              is_main: img.is_main || false
            }))
          )
          .filter(img => img.url)
          .sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0)); // Priorizar is_main
        
        console.log('✅ FASE 6 (DualBlog): Galeria extraída', {
          productsCount: products.length,
          productsWithGallery: products.filter(p => p.images_gallery?.length).length,
          totalImages: imagesGallery.length,
          images: imagesGallery.map(img => ({ url: img.url, is_main: img.is_main }))
        });
      } catch (error) {
        console.error('❌ FASE 6: Erro ao buscar galeria de produtos:', error);
      }
    }

    // Build author info and section for E-E-A-T
    let authorInfo = undefined;
    let authorSection = '';
    
    if (selectedAuthorId && selectedAuthorId !== "none") {
      try {
        const { data: author } = await supabase
          .from('key_opinion_leaders')
          .select('*')
          .eq('id', selectedAuthorId)
          .single();
          
        if (author) {
          authorInfo = {
            name: author.full_name,
            url: author.website_url ? normalizeUrl(author.website_url) : undefined
          };

          authorSection = `
            <section class="author-bio" style="
              margin-top: 40px;
              padding: 20px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 12px;
              border-left: 4px solid #007bff;
              display: flex;
              gap: 1.5rem;
              align-items: start;
            ">
              ${author.photo_url ? `
              <img 
                src="${author.photo_url}" 
                alt="${author.full_name}"
                style="
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  object-fit: cover;
                  border: 3px solid #007bff;
                  flex-shrink: 0;
                "
              />
              ` : ''}
              <div>
                <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Sobre o Autor</h4>
                <p style="font-weight: 600; margin-bottom: 0.5rem; color: #333;">
                  ${author.full_name}${author.specialty ? ` - ${author.specialty}` : ''}
                </p>
                ${author.mini_cv ? `<p style="margin-bottom: 1rem; line-height: 1.6;">${author.mini_cv}</p>` : ''}
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                  ${author.lattes_url ? `<a href="${author.lattes_url}" target="_blank" rel="noopener" style="color: #007bff; text-decoration: none; font-weight: 500;">📄 Lattes</a>` : ''}
                  ${author.website_url ? `<a href="${author.website_url}" target="_blank" rel="noopener" style="color: #007bff; text-decoration: none; font-weight: 500;">🌐 Website</a>` : ''}
                  ${author.instagram_url ? `<a href="${author.instagram_url}" target="_blank" rel="noopener" style="color: #007bff; text-decoration: none; font-weight: 500;">📷 Instagram</a>` : ''}
                  ${author.youtube_url ? `<a href="${author.youtube_url}" target="_blank" rel="noopener" style="color: #007bff; text-decoration: none; font-weight: 500;">🎥 YouTube</a>` : ''}
                </div>
              </div>
            </section>
          `;
        }
      } catch (error) {
        console.error('Error fetching author for bio:', error);
      }
    }

    // ✅ FASE 6: Usar buildMetaTags com imagesGallery
    const metaTags = buildMetaTags({
      title: blogVersion.title,
      description: blogVersion.metaDescription || blogVersion.meta_description || '',
      canonicalUrl: `https://${domain}`,
      domain: domain,
      ogType: 'article',
      twitterCard: 'summary_large_image',
      keywords: blogVersion.keywords,
      robots: 'index, follow',
      imagesGallery: imagesGallery.length > 0 ? imagesGallery : undefined,
      // Fallback se não houver galeria: primeira imagem do produto
      ogImage: imagesGallery.length > 0 ? undefined : landingPageData?.hero_image_url || ''
    });

    // Generate SEO optimized HTML directly
    const processedContent = processContentWithIntelligentLinks(blogVersion.content);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  ${metaTags}
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="${authorInfo?.name || domain}">
  <meta name="generator" content="SEO Blog Generator">
  <meta name="theme-color" content="#007bff">
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${blogVersion.title}",
    "description": "${blogVersion.metaDescription || blogVersion.meta_description || ''}",
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}",
    ${imagesGallery.length > 0 ? `"image": ${JSON.stringify(imagesGallery.map(img => img.url))},` : ''}
    "author": {
      "@type": "Person",
      "name": "${authorInfo?.name || domain}"
    },
    "publisher": {
      "@type": "Organization", 
      "name": "${domain}"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://${domain}"
    }
  }
  </script>
  
  <!-- Enhanced CSS Styling -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.7;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    
    header {
      margin-bottom: 40px;
      border-bottom: 3px solid #007bff;
      padding-bottom: 20px;
    }
    
    h1 {
      color: #1a1a1a;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .meta-info {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
    
    .content {
      font-size: 1.1rem;
      line-height: 1.7;
    }
    
    .content h2 {
      color: #2c3e50;
      font-size: 1.8rem;
      margin: 30px 0 15px 0;
      border-left: 4px solid #007bff;
      padding-left: 15px;
    }
    
    .content h3 {
      color: #34495e;
      font-size: 1.4rem;
      margin: 25px 0 12px 0;
    }
    
    .content p {
      margin-bottom: 18px;
      text-align: justify;
    }
    
    .content ul, .content ol {
      margin: 15px 0 15px 30px;
    }
    
    .content li {
      margin-bottom: 8px;
    }
    
    .content a {
      color: #007bff;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.3s ease;
    }
    
    .content a:hover {
      border-bottom-color: #007bff;
      text-decoration: none;
    }
    
    .content blockquote {
      background: #f8f9fa;
      border-left: 4px solid #007bff;
      margin: 20px 0;
      padding: 15px 20px;
      font-style: italic;
    }
    
    .content strong {
      color: #2c3e50;
    }
    
    .author-section {
      margin-top: 40px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      border-left: 4px solid #007bff;
    }
    
    .keywords {
      margin-top: 30px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #28a745;
    }
    
    .keywords h4 {
      color: #28a745;
      margin-bottom: 10px;
    }
    
    .keywords .tag {
      display: inline-block;
      background: #e9ecef;
      color: #495057;
      padding: 4px 8px;
      margin: 2px;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    
    footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      .content h2 {
        font-size: 1.5rem;
      }
      
      .content h3 {
        font-size: 1.2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${blogVersion.title}</h1>
      <div class="meta-info">
        ${authorInfo ? `Por ${authorInfo.name} • ` : ''}Publicado em ${new Date().toLocaleDateString('pt-BR')}
        • ${domain}
      </div>
    </header>
    
    <main>
      <article class="content">
        ${processedContent}
        ${authorSection}
      </article>
      
      <section class="keywords">
        <h4>🏷️ Palavras-chave relacionadas:</h4>
        <div>
          ${blogVersion.keywords.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
        </div>
      </section>
    </main>
    
    <footer>
      <p>&copy; ${new Date().getFullYear()} ${domain}. Todos os direitos reservados.</p>
      <p><small>URL: https://${domain}</small></p>
    </footer>
  </div>
</body>
</html>`;
  };

  const copyToClipboard = async (domain: 'dentala' | 'eodonto') => {
    if (!blogVersions) return;
    
    const blogVersion = blogVersions[domain];
    const domainName = domain === 'dentala' ? 'dentala.com.br' : 'eodonto.com';
    const html = await generateCompleteHTML(blogVersion, domainName);
    
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "Copiado!",
        description: `HTML do blog ${domain} copiado para a área de transferência`,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao copiar HTML para a área de transferência",
        variant: "destructive",
      });
    }
  };

  const selectedAuthor = kols.find(kol => kol.id === selectedAuthorId && selectedAuthorId !== "none");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Gerador de Blog Duplo</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Author Selection */}
          <div className="space-y-2">
            <Label htmlFor="author-select">Selecionar Autor (Opcional)</Label>
            <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um especialista..." />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                <SelectItem value="none">Sem autor</SelectItem>
                {kols.filter(kol => kol.id && kol.id.trim() !== '').map((kol) => (
                  <SelectItem key={kol.id} value={kol.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={kol.photo_url} alt={kol.full_name} />
                        <AvatarFallback>{kol.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{kol.full_name}</span>
                      {kol.specialty && (
                        <span className="text-muted-foreground">- {kol.specialty}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAuthor && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedAuthor.photo_url} alt={selectedAuthor.full_name} />
                    <AvatarFallback>{selectedAuthor.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedAuthor.full_name}</p>
                    {selectedAuthor.specialty && (
                      <p className="text-sm text-muted-foreground">{selectedAuthor.specialty}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={generateDualVersions} 
            disabled={generating || kolsLoading}
            className="w-full"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Gerando versões...
              </>
            ) : (
              'Gerar Versões para Dentala e Eodonto'
            )}
          </Button>

          {error && (
            <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
              Erro: {error}
            </div>
          )}

          {blogVersions && (
            <Tabs defaultValue="dentala" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dentala" className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Dentala</span>
                </TabsTrigger>
                <TabsTrigger value="eodonto" className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>Eodonto</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dentala" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Versão Dentala</h3>
                    <Button 
                      onClick={() => copyToClipboard('dentala')}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar HTML
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Título:</h4>
                    <p className="text-lg font-semibold">{blogVersions.dentala.title}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Meta Descrição:</h4>
                    <p className="text-sm">{blogVersions.dentala.metaDescription}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Conteúdo (Preview):</h4>
                    <div className="text-sm bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      {blogVersions.dentala.content.substring(0, 200)}...
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {blogVersions.dentala.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="eodonto" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Versão Eodonto</h3>
                    <Button 
                      onClick={() => copyToClipboard('eodonto')}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar HTML
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Título:</h4>
                    <p className="text-lg font-semibold">{blogVersions.eodonto.title}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Meta Descrição:</h4>
                    <p className="text-sm">{blogVersions.eodonto.metaDescription}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Conteúdo (Preview):</h4>
                    <div className="text-sm bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      {blogVersions.eodonto.content.substring(0, 200)}...
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {blogVersions.eodonto.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}