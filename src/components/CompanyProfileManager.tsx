import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Building2, Video, Instagram, Youtube, Search, Plus, Trash2, Activity, Globe, Target, Zap, Calendar, CheckCircle2, Menu, User, Clock, MapPin } from "lucide-react";
import { VideoSection } from "./VideoSection";
import { ReviewsSection } from "./ReviewsSection";
import { useCompanyVideos } from "@/hooks/useCompanyVideos";
import { useTargetAudienceAggregator } from "@/hooks/useTargetAudienceAggregator";
import { TrackingSEOTab } from "./TrackingSEOTab";
import { InternationalPartnershipsManager } from "./InternationalPartnershipsManager";
import { NPSInsightsTab } from "./NPSInsightsTab";
import { ImageUploader } from "@/components/ImageUploader";
import { NavigationFooterTab } from "./NavigationFooterTab";
import CompanyMilestonesManager from "./CompanyMilestonesManager";

interface Video {
  url: string;
  description: string;
}

interface CompanyProfile {
  id?: string;
  user_id: string;
  company_name: string;
  company_description?: string;
  business_sector?: string;
  target_audience?: string;
  main_products_services?: string;
  brand_values?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  youtube_channel?: string;
  instagram_profile?: string;
  youtube_verified?: boolean;
  instagram_verified?: boolean;
  
  // ✨ NOVOS CAMPOS DE ENDEREÇO ESTRUTURADO
  country?: string;
  state?: string;
  city?: string;
  street_address?: string;
  address_number?: string;
  postal_code?: string;
  
  // SEO Hidden Fields
  seo_context_keywords?: string[];
  seo_market_positioning?: string;
  seo_competitive_advantages?: string;
  seo_technical_expertise?: string;
  seo_service_areas?: string;
  company_videos?: {
    youtube_videos: Video[];
    instagram_videos: Video[];
    testimonial_videos: Video[];
    technical_videos: Video[];
  };
  // ✨ Rastreamento Granular + Domínios SEO
  tracking_pixels?: {
    meta_pixel: { enabled: boolean; pixel_id: string | null; note?: string };
    google_analytics: { enabled: boolean; measurement_id: string | null; note?: string };
    google_tag_manager: { enabled: boolean; container_id: string | null; note?: string };
    tiktok_pixel: { enabled: boolean; pixel_id: string | null; note?: string };
  };
  seo_domains?: Array<{
    name: string;
    domain: string;
    description: string;
    enabled: boolean;
    use_in_seo: boolean;
    use_in_schema: boolean;
    use_in_footer: boolean;
    priority: number;
    publish_method?: 'cloudflare' | 'ftp';
    ftp_profile?: string;
    ftp_remote_path?: string;
    url_structure?: Record<string, string>;
  }>;
  institutional_links?: Array<{
    label: string;
    url: string;
    category: string;
    description?: string;
    partnership_type?: 'manufacturer' | 'distributor' | 'certification' | 'media' | 'other';
    country?: string;
    since_year?: number;
    relevance_score?: number;
  }>;
  social_media_links?: Array<{
    platform: string;
    url: string;
  }>;
  // ✨ NOVOS CAMPOS: Missão, Visão, Cultura e Dados Institucionais
  mission_statement?: string;
  vision_statement?: string;
  company_culture?: string;
  working_methodology?: string;
  delivery_approach?: string;
  differentiators?: string;
  founded_year?: number;
  team_size?: string;
  company_logo_url?: string;
  company_logo_supabase_path?: string | null;
  youtube_company_footer?: string;
  
  // ✨ NOVOS CAMPOS: Hashtags e Handles das Redes Sociais
  social_media_hashtags?: string[];  // #Redes sociais
  social_media_handles?: string[];   // @ Redes Sociais
  youtube_tags?: string[];           // #Tags Youtube
  
  // ✨ NOVO: Navegação e Footer global
  navigation_footer_config?: {
    navigation_menu: Array<{
      label: string;
      href: string;
      order: number;
      openInNewTab?: boolean;
    }>;
    footer: {
      title: string;
      locations: Array<{ title: string; address: string }>;
      links: Array<{ label: string; href: string }>;
      social_links: Array<{ platform: string; href: string; icon_src: string; icon_alt: string }>;
    };
  };
  
  // ✨ NOVOS CAMPOS ENTERPRISE GEO
  latitude?: number;
  longitude?: number;
  
  // Fundador
  founder_name?: string;
  founder_title?: string;
  founder_linkedin?: string;
  
  // LocalBusiness
  opening_hours?: Array<{
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }>;
  price_range?: string;
  
  // Áreas de atuação
  areas_served?: Array<{
    type: string;
    name: string;
    country?: string;
    state?: string;
  }>;
  
  // Dados jurídicos/empresa
  legal_name?: string;
  tax_id?: string;
  duns_number?: string;
  number_of_employees?: string;
}

interface CompanyProfileManagerProps {
  onProfileChange: (profile: CompanyProfile | null) => void;
  className?: string;
}

export function CompanyProfileManager({ onProfileChange, className }: CompanyProfileManagerProps) {
  const [profile, setProfile] = useState<CompanyProfile>({
    user_id: '',
    company_name: "",
    company_description: "",
    business_sector: "",
    target_audience: "",
    main_products_services: "",
    brand_values: "",
    website_url: "",
    contact_email: "",
    contact_phone: "",
    youtube_channel: "",
    instagram_profile: "",
    
    // ✨ NOVOS CAMPOS DE ENDEREÇO
    country: 'Brasil',
    state: '',
    city: '',
    street_address: '',
    address_number: '',
    postal_code: '',
    
    // SEO Hidden Fields
    seo_context_keywords: [],
    seo_market_positioning: "",
    seo_competitive_advantages: "",
    seo_technical_expertise: "",
    seo_service_areas: "",
    company_videos: {
      youtube_videos: [],
      instagram_videos: [],
      testimonial_videos: [],
      technical_videos: [],
    },
    institutional_links: [],
    social_media_links: [],
    tracking_pixels: {
      meta_pixel: { enabled: false, pixel_id: null, note: 'Meta Pixel global para todos os domínios' },
      google_analytics: { enabled: false, measurement_id: null, note: 'Google Analytics 4 (pode ser gerenciado via GTM)' },
      google_tag_manager: { enabled: false, container_id: null, note: 'GTM - Única fonte de tags recomendada' },
      tiktok_pixel: { enabled: false, pixel_id: null, note: 'TikTok Pixel para remarketing' }
    },
    seo_domains: [],
    
    // ✨ NOVOS CAMPOS
    social_media_hashtags: [],
    social_media_handles: [],
    youtube_tags: [],
    
    // ✨ NOVO: Navegação e Footer
    navigation_footer_config: {
      navigation_menu: [],
      footer: {
        title: '',
        locations: [],
        links: [],
        social_links: []
      }
    },
    
    // ✨ NOVOS CAMPOS ENTERPRISE GEO
    latitude: undefined,
    longitude: undefined,
    founder_name: '',
    founder_title: '',
    founder_linkedin: '',
    opening_hours: [],
    price_range: '',
    areas_served: [],
    legal_name: '',
    tax_id: '',
    duns_number: '',
    number_of_employees: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { saveCompanyVideos, loadCompanyVideos, updateCompanyProfile } = useCompanyVideos();
  const { aggregateTargetAudiences, loading: aggregatingAudiences } = useTargetAudienceAggregator();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    onProfileChange(profile.company_name ? profile : null);
  }, [profile, onProfileChange]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const videos = await loadCompanyVideos(user.id);
        setProfile({
          id: data.id,
          user_id: data.user_id,
          company_name: data.company_name || "",
          company_description: data.company_description || "",
          business_sector: data.business_sector || "",
          target_audience: data.target_audience || "",
          main_products_services: data.main_products_services || "",
          brand_values: data.brand_values || "",
          website_url: data.website_url || "",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          youtube_channel: data.youtube_channel || "",
          instagram_profile: data.instagram_profile || "",
          
          // ✨ NOVOS CAMPOS DE ENDEREÇO
          country: (data as any).country || 'Brasil',
          state: (data as any).state || '',
          city: (data as any).city || '',
          street_address: (data as any).street_address || '',
          address_number: (data as any).address_number || '',
          postal_code: (data as any).postal_code || '',
          
          // SEO Hidden Fields
          seo_context_keywords: Array.isArray((data as any).seo_context_keywords) ? (data as any).seo_context_keywords : [],
          seo_market_positioning: (data as any).seo_market_positioning || "",
          seo_competitive_advantages: (data as any).seo_competitive_advantages || "",
          seo_technical_expertise: (data as any).seo_technical_expertise || "",
          seo_service_areas: (data as any).seo_service_areas || "",
          company_videos: videos,
          institutional_links: Array.isArray((data as any).institutional_links)
            ? (data as any).institutional_links
            : [],
          social_media_links: Array.isArray((data as any).social_media_links)
            ? (data as any).social_media_links
            : [],
          tracking_pixels: (data as any).tracking_pixels || {
            meta_pixel: { enabled: false, pixel_id: null, note: 'Meta Pixel global para todos os domínios' },
            google_analytics: { enabled: false, measurement_id: null, note: 'Google Analytics 4 (pode ser gerenciado via GTM)' },
            google_tag_manager: { enabled: false, container_id: null, note: 'GTM - Única fonte de tags recomendada' },
            tiktok_pixel: { enabled: false, pixel_id: null, note: 'TikTok Pixel para remarketing' }
          },
          seo_domains: Array.isArray((data as any).seo_domains) ? (data as any).seo_domains : [],
          // ✨ NOVOS CAMPOS
          mission_statement: (data as any).mission_statement || '',
          vision_statement: (data as any).vision_statement || '',
          company_culture: (data as any).company_culture || '',
          working_methodology: (data as any).working_methodology || '',
          delivery_approach: (data as any).delivery_approach || '',
          differentiators: (data as any).differentiators || '',
          founded_year: (data as any).founded_year || undefined,
          team_size: (data as any).team_size || '',
          company_logo_url: (data as any).company_logo_url || '',
          company_logo_supabase_path: (data as any).company_logo_supabase_path || null,
          youtube_company_footer: (data as any).youtube_company_footer || '',
          
          // ✨ NOVOS CAMPOS: Carregar hashtags e handles
          social_media_hashtags: (data as any).social_media_hashtags || [],
          social_media_handles: (data as any).social_media_handles || [],
          youtube_tags: (data as any).youtube_tags || [],
          
          // ✨ NOVO: Carregar navigation_footer_config
          navigation_footer_config: (data as any).navigation_footer_config || {
            navigation_menu: [],
            footer: { title: '', locations: [], links: [], social_links: [] }
          },
          
          // ✨ NOVOS CAMPOS ENTERPRISE GEO
          latitude: (data as any).latitude || undefined,
          longitude: (data as any).longitude || undefined,
          founder_name: (data as any).founder_name || '',
          founder_title: (data as any).founder_title || '',
          founder_linkedin: (data as any).founder_linkedin || '',
          opening_hours: (data as any).opening_hours || [],
          price_range: (data as any).price_range || '',
          areas_served: (data as any).areas_served || [],
          legal_name: (data as any).legal_name || '',
          tax_id: (data as any).tax_id || '',
          duns_number: (data as any).duns_number || '',
          number_of_employees: (data as any).number_of_employees || '',
        });
      } else {
        setProfile(prev => ({ ...prev, user_id: user.id }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar o perfil da empresa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    console.log("🧪 saveProfile: click recebido", { hasName: !!profile.company_name });
    
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
      if (!profile.user_id) {
        throw new Error('Usuário não identificado');
      }

      const profileData = {
        user_id: profile.user_id,
        company_name: profile.company_name,
        company_description: profile.company_description,
        business_sector: profile.business_sector,
        target_audience: profile.target_audience,
        main_products_services: profile.main_products_services,
        brand_values: profile.brand_values,
        website_url: profile.website_url,
        contact_email: profile.contact_email,
        contact_phone: profile.contact_phone,
        youtube_channel: profile.youtube_channel,
        instagram_profile: profile.instagram_profile,
        
        // ✨ NOVOS CAMPOS DE ENDEREÇO (location será auto-gerado pelo trigger)
        country: profile.country,
        state: profile.state,
        city: profile.city,
        street_address: profile.street_address,
        address_number: profile.address_number,
        postal_code: profile.postal_code,
        
        // SEO Hidden Fields
        seo_context_keywords: profile.seo_context_keywords || [],
        seo_market_positioning: profile.seo_market_positioning,
        seo_competitive_advantages: profile.seo_competitive_advantages,
        seo_technical_expertise: profile.seo_technical_expertise,
          seo_service_areas: profile.seo_service_areas,
          institutional_links: profile.institutional_links || [],
          social_media_links: profile.social_media_links || [],
          tracking_pixels: profile.tracking_pixels || null,
          seo_domains: profile.seo_domains || [],
          // ✨ NOVOS CAMPOS
          mission_statement: profile.mission_statement,
          vision_statement: profile.vision_statement,
          company_culture: profile.company_culture,
          working_methodology: profile.working_methodology,
          delivery_approach: profile.delivery_approach,
          differentiators: profile.differentiators,
          founded_year: profile.founded_year,
          team_size: profile.team_size,
          company_logo_url: profile.company_logo_url,
          company_logo_supabase_path: profile.company_logo_supabase_path || null,
          youtube_company_footer: profile.youtube_company_footer,
          
          // ✨ NOVO: Salvar navigation_footer_config
          navigation_footer_config: profile.navigation_footer_config || null,
          
          // ✨ NOVOS CAMPOS ENTERPRISE GEO
          latitude: profile.latitude || null,
          longitude: profile.longitude || null,
          founder_name: profile.founder_name,
          founder_title: profile.founder_title,
          founder_linkedin: profile.founder_linkedin,
          opening_hours: profile.opening_hours || [],
          price_range: profile.price_range,
          areas_served: profile.areas_served || [],
          legal_name: profile.legal_name,
          tax_id: profile.tax_id,
          duns_number: profile.duns_number,
          number_of_employees: profile.number_of_employees,
          
          updated_at: new Date().toISOString()
        };

      console.log('Salvando perfil da empresa:', profileData);

      // Implementar retry logic para casos de conflito temporário
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabase
            .from('company_profile')
            .upsert(profileData, { 
              onConflict: 'user_id',
              ignoreDuplicates: false 
            })
            .select()
            .single();

          if (error) throw error;

          setProfile(prevProfile => ({ ...prevProfile, id: data.id }));

          // Salvar vídeos da empresa se existem
          if (profile.company_videos) {
            await saveCompanyVideos(profile.user_id, profile.company_videos);
          }

          toast({
            title: "Perfil salvo",
            description: "O perfil da empresa foi salvo com sucesso.",
          });

          // Chamar callback se fornecido
          onProfileChange?.(profile);
          return; // Sucesso, sair do loop
          
        } catch (retryError: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw retryError; // Re-throw após esgotar tentativas
          }
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMessage = error.code === '23505' 
        ? 'Conflito de dados detectado. Tente novamente em alguns segundos.'
        : error.message;
      
      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateVideoSection = (section: keyof NonNullable<CompanyProfile['company_videos']>, videos: Video[]) => {
    setProfile(prev => ({
      ...prev,
      company_videos: {
        ...prev.company_videos!,
        [section]: videos
      }
    }));
  };

  const handleAggregateTargetAudiences = async () => {
    const audiences = await aggregateTargetAudiences();
    if (audiences) {
      setProfile(prev => ({
        ...prev,
        target_audience: audiences
      }));
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando perfil da empresa...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Perfil da Empresa
        </CardTitle>
        <CardDescription>
          Configure as informações da sua empresa e gerencie os vídeos corporativos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap rounded-md border-b">
            <TabsList className="inline-flex w-auto h-auto space-x-1 bg-transparent p-1">
              <TabsTrigger value="basic" className="data-[state=active]:bg-background">
                Dados Básicos
              </TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-background">
                Redes Sociais
              </TabsTrigger>
              <TabsTrigger value="videos" className="data-[state=active]:bg-background">
                Vídeos da Empresa
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-background">
                Reviews
              </TabsTrigger>
              <TabsTrigger value="nps" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Target className="h-3 w-3" />
                NPS & Interesses
              </TabsTrigger>
              <TabsTrigger value="seo" className="data-[state=active]:bg-background">
                SEO Hidden
              </TabsTrigger>
              <TabsTrigger value="partnerships" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Globe className="h-3 w-3" />
                Parcerias
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Activity className="h-3 w-3" />
                TRK SEO
              </TabsTrigger>
              <TabsTrigger value="navigation" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Menu className="h-3 w-3" />
                Navegação & Footer
              </TabsTrigger>
              <TabsTrigger value="milestones" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Clock className="h-3 w-3" />
                📜 Marcos
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="company_name">Nome da Empresa *</Label>
                <Input
                  id="company_name"
                  value={profile.company_name}
                  onChange={(e) => setProfile(prev => ({...prev, company_name: e.target.value}))}
                  placeholder="Nome da sua empresa"
                />
              </div>
              <div>
                <Label htmlFor="business_sector">Setor de Atuação</Label>
                <Input
                  id="business_sector"
                  value={profile.business_sector || ''}
                  onChange={(e) => setProfile(prev => ({...prev, business_sector: e.target.value}))}
                  placeholder="Ex: Tecnologia, Saúde, Educação"
                />
              </div>
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={profile.website_url || ''}
                  onChange={(e) => setProfile(prev => ({...prev, website_url: e.target.value}))}
                  placeholder="https://www.suaempresa.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_description">Descrição da Empresa</Label>
              <Textarea
                id="company_description"
                value={profile.company_description || ''}
                onChange={(e) => setProfile(prev => ({...prev, company_description: e.target.value}))}
                placeholder="Descreva sua empresa, seus produtos e serviços"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="target_audience">Público-Alvo</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Será usado como padrão em produtos e categorias
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAggregateTargetAudiences}
                      disabled={aggregatingAudiences}
                      className="text-xs"
                    >
                      {aggregatingAudiences ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Capturando...
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3 mr-1" />
                          Capturar das Categorias
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Input
                  id="target_audience"
                  value={profile.target_audience || ''}
                  onChange={(e) => setProfile(prev => ({...prev, target_audience: e.target.value}))}
                  placeholder="Defina seu público-alvo (ex: Dentistas, Profissionais de saúde, Clínicas)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este valor será usado automaticamente ao criar novos produtos e categorias
                </p>
              </div>
            </div>

            {/* ✨ NOVA SEÇÃO: Endereço Completo */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Endereço Completo</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usado para gerar Schema.org LocalBusiness e melhorar SEO local
                  </p>
                </div>
              </div>
              
              {/* Linha 1: País, Estado, Cidade */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={profile.country || 'Brasil'}
                    onChange={(e) => setProfile(prev => ({...prev, country: e.target.value}))}
                    placeholder="Brasil"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor="state">
                    Estado (UF) <span className="text-muted-foreground text-xs">ex: SP, RJ</span>
                  </Label>
                  <Input
                    id="state"
                    value={profile.state || ''}
                    onChange={(e) => setProfile(prev => ({...prev, state: e.target.value.toUpperCase().slice(0, 2)}))}
                    placeholder="SP"
                    maxLength={2}
                    className="uppercase"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={profile.city || ''}
                    onChange={(e) => setProfile(prev => ({...prev, city: e.target.value}))}
                    placeholder="São Paulo"
                  />
                </div>
              </div>

              {/* Linha 2: Endereço e Número */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Label htmlFor="street_address">Endereço (Rua/Avenida)</Label>
                  <Input
                    id="street_address"
                    value={profile.street_address || ''}
                    onChange={(e) => setProfile(prev => ({...prev, street_address: e.target.value}))}
                    placeholder="Rua Exemplo, Bairro Centro"
                  />
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={profile.address_number || ''}
                    onChange={(e) => setProfile(prev => ({...prev, address_number: e.target.value}))}
                    placeholder="123"
                  />
                </div>
              </div>

              {/* Linha 3: CEP */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="postal_code">CEP</Label>
                  <Input
                    id="postal_code"
                    value={profile.postal_code || ''}
                    onChange={(e) => {
                      // Aplicar máscara de CEP: 00000-000
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const formatted = value.length > 5 
                        ? `${value.slice(0, 5)}-${value.slice(5)}`
                        : value;
                      setProfile(prev => ({...prev, postal_code: formatted}));
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">
                  ℹ️ O campo "Localização" será gerado automaticamente combinando estes dados para uso interno do sistema.
                </span>
              </div>
              
              {/* ✨ GeoCoordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="latitude">
                    Latitude
                    <span className="text-xs text-red-500 ml-2">⭐ GeoCoordinates</span>
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={profile.latitude || ''}
                    onChange={(e) => setProfile(prev => ({
                      ...prev, 
                      latitude: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    placeholder="-22.0087"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={profile.longitude || ''}
                    onChange={(e) => setProfile(prev => ({
                      ...prev, 
                      longitude: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    placeholder="-47.8909"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Dica: Busque no Google Maps, clique com botão direito e copie as coordenadas.
              </p>
            </div>

            {/* ✨ NOVA SEÇÃO: Fundador */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Fundador / CEO
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Informações do fundador usadas em Schema.org Person e autoridade de marca
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="founder_name">
                    Nome do Fundador
                    <span className="text-xs text-red-500 ml-2">⭐ Schema.org</span>
                  </Label>
                  <Input
                    id="founder_name"
                    value={profile.founder_name || ''}
                    onChange={(e) => setProfile(prev => ({...prev, founder_name: e.target.value}))}
                    placeholder="João da Silva"
                  />
                </div>
                <div>
                  <Label htmlFor="founder_title">Cargo</Label>
                  <Input
                    id="founder_title"
                    value={profile.founder_title || ''}
                    onChange={(e) => setProfile(prev => ({...prev, founder_title: e.target.value}))}
                    placeholder="CEO & Fundador"
                  />
                </div>
                <div>
                  <Label htmlFor="founder_linkedin">LinkedIn do Fundador</Label>
                  <Input
                    id="founder_linkedin"
                    type="url"
                    value={profile.founder_linkedin || ''}
                    onChange={(e) => setProfile(prev => ({...prev, founder_linkedin: e.target.value}))}
                    placeholder="https://linkedin.com/in/joaodasilva"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="main_products_services">Principais Produtos/Serviços</Label>
              <Textarea
                id="main_products_services"
                value={profile.main_products_services || ''}
                onChange={(e) => setProfile(prev => ({...prev, main_products_services: e.target.value}))}
                placeholder="Liste os principais produtos ou serviços da empresa"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="brand_values">Valores da Marca</Label>
              <Textarea
                id="brand_values"
                value={profile.brand_values || ''}
                onChange={(e) => setProfile(prev => ({...prev, brand_values: e.target.value}))}
                placeholder="Quais são os valores e princípios da sua empresa?"
                rows={2}
              />
            </div>

            {/* ✨ NOVA SEÇÃO: Missão, Visão e Cultura */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Missão, Visão e Cultura
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Informações estratégicas usadas para Schema.org e SGE (Search Generative Experience)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="mission_statement">
                  Missão da Empresa
                  <span className="text-xs text-muted-foreground ml-2">(Usado em Schema.org)</span>
                </Label>
                <Textarea
                  id="mission_statement"
                  value={profile.mission_statement || ''}
                  onChange={(e) => setProfile(prev => ({...prev, mission_statement: e.target.value}))}
                  placeholder="Qual é o propósito da sua empresa? O que vocês se propõem a fazer?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="vision_statement">
                  Visão da Empresa
                  <span className="text-xs text-red-500 ml-2">⭐ CRÍTICO para SGE</span>
                </Label>
                <Textarea
                  id="vision_statement"
                  value={profile.vision_statement || ''}
                  onChange={(e) => setProfile(prev => ({...prev, vision_statement: e.target.value}))}
                  placeholder="Onde sua empresa quer chegar? Qual é o futuro que vocês buscam?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="company_culture">Cultura da Empresa</Label>
                <Textarea
                  id="company_culture"
                  value={profile.company_culture || ''}
                  onChange={(e) => setProfile(prev => ({...prev, company_culture: e.target.value}))}
                  placeholder="Descreva o ambiente de trabalho, valores no dia a dia, como a equipe opera"
                  rows={2}
                />
              </div>
            </div>

            {/* ✨ NOVA SEÇÃO: Metodologia e Diferenciais */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Metodologia e Diferenciais
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Como sua empresa trabalha e o que a torna única
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="working_methodology">Metodologia de Trabalho</Label>
                <Textarea
                  id="working_methodology"
                  value={profile.working_methodology || ''}
                  onChange={(e) => setProfile(prev => ({...prev, working_methodology: e.target.value}))}
                  placeholder="Descreva como sua equipe trabalha (ex: Agile, Scrum, metodologia própria)"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="delivery_approach">Abordagem de Entrega</Label>
                <Textarea
                  id="delivery_approach"
                  value={profile.delivery_approach || ''}
                  onChange={(e) => setProfile(prev => ({...prev, delivery_approach: e.target.value}))}
                  placeholder="Como vocês entregam valor aos clientes? Quais são os processos?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="differentiators">Diferenciais Competitivos</Label>
                <Textarea
                  id="differentiators"
                  value={profile.differentiators || ''}
                  onChange={(e) => setProfile(prev => ({...prev, differentiators: e.target.value}))}
                  placeholder="O que torna sua empresa única no mercado? Por que clientes escolhem vocês?"
                  rows={2}
                />
              </div>
            </div>

            {/* ✨ NOVA SEÇÃO: Dados Institucionais */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dados Institucionais
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Informações da empresa usadas em Schema.org e compartilhamentos sociais
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="founded_year">
                    Ano de Fundação
                    <span className="text-xs text-red-500 ml-2">⭐ CRÍTICO Schema.org</span>
                  </Label>
                  <Input
                    id="founded_year"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={profile.founded_year || ''}
                    onChange={(e) => setProfile(prev => ({...prev, founded_year: parseInt(e.target.value) || undefined}))}
                    placeholder="Ex: 2010"
                  />
                </div>
                <div>
                  <Label htmlFor="team_size">Tamanho da Equipe</Label>
                  <Input
                    id="team_size"
                    value={profile.team_size || ''}
                    onChange={(e) => setProfile(prev => ({...prev, team_size: e.target.value}))}
                    placeholder="Ex: 10-50 funcionários, 100+"
                  />
                </div>
              </div>

              {/* ✨ Razão Social e Identificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="legal_name">Razão Social</Label>
                  <Input
                    id="legal_name"
                    value={profile.legal_name || ''}
                    onChange={(e) => setProfile(prev => ({...prev, legal_name: e.target.value}))}
                    placeholder="Empresa LTDA"
                  />
                </div>
                <div>
                  <Label htmlFor="number_of_employees">
                    Número de Funcionários
                    <span className="text-xs text-red-500 ml-2">⭐ Schema.org</span>
                  </Label>
                  <Input
                    id="number_of_employees"
                    value={profile.number_of_employees || ''}
                    onChange={(e) => setProfile(prev => ({...prev, number_of_employees: e.target.value}))}
                    placeholder="11-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos: "11-50", "51-200", "201-500", etc.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label htmlFor="tax_id">CNPJ</Label>
                  <Input
                    id="tax_id"
                    value={profile.tax_id || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                      const formatted = value.replace(
                        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                        '$1.$2.$3/$4-$5'
                      );
                      setProfile(prev => ({...prev, tax_id: formatted || value}));
                    }}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <Label htmlFor="duns_number">DUNS Number (Opcional)</Label>
                  <Input
                    id="duns_number"
                    value={profile.duns_number || ''}
                    onChange={(e) => setProfile(prev => ({...prev, duns_number: e.target.value}))}
                    placeholder="00-000-0000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Identificador único internacional D&B
                  </p>
                </div>
                <div>
                  <Label htmlFor="price_range">Faixa de Preço</Label>
                  <select
                    id="price_range"
                    value={profile.price_range || ''}
                    onChange={(e) => setProfile(prev => ({...prev, price_range: e.target.value}))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Selecione...</option>
                    <option value="$">$ (Econômico)</option>
                    <option value="$$">$$ (Moderado)</option>
                    <option value="$$$">$$$ (Premium)</option>
                    <option value="$$$$">$$$$ (Luxo)</option>
                  </select>
                </div>
              </div>

              {/* ✨ Horário de Funcionamento */}
              <div className="space-y-4 border-t pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Funcionamento
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usado em Schema.org LocalBusiness e Google My Business
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProfile(prev => ({
                        ...prev,
                        opening_hours: [
                          ...(prev.opening_hours || []),
                          { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:00' }
                        ]
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Horário
                  </Button>
                </div>

                {(profile.opening_hours || []).map((hour, index) => (
                  <div key={index} className="flex items-start gap-4 p-3 border rounded-md">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Dias da Semana</Label>
                        <Input
                          value={(hour.dayOfWeek || []).join(', ')}
                          onChange={(e) => {
                            const newHours = [...(profile.opening_hours || [])];
                            newHours[index] = { ...newHours[index], dayOfWeek: e.target.value.split(',').map(s => s.trim()) };
                            setProfile(prev => ({...prev, opening_hours: newHours}));
                          }}
                          placeholder="Monday, Tuesday, Wednesday..."
                        />
                      </div>
                      <div>
                        <Label>Abertura</Label>
                        <Input
                          type="time"
                          value={hour.opens || '08:00'}
                          onChange={(e) => {
                            const newHours = [...(profile.opening_hours || [])];
                            newHours[index] = { ...newHours[index], opens: e.target.value };
                            setProfile(prev => ({...prev, opening_hours: newHours}));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Fechamento</Label>
                        <Input
                          type="time"
                          value={hour.closes || '18:00'}
                          onChange={(e) => {
                            const newHours = [...(profile.opening_hours || [])];
                            newHours[index] = { ...newHours[index], closes: e.target.value };
                            setProfile(prev => ({...prev, opening_hours: newHours}));
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newHours = (profile.opening_hours || []).filter((_, i) => i !== index);
                        setProfile(prev => ({...prev, opening_hours: newHours}));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* ✨ Áreas de Atuação */}
              <div className="space-y-4 border-t pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Áreas de Atuação (areaServed)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Países, estados ou cidades onde a empresa atua - usado para SEO local e GEO
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProfile(prev => ({
                        ...prev,
                        areas_served: [...(prev.areas_served || []), { type: 'Country', name: '' }]
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Área
                  </Button>
                </div>

                {(profile.areas_served || []).map((area, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-md">
                    <select
                      value={area.type}
                      onChange={(e) => {
                        const newAreas = [...(profile.areas_served || [])];
                        newAreas[index] = { ...newAreas[index], type: e.target.value };
                        setProfile(prev => ({...prev, areas_served: newAreas}));
                      }}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="Country">País</option>
                      <option value="State">Estado</option>
                      <option value="City">Cidade</option>
                    </select>
                    <Input
                      value={area.name}
                      onChange={(e) => {
                        const newAreas = [...(profile.areas_served || [])];
                        newAreas[index] = { ...newAreas[index], name: e.target.value };
                        setProfile(prev => ({...prev, areas_served: newAreas}));
                      }}
                      placeholder={area.type === 'Country' ? 'Brasil' : area.type === 'State' ? 'São Paulo' : 'São Carlos'}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newAreas = (profile.areas_served || []).filter((_, i) => i !== index);
                        setProfile(prev => ({...prev, areas_served: newAreas}));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <Label>
                  Logo da Empresa
                  <span className="text-xs text-red-500 ml-2">⭐ CRÍTICO Schema.org</span>
                </Label>
                <ImageUploader
                  value={{
                    mode: profile.company_logo_supabase_path ? 'supabase' : 'url',
                    src: profile.company_logo_url || '',
                    supabase_path: profile.company_logo_supabase_path,
                    alt: 'Logo da empresa',
                    scale: 1.0
                  }}
                  onChange={(imageData) => {
                    setProfile(prev => ({
                      ...prev,
                      company_logo_url: imageData.src,
                      company_logo_supabase_path: imageData.supabase_path || null
                    }));
                  }}
                  placeholder="URL ou faça upload do logo"
                  proportionInfo="Recomendado: imagem quadrada (1:1), mínimo 112x112px"
                  hideCompanyLogoTab={true}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">E-mail de Contato</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={profile.contact_email || ''}
                  onChange={(e) => setProfile(prev => ({...prev, contact_email: e.target.value}))}
                  placeholder="contato@suaempresa.com"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Telefone de Contato</Label>
                <Input
                  id="contact_phone"
                  value={profile.contact_phone || ''}
                  onChange={(e) => setProfile(prev => ({...prev, contact_phone: e.target.value}))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="youtube_channel" className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      Canal do YouTube
                    </Label>
                    <Input
                      id="youtube_channel"
                      value={profile.youtube_channel || ''}
                      onChange={(e) => setProfile(prev => ({...prev, youtube_channel: e.target.value}))}
                      placeholder="https://youtube.com/@seucanal"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="youtube_verified"
                        checked={profile.youtube_verified || false}
                        onCheckedChange={(checked) => 
                          setProfile(prev => ({...prev, youtube_verified: checked as boolean}))
                        }
                      />
                      <Label 
                        htmlFor="youtube_verified" 
                        className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        Canal Verificado
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="instagram_profile" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      Perfil do Instagram
                    </Label>
                    <Input
                      id="instagram_profile"
                      value={profile.instagram_profile || ''}
                      onChange={(e) => setProfile(prev => ({...prev, instagram_profile: e.target.value}))}
                      placeholder="https://instagram.com/seuperfil"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="instagram_verified"
                        checked={profile.instagram_verified || false}
                        onCheckedChange={(checked) => 
                          setProfile(prev => ({...prev, instagram_verified: checked as boolean}))
                        }
                      />
                      <Label 
                        htmlFor="instagram_verified" 
                        className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        Perfil Verificado
                      </Label>
                    </div>
                  </div>
                </div>

                {/* ✨ NOVOS CAMPOS: Hashtags e Handles */}
                <div className="space-y-4 border-t pt-6 mt-6">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Hashtags e Handles das Redes Sociais
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure hashtags e handles padrão para suas redes sociais e YouTube
                      </p>
                    </div>
                  </div>

                  {/* Campo 1: #Redes sociais */}
                  <div>
                    <Label htmlFor="social_media_hashtags" className="flex items-center gap-2">
                      <span className="text-primary">#</span>
                      Hashtags das Redes Sociais
                    </Label>
                    <TagInput
                      value={profile.social_media_hashtags || []}
                      onChange={(tags) => setProfile(prev => ({
                        ...prev, 
                        social_media_hashtags: tags
                      }))}
                      placeholder="Cole ou digite hashtags separadas por vírgula (ex: odonto, cadcam, 3d)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Hashtags gerais usadas em todas as redes sociais. Digite sem o símbolo #
                    </p>
                  </div>

                  {/* Campo 2: @ Redes Sociais */}
                  <div>
                    <Label htmlFor="social_media_handles" className="flex items-center gap-2">
                      <span className="text-primary">@</span>
                      Handles das Redes Sociais
                    </Label>
                    <TagInput
                      value={profile.social_media_handles || []}
                      onChange={(tags) => setProfile(prev => ({
                        ...prev, 
                        social_media_handles: tags
                      }))}
                      placeholder="Cole ou digite handles separados por vírgula (ex: smartdent, parceiro)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usernames/handles mencionados nas redes sociais (@empresa, @parceiros). Digite sem o símbolo @
                    </p>
                  </div>

                  {/* Campo 3: #Tags Youtube */}
                  <div>
                    <Label htmlFor="youtube_tags" className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      <span className="text-primary">#</span>
                      Tags para YouTube
                    </Label>
                    <TagInput
                      value={profile.youtube_tags || []}
                      onChange={(tags) => setProfile(prev => ({
                        ...prev, 
                        youtube_tags: tags
                      }))}
                      placeholder="Cole ou digite tags separadas por vírgula (ex: odontologia, tecnologia)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tags específicas para vídeos do YouTube. Usadas automaticamente na geração de descrições
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                    <span className="text-xs text-muted-foreground">
                      💡 <strong>Dica:</strong> Essas informações serão automaticamente incluídas nas gerações de conteúdo para redes sociais e exportadas na Knowledge Base API
                    </span>
                  </div>
                </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <VideoSection
                title="Vídeos YouTube da Empresa"
                videos={profile.company_videos?.youtube_videos || []}
                onAdd={(url, description) => {
                  const newVideos = [...(profile.company_videos?.youtube_videos || []), { url, description }];
                  updateVideoSection('youtube_videos', newVideos);
                }}
                onRemove={(index) => {
                  const newVideos = (profile.company_videos?.youtube_videos || []).filter((_, i) => i !== index);
                  updateVideoSection('youtube_videos', newVideos);
                }}
                maxVideos={20}
              />
              
              <VideoSection
                title="Vídeos Instagram da Empresa"
                videos={profile.company_videos?.instagram_videos || []}
                onAdd={(url, description) => {
                  const newVideos = [...(profile.company_videos?.instagram_videos || []), { url, description }];
                  updateVideoSection('instagram_videos', newVideos);
                }}
                onRemove={(index) => {
                  const newVideos = (profile.company_videos?.instagram_videos || []).filter((_, i) => i !== index);
                  updateVideoSection('instagram_videos', newVideos);
                }}
                maxVideos={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <VideoSection
                title="Vídeos de Depoimentos"
                videos={profile.company_videos?.testimonial_videos || []}
                onAdd={(url, description) => {
                  const newVideos = [...(profile.company_videos?.testimonial_videos || []), { url, description }];
                  updateVideoSection('testimonial_videos', newVideos);
                }}
                onRemove={(index) => {
                  const newVideos = (profile.company_videos?.testimonial_videos || []).filter((_, i) => i !== index);
                  updateVideoSection('testimonial_videos', newVideos);
                }}
                maxVideos={20}
              />
              
              <VideoSection
                title="Vídeos Técnicos"
                videos={profile.company_videos?.technical_videos || []}
                onAdd={(url, description) => {
                  const newVideos = [...(profile.company_videos?.technical_videos || []), { url, description }];
                  updateVideoSection('technical_videos', newVideos);
                }}
                onRemove={(index) => {
                  const newVideos = (profile.company_videos?.technical_videos || []).filter((_, i) => i !== index);
                  updateVideoSection('technical_videos', newVideos);
                }}
                maxVideos={20}
              />
            </div>

            {/* ✨ NOVO CAMPO: Footer Customizado para YouTube */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Youtube className="h-4 w-4" />
                    Footer Customizado para Descrições do YouTube
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Texto padrão que será adicionado ao final de todas as descrições de vídeos do YouTube
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="youtube_company_footer">
                  Footer do YouTube
                  <span className="text-xs text-muted-foreground ml-2">(Opcional)</span>
                </Label>
                <Textarea
                  id="youtube_company_footer"
                  value={profile.youtube_company_footer || ''}
                  onChange={(e) => setProfile(prev => ({...prev, youtube_company_footer: e.target.value}))}
                  placeholder="Ex: 
📱 Siga-nos nas redes sociais
🌐 Visite nosso site: www.exemplo.com
📧 Contato: contato@exemplo.com"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este texto será automaticamente adicionado ao final das descrições geradas para vídeos do YouTube
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <div className="mb-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">ℹ️ Campos SEO Hidden</h4>
              <p className="text-sm text-muted-foreground">
                Estes campos não aparecem no site público, mas enriquecem o contexto da IA para geração de conteúdo mais preciso.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="seo_context_keywords">Palavras-chave de Contexto SEO</Label>
                <TagInput
                  value={profile.seo_context_keywords || []}
                  onChange={(keywords) => setProfile(prev => ({
                    ...prev, 
                    seo_context_keywords: keywords
                  }))}
                  placeholder="Digite e pressione Enter ou vírgula para adicionar"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite palavras-chave e pressione Enter ou vírgula para adicionar
                </p>
              </div>

              <div>
                <Label htmlFor="seo_market_positioning">Posicionamento de Mercado</Label>
                <Textarea
                  id="seo_market_positioning"
                  value={profile.seo_market_positioning || ''}
                  onChange={(e) => setProfile(prev => ({...prev, seo_market_positioning: e.target.value}))}
                  placeholder="Como sua empresa se posiciona no mercado? Qual é seu diferencial competitivo?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="seo_competitive_advantages">Vantagens Competitivas</Label>
                <Textarea
                  id="seo_competitive_advantages"
                  value={profile.seo_competitive_advantages || ''}
                  onChange={(e) => setProfile(prev => ({...prev, seo_competitive_advantages: e.target.value}))}
                  placeholder="Quais são as principais vantagens da sua empresa sobre a concorrência?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="seo_technical_expertise">Expertise Técnica</Label>
                <Textarea
                  id="seo_technical_expertise"
                  value={profile.seo_technical_expertise || ''}
                  onChange={(e) => setProfile(prev => ({...prev, seo_technical_expertise: e.target.value}))}
                  placeholder="Descreva a expertise técnica e conhecimentos específicos da empresa"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="seo_service_areas">Áreas de Serviço</Label>
                <Textarea
                  id="seo_service_areas"
                  value={profile.seo_service_areas || ''}
                  onChange={(e) => setProfile(prev => ({...prev, seo_service_areas: e.target.value}))}
                  placeholder="Quais regiões, cidades ou áreas geográficas sua empresa atende?"
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <ReviewsSection />
          </TabsContent>

          <TabsContent value="nps" className="space-y-4">
            <NPSInsightsTab />
          </TabsContent>

          <TabsContent value="partnerships" className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Parcerias e Citações Internacionais
              </h4>
              <p className="text-sm text-muted-foreground">
                Sites internacionais de grande relevância que citam ou fazem parceria com sua empresa.
                Estes dados são usados para <strong>SEO, Schema.org e Knowledge Base AI</strong>.
              </p>
            </div>
            
            <InternationalPartnershipsManager
              partnerships={(profile.institutional_links || []).filter(
                link => link.category === 'international_partnership'
              ) as any}
              onChange={(newPartnerships) => {
                setProfile(prev => ({
                  ...prev,
                  institutional_links: [
                    ...(prev.institutional_links || []).filter(link => link.category !== 'international_partnership'),
                    ...newPartnerships
                  ]
                }));
              }}
            />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <TrackingSEOTab 
              profile={profile}
              setProfile={setProfile}
            />
          </TabsContent>

          <TabsContent value="navigation" className="space-y-4">
            <NavigationFooterTab
              config={profile.navigation_footer_config || {
                navigation_menu: [],
                footer: { title: '', locations: [], links: [], social_links: [] }
              }}
              onChange={(config) => setProfile(prev => ({
                ...prev,
                navigation_footer_config: config
              }))}
            />
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            <CompanyMilestonesManager />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button 
            onClick={saveProfile} 
            disabled={saving}
            title={!profile.company_name ? "Preencha 'Nome da Empresa' para salvar" : undefined}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Perfil
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}