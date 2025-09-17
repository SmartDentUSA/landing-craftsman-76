import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Download, AlertTriangle, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleAdsCampaignConfig, ValidationWarning, AdPreview } from '@/types/google-ads';
import { KeywordManager } from './KeywordManager';
import { SitelinksManager } from './SitelinksManager';
import { AdPreviewCards } from './AdPreviewCards';
import { UTMBuilder } from './UTMBuilder';
import { WarningsPanel } from './WarningsPanel';
import { useToast } from '@/hooks/use-toast';

interface GoogleAdsTabProps {
  landingPageId: string;
  data: any; // LandingPageData
  onUpdate?: (config: GoogleAdsCampaignConfig) => void;
}

export const GoogleAdsTab = ({ landingPageId, data, onUpdate }: GoogleAdsTabProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAds, setIsGeneratingAds] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [campaignConfig, setCampaignConfig] = useState<GoogleAdsCampaignConfig>({
    enabled: false,
    type: 'search',
    objective: 'leads',
    daily_budget_brl: 50,
    locations: ['Brazil'],
    languages: ['pt-BR'],
    bidding: { strategy: 'MAX_CONV' },
    include_ai_keywords: true,
    include_faq_longtail: true,
    extra_keywords: [],
    negatives: [],
    ecommerce_links: [],
    include_brand_policies: true,
    youtube_videos: [],
    utm: {
      source: 'google',
      medium: 'cpc',
      campaign: `lp-${landingPageId}`
    }
  });
  
  const [previewData, setPreviewData] = useState<AdPreview | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);

  // Real-time validation and preview
  useEffect(() => {
    if (campaignConfig.enabled) {
      validateAndPreview();
    }
  }, [campaignConfig, data]);

  const generateAdCopies = async () => {
    if (!data?.seo?.title || !data?.seo?.description) {
      toast({
        title: 'Dados insuficientes',
        description: 'Preencha o título e descrição SEO antes de gerar anúncios.',
        variant: 'destructive'
      });
      return null;
    }

    setIsGeneratingAds(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-ad-copies', {
        body: {
          seoTitle: data.seo.title,
          seoDescription: data.seo.description,
          primaryKeyword: data.seo.keywords?.[0] || data.seo.title,
          targetAudience: data.banner?.subtitle || 'público geral',
          // Enriquecer contexto com dados da landing page
          brandInfo: {
            name: data.brand?.name || 'Sua Empresa',
            description: data.brand?.description || data.seo.description
          },
          solutions: data.solutions?.map((s: any) => ({
            title: s.title,
            description: s.description
          })) || [],
          faqData: data.faq?.map((f: any) => ({
            question: f.question,
            answer: f.answer
          })) || []
        }
      });

      if (error) {
        console.error('Error generating ad copies:', error);
        throw error;
      }

      setLastGeneratedAt(new Date());
      return result;
    } catch (error) {
      console.error('Error generating ad copies:', error);
      toast({
        title: 'Erro ao gerar anúncios',
        description: 'Não foi possível gerar as cópias. Usando dados padrão.',
        variant: 'destructive'
      });
      
      // Fallback para dados básicos
      return {
        headlines: [
          data.seo.title?.substring(0, 30) || 'Seu Serviço',
          data.brand?.name || 'Empresa Confiável',
          'Qualidade Garantida'
        ],
        descriptions: [
          data.seo.description?.substring(0, 90) || 'Atendimento especializado para suas necessidades.',
          'Entre em contato e saiba mais sobre nossos serviços.'
        ],
        paths: ['servicos', 'contato']
      };
    } finally {
      setIsGeneratingAds(false);
    }
  };

  const validateAndPreview = async () => {
    const newWarnings: ValidationWarning[] = [];
    
    // Basic validation
    if (campaignConfig.daily_budget_brl < 10) {
      newWarnings.push({
        type: 'warning',
        message: 'Orçamento diário muito baixo (mínimo recomendado: R$ 10)',
        field: 'daily_budget_brl'
      });
    }
    
    if (!data?.seo?.canonical_url?.startsWith('https://')) {
      newWarnings.push({
        type: 'error',
        message: 'URL final deve usar HTTPS',
        field: 'final_url'
      });
    }

    setWarnings(newWarnings);
    
    // Generate real ad copies with AI
    const adCopies = await generateAdCopies();
    
    if (adCopies) {
      setPreviewData({
        adCopies,
        sitelinks: campaignConfig.ecommerce_links,
        videos: [],
        finalUrl: data?.seo?.canonical_url || '',
        warnings: newWarnings
      });
    }
  };

  const handleRegenerateAds = async () => {
    const adCopies = await generateAdCopies();
    if (adCopies && previewData) {
      setPreviewData({
        ...previewData,
        adCopies
      });
    }
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/export-google-ads-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landingPageId,
          config: campaignConfig
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `google-ads-${landingPageId}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'CSV exportado com sucesso!',
          description: 'Arquivo pronto para importação no Google Ads Editor.',
        });
      } else {
        throw new Error('Erro ao exportar CSV');
      }
    } catch (error) {
      toast({
        title: 'Erro no export',
        description: 'Não foi possível gerar o arquivo CSV.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = warnings.some(w => w.type === 'error');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campanha Google Ads</h2>
          <p className="text-muted-foreground">
            Gere CSV compatível com Google Ads Editor em 1-2 cliques
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Switch
            checked={campaignConfig.enabled}
            onCheckedChange={(enabled) => 
              setCampaignConfig(prev => ({ ...prev, enabled }))
            }
          />
          <Label>Ativar Google Ads</Label>
        </div>
      </div>

      {!campaignConfig.enabled ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Google Ads Desativado</h3>
              <p className="text-muted-foreground mb-4">
                Ative o toggle acima para configurar sua campanha Google Ads
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Configuration Tabs */}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
              <TabsTrigger value="sitelinks">Sitelinks</TabsTrigger>
              <TabsTrigger value="videos">Vídeos</TabsTrigger>
              <TabsTrigger value="utm">UTM</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração Geral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="objective">Objetivo</Label>
                      <select
                        id="objective"
                        className="w-full p-2 border rounded"
                        value={campaignConfig.objective}
                        onChange={(e) => setCampaignConfig(prev => ({
                          ...prev,
                          objective: e.target.value as any
                        }))}
                      >
                        <option value="leads">Gerar Leads</option>
                        <option value="sales">Vendas</option>
                        <option value="traffic">Tráfego</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="budget">Orçamento Diário (R$)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={campaignConfig.daily_budget_brl}
                        onChange={(e) => setCampaignConfig(prev => ({
                          ...prev,
                          daily_budget_brl: Number(e.target.value)
                        }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="locations">Localizações</Label>
                    <Input
                      id="locations"
                      value={campaignConfig.locations.join(', ')}
                      onChange={(e) => setCampaignConfig(prev => ({
                        ...prev,
                        locations: e.target.value.split(',').map(l => l.trim())
                      }))}
                      placeholder="Brazil, São Paulo, Rio de Janeiro"
                    />
                  </div>

                  <div>
                    <Label htmlFor="strategy">Estratégia de Lance</Label>
                    <select
                      id="strategy"
                      className="w-full p-2 border rounded"
                      value={campaignConfig.bidding.strategy}
                      onChange={(e) => setCampaignConfig(prev => ({
                        ...prev,
                        bidding: { ...prev.bidding, strategy: e.target.value as any }
                      }))}
                    >
                      <option value="MAX_CONV">Maximizar Conversões</option>
                      <option value="tCPA">CPA Alvo</option>
                      <option value="MANUAL_CPC">CPC Manual</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="keywords">
              <KeywordManager
                config={campaignConfig}
                data={data}
                onChange={(updates) => setCampaignConfig(prev => ({ ...prev, ...updates }))}
              />
            </TabsContent>

            <TabsContent value="sitelinks">
              <SitelinksManager
                config={campaignConfig}
                data={data}
                onChange={(updates) => setCampaignConfig(prev => ({ ...prev, ...updates }))}
              />
            </TabsContent>

            <TabsContent value="videos">
              <Card>
                <CardHeader>
                  <CardTitle>Extensões de Vídeo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Vídeos serão coletados automaticamente dos depoimentos e blog posts.
                      Adicione URLs do YouTube abaixo para vídeos adicionais.
                    </p>
                    <Textarea
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={campaignConfig.youtube_videos.map(v => v.url).join('\n')}
                      onChange={(e) => {
                        const urls = e.target.value.split('\n').filter(url => url.trim());
                        setCampaignConfig(prev => ({
                          ...prev,
                          youtube_videos: urls.map(url => ({ url }))
                        }));
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="utm">
              <UTMBuilder
                utm={campaignConfig.utm}
                onChange={(utm) => setCampaignConfig(prev => ({ ...prev, utm }))}
              />
            </TabsContent>
          </Tabs>

          {/* Preview and Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview dos Anúncios</h3>
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
                    <RefreshCw className={`w-3 h-3 ${isGeneratingAds ? 'animate-spin' : ''}`} />
                    Regenerar
                  </Button>
                </div>
              </div>
              
              {isGeneratingAds ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ) : previewData ? (
                <AdPreviewCards
                  adCopies={previewData.adCopies}
                  finalUrl={previewData.finalUrl}
                  sitelinks={previewData.sitelinks}
                />
              ) : null}
            </div>
            
            <WarningsPanel warnings={warnings} />
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExportCSV}
              disabled={isLoading || hasErrors}
              size="lg"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isLoading ? 'Gerando CSV...' : 'Exportar CSV'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};