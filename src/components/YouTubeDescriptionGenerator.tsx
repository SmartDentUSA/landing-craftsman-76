import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { PlayCircle, Copy, Edit, Save, X, Loader2, Plus, History, Settings, Code, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContentViewToggle } from '@/components/ui/content-view-toggle';
import { ProductVideosList } from '@/components/ProductVideosList';
import { ProductResourceCTAsList } from '@/components/ProductResourceCTAsList';
import { RelatedLandingPagesList } from '@/components/RelatedLandingPagesList';

interface YouTubeDescription {
  id: string;
  content: any;
  generated_at: string;
  editable: boolean;
}

interface YouTubeDescriptionGeneratorProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeDescriptionGenerator: React.FC<YouTubeDescriptionGeneratorProps> = ({
  productId,
  productName,
  isOpen,
  onClose,
}) => {
  const [descriptions, setDescriptions] = useState<YouTubeDescription[]>([]);
  const [currentDescription, setCurrentDescription] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [showCanvaConfig, setShowCanvaConfig] = useState(false);
  const [templateCanvaUrl, setTemplateCanvaUrl] = useState<string>('');
  const [editingTemplateUrl, setEditingTemplateUrl] = useState<string>('');
  const [companyTemplate, setCompanyTemplate] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'edit' | 'text' | 'html'>('edit');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadDescriptions();
      loadCompanyTemplate();
    }
  }, [isOpen, productId]);

  const loadDescriptions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('youtube_descriptions')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const youtubeData = data.youtube_descriptions as any;
      const descriptionsData = youtubeData?.descriptions || [];
      const templateUrl = youtubeData?.template_canva_url || '';
      setDescriptions(descriptionsData);
      setTemplateCanvaUrl(templateUrl);
      setEditingTemplateUrl(templateUrl);
      
      if (descriptionsData.length > 0) {
        setCurrentDescription(descriptionsData[0].content);
      }
    } catch (error) {
      console.error('Erro ao carregar descrições:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as descrições.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('company_profile')
        .select('youtube_company_footer')
        .limit(1)
        .single();

      if (error) throw error;

      const template = data.youtube_company_footer || '';
      setCompanyTemplate(template);
      setEditingTemplate(template);
    } catch (error) {
      console.error('Erro ao carregar template da empresa:', error);
    }
  };

  const generateNewDescription = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'youtube',
          productId: productId
        }
      });

      if (error) throw error;

      setCurrentDescription(data.content);
      await loadDescriptions(); // Recarrega para pegar a descrição salva

      toast({
        title: "Sucesso",
        description: "Nova descrição YouTube gerada!",
      });
    } catch (error) {
      console.error('Erro ao gerar descrição:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a descrição.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCompanyTemplate = async () => {
    try {
      const { error } = await supabase
        .from('company_profile')
        .update({ youtube_company_footer: editingTemplate })
        .eq('id', (await supabase.from('company_profile').select('id').limit(1).single()).data?.id);

      if (error) throw error;

      setCompanyTemplate(editingTemplate);
      setShowTemplateConfig(false);

      toast({
        title: "Salvo",
        description: "Template da empresa atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copiado!",
        description: "Descrição copiada para a área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar a descrição.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (description: YouTubeDescription) => {
    setEditingId(description.id);
    const content = typeof description.content === 'string' 
      ? description.content 
      : description.content?.description || '';
    setEditingContent(content);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      // Atualizar na lista local
      const updatedDescriptions = descriptions.map(desc => 
        desc.id === editingId 
          ? { 
              ...desc, 
              content: typeof desc.content === 'string' 
                ? editingContent 
                : { ...desc.content, description: editingContent }
            } 
          : desc
      );
      
      // Atualizar no banco
      const { error } = await supabase
        .from('products_repository')
        .update({ 
          youtube_descriptions: { 
            descriptions: updatedDescriptions, 
            last_generated: new Date().toISOString(),
            template_canva_url: templateCanvaUrl
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      setDescriptions(updatedDescriptions);
      
      // Se estamos editando a descrição atual
      if (editingId === descriptions[0]?.id) {
        setCurrentDescription(updatedDescriptions[0].content);
      }

      setEditingId(null);
      setEditingContent('');

      toast({
        title: "Salvo",
        description: "Descrição atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a edição.",
        variant: "destructive",
      });
    }
  };

  const saveTemplateUrl = async () => {
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({ 
          youtube_descriptions: { 
            descriptions: descriptions,
            last_generated: new Date().toISOString(),
            template_canva_url: editingTemplateUrl
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      setTemplateCanvaUrl(editingTemplateUrl);
      setShowCanvaConfig(false);

      toast({
        title: "Template Salvo",
        description: "URL do Template Canva atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template.",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const getCharacterCount = (text: string) => text.length;
  const isOverLimit = (text: string) => getCharacterCount(text) > 5000;

  const formatDescription = (content: any) => {
    if (typeof content === 'string') {
      // Converte \n literais em quebras de linha reais se necessário
      return content.replace(/\\n/g, '\n');
    }
    if (content?.description) {
      // Converte \n literais em quebras de linha reais se necessário
      return content.description.replace(/\\n/g, '\n');
    }
    return JSON.stringify(content, null, 2);
  };

  const getTitleSuggestion = (content: any) => {
    if (typeof content === 'object' && content?.title_suggestion) {
      return content.title_suggestion;
    }
    return null;
  };

  const getTags = (content: any) => {
    if (typeof content === 'object' && content?.tags) {
      return content.tags;
    }
    return [];
  };

  const generateHTMLVersion = (content: any) => {
    const formatted = formatDescription(content);
    const title = getTitleSuggestion(content);
    const tags = getTags(content);
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || productName} - YouTube</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f9f9f9;
    }
    .youtube-container {
      background: white;
      border-left: 4px solid #FF0000;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h2 {
      color: #FF0000;
      margin-top: 0;
    }
    .description {
      white-space: pre-wrap;
      line-height: 1.6;
      color: #030303;
    }
    .tags {
      margin-top: 20px;
    }
    .tag {
      display: inline-block;
      background: #065fd4;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      margin: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="youtube-container">
    ${title ? `<h2>${title}</h2>` : ''}
    <div class="description">${formatted}</div>
    ${tags.length > 0 ? `<div class="tags">${tags.map((tag: string) => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
  </div>
</body>
</html>`;
  };

  const copyHTMLVersion = async () => {
    try {
      const htmlContent = generateHTMLVersion(currentDescription);
      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML da descrição copiada.",
      });
    } catch (error) {
      console.error('Erro ao copiar HTML:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar a versão HTML.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-red-600" />
            Gerador de Descrições YouTube - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ações principais */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={generateNewDescription} 
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar Nova Descrição
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar' : 'Ver'} Histórico
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setShowTemplateConfig(!showTemplateConfig)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar Template
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setShowCanvaConfig(!showCanvaConfig)}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {templateCanvaUrl ? '✓ Template Canva' : 'Configurar Template Canva'}
            </Button>
          </div>

          {/* Configuração do Template Canva */}
          {showCanvaConfig && (
            <Card>
              <CardContent className="p-4">
                <label className="text-sm font-medium mb-2 block">
                  🎨 Template Canva (URL)
                </label>
                <Input
                  type="url"
                  value={editingTemplateUrl}
                  onChange={(e) => setEditingTemplateUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/..."
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground mb-3">
                  Este link será usado para todas as descrições YouTube deste produto
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveTemplateUrl}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCanvaConfig(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão Abrir Template Canva */}
          {templateCanvaUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(templateCanvaUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir Template Canva
            </Button>
          )}

          {/* Configuração do template da empresa */}
          {showTemplateConfig && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Template da Empresa (Rodapé YouTube)</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={editingTemplate}
                  onChange={(e) => setEditingTemplate(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Template das informações da empresa para YouTube..."
                />
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">
                    {getCharacterCount(editingTemplate)} caracteres
                  </Badge>
                  <div className="flex gap-2">
                    <Button onClick={saveCompanyTemplate}>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar Template
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingTemplate(companyTemplate);
                        setShowTemplateConfig(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Descrição atual */}
          {currentDescription && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">Descrição Atual</h3>
                  <div className="flex items-center gap-2">
                    <ContentViewToggle mode={viewMode} onModeChange={setViewMode} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(formatDescription(currentDescription))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar Texto</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyHTMLVersion}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar HTML</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Modo Editar - Visualização completa */}
                {viewMode === 'edit' && (
                  <>
                    {/* Sugestão de título */}
                    {getTitleSuggestion(currentDescription) && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2">Sugestão de Título:</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm font-medium">{getTitleSuggestion(currentDescription)}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Descrição */}
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-2">Descrição:</h4>
                      <Textarea
                        value={formatDescription(currentDescription)}
                        onChange={(e) => {
                          if (typeof currentDescription === 'object') {
                            setCurrentDescription({ ...currentDescription, description: e.target.value });
                          } else {
                            setCurrentDescription(e.target.value);
                          }
                        }}
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>

                    {/* Tags */}
                    {getTags(currentDescription).length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2">Tags Sugeridas:</h4>
                        <div className="flex flex-wrap gap-2">
                          {getTags(currentDescription).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Biblioteca de Recursos */}
                    <ProductResourceCTAsList
                      productId={productId}
                      onInsert={(text) => {
                        navigator.clipboard.writeText(text);
                        toast({ title: "Link CTA copiado!" });
                      }}
                    />
                    <RelatedLandingPagesList
                      productId={productId}
                      onInsert={(text) => {
                        navigator.clipboard.writeText(text);
                        toast({ title: "Link da Landing Page copiado!" });
                      }}
                    />
                  </>
                )}

                {/* Modo Texto - Somente leitura */}
                {viewMode === 'text' && (
                  <>
                    {getTitleSuggestion(currentDescription) && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2">Título:</h4>
                        <div className="rounded-md border border-input bg-muted px-3 py-2">
                          <p className="text-sm font-medium">{getTitleSuggestion(currentDescription)}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h4 className="font-medium text-sm mb-2">Descrição:</h4>
                      <div className="rounded-md border border-input bg-muted px-3 py-2">
                        <div className="whitespace-pre-wrap font-mono text-sm">
                          {formatDescription(currentDescription)}
                        </div>
                      </div>
                    </div>

                    {getTags(currentDescription).length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2">Tags:</h4>
                        <div className="flex flex-wrap gap-2">
                          {getTags(currentDescription).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Modo HTML - Preview estilizado */}
                {viewMode === 'html' && (
                  <div className="min-h-[400px] rounded-md border border-input bg-background p-4">
                    <div className="max-w-[800px] mx-auto">
                      <div className="bg-white border-l-4 border-[#FF0000] p-5 rounded-lg shadow-sm">
                        {getTitleSuggestion(currentDescription) && (
                          <h2 className="text-[#FF0000] text-xl font-bold mb-4">
                            {getTitleSuggestion(currentDescription)}
                          </h2>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed text-sm text-gray-900 mb-4">
                          {formatDescription(currentDescription)}
                        </div>
                        {getTags(currentDescription).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {getTags(currentDescription).map((tag: string, index: number) => (
                              <span key={index} className="inline-block bg-[#065fd4] text-white px-3 py-1 rounded-full text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4">
                  <Badge variant={isOverLimit(formatDescription(currentDescription)) ? "destructive" : "secondary"}>
                    {getCharacterCount(formatDescription(currentDescription))}/5000 caracteres
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de descrições */}
          {showHistory && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Histórico de Descrições</h3>
                
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : descriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma descrição gerada ainda.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {descriptions.map((description, index) => (
                      <div key={description.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              Descrição {index + 1}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(description.generated_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          
                          <div className="flex gap-1">
                            {editingId === description.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={saveEdit}
                                  disabled={isOverLimit(editingContent)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => startEditing(description)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyToClipboard(formatDescription(description.content))}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar Texto</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const htmlContent = generateHTMLVersion(description.content);
                                        navigator.clipboard.writeText(htmlContent);
                                        toast({
                                          title: "HTML Copiado!",
                                          description: "Versão HTML da descrição copiada.",
                                        });
                                      }}
                                    >
                                      <Code className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar HTML</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>

                        {editingId === description.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="min-h-[300px] font-mono text-sm"
                              placeholder="Edite a descrição..."
                            />
                            <Badge variant={isOverLimit(editingContent) ? "destructive" : "secondary"}>
                              {getCharacterCount(editingContent)}/5000 caracteres
                            </Badge>
                            <ProductVideosList 
                              productId={productId}
                              onInsert={(text) => setEditingContent(prev => prev + text)}
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Título sugerido */}
                            {getTitleSuggestion(description.content) && (
                              <div>
                                <h5 className="font-medium text-xs mb-1">Título Sugerido:</h5>
                                <div className="bg-blue-50 border border-blue-100 rounded p-2">
                                  <p className="text-xs">{getTitleSuggestion(description.content)}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Descrição */}
                            <div>
                              <h5 className="font-medium text-xs mb-1">Descrição:</h5>
                              <div className="bg-gray-50 border rounded p-3">
                                <div className="whitespace-pre-wrap font-mono text-xs">
                                  {formatDescription(description.content)}
                                </div>
                              </div>
                            </div>

                            {/* Tags */}
                            {getTags(description.content).length > 0 && (
                              <div>
                                <h5 className="font-medium text-xs mb-1">Tags:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {getTags(description.content).map((tag: string, tagIndex: number) => (
                                    <Badge key={tagIndex} variant="outline" className="text-xs">
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <Badge variant={isOverLimit(formatDescription(description.content)) ? "destructive" : "secondary"}>
                              {getCharacterCount(formatDescription(description.content))}/5000 caracteres
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};