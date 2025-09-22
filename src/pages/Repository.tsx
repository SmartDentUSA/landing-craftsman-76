import React from 'react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { RepositoryPanel } from '@/components/RepositoryPanel';

const Repository = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <BreadcrumbNavigation />
      </div>
      
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Repositório Central de Dados</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie produtos, avaliações e depoimentos centralizados para suas landing pages
            </p>
          </div>
          
          <RepositoryPanel 
            landingPageId=""
            onProductSelectionChange={() => {}}
            onCompanyProfileChange={() => {}}
          />
        </div>
      </main>
    </div>
  );
};

export default Repository;