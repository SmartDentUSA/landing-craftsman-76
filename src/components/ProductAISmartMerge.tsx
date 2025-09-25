import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Shield, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductAISmartMergeProps {
  productId: string;
  currentData: {
    keywords: string[];
    benefits: string[];
    features: string[];
    ai_generated_keywords: boolean;
    ai_generated_benefits: boolean;
  };
  onDataUpdated: (updatedData: any) => void;
}

export function ProductAISmartMerge({ productId, currentData, onDataUpdated }: ProductAISmartMergeProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'complement' | 'regenerate' | null>(null);
  const { toast } = useToast();

  const handleGenerateAI = async (type: 'complement' | 'regenerate') => {
    setIsGenerating(true);
    setGenerationType(type);

    try {
      const { data, error } = await supabase.functions.invoke('generate-product-ai-content', {
        body: { 
          productId,
          forceRegenerate: type === 'regenerate',
          complementOnly: type === 'complement'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: type === 'complement' 
            ? "Dados complementados com IA (preservando dados manuais)"
            : "Dados regenerados pela IA",
        });
        
        // Refresh product data
        const { data: updatedProduct, error: fetchError } = await supabase
          .from('products_repository')
          .select('*')
          .eq('id', productId)
          .single();

        if (!fetchError && updatedProduct) {
          onDataUpdated(updatedProduct);
        }
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar conteúdo com IA",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const getDataOriginStats = () => {
    const manualKeywords = currentData.keywords.filter((_, i) => i < (currentData.keywords.length - (currentData.ai_generated_keywords ? 3 : 0)));
    const aiKeywords = currentData.ai_generated_keywords ? currentData.keywords.slice(-3) : [];
    
    const manualBenefits = currentData.benefits.filter((_, i) => i < (currentData.benefits.length - (currentData.ai_generated_benefits ? 3 : 0)));
    const aiBenefits = currentData.ai_generated_benefits ? currentData.benefits.slice(-3) : [];

    return {
      manual: {
        keywords: manualKeywords.length,
        benefits: manualBenefits.length,
        features: currentData.features.length
      },
      ai: {
        keywords: aiKeywords.length,
        benefits: aiBenefits.length,
        features: 0 // Features don't have AI tracking yet
      }
    };
  };

  const stats = getDataOriginStats();

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Sistema de Merge Inteligente IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Origin Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Dados Manuais</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Keywords: {stats.manual.keywords}</div>
              <div>Benefícios: {stats.manual.benefits}</div>
              <div>Características: {stats.manual.features}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Dados IA</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Keywords: {stats.ai.keywords}</div>
              <div>Benefícios: {stats.ai.benefits}</div>
              <div>Características: {stats.ai.features}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={() => handleGenerateAI('complement')}
            disabled={isGenerating}
            variant="outline"
            className="w-full justify-start"
          >
            {isGenerating && generationType === 'complement' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Complementar com IA (+3 itens por campo)
          </Button>
          
          <Button
            onClick={() => handleGenerateAI('regenerate')}
            disabled={isGenerating}
            variant="outline"
            className="w-full justify-start"
          >
            {isGenerating && generationType === 'regenerate' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerar Dados IA (sobrescrever)
          </Button>
        </div>

        {/* Protection Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="text-xs text-green-800">
              <div className="font-medium">Proteção de Dados Manuais</div>
              <div>Dados inseridos manualmente são sempre preservados. A IA adiciona apenas conteúdo complementar.</div>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {currentData.ai_generated_keywords && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Keywords IA
            </Badge>
          )}
          {currentData.ai_generated_benefits && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Benefícios IA
            </Badge>
          )}
          {stats.manual.keywords > 0 && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Manual
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}