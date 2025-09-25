import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { RepositoryPanel } from '@/components/RepositoryPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdminStatusBadge } from '@/components/AdminStatusBadge';
import CategoryManager from '@/components/CategoryManager';
import { PromptsAIManager } from '@/components/PromptsAIManager';

const Repository = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'repository' | 'categories' | 'prompts'>('repository');

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <BreadcrumbNavigation />
        </div>
        
        <main className="container mx-auto px-6 py-8">
          <div className="space-y-6">
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
                  <h1 className="text-3xl font-bold tracking-tight">
                    {activeView === 'repository' ? 'Repositório Central de Dados' : 
                     activeView === 'categories' ? 'Gerenciar Categorias' : 'Prompts IA'}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    {activeView === 'repository' 
                      ? 'Gerencie produtos, avaliações e depoimentos centralizados para suas landing pages'
                      : activeView === 'categories'
                      ? 'Configure campos padrões para categorias e subcategorias'
                      : 'Configure prompts e dados utilizados na geração de conteúdo IA'
                    }
                  </p>
                </div>
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
                    variant={activeView === 'prompts' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveView('prompts')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Prompts IA
                  </Button>
                </div>
                <AdminStatusBadge />
              </div>
            </div>
            
            {activeView === 'repository' ? (
              <RepositoryPanel 
                landingPageId="repository"
                onProductSelectionChange={() => {}}
                onCompanyProfileChange={() => {}}
              />
            ) : activeView === 'categories' ? (
              <CategoryManager />
            ) : (
              <PromptsAIManager />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Repository;