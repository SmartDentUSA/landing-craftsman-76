import React from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";

interface TrackingSEOTabProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
}

export function TrackingSEOTab({ profile, setProfile }: TrackingSEOTabProps) {
  return (
    <div className="space-y-6">
      {/* PIXELS */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📊 Pixels e Analytics Globais</h3>
        
        {/* GTM */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold">Google Tag Manager</h4>
              <p className="text-xs text-muted-foreground">Recomendado como única fonte de tags</p>
            </div>
            <Switch
              checked={profile.tracking_pixels?.google_tag_manager?.enabled ?? false}
              onCheckedChange={(checked) => 
                setProfile(prev => ({
                  ...prev,
                  tracking_pixels: {
                    ...prev.tracking_pixels,
                    google_tag_manager: {
                      enabled: checked,
                      container_id: prev.tracking_pixels?.google_tag_manager?.container_id || null
                    }
                  }
                }))
              }
            />
          </div>
          <Input
            value={profile.tracking_pixels?.google_tag_manager?.container_id || ''}
            onChange={(e) => 
              setProfile(prev => ({
                ...prev,
                tracking_pixels: {
                  ...prev.tracking_pixels,
                  google_tag_manager: {
                    ...prev.tracking_pixels?.google_tag_manager,
                    container_id: e.target.value || null
                  }
                }
              }))
            }
            placeholder="GTM-XXXXXXX"
            disabled={!profile.tracking_pixels?.google_tag_manager?.enabled}
          />
          <div className="mt-2">
            {!profile.tracking_pixels?.google_tag_manager?.enabled ? (
              <Badge variant="secondary">🔴 Desabilitado - HTML puro</Badge>
            ) : !profile.tracking_pixels?.google_tag_manager?.container_id ? (
              <Badge variant="outline">🟡 Configuração incompleta</Badge>
            ) : (
              <Badge>🟢 Ativo</Badge>
            )}
          </div>
        </Card>

        {/* META PIXEL */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold">Meta Pixel (Facebook)</h4>
              <p className="text-xs text-muted-foreground">Para remarketing no Facebook/Instagram Ads</p>
            </div>
            <Switch
              checked={profile.tracking_pixels?.meta_pixel?.enabled ?? false}
              onCheckedChange={(checked) => 
                setProfile(prev => ({
                  ...prev,
                  tracking_pixels: {
                    ...prev.tracking_pixels,
                    meta_pixel: {
                      enabled: checked,
                      pixel_id: prev.tracking_pixels?.meta_pixel?.pixel_id || null,
                      note: 'Meta Pixel global para todos os domínios'
                    }
                  }
                }))
              }
            />
          </div>
          <Input
            value={profile.tracking_pixels?.meta_pixel?.pixel_id || ''}
            onChange={(e) => 
              setProfile(prev => ({
                ...prev,
                tracking_pixels: {
                  ...prev.tracking_pixels,
                  meta_pixel: {
                    ...prev.tracking_pixels?.meta_pixel,
                    pixel_id: e.target.value || null
                  }
                }
              }))
            }
            placeholder="123456789012345"
            disabled={!profile.tracking_pixels?.meta_pixel?.enabled}
          />
          <div className="mt-2">
            {!profile.tracking_pixels?.meta_pixel?.enabled ? (
              <Badge variant="secondary">🔴 Desabilitado</Badge>
            ) : !profile.tracking_pixels?.meta_pixel?.pixel_id ? (
              <Badge variant="outline">🟡 Configuração incompleta</Badge>
            ) : (
              <Badge>🟢 Ativo</Badge>
            )}
          </div>
        </Card>

        {/* TIKTOK PIXEL */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold">TikTok Pixel</h4>
              <p className="text-xs text-muted-foreground">Para remarketing no TikTok Ads</p>
            </div>
            <Switch
              checked={profile.tracking_pixels?.tiktok_pixel?.enabled ?? false}
              onCheckedChange={(checked) => 
                setProfile(prev => ({
                  ...prev,
                  tracking_pixels: {
                    ...prev.tracking_pixels,
                    tiktok_pixel: {
                      enabled: checked,
                      pixel_id: prev.tracking_pixels?.tiktok_pixel?.pixel_id || null,
                      note: 'TikTok Pixel para remarketing'
                    }
                  }
                }))
              }
            />
          </div>
          <Input
            value={profile.tracking_pixels?.tiktok_pixel?.pixel_id || ''}
            onChange={(e) => 
              setProfile(prev => ({
                ...prev,
                tracking_pixels: {
                  ...prev.tracking_pixels,
                  tiktok_pixel: {
                    ...prev.tracking_pixels?.tiktok_pixel,
                    pixel_id: e.target.value || null
                  }
                }
              }))
            }
            placeholder="C9ABC123456789DEF"
            disabled={!profile.tracking_pixels?.tiktok_pixel?.enabled}
          />
          <div className="mt-2">
            {!profile.tracking_pixels?.tiktok_pixel?.enabled ? (
              <Badge variant="secondary">🔴 Desabilitado</Badge>
            ) : !profile.tracking_pixels?.tiktok_pixel?.pixel_id ? (
              <Badge variant="outline">🟡 Configuração incompleta</Badge>
            ) : (
              <Badge>🟢 Ativo</Badge>
            )}
          </div>
        </Card>

        {/* GOOGLE ANALYTICS 4 */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold">Google Analytics 4</h4>
              <p className="text-xs text-muted-foreground">Pode ser gerenciado via GTM (recomendado)</p>
            </div>
            <Switch
              checked={profile.tracking_pixels?.google_analytics?.enabled ?? false}
              onCheckedChange={(checked) => 
                setProfile(prev => ({
                  ...prev,
                  tracking_pixels: {
                    ...prev.tracking_pixels,
                    google_analytics: {
                      enabled: checked,
                      measurement_id: prev.tracking_pixels?.google_analytics?.measurement_id || null,
                      note: 'Google Analytics 4 (pode ser gerenciado via GTM)'
                    }
                  }
                }))
              }
            />
          </div>
          <Input
            value={profile.tracking_pixels?.google_analytics?.measurement_id || ''}
            onChange={(e) => 
              setProfile(prev => ({
                ...prev,
                tracking_pixels: {
                  ...prev.tracking_pixels,
                  google_analytics: {
                    ...prev.tracking_pixels?.google_analytics,
                    measurement_id: e.target.value || null
                  }
                }
              }))
            }
            placeholder="G-XXXXXXXXXX"
            disabled={!profile.tracking_pixels?.google_analytics?.enabled}
          />
          <div className="mt-2">
            {!profile.tracking_pixels?.google_analytics?.enabled ? (
              <Badge variant="secondary">🔴 Desabilitado</Badge>
            ) : !profile.tracking_pixels?.google_analytics?.measurement_id ? (
              <Badge variant="outline">🟡 Configuração incompleta</Badge>
            ) : (
              <Badge>🟢 Ativo</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* DOMÍNIOS SEO */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">🌐 Domínios SEO Multi-Site</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newDomain = {
                name: '',
                domain: '',
                description: '',
                enabled: true,
                use_in_seo: true,
                use_in_schema: true,
                use_in_footer: true,
                priority: (profile.seo_domains?.length || 0) + 1
              };
              setProfile(prev => ({
                ...prev,
                seo_domains: [...(prev.seo_domains || []), newDomain]
              }));
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Domínio
          </Button>
        </div>

        {(profile.seo_domains || []).map((domain: any, index: number) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Input
                value={domain.name}
                onChange={(e) => {
                  setProfile(prev => {
                    const updated = [...(prev.seo_domains || [])];
                    updated[index].name = e.target.value;
                    return {...prev, seo_domains: updated};
                  });
                }}
                placeholder="Nome do Site"
              />
              <Input
                value={domain.domain}
                onChange={(e) => {
                  setProfile(prev => {
                    const updated = [...(prev.seo_domains || [])];
                    updated[index].domain = e.target.value;
                    return {...prev, seo_domains: updated};
                  });
                }}
                placeholder="smartdent.com.br"
              />
              <Input
                value={domain.description}
                onChange={(e) => {
                  setProfile(prev => {
                    const updated = [...(prev.seo_domains || [])];
                    updated[index].description = e.target.value;
                    return {...prev, seo_domains: updated};
                  });
                }}
                placeholder="Descrição"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={domain.use_in_seo} onCheckedChange={(c) => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      updated[index].use_in_seo = c;
                      return {...prev, seo_domains: updated};
                    });
                  }} disabled={!domain.enabled} />
                  <Label className="text-xs">SEO</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={domain.use_in_schema} onCheckedChange={(c) => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      updated[index].use_in_schema = c;
                      return {...prev, seo_domains: updated};
                    });
                  }} disabled={!domain.enabled} />
                  <Label className="text-xs">Schema</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={domain.use_in_footer ?? false} onCheckedChange={(c) => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      updated[index].use_in_footer = c;
                      return {...prev, seo_domains: updated};
                    });
                  }} disabled={!domain.enabled} />
                  <Label className="text-xs">Footer</Label>
                </div>
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  setProfile(prev => ({
                    ...prev,
                    seo_domains: (prev.seo_domains || []).filter((_: any, i: number) => i !== index)
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
