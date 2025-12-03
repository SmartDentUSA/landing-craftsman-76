/**
 * FASE 4: HowTo Schema Helper
 * Gera schema HowTo para workflow_stages dos produtos
 * Melhora SEO para buscas de "como fazer" e tutoriais
 */

export interface WorkflowStage {
  applicable: boolean;
  description?: string;
  competitive_advantages?: string[];
  related_products?: Array<{
    product_id?: string;
    product_name?: string;
    name?: string;
    role?: 'consumivel' | 'acessorio' | 'principal';
  }>;
}

export interface ProductWithWorkflow {
  id?: string;
  name: string;
  workflow_stages?: Record<string, WorkflowStage>;
  image_url?: string;
  product_url?: string;
}

export interface HowToSchemaOptions {
  includeSupplies?: boolean;
  includeTips?: boolean;
  includeImages?: boolean;
  companyName?: string;
  websiteUrl?: string;
}

const STAGE_LABELS: Record<string, { name: string; description: string }> = {
  scan: { 
    name: 'Escaneamento Digital', 
    description: 'Captura digital precisa da anatomia dental usando scanner intraoral ou de bancada'
  },
  design: { 
    name: 'Design CAD/CAM', 
    description: 'Planejamento e modelagem 3D da restauração usando software especializado'
  },
  print: { 
    name: 'Impressão 3D / Fresagem', 
    description: 'Fabricação da peça através de impressão 3D ou fresagem CNC'
  },
  process: { 
    name: 'Processamento', 
    description: 'Tratamento térmico, cura ou pós-processamento da restauração'
  },
  finish: { 
    name: 'Acabamento e Polimento', 
    description: 'Refinamento estético e ajustes finais na restauração'
  },
  install: { 
    name: 'Instalação Clínica', 
    description: 'Cimentação ou fixação da restauração no paciente'
  }
};

/**
 * Gera schema HowTo para um produto com workflow_stages
 */
export function generateHowToSchema(
  product: ProductWithWorkflow,
  options: HowToSchemaOptions = {}
): any | null {
  const {
    includeSupplies = true,
    includeTips = true,
    includeImages = true,
    companyName = 'Smart Dent',
    websiteUrl = 'https://smartdent.com.br'
  } = options;

  if (!product.workflow_stages) {
    return null;
  }

  const applicableStages = Object.entries(product.workflow_stages)
    .filter(([_, stage]) => stage && stage.applicable)
    .map(([key, stage], index) => {
      const stageInfo = STAGE_LABELS[key] || { name: key, description: '' };
      
      const step: any = {
        '@type': 'HowToStep',
        'position': index + 1,
        'name': stageInfo.name,
        'text': stage.description || stageInfo.description,
        'url': `${websiteUrl}/workflow/${key}`
      };

      // Imagem do passo (se disponível)
      if (includeImages && product.image_url) {
        step.image = product.image_url;
      }

      // HowToTip - Vantagens competitivas
      if (includeTips && stage.competitive_advantages && stage.competitive_advantages.length > 0) {
        step.itemListElement = stage.competitive_advantages.map((advantage, i) => ({
          '@type': 'HowToTip',
          'position': i + 1,
          'text': advantage
        }));
      }

      // HowToSupply - Produtos relacionados (materiais/ferramentas)
      if (includeSupplies && stage.related_products && stage.related_products.length > 0) {
        step.supply = stage.related_products.map((rp, i) => {
          const supplyName = rp.product_name || rp.name || 'Material necessário';
          let supplyDescription = 'Produto utilizado nesta etapa do workflow';
          
          if (rp.role === 'consumivel') {
            supplyDescription = 'Material consumível necessário para esta etapa';
          } else if (rp.role === 'acessorio') {
            supplyDescription = 'Acessório complementar para otimizar o processo';
          } else if (rp.role === 'principal') {
            supplyDescription = 'Equipamento principal para execução desta etapa';
          }

          return {
            '@type': 'HowToSupply',
            'position': i + 1,
            'name': supplyName,
            'description': supplyDescription
          };
        });
      }

      return step;
    });

  if (applicableStages.length === 0) {
    return null;
  }

  // Calcular tempo estimado baseado no número de etapas
  const estimatedMinutes = applicableStages.length * 15; // ~15 min por etapa
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  const totalTime = hours > 0 ? `PT${hours}H${minutes}M` : `PT${minutes}M`;

  const schema: any = {
    '@type': 'HowTo',
    '@id': `${websiteUrl}/howto/${product.name?.toLowerCase().replace(/\s+/g, '-') || 'workflow'}`,
    'name': `Workflow Digital com ${product.name}`,
    'description': `Guia completo das etapas do processo odontológico digital utilizando ${product.name}. Aprenda a integrar este produto no seu fluxo de trabalho clínico.`,
    'totalTime': totalTime,
    'estimatedCost': {
      '@type': 'MonetaryAmount',
      'currency': 'BRL',
      'value': 'Variável conforme caso clínico'
    },
    'tool': {
      '@type': 'HowToTool',
      'name': product.name
    },
    'step': applicableStages
  };

  // Imagem principal
  if (includeImages && product.image_url) {
    schema.image = {
      '@type': 'ImageObject',
      'url': product.image_url,
      'name': `Workflow ${product.name}`
    };
  }

  // Autor/Publisher
  schema.author = {
    '@type': 'Organization',
    'name': companyName,
    'url': websiteUrl
  };

  return schema;
}

/**
 * Gera múltiplos schemas HowTo para uma lista de produtos
 */
export function generateMultipleHowToSchemas(
  products: ProductWithWorkflow[],
  options: HowToSchemaOptions = {}
): any[] {
  return products
    .map(product => generateHowToSchema(product, options))
    .filter(Boolean);
}

/**
 * Gera HTML oculto com microdata HowTo para crawlers
 */
export function generateHowToMicrodataHTML(product: ProductWithWorkflow): string {
  if (!product.workflow_stages) {
    return '';
  }

  const applicableStages = Object.entries(product.workflow_stages)
    .filter(([_, stage]) => stage && stage.applicable);

  if (applicableStages.length === 0) {
    return '';
  }

  const stepsHTML = applicableStages.map(([key, stage], index) => {
    const stageInfo = STAGE_LABELS[key] || { name: key, description: '' };
    return `
      <div itemprop="step" itemscope itemtype="https://schema.org/HowToStep">
        <meta itemprop="position" content="${index + 1}">
        <meta itemprop="name" content="${stageInfo.name}">
        <meta itemprop="text" content="${stage.description || stageInfo.description}">
      </div>
    `;
  }).join('');

  return `
    <div class="howto-microdata visually-hidden" itemscope itemtype="https://schema.org/HowTo" style="display:none;">
      <meta itemprop="name" content="Workflow Digital com ${product.name}">
      <meta itemprop="description" content="Etapas do processo odontológico digital utilizando ${product.name}">
      ${stepsHTML}
    </div>
  `;
}

/**
 * Busca produtos com workflow_stages do banco de dados
 */
export async function fetchProductsWithWorkflow(
  supabase: any,
  productIds?: string[]
): Promise<ProductWithWorkflow[]> {
  try {
    let query = supabase
      .from('products_repository')
      .select('id, name, workflow_stages, image_url, product_url')
      .not('workflow_stages', 'is', null);

    if (productIds && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('❌ Erro ao buscar produtos com workflow:', error);
      return [];
    }

    // Filtrar produtos que realmente têm stages aplicáveis
    return (data || []).filter((p: ProductWithWorkflow) => {
      if (!p.workflow_stages) return false;
      return Object.values(p.workflow_stages).some(stage => stage && stage.applicable);
    });
  } catch (err) {
    console.error('❌ Erro ao buscar produtos com workflow:', err);
    return [];
  }
}
