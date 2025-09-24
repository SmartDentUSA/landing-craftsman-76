import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Copy, ExternalLink } from 'lucide-react';
import { BlogData } from '@/hooks/useBlogData';
import { useToast } from '@/hooks/use-toast';
import { processContentWithIntelligentLinks } from '@/lib/intelligent-links';

interface BlogPreviewProps {
  blogData: BlogData | null;
  landingPageData?: any;
  onEdit: () => void;
}

export function BlogPreview({ blogData, landingPageData, onEdit }: BlogPreviewProps) {
  const { toast } = useToast();

  if (!blogData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview do Blog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum blog para visualizar.</p>
            <Button onClick={onEdit} className="mt-4">
              Criar Novo Blog
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const generateCompleteHTML = () => {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Process content with intelligent links
    const intelligentLinks = landingPageData?.seo?.intelligent_links || {};
    const processedContent = processContentWithIntelligentLinks(blogData.content, intelligentLinks);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${blogData.title}</title>
    <meta name="description" content="${blogData.metaDescription}">
    <meta name="keywords" content="${blogData.keywords.join(', ')}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${blogData.title}">
    <meta property="og:description" content="${blogData.metaDescription}">
    <meta property="og:type" content="article">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${blogData.title}">
    <meta name="twitter:description" content="${blogData.metaDescription}">
    
    <style>
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --text-color: #1e293b;
            --background-color: #f8fafc;
            --white: #ffffff;
            --border-color: #e2e8f0;
        }
        
        * { box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.7;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        
        article {
            background: var(--white);
            border-radius: 12px;
            padding: 3rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-color);
            margin: 0 0 1rem 0;
            line-height: 1.2;
        }
        
        h2, h3, h4 {
            color: var(--primary-color);
            margin: 2rem 0 1rem 0;
        }
        
        h2 { font-size: 1.875rem; }
        h3 { font-size: 1.5rem; }
        h4 { font-size: 1.25rem; }
        
        p {
            margin-bottom: 1.5rem;
            font-size: 1.1rem;
        }
        
        ul, ol {
            margin-bottom: 1.5rem;
            padding-left: 2rem;
        }
        
        li {
            margin-bottom: 0.5rem;
        }
        
        a {
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        
        a:hover {
            color: #1d4ed8;
            text-decoration: underline;
        }
        
        .meta {
            color: var(--secondary-color);
            font-size: 0.875rem;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .description {
            font-size: 1.25rem;
            color: var(--secondary-color);
            margin-bottom: 2rem;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            article { padding: 1.5rem; }
            h1 { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <article>
            <div class="meta">Publicado em ${currentDate}</div>
            <h1>${blogData.title}</h1>
            <p class="description">${blogData.metaDescription}</p>
            <div class="content">
                ${processedContent}
            </div>
        </article>
    </div>
</body>
</html>`;
  };

  const copyHTML = async () => {
    const html = generateCompleteHTML();
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML Copiado!",
        description: "HTML completo do blog copiado para área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro ao Copiar",
        description: "Não foi possível copiar o HTML",
        variant: "destructive",
      });
    }
  };

  const openPreview = () => {
    const html = generateCompleteHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview do Blog
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={copyHTML} size="sm" variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copiar HTML
            </Button>
            <Button onClick={openPreview} size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Preview
            </Button>
            <Button onClick={onEdit} size="sm">
              Editar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={
                blogData.status === 'published' ? 'default' : 
                blogData.status === 'generated' ? 'secondary' : 'outline'
              }
            >
              {blogData.status === 'published' ? 'Publicado' : 
               blogData.status === 'generated' ? 'Gerado' : 'Rascunho'}
            </Badge>
            {blogData.publishedDomains.length > 0 && (
              <div className="flex gap-1">
                {blogData.publishedDomains.map(domain => (
                  <Badge key={domain} variant="outline" className="text-xs">
                    {domain}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {blogData.title}
            </h3>
            <p className="text-muted-foreground">
              {blogData.metaDescription}
            </p>
          </div>

          {/* Content Preview */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Conteúdo (Preview)
            </h4>
            <div 
              className="prose prose-sm max-w-none text-sm"
              dangerouslySetInnerHTML={{ 
                __html: blogData.content.substring(0, 500) + '...'
              }}
            />
          </div>

          {/* Keywords */}
          {blogData.keywords.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Palavras-chave
              </h4>
              <div className="flex flex-wrap gap-1">
                {blogData.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Meta Information */}
          <div className="text-xs text-muted-foreground space-y-1">
            {blogData.createdAt && (
              <p>Criado: {new Date(blogData.createdAt).toLocaleString('pt-BR')}</p>
            )}
            {blogData.updatedAt && (
              <p>Atualizado: {new Date(blogData.updatedAt).toLocaleString('pt-BR')}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}