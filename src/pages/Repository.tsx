import React, { useState } from 'react';
import { TopNavigation } from '@/components/TopNavigation';
import { RepositoryPanel } from '@/components/RepositoryPanel';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminStatusBadge } from '@/components/AdminStatusBadge';
import CategoryManager from '@/components/CategoryManager';
import { EnhancedPromptsManager } from '@/components/EnhancedPromptsManager';
import { LinksManager } from '@/components/LinksManager';
import { GoogleMerchantManager } from '@/components/GoogleMerchantManager';
import { ProductSEOBatchEnhancer } from '@/components/ProductSEOBatchEnhancer';
import YouTubeOAuthSettings from '@/pages/YouTubeOAuthSettings';

const Repository = () => {
  const [activeView, setActiveView] = useState<'repository' | 'categories' | 'prompts' | 'links' | 'merchant' | 'youtube'>('repository');

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex flex-col min-h-screen bg-background">
        <TopNavigation />
        
        <main className="flex-1 container mx-auto px-6 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {activeView === 'repository' ? 'Repositório Central de Dados' : 
                   activeView === 'categories' ? 'Gerenciar Categorias' : 
                   activeView === 'links' ? 'Gerenciador de Links' : 
                   activeView === 'merchant' ? 'Google Merchant Center' : 
                   activeView === 'youtube' ? 'YouTube OAuth' : 'Prompts IA'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {activeView === 'repository' 
                    ? 'Gerencie produtos, avaliações e depoimentos centralizados para suas landing pages'
                    : activeView === 'categories'
                    ? 'Configure campos padrões para categorias e subcategorias'
                    : activeView === 'links'
                    ? 'Gerencie URLs centralizadas para uso em blogs e landing pages'
                    : activeView === 'merchant'
                    ? 'Gerencie seu feed de produtos para Google Shopping'
                    : activeView === 'youtube'
                    ? 'Configure autenticação OAuth para extração de legendas do YouTube'
                    : 'Configure prompts e dados utilizados na geração de conteúdo IA'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex bg-muted rounded-lg p-1">
                  <Button
                    variant={activeView === 'repository' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('repository')}
                  >
                    Repositório
                  </Button>
                  <Button
                    variant={activeView === 'categories' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('categories')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Categorias
                  </Button>
                  <Button
                    variant={activeView === 'links' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('links')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Links
                  </Button>
                  <Button
                    variant={activeView === 'prompts' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('prompts')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Prompts IA
                  </Button>
                  <Button
                    variant={activeView === 'merchant' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('merchant')}
                  >
                    Google Merchant
                  </Button>
                  <Button
                    variant={activeView === 'youtube' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('youtube')}
                  >
                    YouTube OAuth
                  </Button>
                </div>
                <AdminStatusBadge />
              </div>
            </div>
            
            {activeView === 'repository' ? (
              <div className="space-y-6">
                <ProductSEOBatchEnhancer />
                <RepositoryPanel 
                  landingPageId="repository"
                  onProductSelectionChange={() => {}}
                  onCompanyProfileChange={() => {}}
                />
              </div>
            ) : activeView === 'categories' ? (
              <CategoryManager />
            ) : activeView === 'links' ? (
              <LinksManager />
            ) : activeView === 'merchant' ? (
              <GoogleMerchantManager />
            ) : activeView === 'youtube' ? (
              <YouTubeOAuthSettings />
            ) : (
              <EnhancedPromptsManager />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Repository;