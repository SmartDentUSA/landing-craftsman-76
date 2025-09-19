import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Edit3, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface BlogPreviewProps {
  landingPageId: string;
  landingPageData: any;
  onEditBlog?: () => void;
}

interface BlogPost {
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
}

export function BlogPreview({ landingPageId, landingPageData, onEditBlog }: BlogPreviewProps) {
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Generate blog preview automatically when component mounts or data changes
  useEffect(() => {
    if (landingPageData && (!blogPost || shouldRegenerate())) {
      generateBlogPreview();
    }
  }, [landingPageData]);

  const shouldRegenerate = () => {
    // Simple check to see if we should regenerate based on data freshness
    return !blogPost || !blogPost.title;
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
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Preview do Blog IA</CardTitle>
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
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

              <div className="prose prose-sm max-w-none">
                <div 
                  className="text-sm text-gray-700 line-clamp-6"
                  dangerouslySetInnerHTML={{ 
                    __html: blogPost.content
                      .replace(/#{1,6}\s/g, '')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/^/, '<p>')
                      .replace(/$/, '</p>')
                  }}
                />
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
  );
}