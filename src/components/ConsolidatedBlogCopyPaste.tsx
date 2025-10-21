import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, FileText, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConsolidatedHTML {
  dentala: string;
  eodonto: string;
  generatedAt: string;
  productBlogsCount: { dentala: number; eodonto: number };
  strategicBlogTitle: { dentala: string; eodonto: string };
}

interface ConsolidatedBlogCopyPasteProps {
  approvedLandingPages: any[];
  consolidatedHTMLs: { [landingPageId: string]: ConsolidatedHTML };
}

export function ConsolidatedBlogCopyPaste({
  approvedLandingPages,
  consolidatedHTMLs,
}: ConsolidatedBlogCopyPasteProps) {
  const { toast } = useToast();

  // Estatísticas agregadas
  const stats = useMemo(() => {
    const landingPagesWithBlogs = approvedLandingPages.filter(
      lp => consolidatedHTMLs[lp.id]
    );

    const totalDentalaBlogs = landingPagesWithBlogs.reduce(
      (sum, lp) => sum + (consolidatedHTMLs[lp.id]?.productBlogsCount.dentala || 0) + 1, // +1 para o estratégico
      0
    );

    const totalEodontoBlogs = landingPagesWithBlogs.reduce(
      (sum, lp) => sum + (consolidatedHTMLs[lp.id]?.productBlogsCount.eodonto || 0) + 1, // +1 para o estratégico
      0
    );

    const lastGenerated = landingPagesWithBlogs.reduce<string | null>(
      (latest, lp) => {
        const lpGenerated = consolidatedHTMLs[lp.id]?.generatedAt;
        if (!lpGenerated) return latest;
        if (!latest) return lpGenerated;
        return new Date(lpGenerated) > new Date(latest) ? lpGenerated : latest;
      },
      null
    );

    return {
      landingPagesCount: landingPagesWithBlogs.length,
      totalDentalaBlogs,
      totalEodontoBlogs,
      lastGenerated,
    };
  }, [approvedLandingPages, consolidatedHTMLs]);

  // Mesclar todos os HTMLs de cada domínio
  const mergeHTMLs = (domain: 'dentala' | 'eodonto'): string => {
    const landingPagesWithBlogs = approvedLandingPages.filter(
      lp => consolidatedHTMLs[lp.id]
    );

    if (landingPagesWithBlogs.length === 0) {
      return '';
    }

    // Se houver apenas uma landing page, retornar direto
    if (landingPagesWithBlogs.length === 1) {
      return consolidatedHTMLs[landingPagesWithBlogs[0].id][domain];
    }

    // Mesclar múltiplos HTMLs
    const allHTMLs = landingPagesWithBlogs.map(
      lp => consolidatedHTMLs[lp.id][domain]
    );

    // Extrair <head> do primeiro HTML
    const firstHTML = allHTMLs[0];
    const headMatch = firstHTML.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch ? headMatch[0] : '';

    // Extrair e combinar <body> de todos os HTMLs
    const bodies = allHTMLs.map(html => {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? bodyMatch[1] : '';
    });

    const combinedBody = bodies.join('\n\n<!-- Nova Landing Page -->\n\n');

    // Construir HTML final
    return `<!DOCTYPE html>
<html lang="pt-BR">
${head}
<body>
${combinedBody}
</body>
</html>`;
  };

  const copyToClipboard = async (domain: 'dentala' | 'eodonto') => {
    try {
      const finalHTML = mergeHTMLs(domain);
      
      if (!finalHTML) {
        toast({
          title: 'Nenhum conteúdo',
          description: `Não há HTMLs consolidados para ${domain.toUpperCase()}`,
          variant: 'destructive',
        });
        return;
      }

      await navigator.clipboard.writeText(finalHTML);

      toast({
        title: `✅ HTML ${domain.toUpperCase()} copiado`,
        description: `${stats.landingPagesCount} landing page${stats.landingPagesCount !== 1 ? 's' : ''} consolidada${stats.landingPagesCount !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Erro ao copiar HTML:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao copiar HTML para área de transferência',
        variant: 'destructive',
      });
    }
  };

  const hasContent = stats.landingPagesCount > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>📋 HTML Blogs Copy & Paste</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Copie os HTMLs consolidados finais de todos os blogs aprovados
        </p>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <div className="text-center p-8 bg-muted/50 rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-muted-foreground mb-2">
              HTML não disponível
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {approvedLandingPages.length === 0 
                ? 'Nenhuma landing page aprovada encontrada. Aprove uma landing page primeiro.'
                : `${approvedLandingPages.length} landing page${approvedLandingPages.length !== 1 ? 's' : ''} aprovada${approvedLandingPages.length !== 1 ? 's' : ''}, mas sem blogs consolidados gerados.`
              }
            </p>
            {approvedLandingPages.length > 0 && (
              <div className="text-xs text-muted-foreground mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold mb-2 text-blue-800">💡 Como gerar os HTMLs consolidados:</p>
                <ol className="list-decimal list-inside mt-2 text-left space-y-1 text-blue-700">
                  <li>Vá ao <strong>Editor da Landing Page</strong> (abaixo da lista de LPs aprovadas)</li>
                  <li>Localize a seção <strong>"📰 Preview Consolidado"</strong></li>
                  <li>Clique no botão <strong>"Gerar HTML Consolidado"</strong></li>
                  <li>Aguarde a geração (pode levar alguns segundos)</li>
                  <li>Volte para esta página — os HTMLs estarão disponíveis para copiar</li>
                </ol>
                <div className="mt-3 p-2 bg-white rounded border border-blue-300">
                  <p className="text-xs font-medium text-blue-900">
                    ⚠️ <strong>Cache-First:</strong> HTMLs não são gerados automaticamente para economizar créditos. Geração manual garante controle total.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Landing Pages</span>
                </div>
                <div className="text-2xl font-bold">{stats.landingPagesCount}</div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Dentala</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {stats.totalDentalaBlogs} blog{stats.totalDentalaBlogs !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {stats.landingPagesCount} estratégico{stats.landingPagesCount !== 1 ? 's' : ''} + {stats.totalDentalaBlogs - stats.landingPagesCount} técnico{(stats.totalDentalaBlogs - stats.landingPagesCount) !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Eodonto</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {stats.totalEodontoBlogs} blog{stats.totalEodontoBlogs !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {stats.landingPagesCount} estratégico{stats.landingPagesCount !== 1 ? 's' : ''} + {stats.totalEodontoBlogs - stats.landingPagesCount} comercia{(stats.totalEodontoBlogs - stats.landingPagesCount) !== 1 ? 'is' : 'l'}
                </div>
              </div>
            </div>

            {/* Última Geração */}
            {stats.lastGenerated && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Última atualização:{' '}
                  {formatDistanceToNow(new Date(stats.lastGenerated), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}

            <Separator />

            {/* Botões de Copy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => copyToClipboard('dentala')}
                size="lg"
                className="h-auto p-6 flex flex-col items-start space-y-2"
              >
                <div className="flex items-center space-x-2 w-full">
                  <Copy className="h-5 w-5" />
                  <span className="font-semibold">Copiar Dentala HTML</span>
                </div>
                <div className="text-xs opacity-90 text-left">
                  Blog consolidado completo com {stats.totalDentalaBlogs} artigo{stats.totalDentalaBlogs !== 1 ? 's' : ''}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {stats.landingPagesCount} landing page{stats.landingPagesCount !== 1 ? 's' : ''}
                </Badge>
              </Button>

              <Button
                onClick={() => copyToClipboard('eodonto')}
                size="lg"
                className="h-auto p-6 flex flex-col items-start space-y-2"
              >
                <div className="flex items-center space-x-2 w-full">
                  <Copy className="h-5 w-5" />
                  <span className="font-semibold">Copiar Eodonto HTML</span>
                </div>
                <div className="text-xs opacity-90 text-left">
                  Blog consolidado completo com {stats.totalEodontoBlogs} artigo{stats.totalEodontoBlogs !== 1 ? 's' : ''}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {stats.landingPagesCount} landing page{stats.landingPagesCount !== 1 ? 's' : ''}
                </Badge>
              </Button>
            </div>

            {/* Detalhes das Landing Pages */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-3 text-sm">📄 Landing Pages Incluídas:</h4>
              <div className="space-y-2">
                {approvedLandingPages
                  .filter(lp => consolidatedHTMLs[lp.id])
                  .map(lp => {
                    const lpData = consolidatedHTMLs[lp.id];
                    return (
                      <div key={lp.id} className="flex items-center justify-between text-sm p-2 bg-background rounded">
                        <span className="font-medium">{lp.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-blue-600">
                            {lpData.productBlogsCount.dentala + 1} Dentala
                          </Badge>
                          <Badge variant="outline" className="text-xs text-green-600">
                            {lpData.productBlogsCount.eodonto + 1} Eodonto
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
