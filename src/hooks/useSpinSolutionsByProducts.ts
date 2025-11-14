import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpinSellingSolution } from './useSpinSellingSolutions';

interface WorkflowEnrichedSolution extends SpinSellingSolution {
  workflow_analysis?: {
    coverage_percentage: number;
    covered_stages: string[];
    missing_stages: string[];
    strongest_stage: string | null;
  };
}

export function useSpinSolutionsByProducts(productIds: string[]) {
  return useQuery({
    queryKey: ['spin-solutions-by-products', productIds],
    queryFn: async () => {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      // Buscar soluções SPIN que contenham qualquer um dos produtos selecionados
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      
      // Buscar dados de workflow dos produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products_repository')
        .select('id, name, workflow_stages')
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      // Filtrar soluções que contêm pelo menos um dos produtos
      const filtered = (data || []).filter((solution: any) => {
        const spinProductIds = solution.product_ids || [];
        return spinProductIds.some((id: string) => productIds.includes(id));
      });
      
      // Enriquecer com análise de workflow
      const enriched: WorkflowEnrichedSolution[] = filtered.map((solution: any) => {
        const solutionProducts = productsData?.filter(p => 
          solution.product_ids?.includes(p.id)
        ) || [];
        
        const analysis = analyzeWorkflowCoverage(solutionProducts);
        
        return {
          ...solution,
          workflow_analysis: analysis
        };
      });
      
      console.log('🎯 [useSpinSolutionsByProducts] Soluções SPIN com análise de workflow:', {
        productIds,
        totalSolutions: data?.length || 0,
        filteredSolutions: enriched.length,
        solutions: enriched.map(s => ({ 
          id: s.id, 
          title: s.title,
          workflow_coverage: s.workflow_analysis?.coverage_percentage
        }))
      });
      
      return enriched;
    },
    enabled: productIds && productIds.length > 0,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}

function analyzeWorkflowCoverage(products: any[]): {
  coverage_percentage: number;
  covered_stages: string[];
  missing_stages: string[];
  strongest_stage: string | null;
} {
  const stages = ['scan', 'design', 'print', 'process', 'finish', 'install'];
  const stageLabels: Record<string, string> = {
    scan: 'Scanear',
    design: 'Desenhar',
    print: 'Imprimir',
    process: 'Processar',
    finish: 'Finalizar',
    install: 'Instalar'
  };
  
  const covered: string[] = [];
  const stageCoverage: Record<string, number> = {};
  
  stages.forEach(stage => {
    const hasProduct = products.some(p => 
      p.workflow_stages?.[stage]?.applicable === true
    );
    
    if (hasProduct) {
      covered.push(stageLabels[stage]);
      
      // Count advantages for each stage
      const advantages = products
        .filter(p => p.workflow_stages?.[stage]?.applicable)
        .flatMap(p => p.workflow_stages?.[stage]?.competitive_advantages || []);
      
      stageCoverage[stage] = advantages.length;
    }
  });
  
  const missing = stages
    .filter(s => !covered.includes(stageLabels[s]))
    .map(s => stageLabels[s]);
  
  const strongestStage = Object.entries(stageCoverage)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  return {
    coverage_percentage: Math.round((covered.length / 6) * 100),
    covered_stages: covered,
    missing_stages: missing,
    strongest_stage: strongestStage ? stageLabels[strongestStage] : null
  };
}
