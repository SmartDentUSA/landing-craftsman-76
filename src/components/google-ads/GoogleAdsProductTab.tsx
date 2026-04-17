import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Download, AlertTriangle, CheckCircle, RefreshCw, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleAdsCampaignConfig, ValidationWarning, AdPreview } from '@/types/google-ads';
import { KeywordManager } from './KeywordManager';
import { SitelinksManager } from './SitelinksManager';
import { VideoManager } from './VideoManager';
import { AdPreviewCards } from './AdPreviewCards';
import { UTMBuilder } from './UTMBuilder';
import { WarningsPanel } from './WarningsPanel';
import { QualityReportPanel } from './QualityReportPanel';
import { CollectorStrategyToggle } from './CollectorStrategyToggle';
import type { QualityReport, CollectorStrategy } from '@/types/google-ads';
import { DisplayBannerGenerator } from './DisplayBannerGenerator';
import { VideoCollector } from '@/lib/google-ads/collectors/VideoCollector';
import { SitelinksCollector } from '@/lib/google-ads/collectors/SitelinksCollector';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
  benefits?: string[];
  features?: string[];
  sales_pitch?: string;
  technical_videos?: any[];
  testimonial_videos?: any[];
  youtube_videos?: any[];
  instagram_videos?: any[];
  product_url?: string;
  image_url?: string;
  images_gallery?: Array<{ url: string; alt?: string }>;
}

interface GoogleAdsProductTabProps {
  product: Product;
  onUpdate?: (config: GoogleAdsCampaignConfig) => void;
}

export const GoogleAdsProductTab = ({ product, onUpdate }: GoogleAdsProductTabProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAds, setIsGeneratingAds] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [campaignConfig, setCampaignConfig] = useState<GoogleAdsCampaignConfig>({
    enabled: true,
    type: 'search',
    objective: 'leads',
    daily_budget_brl: 30,
    locations: ['Brazil'],
    languages: ['pt-BR'],
    bidding: { strategy: 'MAX_CONV' },
    include_ai_keywords: true,
    include_faq_longtail: false, // Products don't have FAQs
    extra_keywords: [],
    negatives: [],
    ecommerce_links: [],
    include_brand_policies: true,
    custom_institutional_links: [],
    callouts: [],
    youtube_videos: [],
    utm: {
      source: 'google',
      medium: 'cpc',
      campaign: product.name.toLowerCase().replace(/\s+/g, '-'),
      content: `product-${product.id}`,
      term: product.category?.toLowerCase()
    }
  });

  const [adPreview, setAdPreview] = useState<AdPreview | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [collectorStrategy, setCollectorStrategy] = useState<CollectorStrategy>('niche');

  // Remove useDebounce - usar campaignConfig diretamente

  // Enhanced product keywords for Google Ads
  const getProductKeywords = useCallback(() => {
    const keywords = new Set<string>();
    
    // Add product name variations
    keywords.add(product.name);
    if (product.category) keywords.add(product.category);
    if (product.subcategory) keywords.add(product.subcategory);
    
    // Add configured keywords
    product.keywords?.forEach(k => keywords.add(k));
    product.market_keywords?.forEach(k => keywords.add(k));
    product.search_intent_keywords?.forEach(k => keywords.add(k));
    
    // Add commercial intent keywords
    keywords.add(`comprar ${product.name}`);
    keywords.add(`${product.name} preço`);
    keywords.add(`${product.name} oferta`);
    if (product.category) {
      keywords.add(`${product.category} ${product.name}`);
    }
    
    return Array.from(keywords).filter(k => k && k.length > 2);
  }, [product]);

  // Product-specific data for AI generation
  const getProductData = useCallback(() => {
    return {
      page_title: product.name,
      page_subtitle: product.description || 'Produto de alta qualidade',
      keywords: getProductKeywords(),
      productDetails: {
        name: product.name,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        salesPitch: product.sales_pitch,
        benefits: product.benefits || [],
        features: product.features || [],
        productUrl: product.product_url
      }
    };
  }, [product, getProductKeywords]);

  const validateAndPreview = useCallback(async (config: GoogleAdsCampaignConfig) => {
    if (!config.enabled) {
      setAdPreview(null);
      setWarnings([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Auto-collect sitelinks from various sources
      const intelligentLinks = product.product_url ? { [product.name]: product.product_url } : {};
      const ecommerceSitelinks = SitelinksCollector.collectFromIntelligentLinks(intelligentLinks);
      
      // Collect from company profile
      const companySitelinks = await SitelinksCollector.collectFromCompanyProfile();
      
      // Collect from product CTAs
      const productCTASitelinks = SitelinksCollector.collectFromResourceCTAs([product]);
      
      const allSitelinks = [...ecommerceSitelinks, ...companySitelinks, ...productCTASitelinks];
      const { valid: validSitelinks, warnings: sitelinkWarnings } = SitelinksCollector.validateSitelinks(
        allSitelinks, 
        product.product_url || 'https://example.com'
      );

      // Collect videos - simplified for product
      const videos = [
        ...(product.technical_videos || []),
        ...(product.testimonial_videos || []),
        ...(product.youtube_videos || [])
      ].slice(0, 5);

      const finalUrl = product.product_url || 'https://example.com';

      setAdPreview({
        adCopies: {
          headlines: [`${product.name}`, `Comprar ${product.name}`, `${product.category} de Qualidade`],
          descriptions: [
            (product.description || `${product.name} com melhor preço`).substring(0, 87) + '...',
            `Confira nossa linha de ${product.category || 'produtos'}`.substring(0, 87) + '...'
          ],
          paths: [product.category?.toLowerCase() || 'produto', product.name.toLowerCase().replace(/\s+/g, '-')]
        },
        sitelinks: validSitelinks,
        videos,
        finalUrl,
        warnings: sitelinkWarnings.map(msg => ({ type: 'warning' as const, message: msg }))
      });

      const formattedWarnings: ValidationWarning[] = (sitelinkWarnings || []).map(w => 
        typeof w === 'string' ? { type: 'warning' as const, message: w } : w
      );
      setWarnings(formattedWarnings);

    } catch (error) {
      console.error('Error validating campaign:', error);
      setWarnings([{
        type: 'error',
        message: 'Erro ao validar configuração da campanha'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [product, getProductKeywords]);

  // Remove this problematic debounce, use direct call

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (campaignConfig.enabled) {
        validateAndPreview(campaignConfig);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [campaignConfig, validateAndPreview]);

  const generateAdCopies = useCallback(async () => {
    setIsGeneratingAds(true);
    
    try {
      const productData = getProductData();
      
      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          type: 'google_ads',
          productId: product.id,
          productData,
          keywords: getProductKeywords()
        }
      });

      if (error) throw error;

      if (data?.adCopies) {
        const updatedPreview = {
          ...adPreview!,
          adCopies: data.adCopies
        };
        setAdPreview(updatedPreview);
        setLastGeneratedAt(new Date());
        
        toast({
          title: "Anúncios gerados com sucesso!",
          description: "Novos headlines e descriptions foram criados pela IA."
        });
      } else {
        // Fallback para anúncios básicos
        const fallbackPreview = {
          ...adPreview!,
          adCopies: {
            headlines: [
              product.name,
              `Comprar ${product.name}`,
              `${product.category || 'Produto'} de Qualidade`,
              `Melhor ${product.name}`,
              `${product.name} em Oferta`
            ],
            descriptions: [
              product.description || `${product.name} com melhor preço e qualidade`,
              product.sales_pitch || `Confira nossa linha de ${product.category || 'produtos'}`,
              `Entrega rápida e segura. Compre ${product.name} agora!`
            ],
            paths: [
              product.category?.toLowerCase().replace(/\s+/g, '-') || 'produto',
              product.name.toLowerCase().replace(/\s+/g, '-').substring(0, 15)
            ]
          }
        };
        setAdPreview(fallbackPreview);
        setLastGeneratedAt(new Date());
        
        toast({
          title: "Anúncios gerados (fallback)",
          description: "Foram criados anúncios básicos para o produto."
        });
      }
    } catch (error) {
      console.error('Error generating ads:', error);
      toast({
        title: "Erro ao gerar anúncios",
        description: "Não foi possível gerar os anúncios. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAds(false);
    }
  }, [product, getProductKeywords, getProductData, adPreview, toast]);

  const handleRegenerateAds = useCallback(() => {
    if (campaignConfig.enabled && adPreview) {
      generateAdCopies();
    }
  }, [campaignConfig.enabled, adPreview, generateAdCopies]);

  const handleExportCSV = async () => {
    if (warnings.some(w => w.type === 'error')) {
      toast({
        title: "Não é possível exportar",
        description: "Corrija os erros antes de exportar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const productData = getProductData();
      
      const { data, error } = await supabase.functions.invoke('export-product-google-ads-csv', {
        body: {
          productId: product.id,
          config: campaignConfig,
          productData
        }
      });

      if (error) throw error;

      if (data?.csv) {
        // Download CSV file
        const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `google-ads-${product.name.replace(/\s+/g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "CSV exportado com sucesso!",
          description: `Arquivo para produto "${product.name}" baixado.`
        });
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Erro ao exportar CSV",
        description: "Não foi possível gerar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (updates: Partial<GoogleAdsCampaignConfig>) => {
    const newConfig = { ...campaignConfig, ...updates };
    setCampaignConfig(newConfig);
    onUpdate?.(newConfig);
  };

  const hasErrors = warnings.some(w => w.type === 'error');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Google Ads - {product.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Campanha específica para produto {product.category && `• ${product.category}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={hasErrors ? 'destructive' : 'default'} className="gap-1">
                {hasErrors ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                {hasErrors ? 'Erro' : 'Ativo'}
              </Badge>
              <Switch
                checked={true}
                disabled={true}
                onCheckedChange={(enabled) => handleConfigChange({ enabled })}
                className="pointer-events-none"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <>
        {/* Configuration Tabs */}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Configurações</TabsTrigger>
              <TabsTrigger value="videos">Extensões de Vídeo</TabsTrigger>
              <TabsTrigger value="display" className="gap-1"><Monitor className="h-3 w-3" />Display</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="utm">UTM</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <CollectorStrategyToggle
                value={collectorStrategy}
                onChange={setCollectorStrategy}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configurações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Orçamento Diário (R$)</Label>
                      <Input
                        type="number"
                        value={campaignConfig.daily_budget_brl}
                        onChange={(e) => handleConfigChange({ daily_budget_brl: Number(e.target.value) })}
                        min={10}
                        max={1000}
                      />
                    </div>
                    <div>
                      <Label>Estratégia de Lance</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={campaignConfig.bidding.strategy}
                        onChange={(e) => handleConfigChange({
                          bidding: { ...campaignConfig.bidding, strategy: e.target.value as any }
                        })}
                      >
                        <option value="MAX_CONV">Maximizar Conversões</option>
                        <option value="tCPA">CPA Alvo</option>
                        <option value="MANUAL_CPC">CPC Manual</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos">
              <VideoManager
                config={campaignConfig}
                onChange={handleConfigChange}
                data={getProductData()}
                landingPageId={product.id}
              />
            </TabsContent>

            <TabsContent value="display">
              <DisplayBannerGenerator product={product} />
            </TabsContent>

            <TabsContent value="utm">
              <UTMBuilder
                utm={campaignConfig.utm}
                onChange={(utm) => handleConfigChange({ utm })}
              />
            </TabsContent>
          </Tabs>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Preview dos Anúncios</CardTitle>
                {adPreview && (
                  <div className="flex items-center gap-2">
                    {lastGeneratedAt && (
                      <span className="text-xs text-muted-foreground">
                        Gerado: {lastGeneratedAt.toLocaleTimeString()}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateAds}
                      disabled={isGeneratingAds}
                      className="gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${isGeneratingAds ? 'animate-spin' : ''}`} />
                      Regenerar IA
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : adPreview ? (
                <AdPreviewCards
                  adCopies={adPreview.adCopies}
                  finalUrl={adPreview.finalUrl}
                  sitelinks={adPreview.sitelinks}
                  videos={adPreview.videos}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Ative a campanha para ver o preview dos anúncios</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {warnings.length > 0 && (
            <WarningsPanel warnings={warnings} />
          )}
        </>

      {/* Export Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleExportCSV}
          disabled={hasErrors || isLoading}
          className="gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          Exportar CSV para Google Ads Editor
        </Button>
      </div>
    </div>
  );
};