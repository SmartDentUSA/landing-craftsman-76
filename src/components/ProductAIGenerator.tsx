import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

interface AIGenerationResult {
  productId: string;
  productName: string;
  success: boolean;
  generated?: {
    benefits: number;
    keywords: number;
    features: number;
  };
  message?: string;
  error?: string;
}

export function ProductAIGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<AIGenerationResult[]>([]);

  const generateAIContent = async (generateAll: boolean = false) => {
    setIsGenerating(true);
    setResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-ai-content', {
        body: { generateAll }
      });

      if (error) throw error;

      setResults(data.results || []);
      
      const successCount = data.results?.filter((r: AIGenerationResult) => r.success).length || 0;
      toast.success(`Conteúdo IA gerado com sucesso! ${successCount} produtos processados.`);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Erro na geração IA: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Geração de Conteúdo IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => generateAIContent(true)} 
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {isGenerating ? 'Gerando...' : 'Gerar IA para Todos'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Gera automaticamente benefícios, palavras-chave e características para produtos que ainda não possuem conteúdo IA.
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {results.length} produtos processados
              </Badge>
              <Badge variant="secondary">
                {results.filter(r => r.success).length} sucessos
              </Badge>
              {results.filter(r => !r.success).length > 0 && (
                <Badge variant="destructive">
                  {results.filter(r => !r.success).length} erros
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Resultados da Geração:</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="text-xs p-2 border rounded">
                    <div className="font-medium">{result.productName}</div>
                    {result.success ? (
                      <div className="text-green-600">
                        ✓ {result.generated ? (
                          `Benefícios: ${result.generated.benefits}, Keywords: ${result.generated.keywords}, Features: ${result.generated.features}`
                        ) : (
                          result.message || 'Processado com sucesso'
                        )}
                      </div>
                    ) : (
                      <div className="text-red-600">✗ {result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}