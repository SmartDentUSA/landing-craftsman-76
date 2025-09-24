import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Eye, Settings, TrendingUp, Edit3 } from 'lucide-react';
import { BlogProvider, useBlogContext } from '@/contexts/BlogContext';
import { BlogEditor } from '@/components/blog/BlogEditor';
import { BlogPreview } from '@/components/blog/BlogPreview';
import { AutoGenerationPanel } from '@/components/blog/AutoGenerationPanel';
import { BlogStatusIndicator } from '@/components/blog/BlogStatusIndicator';
import useLandingPages from '@/hooks/useLandingPages';
import { useBlogData } from '@/hooks/useBlogData';

function BlogGeneratorContent() {
  const { 
    selectedLandingPageId, 
    dispatch, 
    activeTab,
    currentBlog,
    generateBlog,
    saveBlog,
    publishBlog,
    intelligentGeneration 
  } = useBlogContext();
  
  const landingPages = useLandingPages((state) => state.landingPages);
  const blogDataResult = useBlogData(selectedLandingPageId);
  const blogData = blogDataResult?.landingPageData;

  const approvedLandingPages = landingPages.filter(lp => lp.status === 'approved');
  const selectedLandingPage = landingPages.find(lp => lp.id === selectedLandingPageId);

  const handleLandingPageChange = (landingPageId: string) => {
    dispatch({ type: 'SET_SELECTED_LANDING_PAGE', payload: landingPageId });
  };

  const handleTabChange = (tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab as any });
  };

  const handlePreview = () => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'preview' });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="p-3 bg-primary rounded-xl text-primary-foreground shadow-lg">
              <Wand2 className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Gerador de Blog Inteligente
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gere conteúdo de blog otimizado para SEO com IA, usando dados dos seus produtos e reviews
          </p>
        </div>

        {/* Landing Page Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Selecionar Landing Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedLandingPageId || ''} onValueChange={handleLandingPageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma landing page aprovada..." />
              </SelectTrigger>
              <SelectContent>
                {approvedLandingPages.map((lp) => (
                  <SelectItem key={lp.id} value={lp.id}>
                    <div className="flex items-center gap-2">
                      <span>{lp.name}</span>
                      <BlogStatusIndicator blogData={null} landingPageData={lp} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Main Interface */}
        {selectedLandingPage && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="auto-generation" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Auto-Geração
              </TabsTrigger>
              <TabsTrigger value="status" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor">
              <BlogEditor
                blogData={currentBlog}
                onSave={saveBlog}
                onPreview={handlePreview}
                onPublish={publishBlog}
              />
            </TabsContent>

            <TabsContent value="preview">
              <BlogPreview
                blogData={currentBlog}
                landingPageData={selectedLandingPage}
                onEdit={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'editor' })}
              />
            </TabsContent>

            <TabsContent value="auto-generation">
              <AutoGenerationPanel
                landingPageId={selectedLandingPage.id}
              />
            </TabsContent>

            <TabsContent value="status">
              <div className="grid gap-4">
                <BlogStatusIndicator blogData={currentBlog} landingPageData={selectedLandingPage} />
                <Card>
                  <CardHeader>
                    <CardTitle>Estatísticas do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Landing Pages Aprovadas:</span>
                        <span>{approvedLandingPages.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Com Blog Gerado:</span>
                        <span>{approvedLandingPages.filter(lp => lp.blogGenerated).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Páginas Elegíveis para Auto-Geração:</span>
                        <span>{intelligentGeneration.eligibleLandingPages.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default function BlogGenerator() {
  return (
    <BlogProvider>
      <BlogGeneratorContent />
    </BlogProvider>
  );
}