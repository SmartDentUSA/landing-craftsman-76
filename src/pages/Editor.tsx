import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Eye, Wand2, Settings } from 'lucide-react';
import { BlogProvider } from '@/contexts/BlogContext';
import { BlogEditor } from '@/components/blog/BlogEditor';
import { BlogPreview } from '@/components/blog/BlogPreview';
import { AutoGenerationPanel } from '@/components/blog/AutoGenerationPanel';
import { BlogStatusIndicator } from '@/components/blog/BlogStatusIndicator';
import { useBlogData } from '@/hooks/useBlogData';
import { useLandingPagesSupabase } from '@/hooks/useLandingPagesSupabase';

function EditorContent() {
  const { landingPageId } = useParams<{ landingPageId: string }>();
  const blogDataResult = useBlogData(landingPageId);
  const blogData = blogDataResult?.landingPageData;
  const { landingPages, getLandingPage, isLoading } = useLandingPagesSupabase();
  const landingPage = getLandingPage(landingPageId || '');
  
  console.log('🔍 Editor Debug:', {
    landingPageId,
    landingPagesCount: landingPages.length,
    isLoading,
    foundLandingPage: !!landingPage,
    allLandingPageIds: landingPages.map(lp => lp.id)
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Carregando dados da landing page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!landingPageId || !landingPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Landing Page não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              A landing page especificada não foi encontrada ou não existe.
            </p>
            <Button asChild>
              <a href="/blog-generator">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Gerador
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async (data: any) => {
    console.log('Saving blog data:', data);
    // Implementation will be handled by the BlogContext
  };

  const handlePreview = () => {
    console.log('Opening preview');
  };

  const handlePublish = async (domains: string[]) => {
    console.log('Publishing to domains:', domains);
    // Implementation will be handled by the BlogContext
  };

  const handleGenerate = async (options: any) => {
    console.log('Generating blog with options:', options);
    // Implementation will be handled by the BlogContext
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <a href="/blog-generator">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </a>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Editor de Blog
                </h1>
                <p className="text-sm text-muted-foreground">
                  {landingPage.name}
                </p>
              </div>
            </div>
            <BlogStatusIndicator blogData={null} landingPageData={landingPage} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
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
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-6">
            <BlogEditor
              blogData={null}
              onSave={handleSave}
              onPreview={handlePreview}
              onPublish={handlePublish}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <BlogPreview
              blogData={null}
              landingPageData={landingPage}
              onEdit={() => {
                // Switch to editor tab
                const editorTab = document.querySelector('[value="editor"]') as HTMLElement;
                editorTab?.click();
              }}
            />
          </TabsContent>

          <TabsContent value="auto-generation" className="space-y-6">
            <AutoGenerationPanel
              landingPageId={landingPage.id}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Blog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Landing Page ID</label>
                      <p className="text-sm text-muted-foreground">{landingPageId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Template</label>
                      <p className="text-sm text-muted-foreground">{landingPage.template}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">{landingPage.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Última Modificação</label>
                     <p className="text-sm text-muted-foreground">
                       {new Date(landingPage.last_modified).toLocaleString('pt-BR')}
                     </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <BlogProvider>
      <EditorContent />
    </BlogProvider>
  );
}