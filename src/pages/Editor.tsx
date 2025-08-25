import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Eye, CheckCircle, ArrowLeft, Plus, Trash2, Code2, ExternalLink, Copy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { generateHTML, SAMPLE_DATA } from "@/lib/template-engine";

interface MenuItem {
  label: string;
  href: string;
}

interface Solution {
  text: string;
  image: {
    src: string;
    alt: string;
  };
}

interface FAQ {
  question: string;
  answer: string;
}

interface LandingPageData {
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
    cta_primary: { label: string; href: string };
    cta_secondary: { label: string; href: string };
    images: Array<{ src: string; alt: string }>;
  };
  solutions_title: string;
  solutions: Solution[];
  advisory: {
    title: string;
    paragraph: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string };
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
}

const Editor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  
  const [data, setData] = useState<LandingPageData>({
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
        { src: 'https://via.placeholder.com/200x300?text=Imagem1', alt: 'Pessoa sorrindo' },
        { src: 'https://via.placeholder.com/200x300?text=Imagem2', alt: 'Pessoa escrevendo no caderno' },
        { src: 'https://via.placeholder.com/200x300?text=Imagem3', alt: 'Pessoa feliz' }
      ]
    },
    solutions_title: 'Soluções completas para todos os fluxos de trabalho',
    solutions: [
      { text: 'Resinas de alta performance para fluxos digitais precisos, tecnologia em cada detalhe.', image: { src: 'https://via.placeholder.com/800x600?text=Resinas', alt: 'Resinas de alta performance' } },
      { text: 'Melhores scanners intraorais do mundo para otimizar sua rotina clínica.', image: { src: 'https://via.placeholder.com/800x600?text=Scanner', alt: 'Scanners intraorais' } },
      { text: 'Impressoras 3D para transformar seu fluxo digital', image: { src: 'https://via.placeholder.com/800x600?text=Impressora', alt: 'Impressoras 3D' } },
      { text: 'Automação de processos que reduz retrabalho e acelera entregas.', image: { src: 'https://via.placeholder.com/800x600?text=Automacao', alt: 'Automação de processos' } }
    ],
    advisory: {
      title: 'Consultoria especializada para você investir de forma consciente e segura',
      paragraph: 'Nossa consultoria especializada ajuda você a implantar soluções digitais com foco em previsibilidade e escala, reduzindo riscos e maximizando o retorno do seu investimento.',
      cta: { label: 'Falar com consultor', href: 'https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es' },
      image: { src: 'https://via.placeholder.com/600x400?text=Consultoria', alt: 'Homem sorrindo com fone de ouvido' }
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

  const handleSave = () => {
    toast({
      title: "Alterações salvas",
      description: "Suas alterações foram salvas com sucesso.",
    });
  };

  const handleApprove = () => {
    setData(prev => ({ ...prev, status: 'approved' }));
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
      solutions: [...prev.solutions, { text: '', image: { src: '', alt: '' } }]
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
                <h1 className="text-xl font-semibold">Editor de Landing Page</h1>
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
                <ScrollArea className="h-[600px] pr-4">
                  <Accordion type="multiple" defaultValue={["seo", "header", "banner"]} className="space-y-4">
                    {/* SEO Section */}
                    <AccordionItem value="seo">
                      <AccordionTrigger className="text-lg font-semibold">
                        SEO e Meta Tags
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
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
                          <Label htmlFor="logoUrl">URL da Logo</Label>
                          <Input
                            id="logoUrl"
                            value={data.logo_url}
                            onChange={(e) => setData(prev => ({ ...prev, logo_url: e.target.value }))}
                            placeholder="https://exemplo.com/logo.png"
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
                            <Label>CTA Primário</Label>
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
                            <Label>CTA Secundário</Label>
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
                                <Input
                                  placeholder="URL da imagem"
                                  value={solution.image.src}
                                  onChange={(e) => {
                                    const newSolutions = [...data.solutions];
                                    newSolutions[index].image.src = e.target.value;
                                    setData(prev => ({ ...prev, solutions: newSolutions }));
                                  }}
                                />
                                <Input
                                  placeholder="Texto alternativo da imagem"
                                  value={solution.image.alt}
                                  onChange={(e) => {
                                    const newSolutions = [...data.solutions];
                                    newSolutions[index].image.alt = e.target.value;
                                    setData(prev => ({ ...prev, solutions: newSolutions }));
                                  }}
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
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            <Card className="shadow-large">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview em Tempo Real
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
                    <h4 className="text-sm font-medium">Código HTML Gerado</h4>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;