import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ExternalLink, Edit, X } from 'lucide-react';
import { SitelinksCollector } from '@/lib/google-ads/collectors/SitelinksCollector';

interface SitelinksManagerProps {
  config: any;
  data: any;
  onChange: (updates: any) => void;
}

export const SitelinksManager = ({ config, data, onChange }: SitelinksManagerProps) => {
  const [autoSitelinks, setAutoSitelinks] = useState<any[]>([]);
  const [brandSitelinks, setBrandSitelinks] = useState<any[]>([]);
  const [customInstitutionalLinks, setCustomInstitutionalLinks] = useState<any[]>([]);
  const [newSitelink, setNewSitelink] = useState({ label: '', url: '' });
  const [newInstitutionalLink, setNewInstitutionalLink] = useState({ label: '', url: '' });
  const [editingInstitutional, setEditingInstitutional] = useState<number | null>(null);
  const [editInstitutionalData, setEditInstitutionalData] = useState({ label: '', url: '' });

  useEffect(() => {
    generateAutoSitelinks();
    generateBrandSitelinks();
    // Initialize custom institutional links from config
    if (config.custom_institutional_links) {
      setCustomInstitutionalLinks(config.custom_institutional_links);
    }
  }, [data, config.custom_institutional_links]);

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

  const addCustomInstitutionalLink = () => {
    if (newInstitutionalLink.label && newInstitutionalLink.url) {
      const newLinks = [...customInstitutionalLinks, { ...newInstitutionalLink }];
      setCustomInstitutionalLinks(newLinks);
      onChange({
        custom_institutional_links: newLinks
      });
      setNewInstitutionalLink({ label: '', url: '' });
    }
  };

  const removeCustomInstitutionalLink = (index: number) => {
    const newLinks = customInstitutionalLinks.filter((_, i) => i !== index);
    setCustomInstitutionalLinks(newLinks);
    onChange({
      custom_institutional_links: newLinks
    });
  };

  const startEditingInstitutional = (index: number, link: any) => {
    setEditingInstitutional(index);
    setEditInstitutionalData({ label: link.label, url: link.url });
  };

  const saveEditInstitutional = (index: number) => {
    if (editInstitutionalData.label && editInstitutionalData.url) {
      const newLinks = [...customInstitutionalLinks];
      newLinks[index] = { ...editInstitutionalData };
      setCustomInstitutionalLinks(newLinks);
      onChange({
        custom_institutional_links: newLinks
      });
      setEditingInstitutional(null);
      setEditInstitutionalData({ label: '', url: '' });
    }
  };

  const cancelEditInstitutional = () => {
    setEditingInstitutional(null);
    setEditInstitutionalData({ label: '', url: '' });
  };

  const getAllSitelinks = () => {
    const manual = config.ecommerce_links || [];
    const auto = autoSitelinks.length > 0 ? autoSitelinks : [];
    const brand = config.include_brand_policies ? brandSitelinks : [];
    const customInstitutional = config.custom_institutional_links || [];
    return [...manual, ...auto, ...brand, ...customInstitutional];
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
                  <Badge variant="outline">Institucional</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Custom Institutional Links */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Links Institucionais Personalizados</Label>
              <Badge variant="secondary">{customInstitutionalLinks.length}</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="institutional-label">Texto do Link</Label>
                <Input
                  id="institutional-label"
                  placeholder="Sobre a Empresa"
                  value={newInstitutionalLink.label}
                  onChange={(e) => setNewInstitutionalLink(prev => ({ ...prev, label: e.target.value }))}
                  maxLength={25}
                />
              </div>
              <div>
                <Label htmlFor="institutional-url">URL</Label>
                <Input
                  id="institutional-url"
                  placeholder="https://exemplo.com/sobre"
                  value={newInstitutionalLink.url}
                  onChange={(e) => setNewInstitutionalLink(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
            </div>
            
            <Button
              onClick={addCustomInstitutionalLink}
              disabled={!newInstitutionalLink.label || !newInstitutionalLink.url || isAtLimit}
              className="gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              Adicionar Link Institucional
            </Button>

            {customInstitutionalLinks.length > 0 && (
              <div className="space-y-2">
                {customInstitutionalLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    {editingInstitutional === index ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={editInstitutionalData.label}
                          onChange={(e) => setEditInstitutionalData(prev => ({ ...prev, label: e.target.value }))}
                          placeholder="Texto do link"
                        />
                        <Input
                          value={editInstitutionalData.url}
                          onChange={(e) => setEditInstitutionalData(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="URL"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">{link.label}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {link.url}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {editingInstitutional === index ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveEditInstitutional(index)}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditInstitutional}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline">Personalizado</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingInstitutional(index, link)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomInstitutionalLink(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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