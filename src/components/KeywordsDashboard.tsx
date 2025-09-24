import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductKeywordsAggregator } from '@/hooks/useProductKeywordsAggregator';
import { useLandingPageKeywordsExtractor } from '@/hooks/useLandingPageKeywordsExtractor';
import { Tag, TrendingUp, AlertCircle, CheckCircle, Eye, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KeywordOrigin {
  source: 'products' | 'categories' | 'faq' | 'solutions' | 'banner' | 'seo';
  keywords: string[];
  count: number;
  quality: number; // 0-100
}

interface KeywordsDashboardProps {
  selectedProductIds: string[];
  landingPageData?: any;
  onKeywordsUpdate?: (keywords: string[]) => void;
  className?: string;
}

export function KeywordsDashboard({ 
  selectedProductIds, 
  landingPageData, 
  onKeywordsUpdate,
  className 
}: KeywordsDashboardProps) {
  const [keywordOrigins, setKeywordOrigins] = useState<KeywordOrigin[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState(0);
  const [gaps, setGaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { aggregateKeywordsFromProducts, enrichKeywordsWithCategories } = useProductKeywordsAggregator();
  const { extractKeywordsFromLandingPage } = useLandingPageKeywordsExtractor();

  useEffect(() => {
    analyzeKeywords();
  }, [selectedProductIds, landingPageData]);

  const analyzeKeywords = async () => {
    setLoading(true);
    try {
      const origins: KeywordOrigin[] = [];

      // 1. Analisar keywords dos produtos
      if (selectedProductIds.length > 0) {
        const productKeywords = await aggregateKeywordsFromProducts(selectedProductIds);
        
        origins.push({
          source: 'products',
          keywords: productKeywords.keywordsBySource.keywords,
          count: productKeywords.keywordsBySource.keywords.length,
          quality: calculateQuality(productKeywords.keywordsBySource.keywords, 'products')
        });

        origins.push({
          source: 'categories',
          keywords: productKeywords.keywordsBySource.categories,
          count: productKeywords.keywordsBySource.categories.length,
          quality: calculateQuality(productKeywords.keywordsBySource.categories, 'categories')
        });
      }

      // 2. Analisar keywords da landing page
      if (landingPageData) {
        const landingPageKeywords = await extractKeywordsFromLandingPage(landingPageData, selectedProductIds);
        
        // Separar por origem
        const faqKeywords = landingPageKeywords.mappings
          .filter(m => m.source === 'faq')
          .map(m => m.keyword);
        
        const solutionKeywords = landingPageKeywords.mappings
          .filter(m => m.source === 'solution')
          .map(m => m.keyword);
        
        const bannerKeywords = landingPageKeywords.mappings
          .filter(m => m.source === 'banner')
          .map(m => m.keyword);

        if (faqKeywords.length > 0) {
          origins.push({
            source: 'faq',
            keywords: faqKeywords,
            count: faqKeywords.length,
            quality: calculateQuality(faqKeywords, 'faq')
          });
        }

        if (solutionKeywords.length > 0) {
          origins.push({
            source: 'solutions',
            keywords: solutionKeywords,
            count: solutionKeywords.length,
            quality: calculateQuality(solutionKeywords, 'solutions')
          });
        }

        if (bannerKeywords.length > 0) {
          origins.push({
            source: 'banner',
            keywords: bannerKeywords,
            count: bannerKeywords.length,
            quality: calculateQuality(bannerKeywords, 'banner')
          });
        }
      }

      // 3. Compilar todas as keywords únicas
      const compiled = origins.flatMap(origin => origin.keywords);
      const unique = [...new Set(compiled)];

      // 4. Calcular score geral de qualidade
      const overallQuality = origins.length > 0 
        ? Math.round(origins.reduce((acc, origin) => acc + origin.quality, 0) / origins.length)
        : 0;

      // 5. Identificar gaps semânticos
      const identifiedGaps = identifySemanticGaps(unique, selectedProductIds);

      setKeywordOrigins(origins);
      setAllKeywords(unique);
      setQualityScore(overallQuality);
      setGaps(identifiedGaps);

      if (onKeywordsUpdate) {
        onKeywordsUpdate(unique);
      }

      toast({
        title: "Dashboard atualizado!",
        description: `${unique.length} keywords únicas analisadas de ${origins.length} fontes.`
      });

    } catch (error) {
      console.error('Erro ao analisar keywords:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar as keywords. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateQuality = (keywords: string[], source: string): number => {
    if (!keywords || keywords.length === 0) return 0;

    // Critérios de qualidade baseados na fonte
    const weights = {
      products: { length: 0.3, uniqueness: 0.4, relevance: 0.3 },
      categories: { length: 0.2, uniqueness: 0.3, relevance: 0.5 },
      faq: { length: 0.4, uniqueness: 0.3, relevance: 0.3 },
      solutions: { length: 0.3, uniqueness: 0.3, relevance: 0.4 },
      banner: { length: 0.2, uniqueness: 0.2, relevance: 0.6 },
      seo: { length: 0.3, uniqueness: 0.3, relevance: 0.4 }
    };

    const weight = weights[source as keyof typeof weights] || weights.products;

    // Calcular métricas
    const lengthScore = Math.min(keywords.length / 10, 1) * 100; // Ideal: 10+ keywords
    const uniquenessScore = (new Set(keywords).size / keywords.length) * 100;
    const relevanceScore = keywords.filter(k => k.length > 3 && k.length < 30).length / keywords.length * 100;

    const quality = (
      lengthScore * weight.length +
      uniquenessScore * weight.uniqueness +
      relevanceScore * weight.relevance
    );

    return Math.round(quality);
  };

  const identifySemanticGaps = (keywords: string[], productIds: string[]): string[] => {
    const gaps = [];

    // Gaps básicos para detectar
    const essentialTerms = ['preço', 'valor', 'custo', 'qualidade', 'garantia', 'entrega', 'atendimento'];
    const missingEssential = essentialTerms.filter(term => 
      !keywords.some(keyword => keyword.toLowerCase().includes(term))
    );

    gaps.push(...missingEssential);

    // Gap de long-tail keywords
    const longTailCount = keywords.filter(k => k.split(' ').length >= 3).length;
    if (longTailCount < keywords.length * 0.3) {
      gaps.push('long-tail keywords insuficientes');
    }

    // Gap de intenção comercial
    const commercialTerms = ['comprar', 'preço', 'valor', 'orçamento', 'contratar'];
    const hasCommercial = commercialTerms.some(term => 
      keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
    if (!hasCommercial) {
      gaps.push('termos comerciais ausentes');
    }

    return gaps.slice(0, 5); // Máximo 5 gaps
  };

  const copyAllKeywords = () => {
    const formatted = allKeywords.join(', ');
    navigator.clipboard.writeText(formatted);
    toast({
      title: "Keywords copiadas!",
      description: `${allKeywords.length} keywords copiadas para área de transferência.`
    });
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-600';
    if (quality >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (quality: number) => {
    if (quality >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (quality >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Dashboard de Keywords Inteligente
              </CardTitle>
              <CardDescription>
                Análise completa das palavras-chave por origem e qualidade
              </CardDescription>
            </div>
            <Button onClick={copyAllKeywords} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copiar Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Analisando keywords...</p>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="origins">Por Origem</TabsTrigger>
                <TabsTrigger value="quality">Qualidade</TabsTrigger>
                <TabsTrigger value="gaps">Gaps</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{allKeywords.length}</div>
                      <div className="text-sm text-muted-foreground">Keywords Únicas</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{keywordOrigins.length}</div>
                      <div className="text-sm text-muted-foreground">Fontes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className={`text-2xl font-bold ${getQualityColor(qualityScore)}`}>
                        {qualityScore}%
                      </div>
                      <div className="text-sm text-muted-foreground">Qualidade</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{gaps.length}</div>
                      <div className="text-sm text-muted-foreground">Gaps</div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Qualidade Geral</h4>
                  <Progress value={qualityScore} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Score baseado em quantidade, unicidade e relevância das keywords
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="origins" className="space-y-4">
                {keywordOrigins.map((origin, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base capitalize">
                          {origin.source === 'products' && 'Produtos'}
                          {origin.source === 'categories' && 'Categorias'}
                          {origin.source === 'faq' && 'FAQ'}
                          {origin.source === 'solutions' && 'Soluções'}
                          {origin.source === 'banner' && 'Banner'}
                          {origin.source === 'seo' && 'SEO'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {getQualityIcon(origin.quality)}
                          <Badge variant="secondary">{origin.count} keywords</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {origin.keywords.slice(0, 10).map((keyword, kidx) => (
                          <Badge key={kidx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {origin.keywords.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{origin.keywords.length - 10} mais
                          </Badge>
                        )}
                      </div>
                      <Progress value={origin.quality} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Qualidade: {origin.quality}%
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="quality" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Análise de Qualidade por Fonte</h4>
                  {keywordOrigins.map((origin, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getQualityIcon(origin.quality)}
                        <span className="capitalize font-medium">
                          {origin.source === 'products' && 'Produtos'}
                          {origin.source === 'categories' && 'Categorias'}
                          {origin.source === 'faq' && 'FAQ'}
                          {origin.source === 'solutions' && 'Soluções'}
                          {origin.source === 'banner' && 'Banner'}
                          {origin.source === 'seo' && 'SEO'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {origin.count} keywords
                        </span>
                        <span className={`font-medium ${getQualityColor(origin.quality)}`}>
                          {origin.quality}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="gaps" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Gaps Semânticos Identificados</h4>
                  {gaps.length > 0 ? (
                    gaps.map((gap, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">{gap}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 p-3 border rounded-lg border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Nenhum gap crítico identificado!</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Recomendações</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Adicione keywords de intenção comercial (preço, comprar, orçamento)</li>
                    <li>• Inclua long-tail keywords (3+ palavras) para capturar tráfego específico</li>
                    <li>• Use variações regionais e sinônimos dos termos principais</li>
                    <li>• Combine keywords técnicas com linguagem do usuário final</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}