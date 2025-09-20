import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Copy, Edit, ExternalLink, MoreVertical, Trash2, Shield, PenTool, Database, Globe, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import useLandingPages, { type LandingPage } from "@/hooks/useLandingPages";
import { generateHTML } from "@/lib/template-engine";
import { generateSafeHTML, getEmbedConfig } from "@/lib/selflux-engine";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { ProductMigrationModal } from "@/components/ProductMigrationModal";

// Interface for blog posts
interface BlogPost {
  id: string;
  title: string;
  created_at: string;
  status: string;
  landing_page_id: string;
  content: string;
  meta_description: string;
  keywords: string[];
}


const DashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { landingPages, deleteLandingPage } = useLandingPages();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [promotingToAdmin, setPromotingToAdmin] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email);
        
        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        setUserRole(roleData?.role || 'user');
      }
    };

    getCurrentUser();
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      // Buscar todos os blogs
      const { data: blogs, error: blogsError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (blogsError) throw blogsError;

      // Buscar landing pages aprovadas
      const { data: approvedLPs, error: lpsError } = await supabase
        .from('products_repository')
        .select('source_landing_page_id')
        .eq('approved', true);

      if (lpsError) throw lpsError;

      // Filtrar blogs que pertencem a landing pages aprovadas
      const approvedLandingPageIds = approvedLPs?.map(lp => lp.source_landing_page_id) || [];
      const filteredBlogs = blogs?.filter(blog => 
        blog.landing_page_id && approvedLandingPageIds.includes(blog.landing_page_id)
      ) || [];

      setBlogPosts(filteredBlogs);
    } catch (error: any) {
      console.error('Erro ao buscar blogs:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar blogs",
        description: error.message
      });
    }
  };

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
        
        // Update role state
        setUserRole('admin');
        
        // Redirect to editor
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

  const handleCreateNew = () => {
    navigate('/editor');
  };

  const handleEdit = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const handleDuplicate = (landingPage: LandingPage) => {
    toast({
      title: "Landing duplicada",
      description: `"${landingPage.name}" foi duplicada como rascunho.`,
    });
  };

  const handleCopyCode = async (landingPage: LandingPage) => {
    if (landingPage.status === 'approved') {
      try {
        // Gera o HTML real usando os dados da landing page
        let htmlCode: string;
        
        if (landingPage.data) {
          const embedConfig = getEmbedConfig(landingPage);
          
          // Se for modo SelFlux, usar generateSafeHTML
          if (embedConfig.mode === 'selflux') {
            htmlCode = generateSafeHTML(landingPage.data, embedConfig);
          } else {
            htmlCode = generateHTML(landingPage.data);
          }
        } else {
          htmlCode = '<!DOCTYPE html><html><head><title>Landing Page</title></head><body><h1>Landing Page Gerada</h1><p>Dados não encontrados.</p></body></html>';
        }
        
        await navigator.clipboard.writeText(htmlCode);
        toast({
          title: "Código copiado!",
          description: "HTML da landing page copiado para a área de transferência.",
        });
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = (landingPage: LandingPage) => {
    if (confirm(`Tem certeza que deseja excluir "${landingPage.name}"? Esta ação não pode ser desfeita.`)) {
      deleteLandingPage(landingPage.id);
      toast({
        title: "Landing page excluída",
        description: `"${landingPage.name}" foi removida com sucesso.`,
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'approved' ? 'success' : 'secondary';
  };

  const getStatusText = (status: string) => {
    return status === 'approved' ? 'Aprovado' : 'Rascunho';
  };

  // Function to generate consolidated HTML (main content only, no header/footer)
  const generateConsolidatedHTML = (blogs: BlogPost[], domain: string) => {
    const domainName = domain === 'dentala' ? 'Dentala' : 'Eodonto';
    // Blogs já vêm filtrados apenas de landing pages aprovadas
    const approvedBlogs = blogs;
    
    const featuredBlog = approvedBlogs[0];
    const recentBlogs = approvedBlogs.slice(1, 4);

    if (!featuredBlog) {
      return `<style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
            --light-gray: #e9ecef;
            --dark-gray: #495057;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        .main-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 0;
        }
        .no-content {
            text-align: center;
            padding: 3rem;
            color: var(--secondary-color);
        }
    </style>

    <main class="container main-content">
        <div class="no-content">
            <h2>Nenhum blog aprovado encontrado para ${domainName}</h2>
            <p>Aguarde a aprovação de landing pages para visualizar o conteúdo.</p>
        </div>
    </main>`;
    }

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `<style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
            --light-gray: #e9ecef;
            --dark-gray: #495057;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        a { text-decoration: none; color: var(--primary-color); }
        a:hover { text-decoration: underline; }
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        img { max-width: 100%; height: auto; display: block; }
        
        .posts-section {
            display: grid;
            gap: 2rem;
        }
        .featured-post {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .featured-post-content {
            padding: 1.5rem;
        }
        .featured-post-content h2 {
            margin-top: 0;
            font-size: 1.75rem;
        }
        .post-card {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
        }
        .post-card:hover {
            transform: translateY(-5px);
        }
        .post-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }
        .post-card-content {
            padding: 1.5rem;
        }
        .post-card-content h3 {
            margin-top: 0;
            font-size: 1.25rem;
        }
        .post-meta {
            color: var(--secondary-color);
            font-size: 0.875rem;
        }
        
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        
        .posts-grid,
        .sidebar-posts {
            display: grid;
            gap: 2rem;
        }

        .sidebar-posts .post-card img {
            height: 150px;
        }
        
        .sidebar-posts .post-card-content h3 {
            font-size: 1rem;
        }

        .read-more-btn {
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            color: var(--primary-color);
            font-weight: 600;
            font-family: inherit;
            font-size: 1rem;
            margin-top: 0.5rem;
        }

        .full-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.5s ease;
        }
        
        .full-content.expanded {
            max-height: 1000px;
        }
        
        .main-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 0;
        }
        @media (min-width: 768px) {
            .main-content {
                grid-template-columns: 2fr 1fr;
            }
        }
    </style>

    <main class="container main-content">
        <section class="posts-section">
            <article class="featured-post">
                <img src="https://via.placeholder.com/1200x600?text=${encodeURIComponent(featuredBlog.title.substring(0, 50))}" alt="Imagem do post de destaque">
                <div class="featured-post-content">
                    <p class="post-meta">${domainName} | ${new Date(featuredBlog.created_at).toLocaleDateString('pt-BR')}</p>
                    <h2>${featuredBlog.title}</h2>
                    <p>${featuredBlog.meta_description || 'Conteúdo sobre odontologia digital'}</p>
                    <div class="full-content">
                        ${featuredBlog.content || 'Conteúdo do blog gerado pela IA'}
                    </div>
                    <button class="read-more-btn">Leia mais &rarr;</button>
                </div>
            </article>

            <div class="posts-grid">
                ${recentBlogs.map(blog => `
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=${encodeURIComponent(blog.title.substring(0, 30))}" alt="Imagem do post">
                    <div class="post-card-content">
                        <p class="post-meta">${domainName} | ${new Date(blog.created_at).toLocaleDateString('pt-BR')}</p>
                        <h3>${blog.title}</h3>
                        <p>${blog.meta_description || 'Descrição do blog'}</p>
                        <div class="full-content">
                            ${blog.content || 'Conteúdo do blog'}
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
                `).join('')}
            </div>
        </section>

        <aside class="sidebar">
            <div class="sidebar-posts">
                <h3>Postagens Recentes</h3>
                ${approvedBlogs.slice(4, 7).map(blog => `
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=${encodeURIComponent(blog.title.substring(0, 20))}" alt="Imagem do post">
                    <div class="post-card-content">
                        <p class="post-meta">${domainName} | ${new Date(blog.created_at).toLocaleDateString('pt-BR')}</p>
                        <h3>${blog.title}</h3>
                        <div class="full-content">
                            <p>${blog.meta_description || 'Descrição do blog'}</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
                `).join('')}
            </div>
        </aside>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const readMoreButtons = document.querySelectorAll('.read-more-btn');

            readMoreButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const fullContent = this.previousElementSibling;
                    const isExpanded = fullContent.classList.contains('expanded');

                    if (isExpanded) {
                        fullContent.classList.remove('expanded');
                        this.textContent = 'Leia mais →';
                    } else {
                        fullContent.classList.add('expanded');
                        this.textContent = 'Fechar ↑';
                    }
                });
            });
        });
    </script>`;
  };

  const copyConsolidatedHTML = async (domain: string) => {
    const html = generateConsolidatedHTML(blogPosts, domain);
    
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML consolidado copiado!",
        description: `HTML consolidado do ${domain === 'dentala' ? 'Dentala' : 'Eodonto'} copiado para a área de transferência.`,
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o HTML. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getApprovedBlogsCount = (domain: string) => {
    // Blogs já vêm filtrados apenas de landing pages aprovadas
    return blogPosts.length;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <BreadcrumbNavigation />
      </div>
      {/* Admin Promotion Banner */}
      {userEmail === 'danilohen@gmail.com' && userRole !== 'admin' && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-primary">Ativar Acesso de Administrador</h3>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão para ativar o acesso completo ao editor de landing pages.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handlePromoteToAdmin}
                disabled={promotingToAdmin}
                className="gradient-primary shadow-primary"
              >
                {promotingToAdmin ? (
                  <>Ativando...</>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Ativar Acesso
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Landing Page Generator
              </h1>
              <p className="text-muted-foreground mt-1">
                Crie e gerencie suas landing pages com facilidade
              </p>
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
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/publication-settings')}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Shield className="h-4 w-4 mr-2" />
                Configurações de Publicação
              </Button>
              
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
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Template: {landingPage.template}</span>
                      <span>Versão: v{landingPage.version}</span>
                      <span>
                        Modificado em: {
                          landingPage.lastModified instanceof Date 
                            ? landingPage.lastModified.toLocaleDateString('pt-BR')
                            : new Date(landingPage.lastModified).toLocaleDateString('pt-BR')
                        }
                      </span>
                    </div>
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
                          onClick={() => navigate(`/blog-generator/${landingPage.id}`)}
                          className="border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Gerar Blog Post
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

        {/* HTML Blogs Copy & Paste Section */}
        {/* HTML Blogs Copy & Paste - 2 Consolidated Preview Cards */}
        <div className="mt-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">HTML Blogs Copy & Paste</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Eodonto Card */}
            <Card className="bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Preview Consolidado Eodonto.com</CardTitle>
                </div>
                <CardDescription>
                  {getApprovedBlogsCount('eodonto')} posts consolidados de landing pages aprovadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 mb-4 h-64 overflow-hidden">
                  <div 
                    className="text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: generateConsolidatedHTML(blogPosts, 'eodonto').substring(0, 800) + '...' 
                    }}
                  />
                </div>
                <Button 
                  onClick={() => copyConsolidatedHTML('eodonto')}
                  className="w-full"
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar HTML Eodonto
                </Button>
              </CardContent>
            </Card>

            {/* Dentala Card */}
            <Card className="bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Preview Consolidado Dentala.com</CardTitle>
                </div>
                <CardDescription>
                  {getApprovedBlogsCount('dentala')} posts consolidados de landing pages aprovadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 mb-4 h-64 overflow-hidden">
                  <div 
                    className="text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: generateConsolidatedHTML(blogPosts, 'dentala').substring(0, 800) + '...' 
                    }}
                  />
                </div>
                <Button 
                  onClick={() => copyConsolidatedHTML('dentala')}
                  className="w-full"
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar HTML Dentala
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Product Migration Modal */}
      <ProductMigrationModal 
        open={migrationModalOpen} 
        onOpenChange={setMigrationModalOpen} 
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <ProtectedRoute requiredRole="user">
      <DashboardContent />
    </ProtectedRoute>
  );
};

export default Dashboard;