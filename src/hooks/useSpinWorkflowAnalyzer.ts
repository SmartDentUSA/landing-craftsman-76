import { useMemo } from 'react';

interface WorkflowStage {
  applicable: boolean;
  role: 'principal' | 'acessorio' | 'consumivel' | null;
  description: string | null;
  pain_points_addressed: string[];
  competitive_advantages: string[];
  related_materials: string[];
}

interface Product {
  id: string;
  name: string;
  workflow_stages?: {
    scan?: WorkflowStage;
    design?: WorkflowStage;
    print?: WorkflowStage;
    process?: WorkflowStage;
    finish?: WorkflowStage;
    install?: WorkflowStage;
  };
}

interface WorkflowGap {
  stage: string;
  stageLabel: string;
  hasProducts: boolean;
  principalProducts: string[];
  acessorioProducts: string[];
  consumivelProducts: string[];
  allPainPoints: string[];
  allAdvantages: string[];
}

const STAGE_LABELS: Record<string, string> = {
  scan: 'Scanear',
  design: 'Desenhar',
  print: 'Imprimir',
  process: 'Processar',
  finish: 'Finalizar',
  install: 'Instalar'
};

export function useSpinWorkflowAnalyzer(products: Product[]) {
  const analysis = useMemo(() => {
    const stages = ['scan', 'design', 'print', 'process', 'finish', 'install'];
    const gaps: WorkflowGap[] = [];
    
    stages.forEach(stage => {
      const principalProducts: string[] = [];
      const acessorioProducts: string[] = [];
      const consumivelProducts: string[] = [];
      const allPainPoints: string[] = [];
      const allAdvantages: string[] = [];
      
      products.forEach(product => {
        const stageData = product.workflow_stages?.[stage as keyof typeof product.workflow_stages];
        
        if (stageData?.applicable) {
          // Categorize by role
          if (stageData.role === 'principal') {
            principalProducts.push(product.name);
          } else if (stageData.role === 'acessorio') {
            acessorioProducts.push(product.name);
          } else if (stageData.role === 'consumivel') {
            consumivelProducts.push(product.name);
          }
          
          // Collect pain points and advantages
          if (stageData.pain_points_addressed) {
            allPainPoints.push(...stageData.pain_points_addressed);
          }
          if (stageData.competitive_advantages) {
            allAdvantages.push(...stageData.competitive_advantages);
          }
        }
      });
      
      gaps.push({
        stage,
        stageLabel: STAGE_LABELS[stage],
        hasProducts: principalProducts.length > 0 || acessorioProducts.length > 0 || consumivelProducts.length > 0,
        principalProducts,
        acessorioProducts,
        consumivelProducts,
        allPainPoints: [...new Set(allPainPoints)],
        allAdvantages: [...new Set(allAdvantages)]
      });
    });
    
    return gaps;
  }, [products]);
  
  // Generate completion percentage
  const completionPercentage = useMemo(() => {
    const stagesWithProducts = analysis.filter(gap => gap.hasProducts).length;
    return Math.round((stagesWithProducts / 6) * 100);
  }, [analysis]);
  
  // Generate SPIN pitch suggestions
  const spinPitchSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    
    // Find missing stages
    const missingStages = analysis.filter(gap => !gap.hasProducts);
    if (missingStages.length > 0) {
      suggestions.push(
        `⚠️ **Gaps no Workflow:** Etapas sem cobertura: ${missingStages.map(g => g.stageLabel).join(', ')}`
      );
    }
    
    // Find stages with only accessories/consumables (no principal)
    const weakStages = analysis.filter(
      gap => gap.hasProducts && gap.principalProducts.length === 0
    );
    if (weakStages.length > 0) {
      suggestions.push(
        `💡 **Oportunidade:** Adicione produtos principais para: ${weakStages.map(g => g.stageLabel).join(', ')}`
      );
    }
    
    // Find strongest stages
    const strongStages = analysis
      .filter(gap => gap.principalProducts.length > 0)
      .sort((a, b) => b.allAdvantages.length - a.allAdvantages.length)
      .slice(0, 2);
    
    if (strongStages.length > 0) {
      suggestions.push(
        `✅ **Pontos Fortes:** ${strongStages.map(s => `${s.stageLabel} (${s.allAdvantages.length} vantagens)`).join(', ')}`
      );
    }
    
    return suggestions;
  }, [analysis]);
  
  // Generate workflow narrative for SPIN pitch
  const workflowNarrative = useMemo(() => {
    const narrativeParts: string[] = [];
    
    analysis.forEach(gap => {
      if (gap.hasProducts) {
        const products = [
          ...gap.principalProducts,
          ...gap.acessorioProducts,
          ...gap.consumivelProducts
        ];
        
        if (products.length > 0) {
          narrativeParts.push(
            `**${gap.stageLabel}**: ${products.join(', ')}`
          );
          
          if (gap.allPainPoints.length > 0) {
            narrativeParts.push(
              `  - Resolve: ${gap.allPainPoints.slice(0, 2).join(', ')}`
            );
          }
        }
      }
    });
    
    return narrativeParts.join('\n');
  }, [analysis]);
  
  return {
    workflowGaps: analysis,
    completionPercentage,
    spinPitchSuggestions,
    workflowNarrative,
    hasCompleteWorkflow: completionPercentage === 100,
    missingStages: analysis.filter(g => !g.hasProducts).map(g => g.stageLabel),
    strongestStages: analysis
      .filter(g => g.principalProducts.length > 0)
      .sort((a, b) => b.allAdvantages.length - a.allAdvantages.length)
      .slice(0, 3)
      .map(g => g.stageLabel)
  };
}
