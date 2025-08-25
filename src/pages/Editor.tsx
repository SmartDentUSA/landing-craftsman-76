import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Eye, CheckCircle, ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MenuItem {
  label: string;
  href: string;
}

interface Solution {
  text: string;
  imageSrc: string;
  imageAlt: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface LandingPageData {
  status: 'draft' | 'approved';
  logoUrl: string;
  menu: MenuItem[];
  banner: {
    badgeText: string;
    title: string;
    subtitle: string;
    ctaPrimary: { label: string; href: string };
    ctaSecondary: { label: string; href: string };
    images: Array<{ src: string; alt: string }>;
  };
  solutions: Solution[];
  advisory: {
    title: string;
    paragraph: string;
    cta: { label: string; href: string };
    image: { src: string; alt: string };
  };
  faq: FAQ[];
  ctaFinal: {
    title: string;
    paragraph: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
  footer: {
    locations: Array<{ title: string; address: string }>;
    links: Array<{ label: string; href: string }>;
    social: Array<{ platform: string; href: string; iconAlt: string }>;
  };
}

const Editor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState<LandingPageData>({
    status: 'draft',
    logoUrl: '',
    menu: [
      { label: 'Início', href: '#home' },
      { label: 'Serviços', href: '#services' },
      { label: 'Sobre', href: '#about' },
      { label: 'Contato', href: '#contact' }
    ],
    banner: {
      badgeText: '16 anos de inovação',
      title: 'Transforme seu sorriso com tecnologia de ponta',
      subtitle: 'Especialistas em implantes, ortodontia e estética dental. Agende sua consulta e descubra o que podemos fazer por você.',
      ctaPrimary: { label: 'Agendar Consulta', href: 'https://wa.me/11999999999' },
      ctaSecondary: { label: 'Conhecer Serviços', href: '#services' },
      images: []
    },
    solutions: [
      { text: 'Implantes Dentários', imageSrc: '', imageAlt: 'Implante dentário' },
      { text: 'Ortodontia Invisível', imageSrc: '', imageAlt: 'Ortodontia invisível' },
      { text: 'Harmonização Facial', imageSrc: '', imageAlt: 'Harmonização facial' },
      { text: 'Clareamento Dental', imageSrc: '', imageAlt: 'Clareamento dental' }
    ],
    advisory: {
      title: 'Atendimento Personalizado',
      paragraph: 'Nossa equipe oferece consultoria especializada para cada caso, garantindo o melhor resultado para seu sorriso.',
      cta: { label: 'Fale com Especialista', href: 'https://wa.me/11999999999' },
      image: { src: '', alt: 'Atendimento especializado' }
    },
    faq: [
      {
        question: 'Quanto tempo dura um tratamento de implante?',
        answer: 'O tempo varia de acordo com cada caso, mas geralmente entre 4 a 6 meses para osseointegração completa.'
      },
      {
        question: 'Os tratamentos têm garantia?',
        answer: 'Sim, oferecemos garantia de até 5 anos para implantes e 2 anos para próteses.'
      },
      {
        question: 'Aceita convênio?',
        answer: 'Trabalhamos com os principais convênios odontológicos e oferecemos condições especiais para pagamento.'
      }
    ],
    ctaFinal: {
      title: 'Pronto para transformar seu sorriso?',
      paragraph: 'Agende uma avaliação gratuita e descubra como podemos ajudar você.',
      primary: { label: 'Agendar Avaliação', href: 'https://wa.me/11999999999' },
      secondary: { label: 'Ver Casos de Sucesso', href: '#cases' }
    },
    footer: {
      locations: [
        { title: 'Unidade Vila Madalena', address: 'Rua Harmonia, 123 - Vila Madalena, SP' },
        { title: 'Unidade Moema', address: 'Av. Ibirapuera, 456 - Moema, SP' }
      ],
      links: [
        { label: 'Política de Privacidade', href: '/privacy' },
        { label: 'Termos de Uso', href: '/terms' }
      ],
      social: [
        { platform: 'Instagram', href: 'https://instagram.com/smartdent', iconAlt: 'Instagram' },
        { platform: 'Facebook', href: 'https://facebook.com/smartdent', iconAlt: 'Facebook' }
      ]
    }
  });

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
    // Open preview in new tab or modal
    toast({
      title: "Abrindo preview",
      description: "O preview da sua landing page será aberto em uma nova aba.",
    });
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
      solutions: [...prev.solutions, { text: '', imageSrc: '', imageAlt: '' }]
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
                  <Accordion type="multiple" defaultValue={["header", "banner"]} className="space-y-4">
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
                            value={data.logoUrl}
                            onChange={(e) => setData(prev => ({ ...prev, logoUrl: e.target.value }))}
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
                                  value={item.label}
                                  onChange={(e) => {
                                    const newMenu = [...data.menu];
                                    newMenu[index].label = e.target.value;
                                    setData(prev => ({ ...prev, menu: newMenu }));
                                  }}
                                />
                                <Input
                                  placeholder="URL ou âncora"
                                  value={item.href}
                                  onChange={(e) => {
                                    const newMenu = [...data.menu];
                                    newMenu[index].href = e.target.value;
                                    setData(prev => ({ ...prev, menu: newMenu }));
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
                            value={data.banner.badgeText}
                            onChange={(e) => setData(prev => ({ 
                              ...prev, 
                              banner: { ...prev.banner, badgeText: e.target.value }
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
                              value={data.banner.ctaPrimary.label}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  ctaPrimary: { ...prev.banner.ctaPrimary, label: e.target.value }
                                }
                              }))}
                              className="mb-2"
                            />
                            <Input
                              placeholder="URL do botão"
                              value={data.banner.ctaPrimary.href}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  ctaPrimary: { ...prev.banner.ctaPrimary, href: e.target.value }
                                }
                              }))}
                            />
                          </div>
                          
                          <div>
                            <Label>CTA Secundário</Label>
                            <Input
                              placeholder="Texto do botão"
                              value={data.banner.ctaSecondary.label}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  ctaSecondary: { ...prev.banner.ctaSecondary, label: e.target.value }
                                }
                              }))}
                              className="mb-2"
                            />
                            <Input
                              placeholder="URL do botão"
                              value={data.banner.ctaSecondary.href}
                              onChange={(e) => setData(prev => ({ 
                                ...prev, 
                                banner: { 
                                  ...prev.banner, 
                                  ctaSecondary: { ...prev.banner.ctaSecondary, href: e.target.value }
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
                                  value={solution.imageSrc}
                                  onChange={(e) => {
                                    const newSolutions = [...data.solutions];
                                    newSolutions[index].imageSrc = e.target.value;
                                    setData(prev => ({ ...prev, solutions: newSolutions }));
                                  }}
                                />
                                <Input
                                  placeholder="Texto alternativo da imagem"
                                  value={solution.imageAlt}
                                  onChange={(e) => {
                                    const newSolutions = [...data.solutions];
                                    newSolutions[index].imageAlt = e.target.value;
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
                <div className="border rounded-lg p-4 bg-muted/20 min-h-[600px]">
                  <div className="text-center text-muted-foreground">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-primary/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <Eye className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Preview da Landing Page</h3>
                      <p className="text-sm">
                        O preview em tempo real será implementado aqui, mostrando exatamente como sua landing page ficará.
                      </p>
                    </div>
                    
                    {/* Preview content summary */}
                    <div className="text-left space-y-3 mt-6">
                      <div className="p-3 bg-card rounded border">
                        <h4 className="font-medium text-primary">Título:</h4>
                        <p className="text-sm">{data.banner.title || 'Não definido'}</p>
                      </div>
                      
                      <div className="p-3 bg-card rounded border">
                        <h4 className="font-medium text-primary">Soluções:</h4>
                        <p className="text-sm">{data.solutions.length} cards configurados</p>
                      </div>
                      
                      <div className="p-3 bg-card rounded border">
                        <h4 className="font-medium text-primary">FAQ:</h4>
                        <p className="text-sm">{data.faq.length} perguntas configuradas</p>
                      </div>
                    </div>
                  </div>
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