import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Cloud, Loader2, CheckCircle, XCircle, RefreshCw, BarChart3, Key, Save, Eye, EyeOff, Shield, Zap, Server, ChevronDown, Link, GitBranch } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TrackingSEOTabProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
}

export function TrackingSEOTab({ profile, setProfile }: TrackingSEOTabProps) {
  const [testingDomain, setTestingDomain] = useState<number | null>(null);
  
  // Global Cloudflare credentials state
  const [cloudflareGlobal, setCloudflareGlobal] = useState({
    accountId: '',
    apiToken: '',
    status: 'unknown' as 'unknown' | 'checking' | 'connected' | 'error',
    showToken: false,
    saving: false
  });

  // Check if secrets are configured on mount
  useEffect(() => {
    checkCloudflareSecrets();
  }, []);

  const checkCloudflareSecrets = async () => {
    setCloudflareGlobal(prev => ({ ...prev, status: 'checking' }));
    try {
      // Try to test connection with first domain's project name to verify secrets exist
      const firstDomain = profile.seo_domains?.[0];
      if (firstDomain?.cloudflare_project_name) {
        const { data, error } = await supabase.functions.invoke('test-cloudflare-connection', {
          body: { projectName: firstDomain.cloudflare_project_name }
        });
        
        if (data?.success) {
          setCloudflareGlobal(prev => ({ ...prev, status: 'connected' }));
        } else if (data?.error?.includes('credentials')) {
          setCloudflareGlobal(prev => ({ ...prev, status: 'unknown' }));
        } else {
          // Credentials exist but project might not
          setCloudflareGlobal(prev => ({ ...prev, status: 'connected' }));
        }
      } else {
        setCloudflareGlobal(prev => ({ ...prev, status: 'unknown' }));
      }
    } catch {
      setCloudflareGlobal(prev => ({ ...prev, status: 'unknown' }));
    }
  };

  const saveCloudflareCredentials = async () => {
    if (!cloudflareGlobal.accountId || !cloudflareGlobal.apiToken) {
      toast.error('Preencha Account ID e API Token');
      return;
    }

    setCloudflareGlobal(prev => ({ ...prev, saving: true }));

    try {
      // Save Account ID
      const { error: accountError } = await supabase.functions.invoke('update-secret', {
        body: { 
          secretName: 'CLOUDFLARE_ACCOUNT_ID',
          secretValue: cloudflareGlobal.accountId
        }
      });
      if (accountError) throw accountError;

      // Save API Token
      const { error: tokenError } = await supabase.functions.invoke('update-secret', {
        body: { 
          secretName: 'CLOUDFLARE_API_TOKEN',
          secretValue: cloudflareGlobal.apiToken
        }
      });
      if (tokenError) throw tokenError;

      toast.success('Credenciais Cloudflare salvas com sucesso!');
      setCloudflareGlobal(prev => ({ 
        ...prev, 
        status: 'connected',
        apiToken: '', // Clear token from UI for security
        showToken: false
      }));
    } catch (err) {
      toast.error(`Erro ao salvar: ${(err as Error).message}`);
      setCloudflareGlobal(prev => ({ ...prev, status: 'error' }));
    } finally {
      setCloudflareGlobal(prev => ({ ...prev, saving: false }));
    }
  };

  const getGlobalStatusBadge = () => {
    switch (cloudflareGlobal.status) {
      case 'checking':
        return <Badge variant="outline" className="text-amber-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Verificando</Badge>;
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline"><Key className="h-3 w-3 mr-1" />Não configurado</Badge>;
    }
  };

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

  const getPixelStatusBadge = (enabled: boolean | undefined, hasId: boolean) => {
    if (!enabled) return <Badge variant="secondary" className="text-xs">🔴</Badge>;
    if (!hasId) return <Badge variant="outline" className="text-xs">🟡</Badge>;
    return <Badge className="text-xs bg-green-500/10 text-green-600">🟢</Badge>;
  };

  // Auto-activate domain with intelligent project name extraction
  const activateDomain = async (index: number) => {
    const domain = profile.seo_domains?.[index];
    if (!domain?.domain) {
      toast.error('Preencha o domínio primeiro');
      return;
    }

    // Extract project name from domain: mediti700.com.br → mediti700
    const projectName = domain.domain
      .replace(/^www\./, '')
      .split('.')[0]
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    // Auto-generate site name if empty: mediti700 → Mediti 700
    const autoName = domain.name || projectName
      .replace(/(\d+)/g, ' $1')
      .replace(/^./, (c: string) => c.toUpperCase())
      .trim();

    // Update state with auto-configuration
    setProfile(prev => {
      const updated = [...(prev.seo_domains || [])];
      updated[index] = {
        ...updated[index],
        name: autoName,
        cloudflare_project_name: projectName,
        cloudflare_enabled: true,
        cloudflare_status: 'checking'
      };
      return { ...prev, seo_domains: updated };
    });

    toast.info(`Ativando ${projectName}...`);

    // Test connection automatically
    await testCloudflareConnection(index, projectName);
  };

  const updateDomainPixel = (index: number, pixelType: string, field: string, value: any) => {
    setProfile(prev => {
      const updated = [...(prev.seo_domains || [])];
      if (!updated[index].tracking_pixels) {
        updated[index].tracking_pixels = {};
      }
      if (!updated[index].tracking_pixels[pixelType]) {
        updated[index].tracking_pixels[pixelType] = { enabled: false };
      }
      updated[index].tracking_pixels[pixelType][field] = value;
      return { ...prev, seo_domains: updated };
    });
  };

  return (
    <div className="space-y-6">
      {/* GLOBAL CLOUDFLARE CREDENTIALS */}
      <Card className="p-4 border-orange-500/30 bg-orange-500/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">🔐 Credenciais Globais Cloudflare</h3>
          </div>
          {getGlobalStatusBadge()}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Configure suas credenciais da Cloudflare uma única vez. Elas serão usadas para publicar em todos os domínios.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Account ID</Label>
            <Input
              value={cloudflareGlobal.accountId}
              onChange={(e) => setCloudflareGlobal(prev => ({ ...prev, accountId: e.target.value }))}
              placeholder="9da374ac007673ac68889fe6871c8b23"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre em: dash.cloudflare.com → canto inferior direito
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">API Token</Label>
            <div className="relative mt-1">
              <Input
                type={cloudflareGlobal.showToken ? 'text' : 'password'}
                value={cloudflareGlobal.apiToken}
                onChange={(e) => setCloudflareGlobal(prev => ({ ...prev, apiToken: e.target.value }))}
                placeholder="dmCcB1ix_WRIJiOmupsj..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setCloudflareGlobal(prev => ({ ...prev, showToken: !prev.showToken }))}
              >
                {cloudflareGlobal.showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Crie em: dash.cloudflare.com → API Tokens → Create Token
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button 
            onClick={saveCloudflareCredentials}
            disabled={cloudflareGlobal.saving || !cloudflareGlobal.accountId || !cloudflareGlobal.apiToken}
            className="flex-1"
          >
            {cloudflareGlobal.saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Credenciais
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={checkCloudflareSecrets}
            disabled={cloudflareGlobal.status === 'checking'}
          >
            {cloudflareGlobal.status === 'checking' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {cloudflareGlobal.status === 'connected' && (
          <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Credenciais configuradas. Agora configure os domínios abaixo.
          </p>
        )}
      </Card>

      {/* DOMÍNIOS SEO COM PIXELS */}
      <div className="space-y-4">
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
                publish_method: 'cloudflare' as const,
                // Cloudflare config
                cloudflare_project_name: '',
                cloudflare_zone_id: '',
                cloudflare_enabled: false,
                cloudflare_status: 'pending',
                // FTP config
                ftp_profile: '',
                ftp_remote_path: '/public_html',
                // URL Structure
                url_structure: {} as Record<string, string>,
                // Tracking pixels por domínio
                tracking_pixels: {
                  google_tag_manager: { enabled: false, container_id: null },
                  meta_pixel: { enabled: false, pixel_id: null },
                  tiktok_pixel: { enabled: false, pixel_id: null },
                  google_analytics: { enabled: false, measurement_id: null }
                }
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

        {(profile.seo_domains || []).length === 0 && (
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            <p>Nenhum domínio cadastrado</p>
            <p className="text-sm mt-1">Clique em "Adicionar Domínio" para começar</p>
          </Card>
        )}

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

            {/* Publish Method Selector */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-medium mb-2 block">Método de Publicação</Label>
              <RadioGroup
                value={domain.publish_method || 'cloudflare'}
                onValueChange={(v: string) => {
                  setProfile(prev => {
                    const updated = [...(prev.seo_domains || [])];
                    updated[index].publish_method = v as 'cloudflare' | 'ftp' | 'git';
                    return { ...prev, seo_domains: updated };
                  });
                }}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cloudflare" id={`method-cf-${index}`} />
                  <Label htmlFor={`method-cf-${index}`} className="flex items-center gap-1 cursor-pointer text-sm">
                    <Cloud className="h-3.5 w-3.5 text-orange-500" />
                    Cloudflare Pages
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ftp" id={`method-ftp-${index}`} />
                  <Label htmlFor={`method-ftp-${index}`} className="flex items-center gap-1 cursor-pointer text-sm">
                    <Server className="h-3.5 w-3.5 text-blue-500" />
                    FTP
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="git" id={`method-git-${index}`} />
                  <Label htmlFor={`method-git-${index}`} className="flex items-center gap-1 cursor-pointer text-sm">
                    <GitBranch className="h-3.5 w-3.5 text-purple-500" />
                    🐙 Git Deploy
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quick Activate Button (Cloudflare only) */}
            {(!domain.publish_method || domain.publish_method === 'cloudflare') && domain.domain && domain.cloudflare_status !== 'connected' && (
              <Button
                onClick={() => activateDomain(index)}
                disabled={testingDomain === index}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                {testingDomain === index ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    🚀 Ativar Domínio
                  </>
                )}
              </Button>
            )}

            {/* Cloudflare Configuration (shown when method is cloudflare) */}
            {(!domain.publish_method || domain.publish_method === 'cloudflare') && (
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
            )}

            {/* FTP Configuration (shown when method is ftp) */}
            {domain.publish_method === 'ftp' && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Configuração FTP</span>
                {domain.ftp_profile ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Configurado</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Pendente</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">FTP Profile Name *</Label>
                  <Input
                    value={domain.ftp_profile || ''}
                    onChange={(e) => {
                      setProfile(prev => {
                        const updated = [...(prev.seo_domains || [])];
                        updated[index].ftp_profile = e.target.value;
                        return { ...prev, seo_domains: updated };
                      });
                    }}
                    placeholder="kinghost_smartdent"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remote Path</Label>
                  <Input
                    value={domain.ftp_remote_path || '/public_html'}
                    onChange={(e) => {
                      setProfile(prev => {
                        const updated = [...(prev.seo_domains || [])];
                        updated[index].ftp_remote_path = e.target.value;
                        return { ...prev, seo_domains: updated };
                      });
                    }}
                    placeholder="/public_html"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Link className="h-3 w-3" />
                Configure as credenciais FTP em{' '}
                <a href="/publication-settings" className="underline text-primary hover:text-primary/80">
                  Publication Settings
                </a>
              </p>
            </div>
            )}

            {/* URL Structure (collapsible) */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="border rounded-lg p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Estrutura de URLs</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(domain.url_structure || {}).length} categorias
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {Object.entries(domain.url_structure || {}).map(([key, pattern]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input
                      value={key}
                      className="h-8 text-sm w-32"
                      placeholder="blog"
                      onChange={(e) => {
                        setProfile(prev => {
                          const updated = [...(prev.seo_domains || [])];
                          const struct = { ...(updated[index].url_structure || {}) };
                          const val = struct[key];
                          delete struct[key];
                          struct[e.target.value] = val;
                          updated[index].url_structure = struct;
                          return { ...prev, seo_domains: updated };
                        });
                      }}
                    />
                    <Input
                      value={pattern as string}
                      className="h-8 text-sm flex-1"
                      placeholder="/blog/{slug}"
                      onChange={(e) => {
                        setProfile(prev => {
                          const updated = [...(prev.seo_domains || [])];
                          if (!updated[index].url_structure) updated[index].url_structure = {};
                          updated[index].url_structure[key] = e.target.value;
                          return { ...prev, seo_domains: updated };
                        });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setProfile(prev => {
                          const updated = [...(prev.seo_domains || [])];
                          const struct = { ...(updated[index].url_structure || {}) };
                          delete struct[key];
                          updated[index].url_structure = struct;
                          return { ...prev, seo_domains: updated };
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      if (!updated[index].url_structure) updated[index].url_structure = {};
                      const newKey = `categoria${Object.keys(updated[index].url_structure).length + 1}`;
                      updated[index].url_structure[newKey] = `/${newKey}/{slug}`;
                      return { ...prev, seo_domains: updated };
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Categoria
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Tracking Pixels por Domínio */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="border rounded-lg p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Pixels e Analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPixelStatusBadge(
                        domain.tracking_pixels?.google_tag_manager?.enabled,
                        !!domain.tracking_pixels?.google_tag_manager?.container_id
                      )}
                      {getPixelStatusBadge(
                        domain.tracking_pixels?.meta_pixel?.enabled,
                        !!domain.tracking_pixels?.meta_pixel?.pixel_id
                      )}
                      {getPixelStatusBadge(
                        domain.tracking_pixels?.tiktok_pixel?.enabled,
                        !!domain.tracking_pixels?.tiktok_pixel?.pixel_id
                      )}
                      {getPixelStatusBadge(
                        domain.tracking_pixels?.google_analytics?.enabled,
                        !!domain.tracking_pixels?.google_analytics?.measurement_id
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                {/* GTM */}
                <div className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">Google Tag Manager</span>
                      <p className="text-xs text-muted-foreground">Recomendado como única fonte de tags</p>
                    </div>
                    <Switch
                      checked={domain.tracking_pixels?.google_tag_manager?.enabled ?? false}
                      onCheckedChange={(c) => updateDomainPixel(index, 'google_tag_manager', 'enabled', c)}
                    />
                  </div>
                  <Input
                    value={domain.tracking_pixels?.google_tag_manager?.container_id || ''}
                    onChange={(e) => updateDomainPixel(index, 'google_tag_manager', 'container_id', e.target.value || null)}
                    placeholder="GTM-XXXXXXX"
                    disabled={!domain.tracking_pixels?.google_tag_manager?.enabled}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Meta Pixel */}
                <div className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">Meta Pixel (Facebook)</span>
                      <p className="text-xs text-muted-foreground">Para remarketing no Facebook/Instagram</p>
                    </div>
                    <Switch
                      checked={domain.tracking_pixels?.meta_pixel?.enabled ?? false}
                      onCheckedChange={(c) => updateDomainPixel(index, 'meta_pixel', 'enabled', c)}
                    />
                  </div>
                  <Input
                    value={domain.tracking_pixels?.meta_pixel?.pixel_id || ''}
                    onChange={(e) => updateDomainPixel(index, 'meta_pixel', 'pixel_id', e.target.value || null)}
                    placeholder="123456789012345"
                    disabled={!domain.tracking_pixels?.meta_pixel?.enabled}
                    className="h-8 text-sm"
                  />
                </div>

                {/* TikTok Pixel */}
                <div className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">TikTok Pixel</span>
                      <p className="text-xs text-muted-foreground">Para remarketing no TikTok Ads</p>
                    </div>
                    <Switch
                      checked={domain.tracking_pixels?.tiktok_pixel?.enabled ?? false}
                      onCheckedChange={(c) => updateDomainPixel(index, 'tiktok_pixel', 'enabled', c)}
                    />
                  </div>
                  <Input
                    value={domain.tracking_pixels?.tiktok_pixel?.pixel_id || ''}
                    onChange={(e) => updateDomainPixel(index, 'tiktok_pixel', 'pixel_id', e.target.value || null)}
                    placeholder="C9ABC123456789DEF"
                    disabled={!domain.tracking_pixels?.tiktok_pixel?.enabled}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Google Analytics 4 */}
                <div className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm">Google Analytics 4</span>
                      <p className="text-xs text-muted-foreground">Pode ser gerenciado via GTM</p>
                    </div>
                    <Switch
                      checked={domain.tracking_pixels?.google_analytics?.enabled ?? false}
                      onCheckedChange={(c) => updateDomainPixel(index, 'google_analytics', 'enabled', c)}
                    />
                  </div>
                  <Input
                    value={domain.tracking_pixels?.google_analytics?.measurement_id || ''}
                    onChange={(e) => updateDomainPixel(index, 'google_analytics', 'measurement_id', e.target.value || null)}
                    placeholder="G-XXXXXXXXXX"
                    disabled={!domain.tracking_pixels?.google_analytics?.enabled}
                    className="h-8 text-sm"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
            
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
                  }} />
                  <Label className="text-sm">SEO</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={domain.use_in_schema} onCheckedChange={(c) => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      updated[index].use_in_schema = c;
                      return {...prev, seo_domains: updated};
                    });
                  }} />
                  <Label className="text-sm">Schema</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={domain.use_in_footer} onCheckedChange={(c) => {
                    setProfile(prev => {
                      const updated = [...(prev.seo_domains || [])];
                      updated[index].use_in_footer = c;
                      return {...prev, seo_domains: updated};
                    });
                  }} />
                  <Label className="text-sm">Footer</Label>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setProfile(prev => ({
                    ...prev,
                    seo_domains: prev.seo_domains.filter((_: any, i: number) => i !== index)
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
