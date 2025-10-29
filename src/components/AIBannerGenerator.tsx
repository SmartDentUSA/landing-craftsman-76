import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIBannerGeneratorProps {
  solutionId?: string;
  productIds: string[];
  existingImage?: any;
  onGenerationComplete: (data: any) => void;
}

// Helper to extract detailed error messages from edge function responses
const extractEdgeError = (error: any, data?: any): string => {
  // Check if there's a detailed error in the response data
  if (data?.error) return data.error;
  
  // Check error context from Supabase invoke
  const ctx = error?.context;
  if (ctx?.response?.error) return ctx.response.error;
  if (ctx?.response_text) return ctx.response_text;
  
  // Try to stringify the response if available
  if (ctx?.response) {
    try {
      return JSON.stringify(ctx.response);
    } catch {}
  }
  
  // Fallback to error message
  return error?.message || 'Erro desconhecido';
};

export function AIBannerGenerator({ 
  solutionId, 
  productIds, 
  existingImage,
  onGenerationComplete 
}: AIBannerGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(existingImage?.src || null);
  const [generationDetails, setGenerationDetails] = useState<any>(existingImage || null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!solutionId) {
      toast({
        title: "Salve primeiro!",
        description: "Salve a solução antes de gerar o banner",
        variant: "destructive"
      });
      return;
    }

    if (!productIds || productIds.length === 0) {
      toast({
        title: "Selecione produtos",
        description: "Adicione pelo menos 1 produto para gerar o banner",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spin-hero-banner', {
        body: {
          solutionId,
          productIds,
          aspectRatio: '16:9',
          quality: 'high'
        }
      });

      if (error) throw error;

      setGeneratedImage(data.imageBase64);
      setGenerationDetails(data.details);
      
      onGenerationComplete({
        src: data.imageBase64,
        generated_at: new Date().toISOString(),
        prompt_used: data.prompt,
        model: data.model,
        products_used: productIds
      });

      toast({
        title: "✅ Banner gerado!",
        description: `Imagem criada com ${productIds.length} produto(s)`,
      });

    } catch (error: any) {
      console.error('Erro ao gerar banner:', error);
      
      const detailedError = extractEdgeError(error, null);
      
      toast({
        title: "Erro na geração",
        description: detailedError,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {!generatedImage ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-10 w-10 text-primary mb-3" />
            <p className="text-sm font-medium mb-2">Banner não gerado ainda</p>
            <p className="text-xs text-muted-foreground text-center mb-4 max-w-md">
              A IA criará um ambiente clínico realista com os produtos selecionados,
              respeitando suas dimensões físicas reais (altura, largura, profundidade)
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !solutionId || productIds.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Banner com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <img
                src={generatedImage}
                alt="Banner hero gerado por IA"
                className="w-full h-auto rounded-lg"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
              
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regerar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generatedImage, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {generationDetails && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs font-medium mb-2">Detalhes da Geração:</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>🤖 Modelo: {generationDetails.model || 'google/gemini-2.5-flash-image-preview'}</p>
                  <p>📦 Produtos: {generationDetails.products_count || productIds.length}</p>
                  <p>⏱️ Tempo: {generationDetails.generation_time}ms</p>
                  {generationDetails.prompt_summary && (
                    <p className="mt-2 font-mono text-[10px] bg-background p-2 rounded">
                      {generationDetails.prompt_summary}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
