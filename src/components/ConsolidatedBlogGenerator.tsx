import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, FileText, Globe, Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductBlogsIntegration } from '@/hooks/useProductBlogsIntegration';
import { useSEOHTMLGenerator } from '@/hooks/useSEOHTMLGenerator';
import { useSelectedProducts } from '@/hooks/useSelectedProducts';
import { useLandingPagesSupabase } from '@/hooks/useLandingPagesSupabase';
import { generateAdvancedIntelligentLinks, processContentWithAdvancedIntelligentLinks } from '@/lib/intelligent-links-advanced';
import { supabase } from '@/integrations/supabase/client';

interface ConsolidatedBlogGeneratorProps {
  approvedLandingPages: any[];
}

export function ConsolidatedBlogGenerator({ approvedLandingPages }: ConsolidatedBlogGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { getProductsForTemplate } = useSelectedProducts();
  const { getLandingPage } = useLandingPagesSupabase();
  
  const {
    productBlogsForHTMLByDomain,
    activeProductBlogsCountByDomain
  } = useProductBlogsIntegration(approvedLandingPages);
  
  const { generateConsolidatedBlogHTML } = useSEOHTMLGenerator();

  const generateConsolidatedHTML = async (domain: 'dentala' | 'eodonto', landingPageId?: string) => {
    try {
      setGenerating(true);
      
      // Get blogs for the specific domain, optionally filtered by landing page
      const blogsForDomain = productBlogsForHTMLByDomain(domain, landingPageId);
      
      if (blogsForDomain.length === 0) {
        toast({
          title: "Nenhum blog disponível",
          description: `Não há blogs disponíveis para o domínio ${domain}`,
          variant: "destructive"
        });
        return;
      }

      // Gather SEO data from all landing pages involved
      const landingPageSEOData = approvedLandingPages.map(lp => {
        const lpData = getLandingPage(lp.id);
        return {
          id: lp.id,
          name: lp.name,
          seo_title: lpData?.data?.seo?.seo_title || lp.name,
          seo_description: lpData?.data?.seo?.seo_description || '',
          ai_keywords: lpData?.data?.seo?.ai_keywords || [],
          selected_product_ids: lpData?.selected_product_ids || [],
          image1_url: lpData?.data?.image1?.url || null
        };
      });

      // Fetch company profile with SEO Hidden fields
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select(`
          company_name,
          company_description,
          seo_context_keywords,
          seo_market_positioning,
          seo_competitive_advantages,
          seo_technical_expertise,
          seo_service_areas
        `)
        .single();
      
      // Extract SEO Hidden data for enhanced meta descriptions and schemas
      const seoHiddenData = companyProfile ? {
        contextKeywords: Array.isArray(companyProfile.seo_context_keywords) ? 
          companyProfile.seo_context_keywords.filter((k): k is string => typeof k === 'string') : [],
        marketPositioning: (companyProfile.seo_market_positioning as string) || '',
        competitiveAdvantages: (companyProfile.seo_competitive_advantages as string) || '',
        technicalExpertise: (companyProfile.seo_technical_expertise as string) || '',
        serviceAreas: (companyProfile.seo_service_areas as string) || ''
      } : null;

      // Extract standard image (image1) from first landing page that has one
      const ogImage = landingPageSEOData.find(lp => lp.image1_url)?.image1_url;

      // Gather all selected products data for SEO
      const allSelectedProductIds = [...new Set(landingPageSEOData.flatMap(lp => lp.selected_product_ids))];
      const selectedProductsData = await getProductsForTemplate(allSelectedProductIds);

      // Aggregate all keywords including SEO Hidden fields
      const aggregatedKeywords = [
        ...new Set([
          ...landingPageSEOData.flatMap(lp => lp.ai_keywords),
          ...selectedProductsData.flatMap(p => [...(p.keywords || []), ...(p.market_keywords || []), ...(p.search_intent_keywords || [])]),
          ...(seoHiddenData?.contextKeywords || [])
        ])
      ];

      // Generate advanced intelligent links for each blog
      const blogsWithAdvancedLinks = await Promise.all(
        blogsForDomain.map(async (blog) => {
          const intelligentLinks = await generateAdvancedIntelligentLinks({
            content: blog.content,
            customLinks: {}, // Could be enhanced with custom links
            landingPagesData: landingPageSEOData,
            productUrl: selectedProductsData.find(p => p.name === blog.productName)?.productUrl,
            relatedProducts: selectedProductsData.filter(p => p.name !== blog.productName),
            productKeywords: selectedProductsData.find(p => p.name === blog.productName)?.keywords || [],
            productCategories: selectedProductsData.find(p => p.name === blog.productName)?.category ? [selectedProductsData.find(p => p.name === blog.productName)?.category] : []
          });

          const processedContent = processContentWithAdvancedIntelligentLinks(blog.content, intelligentLinks);

          return {
            title: blog.title,
            content: processedContent,
            productName: blog.productName,
            keywords: []
          };
        })
      );

      // Generate enhanced meta description with SEO Hidden data
      const enhancedDescription = seoHiddenData ? 
        `${seoHiddenData.marketPositioning || `Conteúdo técnico e comercial consolidado para ${domain}`} com ${blogsForDomain.length} blogs e ${selectedProductsData.length} produtos. ${seoHiddenData.competitiveAdvantages}`.substring(0, 160) :
        `Conteúdo técnico e comercial consolidado para ${domain} com ${blogsForDomain.length} blogs e ${selectedProductsData.length} produtos`;

      // Generate consolidated HTML with full SEO integration
      const consolidatedHTML = generateConsolidatedBlogHTML({
        title: `Blog Consolidado - ${domain === 'dentala' ? 'Dentala' : 'Eodonto'}`,
        description: enhancedDescription,
        domain: domain,
        blogs: blogsWithAdvancedLinks,
        landingPagesSEO: landingPageSEOData,
        selectedProducts: selectedProductsData,
        aggregatedKeywords: aggregatedKeywords,
        ogImage: ogImage,
        seoHiddenData: seoHiddenData
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(consolidatedHTML);
      
      toast({
        title: "HTML Consolidado SEO Completo!",
        description: `HTML com ${blogsForDomain.length} blogs, dados de ${landingPageSEOData.length} landing pages e ${selectedProductsData.length} produtos copiado${ogImage ? ' (com imagem padrão)' : ''}`,
      });

    } catch (error) {
      console.error('Erro ao gerar HTML consolidado:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar HTML consolidado",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const dentalaCount = activeProductBlogsCountByDomain('dentala');
  const eodontoCount = activeProductBlogsCountByDomain('eodonto');

  // Group blogs by landing page for statistics
  const landingPageStats = useMemo(() => {
    const stats: Record<string, { dentala: number; eodonto: number; name: string }> = {};
    
    approvedLandingPages.forEach(lp => {
      const dentalaBlogs = productBlogsForHTMLByDomain('dentala', lp.id);
      const eodontoBlogs = productBlogsForHTMLByDomain('eodonto', lp.id);
      
      stats[lp.id] = {
        dentala: dentalaBlogs.length,
        eodonto: eodontoBlogs.length,
        name: lp.name || lp.id
      };
    });
    
    return stats;
  }, [approvedLandingPages, productBlogsForHTMLByDomain]);

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

          {/* Landing Page Statistics */}
          {Object.keys(landingPageStats).length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
              <h4 className="font-medium mb-3">📊 Blogs por Landing Page:</h4>
              <div className="space-y-2">
                {Object.entries(landingPageStats).map(([lpId, stats]) => (
                  <div key={lpId} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stats.name}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-blue-600">
                        {stats.dentala} Dentala
                      </Badge>
                      <Badge variant="outline" className="text-green-600">
                        {stats.eodonto} Eodonto
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aviso se não há blogs */}
          {dentalaCount === 0 && eodontoCount === 0 && (
            <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-medium text-yellow-800 mb-2">Nenhum blog individual encontrado</h3>
              <p className="text-sm text-yellow-700">
                Configure os blogs individuais nos produtos primeiro. As preferências de consolidação são definidas automaticamente quando há conteúdo disponível.
                <br />
                <strong>Verifique no console</strong> os logs detalhados sobre produtos com blogs.
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
                        {dentalaCount > 0 
                          ? `${dentalaCount} blog${dentalaCount !== 1 ? 's' : ''} técnico${dentalaCount !== 1 ? 's' : ''} disponíve${dentalaCount !== 1 ? 'is' : 'l'}`
                          : "Nenhum blog técnico encontrado"
                        }
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
                      {eodontoCount > 0 
                        ? `${eodontoCount} blog${eodontoCount !== 1 ? 's' : ''} comercial${eodontoCount !== 1 ? 's' : ''} disponíve${eodontoCount !== 1 ? 'is' : 'l'}`
                        : "Nenhum blog comercial encontrado"
                      }
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
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Imagem padrão automática (image1)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">✓</Badge>
                <span>Artigos com URLs clicáveis</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}