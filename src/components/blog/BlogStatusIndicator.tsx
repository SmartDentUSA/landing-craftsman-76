import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Globe, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { BlogData } from '@/hooks/useBlogData';

interface BlogStatusIndicatorProps {
  blogData: BlogData | null;
  syncStatus?: {
    isOutOfSync: boolean;
    lastCheck: Date | null;
  };
  landingPageData?: any;
}

export function BlogStatusIndicator({ 
  blogData, 
  syncStatus, 
  landingPageData 
}: BlogStatusIndicatorProps) {
  const getStatusIcon = () => {
    if (!blogData) return <FileText className="h-4 w-4" />;
    
    switch (blogData.status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'generated':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    if (!blogData) return 'Nenhum blog';
    
    switch (blogData.status) {
      case 'published':
        return 'Publicado';
      case 'generated':
        return 'Gerado pela IA';
      case 'draft':
        return 'Rascunho';
      default:
        return 'Status desconhecido';
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!blogData) return 'outline';
    
    switch (blogData.status) {
      case 'published':
        return 'default';
      case 'generated':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Main Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">Status do Blog</span>
            </div>
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
          </div>

          {/* Blog Title */}
          {blogData && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Título Atual</h3>
              <p className="text-sm">{blogData.title}</p>
            </div>
          )}

          {/* Published Domains */}
          {blogData && blogData.publishedDomains.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Domínios Publicados
              </h4>
              <div className="flex flex-wrap gap-1">
                {blogData.publishedDomains.map(domain => (
                  <Badge key={domain} variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${syncStatus.isOutOfSync ? 'text-orange-500' : 'text-green-500'}`} />
              <span className="text-sm">
                {syncStatus.isOutOfSync ? 'Fora de sincronia' : 'Sincronizado'}
              </span>
              {syncStatus.isOutOfSync && (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
            </div>
          )}

          {/* Last Update */}
          {blogData && (
            <div className="text-xs text-muted-foreground space-y-1">
              {blogData.createdAt && (
                <p>Criado: {new Date(blogData.createdAt).toLocaleString('pt-BR')}</p>
              )}
              {blogData.updatedAt && (
                <p>Atualizado: {new Date(blogData.updatedAt).toLocaleString('pt-BR')}</p>
              )}
              {syncStatus?.lastCheck && (
                <p>Última verificação: {syncStatus.lastCheck.toLocaleString('pt-BR')}</p>
              )}
            </div>
          )}

          {/* Quality Indicators */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Qualidade do Conteúdo
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                {blogData?.title && blogData.title.length >= 10 ? 
                  <CheckCircle className="h-3 w-3 text-green-500" /> : 
                  <AlertCircle className="h-3 w-3 text-red-500" />
                }
                Título (mín. 10 chars)
              </div>
              <div className="flex items-center gap-2 text-sm">
                {blogData?.metaDescription && blogData.metaDescription.length >= 50 ? 
                  <CheckCircle className="h-3 w-3 text-green-500" /> : 
                  <AlertCircle className="h-3 w-3 text-red-500" />
                }
                Meta Description (mín. 50 chars)
              </div>
              <div className="flex items-center gap-2 text-sm">
                {blogData?.content && blogData.content.length >= 500 ? 
                  <CheckCircle className="h-3 w-3 text-green-500" /> : 
                  <AlertCircle className="h-3 w-3 text-red-500" />
                }
                Conteúdo (mín. 500 chars)
              </div>
              <div className="flex items-center gap-2 text-sm">
                {blogData?.keywords && blogData.keywords.length >= 3 ? 
                  <CheckCircle className="h-3 w-3 text-green-500" /> : 
                  <AlertCircle className="h-3 w-3 text-red-500" />
                }
                Keywords (mín. 3)
              </div>
            </div>
          </div>

          {/* Sync Warning */}
          {syncStatus?.isOutOfSync && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Atenção!</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                O blog pode estar desatualizado em relação aos dados da landing page. 
                Considere regenerar o conteúdo.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}