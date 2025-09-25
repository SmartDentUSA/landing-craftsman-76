import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Eye, Database, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EdgeFunction {
  id: string;
  name: string;
  description: string;
  prompts: string[];
  dataSources: string[];
  status: string;
}

interface PromptEditModalProps {
  edgeFunction: EdgeFunction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapeamento de fontes de dados disponíveis
const DATA_SOURCES = {
  products: {
    label: 'Produtos',
    fields: ['name', 'description', 'keywords', 'benefits', 'features', 'price', 'category', 'subcategory']
  },
  company_profile: {
    label: 'Perfil da Empresa',
    fields: ['company_name', 'company_description', 'mission_statement', 'vision_statement', 'brand_values', 'target_audience']
  },
  reviews: {
    label: 'Avaliações',
    fields: ['rating', 'review_text', 'author_name', 'review_date']
  },
  kols: {
    label: 'KOLs',
    fields: ['full_name', 'specialty', 'mini_cv', 'instagram_url', 'youtube_url']
  },
  testimonials: {
    label: 'Depoimentos',
    fields: ['client_name', 'testimonial_text', 'profession', 'location']
  },
  categories: {
    label: 'Categorias',
    fields: ['category', 'subcategory', 'keywords', 'target_audience']
  }
};

export const PromptEditModal: React.FC<PromptEditModalProps> = ({
  edgeFunction,
  open,
  onOpenChange
}) => {
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (edgeFunction) {
      // Inicializar com fontes de dados padrão
      const initialFields: Record<string, string[]> = {};
      edgeFunction.dataSources.forEach(source => {
        if (DATA_SOURCES[source as keyof typeof DATA_SOURCES]) {
          initialFields[source] = DATA_SOURCES[source as keyof typeof DATA_SOURCES].fields;
        }
      });
      setSelectedFields(initialFields);

      // Inicializar prompts customizados
      const initialPrompts: Record<string, string> = {};
      edgeFunction.prompts.forEach(prompt => {
        initialPrompts[prompt] = `Prompt personalizado para ${prompt}...`;
      });
      setCustomPrompts(initialPrompts);
    }
  }, [edgeFunction]);

  const handleFieldToggle = (dataSource: string, field: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [dataSource]: prev[dataSource]?.includes(field)
        ? prev[dataSource].filter(f => f !== field)
        : [...(prev[dataSource] || []), field]
    }));
  };

  const generatePreview = () => {
    if (!edgeFunction) return;
    
    let preview = `=== PREVIEW DO PROMPT ===\n\n`;
    preview += `Função: ${edgeFunction.name}\n\n`;
    
    Object.entries(selectedFields).forEach(([source, fields]) => {
      if (fields.length > 0) {
        preview += `${DATA_SOURCES[source as keyof typeof DATA_SOURCES]?.label}:\n`;
        fields.forEach(field => {
          preview += `- ${field}: [valor_do_campo]\n`;
        });
        preview += '\n';
      }
    });

    edgeFunction.prompts.forEach(prompt => {
      if (customPrompts[prompt]) {
        preview += `Prompt ${prompt}:\n${customPrompts[prompt]}\n\n`;
      }
    });

    setPreviewPrompt(preview);
    setTokenCount(Math.floor(preview.length / 4)); // Estimativa simples
  };

  const handleSave = () => {
    toast({
      title: "Configuração Salva",
      description: "As configurações do prompt foram salvas com sucesso.",
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    if (edgeFunction) {
      const initialFields: Record<string, string[]> = {};
      edgeFunction.dataSources.forEach(source => {
        if (DATA_SOURCES[source as keyof typeof DATA_SOURCES]) {
          initialFields[source] = DATA_SOURCES[source as keyof typeof DATA_SOURCES].fields;
        }
      });
      setSelectedFields(initialFields);
    }
  };

  if (!edgeFunction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Prompts - {edgeFunction.name}
          </DialogTitle>
          <DialogDescription>
            Configure os dados utilizados e personalize os prompts para esta função IA
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data-sources" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data-sources" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Fontes de Dados
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data-sources" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione quais campos de dados serão utilizados na geração de conteúdo para esta função.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  {edgeFunction.dataSources.map(source => {
                    const sourceData = DATA_SOURCES[source as keyof typeof DATA_SOURCES];
                    if (!sourceData) return null;

                    return (
                      <Card key={source}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{sourceData.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sourceData.fields.map(field => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${source}-${field}`}
                                  checked={selectedFields[source]?.includes(field) || false}
                                  onCheckedChange={() => handleFieldToggle(source, field)}
                                />
                                <Label 
                                  htmlFor={`${source}-${field}`} 
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {field}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prompts" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Personalize os prompts utilizados por esta função IA. Use variáveis como {'{dados_produto}'} para inserir dados dinâmicos.
                  </AlertDescription>
                </Alert>

                {edgeFunction.prompts.map(prompt => (
                  <Card key={prompt}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">{prompt.replace('_', ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={`Digite o prompt personalizado para ${prompt}...`}
                        value={customPrompts[prompt] || ''}
                        onChange={(e) => setCustomPrompts(prev => ({
                          ...prev,
                          [prompt]: e.target.value
                        }))}
                        className="min-h-[120px] resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-[500px] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Tokens estimados: {tokenCount}</Badge>
                  {tokenCount > 4000 && (
                    <Badge variant="destructive">Muito extenso</Badge>
                  )}
                </div>
                <Button onClick={generatePreview} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Gerar Preview
                </Button>
              </div>
              
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {previewPrompt || 'Clique em "Gerar Preview" para visualizar o prompt completo'}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};