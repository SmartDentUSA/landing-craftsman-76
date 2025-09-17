import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import { SitelinksCollector } from '@/lib/google-ads/collectors/SitelinksCollector';

interface SitelinksManagerProps {
  config: any;
  data: any;
  onChange: (updates: any) => void;
}

export const SitelinksManager = ({ config, data, onChange }: SitelinksManagerProps) => {
  const [autoSitelinks, setAutoSitelinks] = useState<any[]>([]);
  const [brandSitelinks, setBrandSitelinks] = useState<any[]>([]);
  const [newSitelink, setNewSitelink] = useState({ label: '', url: '' });

  useEffect(() => {
    generateAutoSitelinks();
    generateBrandSitelinks();
  }, [data]);

  const generateAutoSitelinks = () => {
    if (data?.intelligent_links) {
      const sitelinks = SitelinksCollector.collectFromIntelligentLinks(data.intelligent_links);
      setAutoSitelinks(sitelinks);
    }
  };

  const generateBrandSitelinks = () => {
    if (data?.seo?.canonical_url) {
      const sitelinks = SitelinksCollector.collectBrandPolicies(data.seo.canonical_url);
      setBrandSitelinks(sitelinks);
    }
  };

  const addManualSitelink = () => {
    if (newSitelink.label && newSitelink.url) {
      const currentLinks = config.ecommerce_links || [];
      onChange({
        ecommerce_links: [...currentLinks, { ...newSitelink }]
      });
      setNewSitelink({ label: '', url: '' });
    }
  };

  const removeSitelink = (index: number) => {
    const currentLinks = config.ecommerce_links || [];
    onChange({
      ecommerce_links: currentLinks.filter((_: any, i: number) => i !== index)
    });
  };

  const toggleBrandPolicies = (enabled: boolean) => {
    onChange({ include_brand_policies: enabled });
  };

  const getAllSitelinks = () => {
    const manual = config.ecommerce_links || [];
    const auto = autoSitelinks.length > 0 ? autoSitelinks : [];
    const brand = config.include_brand_policies ? brandSitelinks : [];
    return [...manual, ...auto, ...brand];
  };

  const totalSitelinks = getAllSitelinks().length;
  const isAtLimit = totalSitelinks >= 6;

  return (
    <div className="space-y-4">
      {/* Auto-detected E-commerce Links */}
      {autoSitelinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Links de E-commerce Detectados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Encontrados automaticamente a partir dos links inteligentes da landing page.
            </p>
            <div className="space-y-2">
              {autoSitelinks.map((sitelink, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{sitelink.label}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {sitelink.url}
                    </div>
                  </div>
                  <Badge variant="secondary">Auto</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual E-commerce Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links de E-commerce Manuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sitelink-label">Texto do Sitelink</Label>
              <Input
                id="sitelink-label"
                placeholder="Comprar Produto"
                value={newSitelink.label}
                onChange={(e) => setNewSitelink(prev => ({ ...prev, label: e.target.value }))}
                maxLength={25}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo 25 caracteres
              </p>
            </div>
            <div>
              <Label htmlFor="sitelink-url">URL</Label>
              <Input
                id="sitelink-url"
                placeholder="https://loja.example.com/produto"
                value={newSitelink.url}
                onChange={(e) => setNewSitelink(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
          </div>
          
          <Button
            onClick={addManualSitelink}
            disabled={!newSitelink.label || !newSitelink.url || isAtLimit}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Sitelink
          </Button>

          {config.ecommerce_links?.length > 0 && (
            <div className="space-y-2">
              <Label>Sitelinks Adicionados ({config.ecommerce_links.length})</Label>
              {config.ecommerce_links.map((sitelink: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{sitelink.label}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {sitelink.url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newLabel = prompt('Novo rótulo:', sitelink.label);
                        if (newLabel && newLabel.trim()) {
                          const currentLinks = config.ecommerce_links || [];
                          const updatedLinks = [...currentLinks];
                          updatedLinks[index] = { ...sitelink, label: newLabel.trim() };
                          onChange({ ecommerce_links: updatedLinks });
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSitelink(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Policy Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Links Institucionais
            <Switch
              checked={config.include_brand_policies}
              onCheckedChange={toggleBrandPolicies}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Adiciona automaticamente links para páginas institucionais como Sobre, Contato e Privacidade.
          </p>
          
          {config.include_brand_policies && (
            <div className="space-y-2">
              {brandSitelinks.map((sitelink, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded bg-muted/30">
                  <div>
                    <div className="font-medium">{sitelink.label}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {sitelink.url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Institucional</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // For now, just show a message that editing institutional links is not available
                        alert('Links institucionais são gerados automaticamente e não podem ser editados.');
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary and Limits */}
      <Card className={`${isAtLimit ? 'border-amber-200 bg-amber-50' : 'bg-muted/30'}`}>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isAtLimit ? 'text-amber-600' : 'text-primary'}`}>
              {totalSitelinks}/6
            </div>
            <div className="text-sm text-muted-foreground">
              Sitelinks para a campanha
            </div>
            {isAtLimit && (
              <p className="text-xs text-amber-600 mt-2">
                Limite do Google Ads atingido (6 sitelinks máximo)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};