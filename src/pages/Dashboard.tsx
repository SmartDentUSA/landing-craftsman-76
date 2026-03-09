import { ContentQualityDashboard } from "@/components/ContentQualityDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Copy, Edit, ExternalLink, MoreVertical, Trash2, Shield, PenTool, Database, Globe, Upload } from "lucide-react";
import { CompanyReviewsManager } from "@/components/CompanyReviewsManager";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useLandingPagesSupabase } from "@/hooks/useLandingPagesSupabase";
import { type LandingPage } from "@/hooks/useLandingPagesSupabase";
import { useDebounce } from "@/hooks/useDebounce";
import { generateBlogHTML } from '@/services/seo/blogHTMLGenerator';
import { getTrackingConfig, type TrackingConfig } from '@/lib/tracking-injector';
import ProtectedRoute from "@/components/ProtectedRoute";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useBlogStatusMonitor } from '@/hooks/useBlogStatusMonitor';
import { ProductMigrationModal } from "@/components/ProductMigrationModal";
import { LPPublishDialog } from "@/components/LPPublishDialog";

// Interface for blog posts
interface BlogPost {
  id: string;
  title: string;
  created_at: string;
  status: string;
  landing_page_id: string;
  content?: string;
  meta_description?: string;
  keywords?: string[];
  intelligent_links?: any;
}


const DashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { landingPages, deleteLandingPage, addLandingPage, isLoading, loadLandingPages } = useLandingPagesSupabase();
  const { 
    approvedLandingPagesWithBlogs
  } = useBlogStatusMonitor(landingPages);
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [promotingToAdmin, setPromotingToAdmin] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishLP, setPublishLP] = useState<LandingPage | null>(null);
  const [publishedMap, setPublishedMap] = useState<Record<string, { publish_status: string; published_url: string | null }>>({});

  useEffect(() => {
    getTrackingConfig().then(setTrackingConfig);
  }, []);

  // Fetch published URLs from cloned_landing_pages
  useEffect(() => {
    const fetchPublishedInfo = async () => {
      const { data } = await supabase
        .from('cloned_landing_pages')
        .select('source_landing_page_id, publish_status, published_url')
        .eq('publish_status', 'published')
        .not('source_landing_page_id', 'is', null);
      
      if (data) {
        const map: Record<string, { publish_status: string; published_url: string | null }> = {};
        data.forEach((row) => {
          if (row.source_landing_page_id) {
            map[row.source_landing_page_id] = {
              publish_status: row.publish_status || 'draft',
              published_url: row.published_url
            };
          }
        });
        setPublishedMap(map);
      }
    };
    fetchPublishedInfo();
  }, [landingPages]);

  const debouncedFetchBlogPosts = useDebounce(async () => {
    try {
      console.log('🔄 Fetching blog posts - Landing pages count:', landingPages.length);
      const approvedLandingPages = landingPages.filter(lp => lp.status === 'approved');
      console.log('✅ Approved landing pages:', approvedLandingPages.length);
      
      if (approvedLandingPages.length === 0) {
        console.log('📭 No approved landing pages found');
        setBlogPosts([]);
        return;
      }

      // ✅ OTIMIZAÇÃO: 1 query em vez de N queries
      const landingPageIds = approvedLandingPages.map(lp => lp.id);
      
      const { data: blogs, error } = await supabase
        .from('blog_posts')
        .select('id, title, status, created_at, landing_page_id, meta_description')
        .in('landing_page_id', landingPageIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📚 Total blogs found:', blogs?.length || 0);
      setBlogPosts(blogs || []);
    } catch (error: any) {
      console.error('❌ Erro ao buscar blogs:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar blogs",
        description: error.message
      });
    }
  }, 300);

  // Force refresh landing pages when component mounts to sync names
  useEffect(() => {
    loadLandingPages();
  }, []);

  // Memoize approved landing pages to detect changes
  const approvedLandingPagesIds = useMemo(() => {
    return landingPages
      .filter(lp => lp.status === 'approved')
      .map(lp => lp.id)
      .sort()
      .join(',');
  }, [landingPages]);

  const fetchBlogPosts = useCallback(() => {
    console.log('🚀 Triggering blog posts fetch due to changes');
    debouncedFetchBlogPosts();
  }, [debouncedFetchBlogPosts]);

  const getCurrentUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserEmail(session.user.email);
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      setUserRole(roleData?.role || 'user');
    }
  }, []);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  // Capturar e salvar tokens Google automaticamente
  useEffect(() => {
    let mounted = true;

    const captureGoogleTokens = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.provider_token || !session?.provider_refresh_token) {
          return;
        }

        const { data: existingTokens } = await supabase
          .from('google_oauth_tokens')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (existingTokens) {
          console.log('✅ Google tokens já salvos');
          return;
        }

        console.log('✅ Salvando tokens Google...');
        
        const { error } = await supabase
          .from('google_oauth_tokens')
          .upsert({
            user_id: session.user.id,
            provider_token: session.provider_token,
            provider_refresh_token: session.provider_refresh_token,
            scopes: ['youtube.force-ssl', 'business.manage'],
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        
        if (error) {
          console.error('❌ Erro ao salvar tokens:', error);
        } else {
          console.log('✅ Tokens Google salvos com sucesso');
        }

      } catch (err) {
        console.error('❌ Erro inesperado ao capturar tokens:', err);
      }
    };

    if (mounted) {
      captureGoogleTokens();
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Separate effect to react to landing page approval/disapproval changes
  useEffect(() => {
    console.log('📊 Landing pages changed, approved IDs:', approvedLandingPagesIds);
    fetchBlogPosts();
  }, [approvedLandingPagesIds, fetchBlogPosts]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-blog-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'blog_posts' 
      }, () => {
        fetchBlogPosts();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'blog_posts' 
      }, () => {
        fetchBlogPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBlogPosts]);

  const handlePromoteToAdmin = async () => {
    if (!userEmail) return;
    
    setPromotingToAdmin(true);
    try {
      const { data, error } = await supabase.rpc('promote_user_to_admin', { 
        _email: userEmail 
      });
      
      if (error) throw error;
      
      if (data) {
        toast({
          title: "Acesso de administrador ativado!",
          description: "Você agora tem acesso total ao editor.",
        });
        
        setUserRole('admin');
        navigate('/editor');
      } else {
        throw new Error('Não foi possível ativar o acesso de administrador');
      }
    } catch (error) {
      toast({
        title: "Erro ao ativar acesso",
        description: "Não foi possível ativar o acesso de administrador. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPromotingToAdmin(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      console.log('🚀 Creating new landing page');
      
      const newId = await addLandingPage({
        name: "Nova Landing Page",
        status: "draft",
        template: "default"
      });
      
      console.log('✅ Landing page created with ID:', newId);
      navigate(`/editor/${newId}`);
    } catch (error) {
      console.error('❌ Failed to create landing page:', error);
      toast({
        title: "Erro ao criar landing page",
        description: "Não foi possível criar a landing page. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    try {
      console.log('✏️ Navigating to editor for landing page:', id);
      navigate(`/editor/${id}`);
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      toast({
        title: "Erro de navegação",
        description: "Não foi possível abrir o editor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = (landingPage: LandingPage) => {
    try {
      console.log('📋 Duplicating landing page:', landingPage.name);
      
      const duplicateData = {
        name: `${landingPage.name} - Cópia`,
        status: 'draft' as const,
        template: landingPage.template,
        data: landingPage.data,
        embed: landingPage.embed,
        selected_product_ids: landingPage.selected_product_ids
      };
      
      const newId = addLandingPage(duplicateData);
      console.log('✅ Landing page duplicated with ID:', newId);
      
      toast({
        title: "Landing duplicada",
        description: `"${landingPage.name}" foi duplicada como rascunho.`,
      });
    } catch (error) {
      console.error('❌ Duplication failed:', error);
      toast({
        title: "Erro na duplicação",
        description: "Não foi possível duplicar a landing page. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = async (landingPage: LandingPage) => {
    if (landingPage.status === 'approved') {
      try {
        const { data: lpData, error: lpError } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('id', landingPage.id)
          .single();
        
        if (lpError || !lpData) {
          throw new Error('Landing page não encontrada');
        }
        
        let selectedProducts: any[] = [];
        if (lpData.selected_product_ids && lpData.selected_product_ids.length > 0) {
          const { data: products } = await supabase
            .from('products_repository')
            .select('*')
            .in('id', lpData.selected_product_ids);
          
          selectedProducts = products || [];
        }
        
        const pageData = lpData.data as any;
        const htmlCode = await generateBlogHTML({
          blogs: [{
            title: lpData.name,
            content: pageData?.content || '',
            meta_description: pageData?.seo_description,
            keywords: pageData?.seo?.ai_keywords || []
          }],
          domain: pageData?.seo?.domain || 'eodonto',
          canonicalUrl: pageData?.seo?.canonical_url || `https://${pageData?.seo?.domain || 'eodonto'}/lp`,
          finalTitle: pageData?.seo?.seo_title || lpData.name,
          finalDescription: pageData?.seo_description || '',
          selectedProducts: selectedProducts,
          intelligentLinks: pageData?.seo?.intelligent_links || {},
          schemas: Object.values(pageData?.schema || {}),
          trackingConfig: trackingConfig,
          preview: false,
          ogImage: pageData?.banner?.images?.[0]?.src,
          keywords: pageData?.seo?.ai_keywords || []
        });
        
        await navigator.clipboard.writeText(htmlCode);
        await loadLandingPages();
        
        toast({
          title: "✅ HTML SEO Completo Copiado!",
          description: `HTML otimizado com ${selectedProducts.length} produtos, schemas consolidados e tracking pixels`,
        });
        
      } catch (err) {
        console.error('Erro ao gerar HTML:', err);
        toast({
          title: "❌ Erro ao copiar",
          description: "Não foi possível copiar o código. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = (landingPage: LandingPage) => {
    if (confirm(`Tem certeza que deseja excluir "${landingPage.name}"? Esta ação não pode ser desfeita.`)) {
      deleteLandingPage(landingPage.id);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'approved' ? 'success' : 'secondary';
  };

  const getStatusText = (status: string) => {
    return status === 'approved' ? 'Aprovado' : 'Rascunho';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <BreadcrumbNavigation />
      </div>

      {/* Admin Promotion Banner */}
      {userRole !== 'admin' && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-primary">Ativar Acesso de Administrador</h3>
                  <p className="text-sm text-muted-foreground">Clique para obter acesso total ao editor</p>
                </div>
              </div>
              <Button 
                onClick={handlePromoteToAdmin}
                disabled={promotingToAdmin}
                className="gradient-primary"
              >
                {promotingToAdmin ? 'Ativando...' : 'Ativar Acesso Admin'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Landing Page Generator
              </h1>
              {userRole === 'admin' && (
                <Badge variant="default" className="bg-gradient-primary text-primary-foreground">
                  ADMIN
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setMigrationModalOpen(true)}
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                <Database className="h-4 w-4 mr-2" />
                Migrar Produtos
              </Button>
              
              {userRole === 'admin' && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/repository')}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Repositório de Dados
                </Button>
              )}
              
              {userRole === 'admin' && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/cloudflare-settings')}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Configurações Cloudflare
                </Button>
              )}
              
              <Button onClick={handleCreateNew} className="gradient-primary shadow-primary transition-smooth hover:scale-105">
                <Plus className="h-4 w-4 mr-2" />
                Nova Landing Page
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Content Quality Dashboard - FASE 4.2 */}
        <div className="mb-8">
          <ContentQualityDashboard />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-soft border-0 shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total de Landing Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{landingPages.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-success/20 bg-success/5 shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Aprovadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {landingPages.filter(lp => lp.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-warning/20 bg-warning/5 shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Em Rascunho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {landingPages.filter(lp => lp.status === 'draft').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Landing Pages List */}
        <Card className="shadow-large">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Suas Landing Pages
            </CardTitle>
            <CardDescription>
              Gerencie, edite e publique suas landing pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {landingPages.map((landingPage) => (
                <div
                  key={landingPage.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-smooth"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{landingPage.name}</h3>
                      <Badge variant={getStatusColor(landingPage.status) as "secondary"}>
                        {getStatusText(landingPage.status)}
                      </Badge>
                      {publishedMap[landingPage.id]?.publish_status === 'published' && (
                        <Badge className="bg-green-600 text-white hover:bg-green-700">
                          Publicado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Template: {landingPage.template}</span>
                      <span>Versão: v{landingPage.version}</span>
                      <span>
                        Modificado em: {
                          landingPage.last_modified instanceof Date 
                            ? landingPage.last_modified.toLocaleDateString('pt-BR')
                            : new Date(landingPage.last_modified).toLocaleDateString('pt-BR')
                        }
                      </span>
                    </div>
                    {publishedMap[landingPage.id]?.published_url && (
                      <div className="mt-1">
                        <a 
                          href={publishedMap[landingPage.id].published_url!} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {publishedMap[landingPage.id].published_url}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(landingPage.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(landingPage)}
                      className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                    {landingPage.status === 'approved' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCopyCode(landingPage)}
                          className="bg-success hover:bg-success/90"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Código
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPublishLP(landingPage); setPublishOpen(true); }}
                          className="border-accent/30 text-accent-foreground hover:bg-accent/10"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Publicar
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(landingPage)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visualizar Histórico
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Company Reviews Manager */}
        <div className="mt-8 mb-8">
          <CompanyReviewsManager />
        </div>
      </main>
      
      {/* Product Migration Modal */}
      <ProductMigrationModal 
        open={migrationModalOpen} 
        onOpenChange={setMigrationModalOpen} 
      />
      
      {/* LP Publish Dialog */}
      <LPPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        landingPage={publishLP}
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
};

export default Dashboard;
