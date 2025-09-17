import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import useLandingPages from "@/hooks/useLandingPages";
import { generateBlogHTML } from "@/lib/template-engine";
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
  include_offers?: boolean;
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
  const location = useLocation();
  const { getLandingPage } = useLandingPages();
  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  // Helper function to ensure keywords is always an array
  const normalizeKeywords = (keywords: any): string[] => {
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === 'string') return keywords.split(',').map(k => k.trim()).filter(Boolean);
    return [];
  };

  const [blogPost, setBlogPost] = useState<BlogPost>({
    title: "",
    content: "",
    meta_description: "",
    keywords: [],
    youtube_video_url: "",
    status: "draft",
    published_domains: [],
    intelligent_links: {},
    include_offers: false,
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      // Check if data was passed from Editor
      const stateData = location.state as any;
      if (stateData?.fromEditor && stateData?.blogData && stateData?.landingPageData) {
        console.log("🔄 Carregando dados do Editor...");
        
        // Set landing page data from Editor
        setLandingPage({
          id: id,
          title: stateData.landingPageData.name || stateData.landingPageData.banner?.title || "Landing Page",
          description: stateData.landingPageData.banner?.subtitle || stateData.landingPageData.seo_description || "",
          content: stateData.landingPageData,
        });
        
        // Set blog data from Editor
        setBlogPost({
          ...stateData.blogData,
          keywords: normalizeKeywords(stateData.blogData.keywords || []),
          published_domains: Array.isArray(stateData.blogData.published_domains) 
            ? stateData.blogData.published_domains 
            : [],
          intelligent_links: stateData.blogData.intelligent_links || {},
        });
        
        toast({
          title: "Dados carregados do Editor!",
          description: "Continue editando seu blog post aqui.",
        });
      } else {
        loadLandingPageFromEditor();
        loadExistingBlogPost();
      }
    }
  }, [id, location.state]);

  const loadLandingPageFromEditor = async () => {
    try {
      console.log(`🔍 Carregando landing page do Editor com ID: "${id}"`);
      
      // Buscar dados do Editor (SEO Inteligente)
      const editorLandingPage = getLandingPage(id || "");
      
      if (editorLandingPage && editorLandingPage.data) {
        console.log(`✅ Landing page encontrada no Editor: "${editorLandingPage.name}"`);
        
        setLandingPage({
          id: editorLandingPage.id,
          title: editorLandingPage.name,
          description: editorLandingPage.data.banner?.title || editorLandingPage.data.banner?.subtitle || "Landing page do Editor",
          content: editorLandingPage.data,
        });

        // Pré-popular campos do blog com dados do SEO Inteligente
        const seoData = editorLandingPage.data.seo || {};
        
        setBlogPost(prev => ({
          ...prev,
          title: seoData.seo_title || prev.title,
          meta_description: seoData.seo_description || prev.meta_description,
          keywords: normalizeKeywords(seoData.ai_keywords || prev.keywords),
          intelligent_links: seoData.intelligent_links || prev.intelligent_links,
        }));

        if (seoData.seo_title || seoData.seo_description || seoData.ai_keywords) {
          toast({
            title: "SEO Inteligente carregado!",
            description: "Dados do SEO Inteligente importados com sucesso para o blog.",
          });
        }
        
        return;
      }

      // Fallback: buscar no Supabase como antes
      console.log(`⚠️ Landing page não encontrada no Editor. Buscando no Supabase...`);
      
      let { data, error } = await supabase
        .from("approved_reviews")
        .select("*")
        .eq("landing_page_id", id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLandingPage({
          id: data.landing_page_id,
          title: "Landing Page",
          description: data.notes || data.seo_hidden_content || "Landing page para geração de blog",
          content: data,
        });
        console.log(`✅ Landing page carregada do Supabase: "${data.landing_page_id}"`);
      } else {
        // Fallback final: dados genéricos
        console.log("⚠️ Nenhuma landing page encontrada. Usando dados genéricos...");
        setLandingPage({
          id: id || "generic",
          title: "Landing Page Genérica",
          description: "Conteúdo sobre odontologia digital e tecnologia SmartDent",
          content: null,
        });
        
        toast({
          title: "Aviso",
          description: "Nenhuma landing page específica encontrada. Usando dados genéricos para geração do blog.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar landing page:", error);
      
      setLandingPage({
        id: id || "generic",
        title: "Landing Page Genérica",
        description: "Conteúdo sobre odontologia digital e tecnologia SmartDent",
        content: null,
      });
      
      toast({
        title: "Erro de carregamento",
        description: "Erro ao carregar dados específicos. Usando dados genéricos para o blog.",
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
          keywords: normalizeKeywords(data.keywords || []),
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
          ser otimizado para SEO e incluir links estratégicos usando os links inteligentes fornecidos.`,
          title: blogPost.title || landingPage.title,
          intelligent_links: blogPost.intelligent_links,
          speed: "detailed",
          fullLandingPageContent: landingPage.content || {
            banner: {
              title: landingPage.title,
              subtitle: landingPage.description
            },
            solutions: landingPage.content?.solutions || {
              title: "Nossas Soluções",
              items: []
            },
            faq: landingPage.content?.faq || {
              title: "Perguntas Frequentes", 
              items: []
            },
            seo: landingPage.content?.seo || {
              hidden_content: landingPage.description,
              description: landingPage.description
            }
          }
        },
      });

      if (titleResponse.data?.content) {
        setBlogPost(prev => ({ ...prev, title: titleResponse.data.content }));
      }

      if (metaResponse.data?.content) {
        setBlogPost(prev => ({ ...prev, meta_description: metaResponse.data.content }));
      }

      if (keywordsResponse.data?.content) {
        const keywords = normalizeKeywords(keywordsResponse.data.content);
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
      
      console.log("💾 Salvando blog post com dados:", {
        title: blogPost.title,
        hasContent: !!blogPost.content,
        includeOffers: blogPost.include_offers
      });
      
      const blogData = {
        landing_page_id: landingPage.id,
        title: blogPost.title || "",
        content: blogPost.content || "",
        meta_description: blogPost.meta_description || "",
        keywords: blogPost.keywords || [],
        youtube_video_url: blogPost.youtube_video_url || "",
        status: blogPost.status || "draft",
        intelligent_links: blogPost.intelligent_links || {},
        include_offers: blogPost.include_offers || false,
      };

      if (blogPost.id) {
        const { error } = await supabase
          .from("blog_posts")
          .update(blogData)
          .eq("id", blogPost.id);

        if (error) throw error;
        
        toast({
          title: "Blog post atualizado",
          description: "O blog post foi atualizado com sucesso.",
        });
      } else {
        const { data, error } = await supabase
          .from("blog_posts")
          .insert(blogData)
          .select()
          .single();

        if (error) throw error;
        setBlogPost(prev => ({ ...prev, id: data.id }));
        
        toast({
          title: "Blog post criado",
          description: "O blog post foi criado com sucesso.",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar blog post:", error);
      toast({
        title: "Erro",
        description: `Erro ao salvar blog post: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para processar conteúdo aplicando intelligent_links
  const processContentWithIntelligentLinks = (content: string) => {
    if (!content || !blogPost.intelligent_links) return content;
    
    let processedContent = content;
    
    // Aplicar cada link inteligente
    Object.entries(blogPost.intelligent_links).forEach(([keyword, url]) => {
      if (keyword && url) {
        // Criar regex para encontrar a palavra-chave (case insensitive, word boundary)
        const regex = new RegExp(`\\b(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
        
        // Substituir apenas a primeira ocorrência para evitar links excessivos
        let replaced = false;
        processedContent = processedContent.replace(regex, (match) => {
          if (!replaced) {
            replaced = true;
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">${match}</a>`;
          }
          return match;
        });
      }
    });
    
    return processedContent;
  };

  // Função para gerar HTML completo do preview (igual ao Editor)
  const generateBlogPreviewHTML = () => {
    if (!blogPost.title && !blogPost.content) {
      return '<div style="padding: 2rem; text-align: center; color: #666; font-family: Inter, sans-serif;">Configure o título e conteúdo para visualizar o blog post</div>';
    }

    try {
      // Processar conteúdo com links inteligentes
      const processedContent = processContentWithIntelligentLinks(blogPost.content || '');
      
      // Criar objeto de dados do blog com conteúdo processado
      const blogData = {
        ...blogPost,
        content: processedContent,
        landing_page_title: landingPage?.content?.seo_title || "Nossa Solução",
        landing_page_url: landingPage?.content?.seo?.canonical_url || "#",
        created_at: new Date().toISOString(),
        cover_image: landingPage?.content?.banner?.images?.[0] || null,
        content_images: landingPage?.content?.solutions?.map((s: any) => s.image) || []
      };

      return generateBlogHTML(blogData, landingPage?.content);
    } catch (error) {
      console.error('Erro ao gerar preview do blog:', error);
      return '<div style="padding: 2rem; text-align: center; color: #f00; font-family: Inter, sans-serif;">Erro ao gerar preview do blog</div>';
    }
  };

  const publishBlogPost = async () => {
    // Ensure we have a saved blog post before publishing
    if (!blogPost.id) {
      console.log("📝 Salvando blog post antes de publicar...");
      await saveBlogPost();
      
      // Wait a moment for state to update
      if (!blogPost.id) {
        toast({
          title: "Erro",
          description: "Erro ao salvar blog post. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!blogPost.id) {
      toast({
        title: "Erro",
        description: "ID do blog post não encontrado. Salve o post primeiro.",
        variant: "destructive",
      });
      return;
    }

    setPublishing(true);
    try {
      console.log("🚀 Publicando blog post:", blogPost.id);
      
      const { data, error } = await supabase.functions.invoke("publish-blog-post", {
        body: {
          blog_post_id: blogPost.id,
          domains: ["eodonto.com", "dentala.com.br"],
        },
      });

      if (error) throw error;

      if (data.success) {
        setBlogPost(prev => ({
          ...prev,
          status: "published",
          published_domains: data.published_domains || []
        }));
        
        // Mensagem de sucesso com detalhes
        let successMessage = `✅ Publicado em ${data.published_domains.length} site(s): ${data.published_domains.join(', ')}`;
        
        if (data.errors && data.errors.length > 0) {
          successMessage += `\n\n⚠️ Alguns problemas: ${data.errors.join('; ')}`;
        }

        // Log URLs para debug
        if (data.published_domains.includes('eodonto.com')) {
          const filename = blogPost.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
          console.log(`📂 Conteúdo publicado em: https://eodonto.com/blog/${filename}.html`);
        }

        toast({
          title: "Publicação Realizada!",
          description: successMessage,
        });
      } else {
        let errorMessage = data.message || data.error || "Falha na publicação";
        
        if (data.errors && data.errors.length > 0) {
          errorMessage += `\n\nDetalhes: ${data.errors.join('; ')}`;
        }

        toast({
          title: "Erro na publicação",
          description: errorMessage,
          variant: "destructive",
        });
      }
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
            <h1 className="text-3xl font-bold">Editor de Blog Post</h1>
            <p className="text-muted-foreground">
              Edite o conteúdo e publique seu blog post
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={blogPost.status === "published" ? "default" : "secondary"}>
            {blogPost.status === "published" ? "Publicado" : "Rascunho"}
          </Badge>
          {blogPost.published_domains?.length > 0 && (
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
                Editar Conteúdo
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
              {/* SEO Data Display (Read-only) */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Dados SEO (editáveis no Editor)</div>
                <div>
                  <span className="text-xs text-muted-foreground">Título:</span>
                  <p className="text-sm font-medium">{blogPost.title || "Não definido"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Meta Description:</span>
                  <p className="text-sm">{blogPost.meta_description || "Não definida"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {normalizeKeywords(blogPost.keywords).map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/editor/${id}`)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                >
                  ← Editar SEO no Editor
                </Button>
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

              {(() => {
                // Debug offers data
                console.log("🔍 Verificando ofertas:", {
                  hasContent: !!landingPage?.content,
                  hasSchema: !!landingPage?.content?.schema,
                  hasOffers: !!landingPage?.content?.schema?.offers,
                  offersLength: landingPage?.content?.schema?.offers?.length,
                  allOffers: landingPage?.content?.schema?.offers
                });
                return null;
              })()}
              
              {landingPage?.content?.schema?.offers && landingPage.content.schema.offers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={blogPost.include_offers || false}
                    onCheckedChange={(checked) => setBlogPost(prev => ({ ...prev, include_offers: checked }))}
                  />
                  <Label>Incluir ofertas no blog ({landingPage.content.schema.offers.length} disponíveis)</Label>
                </div>
              )}
              
              {/* Fallback check for other possible offer structures */}
              {(!landingPage?.content?.schema?.offers || landingPage.content.schema.offers.length === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-yellow-800 text-sm">
                    <strong>Info:</strong> Nenhuma oferta configurada na landing page. Configure ofertas no Editor para ativá-las aqui.
                  </div>
                </div>
              )}

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
                {Object.entries(blogPost.intelligent_links || {}).map(([keyword, url], index) => (
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
                Preview Final
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
                <div className="w-full h-full">
                  <iframe
                    srcDoc={generateBlogPreviewHTML()}
                    className="w-full h-full border-0 bg-white rounded"
                    style={{ minHeight: '600px' }}
                    title="Blog Preview"
                  />
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
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : blogPost.id ? (
            "Atualizar Rascunho"
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