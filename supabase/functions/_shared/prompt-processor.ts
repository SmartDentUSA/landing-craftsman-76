// Shared utility for processing selected fields and data sources in prompts

export interface SelectedFieldsConfig {
  selectedFields: Record<string, string[]>;
  selectedDataSources: string[];
}

export function extractSelectedData(
  product: any, 
  companyProfile: any, 
  config: SelectedFieldsConfig
): Record<string, any> {
  const extractedData: Record<string, any> = {};
  
  if (!config || !config.selectedFields || !config.selectedDataSources) {
    // Se não há configuração específica, retorna todos os dados
    return {
      product: product,
      company: companyProfile,
      allData: true
    };
  }

  // Processar cada data source selecionado
  config.selectedDataSources.forEach(dataSource => {
    const fields = config.selectedFields[dataSource] || [];
    
    if (fields.length === 0) return;

    if (dataSource === 'products_repository' && product) {
      const productData: Record<string, any> = {};
      fields.forEach(field => {
        if (product[field] !== undefined) {
          productData[field] = product[field];
        }
      });
      extractedData.product = productData;
    }
    
    if (dataSource === 'company_profile' && companyProfile) {
      const companyData: Record<string, any> = {};
      fields.forEach(field => {
        if (companyProfile[field] !== undefined) {
          companyData[field] = companyProfile[field];
        }
      });
      extractedData.company = companyData;
    }
  });

  return extractedData;
}

export function buildContextFromSelectedData(
  extractedData: Record<string, any>
): string {
  let context = '';
  
  if (extractedData.allData) {
    // Usar formato completo se não há seleção específica
    const product = extractedData.product;
    const company = extractedData.company;
    
    if (product) {
      context += `DADOS DO PRODUTO:
- Nome: ${product.name || 'Não informado'}
- Descrição: ${product.description || 'Não informada'}
- Categoria: ${product.category || 'Não informada'}
- Subcategoria: ${product.subcategory || 'Não informada'}
- Preço: ${product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado'}
- Keywords: ${Array.isArray(product.keywords) ? product.keywords.join(', ') : 'Não informadas'}
- Benefícios: ${Array.isArray(product.benefits) ? product.benefits.join(', ') : 'Não informados'}
- Características: ${Array.isArray(product.features) ? product.features.join(', ') : 'Não informadas'}
- Público-alvo: ${Array.isArray(product.target_audience) ? product.target_audience.join(', ') : 'Não informado'}
- Pitch de Vendas: ${product.sales_pitch || 'Não informado'}

`;
    }
    
    if (company) {
      context += `DADOS DA EMPRESA:
- Nome: ${company.company_name || 'Não informado'}
- Descrição: ${company.company_description || 'Não informada'}
- Missão: ${company.mission_statement || 'Não informada'}
- Valores: ${company.brand_values || 'Não informados'}
- Setor: ${company.business_sector || 'Não informado'}

`;
    }
  } else {
    // Usar apenas campos selecionados
    if (extractedData.product && Object.keys(extractedData.product).length > 0) {
      context += 'DADOS DO PRODUTO SELECIONADOS:\n';
      Object.entries(extractedData.product).forEach(([key, value]) => {
        const label = getFieldLabel(key);
        const formattedValue = formatFieldValue(key, value);
        context += `- ${label}: ${formattedValue}\n`;
      });
      context += '\n';
    }
    
    if (extractedData.company && Object.keys(extractedData.company).length > 0) {
      context += 'DADOS DA EMPRESA SELECIONADOS:\n';
      Object.entries(extractedData.company).forEach(([key, value]) => {
        const label = getFieldLabel(key);
        const formattedValue = formatFieldValue(key, value);
        context += `- ${label}: ${formattedValue}\n`;
      });
      context += '\n';
    }
  }
  
  return context.trim();
}

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    name: 'Nome',
    description: 'Descrição',
    category: 'Categoria',
    subcategory: 'Subcategoria',
    price: 'Preço',
    keywords: 'Keywords',
    benefits: 'Benefícios',
    features: 'Características',
    target_audience: 'Público-alvo',
    sales_pitch: 'Pitch de Vendas',
    company_name: 'Nome da Empresa',
    company_description: 'Descrição da Empresa',
    mission_statement: 'Missão',
    brand_values: 'Valores da Marca',
    business_sector: 'Setor de Negócio',
    main_products_services: 'Produtos e Serviços Principais',
    seo_competitive_advantages: 'Vantagens Competitivas',
    seo_market_positioning: 'Posicionamento no Mercado',
    seo_technical_expertise: 'Expertise Técnica'
  };
  
  return labels[fieldName] || fieldName;
}

function formatFieldValue(fieldName: string, value: any): string {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Não informado';
  }
  
  if (fieldName === 'price' && typeof value === 'number') {
    return `BRL ${value}`;
  }
  
  return String(value);
}

export function processPromptWithSelectedData(
  prompt: string,
  extractedData: Record<string, any>,
  existingContent?: string[]
): string {
  let processedPrompt = prompt;
  
  // Substituir {selectedData} com o contexto construído
  const context = buildContextFromSelectedData(extractedData);
  processedPrompt = processedPrompt.replace(/{selectedData}/g, context);
  
  // Processar variáveis individuais se existirem no prompt
  if (extractedData.product) {
    const product = extractedData.product;
    processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
    processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
    processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
    processedPrompt = processedPrompt.replace(/{product\.subcategory}/g, product.subcategory || 'Não informada');
    processedPrompt = processedPrompt.replace(/{product\.price}/g, product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado');
    processedPrompt = processedPrompt.replace(/{product\.keywords}/g, Array.isArray(product.keywords) ? product.keywords.join(', ') : 'Não informadas');
    processedPrompt = processedPrompt.replace(/{product\.benefits}/g, Array.isArray(product.benefits) ? product.benefits.join(', ') : 'Não informados');
    processedPrompt = processedPrompt.replace(/{product\.features}/g, Array.isArray(product.features) ? product.features.join(', ') : 'Não informadas');
    processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, Array.isArray(product.target_audience) ? product.target_audience.join(', ') : 'Não informado');
    processedPrompt = processedPrompt.replace(/{product\.sales_pitch}/g, product.sales_pitch || 'Não informado');
  }
  
  if (extractedData.company) {
    const company = extractedData.company;
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, company.company_name || 'Não informado');
    processedPrompt = processedPrompt.replace(/{company\.company_description}/g, company.company_description || 'Não informada');
    processedPrompt = processedPrompt.replace(/{company\.mission_statement}/g, company.mission_statement || 'Não informada');
    processedPrompt = processedPrompt.replace(/{company\.brand_values}/g, company.brand_values || 'Não informados');
  }
  
  // Processar conteúdo existente para anti-duplicação
  if (existingContent && existingContent.length > 0) {
    const existingContext = `\n\nCONTEÚDO ANTERIOR EXISTENTE (NÃO DUPLICAR):\n${existingContent.join('\n- ')}`;
    processedPrompt = processedPrompt.replace(/{existingContext}/g, existingContext);
    processedPrompt = processedPrompt.replace(/{antiDuplicationInstruction}/g, 'IMPORTANTE: Analise o conteúdo anterior e gere algo completamente diferente e complementar.');
  } else {
    processedPrompt = processedPrompt.replace(/{existingContext}/g, '');
    processedPrompt = processedPrompt.replace(/{antiDuplicationInstruction}/g, '');
  }
  
  return processedPrompt;
}

// Função para extrair conteúdo anterior para anti-duplicação
export function extractExistingContent(
  product: any,
  contentType: string
): string[] {
  const existing: string[] = [];
  
  try {
    switch (contentType) {
      case 'whatsapp':
        const whatsappData = product.whatsapp_messages;
        if (whatsappData?.messages && Array.isArray(whatsappData.messages)) {
          whatsappData.messages.forEach((msg: any) => {
            if (msg.content) {
              existing.push(msg.content.substring(0, 200) + '...'); // Apenas primeiros 200 chars para contexto
            }
          });
        }
        break;
        
      case 'youtube':
        const youtubeData = product.youtube_descriptions;
        if (youtubeData?.descriptions && Array.isArray(youtubeData.descriptions)) {
          youtubeData.descriptions.forEach((desc: any) => {
            if (desc.content) {
              existing.push(desc.content.substring(0, 200) + '...');
            }
          });
        }
        break;
        
      case 'instagram':
        const instagramData = product.instagram_copies;
        if (instagramData?.feed_copy) {
          existing.push(instagramData.feed_copy.substring(0, 200) + '...');
        }
        break;
        
      case 'tiktok':
        const tiktokData = product.tiktok_content;
        if (tiktokData?.copies && Array.isArray(tiktokData.copies)) {
          tiktokData.copies.forEach((copy: any) => {
            if (copy.content) {
              existing.push(copy.content.substring(0, 200) + '...');
            }
          });
        }
        break;
        
      case 'blog':
        if (product.individual_blog_content?.commercial) {
          existing.push(product.individual_blog_content.commercial.substring(0, 300) + '...');
        }
        if (product.individual_blog_content?.technical) {
          existing.push(product.individual_blog_content.technical.substring(0, 300) + '...');
        }
        break;
    }
  } catch (error) {
    console.error('Error extracting existing content:', error);
  }
  
  return existing.slice(0, 3); // Máximo 3 exemplos para não sobrecarregar o prompt
}