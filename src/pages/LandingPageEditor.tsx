import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, FileText, Settings, Sparkles, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLandingPagesSupabase } from "@/hooks/useLandingPagesSupabase";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { BlogStatusIndicator } from "@/components/blog/BlogStatusIndicator";

interface LandingPageData {
  banner?: {
    title?: string;
    subtitle?: string;
    cta_text?: string;
    cta_url?: string;
    background_image?: string;
  };
  solutions?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

const LandingPageEditor = () => {
  const { landingPageId } = useParams<{ landingPageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { landingPages, getLandingPage, updateLandingPage, isLoading } = useLandingPagesSupabase();
  
  const [landingPage, setLandingPage] = useState<any>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [template, setTemplate] = useState("default");
  const [embed, setEmbed] = useState("");
  const [data, setData] = useState<LandingPageData>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (landingPageId && !isLoading) {
      const lp = getLandingPage(landingPageId);
      if (lp) {
        setLandingPage(lp);
        setName(lp.name);
        setStatus(lp.status);
        setTemplate(lp.template);
        setEmbed(lp.embed || "");
        setData(lp.data || {});
      }
    }
  }, [landingPageId, getLandingPage, isLoading]);

  const handleSave = async () => {
    if (!landingPageId) return;
    
    setSaving(true);
    try {
      await updateLandingPage(landingPageId, {
        name,
        status,
        template,
        embed: embed || undefined,
        data
      });
      
      toast({
        title: "Landing Page salva",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateBannerData = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      banner: {
        ...prev.banner,
        [field]: value
      }
    }));
  };

  const updateSEOData = (field: string, value: string | string[]) => {
    setData(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: value
      }
    }));
  };

  const updateContactData = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
  };

  const addSolution = () => {
    setData(prev => ({
      ...prev,
      solutions: [
        ...(prev.solutions || []),
        { title: "", description: "" }
      ]
    }));
  };

  const updateSolution = (index: number, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      solutions: prev.solutions?.map((solution, i) => 
        i === index ? { ...solution, [field]: value } : solution
      )
    }));
  };

  const removeSolution = (index: number) => {
    setData(prev => ({
      ...prev,
      solutions: prev.solutions?.filter((_, i) => i !== index)
    }));
  };

  const addFAQ = () => {
    setData(prev => ({
      ...prev,
      faq: [
        ...(prev.faq || []),
        { question: "", answer: "" }
      ]
    }));
  };

  const updateFAQ = (index: number, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      faq: prev.faq?.map((faq, i) => 
        i === index ? { ...faq, [field]: value } : faq
      )
    }));
  };

  const removeFAQ = (index: number) => {
    setData(prev => ({
      ...prev,
      faq: prev.faq?.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Carregando dados da landing page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!landingPageId || !landingPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Landing Page não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              A landing page solicitada não foi encontrada.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <BreadcrumbNavigation />
            </div>
            
            <div className="flex items-center gap-2">
              <BlogStatusIndicator blogData={null} landingPageData={landingPage} />
              <Badge variant={status === 'approved' ? 'default' : 'secondary'}>
                {status === 'approved' ? 'Aprovado' : 'Rascunho'}
              </Badge>
              <Button
                onClick={() => navigate(`/blog-editor/${landingPageId}`)}
                variant="outline"
                size="sm"
              >
                <FileText className="mr-2 h-4 w-4" />
                Editor de Blog
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">
                  <Settings className="mr-2 h-4 w-4" />
                  Básico
                </TabsTrigger>
                <TabsTrigger value="banner">
                  <Globe className="mr-2 h-4 w-4" />
                  Banner
                </TabsTrigger>
                <TabsTrigger value="solutions">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Soluções
                </TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome da Landing Page</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Digite o nome da landing page"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="template">Template</Label>
                      <Select value={template} onValueChange={setTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão</SelectItem>
                          <SelectItem value="modern">Moderno</SelectItem>
                          <SelectItem value="minimal">Minimalista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="embed">Código de Incorporação</Label>
                      <Textarea
                        id="embed"
                        value={embed}
                        onChange={(e) => setEmbed(e.target.value)}
                        placeholder="Cole aqui o código HTML/JavaScript para incorporar"
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="banner" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Banner Principal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="banner-title">Título</Label>
                      <Input
                        id="banner-title"
                        value={data.banner?.title || ""}
                        onChange={(e) => updateBannerData("title", e.target.value)}
                        placeholder="Título principal do banner"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="banner-subtitle">Subtítulo</Label>
                      <Textarea
                        id="banner-subtitle"
                        value={data.banner?.subtitle || ""}
                        onChange={(e) => updateBannerData("subtitle", e.target.value)}
                        placeholder="Subtítulo ou descrição"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="banner-cta-text">Texto do Botão</Label>
                      <Input
                        id="banner-cta-text"
                        value={data.banner?.cta_text || ""}
                        onChange={(e) => updateBannerData("cta_text", e.target.value)}
                        placeholder="Texto do call-to-action"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="banner-cta-url">URL do Botão</Label>
                      <Input
                        id="banner-cta-url"
                        value={data.banner?.cta_url || ""}
                        onChange={(e) => updateBannerData("cta_url", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="banner-bg">Imagem de Fundo</Label>
                      <Input
                        id="banner-bg"
                        value={data.banner?.background_image || ""}
                        onChange={(e) => updateBannerData("background_image", e.target.value)}
                        placeholder="URL da imagem de fundo"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="solutions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Soluções/Serviços
                      <Button onClick={addSolution} size="sm">
                        Adicionar Solução
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.solutions?.map((solution, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Solução {index + 1}</h4>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSolution(index)}
                          >
                            Remover
                          </Button>
                        </div>
                        
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={solution.title}
                            onChange={(e) => updateSolution(index, "title", e.target.value)}
                            placeholder="Título da solução"
                          />
                        </div>
                        
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            value={solution.description}
                            onChange={(e) => updateSolution(index, "description", e.target.value)}
                            placeholder="Descrição da solução"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {(!data.solutions || data.solutions.length === 0) && (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhuma solução adicionada. Clique em "Adicionar Solução" para começar.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faq" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Perguntas Frequentes
                      <Button onClick={addFAQ} size="sm">
                        Adicionar FAQ
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.faq?.map((faq, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">FAQ {index + 1}</h4>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFAQ(index)}
                          >
                            Remover
                          </Button>
                        </div>
                        
                        <div>
                          <Label>Pergunta</Label>
                          <Input
                            value={faq.question}
                            onChange={(e) => updateFAQ(index, "question", e.target.value)}
                            placeholder="Digite a pergunta"
                          />
                        </div>
                        
                        <div>
                          <Label>Resposta</Label>
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => updateFAQ(index, "answer", e.target.value)}
                            placeholder="Digite a resposta"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {(!data.faq || data.faq.length === 0) && (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhuma FAQ adicionada. Clique em "Adicionar FAQ" para começar.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações de SEO</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="seo-title">Título SEO</Label>
                      <Input
                        id="seo-title"
                        value={data.seo?.title || ""}
                        onChange={(e) => updateSEOData("title", e.target.value)}
                        placeholder="Título para motores de busca"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="seo-description">Meta Description</Label>
                      <Textarea
                        id="seo-description"
                        value={data.seo?.description || ""}
                        onChange={(e) => updateSEOData("description", e.target.value)}
                        placeholder="Descrição para motores de busca (máx. 160 caracteres)"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="seo-keywords">Keywords</Label>
                      <Input
                        id="seo-keywords"
                        value={data.seo?.keywords?.join(", ") || ""}
                        onChange={(e) => updateSEOData("keywords", e.target.value.split(",").map(k => k.trim()))}
                        placeholder="palavra1, palavra2, palavra3"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="contact-phone">Telefone</Label>
                      <Input
                        id="contact-phone"
                        value={data.contact?.phone || ""}
                        onChange={(e) => updateContactData("phone", e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contact-email">E-mail</Label>
                      <Input
                        id="contact-email"
                        value={data.contact?.email || ""}
                        onChange={(e) => updateContactData("email", e.target.value)}
                        placeholder="contato@exemplo.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contact-address">Endereço</Label>
                      <Textarea
                        id="contact-address"
                        value={data.contact?.address || ""}
                        onChange={(e) => updateContactData("address", e.target.value)}
                        placeholder="Endereço completo"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/blog-editor/${landingPageId}`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Editar Blog
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(`/preview/${landingPageId}`, '_blank')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </Button>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>ID:</strong> {landingPageId}
                </div>
                <div>
                  <strong>Template:</strong> {template}
                </div>
                <div>
                  <strong>Status:</strong> {status === 'approved' ? 'Aprovado' : 'Rascunho'}
                </div>
                <div>
                  <strong>Última modificação:</strong> {' '}
                  {landingPage.last_modified ? 
                    new Date(landingPage.last_modified).toLocaleDateString('pt-BR') : 
                    'Não informado'
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPageEditor;