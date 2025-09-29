import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2, CheckCircle, AlertCircle, History, Video } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface GenerationResult {
  productId: string;
  productName: string;
  success: boolean;
  type: 'whatsapp' | 'youtube' | 'instagram' | 'tiktok' | 'blog' | 'google-ads';
  generated?: {
    content?: string;
    count?: number;
  };
  message?: string;
  error?: string;
}

interface GenerationProgress {
  total: number;
  completed: number;
  current: string;
  results: GenerationResult[];
}

export function ProductAICompleteGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    current: '',
    results: []
  });

  const contentTypes = [
    { id: 'whatsapp', name: 'WhatsApp Messages', icon: '💬' },
    { id: 'youtube', name: 'YouTube Descriptions', icon: '🎥' },
    { id: 'instagram', name: 'Instagram Copy', icon: '📸' },
    { id: 'tiktok', name: 'TikTok Content', icon: <Video className="w-4 h-4" /> },
    { id: 'blog', name: 'Blog Posts', icon: '📝' },
    { id: 'google-ads', name: 'Google Ads', icon: '📢' }
  ];

  const generateAllContent = async () => {
    setIsGenerating(true);
    
    try {
      // Buscar produtos do repositório
      const { data: products, error: productsError } = await supabase
        .from('products_repository')
        .select('id, name')
        .eq('approved', true)
        .limit(50); // Limite para evitar sobrecarga

      if (productsError) throw productsError;
      if (!products || products.length === 0) {
        toast.error('Nenhum produto encontrado no repositório.');
        return;
      }

      const totalOperations = products.length * contentTypes.length;
      setProgress({
        total: totalOperations,
        completed: 0,
        current: 'Iniciando geração...',
        results: []
      });

      const results: GenerationResult[] = [];
      let completed = 0;

      // Gerar conteúdo para cada produto
      for (const product of products) {
        for (const contentType of contentTypes) {
          try {
            setProgress(prev => ({
              ...prev,
              current: `Gerando ${contentType.name} para ${product.name}`,
              completed
            }));

            await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa para UX

            const result = await generateContentForProduct(product.id, contentType.id as any, product.name);
            results.push(result);
            
            completed++;
            setProgress(prev => ({
              ...prev,
              completed,
              results: [...results]
            }));

            // Pausa entre gerações para evitar rate limit
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            console.error(`Erro ao gerar ${contentType.name} para ${product.name}:`, error);
            results.push({
              productId: product.id,
              productName: product.name,
              type: contentType.id as any,
              success: false,
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
            completed++;
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      toast.success(`Geração completa! ${successCount} sucessos, ${errorCount} erros.`);

    } catch (error) {
      console.error('Erro na geração completa:', error);
      toast.error('Erro na geração: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateContentForProduct = async (
    productId: string, 
    contentType: 'whatsapp' | 'youtube' | 'instagram' | 'tiktok' | 'blog' | 'google-ads',
    productName: string
  ): Promise<GenerationResult> => {
    try {
      let response;
      let generatedContent;

      // Detectar conteúdo existente para anti-duplicação
      const { data: existingProduct } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', productId)
        .single();

      switch (contentType) {
        case 'whatsapp':
        case 'youtube':
        case 'instagram':
          response = await supabase.functions.invoke('generate-social-content', {
            body: {
              type: contentType,
              productId: productId,
              // Anti-duplicação: verificar se já existe conteúdo
              antiDuplication: true
            }
          });
          break;

        case 'tiktok':
          response = await supabase.functions.invoke('generate-tiktok-content', {
            body: {
              productId: productId,
              // Anti-duplicação: verificar conteúdo anterior
              checkExisting: true
            }
          });
          break;

        case 'blog':
          // Gerar ambos os tipos de blog
          const commercialResponse = await supabase.functions.invoke('generate-product-blog', {
            body: {
              productId: productId,
              blogType: 'commercial',
              useIntelligentLinks: true
            }
          });
          
          if (commercialResponse.error) throw commercialResponse.error;
          
          await new Promise(resolve => setTimeout(resolve, 300)); // Pausa entre blogs
          
          const technicalResponse = await supabase.functions.invoke('generate-product-blog', {
            body: {
              productId: productId,
              blogType: 'technical',
              useIntelligentLinks: true
            }
          });
          
          response = technicalResponse;
          break;

        case 'google-ads':
          // Para Google Ads, usar dados básicos do produto
          if (existingProduct) {
            response = await supabase.functions.invoke('generate-ad-copies', {
              body: {
                seoTitle: existingProduct.name,
                seoDescription: existingProduct.description || existingProduct.name,
                primaryKeyword: existingProduct.name,
                targetAudience: 'profissionais da área'
              }
            });
          } else {
            throw new Error('Produto não encontrado');
          }
          break;

        default:
          throw new Error(`Tipo de conteúdo não suportado: ${contentType}`);
      }

      if (response?.error) {
        throw new Error(response.error.message || response.error);
      }

      return {
        productId,
        productName,
        type: contentType,
        success: true,
        generated: {
          content: response?.data?.content || 'Conteúdo gerado',
          count: 1
        }
      };

    } catch (error) {
      return {
        productId,
        productName,
        type: contentType,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const getResultsByType = (type: string) => {
    return progress.results.filter(r => r.type === type);
  };

  const getSuccessRate = (type: string) => {
    const results = getResultsByType(type);
    if (results.length === 0) return 0;
    return (results.filter(r => r.success).length / results.length) * 100;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Geração Completa de Conteúdo IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controles principais */}
        <div className="flex gap-4">
          <Button 
            onClick={generateAllContent} 
            disabled={isGenerating}
            className="flex items-center gap-2"
            size="lg"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {isGenerating ? 'Gerando...' : 'Gerar Todo Conteúdo'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Gera automaticamente WhatsApp, YouTube, Instagram, TikTok, Blogs e Google Ads para todos os produtos aprovados.
          <br />
          <strong>Anti-duplicação:</strong> Detecta conteúdo anterior e gera versões diferentes.
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progresso:</span>
              <Badge variant="outline">
                {progress.completed}/{progress.total}
              </Badge>
            </div>
            <Progress value={(progress.completed / progress.total) * 100} />
            <div className="text-sm text-muted-foreground">
              {progress.current}
            </div>
          </div>
        )}

        {/* Resultados por tipo */}
        {progress.results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="font-medium">Resultados da Geração</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {contentTypes.map(type => {
                const results = getResultsByType(type.id);
                const successRate = getSuccessRate(type.id);
                const hasResults = results.length > 0;

                return (
                  <Card key={type.id} className={`p-3 ${hasResults ? 'border-primary/20' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg flex items-center justify-center">{type.icon}</span>
                      <span className="text-sm font-medium">{type.name}</span>
                    </div>
                    
                    {hasResults ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Sucessos: {results.filter(r => r.success).length}</span>
                          <span>Erros: {results.filter(r => !r.success).length}</span>
                        </div>
                        <Progress value={successRate} className="h-1" />
                        <div className="text-xs text-muted-foreground">
                          {successRate.toFixed(0)}% sucesso
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Aguardando...
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Detalhes dos resultados */}
            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger>Ver Detalhes dos Resultados</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {contentTypes.map(type => {
                      const results = getResultsByType(type.id);
                      if (results.length === 0) return null;

                      return (
                        <div key={type.id}>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center">{type.icon}</span>
                            {type.name}
                          </h4>
                          <div className="space-y-1 ml-4">
                            {results.map((result, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                {result.success ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                                  {result.productName}
                                </span>
                                {result.error && (
                                  <span className="text-xs text-muted-foreground">
                                    - {result.error}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}