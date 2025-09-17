import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Copy, Edit, ExternalLink, MoreVertical, Trash2, Shield, PenTool, Database } from "lucide-react";
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


const DashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { landingPages, deleteLandingPage } = useLandingPages();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [promotingToAdmin, setPromotingToAdmin] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);

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
  }, []);

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