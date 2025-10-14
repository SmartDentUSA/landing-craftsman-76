import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { RepositoryPanel } from '@/components/RepositoryPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Youtube, Building2, ArrowLeft, Package, Link2, Tag, Sparkles, MessageSquare, Headphones, Activity } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminStatusBadge } from '@/components/AdminStatusBadge';
import CategoryManager from '@/components/CategoryManager';
import { EnhancedPromptsManager } from '@/components/EnhancedPromptsManager';
import { LinksManager } from '@/components/LinksManager';
import { GoogleMerchantManager } from '@/components/GoogleMerchantManager';
import { ProductSEOBatchEnhancer } from '@/components/ProductSEOBatchEnhancer';
import YouTubeOAuthSettings from '@/pages/YouTubeOAuthSettings';
import GoogleBusinessOAuthSettings from '@/pages/GoogleBusinessOAuthSettings';
import { OAuthSettingsCard } from '@/components/OAuthSettingsCard';
import { CouponsManager } from '@/components/CouponsManager';
import { AfterSalesManager } from '@/components/AfterSalesManager';
import { CSManager } from '@/components/CSManager';
import { ContentProgressDashboard } from '@/components/ContentProgressDashboard';

const Repository = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'repository' | 'progress' | 'categories' | 'prompts' | 'links' | 'merchant' | 'youtube' | 'google-business' | 'coupons' | 'aftersales' | 'cs'>('repository');

  // Detectar redirecionamento OAuth e abrir aba correta
  useEffect(() => {
    const state = location.state as any;
    if (state?.activeView) {
      console.log("🔄 Mudando para aba:", state.activeView);
      setActiveView(state.activeView);
    }
  }, [location]);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex flex-col min-h-screen bg-background">
        <TopNavigation />
        
        <main className="flex-1 container mx-auto px-6 py-8">
          <div className="space-y-6">
            <BreadcrumbNavigation className="mb-4" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Dashboard
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                  {activeView === 'repository' ? 'Repositório Central de Dados' : 
                   activeView === 'progress' ? 'Progresso de Conteúdo' :
                   activeView === 'categories' ? 'Gerenciar Categorias' : 
                   activeView === 'links' ? 'Gerenciador de Links' : 
                   activeView === 'merchant' ? 'Google Merchant Center' : 
                   activeView === 'youtube' ? 'YouTube OAuth' : 
                   activeView === 'google-business' ? 'Google Business OAuth' : 
                   activeView === 'coupons' ? 'Cupons Promocionais' :
                   activeView === 'aftersales' ? 'Pós-Venda' :
                   activeView === 'cs' ? 'Customer Success (CS)' : 'Prompts IA'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {activeView === 'repository' 
                    ? 'Gerencie produtos, avaliações e depoimentos centralizados para suas landing pages'
                    : activeView === 'progress'
                    ? 'Monitore o status de preenchimento das landing pages e produtos'
                    : activeView === 'categories'
                    ? 'Configure campos padrões para categorias e subcategorias'
                    : activeView === 'links'
                    ? 'Gerencie URLs centralizadas para uso em blogs e landing pages'
                    : activeView === 'merchant'
                    ? 'Gerencie seu feed de produtos para Google Shopping'
                    : activeView === 'youtube'
                    ? 'Configure autenticação OAuth para extração de legendas do YouTube'
                    : activeView === 'google-business'
                    ? 'Configure autenticação OAuth para extração de reviews do Google Business Profile'
                    : activeView === 'coupons'
                    ? 'Configure cupons de desconto e mensagens promocionais para WhatsApp'
                    : activeView === 'aftersales'
                    ? 'Crie mensagens sequenciais para robô de atendimento WhatsApp'
                    : activeView === 'cs'
                    ? 'Crie mensagens sequenciais para robô de Customer Success'
                    : 'Configure prompts e dados utilizados na geração de conteúdo IA'
                  }
                </p>
                </div>
              </div>
              <AdminStatusBadge />
            </div>
            
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
              <TabsList className="flex flex-wrap h-auto w-full justify-start">
                <TabsTrigger value="repository" className="gap-2">
                  <Package className="h-4 w-4" />
                  Repositório
                </TabsTrigger>
                <TabsTrigger value="progress" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Progresso
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Categorias
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Links
                </TabsTrigger>
                <TabsTrigger value="prompts" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Prompts IA
                </TabsTrigger>
                <TabsTrigger value="merchant" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Google Merchant
                </TabsTrigger>
                <TabsTrigger value="youtube" className="gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube OAuth
                </TabsTrigger>
                <TabsTrigger value="google-business" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Google Business
                </TabsTrigger>
                <TabsTrigger value="coupons" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Cupons
                </TabsTrigger>
                <TabsTrigger value="aftersales" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Pós-Venda
                </TabsTrigger>
                <TabsTrigger value="cs" className="gap-2">
                  <Headphones className="h-4 w-4" />
                  CS
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="repository">
                <div className="space-y-6">
                  <ProductSEOBatchEnhancer />
                  <RepositoryPanel 
                    landingPageId="repository"
                    onProductSelectionChange={() => {}}
                    onCompanyProfileChange={() => {}}
                  />
                </div>
              </TabsContent>

              <TabsContent value="progress">
                <ContentProgressDashboard />
              </TabsContent>

              <TabsContent value="categories">
                <CategoryManager />
              </TabsContent>

              <TabsContent value="links">
                <LinksManager />
              </TabsContent>

              <TabsContent value="merchant">
                <GoogleMerchantManager />
              </TabsContent>

              <TabsContent value="youtube">
                <div className="space-y-6">
                  <OAuthSettingsCard
                    provider="youtube"
                    title="YouTube Data API"
                    icon={<Youtube className="w-5 h-5" />}
                    testFunctionName="test-youtube-connection"
                  />
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                    <p><strong>Componente OAuth Moderno:</strong> Segurança de produção com client_secret protegido no backend.</p>
                    <p><strong>⚠️ Ação Necessária:</strong> Execute primeiro as migrations SQL em supabase/migrations/</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="google-business">
                <div className="space-y-6">
                  <OAuthSettingsCard
                    provider="googleBusiness"
                    title="Google Business Profile"
                    icon={<Building2 className="w-5 h-5" />}
                    testFunctionName="test-google-business-connection"
                  />
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                    <p><strong>Componente OAuth Moderno:</strong> Segurança de produção com client_secret protegido no backend.</p>
                    <p><strong>⚠️ Ação Necessária:</strong> Execute primeiro as migrations SQL em supabase/migrations/</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="coupons">
                <CouponsManager />
              </TabsContent>

              <TabsContent value="aftersales">
                <AfterSalesManager />
              </TabsContent>

              <TabsContent value="cs">
                <CSManager />
              </TabsContent>

              <TabsContent value="prompts">
                <EnhancedPromptsManager />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Repository;