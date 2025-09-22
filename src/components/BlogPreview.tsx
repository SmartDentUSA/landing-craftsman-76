import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Edit3, Sparkles, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DualBlogGeneratorWithKOL } from "./DualBlogGeneratorWithKOL";

interface BlogPreviewProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
  onEditBlog?: () => void;
}

interface BlogPost {
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
}

export function BlogPreview({ landingPageId, landingPageData, selectedProductIds, onEditBlog }: BlogPreviewProps) {
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedBlog, setPublishedBlog] = useState<any>(null);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch published blog and check sync status
  useEffect(() => {
    fetchPublishedBlog();
  }, [landingPageId]);

  // Generate blog preview automatically when component mounts or data changes
  useEffect(() => {
    if (landingPageData && (!blogPost || shouldRegenerate())) {
      generateBlogPreview();
    }
  }, [landingPageData]);

  // Check sync status when both preview and published blogs are available
  useEffect(() => {
    if (blogPost && publishedBlog && landingPageData) {
      checkSyncStatus();
    }
  }, [blogPost, publishedBlog, landingPageData]);

  const fetchPublishedBlog = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPublishedBlog(data[0]);
        console.log('📖 Blog publicado encontrado:', {
          id: data[0].id,
          title: data[0].title,
          status: data[0].status
        });
      } else {
        console.log('📭 Nenhum blog publicado encontrado para:', landingPageId);
      }
    } catch (error) {
      console.error('Erro ao buscar blog publicado:', error);
    }
  };

  const checkSyncStatus = () => {
    if (!blogPost || !publishedBlog || !landingPageData) return;

    // Compare key data points to determine if out of sync
    const currentTitle = landingPageData?.banner?.title || landingPageData?.seo_title;
    const publishedTitle = publishedBlog.title;
    
    const currentDescription = landingPageData?.seo_description;
    const publishedDescription = publishedBlog.meta_description;

    // Simple check - if titles or descriptions are different, consider out of sync
    const titlesDifferent = currentTitle && publishedTitle && currentTitle !== publishedTitle;
    const descriptionsDifferent = currentDescription && publishedDescription && currentDescription !== publishedDescription;
    
    setIsOutOfSync(titlesDifferent || descriptionsDifferent);
  };

  const shouldRegenerate = () => {
    // Don't regenerate if we already have a blog and published blog exists
    if (blogPost && publishedBlog) return false;
    
    // Only regenerate if we have no preview or published blog
    return !blogPost || (!publishedBlog && !blogPost.title);
  };

  const generateBlogPreview = async () => {
    setGenerating(true);
    setError(null);

    try {
      console.log("🔄 Gerando preview do blog para:", landingPageId);

      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          type: 'blog_content',
          landingPageId,
          landingPage: landingPageData,
          selectedProductIds: selectedProductIds || [],
          include_offers: true
        }
      });

      if (error) throw error;

      if (data?.success && data?.content) {
        setBlogPost({
          title: data.content.title || "Blog Post Gerado",
          content: data.content.content || "Conteúdo em desenvolvimento...",
          meta_description: data.content.meta_description || "",
          keywords: data.content.keywords || [],
          status: "preview"
        });

        console.log("✅ Blog preview gerado com sucesso");
      } else {
        throw new Error("Erro na geração do conteúdo");
      }
    } catch (err: any) {
      console.error("❌ Erro ao gerar blog preview:", err);
      setError(err.message || "Erro ao gerar preview do blog");
      
      // Fallback preview with available data
      setBlogPost({
        title: landingPageData?.banner?.title || landingPageData?.seo_title || "Seu Blog Post",
        content: `
# ${landingPageData?.banner?.title || "Título do Artigo"}

${landingPageData?.banner?.subtitle || "Subtítulo do artigo baseado nos dados da landing page."}

## Introdução

Conteúdo gerado automaticamente baseado nos dados da sua landing page...

## Principais Benefícios

${landingPageData?.solutions?.map((s: any, i: number) => `${i + 1}. ${s.text}`).join('\n') || "• Benefício 1\n• Benefício 2\n• Benefício 3"}

## Conclusão

Para mais informações, entre em contato conosco.
        `.trim(),
        meta_description: landingPageData?.seo_description || "Artigo sobre " + (landingPageData?.banner?.title || "nossos serviços"),
        keywords: ["blog", "artigo", landingPageData?.banner?.title].filter(Boolean),
        status: "fallback"
      });
    } finally {
      setGenerating(false);
    }
  };

  const syncPublishedBlog = async () => {
    if (!publishedBlog) {
      toast({
        title: "Erro",
        description: "Nenhum blog publicado encontrado para sincronizar",
        variant: "destructive"
      });
      return;
    }

    setSyncing(true);
    
    try {
      // Generate new content with current landing page data
      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          type: 'blog_content',
          landingPageId,
          landingPage: landingPageData,
          selectedProductIds: selectedProductIds || [],
          include_offers: true
        }
      });

      if (error) throw error;

      if (data?.success && data?.content) {
        // Update the published blog with new content
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            title: data.content.title,
            content: data.content.content,
            meta_description: data.content.meta_description,
            keywords: data.content.keywords,
            updated_at: new Date().toISOString()
          })
          .eq('id', publishedBlog.id);

        if (updateError) throw updateError;

        // Refresh published blog data
        await fetchPublishedBlog();
        
        // Regenerate preview to match
        await generateBlogPreview();

        toast({
          title: "Sincronizado",
          description: "Blog publicado atualizado com sucesso!"
        });
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar blog:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao atualizar blog publicado",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleEditBlog = () => {
    if (onEditBlog) {
      onEditBlog();
    } else {
      // Navigate to BlogGenerator with current data
      navigate(`/blog-generator/${landingPageId}`, {
        state: {
          fromEditor: true,
          blogData: blogPost,
          landingPageData: landingPageData
        }
      });
    }
  };

  const getDataQuality = () => {
    let score = 0;
    if (landingPageData?.banner?.title) score += 25;
    if (landingPageData?.banner?.subtitle) score += 25;
    if (landingPageData?.seo_description) score += 25;
    if (landingPageData?.solutions?.length > 0) score += 25;
    return score;
  };

  const dataQuality = getDataQuality();

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Preview do Blog IA</CardTitle>
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            {syncing && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
          </div>
          <div className="flex items-center gap-2">
            {isOutOfSync && publishedBlog && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Desatualizado
              </Badge>
            )}
            {publishedBlog && !isOutOfSync && (
              <Badge variant="default" className="text-xs">
                Sincronizado
              </Badge>
            )}
            {dataQuality < 100 && (
              <Badge variant="secondary" className="text-xs">
                Dados: {dataQuality}%
              </Badge>
            )}
            {blogPost?.status === "fallback" && (
              <Badge variant="outline" className="text-xs">
                Preview Limitado
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">
              ⚠️ {error} - Usando preview básico
            </p>
          </div>
        )}

        {isOutOfSync && publishedBlog && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700">
              ⚠️ <strong>Blog desatualizado:</strong> O blog publicado está diferente dos dados atuais da landing page
            </p>
          </div>
        )}

        {dataQuality < 100 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              💡 <strong>Dica:</strong> Complete os dados SEO para melhorar a qualidade do blog
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {blogPost ? (
          <>
            <div className="border rounded-lg p-4 bg-white space-y-3">
              <h3 className="font-semibold text-lg line-clamp-2">{blogPost.title}</h3>
              
              {blogPost.meta_description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {blogPost.meta_description}
                </p>
              )}

              <div className="space-y-4">
                <div 
                  className={`prose prose-sm max-w-none transition-all duration-300 ${expanded ? '' : 'line-clamp-6'}`}
                  dangerouslySetInnerHTML={{ 
                    __html: blogPost.content
                      .replace(/#{1,6}\s/g, '')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/^/, '<p>')
                      .replace(/$/, '</p>')
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary hover:text-primary-foreground"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? 'Ler menos' : 'Ler mais'}
                </Button>
              </div>

              {blogPost.keywords && blogPost.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {blogPost.keywords.slice(0, 5).map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {blogPost.keywords.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{blogPost.keywords.length - 5} mais
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEditBlog}
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Editar Blog Completo
              </Button>

              {isOutOfSync && publishedBlog && (
                <Button 
                  onClick={syncPublishedBlog}
                  disabled={syncing}
                  size="sm"
                  variant="default"
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button 
                onClick={generateBlogPreview}
                disabled={generating}
                size="sm"
                variant="secondary"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Gerando preview do blog...</p>
          </div>
        )}
      </CardContent>
    </Card>

    <DualBlogGeneratorWithKOL 
      landingPageId={landingPageId}
      landingPageData={landingPageData}
      selectedProductIds={selectedProductIds}
    />
  </div>
  );
}