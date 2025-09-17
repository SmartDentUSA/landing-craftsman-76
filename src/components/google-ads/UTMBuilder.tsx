import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, BarChart3 } from 'lucide-react';
import { UTMParams } from '@/types/google-ads';
import { useToast } from '@/hooks/use-toast';

interface UTMBuilderProps {
  utm: UTMParams;
  onChange: (utm: UTMParams) => void;
}

export const UTMBuilder = ({ utm, onChange }: UTMBuilderProps) => {
  const { toast } = useToast();

  const updateUTM = (field: keyof UTMParams, value: string) => {
    onChange({
      ...utm,
      [field]: value
    });
  };

  const generatePreviewUrl = () => {
    const baseUrl = 'https://example.com';
    const params = new URLSearchParams();
    
    if (utm.source) params.set('utm_source', utm.source);
    if (utm.medium) params.set('utm_medium', utm.medium);
    if (utm.campaign) params.set('utm_campaign', utm.campaign);
    if (utm.content) params.set('utm_content', utm.content);
    if (utm.term) params.set('utm_term', utm.term);
    
    return `${baseUrl}?${params.toString()}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePreviewUrl());
    toast({
      title: 'URL copiada!',
      description: 'URL com parâmetros UTM copiada para a área de transferência.',
    });
  };

  const presets = [
    {
      name: 'Campanha Padrão',
      utm: {
        source: 'google',
        medium: 'cpc',
        campaign: 'landing-page-ads'
      }
    },
    {
      name: 'Black Friday',
      utm: {
        source: 'google',
        medium: 'cpc',
        campaign: 'black-friday-2024',
        content: 'promo'
      }
    },
    {
      name: 'Remarketing',
      utm: {
        source: 'google',
        medium: 'cpc',
        campaign: 'remarketing',
        content: 'retargeting'
      }
    }
  ];

  const applyPreset = (presetUTM: UTMParams) => {
    onChange(presetUTM);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Configuração UTM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure os parâmetros UTM para rastreamento no Google Analytics. 
            Estes parâmetros serão adicionados automaticamente às URLs finais dos anúncios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="utm-source">Fonte (Source) *</Label>
              <Input
                id="utm-source"
                placeholder="google"
                value={utm.source || ''}
                onChange={(e) => updateUTM('source', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Onde o tráfego se origina (ex: google, facebook)
              </p>
            </div>

            <div>
              <Label htmlFor="utm-medium">Meio (Medium) *</Label>
              <Input
                id="utm-medium"
                placeholder="cpc"
                value={utm.medium || ''}
                onChange={(e) => updateUTM('medium', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Como o tráfego chegou (ex: cpc, email, social)
              </p>
            </div>

            <div>
              <Label htmlFor="utm-campaign">Campanha (Campaign) *</Label>
              <Input
                id="utm-campaign"
                placeholder="landing-page-ads"
                value={utm.campaign || ''}
                onChange={(e) => updateUTM('campaign', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome da campanha de marketing
              </p>
            </div>

            <div>
              <Label htmlFor="utm-content">Conteúdo (Content)</Label>
              <Input
                id="utm-content"
                placeholder="banner-top"
                value={utm.content || ''}
                onChange={(e) => updateUTM('content', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Diferencia anúncios similares (opcional)
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="utm-term">Termo (Term)</Label>
              <Input
                id="utm-term"
                placeholder="scanner intraoral"
                value={utm.term || ''}
                onChange={(e) => updateUTM('term', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keyword que acionou o anúncio (será preenchido automaticamente pelo Google Ads)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Pré-definidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {presets.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => applyPreset(preset.utm)}
                className="h-auto p-3 text-left"
              >
                <div>
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.utm.source}/{preset.utm.medium}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview da URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {generatePreviewUrl()}
            </div>
            <Button
              variant="outline"
              onClick={copyToClipboard}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar URL de Exemplo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};