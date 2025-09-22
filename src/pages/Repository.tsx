import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { RepositoryPanel } from '@/components/RepositoryPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Repository = () => {
  const navigate = useNavigate();

  return (
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
                <h1 className="text-3xl font-bold tracking-tight">Repositório Central de Dados</h1>
                <p className="text-muted-foreground mt-2">
                  Gerencie produtos, avaliações e depoimentos centralizados para suas landing pages
                </p>
              </div>
            </div>
          </div>
          
          <RepositoryPanel 
            landingPageId="repository"
            onProductSelectionChange={() => {}}
            onCompanyProfileChange={() => {}}
          />
        </div>
      </main>
    </div>
  );
};

export default Repository;