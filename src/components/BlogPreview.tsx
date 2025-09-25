import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Edit3, Sparkles, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DualBlogGeneratorWithKOL } from "./DualBlogGeneratorWithKOL";
import { ProductBlogCuratorPanel } from "./ProductBlogCuratorPanel";
import { usePromptsConfiguration } from "@/hooks/usePromptsConfiguration";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { calculateProductStats } from "./ProductStatsHelper";

interface BlogPreviewProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
  onEditBlog?: () => void;
}

interface BlogConsolidationPreferences {
  [productId: string]: {
    useCommercial: boolean;
    useTechnical: boolean;
  };
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
  const [blogPreferences, setBlogPreferences] = useState<BlogConsolidationPreferences>({});
  const [productQuality, setProductQuality] = useState<any>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getConfigurationByFunction } = usePromptsConfiguration();
  const { loadProductsByIds } = useSelectedProducts();

  // Fetch published blog and check sync status
  useEffect(() => {
    fetchPublishedBlog();
  }, [landingPageId]);

  // Load product quality when selectedProductIds changes
  useEffect(() => {
    if (selectedProductIds && selectedProductIds.length > 0) {
      loadProductQuality();
    } else {
      setProductQuality(null);
    }
  }, [selectedProductIds]);

  // Check sync status when both preview and published blogs are available
  useEffect(() => {
    if (blogPost && publishedBlog && landingPageData) {
      checkSyncStatus();
    }
  }, [blogPost, publishedBlog, landingPageData]);

  const loadProductQuality = async () => {
    if (!selectedProductIds || selectedProductIds.length === 0) return;
    
    setLoadingProducts(true);
    try {
      const products = await loadProductsByIds(selectedProductIds);
      // Adaptar produtos para o formato esperado pelo ProductStatsHelper
      const adaptedProducts = products.map(product => ({
        ...product,
        use_in_ai_generation: true,
        approved: true
      }));
      const stats = calculateProductStats(adaptedProducts);
      setProductQuality(stats);
    } catch (error) {
      console.error('Erro ao carregar qualidade dos produtos:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

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
    if (!selectedProductIds || selectedProductIds.length === 0) {
      toast({
        title: "Produtos necessários",
        description: "Selecione produtos no repositório para gerar o blog contextual",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log("🔄 Gerando blog estratégico contextual para:", landingPageId);

      // Buscar configuração de prompt para o gerador estratégico
      const promptConfig = getConfigurationByFunction('strategic-blog-generator', 'Artigo Estratégico Contextual');
      
      const repositoryConfig = {
        selectedSources: promptConfig?.selected_data_sources || ['products_repository', 'approved_reviews', 'key_opinion_leaders', 'company_profile'],
        selectedFields: promptConfig?.selected_fields || {
          landing_pages: ['banner', 'seo_title', 'seo_description'],
          products_repository: ['name', 'description', 'benefits', 'keywords'],
          approved_reviews: ['review_text', 'contextual_seo_info'],
          key_opinion_leaders: ['full_name', 'specialty', 'mini_cv'],
          company_profile: ['company_name', 'main_products_services', 'target_audience']
        },
        selectedProductIds: selectedProductIds
      };

      const { data, error } = await supabase.functions.invoke('strategic-blog-generator', {
        body: {
          landingPageId,
          repositoryConfig
        }
      });

      if (error) throw error;

      if (data && typeof data === 'string') {
        // A strategic-blog-generator retorna um string direto
        const blogContent = data;
        
        // Extrair título da primeira linha do conteúdo
        const lines = blogContent.split('\n').filter(line => line.trim());
        const title = lines[0]?.replace(/^#+\s*/, '') || "Blog Estratégico Contextual";
        
        setBlogPost({
          title: title,
          content: blogContent,
          meta_description: `${title.substring(0, 150)}...`,
          keywords: selectedProductIds?.slice(0, 5) || [],
          status: "preview"
        });

        console.log("✅ Blog estratégico gerado com sucesso");
      } else {
        throw new Error("Resposta inválida do gerador estratégico");
      }
    } catch (err: any) {
      console.error("❌ Erro ao gerar blog estratégico:", err);
      setError(err.message || "Erro ao gerar blog estratégico");
      
      // Fallback para o gerador padrão
      try {
        const { data, error } = await supabase.functions.invoke('ai-content-generator', {
          body: {
            type: 'blog_content',
            landingPageId,
            landingPage: landingPageData,
            contentData: landingPageData,
            selectedProductIds: selectedProductIds || [],
            include_offers: true,
            blogConsolidationPreferences: blogPreferences
          }
        });

        if (error) throw error;

        if (data?.success && data?.content) {
          const content = data.content;
          setBlogPost({
            title: content.title || "Blog Post Gerado",
            content: content.content || "Conteúdo em desenvolvimento...",
            meta_description: content.meta_description || content.metaDescription || "",
            keywords: Array.isArray(content.keywords) ? content.keywords : (typeof content.keywords === 'string' ? content.keywords.split(',').map(k => k.trim()).filter(Boolean) : []),
            status: "fallback"
          });
        }
      } catch (fallbackErr) {
        // Fallback final com dados básicos
        setBlogPost({
          title: landingPageData?.banner?.title || landingPageData?.seo_title || "Seu Blog Post",
          content: `# ${landingPageData?.banner?.title || "Título do Artigo"}\n\nConteúdo básico gerado...`,
          meta_description: landingPageData?.seo_description || "",
          keywords: ["blog", "artigo"],
          status: "fallback"
        });
      }
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
          contentData: landingPageData,
          selectedProductIds: selectedProductIds || [],
          include_offers: true,
          blogConsolidationPreferences: blogPreferences
        }
      });

      if (error) throw error;

      if (data?.success && data?.content) {
        const content = data.content;
        // Update the published blog with new content
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            title: content.title,
            content: content.content,
            meta_description: content.meta_description || content.metaDescription || '',
            keywords: Array.isArray(content.keywords) ? content.keywords : (typeof content.keywords === 'string' ? content.keywords.split(',').map(k => k.trim()).filter(Boolean) : []),
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

  const getProductQualityInfo = () => {
    if (!productQuality || !selectedProductIds?.length) {
      return { percentage: 0, message: "Nenhum produto selecionado" };
    }

    const completeAndGood = productQuality.complete + productQuality.good;
    const percentage = Math.round((completeAndGood / productQuality.total) * 100);
    
    let message = "";
    if (productQuality.complete > 0) message += `${productQuality.complete} completos`;
    if (productQuality.good > 0) {
      if (message) message += ", ";
      message += `${productQuality.good} bons`;
    }
    if (productQuality.regular > 0) {
      if (message) message += ", ";
      message += `${productQuality.regular} regulares`;
    }
    if (productQuality.critical > 0) {
      if (message) message += ", ";
      message += `${productQuality.critical} críticos`;
    }

    return { percentage, message };
  };

  const productQualityInfo = getProductQualityInfo();

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Artigo Estratégico Contextual</CardTitle>
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
            {loadingProducts ? (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Avaliando...
              </Badge>
            ) : selectedProductIds?.length ? (
              <Badge variant="secondary" className="text-xs">
                Produtos: {productQualityInfo.percentage}%
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Sem produtos
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

        {!selectedProductIds?.length && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">
              ⚠️ <strong>Produtos necessários:</strong> Selecione produtos no repositório para gerar o blog contextual
            </p>
          </div>
        )}

        {selectedProductIds?.length && productQuality && productQualityInfo.percentage < 70 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              💡 <strong>Dica:</strong> Complete os dados dos produtos para melhorar o blog ({productQualityInfo.message})
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

            <div className="flex gap-3">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  Utilizar no Consolidado: Sim
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Não
                </Button>
              </div>
              
              <Button 
                onClick={handleEditBlog}
                variant="default" 
                size="sm"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm mb-4">Clique para gerar o preview do blog com IA</p>
            </div>
            <Button 
              onClick={generateBlogPreview}
              disabled={generating}
              variant="default"
              size="lg"
              className="min-w-48"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar com IA
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Curador de Blogs dos Produtos */}
    {selectedProductIds && selectedProductIds.length > 0 && (
      <ProductBlogCuratorPanel
        selectedProductIds={selectedProductIds}
        onPreferencesChange={setBlogPreferences}
        className="mt-6"
      />
    )}

    <DualBlogGeneratorWithKOL 
      landingPageId={landingPageId}
      landingPageData={landingPageData}
      selectedProductIds={selectedProductIds}
    />
  </div>
  );
}