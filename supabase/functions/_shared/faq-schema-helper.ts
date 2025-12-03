// ═══════════════════════════════════════════════════════════
// 🎯 FASE 6: FAQ Schema Helper para SEO/SGE
// ═══════════════════════════════════════════════════════════
// Centraliza a geração de FAQPage Schema.org para todos os geradores

/**
 * Interface para item de FAQ
 */
export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Configurações para geração do FAQ Schema
 */
export interface FAQSchemaOptions {
  /** Número mínimo de caracteres na resposta para ser considerada válida */
  minAnswerLength?: number;
  /** Número mínimo de caracteres na pergunta para ser considerada válida */
  minQuestionLength?: number;
  /** Número mínimo de FAQs válidas para gerar o schema */
  minFaqCount?: number;
  /** Limitar número máximo de FAQs no schema */
  maxFaqCount?: number;
  /** Remover tags HTML das respostas */
  stripHtml?: boolean;
}

const DEFAULT_OPTIONS: FAQSchemaOptions = {
  minAnswerLength: 20,
  minQuestionLength: 10,
  minFaqCount: 2,
  maxFaqCount: 15,
  stripHtml: true
};

/**
 * Remove tags HTML de uma string
 */
function stripHtmlTags(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Valida e filtra FAQs para o schema
 */
export function validateFAQs(faqs: FAQItem[], options: FAQSchemaOptions = {}): FAQItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!faqs || !Array.isArray(faqs)) {
    return [];
  }

  return faqs.filter(faq => {
    if (!faq.question || !faq.answer) return false;
    
    const questionLen = faq.question.trim().length;
    const answerLen = opts.stripHtml 
      ? stripHtmlTags(faq.answer).length 
      : faq.answer.trim().length;
    
    return questionLen >= (opts.minQuestionLength || 10) && 
           answerLen >= (opts.minAnswerLength || 20);
  });
}

/**
 * Gera FAQPage Schema.org JSON-LD
 * @param faqs - Array de perguntas e respostas
 * @param options - Configurações opcionais
 * @returns Schema object ou null se não houver FAQs suficientes
 */
export function generateFAQPageSchema(
  faqs: FAQItem[], 
  options: FAQSchemaOptions = {}
): any | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const validFaqs = validateFAQs(faqs, opts);
  
  if (validFaqs.length < (opts.minFaqCount || 2)) {
    console.log(`⚠️ [FAQ Schema] FAQs insuficientes: ${validFaqs.length}/${opts.minFaqCount || 2} mínimo`);
    return null;
  }

  // Limitar número de FAQs se necessário
  const limitedFaqs = opts.maxFaqCount 
    ? validFaqs.slice(0, opts.maxFaqCount) 
    : validFaqs;

  const schema = {
    "@type": "FAQPage",
    "mainEntity": limitedFaqs.map(faq => ({
      "@type": "Question",
      "name": faq.question.trim(),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": opts.stripHtml ? stripHtmlTags(faq.answer) : faq.answer.trim()
      }
    }))
  };

  console.log(`✅ [FAQ Schema] FAQPage gerado com ${limitedFaqs.length} perguntas`);
  return schema;
}

/**
 * Gera FAQPage Schema como string JSON formatada (para inline no HTML)
 * @param faqs - Array de perguntas e respostas
 * @param options - Configurações opcionais
 * @returns String JSON ou null
 */
export function generateFAQPageSchemaString(
  faqs: FAQItem[], 
  options: FAQSchemaOptions = {}
): string | null {
  const schema = generateFAQPageSchema(faqs, options);
  
  if (!schema) return null;
  
  // Adicionar @context para uso standalone
  const fullSchema = {
    "@context": "https://schema.org",
    ...schema
  };
  
  return JSON.stringify(fullSchema, null, 2);
}

/**
 * Busca FAQs de um produto no banco de dados
 * @param supabase - Cliente Supabase
 * @param productId - ID do produto
 * @returns Array de FAQs ou vazio
 */
export async function fetchProductFAQs(
  supabase: any, 
  productId: string
): Promise<FAQItem[]> {
  try {
    const { data, error } = await supabase
      .from('products_repository')
      .select('faq')
      .eq('id', productId)
      .single();

    if (error || !data?.faq) {
      console.log(`⚠️ [FAQ Schema] Nenhum FAQ encontrado para produto ${productId}`);
      return [];
    }

    if (!Array.isArray(data.faq)) {
      console.log(`⚠️ [FAQ Schema] FAQ não é array para produto ${productId}`);
      return [];
    }

    console.log(`✅ [FAQ Schema] ${data.faq.length} FAQs carregados do produto ${productId}`);
    return data.faq as FAQItem[];
  } catch (err) {
    console.error('❌ [FAQ Schema] Erro ao buscar FAQs:', err);
    return [];
  }
}

/**
 * Gera HTML de FAQ com Microdata Schema.org (acessibilidade adicional)
 * @param faqs - Array de perguntas e respostas
 * @param options - Configurações opcionais
 * @returns HTML string com microdata
 */
export function generateFAQMicrodataHTML(
  faqs: FAQItem[], 
  options: FAQSchemaOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const validFaqs = validateFAQs(faqs, opts);
  
  if (validFaqs.length === 0) return '';
  
  const limitedFaqs = opts.maxFaqCount 
    ? validFaqs.slice(0, opts.maxFaqCount) 
    : validFaqs;

  const faqItems = limitedFaqs.map(faq => `
    <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 itemprop="name">${faq.question.trim()}</h3>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <div itemprop="text">${opts.stripHtml ? stripHtmlTags(faq.answer) : faq.answer.trim()}</div>
      </div>
    </div>
  `).join('\n');

  return `
    <section class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
      ${faqItems}
    </section>
  `;
}

/**
 * Extrai FAQs de diferentes formatos de dados
 * Suporta: array direto, objeto com propriedade faq, blog_post.faq, product.faq
 */
export function extractFAQsFromData(data: any): FAQItem[] {
  if (!data) return [];
  
  // Array direto de FAQs
  if (Array.isArray(data)) {
    return data;
  }
  
  // Objeto com propriedade faq
  if (data.faq && Array.isArray(data.faq)) {
    return data.faq;
  }
  
  // Objeto com propriedade faqs (plural)
  if (data.faqs && Array.isArray(data.faqs)) {
    return data.faqs;
  }
  
  // Nested em data.data.faq (landing pages)
  if (data.data?.faq && Array.isArray(data.data.faq)) {
    return data.data.faq;
  }
  
  return [];
}
