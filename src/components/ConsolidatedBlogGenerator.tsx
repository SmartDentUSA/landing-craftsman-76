import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, FileText, Globe, Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductBlogsIntegration } from '@/hooks/useProductBlogsIntegration';
import { useSEOHTMLGenerator } from '@/hooks/useSEOHTMLGenerator';

interface ConsolidatedBlogGeneratorProps {
  approvedLandingPages: any[];
}

export function ConsolidatedBlogGenerator({ approvedLandingPages }: ConsolidatedBlogGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  
  const {
    productBlogsForHTMLByDomain,
    activeProductBlogsCountByDomain
  } = useProductBlogsIntegration(approvedLandingPages);
  
  const { generateConsolidatedBlogHTML } = useSEOHTMLGenerator();

  const generateConsolidatedHTML = async (domain: 'dentala' | 'eodonto') => {
    setGenerating(true);
    try {
      const blogs = productBlogsForHTMLByDomain(domain);
      
      if (blogs.length === 0) {
        toast({
          title: "Aviso",
          description: `Nenhum blog individual foi encontrado para ${domain}. Configure os blogs nos produtos primeiro.`,
          variant: "destructive",
        });
        return;
      }

      const domainName = domain === 'dentala' ? 'dentala.com.br' : 'eodonto.com';
      const blogType = domain === 'dentala' ? 'técnicos' : 'comerciais';
      
      const consolidatedHTML = generateConsolidatedBlogHTML({
        title: `Análise Completa de Produtos - ${domain === 'dentala' ? 'Dentala' : 'Eodonto'}`,
        description: `Compilação de artigos ${blogType} sobre produtos e serviços especializados para profissionais da odontologia.`,
        domain: domainName,
        blogs: blogs.map(blog => ({
          title: blog.title,
          content: blog.content,
          productName: blog.productName,
          keywords: [] // Keywords serão extraídas do conteúdo
        })),
        includeOffers: domain === 'eodonto'
      });

      await navigator.clipboard.writeText(consolidatedHTML);
      
      toast({
        title: "Sucesso!",
        description: `HTML consolidado para ${domainName} copiado para a área de transferência`,
      });
    } catch (error) {
      console.error('Erro ao gerar HTML consolidado:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar HTML consolidado",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const dentalaCount = activeProductBlogsCountByDomain('dentala');
  const eodontoCount = activeProductBlogsCountByDomain('eodonto');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Gerador de Blog Consolidado</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gera um HTML único consolidando todos os blogs individuais dos produtos selecionados, 
          otimizado para SEO com Schema.org, Open Graph e meta tags completas.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status dos Blogs Disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Dentala (Técnico)</span>
                </div>
                <Badge variant={dentalaCount > 0 ? "default" : "secondary"}>
                  {dentalaCount} blog{dentalaCount !== 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Blogs técnicos especializados para profissionais
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Eodonto (Comercial)</span>
                </div>
                <Badge variant={eodontoCount > 0 ? "default" : "secondary"}>
                  {eodontoCount} blog{eodontoCount !== 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Blogs comerciais focados em vendas
              </p>
            </div>
          </div>

          {/* Aviso se não há blogs */}
          {dentalaCount === 0 && eodontoCount === 0 && (
            <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-medium text-yellow-800 mb-2">Nenhum blog individual encontrado</h3>
              <p className="text-sm text-yellow-700">
                Configure os blogs individuais nos produtos primeiro, usando as preferências de consolidação.
              </p>
            </div>
          )}

          {/* Botões de Geração */}
          {(dentalaCount > 0 || eodontoCount > 0) && (
            <div className="space-y-4">
              <h3 className="font-medium">Gerar HTML Consolidado:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => generateConsolidatedHTML('dentala')}
                  disabled={generating || dentalaCount === 0}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  variant={dentalaCount > 0 ? "default" : "secondary"}
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Globe className="h-5 w-5" />
                  )}
                  <div className="text-center">
                    <div className="font-medium">Dentala HTML</div>
                    <div className="text-xs opacity-75">
                      {dentalaCount} blog{dentalaCount !== 1 ? 's' : ''} técnico{dentalaCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => generateConsolidatedHTML('eodonto')}
                  disabled={generating || eodontoCount === 0}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  variant={eodontoCount > 0 ? "default" : "secondary"}
                >
                  {generating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                  <div className="text-center">
                    <div className="font-medium">Eodonto HTML</div>
                    <div className="text-xs opacity-75">
                      {eodontoCount} blog{eodontoCount !== 1 ? 's' : ''} comercial{eodontoCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Recursos SEO Incluídos */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-3">🚀 Recursos SEO Incluídos:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Schema.org ItemList estruturado</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Open Graph completo</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Twitter Cards otimizados</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Meta tags avançadas</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>URLs canônicas por domínio</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Links inteligentes integrados</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Responsive design mobile</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Keywords consolidadas</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}