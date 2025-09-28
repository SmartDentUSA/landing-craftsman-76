import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTargetAudienceAggregator } from "@/hooks/useTargetAudienceAggregator";

interface CompanyProfile {
  id?: string;
  company_name: string;
  company_description?: string;
  business_sector?: string;
  target_audience?: string;
  main_products_services?: string;
  brand_values?: string;
  mission_statement?: string;
  vision_statement?: string;
  company_culture?: string;
  working_methodology?: string;
  delivery_approach?: string;
  differentiators?: string;
  company_logo_url?: string;
  website_url?: string;
  founded_year?: number;
  team_size?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  social_media_links?: Array<{ platform: string; url: string }>;
  institutional_links?: Array<{ label: string; url: string; category: string }>;
}

interface CompanyProfileManagerProps {
  onProfileChange: (profile: CompanyProfile | null) => void;
  className?: string;
}

export function CompanyProfileManager({ onProfileChange, className }: CompanyProfileManagerProps) {
  const [profile, setProfile] = useState<CompanyProfile>({
    company_name: "",
    company_description: "",
    business_sector: "",
    target_audience: "",
    main_products_services: "",
    brand_values: "",
    mission_statement: "",
    vision_statement: "",
    company_culture: "",
    working_methodology: "",
    delivery_approach: "",
    differentiators: "",
    company_logo_url: "",
    website_url: "",
    founded_year: undefined,
    team_size: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    social_media_links: []
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { aggregateTargetAudiences, loading: aggregating } = useTargetAudienceAggregator();

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  useEffect(() => {
    onProfileChange(profile.company_name ? profile : null);
  }, [profile, onProfileChange]);

  const loadCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          id: data.id,
          company_name: data.company_name || "",
          company_description: data.company_description || "",
          business_sector: data.business_sector || "",
          target_audience: data.target_audience || "",
          main_products_services: data.main_products_services || "",
          brand_values: data.brand_values || "",
          mission_statement: data.mission_statement || "",
          vision_statement: data.vision_statement || "",
          company_culture: data.company_culture || "",
          working_methodology: data.working_methodology || "",
          delivery_approach: data.delivery_approach || "",
          differentiators: data.differentiators || "",
          company_logo_url: data.company_logo_url || "",
          website_url: data.website_url || "",
          founded_year: data.founded_year || undefined,
          team_size: data.team_size || "",
          location: data.location || "",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          social_media_links: Array.isArray(data.social_media_links) 
            ? data.social_media_links.filter((item): item is { platform: string; url: string } => 
                typeof item === 'object' && item !== null && 'platform' in item && 'url' in item
              ) 
            : []
        });
      }
    } catch (error: any) {
      console.error('Error loading company profile:', error);
      toast({
        title: "Erro ao carregar perfil da empresa",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyProfile = async () => {
    if (!profile.company_name.trim()) {
      toast({
        title: "Nome da empresa obrigatório",
        description: "Por favor, informe o nome da empresa",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const profileData = {
        user_id: user.id,
        company_name: profile.company_name,
        company_description: profile.company_description,
        business_sector: profile.business_sector,
        target_audience: profile.target_audience,
        main_products_services: profile.main_products_services,
        brand_values: profile.brand_values,
        mission_statement: profile.mission_statement,
        vision_statement: profile.vision_statement,
        company_culture: profile.company_culture,
        working_methodology: profile.working_methodology,
        delivery_approach: profile.delivery_approach,
        differentiators: profile.differentiators,
        company_logo_url: profile.company_logo_url,
        website_url: profile.website_url,
        founded_year: profile.founded_year,
        team_size: profile.team_size,
        location: profile.location,
        contact_email: profile.contact_email,
        contact_phone: profile.contact_phone,
        social_media_links: profile.social_media_links
      };

      let result;
      if (profile.id) {
        result = await supabase
          .from('company_profile')
          .update(profileData)
          .eq('id', profile.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('company_profile')
          .insert(profileData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setProfile(prev => ({ ...prev, id: result.data.id }));
      
      toast({
        title: "Perfil da empresa salvo",
        description: "As informações foram atualizadas com sucesso"
      });
    } catch (error: any) {
      console.error('Error saving company profile:', error);
      toast({
        title: "Erro ao salvar perfil",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: keyof CompanyProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleCaptureTargetAudiences = async () => {
    const aggregated = await aggregateTargetAudiences();
    if (aggregated) {
      const currentValue = profile.target_audience?.trim() || '';
      let newValue = aggregated;
      
      if (currentValue) {
        // Se já existe conteúdo, perguntar se deve mesclar ou substituir
        const shouldMerge = window.confirm(
          `Já existe conteúdo no campo Público-Alvo.\n\nClique "OK" para mesclar com o conteúdo existente\nClique "Cancelar" para substituir completamente`
        );
        
        if (shouldMerge) {
          // Mesclar, removendo duplicatas
          const existingAudiences = currentValue.split(',').map(a => a.trim());
          const newAudiences = aggregated.split(',').map(a => a.trim());
          const allAudiences = [...existingAudiences, ...newAudiences];
          
          const uniqueAudiences = Array.from(
            new Map(
              allAudiences.map(audience => [audience.toLowerCase(), audience])
            ).values()
          );
          
          newValue = uniqueAudiences.sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', ');
        }
      }
      
      updateProfile('target_audience', newValue);
    }
  };

  const currentYear = new Date().getFullYear();
  const completionPercentage = Math.round(
    (Object.values(profile).filter(value => 
      value !== "" && value !== undefined && value !== null
    ).length / Object.keys(profile).length) * 100
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Perfil da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Carregando perfil...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Perfil da Empresa
          </CardTitle>
          <Badge variant={completionPercentage >= 50 ? "default" : "secondary"}>
            {completionPercentage}% completo
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure as informações da empresa para enriquecer o contexto da IA
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Informações Básicas</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa *</Label>
              <Input
                id="company_name"
                value={profile.company_name}
                onChange={(e) => updateProfile('company_name', e.target.value)}
                placeholder="Nome da sua empresa"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_sector">Setor de Atuação</Label>
              <Input
                id="business_sector"
                value={profile.business_sector}
                onChange={(e) => updateProfile('business_sector', e.target.value)}
                placeholder="Ex: Tecnologia, Saúde, Educação"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_description">Descrição da Empresa</Label>
            <Textarea
              id="company_description"
              value={profile.company_description}
              onChange={(e) => updateProfile('company_description', e.target.value)}
              placeholder="Descreva sua empresa, o que faz e como atua no mercado"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target_audience">Público-Alvo</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCaptureTargetAudiences}
                disabled={aggregating}
                className="gap-2"
                title="Capturar públicos-alvo das subcategorias cadastradas"
              >
                {aggregating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Capturar das Categorias
              </Button>
            </div>
            <Textarea
              id="target_audience"
              value={profile.target_audience}
              onChange={(e) => updateProfile('target_audience', e.target.value)}
              placeholder="Descreva seu público-alvo principal ou use o botão para capturar das subcategorias"
              rows={2}
            />
          </div>
        </div>

        {/* Metodologia e Abordagem */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Metodologia e Abordagem</h4>
          
          <div className="space-y-2">
            <Label htmlFor="working_methodology">Metodologia de Trabalho</Label>
            <Textarea
              id="working_methodology"
              value={profile.working_methodology}
              onChange={(e) => updateProfile('working_methodology', e.target.value)}
              placeholder="Como vocês trabalham? Qual é a metodologia utilizada?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_approach">Abordagem de Entrega</Label>
            <Textarea
              id="delivery_approach"
              value={profile.delivery_approach}
              onChange={(e) => updateProfile('delivery_approach', e.target.value)}
              placeholder="Como vocês entregam soluções aos clientes?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="differentiators">Diferenciais Competitivos</Label>
            <Textarea
              id="differentiators"
              value={profile.differentiators}
              onChange={(e) => updateProfile('differentiators', e.target.value)}
              placeholder="O que diferencia sua empresa da concorrência?"
              rows={3}
            />
          </div>
        </div>

        {/* Valores e Visão */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Valores e Visão</h4>
          
          <div className="space-y-2">
            <Label htmlFor="mission_statement">Missão</Label>
            <Textarea
              id="mission_statement"
              value={profile.mission_statement}
              onChange={(e) => updateProfile('mission_statement', e.target.value)}
              placeholder="Qual é a missão da empresa?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision_statement">Visão</Label>
            <Textarea
              id="vision_statement"
              value={profile.vision_statement}
              onChange={(e) => updateProfile('vision_statement', e.target.value)}
              placeholder="Qual é a visão da empresa?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_values">Valores da Marca</Label>
            <Textarea
              id="brand_values"
              value={profile.brand_values}
              onChange={(e) => updateProfile('brand_values', e.target.value)}
              placeholder="Quais são os valores fundamentais da empresa?"
              rows={2}
            />
          </div>
        </div>

        {/* Contato */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Contato e Localização</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                value={profile.website_url}
                onChange={(e) => updateProfile('website_url', e.target.value)}
                placeholder="https://www.seusite.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_email">E-mail de Contato</Label>
              <Input
                id="contact_email"
                type="email"
                value={profile.contact_email}
                onChange={(e) => updateProfile('contact_email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                value={profile.location}
                onChange={(e) => updateProfile('location', e.target.value)}
                placeholder="Cidade, Estado"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="founded_year">Ano de Fundação</Label>
              <Select 
                value={profile.founded_year?.toString() || ""} 
                onValueChange={(value) => updateProfile('founded_year', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: currentYear - 1990 + 1 }, (_, i) => currentYear - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Links Institucionais */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Links Institucionais</h4>
          <p className="text-sm text-muted-foreground">
            Links para páginas importantes da empresa (usados automaticamente no Google Ads e SEO de landing pages)
          </p>
          
          <div className="space-y-3">
            {(profile.institutional_links || []).map((link: any, index: number) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border rounded-lg">
                <div>
                  <Label htmlFor={`link-label-${index}`}>Rótulo</Label>
                  <Input
                    id={`link-label-${index}`}
                    value={link.label || ''}
                    onChange={(e) => {
                      const newLinks = [...(profile.institutional_links || [])];
                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                      updateProfile('institutional_links', newLinks);
                    }}
                    placeholder="Ex: Sobre Nós"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`link-url-${index}`}>URL</Label>
                  <Input
                    id={`link-url-${index}`}
                    value={link.url || ''}
                    onChange={(e) => {
                      const newLinks = [...(profile.institutional_links || [])];
                      newLinks[index] = { ...newLinks[index], url: e.target.value };
                      updateProfile('institutional_links', newLinks);
                    }}
                    placeholder="https://site.com/sobre"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`link-category-${index}`}>Categoria</Label>
                  <Select
                    value={link.category || 'institutional'}
                    onValueChange={(value) => {
                      const newLinks = [...(profile.institutional_links || [])];
                      newLinks[index] = { ...newLinks[index], category: value };
                      updateProfile('institutional_links', newLinks);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="institutional">Institucional</SelectItem>
                      <SelectItem value="support">Suporte</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="policy">Política</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newLinks = [...(profile.institutional_links || [])];
                      newLinks.splice(index, 1);
                      updateProfile('institutional_links', newLinks);
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={() => {
                const newLinks = [...(profile.institutional_links || []), { label: '', url: '', category: 'institutional' }];
                updateProfile('institutional_links', newLinks);
              }}
              className="w-full"
            >
              + Adicionar Link Institucional
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={saveCompanyProfile} 
            disabled={saving || !profile.company_name.trim()}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}