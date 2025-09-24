import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SelectedProductLinkModal } from "@/components/SelectedProductLinkModal";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { useProductKeywordsAggregator } from "@/hooks/useProductKeywordsAggregator";
import { useLandingPageKeywordsExtractor } from "@/hooks/useLandingPageKeywordsExtractor";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import useLandingPages from "@/hooks/useLandingPages";
import { generateBlogHTML } from "@/lib/template-engine";
import { processContentWithIntelligentLinks } from "@/lib/intelligent-links";
import { normalizeAiBlog, normalizeKeywords } from "@/lib/blog-utils";
import { Loader2, Eye, Send, ArrowLeft, Sparkles, Plus, Trash2, Link, Tag } from "lucide-react";

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

interface DualBlogVersions {
  dentala: BlogPost;
  eodonto: BlogPost;
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
  // Note: normalizeKeywords function moved to src/lib/blog-utils.ts

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
  const [dualVersions, setDualVersions] = useState<DualBlogVersions | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<'dentala' | 'eodonto'>('dentala');
  const [isDualMode, setIsDualMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [intelligentLinks, setIntelligentLinks] = useState<Record<string, string>>({});
  const [linkMappings, setLinkMappings] = useState<any[]>([]);
  const [showLinkPreview, setShowLinkPreview] = useState(false);
  const { toast } = useToast();
  const { loadProductsByIds } = useSelectedProducts();
  const { getSelectedProducts } = useLandingPages();
  const { aggregateKeywordsFromProducts, enrichKeywordsWithCategories } = useProductKeywordsAggregator();
  const { extractKeywordsFromLandingPage, extracting: extractingKeywords } = useLandingPageKeywordsExtractor();

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
        const newBlogPost = {
          ...stateData.blogData,
          keywords: normalizeKeywords(stateData.blogData.keywords || []),
          published_domains: Array.isArray(stateData.blogData.published_domains) 
            ? stateData.blogData.published_domains 
            : [],
          intelligent_links: stateData.blogData.intelligent_links || {},
        };
        
        setBlogPost(newBlogPost);
        
        // Ativar preview se tiver conteúdo
        if (newBlogPost.title && newBlogPost.content) {
          setPreviewMode(true);
        }
        
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

  // Auto-generate blog content when landing page is loaded but no blog content exists
  useEffect(() => {
    if (landingPage && !blogPost.content && !generating && !loading) {
      console.log("🚀 Auto-gerando conteúdo do blog...");
      generateBlogContent();
    }
  }, [landingPage]);

  // Load selected products from landing page
  useEffect(() => {
    const loadSelectedProductsData = async () => {
      if (id) {
        const selectedProductIds = getSelectedProducts(id);
        console.log('🔍 BlogGenerator - Verificando produtos selecionados:', {
          landingPageId: id,
          selectedProductIds,
          selectedProductIdsLength: selectedProductIds?.length
        });

        if (selectedProductIds?.length > 0) {
          console.log('📦 BlogGenerator - Carregando produtos:', selectedProductIds);
          try {
            const products = await loadProductsByIds(selectedProductIds);
            console.log('✅ BlogGenerator - Produtos carregados:', products);
            setSelectedProducts(products);
          } catch (error) {
            console.error('❌ BlogGenerator - Erro ao carregar produtos:', error);
            setSelectedProducts([]);
          }
        } else {
          console.log('⚠️ BlogGenerator - Nenhum produto selecionado ou array vazio');
          setSelectedProducts([]);
        }
      }
    };

    loadSelectedProductsData();
  }, [id, getSelectedProducts, loadProductsByIds]);

  // Auto-save draft when blog post data changes
  useEffect(() => {
    if (landingPage && (blogPost.title || blogPost.content) && !loading && !generating && !publishing) {
      const timeoutId = setTimeout(() => {
        saveBlogDraft();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [blogPost.title, blogPost.content, blogPost.meta_description, blogPost.keywords]);

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
        console.log("📝 Blog post existente encontrado:", data);
        
        // Get intelligent links from Editor data if available
        const editorData = getLandingPage(id || "");
        const editorIntelligentLinks = editorData?.data?.seo?.intelligent_links || {};
        
        const loadedBlogPost = {
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
        };
        
        setBlogPost(loadedBlogPost);
        
        // Ativar preview se tiver conteúdo
        if (loadedBlogPost.title && loadedBlogPost.content) {
          setPreviewMode(true);
        }
        
        console.log("✅ Blog post carregado com preview:", {
          hasTitle: !!loadedBlogPost.title,
          hasContent: !!loadedBlogPost.content,
          previewActivated: !!(loadedBlogPost.title && loadedBlogPost.content)
        });
      } else {
        console.log("📝 Nenhum blog post existente encontrado");
        
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
      console.error("❌ Erro ao carregar blog post:", error);
    }
  };

  const generateBlogContent = async () => {
    if (!landingPage) return;

    // Ensure selected products are loaded before generating content
    const selectedProductIds = getSelectedProducts(landingPage.id) || [];
    
    if (selectedProductIds.length > 0 && selectedProducts.length === 0) {
      console.log('⏳ Aguardando carregamento dos produtos antes de gerar conteúdo...');
      toast({
        title: "Carregando produtos",
        description: "Aguarde enquanto carregamos os produtos selecionados...",
        variant: "default"
      });
      return;
    }

    console.log('🚀 Gerando conteúdo de blog com produtos:', {
      selectedProductIds,
      selectedProductsLoaded: selectedProducts.length,
      isDualMode
    });

    setGenerating(true);
    try {
      if (isDualMode) {
        // Gerar versões duplas
        const dualResponse = await supabase.functions.invoke("ai-content-generator", {
          body: {
            type: "dual_blog_versions",
            landingPageId: landingPage.id,
            selectedProductIds: getSelectedProducts(landingPage.id) || [],
            landingPageData: landingPage.content || {},
            contentData: landingPage.content || {}, // For compatibility with Edge Function
            primaryKeyword: blogPost.keywords?.[0] || landingPage.title,
          },
        });

        console.log("🔍 BlogGenerator - Resposta dual da AI:", dualResponse.data);

        // Get the content from the correct path: data.content or fallback to data
        const payload = dualResponse.data?.content || dualResponse.data;
        
        if (payload?.dentala && payload?.eodonto) {
          console.log("✅ BlogGenerator - Versões encontradas:", { dentala: payload.dentala, eodonto: payload.eodonto });
          
          // Normalize both versions
          const normalizedDentala = normalizeAiBlog(payload.dentala);
          const normalizedEodonto = normalizeAiBlog(payload.eodonto);
          
          setDualVersions({
            dentala: {
              ...blogPost,
              ...normalizedDentala,
            },
            eodonto: {
              ...blogPost,
              ...normalizedEodonto,
            }
          });
          
          // Update current blog post with selected version
          const selectedNormalized = selectedDomain === 'dentala' ? normalizedDentala : normalizedEodonto;
          setBlogPost(prev => ({
            ...prev,
            ...selectedNormalized,
          }));
        } else {
          console.error("❌ BlogGenerator - Versões não encontradas na resposta:", payload);
        }
      } else {
        // Gerar conteúdo único
        const contentResponse = await supabase.functions.invoke("ai-content-generator", {
          body: {
            type: "blog_content",
            landingPageId: landingPage.id,
            selectedProductIds: getSelectedProducts(landingPage.id) || [],
            landingPageData: landingPage.content || {},
            contentData: landingPage.content || {}, // For compatibility with Edge Function
            primaryKeyword: blogPost.keywords?.[0] || landingPage.title,
          },
        });

        console.log("🔍 BlogGenerator - Resposta single da AI:", contentResponse.data);

        // Get the content from the correct path: data.content or fallback to data
        const payload = contentResponse.data?.content || contentResponse.data;
        
        if (payload?.title && payload?.content) {
          console.log("✅ BlogGenerator - Conteúdo encontrado:", payload);
          
          // Normalize the response
          const normalizedContent = normalizeAiBlog(payload);
          
          setBlogPost(prev => ({
            ...prev,
            ...normalizedContent,
          }));
        } else {
          console.error("❌ BlogGenerator - Conteúdo não encontrado na resposta:", payload);
        }
      }

      // Ativar preview automaticamente após gerar conteúdo
      setPreviewMode(true);
      
      toast({
        title: "Conteúdo gerado",
        description: isDualMode ? "Versões duplas geradas com sucesso!" : "O conteúdo do blog foi gerado com sucesso pela AI.",
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

  const handleCaptureProductKeywords = async () => {
    if (!landingPage?.id) {
      toast({
        title: "Erro",
        description: "Landing page não encontrada",
        variant: "destructive"
      });
      return;
    }

    const selectedProductIds = getSelectedProducts(landingPage.id);
    
    if (selectedProductIds.length === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione produtos no Editor para capturar suas keywords",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      console.log('🔄 Capturando keywords dos produtos:', selectedProductIds);
      
      const keywordAggregation = await aggregateKeywordsFromProducts(selectedProductIds);
      
      if (keywordAggregation.allKeywords.length > 0) {
        // Enriquecer com keywords das configurações de categoria
        const enrichedKeywords = await enrichKeywordsWithCategories(keywordAggregation);
        
        // Atualizar as keywords do blog post
        setBlogPost(prev => ({
          ...prev,
          keywords: enrichedKeywords
        }));

        toast({
          title: "Keywords capturadas!",
          description: `${enrichedKeywords.length} keywords coletadas de ${keywordAggregation.productCount} produtos`,
        });

        console.log('✅ Keywords capturadas e aplicadas:', {
          totalKeywords: enrichedKeywords.length,
          productCount: keywordAggregation.productCount,
          sampleKeywords: enrichedKeywords.slice(0, 10)
        });
      } else {
        toast({
          title: "Nenhuma keyword encontrada",
          description: "Os produtos selecionados não possuem keywords válidas",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao capturar keywords:', error);
      toast({
        title: "Erro na captura",
        description: "Erro ao capturar keywords dos produtos",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateIntelligentLinks = async () => {
    if (!landingPage) {
      toast({
        title: "Dados não encontrados",
        description: "Landing page não carregada",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await extractKeywordsFromLandingPage(
        landingPage.content, 
        getSelectedProducts(landingPage.id) || []
      );
      
      setIntelligentLinks(result.intelligentLinks);
      setLinkMappings(result.mappings);
      setShowLinkPreview(true);
      
      // Update blog post with intelligent links
      setBlogPost(prev => ({
        ...prev,
        intelligent_links: { ...prev.intelligent_links, ...result.intelligentLinks }
      }));
      
      toast({
        title: "Links Inteligentes Gerados",
        description: `${result.totalKeywords} palavras-chave mapeadas para links automáticos`,
      });
    } catch (error) {
      console.error('Error generating intelligent links:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar links inteligentes",
        variant: "destructive",
      });
    }
  };

  const saveBlogDraft = async () => {
    if (!landingPage || loading || generating) return;
    
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
      
      console.log("💾 Auto-salvando rascunho...");
      
      const blogData = {
        landing_page_id: landingPage.id,
        title: blogPost.title || "",
        content: blogPost.content || "",
        meta_description: blogPost.meta_description || "",
        keywords: blogPost.keywords || [],
        youtube_video_url: blogPost.youtube_video_url || "",
        status: "draft",
        intelligent_links: blogPost.intelligent_links || {},
        include_offers: blogPost.include_offers || false,
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
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
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


  // Função para gerar HTML completo do preview
  const generateBlogPreviewHTML = (domain?: 'dentala' | 'eodonto') => {
    const currentPost = isDualMode && dualVersions && domain ? dualVersions[domain] : blogPost;
    
    // Mostrar preview mesmo com conteúdo parcial
    if (!currentPost.title && !currentPost.content) {
      return '<div style="padding: 2rem; text-align: center; color: #666; font-family: Inter, sans-serif;">Configure o título e conteúdo para visualizar o blog post</div>';
    }

    try {
      // Processar conteúdo com links inteligentes
      const processedContent = processContentWithIntelligentLinks(currentPost.content || '', currentPost.intelligent_links || {});
      
      // Criar objeto de dados do blog com conteúdo processado
      const blogData = {
        ...currentPost,
        content: processedContent,
        landing_page_title: landingPage?.content?.seo_title || "Nossa Solução",
        landing_page_url: landingPage?.content?.seo?.canonical_url || "#",
        created_at: new Date().toISOString(),
        cover_image: landingPage?.content?.banner?.images?.[0] || null,
        content_images: landingPage?.content?.solutions?.map((s: any) => s.image) || [],
        include_offers: currentPost.include_offers || false
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
          // Verificar se tem posts criados como rascunho
          const draftErrors = data.errors.filter((err: string) => err.includes('rascunho'));
          const otherErrors = data.errors.filter((err: string) => !err.includes('rascunho'));
          
          if (draftErrors.length > 0) {
            successMessage += `\n\n📝 Rascunhos: ${draftErrors.join('; ')}`;
          }
          if (otherErrors.length > 0) {
            successMessage += `\n\n⚠️ Problemas: ${otherErrors.join('; ')}`;
          }
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
        let title = "Erro na publicação";
        
        if (data.errors && data.errors.length > 0) {
          // Analisar erros específicos
          const errorDetails = data.errors.join('; ');
          
          if (errorDetails.includes('insufficient_permissions:')) {
            title = "Permissões insuficientes";
            errorMessage = "Usuário WordPress não tem permissão para criar posts. Verifique se o usuário tem papel de Author, Editor ou Administrator no WordPress.";
          } else if (errorDetails.includes('invalid_credentials:')) {
            title = "Credenciais inválidas";
            errorMessage = "Use seu username do WordPress (não email) e gere um Application Password em: WP Admin → Users → Your Profile → Application Passwords";
          } else if (errorDetails.includes('auth_blocked:')) {
            title = "Authorization bloqueado";
            errorMessage = "Seu servidor está bloqueando headers de Authorization. Contate seu provedor de hospedagem para habilitar Basic Authentication.";
          } else if (errorDetails.includes('connection_error:')) {
            title = "Erro de conexão";
            errorMessage = "Verifique se a URL do WordPress está correta e se o site está acessível.";
          } else {
            errorMessage += `\n\nDetalhes: ${errorDetails}`;
          }
        }

        toast({
          title,
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
          <Switch
            checked={isDualMode}
            onCheckedChange={setIsDualMode}
          />
          <Label>Modo Dual (Dentala + Eodonto)</Label>
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Keywords:</span>
                    <Button
                      onClick={handleCaptureProductKeywords}
                      disabled={generating || !selectedProducts.length}
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Capturando...
                        </>
                      ) : (
                        <>
                          <Tag className="h-3 w-3 mr-1" />
                          Capturar Keywords dos Produtos
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={generateIntelligentLinks}
                      disabled={extractingKeywords || !landingPage}
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                    >
                      {extractingKeywords ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Link className="h-3 w-3 mr-1" />
                          Gerar Links Inteligentes
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {normalizeKeywords(blogPost.keywords).map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {normalizeKeywords(blogPost.keywords).length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        Nenhuma keyword definida. Use o botão acima para capturar automaticamente.
                      </span>
                    )}
                  </div>
                  {selectedProducts.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="font-medium text-blue-800">
                        Produtos disponíveis: {selectedProducts.length}
                      </span>
                      <div className="text-blue-600 mt-1">
                        {selectedProducts.slice(0, 3).map(p => p.name).join(", ")}
                        {selectedProducts.length > 3 && ` + ${selectedProducts.length - 3} mais`}
                      </div>
                    </div>
                  )}
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
                <RichTextEditor
                  content={blogPost.content}
                  onChange={(content) => setBlogPost(prev => ({ ...prev, content }))}
                  placeholder="Conteúdo do blog post com formatação rica..."
                  onInsertProductLink={() => setProductModalOpen(true)}
                  className="min-h-[400px]"
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
              {previewMode || (blogPost.title || blogPost.content) ? (
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
                  <p>Gere conteúdo ou clique em "Preview" para visualizar</p>
                </div>
              )}
                  
                  {showLinkPreview && linkMappings.length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Link className="h-3 w-3" />
                        <span className="font-medium text-green-800">
                          Links Inteligentes ({linkMappings.length})
                        </span>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {linkMappings.slice(0, 5).map((mapping, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="font-mono text-green-700 text-xs">
                              "{mapping.keyword}"
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {mapping.source}
                            </Badge>
                          </div>
                        ))}
                        {linkMappings.length > 5 && (
                          <div className="text-center text-green-600 text-xs">
                            +{linkMappings.length - 5} links adicionais
                          </div>
                        )}
                      </div>
                      <p className="text-green-600 mt-1 text-xs">
                        Estes links serão inseridos automaticamente no conteúdo
                      </p>
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

      {/* Product Link Modal */}
      <SelectedProductLinkModal 
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        selectedProducts={selectedProducts}
        onInsertLink={(url: string, text: string) => {
          // Insert link at the cursor position in the editor
          setBlogPost(prev => ({ 
            ...prev, 
            content: prev.content + ` <a href="${url}">${text}</a>` 
          }));
          setProductModalOpen(false);
        }}
      />
    </div>
  );
}

// Componente auxiliar para preview de conteúdo
function PreviewContent({ blogData }: { blogData: BlogPost }) {
  const normalizeKeywords = (keywords: any): string[] => {
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === 'string') return keywords.split(',').map(k => k.trim()).filter(Boolean);
    return [];
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Título</Label>
        <p className="text-lg font-semibold">{blogData.title || "Sem título"}</p>
      </div>
      
      <div>
        <Label className="text-sm font-medium">Meta Description</Label>
        <p className="text-sm text-muted-foreground">{blogData.meta_description || "Sem descrição"}</p>
      </div>
      
      <div>
        <Label className="text-sm font-medium">Keywords</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {normalizeKeywords(blogData.keywords).map((keyword, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <Label className="text-sm font-medium">Conteúdo</Label>
        <div className="text-sm text-muted-foreground max-h-48 overflow-y-auto border rounded p-2">
          {blogData.content ? (
            <div dangerouslySetInnerHTML={{ 
              __html: blogData.content.substring(0, 500) + (blogData.content.length > 500 ? '...' : '') 
            }} />
          ) : (
            "Sem conteúdo"
          )}
        </div>
      </div>

    </div>
  );
}