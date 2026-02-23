import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ExternalLink, Menu, MapPin, Link as LinkIcon, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOCIAL_PLATFORMS, SocialIcon } from "@/components/icons/SocialIcons";
interface NavigationMenuItem {
  label: string;
  href: string;
  order: number;
  openInNewTab?: boolean;
}

interface FooterLocation {
  title: string;
  address: string;
  country?: 'Brazil' | 'USA' | '';
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSocialLink {
  platform: string;
  href: string;
  icon_src: string;
  icon_alt: string;
}

interface NavigationFooterConfig {
  navigation_menu: NavigationMenuItem[];
  footer: {
    title: string;
    locations: FooterLocation[];
    links: FooterLink[];
    social_links: FooterSocialLink[];
  };
}

interface NavigationFooterTabProps {
  config: NavigationFooterConfig;
  onChange: (config: NavigationFooterConfig) => void;
}

const defaultConfig: NavigationFooterConfig = {
  navigation_menu: [],
  footer: {
    title: '',
    locations: [],
    links: [],
    social_links: []
  }
};

export function NavigationFooterTab({ config = defaultConfig, onChange }: NavigationFooterTabProps) {
  const safeConfig = {
    navigation_menu: config?.navigation_menu || [],
    footer: {
      title: config?.footer?.title || '',
      locations: config?.footer?.locations || [],
      links: config?.footer?.links || [],
      social_links: config?.footer?.social_links || []
    }
  };

  // Menu handlers
  const addMenuItem = () => {
    const newOrder = safeConfig.navigation_menu.length;
    onChange({
      ...safeConfig,
      navigation_menu: [
        ...safeConfig.navigation_menu,
        { label: '', href: '', order: newOrder, openInNewTab: false }
      ]
    });
  };

  const updateMenuItem = (index: number, field: keyof NavigationMenuItem, value: string | number | boolean) => {
    const newMenu = [...safeConfig.navigation_menu];
    newMenu[index] = { ...newMenu[index], [field]: value };
    onChange({ ...safeConfig, navigation_menu: newMenu });
  };

  const removeMenuItem = (index: number) => {
    const newMenu = safeConfig.navigation_menu.filter((_, i) => i !== index);
    // Reordenar
    newMenu.forEach((item, i) => item.order = i);
    onChange({ ...safeConfig, navigation_menu: newMenu });
  };

  const moveMenuItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === safeConfig.navigation_menu.length - 1)) {
      return;
    }
    const newMenu = [...safeConfig.navigation_menu];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newMenu[index], newMenu[targetIndex]] = [newMenu[targetIndex], newMenu[index]];
    newMenu.forEach((item, i) => item.order = i);
    onChange({ ...safeConfig, navigation_menu: newMenu });
  };

  // Footer location handlers
  const addLocation = () => {
    onChange({
      ...safeConfig,
      footer: {
        ...safeConfig.footer,
        locations: [...safeConfig.footer.locations, { title: '', address: '', country: '' }]
      }
    });
  };

  const updateLocation = (index: number, field: keyof FooterLocation, value: string) => {
    const newLocations = [...safeConfig.footer.locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    onChange({
      ...safeConfig,
      footer: { ...safeConfig.footer, locations: newLocations }
    });
  };

  const removeLocation = (index: number) => {
    onChange({
      ...safeConfig,
      footer: {
        ...safeConfig.footer,
        locations: safeConfig.footer.locations.filter((_, i) => i !== index)
      }
    });
  };

  // Footer link handlers
  const addFooterLink = () => {
    onChange({
      ...safeConfig,
      footer: {
        ...safeConfig.footer,
        links: [...safeConfig.footer.links, { label: '', href: '' }]
      }
    });
  };

  const updateFooterLink = (index: number, field: keyof FooterLink, value: string) => {
    const newLinks = [...safeConfig.footer.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange({
      ...safeConfig,
      footer: { ...safeConfig.footer, links: newLinks }
    });
  };

  const removeFooterLink = (index: number) => {
    onChange({
      ...safeConfig,
      footer: {
        ...safeConfig.footer,
        links: safeConfig.footer.links.filter((_, i) => i !== index)
      }
    });
  };

  // Social link handlers
  const addSocialLink = () => {
    onChange({
      ...safeConfig,
      footer: {
        ...safeConfig.footer,
        social_links: [...safeConfig.footer.social_links, { 
          platform: '', 
          href: '', 
          icon_src: '', 
          icon_alt: '' 
        }]
      }
    });
  };

  const updateSocialLink = (index: number, field: keyof FooterSocialLink, value: string) => {
    const newLinks = [...safeConfig.footer.social_links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange({
      ...safeConfig,
      footer: { ...safeConfig.footer, social_links: newLinks }
    });
  };

  const handlePlatformChange = (index: number, platformId: string) => {
    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
    const newLinks = [...safeConfig.footer.social_links];
    newLinks[index] = { 
      ...newLinks[index], 
      platform: platformId,
      icon_alt: platform?.label || platformId,
      // Auto-preencher URL base se estiver vazio
      href: newLinks[index].href || platform?.baseUrl || ''
    };
    onChange({
      ...safeConfig,
      footer: { ...safeConfig.footer, social_links: newLinks }
    });
  };

  const removeSocialLink = (index: number) => {
    onChange({
      ...safeConfig,
      footer: {
        ...safeConfig.footer,
        social_links: safeConfig.footer.social_links.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Informação */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Menu className="h-4 w-4" />
          Configuração Global de Navegação e Rodapé
        </h4>
        <p className="text-sm text-muted-foreground">
          Configure aqui o menu de navegação e rodapé padrão da empresa. 
          Esses dados serão <strong>clonados automaticamente</strong> para novas landing pages, 
          mas podem ser editados individualmente em cada página.
        </p>
      </div>

      {/* Menu de Navegação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Menu de Navegação
          </CardTitle>
          <CardDescription>
            Itens do menu principal que aparecerão no topo das landing pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {safeConfig.navigation_menu.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex flex-col gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => moveMenuItem(index, 'up')}
                  disabled={index === 0}
                >
                  ▲
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => moveMenuItem(index, 'down')}
                  disabled={index === safeConfig.navigation_menu.length - 1}
                >
                  ▼
                </Button>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label (ex: Produtos)"
                  value={item.label}
                  onChange={(e) => updateMenuItem(index, 'label', e.target.value)}
                />
                <Input
                  placeholder="URL (ex: /produtos)"
                  value={item.href}
                  onChange={(e) => updateMenuItem(index, 'href', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Switch
                    checked={item.openInNewTab || false}
                    onCheckedChange={(checked) => updateMenuItem(index, 'openInNewTab', checked)}
                  />
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMenuItem(index)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMenuItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item do Menu
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Footer - Título */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Título do Rodapé</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex: Entre em contato"
            value={safeConfig.footer.title}
            onChange={(e) => onChange({
              ...safeConfig,
              footer: { ...safeConfig.footer, title: e.target.value }
            })}
          />
        </CardContent>
      </Card>

      {/* Footer - Localizações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localizações
          </CardTitle>
          <CardDescription>
            Endereços físicos da empresa (matriz, filiais)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {safeConfig.footer.locations.map((location, index) => (
            <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <Input
                    placeholder="Título (ex: Matriz, Filial SP)"
                    value={location.title}
                    onChange={(e) => updateLocation(index, 'title', e.target.value)}
                  />
                  <Select
                    value={location.country || 'none'}
                    onValueChange={(value) => updateLocation(index, 'country', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="País">
                        {location.country === 'Brazil' && '🇧🇷'}
                        {location.country === 'USA' && '🇺🇸'}
                        {!location.country && '🌎'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">🌎 Nenhum</SelectItem>
                      <SelectItem value="Brazil">🇧🇷 Brasil</SelectItem>
                      <SelectItem value="USA">🇺🇸 USA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Endereço completo"
                  value={location.address}
                  onChange={(e) => updateLocation(index, 'address', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLocation(index)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLocation} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Localização
          </Button>
        </CardContent>
      </Card>

      {/* Footer - Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Links do Rodapé
          </CardTitle>
          <CardDescription>
            Links institucionais e páginas importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {safeConfig.footer.links.map((link, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label (ex: Política de Privacidade)"
                  value={link.label}
                  onChange={(e) => updateFooterLink(index, 'label', e.target.value)}
                />
                <Input
                  placeholder="URL"
                  value={link.href}
                  onChange={(e) => updateFooterLink(index, 'href', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFooterLink(index)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addFooterLink} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Link
          </Button>
        </CardContent>
      </Card>

      {/* Footer - Redes Sociais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Redes Sociais no Rodapé
          </CardTitle>
          <CardDescription>
            Selecione as redes sociais que aparecerão no rodapé com ícones visuais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {safeConfig.footer.social_links.map((social, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              {/* Preview do ícone selecionado */}
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-background border">
                {social.platform ? (
                  <SocialIcon platform={social.platform} size={24} />
                ) : (
                  <Globe className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Seletor de Plataforma */}
                <Select
                  value={social.platform}
                  onValueChange={(value) => handlePlatformChange(index, value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione a rede social">
                      {social.platform && (
                        <div className="flex items-center gap-2">
                          <SocialIcon platform={social.platform} size={16} />
                          <span>{SOCIAL_PLATFORMS.find(p => p.id === social.platform)?.label || social.platform}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        <div className="flex items-center gap-2">
                          <platform.icon size={16} color={platform.color} />
                          <span>{platform.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* URL */}
                <Input
                  placeholder="URL do perfil"
                  value={social.href}
                  onChange={(e) => updateSocialLink(index, 'href', e.target.value)}
                  className="bg-background"
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSocialLink(index)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button variant="outline" size="sm" onClick={addSocialLink} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Rede Social
          </Button>
          
          {/* Preview das redes configuradas */}
          {safeConfig.footer.social_links.length > 0 && (
            <div className="mt-4 p-3 border rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Preview dos ícones:</p>
              <div className="flex items-center gap-3">
                {safeConfig.footer.social_links.filter(s => s.platform).map((social, index) => (
                  <a 
                    key={index} 
                    href={social.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                    title={SOCIAL_PLATFORMS.find(p => p.id === social.platform)?.label || social.platform}
                  >
                    <SocialIcon platform={social.platform} size={28} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
