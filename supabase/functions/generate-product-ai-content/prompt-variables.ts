// Função para processar variáveis nos prompts customizados
export function processPromptVariables(
  prompt: string, 
  product: any, 
  existingItems: string[] = [], 
  complementOnly: boolean = false
): string {
  let processedPrompt = prompt;
  
  // Substituir variáveis básicas do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.subcategory}/g, product.subcategory || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.price}/g, product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, product.target_audience || 'Não informado');
  
  // Contexto de itens existentes
  const existingContext = existingItems.length > 0 ? 
    `\n\nITENS MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingItems.join(', ')}` : '';
  processedPrompt = processedPrompt.replace(/{existingContext}/g, existingContext);
  
  // Instrução baseada no modo
  const instruction = complementOnly && existingItems.length > 0 ? 
    'Gere APENAS 3 itens complementares que NÃO duplicem os existentes:' :
    'Gere APENAS um array JSON com os itens solicitados:';
  processedPrompt = processedPrompt.replace(/{instruction}/g, instruction);
  
  return processedPrompt;
}