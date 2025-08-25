import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Eye, CheckCircle, ArrowLeft, Plus, Trash2, Code2, ExternalLink, Copy, Instagram, Facebook, Youtube, Twitter, Linkedin, Globe, Mail, Settings, TestTube, AlertCircle } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { Switch } from "@/components/ui/switch";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { generateHTML, generateEmailHTML, SAMPLE_DATA } from "@/lib/template-engine";
import useLandingPages from "@/hooks/useLandingPages";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  label: string;
  href: string;
}

interface Solution {
  text: string;
  image: {
    src: string;
    alt: string;
    scale: number;
  };
}

interface FAQ {
  question: string;
  answer: string;
}

interface EmailData {
  assunto_email: string;
  preheader_texto: string;
  url_site: string;
  logo_src: string;
  logo_alt: string;
  selo: string;
  titulo_principal: string;
  subtitulo: string;
  cta_href: string;
  cta_label: string;
  cta_subcopy: string;
  bloco1_titulo: string;
  bloco1_texto: string;
  bloco2_titulo: string;
  bloco2_texto: string;
  beneficio_1: string;
  beneficio_2: string;
  beneficio_3: string;
  imagem_href: string;
  imagem_src: string;
  imagem_alt: string;
  cta2_href: string;
  cta2_label: string;
  brand_name: string;
  endereco_completo: string;
  link_suporte: string;
  link_descadastro: string;
  link_preferencias: string;
}

interface LandingPageData {
  name: string;
  status: 'draft' | 'approved';
  seo_title: string;
  seo_description: string;
  logo_url: string;
  logo_alt: string;
  menu: MenuItem[];
  banner: {
    badge_text: string;
    title: string;
    subtitle: string;
    cta_primary: { label: string; href: string; visible?: boolean };
    cta_secondary: { label: string; href: string; visible?: boolean };
    images: Array<{ src: string; alt: string; scale: number }>;
  };
  solutions_title: string;
  solutions: Solution[];
  advisory: {
    title: string;
    paragraph: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string; scale: number };
  };
  faq_title: string;
  faq: FAQ[];
  cta_final: {
    title: string;
    paragraph: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
  footer_links_title: string;
  footer: {
    locations: Array<{ title: string; address: string }>;
    links: Array<{ label: string; href: string }>;
    social: Array<{ platform: string; href: string; icon_src: string; icon_alt: string }>;
  };
  email: EmailData;
}

// Opções de redes sociais com ícones fixos
const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'email', label: 'E-mail', icon: Mail },
];

const Editor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const { getLandingPage, updateLandingPage, addLandingPage } = useLandingPages();
  
  const [data, setData] = useState<LandingPageData>({
    name: 'Smart Dent Campanha Q1',
    status: 'draft',
    seo_title: 'Smart Dent - Sistema de Gestão Odontológica',
    seo_description: 'Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.',
    logo_url: 'https://via.placeholder.com/140x40?text=LOGO',
    logo_alt: 'Smart Dent Logo',
    menu: [
      { label: 'Institucional', href: 'https://smartdent.com.br/institucional' },
      { label: 'Resinas', href: 'https://smartdent.com.br/resinas3d' },
      { label: 'Scanner intraoral', href: 'https://smartdent.com.br/odontologia-digital-scanners-intraorais' },
      { label: 'Contato', href: 'https://smartdent.com.br/#institucional' }
    ],
    banner: {
      badge_text: 'Smart Dent 16 anos de inovação',
      title: 'Odontologia Digital: simples, eficiente e lucrativa',
      subtitle: 'A Smart Dent é uma referência em odontologia digital no Brasil, combinando tecnologia avançada, automação eficiente e qualidade.',
      cta_primary: { label: 'Falar com comercial', href: 'https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es' },
      cta_secondary: { label: 'Loja online', href: 'https://loja.smartdent.com.br/' },
      images: [
        { src: 'https://via.placeholder.com/200x300?text=Imagem1', alt: 'Pessoa sorrindo', scale: 1.0 },
        { src: 'https://via.placeholder.com/200x300?text=Imagem2', alt: 'Pessoa escrevendo no caderno', scale: 1.0 },
        { src: 'https://via.placeholder.com/200x300?text=Imagem3', alt: 'Pessoa feliz', scale: 1.0 }
      ]
    },
    solutions_title: 'Soluções completas para todos os fluxos de trabalho',
    solutions: [
      { text: 'Resinas de alta performance para fluxos digitais precisos, tecnologia em cada detalhe.', image: { src: 'https://via.placeholder.com/800x600?text=Resinas', alt: 'Resinas de alta performance', scale: 1.0 } },
      { text: 'Melhores scanners intraorais do mundo para otimizar sua rotina clínica.', image: { src: 'https://via.placeholder.com/800x600?text=Scanner', alt: 'Scanners intraorais', scale: 1.0 } },
      { text: 'Impressoras 3D para transformar seu fluxo digital', image: { src: 'https://via.placeholder.com/800x600?text=Impressora', alt: 'Impressoras 3D', scale: 1.0 } },
      { text: 'Automação de processos que reduz retrabalho e acelera entregas.', image: { src: 'https://via.placeholder.com/800x600?text=Automacao', alt: 'Automação de processos', scale: 1.0 } }
    ],
    advisory: {
      title: 'Consultoria especializada para você investir de forma consciente e segura',
      paragraph: 'Nossa consultoria especializada ajuda você a implantar soluções digitais com foco em previsibilidade e escala, reduzindo riscos e maximizando o retorno do seu investimento.',
      cta: { label: 'Falar com consultor', href: 'https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es' },
      image: { src: 'https://via.placeholder.com/600x400?text=Consultoria', alt: 'Homem sorrindo com fone de ouvido', scale: 1.0 }
    },
    faq_title: 'Perguntas frequentes',
    faq: [
      {
        question: 'Sobre a Smart Dent',
        answer: 'Foi da evolução da odontologia digital no Brasil que nasceu a Smart Dent. Em parceria com a USP São Carlos, seguimos impulsionando a odontologia digital e definindo novos padrões de excelência.'
      },
      {
        question: 'Qual é o principal objetivo da Smart Dent com seus clientes?',
        answer: 'Auxiliar dentistas e laboratórios a realizarem uma transformação digital segura e eficiente, adotando soluções integradas para aumentar a produtividade e reduzir custos operacionais.'
      },
      {
        question: 'Vocês oferecem suporte e treinamento?',
        answer: 'Sim. Oferecemos consultoria, implantação assistida e treinamentos práticos para garantir que a equipe utilize todo o potencial das tecnologias.'
      }
    ],
    cta_final: {
      title: 'Mais que tecnologia e materiais, entregamos um novo modelo de negócio para seu consultório.',
      paragraph: 'Acesse nosso portfólio de produtos',
      primary: { label: 'Atendimento digital', href: 'https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es' },
      secondary: { label: 'Fale com o consultor', href: 'https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es' }
    },
    footer_links_title: 'Links Úteis',
    footer: {
      locations: [
        { title: 'Smart Dent BR', address: 'R. Dr. Procópio de Toledo Malta, 62 — Morada dos Deuses, São Carlos — SP, 13562-293' },
        { title: 'Smart Dent USA', address: 'University City Blvd - Charlotte, NC' }
      ],
      links: [
        { label: 'Institucional', href: 'https://smartdent.com.br/institucional' },
        { label: 'Resinas', href: 'https://smartdent.com.br/resinas3d' },
        { label: 'Scanner intraoral', href: 'https://smartdent.com.br/odontologia-digital-scanners-intraorais' }
      ],
      social: [
        { platform: 'Instagram', href: 'https://www.instagram.com/smartdentoficial/', icon_src: 'https://via.placeholder.com/24x24?text=IG', icon_alt: 'Ícone do Instagram' },
        { platform: 'YouTube', href: 'https://www.youtube.com/@smartdentcadcam', icon_src: 'https://via.placeholder.com/24x24?text=YT', icon_alt: 'Ícone do YouTube' },
        { platform: 'Facebook', href: 'https://www.facebook.com/smartdentoficial/', icon_src: 'https://via.placeholder.com/24x24?text=FB', icon_alt: 'Ícone do Facebook' }
      ]
    },
    email: {
      assunto_email: 'Smart Dent - Oferta Especial',
      preheader_texto: 'Descubra as melhores soluções em odontologia digital',
      url_site: 'https://smartdent.com.br',
      logo_src: 'https://via.placeholder.com/140x40?text=LOGO',
      logo_alt: 'Smart Dent Logo',
      selo: 'NOVIDADE',
      titulo_principal: 'Transforme sua clínica com tecnologia de ponta',
      subtitulo: 'Descubra como nossa odontologia digital pode revolucionar seu consultório',
      cta_href: 'https://wa.me/5516993831794',
      cta_label: 'Falar com especialista',
      cta_subcopy: 'Consultoria gratuita e sem compromisso',
      bloco1_titulo: 'Resinas 3D',
      bloco1_texto: 'Alta performance para fluxos digitais precisos',
      bloco2_titulo: 'Scanners Intraorais',
      bloco2_texto: 'Melhores do mundo para otimizar sua rotina',
      beneficio_1: 'Redução de até 70% no tempo de trabalho',
      beneficio_2: 'Maior precisão nos procedimentos',
      beneficio_3: 'ROI garantido em 6 meses',
      imagem_href: 'https://smartdent.com.br',
      imagem_src: 'https://via.placeholder.com/536x300?text=Produtos',
      imagem_alt: 'Produtos Smart Dent',
      cta2_href: 'https://loja.smartdent.com.br',
      cta2_label: 'Ver catálogo completo',
      brand_name: 'Smart Dent',
      endereco_completo: 'R. Dr. Procópio de Toledo Malta, 62 — Morada dos Deuses, São Carlos — SP',
      link_suporte: 'https://wa.me/5516993831794',
      link_descadastro: 'https://smartdent.com.br/descadastrar',
      link_preferencias: 'https://smartdent.com.br/preferencias'
    }
  });

  // Generate HTML in real-time
  const generatedHTML = useMemo(() => {
    try {
      return generateHTML(data);
    } catch (error) {
      console.error('Error generating HTML:', error);
      return '<p>Erro ao gerar preview. Verifique os dados do formulário.</p>';
    }
  }, [data]);

  // Generate Email HTML in real-time
  const generatedEmailHTML = useMemo(() => {
    try {
      return generateEmailHTML(data.email);
    } catch (error) {
      console.error('Error generating Email HTML:', error);
      return '<p>Erro ao gerar preview do e-mail. Verifique os dados do formulário.</p>';
    }
  }, [data.email]);

  // Carregar dados da landing page se estiver editando
  useEffect(() => {
    if (id) {
      const landingPage = getLandingPage(id);
      if (landingPage && landingPage.data) {
        setData(landingPage.data);
      }
    }
  }, [id, getLandingPage]);

  const handleSave = () => {
    if (id) {
      // Atualizar landing page existente
      updateLandingPage(id, {
        name: data.name,
        status: data.status,
        data: data
      });
    } else {
      // Criar nova landing page
      const newId = addLandingPage({
        name: data.name,
        status: data.status,
        template: 'Smart Dent Base v1',
        data: data
      });
      navigate(`/editor/${newId}`);
    }
    
    toast({
      title: "Alterações salvas",
      description: "Suas alterações foram salvas com sucesso.",
    });
  };

  const handleApprove = () => {
    setData(prev => ({ ...prev, status: 'approved' }));
    
    if (id) {
      updateLandingPage(id, {
        name: data.name,
        status: 'approved',
        data: data
      });
    }
    
    toast({
      title: "Landing Page aprovada!",
      description: "Sua landing page foi aprovada e está pronta para uso.",
    });
  };

  const handlePreview = () => {
    // Open preview in new tab
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleViewCode = () => {
    navigate('/code-view', { state: { data, landingName: 'Smart Dent Landing' } });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedHTML);
      toast({
        title: "Código copiado!",
        description: "O código HTML foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const addMenuItem = () => {
    setData(prev => ({
      ...prev,
      menu: [...prev.menu, { label: '', href: '' }]
    }));
  };

  const removeMenuItem = (index: number) => {
    setData(prev => ({
      ...prev,
      menu: prev.menu.filter((_, i) => i !== index)
    }));
  };

  const addSolution = () => {
    setData(prev => ({
      ...prev,
      solutions: [...prev.solutions, { text: '', image: { src: '', alt: '', scale: 1.0 } }]
    }));
  };

  const removeSolution = (index: number) => {
    setData(prev => ({
      ...prev,
      solutions: prev.solutions.filter((_, i) => i !== index)
    }));
  };

  const addFAQ = () => {
    setData(prev => ({
      ...prev,
      faq: [...prev.faq, { question: '', answer: '' }]
    }));
  };

  const removeFAQ = (index: number) => {
    setData(prev => ({
      ...prev,
      faq: prev.faq.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{data.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={data.status === 'approved' ? "default" : "secondary"}>
                    {data.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Template: Smart Dent Base v1</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {data.status === 'approved' && (
                <>
                  <Button variant="outline" onClick={handleViewCode}>
                    <Code2 className="h-4 w-4 mr-2" />
                    Ver Código
                  </Button>
                  <Button onClick={handleCopyCode} className="gradient-primary shadow-primary">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Código
                  </Button>
                </>
              )}
              {data.status === 'draft' && (
                <Button onClick={handleApprove} className="gradient-primary shadow-primary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>Configurações da Landing Page</CardTitle>
                <CardDescription>
                  Preencha os campos abaixo para personalizar sua landing page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="landing-page" className="w-full">
                   <TabsList className="grid w-full grid-cols-3">
                     <TabsTrigger value="landing-page">Landing Page</TabsTrigger>
                     <TabsTrigger value="email">E-mail Marketing</TabsTrigger>
                     <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
                   </TabsList>
                  
                  <TabsContent value="landing-page" className="mt-4">
                    <ScrollArea className="h-[600px] pr-4">
                      <Accordion type="multiple" defaultValue={["seo", "header", "banner"]} className="space-y-4">
                    {/* SEO Section */}
                    <AccordionItem value="seo">
                      <AccordionTrigger className="text-lg font-semibold">
                        SEO e Meta Tags
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label htmlFor="landingName">Nome da Landing Page</Label>
                          <Input
                            id="landingName"
                            value={data.name}
                            onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome para identificação no sistema"
                          />
                        </div>
                        <div>
                          <Label htmlFor="seoTitle">Título da Página (SEO)</Label>
                          <Input
                            id="seoTitle"
                            value={data.seo_title}
                            onChange={(e) => setData(prev => ({ ...prev, seo_title: e.target.value }))}
                            placeholder="Smart Dent - Sistema de Gestão Odontológica"
                            maxLength={60}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Máximo 60 caracteres. Atual: {data.seo_title.length}/60
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="seoDescription">Meta Descrição</Label>
                          <Textarea
                            id="seoDescription"
                            value={data.seo_description}
                            onChange={(e) => setData(prev => ({ ...prev, seo_description: e.target.value }))}
                            placeholder="Descrição que aparecerá nos resultados de busca do Google"
                            className="min-h-[80px]"
                            maxLength={160}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Máximo 160 caracteres. Atual: {data.seo_description.length}/160
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="logoAlt">Texto Alternativo da Logo</Label>
                          <Input
                            id="logoAlt"
                            value={data.logo_alt}
                            onChange={(e) => setData(prev => ({ ...prev, logo_alt: e.target.value }))}
                            placeholder="Descrição da logo para acessibilidade"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Header Section */}
                    <AccordionItem value="header">
                      <AccordionTrigger className="text-lg font-semibold">
                        Cabeçalho
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                         <div>
                           <Label htmlFor="logoUrl">Logo</Label>
                           <ImageUploader
                             value={data.logo_url}
                             onChange={(url) => setData(prev => ({ ...prev, logo_url: url }))}
                             altValue={data.logo_alt}
                             onAltChange={(alt) => setData(prev => ({ ...prev, logo_alt: alt }))}
                             placeholder="URL da logo"
                           />
                         </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Menu de Navegação</Label>
                            <Button size="sm" variant="outline" onClick={addMenuItem}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {data.menu.map((item, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder="Label do menu"
                                  value={item?.label || ''}
                                  onChange={(e) => {
                                    const newMenu = [...data.menu];
                                    if (newMenu[index]) {
                                      newMenu[index].label = e.target.value;
                                      setData(prev => ({ ...prev, menu: newMenu }));
                                    }
                                  }}
                                />
                                <Input
                                  placeholder="URL ou âncora"
                                  value={item?.href || ''}
                                  onChange={(e) => {
                                    const newMenu = [...data.menu];
                                    if (newMenu[index]) {
                                      newMenu[index].href = e.target.value;
                                      setData(prev => ({ ...prev, menu: newMenu }));
                                    }
                                  }}
                                />
                                <Button size="sm" variant="ghost" onClick={() => removeMenuItem(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Banner Section */}
                    <AccordionItem value="banner">
                      <AccordionTrigger className="text-lg font-semibold">
                        Banner Principal
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label htmlFor="badgeText">Texto do Badge</Label>
                          <Input
                            id="badgeText"
                            value={data.banner.badge_text}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              banner: { ...prev.banner, badge_text: e.target.value }
                            }))}
                            placeholder="16 anos de inovação"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="title">Título Principal</Label>
                          <Textarea
                            id="title"
                            value={data.banner.title}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              banner: { ...prev.banner, title: e.target.value }
                            }))}
                            placeholder="Seu título principal aqui"
                            className="min-h-[80px]"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="subtitle">Subtítulo</Label>
                          <Textarea
                            id="subtitle"
                            value={data.banner.subtitle}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              banner: { ...prev.banner, subtitle: e.target.value }
                            }))}
                            placeholder="Descrição do seu negócio"
                            className="min-h-[80px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Label>CTA Primário</Label>
                              <Switch
                                checked={data.banner.cta_primary?.visible !== false}
                                onCheckedChange={(checked) => setData(prev => ({ 
                                  ...prev, 
                                  banner: { 
                                    ...prev.banner, 
                                    cta_primary: { ...prev.banner.cta_primary, visible: checked }
                                  }
                                }))}
                              />
                              <span className="text-sm text-muted-foreground">Visível</span>
                            </div>
                            <Input
                              placeholder="Texto do botão"
                              value={data.banner.cta_primary?.label || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  cta_primary: { ...prev.banner.cta_primary, label: e.target.value }
                                }
                              }))}
                              className="mb-2"
                            />
                            <Input
                              placeholder="URL do botão"
                              value={data.banner.cta_primary?.href || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  cta_primary: { ...prev.banner.cta_primary, href: e.target.value }
                                }
                              }))}
                            />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Label>CTA Secundário</Label>
                              <Switch
                                checked={data.banner.cta_secondary?.visible !== false}
                                onCheckedChange={(checked) => setData(prev => ({ 
                                  ...prev, 
                                  banner: { 
                                    ...prev.banner, 
                                    cta_secondary: { ...prev.banner.cta_secondary, visible: checked }
                                  }
                                }))}
                              />
                              <span className="text-sm text-muted-foreground">Visível</span>
                            </div>
                            <Input
                              placeholder="Texto do botão"
                              value={data.banner.cta_secondary?.label || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  cta_secondary: { ...prev.banner.cta_secondary, label: e.target.value }
                                }
                              }))}
                              className="mb-2"
                            />
                            <Input
                              placeholder="URL do botão"
                              value={data.banner.cta_secondary?.href || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  cta_secondary: { ...prev.banner.cta_secondary, href: e.target.value }
                                }
                              }))}
                            />
                          </div>
                        </div>

                        {/* Banner Images */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Imagens do Banner</Label>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setData(prev => ({
                                ...prev,
                                banner: {
                                  ...prev.banner,
                                  images: [...prev.banner.images, { src: '', alt: '', scale: 1.0 }]
                                }
                              }))}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                           <div className="space-y-3">
                             {data.banner.images.map((image, index) => (
                               <Card key={index} className="p-3">
                                 <div className="space-y-2">
                                   <div className="flex items-center justify-between">
                                     <span className="text-sm font-medium">Imagem {index + 1}</span>
                                     <Button 
                                       size="sm" 
                                       variant="ghost" 
                                       onClick={() => setData(prev => ({
                                         ...prev,
                                         banner: {
                                           ...prev.banner,
                                           images: prev.banner.images.filter((_, i) => i !== index)
                                         }
                                       }))}
                                     >
                                       <Trash2 className="h-4 w-4" />
                                     </Button>
                                   </div>
                                   <ImageUploader
                                     value={image.src}
                                     onChange={(url) => {
                                       const newImages = [...data.banner.images];
                                       newImages[index].src = url;
                                       setData(prev => ({ 
                                         ...prev, 
                                         banner: { ...prev.banner, images: newImages }
                                       }));
                                     }}
                                     altValue={image.alt}
                                     onAltChange={(alt) => {
                                       const newImages = [...data.banner.images];
                                       newImages[index].alt = alt;
                                       setData(prev => ({ 
                                         ...prev, 
                                         banner: { ...prev.banner, images: newImages }
                                       }));
                                     }}
                                     scaleValue={image.scale}
                                     onScaleChange={(scale) => {
                                       const newImages = [...data.banner.images];
                                       newImages[index].scale = scale;
                                       setData(prev => ({ 
                                         ...prev, 
                                         banner: { ...prev.banner, images: newImages }
                                       }));
                                     }}
                                     placeholder="URL da imagem do banner"
                                   />
                                 </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Solutions Section */}
                    <AccordionItem value="solutions">
                      <AccordionTrigger className="text-lg font-semibold">
                        Soluções / Controle de Vendas
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Cards de Soluções</Label>
                          <Button size="sm" variant="outline" onClick={addSolution}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {data.solutions.map((solution, index) => (
                            <Card key={index} className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Card {index + 1}</span>
                                  <Button size="sm" variant="ghost" onClick={() => removeSolution(index)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Input
                                  placeholder="Texto da solução"
                                  value={solution.text}
                                  onChange={(e) => {
                                    const newSolutions = [...data.solutions];
                                    newSolutions[index].text = e.target.value;
                                    setData(prev => ({ ...prev, solutions: newSolutions }));
                                  }}
                                />
                                 <ImageUploader
                                   value={solution.image.src}
                                   onChange={(url) => {
                                     const newSolutions = [...data.solutions];
                                     newSolutions[index].image.src = url;
                                     setData(prev => ({ ...prev, solutions: newSolutions }));
                                   }}
                                   altValue={solution.image.alt}
                                   onAltChange={(alt) => {
                                     const newSolutions = [...data.solutions];
                                     newSolutions[index].image.alt = alt;
                                     setData(prev => ({ ...prev, solutions: newSolutions }));
                                   }}
                                   scaleValue={solution.image.scale}
                                   onScaleChange={(scale) => {
                                     const newSolutions = [...data.solutions];
                                     newSolutions[index].image.scale = scale;
                                     setData(prev => ({ ...prev, solutions: newSolutions }));
                                   }}
                                   placeholder="URL da imagem da solução"
                                 />
                              </div>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* FAQ Section */}
                    <AccordionItem value="faq">
                      <AccordionTrigger className="text-lg font-semibold">
                        FAQ (Perguntas Frequentes)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Lista de Perguntas</Label>
                          <Button size="sm" variant="outline" onClick={addFAQ}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          {data.faq.map((faqItem, index) => (
                            <Card key={index} className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">FAQ {index + 1}</span>
                                  <Button size="sm" variant="ghost" onClick={() => removeFAQ(index)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Input
                                  placeholder="Pergunta"
                                  value={faqItem.question}
                                  onChange={(e) => {
                                    const newFAQ = [...data.faq];
                                    newFAQ[index].question = e.target.value;
                                    setData(prev => ({ ...prev, faq: newFAQ }));
                                  }}
                                />
                                <Textarea
                                  placeholder="Resposta"
                                  value={faqItem.answer}
                                  onChange={(e) => {
                                    const newFAQ = [...data.faq];
                                    newFAQ[index].answer = e.target.value;
                                    setData(prev => ({ ...prev, faq: newFAQ }));
                                  }}
                                  className="min-h-[80px]"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Advisory Section */}
                    <AccordionItem value="advisory">
                      <AccordionTrigger className="text-lg font-semibold">
                        Consultoria / Atendimento
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label htmlFor="advisoryTitle">Título da Seção</Label>
                          <Input
                            id="advisoryTitle"
                            value={data.advisory.title}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              advisory: { ...prev.advisory, title: e.target.value }
                            }))}
                            placeholder="Consultoria especializada para você..."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="advisoryParagraph">Descrição</Label>
                          <Textarea
                            id="advisoryParagraph"
                            value={data.advisory.paragraph}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              advisory: { ...prev.advisory, paragraph: e.target.value }
                            }))}
                            placeholder="Nossa consultoria especializada ajuda..."
                            className="min-h-[80px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Texto do CTA</Label>
                            <Input
                              placeholder="Falar com consultor"
                              value={data.advisory.cta?.label || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                advisory: { 
                                  ...prev.advisory, 
                                  cta: { ...prev.advisory.cta, label: e.target.value }
                                }
                              }))}
                            />
                          </div>
                          
                          <div>
                            <Label>URL do CTA</Label>
                            <Input
                              placeholder="https://wa.me/..."
                              value={data.advisory.cta?.href || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                advisory: { 
                                  ...prev.advisory, 
                                  cta: { ...prev.advisory.cta, href: e.target.value }
                                }
                              }))}
                            />
                          </div>
                        </div>

                         <div>
                           <Label>Imagem da Consultoria</Label>
                           <ImageUploader
                             value={data.advisory.image.src}
                             onChange={(url) => setData(prev => ({ 
                               ...prev, 
                               advisory: { 
                                 ...prev.advisory, 
                                 image: { ...prev.advisory.image, src: url }
                               }
                             }))}
                             altValue={data.advisory.image.alt}
                             onAltChange={(alt) => setData(prev => ({ 
                               ...prev, 
                               advisory: { 
                                 ...prev.advisory, 
                                 image: { ...prev.advisory.image, alt }
                               }
                             }))}
                             scaleValue={data.advisory.image.scale}
                             onScaleChange={(scale) => setData(prev => ({ 
                               ...prev, 
                               advisory: { 
                                 ...prev.advisory, 
                                 image: { ...prev.advisory.image, scale }
                               }
                             }))}
                             placeholder="URL da imagem da consultoria"
                           />
                         </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* CTA Final Section */}
                    <AccordionItem value="cta_final">
                      <AccordionTrigger className="text-lg font-semibold">
                        CTA Final
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label htmlFor="ctaFinalTitle">Título</Label>
                          <Textarea
                            id="ctaFinalTitle"
                            value={data.cta_final.title}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              cta_final: { ...prev.cta_final, title: e.target.value }
                            }))}
                            placeholder="Mais que tecnologia e materiais..."
                            className="min-h-[80px]"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="ctaFinalParagraph">Subtítulo</Label>
                          <Input
                            id="ctaFinalParagraph"
                            value={data.cta_final.paragraph}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              cta_final: { ...prev.cta_final, paragraph: e.target.value }
                            }))}
                            placeholder="Acesse nosso portfólio de produtos"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Botão Primário</Label>
                            <Input
                              placeholder="Texto do botão"
                              value={data.cta_final.primary?.label || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                cta_final: { 
                                  ...prev.cta_final, 
                                  primary: { ...prev.cta_final.primary, label: e.target.value }
                                }
                              }))}
                              className="mb-2"
                            />
                            <Input
                              placeholder="URL do botão"
                              value={data.cta_final.primary?.href || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                cta_final: { 
                                  ...prev.cta_final, 
                                  primary: { ...prev.cta_final.primary, href: e.target.value }
                                }
                              }))}
                            />
                          </div>
                          
                          <div>
                            <Label>Botão Secundário</Label>
                            <Input
                              placeholder="Texto do botão"
                              value={data.cta_final.secondary?.label || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                cta_final: { 
                                  ...prev.cta_final, 
                                  secondary: { ...prev.cta_final.secondary, label: e.target.value }
                                }
                              }))}
                              className="mb-2"
                            />
                            <Input
                              placeholder="URL do botão"
                              value={data.cta_final.secondary?.href || ''}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                cta_final: { 
                                  ...prev.cta_final, 
                                  secondary: { ...prev.cta_final.secondary, href: e.target.value }
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Footer Section */}
                    <AccordionItem value="footer">
                      <AccordionTrigger className="text-lg font-semibold">
                        Rodapé
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label htmlFor="footerLinksTitle">Título dos Links Úteis</Label>
                          <Input
                            id="footerLinksTitle"
                            value={data.footer_links_title}
                            onChange={(e) => setData(prev => ({ ...prev, footer_links_title: e.target.value }))}
                            placeholder="Links Úteis"
                          />
                        </div>

                        {/* Locations */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Endereços / Localizações</Label>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setData(prev => ({
                                ...prev,
                                footer: {
                                  ...prev.footer,
                                  locations: [...prev.footer.locations, { title: '', address: '' }]
                                }
                              }))}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {data.footer.locations.map((location, index) => (
                              <Card key={index} className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Localização {index + 1}</span>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => setData(prev => ({
                                        ...prev,
                                        footer: {
                                          ...prev.footer,
                                          locations: prev.footer.locations.filter((_, i) => i !== index)
                                        }
                                      }))}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <Input
                                    placeholder="Nome da unidade"
                                    value={location.title}
                                    onChange={(e) => {
                                      const newLocations = [...data.footer.locations];
                                      newLocations[index].title = e.target.value;
                                      setData(prev => ({ 
                                        ...prev, 
                                        footer: { ...prev.footer, locations: newLocations }
                                      }));
                                    }}
                                  />
                                  <Textarea
                                    placeholder="Endereço completo"
                                    value={location.address}
                                    onChange={(e) => {
                                      const newLocations = [...data.footer.locations];
                                      newLocations[index].address = e.target.value;
                                      setData(prev => ({ 
                                        ...prev, 
                                        footer: { ...prev.footer, locations: newLocations }
                                      }));
                                    }}
                                    className="min-h-[60px]"
                                  />
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Footer Links */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Links Úteis</Label>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setData(prev => ({
                                ...prev,
                                footer: {
                                  ...prev.footer,
                                  links: [...prev.footer.links, { label: '', href: '' }]
                                }
                              }))}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {data.footer.links.map((link, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder="Nome do link"
                                  value={link.label}
                                  onChange={(e) => {
                                    const newLinks = [...data.footer.links];
                                    newLinks[index].label = e.target.value;
                                    setData(prev => ({ 
                                      ...prev, 
                                      footer: { ...prev.footer, links: newLinks }
                                    }));
                                  }}
                                />
                                <Input
                                  placeholder="URL do link"
                                  value={link.href}
                                  onChange={(e) => {
                                    const newLinks = [...data.footer.links];
                                    newLinks[index].href = e.target.value;
                                    setData(prev => ({ 
                                      ...prev, 
                                      footer: { ...prev.footer, links: newLinks }
                                    }));
                                  }}
                                />
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setData(prev => ({
                                    ...prev,
                                    footer: {
                                      ...prev.footer,
                                      links: prev.footer.links.filter((_, i) => i !== index)
                                    }
                                  }))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Social Media */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Redes Sociais</Label>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setData(prev => ({
                                ...prev,
                                footer: {
                                  ...prev.footer,
                                  social: [...prev.footer.social, { platform: '', href: '', icon_src: '', icon_alt: '' }]
                                }
                              }))}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {data.footer.social.map((social, index) => {
                              const selectedPlatform = SOCIAL_PLATFORMS.find(p => p.value === social.platform);
                              const IconComponent = selectedPlatform?.icon || Globe;
                              
                              return (
                                <Card key={index} className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <IconComponent size={16} />
                                        <span className="text-sm font-medium">
                                          {selectedPlatform?.label || 'Rede Social'} {index + 1}
                                        </span>
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => setData(prev => ({
                                          ...prev,
                                          footer: {
                                            ...prev.footer,
                                            social: prev.footer.social.filter((_, i) => i !== index)
                                          }
                                        }))}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-xs">Plataforma</Label>
                                        <Select
                                          value={social.platform}
                                          onValueChange={(value) => {
                                            const newSocial = [...data.footer.social];
                                            const platform = SOCIAL_PLATFORMS.find(p => p.value === value);
                                            newSocial[index] = {
                                              ...newSocial[index],
                                              platform: value,
                                              icon_src: '', // Será usado o ícone fixo
                                              icon_alt: `Ícone do ${platform?.label || value}`
                                            };
                                            setData(prev => ({ 
                                              ...prev, 
                                              footer: { ...prev.footer, social: newSocial }
                                            }));
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Escolher rede social" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {SOCIAL_PLATFORMS.map((platform) => (
                                              <SelectItem key={platform.value} value={platform.value}>
                                                <div className="flex items-center gap-2">
                                                  <platform.icon size={14} />
                                                  {platform.label}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs">URL</Label>
                                        <Input
                                          placeholder="https://..."
                                          value={social.href}
                                          onChange={(e) => {
                                            const newSocial = [...data.footer.social];
                                            newSocial[index].href = e.target.value;
                                            setData(prev => ({ 
                                              ...prev, 
                                              footer: { ...prev.footer, social: newSocial }
                                            }));
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                      </Accordion>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="email" className="mt-4">
                    <ScrollArea className="h-[600px] pr-4">
                      <Accordion type="multiple" defaultValue={["email-header", "email-content"]} className="space-y-4">
                        {/* Email Header */}
                        <AccordionItem value="email-header">
                          <AccordionTrigger className="text-lg font-semibold">
                            Cabeçalho do E-mail
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div>
                              <Label htmlFor="emailSubject">Assunto do E-mail</Label>
                              <Input
                                id="emailSubject"
                                value={data.email.assunto_email}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, assunto_email: e.target.value } }))}
                                placeholder="Assunto do e-mail"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="emailPreheader">Preheader (Texto Breve)</Label>
                              <Textarea
                                id="emailPreheader"
                                value={data.email.preheader_texto}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, preheader_texto: e.target.value } }))}
                                placeholder="Texto que aparece na lista de e-mails"
                                className="min-h-[60px]"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="emailSiteUrl">URL do Site</Label>
                                <Input
                                  id="emailSiteUrl"
                                  value={data.email.url_site}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, url_site: e.target.value } }))}
                                  placeholder="https://exemplo.com"
                                />
                              </div>
                               <div>
                                 <Label htmlFor="emailLogoSrc">Logo do E-mail</Label>
                                 <ImageUploader
                                   value={data.email.logo_src}
                                   onChange={(url) => setData(prev => ({ ...prev, email: { ...prev.email, logo_src: url } }))}
                                   altValue={data.email.logo_alt}
                                   onAltChange={(alt) => setData(prev => ({ ...prev, email: { ...prev.email, logo_alt: alt } }))}
                                   placeholder="URL da logo do e-mail"
                                 />
                               </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="emailLogoAlt">Texto Alternativo da Logo</Label>
                              <Input
                                id="emailLogoAlt"
                                value={data.email.logo_alt}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, logo_alt: e.target.value } }))}
                                placeholder="Descrição da logo"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Email Content */}
                        <AccordionItem value="email-content">
                          <AccordionTrigger className="text-lg font-semibold">
                            Conteúdo Principal
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div>
                              <Label htmlFor="emailSeal">Selo/Badge</Label>
                              <Input
                                id="emailSeal"
                                value={data.email.selo}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, selo: e.target.value } }))}
                                placeholder="NOVIDADE, OFERTA, etc."
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="emailMainTitle">Título Principal</Label>
                              <Input
                                id="emailMainTitle"
                                value={data.email.titulo_principal}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, titulo_principal: e.target.value } }))}
                                placeholder="Título principal do e-mail"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="emailSubtitle">Subtítulo</Label>
                              <Textarea
                                id="emailSubtitle"
                                value={data.email.subtitulo}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, subtitulo: e.target.value } }))}
                                placeholder="Descrição complementar"
                                className="min-h-[80px]"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* CTA Principal */}
                        <AccordionItem value="email-cta">
                          <AccordionTrigger className="text-lg font-semibold">
                            CTA Principal
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="emailCtaLabel">Texto do Botão</Label>
                                <Input
                                  id="emailCtaLabel"
                                  value={data.email.cta_label}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, cta_label: e.target.value } }))}
                                  placeholder="Texto do botão principal"
                                />
                              </div>
                              <div>
                                <Label htmlFor="emailCtaHref">Link do Botão</Label>
                                <Input
                                  id="emailCtaHref"
                                  value={data.email.cta_href}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, cta_href: e.target.value } }))}
                                  placeholder="URL de destino"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="emailCtaSubcopy">Texto abaixo do botão</Label>
                              <Input
                                id="emailCtaSubcopy"
                                value={data.email.cta_subcopy}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, cta_subcopy: e.target.value } }))}
                                placeholder="Texto pequeno abaixo do CTA"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Blocos de Destaque */}
                        <AccordionItem value="email-highlights">
                          <AccordionTrigger className="text-lg font-semibold">
                            Blocos de Destaque
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="emailBlock1Title">Bloco 1 - Título</Label>
                                <Input
                                  id="emailBlock1Title"
                                  value={data.email.bloco1_titulo}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, bloco1_titulo: e.target.value } }))}
                                  placeholder="Título do primeiro bloco"
                                />
                                <Label htmlFor="emailBlock1Text">Bloco 1 - Texto</Label>
                                <Textarea
                                  id="emailBlock1Text"
                                  value={data.email.bloco1_texto}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, bloco1_texto: e.target.value } }))}
                                  placeholder="Descrição do primeiro bloco"
                                  className="min-h-[60px]"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="emailBlock2Title">Bloco 2 - Título</Label>
                                <Input
                                  id="emailBlock2Title"
                                  value={data.email.bloco2_titulo}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, bloco2_titulo: e.target.value } }))}
                                  placeholder="Título do segundo bloco"
                                />
                                <Label htmlFor="emailBlock2Text">Bloco 2 - Texto</Label>
                                <Textarea
                                  id="emailBlock2Text"
                                  value={data.email.bloco2_texto}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, bloco2_texto: e.target.value } }))}
                                  placeholder="Descrição do segundo bloco"
                                  className="min-h-[60px]"
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Benefícios */}
                        <AccordionItem value="email-benefits">
                          <AccordionTrigger className="text-lg font-semibold">
                            Lista de Benefícios
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div>
                              <Label htmlFor="emailBenefit1">Benefício 1</Label>
                              <Input
                                id="emailBenefit1"
                                value={data.email.beneficio_1}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, beneficio_1: e.target.value } }))}
                                placeholder="Primeiro benefício"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="emailBenefit2">Benefício 2</Label>
                              <Input
                                id="emailBenefit2"
                                value={data.email.beneficio_2}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, beneficio_2: e.target.value } }))}
                                placeholder="Segundo benefício"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="emailBenefit3">Benefício 3</Label>
                              <Input
                                id="emailBenefit3"
                                value={data.email.beneficio_3}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, beneficio_3: e.target.value } }))}
                                placeholder="Terceiro benefício"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Imagem */}
                        <AccordionItem value="email-image">
                          <AccordionTrigger className="text-lg font-semibold">
                            Imagem Principal
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                             <div>
                               <Label htmlFor="emailImageSrc">Imagem Principal do E-mail</Label>
                               <ImageUploader
                                 value={data.email.imagem_src}
                                 onChange={(url) => setData(prev => ({ ...prev, email: { ...prev.email, imagem_src: url } }))}
                                 altValue={data.email.imagem_alt}
                                 onAltChange={(alt) => setData(prev => ({ ...prev, email: { ...prev.email, imagem_alt: alt } }))}
                                 placeholder="URL da imagem principal do e-mail"
                               />
                             </div>
                             
                             <div>
                               <Label htmlFor="emailImageHref">Link da Imagem</Label>
                               <Input
                                 id="emailImageHref"
                                 value={data.email.imagem_href}
                                 onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, imagem_href: e.target.value } }))}
                                 placeholder="Para onde a imagem leva"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* CTA Secundário */}
                        <AccordionItem value="email-cta2">
                          <AccordionTrigger className="text-lg font-semibold">
                            CTA Secundário
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="emailCta2Label">Texto do Botão</Label>
                                <Input
                                  id="emailCta2Label"
                                  value={data.email.cta2_label}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, cta2_label: e.target.value } }))}
                                  placeholder="Texto do botão secundário"
                                />
                              </div>
                              <div>
                                <Label htmlFor="emailCta2Href">Link do Botão</Label>
                                <Input
                                  id="emailCta2Href"
                                  value={data.email.cta2_href}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, cta2_href: e.target.value } }))}
                                  placeholder="URL de destino"
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        {/* Footer */}
                        <AccordionItem value="email-footer">
                          <AccordionTrigger className="text-lg font-semibold">
                            Rodapé do E-mail
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div>
                              <Label htmlFor="emailBrandName">Nome da Marca</Label>
                              <Input
                                id="emailBrandName"
                                value={data.email.brand_name}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, brand_name: e.target.value } }))}
                                placeholder="Nome da empresa"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="emailAddress">Endereço Completo</Label>
                              <Textarea
                                id="emailAddress"
                                value={data.email.endereco_completo}
                                onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, endereco_completo: e.target.value } }))}
                                placeholder="Endereço completo da empresa"
                                className="min-h-[60px]"
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="emailSupportLink">Link Suporte</Label>
                                <Input
                                  id="emailSupportLink"
                                  value={data.email.link_suporte}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, link_suporte: e.target.value } }))}
                                  placeholder="Link para suporte"
                                />
                              </div>
                              <div>
                                <Label htmlFor="emailUnsubscribeLink">Link Descadastro</Label>
                                <Input
                                  id="emailUnsubscribeLink"
                                  value={data.email.link_descadastro}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, link_descadastro: e.target.value } }))}
                                  placeholder="Link para descadastro"
                                />
                              </div>
                              <div>
                                <Label htmlFor="emailPreferencesLink">Link Preferências</Label>
                                <Input
                                  id="emailPreferencesLink"
                                  value={data.email.link_preferencias}
                                  onChange={(e) => setData(prev => ({ ...prev, email: { ...prev.email, link_preferencias: e.target.value } }))}
                                  placeholder="Link para preferências"
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                       </Accordion>
                     </ScrollArea>
                   </TabsContent>

                   <TabsContent value="cloudflare" className="mt-4">
                     <ScrollArea className="h-[600px] pr-4">
                       <div className="space-y-6">
                         <div className="rounded-lg border p-4 bg-muted/50">
                           <div className="flex items-center gap-2 mb-2">
                             <Settings className="h-5 w-5 text-primary" />
                             <h3 className="font-medium">Configurações do Cloudflare Images</h3>
                           </div>
                           <p className="text-sm text-muted-foreground mb-4">
                             Configure suas credenciais do Cloudflare para habilitar o upload de imagens.
                           </p>
                           
                           <div className="flex gap-3">
                             <Button 
                               onClick={() => navigate('/cloudflare-settings')}
                               className="gradient-primary shadow-primary"
                             >
                               <Settings className="h-4 w-4 mr-2" />
                               Configurar Cloudflare
                             </Button>
                             
                             <Button 
                               variant="outline"
                               onClick={async () => {
                                 try {
                                   const testFile = new Blob(['test'], { type: 'text/plain' });
                                   const formData = new FormData();
                                   formData.append('file', testFile, 'test.txt');

                                   const { data, error } = await supabase.functions.invoke('upload-image', {
                                     body: formData
                                   });

                                   if (error) throw error;

                                   toast({
                                     title: "Teste bem-sucedido!",
                                     description: "A conexão com o Cloudflare está funcionando.",
                                   });
                                 } catch (error) {
                                   toast({
                                     title: "Erro no teste",
                                     description: "Verifique suas configurações do Cloudflare.",
                                     variant: "destructive"
                                   });
                                 }
                               }}
                             >
                               <TestTube className="h-4 w-4 mr-2" />
                               Testar Conexão
                             </Button>
                           </div>
                         </div>

                         <div className="rounded-lg border p-4">
                           <h3 className="font-medium mb-3">Como configurar:</h3>
                           <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                             <li>Acesse o dashboard do Cloudflare (dash.cloudflare.com)</li>
                             <li>Vá para a seção "Images" no menu lateral</li>
                             <li>Copie o Account ID exibido na página</li>
                             <li>Vá para "My Profile" → "API Tokens"</li>
                             <li>Crie um novo token com permissão "Cloudflare Images:Edit"</li>
                             <li>Use essas credenciais na página de configurações</li>
                           </ol>
                         </div>

                         <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                           <div className="flex items-center gap-2 mb-2">
                             <AlertCircle className="h-4 w-4 text-amber-600" />
                             <h3 className="font-medium text-amber-800 dark:text-amber-200">Status do Upload</h3>
                           </div>
                           <p className="text-sm text-amber-700 dark:text-amber-300">
                             Atualmente o upload de imagens não está funcionando. Configure suas credenciais do Cloudflare para habilitar esta funcionalidade.
                           </p>
                         </div>
                       </div>
                     </ScrollArea>
                   </TabsContent>
                 </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            {/* Landing Page Preview */}
            <Card className="shadow-large">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview da Landing Page
                </CardTitle>
                <CardDescription>
                  Visualize como sua landing page ficará
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={generatedHTML}
                    className="w-full h-[600px] border-0"
                    title="Preview da Landing Page"
                    sandbox="allow-scripts"
                  />
                </div>
                
                {/* Quick Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handlePreview}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir em Nova Aba
                  </Button>
                  {data.status === 'approved' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleViewCode}
                        className="flex-1"
                      >
                        <Code2 className="h-4 w-4 mr-2" />
                        Ver Código
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleCopyCode}
                        className="flex-1 gradient-primary"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Código
                      </Button>
                    </>
                  )}
                </div>

                {/* Code Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Código HTML da Landing Page</h4>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleCopyCode}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Textarea
                      value={generatedHTML}
                      readOnly
                      className="font-mono text-xs min-h-[200px] resize-none border-0 bg-muted/30"
                      placeholder="O código HTML gerado aparecerá aqui após preencher os campos..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {generatedHTML.split('\n').length} linhas • {Math.round(generatedHTML.length / 1024)} KB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Email Marketing Preview */}
            <Card className="shadow-large">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Preview do E-mail Marketing
                </CardTitle>
                <CardDescription>
                  Visualize como seu e-mail ficará
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={generatedEmailHTML}
                    className="w-full h-[600px] border-0"
                    title="Preview do E-mail Marketing"
                    sandbox="allow-scripts"
                  />
                </div>
                
                {/* Quick Action Buttons for Email */}
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      const blob = new Blob([generatedEmailHTML], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                    }}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir E-mail em Nova Aba
                  </Button>
                  {data.status === 'approved' && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedEmailHTML);
                        toast({
                          title: "Código copiado!",
                          description: "O código HTML do e-mail foi copiado para a área de transferência.",
                        });
                      }}
                      className="flex-1 gradient-primary"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Código do E-mail
                    </Button>
                  )}
                </div>

                {/* Email Code Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Código HTML do E-mail</h4>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedEmailHTML);
                          toast({
                            title: "Código copiado!",
                            description: "O código HTML do e-mail foi copiado para a área de transferência.",
                          });
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Textarea
                      value={generatedEmailHTML}
                      readOnly
                      className="font-mono text-xs min-h-[200px] resize-none border-0 bg-muted/30"
                      placeholder="O código HTML do e-mail aparecerá aqui após preencher os campos..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {generatedEmailHTML.split('\n').length} linhas • {Math.round(generatedEmailHTML.length / 1024)} KB
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;