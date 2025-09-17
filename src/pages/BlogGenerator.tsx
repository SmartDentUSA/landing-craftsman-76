import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import useLandingPages from "@/hooks/useLandingPages";
import { Loader2, Eye, Send, ArrowLeft, Sparkles, Plus, Trash2, Link } from "lucide-react";

interface BlogPost {
  id?: string;
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  youtube_video_url: string;
  status: string;
  published_domains: string[];
  intelligent_links: Record<string, string>;
}

interface LandingPageData {
  id: string;
  title: string;
  description: string;
  content: any;
}

export default function BlogGenerator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getLandingPage } = useLandingPages();
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [blogPost, setBlogPost] = useState<BlogPost>({
    title: "",
    content: "",
    meta_description: "",
    keywords: [],
    youtube_video_url: "",
    status: "draft",
    published_domains: [],
    intelligent_links: {},
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadLandingPage();
      loadExistingBlogPost();
    }
  }, [id]);

  const loadLandingPage = async () => {
    try {
      const { data, error } = await supabase
        .from("approved_reviews")
        .select("*")
        .eq("landing_page_id", id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLandingPage({
          id: data.landing_page_id,
          title: "Landing Page",
          description: data.notes || "",
          content: data,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar landing page:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da landing page.",
        variant: "destructive",
      });
    }
  };

  const loadExistingBlogPost = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("landing_page_id", id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Get intelligent links from Editor data if available
        const editorData = getLandingPage(id || "");
        const editorIntelligentLinks = editorData?.data?.seo?.intelligent_links || {};
        
        setBlogPost({
          id: data.id,
          title: data.title,
          content: data.content,
          meta_description: data.meta_description || "",
          keywords: data.keywords || [],
          youtube_video_url: data.youtube_video_url || "",
          status: data.status,
          published_domains: data.published_domains || [],
          intelligent_links: {
            ...editorIntelligentLinks,
            ...(data.intelligent_links as Record<string, string> || {})
          },
        });
      } else {
        // If no blog post exists, pre-load with Editor's intelligent links
        const editorData = getLandingPage(id || "");
        const editorIntelligentLinks = editorData?.data?.seo?.intelligent_links || {};
        
        if (Object.keys(editorIntelligentLinks).length > 0) {
          setBlogPost(prev => ({
            ...prev,
            intelligent_links: { ...prev.intelligent_links, ...editorIntelligentLinks }
          }));
          toast({
            title: "Links carregados!",
            description: `${Object.keys(editorIntelligentLinks).length} links inteligentes importados do Editor.`
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar blog post:", error);
    }
  };

  const generateBlogContent = async () => {
    if (!landingPage) return;

    setGenerating(true);
    try {
      // Gerar título com AI
      const titleResponse = await supabase.functions.invoke("ai-seo-generator", {
        body: {
          type: "seo_title",
          content: `Landing page sobre: ${landingPage.description}`,
        },
      });

      // Gerar meta description
      const metaResponse = await supabase.functions.invoke("ai-seo-generator", {
        body: {
          type: "meta_description",
          content: `Landing page sobre: ${landingPage.description}`,
        },
      });

      // Gerar keywords
      const keywordsResponse = await supabase.functions.invoke("ai-seo-generator", {
        body: {
          type: "keywords",
          content: `Landing page sobre: ${landingPage.description}`,
        },
      });

      // Gerar conteúdo do blog
      const contentResponse = await supabase.functions.invoke("ai-seo-generator", {
        body: {
          type: "blog_content",
          content: `Criar um artigo de blog baseado na landing page: ${landingPage.description}. 
          O artigo deve ter pelo menos 800 palavras, incluir subtítulos (h2, h3), 
          ser otimizado para SEO e incluir links estratégicos usando os links inteligentes fornecidos.
          
          CONTEXTO SMARTDENT: A Smartdent é líder em odontologia digital no Brasil, oferecendo:
          - Scanners intraorais BLZ Scanner
          - Treinamentos e capacitação completa
          - Fluxo digital integrado para consultórios
          - Tecnologia para implantodontia e prótese digital`,
          intelligent_links: blogPost.intelligent_links,
        },
      });

      if (titleResponse.data?.content) {
        setBlogPost(prev => ({ ...prev, title: titleResponse.data.content }));
      }

      if (metaResponse.data?.content) {
        setBlogPost(prev => ({ ...prev, meta_description: metaResponse.data.content }));
      }

      if (keywordsResponse.data?.content) {
        const keywords = Array.isArray(keywordsResponse.data.content) 
          ? keywordsResponse.data.content 
          : keywordsResponse.data.content.split(',').map((k: string) => k.trim());
        setBlogPost(prev => ({ ...prev, keywords }));
      }

      if (contentResponse.data?.content) {
        setBlogPost(prev => ({ ...prev, content: contentResponse.data.content }));
      }

      toast({
        title: "Conteúdo gerado",
        description: "O conteúdo do blog foi gerado com sucesso pela AI.",
      });
    } catch (error) {
      console.error("Erro ao gerar conteúdo:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar conteúdo do blog.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

const saveBlogPost = async () => {
    if (!landingPage) return;

    setLoading(true);
    try {
      // Also sync intelligent_links back to Editor data
      const { updateLandingPage } = useLandingPages.getState();
      const editorData = getLandingPage(id || "");
      if (editorData && editorData.data) {
        updateLandingPage(id || "", {
          data: {
            ...editorData.data,
            seo: {
              ...editorData.data.seo,
              intelligent_links: blogPost.intelligent_links
            }
          }
        });
      }
      const blogData = {
        landing_page_id: landingPage.id,
        title: blogPost.title,
        content: blogPost.content,
        meta_description: blogPost.meta_description,
        keywords: blogPost.keywords,
        youtube_video_url: blogPost.youtube_video_url,
        status: blogPost.status,
        intelligent_links: blogPost.intelligent_links,
      };

      if (blogPost.id) {
        const { error } = await supabase
          .from("blog_posts")
          .update(blogData)
          .eq("id", blogPost.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("blog_posts")
          .insert(blogData)
          .select()
          .single();

        if (error) throw error;
        setBlogPost(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Blog post salvo",
        description: "O blog post foi salvo com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar blog post:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar blog post.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const publishBlogPost = async () => {
    if (!blogPost.id) {
      await saveBlogPost();
    }

    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-blog-post", {
        body: {
          blog_post_id: blogPost.id,
          domains: ["eodonto.com", "dentala.com.br"],
        },
      });

      if (error) throw error;

      setBlogPost(prev => ({ 
        ...prev, 
        status: "published",
        published_domains: data.published_domains || ["eodonto.com", "dentala.com.br"]
      }));

      toast({
        title: "Blog post publicado",
        description: "O blog post foi publicado com sucesso nos domínios configurados.",
      });
    } catch (error) {
      console.error("Erro ao publicar blog post:", error);
      toast({
        title: "Erro",
        description: "Erro ao publicar blog post.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  if (!landingPage) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      <BreadcrumbNavigation />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerador de Blog Post</h1>
            <p className="text-muted-foreground">
              Landing Page: {landingPage.id}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={blogPost.status === "published" ? "default" : "secondary"}>
            {blogPost.status === "published" ? "Publicado" : "Rascunho"}
          </Badge>
          {blogPost.published_domains.length > 0 && (
            <Badge variant="outline">
              {blogPost.published_domains.length} domínio(s)
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Conteúdo do Blog Post
                <Button
                  onClick={generateBlogContent}
                  disabled={generating}
                  size="sm"
                  variant="outline"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar com AI
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={blogPost.title}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do blog post"
                />
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={blogPost.meta_description}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Descrição para SEO (máx. 160 caracteres)"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="keywords">Keywords (separadas por vírgula)</Label>
                <Input
                  id="keywords"
                  value={blogPost.keywords.join(", ")}
                  onChange={(e) => setBlogPost(prev => ({ 
                    ...prev, 
                    keywords: e.target.value.split(",").map(k => k.trim()).filter(k => k)
                  }))}
                  placeholder="palavra-chave1, palavra-chave2, palavra-chave3"
                />
              </div>

              <div>
                <Label htmlFor="youtube_url">URL do YouTube (opcional)</Label>
                <Input
                  id="youtube_url"
                  value={blogPost.youtube_video_url}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, youtube_video_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div>
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  value={blogPost.content}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Conteúdo do blog post em HTML ou Markdown"
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Inteligente com IA */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                SEO Inteligente com IA
              </CardTitle>
              <CardDescription>
                Configure links inteligentes que a IA usará contextualmente no conteúdo do blog
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Links Configurados</Label>
                <Button
                  onClick={() => {
                    const newLinks = { ...blogPost.intelligent_links };
                    newLinks[""] = "";
                    setBlogPost(prev => ({ ...prev, intelligent_links: newLinks }));
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Link
                </Button>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto">
                {Object.entries(blogPost.intelligent_links).map(([keyword, url], index) => (
                  <div key={index} className="flex gap-2 items-center p-3 border rounded-lg">
                    <div className="flex-1">
                      <Input
                        placeholder="Palavra-chave (ex: scanner intraoral)"
                        value={keyword}
                        onChange={(e) => {
                          const newLinks = { ...blogPost.intelligent_links };
                          delete newLinks[keyword];
                          newLinks[e.target.value] = url;
                          setBlogPost(prev => ({ ...prev, intelligent_links: newLinks }));
                        }}
                        className="mb-2"
                      />
                      <Input
                        placeholder="URL (ex: /produtos/scanner)"
                        value={url}
                        onChange={(e) => {
                          const newLinks = { ...blogPost.intelligent_links };
                          newLinks[keyword] = e.target.value;
                          setBlogPost(prev => ({ ...prev, intelligent_links: newLinks }));
                        }}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const newLinks = { ...blogPost.intelligent_links };
                        delete newLinks[keyword];
                        setBlogPost(prev => ({ ...prev, intelligent_links: newLinks }));
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {Object.keys(blogPost.intelligent_links).length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum link configurado</p>
                    <p className="text-xs">Clique em "Adicionar Link" para começar</p>
                  </div>
                )}
              </div>

              {/* Templates pré-definidos */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">Templates Smartdent</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const smartdentLinks = {
                        "scanner intraoral": "/produtos/scanner-intraoral",
                        "odontologia digital": "/servicos/odontologia-digital",
                        "fluxo digital": "/servicos/fluxo-digital",
                        "implantodontia digital": "/servicos/implantodontia",
                        "prótese digital": "/servicos/protese-digital",
                        "treinamento": "/treinamentos",
                        "capacitação": "/treinamentos/capacitacao",
                        "BLZ Scanner": "/produtos/blz-scanner",
                      };
                      setBlogPost(prev => ({ 
                        ...prev, 
                        intelligent_links: { ...prev.intelligent_links, ...smartdentLinks }
                      }));
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Template Smartdent
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-1">
                  <Sparkles className="h-4 w-4" />
                  Como funciona o SEO Inteligente
                </div>
                <p className="text-blue-700 text-xs">
                  A IA analisa o contexto do artigo e automaticamente insere os links quando as palavras-chave aparecem no texto, 
                  variando os anchor texts naturalmente para um SEO mais eficaz.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Preview
                <Button
                  onClick={() => setPreviewMode(!previewMode)}
                  size="sm"
                  variant="outline"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {previewMode ? "Editor" : "Preview"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewMode ? (
                <div className="prose prose-sm max-w-none">
                  <h1>{blogPost.title || "Título do blog post"}</h1>
                  <p className="text-muted-foreground">
                    {blogPost.meta_description}
                  </p>
                  {blogPost.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {blogPost.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: blogPost.content || "<p>Conteúdo aparecerá aqui...</p>" 
                    }} 
                  />
                  {blogPost.youtube_video_url && (
                    <div className="mt-4">
                      <h3>Vídeo relacionado:</h3>
                      <a href={blogPost.youtube_video_url} target="_blank" rel="noopener noreferrer">
                        {blogPost.youtube_video_url}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Clique em "Preview" para visualizar o blog post</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          onClick={saveBlogPost}
          disabled={loading || !blogPost.title || !blogPost.content}
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Rascunho"
          )}
        </Button>

        <Button
          onClick={publishBlogPost}
          disabled={publishing || !blogPost.title || !blogPost.content || blogPost.status === "published"}
        >
          {publishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Publicar nos Domínios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}