import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import useLandingPages from '@/hooks/useLandingPages';

export interface DataQualityScore {
  landingPageId: string;
  overallScore: number;
  details: {
    hasTitle: boolean;
    hasSubtitle: boolean;
    hasProducts: boolean;
    hasFAQ: boolean;
    hasKeywords: boolean;
    productQuality: number;
  };
  recommendations: string[];
  canAutoGenerate: boolean;
}

export interface AutoGenerationStatus {
  analyzing: boolean;
  generating: boolean;
  error: string | null;
  lastAnalysis: DataQualityScore[];
  autoGenerationResults: any[];
}

export const useIntelligentGeneration = () => {
  const [status, setStatus] = useState<AutoGenerationStatus>({
    analyzing: false,
    generating: false,
    error: null,
    lastAnalysis: [],
    autoGenerationResults: []
  });

  const { toast } = useToast();
  const landingPages = useLandingPages((state) => state.landingPages);

  // Memoize approved landing pages that can benefit from auto-generation
  const eligibleLandingPages = useMemo(() => {
    return landingPages.filter(lp => 
      lp.status === 'approved' && 
      (!lp.blogGenerated || !(lp as any).seo?.keywords?.length)
    );
  }, [landingPages]);

  // Auto-analyze when eligible pages change
  useEffect(() => {
    if (eligibleLandingPages.length > 0) {
      analyzeDataQuality();
    }
  }, [eligibleLandingPages.length]);

  const analyzeDataQuality = useCallback(async (landingPageId?: string) => {
    setStatus(prev => ({ ...prev, analyzing: true, error: null }));

    try {
      console.log('🔍 Analyzing data quality for auto-generation...');

      const { data, error } = await supabase.functions.invoke('auto-generate-ai-content', {
        body: {
          action: 'analyze',
          landingPageId
        }
      });

      if (error) throw error;

      if (data?.success) {
        const analysis = data.analysis as DataQualityScore[];
        setStatus(prev => ({ 
          ...prev, 
          lastAnalysis: analysis,
          analyzing: false 
        }));

        console.log('📊 Quality analysis completed:', {
          totalPages: analysis.length,
          highQuality: analysis.filter(a => a.overallScore >= 80).length,
          canAutoGenerate: analysis.filter(a => a.canAutoGenerate).length
        });

        return analysis;
      }
    } catch (err: any) {
      console.error('❌ Error analyzing data quality:', err);
      setStatus(prev => ({ 
        ...prev, 
        analyzing: false, 
        error: err.message 
      }));
      
      toast({
        title: "Erro na Análise",
        description: "Não foi possível analisar a qualidade dos dados",
        variant: "destructive"
      });
    }
  }, [toast]);

  const generateMissingContent = useCallback(async (landingPageId?: string) => {
    setStatus(prev => ({ ...prev, generating: true, error: null }));

    try {
      console.log('🤖 Auto-generating missing content...');

      const { data, error } = await supabase.functions.invoke('auto-generate-ai-content', {
        body: {
          action: 'generate_missing',
          landingPageId
        }
      });

      if (error) throw error;

      if (data?.success) {
        const results = data.generated;
        setStatus(prev => ({ 
          ...prev, 
          autoGenerationResults: results,
          generating: false 
        }));

        // Count what was generated
        const summary = results.reduce((acc: any, result: any) => {
          if (result.generated.keywords) acc.keywords++;
          if (result.generated.productFeatures) acc.productFeatures++;
          if (result.generated.productBenefits) acc.productBenefits++;
          if (result.generated.blogPreview) acc.blogPreviews++;
          return acc;
        }, { keywords: 0, productFeatures: 0, productBenefits: 0, blogPreviews: 0 });

        toast({
          title: "Conteúdo IA Gerado!",
          description: `Gerados: ${summary.keywords} keywords, ${summary.productFeatures} características, ${summary.productBenefits} benefícios, ${summary.blogPreviews} previews`,
        });

        // Re-analyze after generation
        setTimeout(() => analyzeDataQuality(), 1000);

        return results;
      }
    } catch (err: any) {
      console.error('❌ Error generating missing content:', err);
      setStatus(prev => ({ 
        ...prev, 
        generating: false, 
        error: err.message 
      }));
      
      toast({
        title: "Erro na Geração",
        description: "Não foi possível gerar o conteúdo automaticamente",
        variant: "destructive"
      });
    }
  }, [toast, analyzeDataQuality]);

  const performQualityCheck = useCallback(async (productIds?: string[]) => {
    try {
      console.log('🔍 Performing quality check on products...');

      const { data, error } = await supabase.functions.invoke('auto-generate-ai-content', {
        body: {
          action: 'quality_check',
          productIds
        }
      });

      if (error) throw error;

      if (data?.success) {
        const qualityCheck = data.qualityCheck;
        
        toast({
          title: "Verificação Concluída",
          description: `${qualityCheck.filter((p: any) => p.needsAI).length} produtos precisam de IA`,
        });

        return qualityCheck;
      }
    } catch (err: any) {
      console.error('❌ Error performing quality check:', err);
      toast({
        title: "Erro na Verificação",
        description: "Não foi possível verificar a qualidade dos produtos",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Get summary statistics
  const summary = useMemo(() => {
    const analysis = status.lastAnalysis;
    if (analysis.length === 0) return null;

    return {
      totalPages: analysis.length,
      highQuality: analysis.filter(a => a.overallScore >= 80).length,
      needsImprovement: analysis.filter(a => a.overallScore < 60).length,
      canAutoGenerate: analysis.filter(a => a.canAutoGenerate).length,
      averageScore: Math.round(analysis.reduce((sum, a) => sum + a.overallScore, 0) / analysis.length),
      mostCommonIssues: getMostCommonIssues(analysis)
    };
  }, [status.lastAnalysis]);

  const clearError = useCallback(() => {
    setStatus(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setStatus({
      analyzing: false,
      generating: false,
      error: null,
      lastAnalysis: [],
      autoGenerationResults: []
    });
  }, []);

  return {
    ...status,
    eligibleLandingPages,
    summary,
    analyzeDataQuality,
    generateMissingContent,
    performQualityCheck,
    clearError,
    reset,
  };
};

function getMostCommonIssues(analysis: DataQualityScore[]): string[] {
  const issueCount: { [key: string]: number } = {};
  
  analysis.forEach(item => {
    item.recommendations.forEach(rec => {
      issueCount[rec] = (issueCount[rec] || 0) + 1;
    });
  });

  return Object.entries(issueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue);
}