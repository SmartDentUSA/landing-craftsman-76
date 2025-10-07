import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Building2, Video, Instagram, Youtube, Search } from "lucide-react";
import { VideoSection } from "./VideoSection";
import { ReviewsSection } from "./ReviewsSection";
import { useCompanyVideos } from "@/hooks/useCompanyVideos";
import { useTargetAudienceAggregator } from "@/hooks/useTargetAudienceAggregator";

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
    }
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
          // SEO Hidden Fields
          seo_context_keywords: Array.isArray((data as any).seo_context_keywords) ? (data as any).seo_context_keywords : [],
          seo_market_positioning: (data as any).seo_market_positioning || "",
          seo_competitive_advantages: (data as any).seo_competitive_advantages || "",
          seo_technical_expertise: (data as any).seo_technical_expertise || "",
          seo_service_areas: (data as any).seo_service_areas || "",
          company_videos: videos,
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
        // SEO Hidden Fields
        seo_context_keywords: profile.seo_context_keywords || [],
        seo_market_positioning: profile.seo_market_positioning,
        seo_competitive_advantages: profile.seo_competitive_advantages,
        seo_technical_expertise: profile.seo_technical_expertise,
        seo_service_areas: profile.seo_service_areas,
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="social">Redes Sociais</TabsTrigger>
            <TabsTrigger value="videos">Vídeos da Empresa</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="seo">SEO Hidden</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Nome da Empresa *</Label>
                <Input
                  id="company_name"
                  value={profile.company_name}
                  onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                  placeholder="Nome da sua empresa"
                />
              </div>
              <div>
                <Label htmlFor="business_sector">Setor de Atuação</Label>
                <Input
                  id="business_sector"
                  value={profile.business_sector || ''}
                  onChange={(e) => setProfile({...profile, business_sector: e.target.value})}
                  placeholder="Ex: Tecnologia, Saúde, Educação"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_description">Descrição da Empresa</Label>
              <Textarea
                id="company_description"
                value={profile.company_description || ''}
                onChange={(e) => setProfile({...profile, company_description: e.target.value})}
                placeholder="Descreva sua empresa, seus produtos e serviços"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => setProfile({...profile, target_audience: e.target.value})}
                  placeholder="Defina seu público-alvo (ex: Dentistas, Profissionais de saúde, Clínicas)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este valor será usado automaticamente ao criar novos produtos e categorias
                </p>
              </div>
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={profile.website_url || ''}
                  onChange={(e) => setProfile({...profile, website_url: e.target.value})}
                  placeholder="https://www.suaempresa.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="main_products_services">Principais Produtos/Serviços</Label>
              <Textarea
                id="main_products_services"
                value={profile.main_products_services || ''}
                onChange={(e) => setProfile({...profile, main_products_services: e.target.value})}
                placeholder="Liste os principais produtos ou serviços da empresa"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="brand_values">Valores da Marca</Label>
              <Textarea
                id="brand_values"
                value={profile.brand_values || ''}
                onChange={(e) => setProfile({...profile, brand_values: e.target.value})}
                placeholder="Quais são os valores e princípios da sua empresa?"
                rows={2}
              />
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
                  onChange={(e) => setProfile({...profile, contact_email: e.target.value})}
                  placeholder="contato@suaempresa.com"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Telefone de Contato</Label>
                <Input
                  id="contact_phone"
                  value={profile.contact_phone || ''}
                  onChange={(e) => setProfile({...profile, contact_phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="youtube_channel" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  Canal do YouTube
                </Label>
                <Input
                  id="youtube_channel"
                  value={profile.youtube_channel || ''}
                  onChange={(e) => setProfile({...profile, youtube_channel: e.target.value})}
                  placeholder="https://youtube.com/@seucanal"
                />
              </div>
              <div>
                <Label htmlFor="instagram_profile" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Perfil do Instagram
                </Label>
                <Input
                  id="instagram_profile"
                  value={profile.instagram_profile || ''}
                  onChange={(e) => setProfile({...profile, instagram_profile: e.target.value})}
                  placeholder="https://instagram.com/seuperfil"
                />
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
                  onChange={(keywords) => setProfile({
                    ...profile, 
                    seo_context_keywords: keywords
                  })}
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
                  onChange={(e) => setProfile({...profile, seo_market_positioning: e.target.value})}
                  placeholder="Como sua empresa se posiciona no mercado? Qual é seu diferencial competitivo?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="seo_competitive_advantages">Vantagens Competitivas</Label>
                <Textarea
                  id="seo_competitive_advantages"
                  value={profile.seo_competitive_advantages || ''}
                  onChange={(e) => setProfile({...profile, seo_competitive_advantages: e.target.value})}
                  placeholder="Quais são as principais vantagens da sua empresa sobre a concorrência?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="seo_technical_expertise">Expertise Técnica</Label>
                <Textarea
                  id="seo_technical_expertise"
                  value={profile.seo_technical_expertise || ''}
                  onChange={(e) => setProfile({...profile, seo_technical_expertise: e.target.value})}
                  placeholder="Descreva a expertise técnica e conhecimentos específicos da empresa"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="seo_service_areas">Áreas de Serviço</Label>
                <Textarea
                  id="seo_service_areas"
                  value={profile.seo_service_areas || ''}
                  onChange={(e) => setProfile({...profile, seo_service_areas: e.target.value})}
                  placeholder="Quais regiões, cidades ou áreas geográficas sua empresa atende?"
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <ReviewsSection />
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