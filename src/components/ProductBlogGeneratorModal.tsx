import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, Settings, Sparkles, Clock, Link, ExternalLink, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { IntelligentLinksManager } from "@/components/IntelligentLinksManager";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
  individual_blog_content?: {
    commercial?: string;
    technical?: string;
    generated_at?: string;
    commercial_links?: Record<string, string>;
    technical_links?: Record<string, string>;
  };
}

interface ProductBlogGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onBlogGenerated: () => void;
}

export const ProductBlogGeneratorModal = ({
  open,
  onOpenChange,
  product,
  onBlogGenerated
}: ProductBlogGeneratorModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'commercial' | 'technical'>('commercial');
  const [currentProduct, setCurrentProduct] = useState(product);
  const [isEditingCommercial, setIsEditingCommercial] = useState(false);
  const [isEditingTechnical, setIsEditingTechnical] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [useIntelligentLinks, setUseIntelligentLinks] = useState(true);
  const { toast } = useToast();

  // Sincronizar dados do produto quando props mudam
  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  const hasExistingBlog = (type: 'commercial' | 'technical') => {
    return currentProduct.individual_blog_content?.[type] != null;
  };

  const getIntelligentLinks = (type: 'commercial' | 'technical') => {
    const linksKey = type === 'commercial' ? 'commercial_links' : 'technical_links';
    return currentProduct.individual_blog_content?.[linksKey] || {};
  };

  const getLinksCount = (type: 'commercial' | 'technical') => {
    const links = getIntelligentLinks(type);
    return Object.keys(links).length;
  };

  const hasIntelligentLinks = (type: 'commercial' | 'technical') => {
    return getLinksCount(type) > 0;
  };

  const updateProductLinks = async (type: 'commercial' | 'technical', links: Record<string, string>) => {
    if (!currentProduct.id) return;

    try {
      const linksKey = type === 'commercial' ? 'commercial_links' : 'technical_links';
      const currentBlogContent = currentProduct.individual_blog_content?.[type] || '';
      
      // Aplicar links ao conteúdo atual usando a mesma lógica da edge function
      const contentWithLinks = applyLinksToContent(currentBlogContent, links);
      
      const updatedContent = {
        ...currentProduct.individual_blog_content,
        [type]: contentWithLinks,
        [linksKey]: links,
        _links_generated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({ individual_blog_content: updatedContent })
        .eq('id', currentProduct.id);

      if (error) throw error;

      // Atualizar estado local
      setCurrentProduct(prev => ({
        ...prev,
        individual_blog_content: updatedContent
      }));

      toast({
        title: "Links atualizados",
        description: `Links inteligentes do blog ${type} aplicados e salvos com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar links:', error);
      toast({
        title: "Erro ao salvar links",
        description: "Não foi possível salvar os links inteligentes.",
        variant: "destructive",
      });
    }
  };

  // Função para aplicar links ao conteúdo (mesma lógica da edge function)
  const applyLinksToContent = (content: string, links: Record<string, string>): string => {
    let processedContent = content;
    const linksApplied: string[] = [];
    
    // Aplicar links de forma controlada (máximo 2 links por parágrafo)
    const paragraphs = content.split('\n\n');
    
    paragraphs.forEach((paragraph, index) => {
      let linksInParagraph = 0;
      let processedParagraph = paragraph;
      
      // Ordenar keywords por tamanho (maior primeiro) para evitar sobreposições
      const sortedKeywords = Object.keys(links).sort((a, b) => b.length - a.length);
      
      sortedKeywords.forEach(keyword => {
        if (linksInParagraph >= 2) return; // Máximo 2 links por parágrafo
        if (linksApplied.includes(keyword)) return; // Não repetir mesmo link
        
        const url = links[keyword];
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
        
        if (regex.test(processedParagraph)) {
          processedParagraph = processedParagraph.replace(regex, (match) => {
            linksInParagraph++;
            linksApplied.push(keyword);
            return `[${match}](${url} "Saiba mais sobre ${match}")`;
          });
        }
      });
      
      paragraphs[index] = processedParagraph;
    });
    
    return paragraphs.join('\n\n');
  };

  const handleGenerateBlog = async () => {
    if (!currentProduct.id) return;

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-product-blog', {
        body: {
          productId: currentProduct.id,
          blogType: selectedType,
          useIntelligentLinks: useIntelligentLinks
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Buscar os dados atualizados do produto
      const { data: updatedProduct, error: fetchError } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', currentProduct.id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar produto atualizado:', fetchError);
      } else {
        // Mapear os dados para corresponder à interface Product
        const mappedProduct: Product = {
          id: updatedProduct.id,
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: updatedProduct.price,
          currency: updatedProduct.currency,
          category: updatedProduct.category,
          subcategory: updatedProduct.subcategory,
          keywords: Array.isArray(updatedProduct.keywords) ? 
            updatedProduct.keywords.filter((k): k is string => typeof k === 'string') : [],
          benefits: Array.isArray(updatedProduct.benefits) ? 
            updatedProduct.benefits.filter((b): b is string => typeof b === 'string') : [],
          features: Array.isArray(updatedProduct.features) ? 
            updatedProduct.features.filter((f): f is string => typeof f === 'string') : [],
          individual_blog_content: typeof updatedProduct.individual_blog_content === 'object' && 
            updatedProduct.individual_blog_content !== null ? 
            updatedProduct.individual_blog_content as any : undefined
        };
        setCurrentProduct(mappedProduct);
      }

      toast({
        title: "Blog gerado com sucesso!",
        description: `Blog ${selectedType} criado para ${currentProduct.name}. Conteúdo disponível para visualização.`,
      });

      // Notificar o componente pai para atualizar dados
      onBlogGenerated();
      
      // Modal permanece aberto para mostrar o conteúdo gerado
    } catch (error) {
      console.error('Erro ao gerar blog:', error);
      toast({
        title: "Erro ao gerar blog",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEdit = (type: 'commercial' | 'technical') => {
    const content = currentProduct.individual_blog_content?.[type] || '';
    setEditingContent(content);
    if (type === 'commercial') {
      setIsEditingCommercial(true);
    } else {
      setIsEditingTechnical(true);
    }
  };

  const handleCancelEdit = (type: 'commercial' | 'technical') => {
    setEditingContent('');
    if (type === 'commercial') {
      setIsEditingCommercial(false);
    } else {
      setIsEditingTechnical(false);
    }
  };

  const handleSaveEdit = async (type: 'commercial' | 'technical') => {
    if (!currentProduct.id) return;

    try {
      const updatedContent = {
        ...currentProduct.individual_blog_content,
        [type]: editingContent,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({ individual_blog_content: updatedContent })
        .eq('id', currentProduct.id);

      if (error) throw error;

      // Atualizar estado local
      setCurrentProduct(prev => ({
        ...prev,
        individual_blog_content: updatedContent
      }));

      // Sair do modo de edição
      handleCancelEdit(type);

      toast({
        title: "Conteúdo atualizado",
        description: `Blog ${type} editado e salvo com sucesso.`,
      });

      // Disparar evento global para notificar outras partes da aplicação
      window.dispatchEvent(new CustomEvent('productBlogUpdated', {
        detail: { productId: currentProduct.id, blogType: type }
      }));

      onBlogGenerated();
    } catch (error) {
      console.error('Erro ao salvar conteúdo editado:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const blogTypeConfig = {
    commercial: {
      title: "Blog Comercial",
      description: "Foco em vendas, benefícios e call-to-actions",
      color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      icon: <Sparkles className="h-4 w-4" />
    },
    technical: {
      title: "Blog Técnico", 
      description: "Foco em especificações, funcionamento e aplicações",
      color: "bg-blue-500/10 text-blue-700 border-blue-200",
      icon: <Settings className="h-4 w-4" />
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Blog IA - {currentProduct.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informação sobre configuração de dados */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                Os dados utilizados na geração são configurados na aba <strong>"Prompts IA"</strong>
              </div>
            </CardContent>
          </Card>

          {/* Tabs para Geração e Visualização */}
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as 'commercial' | 'technical')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="commercial" className="flex items-center gap-2">
                {blogTypeConfig.commercial.icon}
                Blog Comercial
                {hasExistingBlog('commercial') && <span className="text-xs">✓</span>}
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                {blogTypeConfig.technical.icon}
                Blog Técnico
                {hasExistingBlog('technical') && <span className="text-xs">✓</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="commercial" className="space-y-4">
              <div className="space-y-4">
                {/* Configuração do Blog */}
                <Card className={`w-full ${blogTypeConfig.commercial.color}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{blogTypeConfig.commercial.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{blogTypeConfig.commercial.description}</p>
                    <div className="text-xs mb-4">
                      <strong>Variáveis utilizadas:</strong> Nome, benefícios, keywords, CTAs, preço
                    </div>
                    
                    {/* Controle de Links Inteligentes */}
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md mb-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="intelligent-links" className="text-sm font-medium">
                          Usar Links Inteligentes
                        </Label>
                        <Switch
                          id="intelligent-links"
                          checked={useIntelligentLinks}
                          onCheckedChange={setUseIntelligentLinks}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {useIntelligentLinks ? 'Ativado' : 'Desativado'}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleGenerateBlog}
                      disabled={isGenerating}
                      className="w-full"
                      size="sm"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {hasExistingBlog('commercial') ? 'Regerar Blog' : 'Gerar Blog'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Conteúdo Gerado */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Conteúdo Gerado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasExistingBlog('commercial') ? (
                      <div className="space-y-3">
                        {isEditingCommercial ? (
                          <>
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="min-h-60 text-sm font-mono"
                              placeholder="Edite o conteúdo do blog comercial..."
                            />
                            <div className="flex gap-2 justify-between">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleSaveEdit('commercial')}
                                  disabled={!editingContent.trim()}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCancelEdit('commercial')}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center">
                                {editingContent.length} caracteres
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-muted/50 rounded-md max-h-60 overflow-y-auto">
                              <pre className="text-sm whitespace-pre-wrap font-sans">
                                {currentProduct.individual_blog_content?.commercial}
                              </pre>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(currentProduct.individual_blog_content?.commercial || '')}
                              >
                                Copiar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleStartEdit('commercial')}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <div className="text-xs text-muted-foreground flex items-center">
                                {currentProduct.individual_blog_content?.commercial?.length || 0} caracteres
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Clique em "Gerar Blog" para criar o conteúdo comercial</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gerenciador de Links Inteligentes */}
                <div className="w-full">
                  <IntelligentLinksManager
                    blogContent={currentProduct.individual_blog_content?.commercial || ''}
                    existingLinks={getIntelligentLinks('commercial')}
                    onLinksChange={(links) => updateProductLinks('commercial', links)}
                    blogType="commercial"
                    productName={currentProduct.name}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <div className="space-y-4">
                {/* Configuração do Blog */}
                <Card className={`w-full ${blogTypeConfig.technical.color}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{blogTypeConfig.technical.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{blogTypeConfig.technical.description}</p>
                    <div className="text-xs mb-4">
                      <strong>Variáveis utilizadas:</strong> Nome, características, especificações, categoria
                    </div>
                    
                    {/* Controle de Links Inteligentes */}
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md mb-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="intelligent-links-tech" className="text-sm font-medium">
                          Usar Links Inteligentes
                        </Label>
                        <Switch
                          id="intelligent-links-tech"
                          checked={useIntelligentLinks}
                          onCheckedChange={setUseIntelligentLinks}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {useIntelligentLinks ? 'Ativado' : 'Desativado'}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleGenerateBlog}
                      disabled={isGenerating}
                      className="w-full"
                      size="sm"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {hasExistingBlog('technical') ? 'Regerar Blog' : 'Gerar Blog'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Conteúdo Gerado */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Conteúdo Gerado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasExistingBlog('technical') ? (
                      <div className="space-y-3">
                        {isEditingTechnical ? (
                          <>
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="min-h-60 text-sm font-mono"
                              placeholder="Edite o conteúdo do blog técnico..."
                            />
                            <div className="flex gap-2 justify-between">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleSaveEdit('technical')}
                                  disabled={!editingContent.trim()}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCancelEdit('technical')}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center">
                                {editingContent.length} caracteres
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-muted/50 rounded-md max-h-60 overflow-y-auto">
                              <pre className="text-sm whitespace-pre-wrap font-sans">
                                {currentProduct.individual_blog_content?.technical}
                              </pre>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(currentProduct.individual_blog_content?.technical || '')}
                              >
                                Copiar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleStartEdit('technical')}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <div className="text-xs text-muted-foreground flex items-center">
                                {currentProduct.individual_blog_content?.technical?.length || 0} caracteres
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Clique em "Gerar Blog" para criar o conteúdo técnico</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gerenciador de Links Inteligentes */}
                <div className="w-full">
                  <IntelligentLinksManager
                    blogContent={currentProduct.individual_blog_content?.technical || ''}
                    existingLinks={getIntelligentLinks('technical')}
                    onLinksChange={(links) => updateProductLinks('technical', links)}
                    blogType="technical"
                    productName={currentProduct.name}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>


          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};