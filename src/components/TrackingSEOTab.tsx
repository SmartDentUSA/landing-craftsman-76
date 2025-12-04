import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Cloud, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackingSEOTabProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
}

export function TrackingSEOTab({ profile, setProfile }: TrackingSEOTabProps) {
  const [testingDomain, setTestingDomain] = useState<number | null>(null);

  const testCloudflareConnection = async (index: number, projectName: string) => {
    if (!projectName) {
      toast.error('Nome do projeto Cloudflare é obrigatório');
      return;
    }
    
    setTestingDomain(index);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-cloudflare-connection', {
        body: { projectName }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setProfile(prev => {
          const updated = [...(prev.seo_domains || [])];
          updated[index].cloudflare_status = 'connected';
          return { ...prev, seo_domains: updated };
        });
        toast.success(`Conexão com "${projectName}" verificada com sucesso!`);
      } else {
        setProfile(prev => {
          const updated = [...(prev.seo_domains || [])];
          updated[index].cloudflare_status = 'error';
          return { ...prev, seo_domains: updated };
        });
        toast.error(data.error || 'Falha na conexão');
      }
    } catch (err) {
      setProfile(prev => {
        const updated = [...(prev.seo_domains || [])];
        updated[index].cloudflare_status = 'error';
        return { ...prev, seo_domains: updated };
      });
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setTestingDomain(null);
    }
  };

  const getCloudflareStatusBadge = (status: string | undefined, enabled: boolean | undefined) => {
    if (!enabled) return <Badge variant="secondary">☁️ Desabilitado</Badge>;
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">🟢 Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">🔴 Erro</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600">🟡 Pendente</Badge>;
      default:
        return <Badge variant="outline">⚪ Não configurado</Badge>;
    }
  };

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
                priority: (profile.seo_domains?.length || 0) + 1,
                // Cloudflare config
                cloudflare_project_name: '',
                cloudflare_zone_id: '',
                cloudflare_enabled: false,
                cloudflare_status: 'pending'
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
          <Card key={index} className="p-4 space-y-4">
            {/* Identificação do Domínio */}
            <div className="grid grid-cols-3 gap-3">
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

            {/* Cloudflare Configuration */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">Cloudflare Pages</span>
                  {getCloudflareStatusBadge(domain.cloudflare_status, domain.cloudflare_enabled)}
                </div>
                <Switch
                  checked={domain.cloudflare_enabled ?? false}
                  onCheckedChange={(c) => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      updated[index].cloudflare_enabled = c;
                      if (!c) updated[index].cloudflare_status = 'pending';
                      return {...prev, seo_domains: updated};
                    });
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Project Name *</Label>
                  <Input
                    value={domain.cloudflare_project_name || ''}
                    onChange={(e) => {
                      setProfile(prev => {
                        const updated = [...(prev.seo_domains || [])];
                        updated[index].cloudflare_project_name = e.target.value;
                        updated[index].cloudflare_status = 'pending';
                        return {...prev, seo_domains: updated};
                      });
                    }}
                    placeholder="mediti900"
                    disabled={!domain.cloudflare_enabled}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Zone ID (opcional)</Label>
                  <Input
                    value={domain.cloudflare_zone_id || ''}
                    onChange={(e) => {
                      setProfile(prev => {
                        const updated = [...(prev.seo_domains || [])];
                        updated[index].cloudflare_zone_id = e.target.value;
                        return {...prev, seo_domains: updated};
                      });
                    }}
                    placeholder="xxxxxxxxxxxxxxxx"
                    disabled={!domain.cloudflare_enabled}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              {domain.cloudflare_enabled && domain.cloudflare_project_name && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => testCloudflareConnection(index, domain.cloudflare_project_name)}
                  disabled={testingDomain === index}
                >
                  {testingDomain === index ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : domain.cloudflare_status === 'connected' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                      Reconectar
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* Switches de uso */}
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
        
        {(profile.seo_domains || []).length === 0 && (
          <Card className="p-8 text-center">
            <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum domínio configurado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione domínios para publicar LPs automaticamente via Cloudflare Pages
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}