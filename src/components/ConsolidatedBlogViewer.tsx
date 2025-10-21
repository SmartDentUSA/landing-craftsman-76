import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, ExternalLink, FileText, Package, Sparkles, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ExtractedBlog {
  id: string;
  title: string;
  type: 'strategic' | 'technical' | 'commercial';
  htmlContent: string;
  order: number;
  productName?: string;
}

interface ConsolidatedBlogViewerProps {
  domain: 'dentala' | 'eodonto';
  blogs: ExtractedBlog[];
  landingPageName: string;
}

export function ConsolidatedBlogViewer({ 
  domain, 
  blogs, 
  landingPageName 
}: ConsolidatedBlogViewerProps) {
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedBlog = useMemo(
    () => blogs.find(b => b.id === selectedBlogId),
    [blogs, selectedBlogId]
  );

  const getTypeBadge = (type: ExtractedBlog['type']) => {
    const badges = {
      strategic: { label: 'Estratégico', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      technical: { label: 'Técnico', className: 'bg-green-100 text-green-800 border-green-300' },
      commercial: { label: 'Comercial', className: 'bg-purple-100 text-purple-800 border-purple-300' }
    };
    return badges[type];
  };

  const copyHTML = () => {
    if (!selectedBlog) return;
    
    navigator.clipboard.writeText(selectedBlog.htmlContent);
    toast({
      title: '✅ HTML Copiado',
      description: `Blog "${selectedBlog.title}" copiado para área de transferência`
    });
  };

  const openInNewTab = () => {
    if (!selectedBlog) return;
    
    const blob = new Blob([selectedBlog.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>
              Preview Consolidado{' '}
              <span className={domain === 'dentala' ? 'text-blue-600' : 'text-green-600'}>
                {domain === 'dentala' ? 'Dentala.com' : 'Eodonto.com'}
              </span>
            </span>
          </div>
          <Badge variant="outline">{blogs.length} {blogs.length === 1 ? 'Conteúdo' : 'Conteúdos'}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {landingPageName}
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex gap-4 min-h-0 p-0">
        {/* Sidebar */}
        <div className="w-[280px] border-r flex flex-col">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              📋 Conteúdo ({blogs.length})
            </h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {blogs.map((blog) => {
                const badge = getTypeBadge(blog.type);
                const isActive = selectedBlogId === blog.id;
                
                return (
                  <button
                    key={blog.id}
                    onClick={() => setSelectedBlogId(blog.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      'hover:bg-muted hover:border-primary/50',
                      isActive && 'bg-primary/5 border-primary shadow-sm'
                    )}
                  >
                    <Badge 
                      variant="outline" 
                      className={cn('mb-2 text-xs', badge.className)}
                    >
                      {badge.label}
                    </Badge>
                    
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">
                      {blog.title}
                    </h4>
                    
                    {blog.productName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Package className="h-3 w-3" />
                        {blog.productName}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedBlog ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Selecione um conteúdo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha um conteúdo ao lado para visualizar o HTML completo
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getTypeBadge(selectedBlog.type).className}>
                    {getTypeBadge(selectedBlog.type).label}
                  </Badge>
                  <span className="text-sm font-medium truncate max-w-md">
                    {selectedBlog.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyHTML}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar HTML
                  </Button>
                  <Button variant="outline" size="sm" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Nova Aba
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <div className="flex-1 p-4 bg-muted/30 overflow-hidden">
                <iframe
                  srcDoc={selectedBlog.htmlContent}
                  className="w-full h-full bg-white rounded-lg border shadow-sm"
                  sandbox="allow-same-origin"
                  title={`Preview: ${selectedBlog.title}`}
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
