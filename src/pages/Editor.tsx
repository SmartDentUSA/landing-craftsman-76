import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Save, Eye, Code, Copy, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useLandingPages from "@/hooks/useLandingPages";
import { generateHTML, generateEmailHTML } from "@/lib/template-engine";

interface MenuItem {
  label: string;
  href: string;
}

interface Solution {
  text: string;
  image: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface LandingPageData {
  name: string;
  status: 'draft' | 'approved';
  template: string;
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
    images: string[];
  };
  solutions_title: string;
  solutions: Solution[];
  advisory: {
    title: string;
    paragraph: string;
    cta: { label: string; href: string };
    image: string;
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
  const { getLandingPage, updateLandingPage, addLandingPage } = useLandingPages();
  
  const [previewTab, setPreviewTab] = useState('landing-preview');
  const [data, setData] = useState<LandingPageData>({
    name: 'Smart Dent Campanha Q1',
    status: 'draft',
    template: 'Smart Dent Base v1',
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
        'https://via.placeholder.com/200x300?text=Imagem1',
        'https://via.placeholder.com/200x300?text=Imagem2',
        'https://via.placeholder.com/200x300?text=Imagem3'
      ]
    },
    solutions_title: 'Soluções de alto padrão para inovar sua clínica',
    solutions: [
      { 
        text: 'Resinas 3D: material biocompatível com alta resistência e acabamento superior para restaurações duradouras.',
        image: 'https://via.placeholder.com/200x150?text=Resinas'
      },
      { 
        text: 'Scanner intraoral: precisão milimétrica para diagnósticos certeiros e tratamentos mais eficazes.',
        image: 'https://via.placeholder.com/200x150?text=Scanner'
      }
    ],
    advisory: {
      title: 'Consultoria personalizada para o seu negócio',
      paragraph: 'Nossa equipe de especialistas oferece consultoria completa para implementação de odontologia digital em clínicas de todos os portes.',
      cta: { label: 'Agendar consultoria', href: 'https://smartdent.com.br/consultoria' },
      image: 'https://via.placeholder.com/400x300?text=Consultoria'
    },
    faq_title: 'Perguntas frequentes',
    faq: [
      {
        question: 'Como funciona a garantia dos equipamentos?',
        answer: 'Todos os equipamentos possuem garantia de 2 anos contra defeitos de fabricação, além do suporte técnico especializado.'
      },
      {
        question: 'Vocês oferecem treinamento?',
        answer: 'Sim, oferecemos treinamento completo para toda a equipe, incluindo certificação em odontologia digital.'
      }
    ],
    cta_final: {
      title: 'Pronto para revolucionar sua clínica?',
      paragraph: 'Entre em contato conosco e descubra como a Smart Dent pode transformar seu consultório com tecnologia de ponta.',
      primary: { label: 'Falar com especialista', href: 'https://wa.me/5516993831794' },
      secondary: { label: 'Ver produtos', href: 'https://loja.smartdent.com.br/' }
    },
    footer_links_title: 'Encontre-nos',
    footer: {
      locations: [
        { title: 'Ribeirão Preto - SP', address: 'Rua Exemplo, 123 - Centro' },
        { title: 'São Paulo - SP', address: 'Av. Paulista, 456 - Bela Vista' }
      ],
      links: [
        { label: 'Sobre nós', href: 'https://smartdent.com.br/sobre' },
        { label: 'Produtos', href: 'https://loja.smartdent.com.br/' },
        { label: 'Contato', href: 'https://smartdent.com.br/contato' },
        { label: 'Política de Privacidade', href: 'https://smartdent.com.br/privacidade' }
      ],
      social: [
        { platform: 'instagram', href: 'https://instagram.com/smartdent', icon_src: '', icon_alt: 'Instagram Smart Dent' },
        { platform: 'facebook', href: 'https://facebook.com/smartdent', icon_src: '', icon_alt: 'Facebook Smart Dent' }
      ]
    }
  });

  // Gerar HTML baseado nos dados
  const generatedHTML = useMemo(() => {
    return generateHTML(data);
  }, [data]);

  const generatedEmailHTML = useMemo(() => {
    return generateEmailHTML(data);
  }, [data]);

  useEffect(() => {
    if (id) {
      const landingPage = getLandingPage(id);
      if (landingPage && landingPage.data) {
        setData(landingPage.data);
      }
    }
  }, [id, getLandingPage]);

  const handleSave = () => {
    try {
      if (id) {
        updateLandingPage(id, { data });
        toast({
          title: "Página salva",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        addLandingPage({ 
          name: data.name, 
          status: data.status, 
          template: data.template,
          data 
        });
        toast({
          title: "Página criada",
          description: "A nova landing page foi criada com sucesso."
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a página.",
        variant: "destructive"
      });
    }
  };

  const handleApprove = () => {
    if (id) {
      updateLandingPage(id, { status: 'approved', data });
      toast({
        title: "Página aprovada",
        description: "A landing page foi aprovada e publicada."
      });
    }
  };

  const handlePreview = () => {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleViewCode = () => {
    navigate(`/code/${id}`);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedHTML);
      toast({
        title: "Código copiado",
        description: "O código HTML foi copiado para a área de transferência."
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código.",
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

  const addBannerImage = () => {
    setData(prev => ({
      ...prev,
      banner: {
        ...prev.banner,
        images: [...prev.banner.images, '']
      }
    }));
  };

  const removeBannerImage = (index: number) => {
    setData(prev => ({
      ...prev,
      banner: {
        ...prev.banner,
        images: prev.banner.images.filter((_, i) => i !== index)
      }
    }));
  };

  const addSolution = () => {
    setData(prev => ({
      ...prev,
      solutions: [...prev.solutions, { text: '', image: '' }]
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

  const addFooterLocation = () => {
    setData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        locations: [...prev.footer.locations, { title: '', address: '' }]
      }
    }));
  };

  const removeFooterLocation = (index: number) => {
    setData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        locations: prev.footer.locations.filter((_, i) => i !== index)
      }
    }));
  };

  const addFooterLink = () => {
    setData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: [...prev.footer.links, { label: '', href: '' }]
      }
    }));
  };

  const removeFooterLink = (index: number) => {
    setData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: prev.footer.links.filter((_, i) => i !== index)
      }
    }));
  };

  const addSocialLink = () => {
    setData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        social: [...prev.footer.social, { platform: '', href: '', icon_src: '', icon_alt: '' }]
      }
    }));
  };

  const removeSocialLink = (index: number) => {
    setData(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        social: prev.footer.social.filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">Status: {data.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleViewCode}>
            <Code className="w-4 h-4 mr-2" />
            Ver Código
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyCode}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          <Button size="sm" onClick={handleApprove} variant="default">
            Aprovar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Editor Panel */}
        <div className="w-1/2 border-r overflow-y-auto p-6">
          <Accordion type="multiple" className="w-full">
            {/* Header Section */}
            <AccordionItem value="header">
              <AccordionTrigger>Header & Logo</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      value={data.logo_url}
                      onChange={(e) => setData(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                  <div>
                    <Label htmlFor="logo_alt">Logo Alt Text</Label>
                    <Input
                      id="logo_alt"
                      value={data.logo_alt}
                      onChange={(e) => setData(prev => ({ ...prev, logo_alt: e.target.value }))}
                      placeholder="Descrição do logo"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Menu Items</Label>
                    <Button size="sm" onClick={addMenuItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.menu.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={item.label}
                        onChange={(e) => {
                          const newMenu = [...data.menu];
                          newMenu[index].label = e.target.value;
                          setData(prev => ({ ...prev, menu: newMenu }));
                        }}
                        placeholder="Label"
                      />
                      <Input
                        value={item.href}
                        onChange={(e) => {
                          const newMenu = [...data.menu];
                          newMenu[index].href = e.target.value;
                          setData(prev => ({ ...prev, menu: newMenu }));
                        }}
                        placeholder="URL"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeMenuItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Banner Section */}
            <AccordionItem value="banner">
              <AccordionTrigger>Banner Principal</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label htmlFor="badge_text">Badge Text</Label>
                  <Input
                    id="badge_text"
                    value={data.banner.badge_text}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      banner: { ...prev.banner, badge_text: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="banner_title">Título Principal</Label>
                  <Input
                    id="banner_title"
                    value={data.banner.title}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      banner: { ...prev.banner, title: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="banner_subtitle">Subtítulo</Label>
                  <Textarea
                    id="banner_subtitle"
                    value={data.banner.subtitle}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      banner: { ...prev.banner, subtitle: e.target.value }
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cta_primary_label">CTA Primário - Label</Label>
                    <Input
                      id="cta_primary_label"
                      value={data.banner.cta_primary.label}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        banner: {
                          ...prev.banner,
                          cta_primary: { ...prev.banner.cta_primary, label: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cta_primary_href">CTA Primário - URL</Label>
                    <Input
                      id="cta_primary_href"
                      value={data.banner.cta_primary.href}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        banner: {
                          ...prev.banner,
                          cta_primary: { ...prev.banner.cta_primary, href: e.target.value }
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cta_secondary_label">CTA Secundário - Label</Label>
                    <Input
                      id="cta_secondary_label"
                      value={data.banner.cta_secondary.label}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        banner: {
                          ...prev.banner,
                          cta_secondary: { ...prev.banner.cta_secondary, label: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cta_secondary_href">CTA Secundário - URL</Label>
                    <Input
                      id="cta_secondary_href"
                      value={data.banner.cta_secondary.href}
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Imagens do Banner</Label>
                    <Button size="sm" onClick={addBannerImage}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.banner.images.map((image, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={image}
                        onChange={(e) => {
                          const newImages = [...data.banner.images];
                          newImages[index] = e.target.value;
                          setData(prev => ({
                            ...prev,
                            banner: { ...prev.banner, images: newImages }
                          }));
                        }}
                        placeholder="URL da imagem"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeBannerImage(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Solutions Section */}
            <AccordionItem value="solutions">
              <AccordionTrigger>Soluções</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label htmlFor="solutions_title">Título da Seção</Label>
                  <Input
                    id="solutions_title"
                    value={data.solutions_title}
                    onChange={(e) => setData(prev => ({ ...prev, solutions_title: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Soluções</Label>
                    <Button size="sm" onClick={addSolution}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.solutions.map((solution, index) => (
                    <Card key={index} className="p-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Solução {index + 1}</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeSolution(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={solution.text}
                          onChange={(e) => {
                            const newSolutions = [...data.solutions];
                            newSolutions[index].text = e.target.value;
                            setData(prev => ({ ...prev, solutions: newSolutions }));
                          }}
                          placeholder="Descrição da solução"
                        />
                        <Input
                          value={solution.image}
                          onChange={(e) => {
                            const newSolutions = [...data.solutions];
                            newSolutions[index].image = e.target.value;
                            setData(prev => ({ ...prev, solutions: newSolutions }));
                          }}
                          placeholder="URL da imagem"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Advisory Section */}
            <AccordionItem value="advisory">
              <AccordionTrigger>Consultoria</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label htmlFor="advisory_title">Título</Label>
                  <Input
                    id="advisory_title"
                    value={data.advisory.title}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      advisory: { ...prev.advisory, title: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="advisory_paragraph">Parágrafo</Label>
                  <Textarea
                    id="advisory_paragraph"
                    value={data.advisory.paragraph}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      advisory: { ...prev.advisory, paragraph: e.target.value }
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="advisory_cta_label">CTA Label</Label>
                    <Input
                      id="advisory_cta_label"
                      value={data.advisory.cta.label}
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
                    <Label htmlFor="advisory_cta_href">CTA URL</Label>
                    <Input
                      id="advisory_cta_href"
                      value={data.advisory.cta.href}
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
                  <Label htmlFor="advisory_image">Imagem URL</Label>
                  <Input
                    id="advisory_image"
                    value={data.advisory.image}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      advisory: { ...prev.advisory, image: e.target.value }
                    }))}
                    placeholder="URL da imagem"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* FAQ Section */}
            <AccordionItem value="faq">
              <AccordionTrigger>FAQ</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label htmlFor="faq_title">Título da Seção</Label>
                  <Input
                    id="faq_title"
                    value={data.faq_title}
                    onChange={(e) => setData(prev => ({ ...prev, faq_title: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Perguntas e Respostas</Label>
                    <Button size="sm" onClick={addFAQ}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.faq.map((faq, index) => (
                    <Card key={index} className="p-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>FAQ {index + 1}</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFAQ(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          value={faq.question}
                          onChange={(e) => {
                            const newFAQ = [...data.faq];
                            newFAQ[index].question = e.target.value;
                            setData(prev => ({ ...prev, faq: newFAQ }));
                          }}
                          placeholder="Pergunta"
                        />
                        <Textarea
                          value={faq.answer}
                          onChange={(e) => {
                            const newFAQ = [...data.faq];
                            newFAQ[index].answer = e.target.value;
                            setData(prev => ({ ...prev, faq: newFAQ }));
                          }}
                          placeholder="Resposta"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* CTA Final Section */}
            <AccordionItem value="cta-final">
              <AccordionTrigger>CTA Final</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label htmlFor="cta_final_title">Título</Label>
                  <Input
                    id="cta_final_title"
                    value={data.cta_final.title}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      cta_final: { ...prev.cta_final, title: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="cta_final_paragraph">Parágrafo</Label>
                  <Textarea
                    id="cta_final_paragraph"
                    value={data.cta_final.paragraph}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      cta_final: { ...prev.cta_final, paragraph: e.target.value }
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cta_final_primary_label">CTA Primário - Label</Label>
                    <Input
                      id="cta_final_primary_label"
                      value={data.cta_final.primary.label}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        cta_final: {
                          ...prev.cta_final,
                          primary: { ...prev.cta_final.primary, label: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cta_final_primary_href">CTA Primário - URL</Label>
                    <Input
                      id="cta_final_primary_href"
                      value={data.cta_final.primary.href}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        cta_final: {
                          ...prev.cta_final,
                          primary: { ...prev.cta_final.primary, href: e.target.value }
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cta_final_secondary_label">CTA Secundário - Label</Label>
                    <Input
                      id="cta_final_secondary_label"
                      value={data.cta_final.secondary.label}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        cta_final: {
                          ...prev.cta_final,
                          secondary: { ...prev.cta_final.secondary, label: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cta_final_secondary_href">CTA Secundário - URL</Label>
                    <Input
                      id="cta_final_secondary_href"
                      value={data.cta_final.secondary.href}
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
              <AccordionTrigger>Footer</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label htmlFor="footer_links_title">Título dos Links</Label>
                  <Input
                    id="footer_links_title"
                    value={data.footer_links_title}
                    onChange={(e) => setData(prev => ({ ...prev, footer_links_title: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Localizações</Label>
                    <Button size="sm" onClick={addFooterLocation}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.footer.locations.map((location, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={location.title}
                        onChange={(e) => {
                          const newLocations = [...data.footer.locations];
                          newLocations[index].title = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, locations: newLocations }
                          }));
                        }}
                        placeholder="Título"
                      />
                      <Input
                        value={location.address}
                        onChange={(e) => {
                          const newLocations = [...data.footer.locations];
                          newLocations[index].address = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, locations: newLocations }
                          }));
                        }}
                        placeholder="Endereço"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFooterLocation(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Links do Footer</Label>
                    <Button size="sm" onClick={addFooterLink}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.footer.links.map((link, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const newLinks = [...data.footer.links];
                          newLinks[index].label = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, links: newLinks }
                          }));
                        }}
                        placeholder="Label"
                      />
                      <Input
                        value={link.href}
                        onChange={(e) => {
                          const newLinks = [...data.footer.links];
                          newLinks[index].href = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, links: newLinks }
                          }));
                        }}
                        placeholder="URL"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFooterLink(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Redes Sociais</Label>
                    <Button size="sm" onClick={addSocialLink}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  {data.footer.social.map((social, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                      <Input
                        value={social.platform}
                        onChange={(e) => {
                          const newSocial = [...data.footer.social];
                          newSocial[index].platform = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, social: newSocial }
                          }));
                        }}
                        placeholder="Plataforma"
                      />
                      <Input
                        value={social.href}
                        onChange={(e) => {
                          const newSocial = [...data.footer.social];
                          newSocial[index].href = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, social: newSocial }
                          }));
                        }}
                        placeholder="URL"
                      />
                      <Input
                        value={social.icon_alt}
                        onChange={(e) => {
                          const newSocial = [...data.footer.social];
                          newSocial[index].icon_alt = e.target.value;
                          setData(prev => ({
                            ...prev,
                            footer: { ...prev.footer, social: newSocial }
                          }));
                        }}
                        placeholder="Alt text"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeSocialLink(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 bg-gray-50">
          <Tabs value={previewTab} onValueChange={setPreviewTab} className="h-full flex flex-col">
            <TabsList className="m-4">
              <TabsTrigger value="landing-preview">Landing Page</TabsTrigger>
              <TabsTrigger value="email-preview">Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="landing-preview" className="flex-1 m-4">
              <div className="h-full border rounded-lg bg-white">
                <iframe
                  srcDoc={generatedHTML}
                  className="w-full h-full rounded-lg"
                  title="Landing Page Preview"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="email-preview" className="flex-1 m-4">
              <div className="h-full border rounded-lg bg-white">
                <iframe
                  srcDoc={generatedEmailHTML}
                  className="w-full h-full rounded-lg"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Editor;