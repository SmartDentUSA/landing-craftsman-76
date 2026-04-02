/**
 * Clinical Brain Guard — Middleware Global
 * Sistema A | Smart Dent Content Intelligence Platform
 * Versão 2.0 | Abril 2026
 */

export interface ProductContext {
  name: string
  category?: string
  price?: number
  url?: string
  description?: string
  benefits?: string[]
  features?: string[]
  target_audience?: string[]
  keywords?: string[]
  sales_pitch?: string
  technical_specifications?: Record<string, string>
  competitive_advantages?: string
  impact_metrics?: Array<{
    label: string
    value: string
    unit?: string
    description?: string
  }>
  clinical_brain?: {
    forbidden_products?: string[]
    required_products?: string[]
    anti_hallucination_rules?: string[]
    product_type?: string
  }
}

export interface CompanyContext {
  name?: string
  founded?: string
  sector?: string
  positioning?: string
  instagram?: string
  youtube?: string
  whatsapp?: string
  website?: string
}

const DEFAULT_COMPANY: CompanyContext = {
  name: 'Smart Dent',
  founded: '2009',
  sector: 'Tecnologia em Odontologia Digital',
  positioning: 'Ecossistema completo de odontologia digital — materiais + hardware + software.',
  instagram: 'https://www.instagram.com/smartdentoficial/',
  youtube: 'https://www.youtube.com/@smartdentcadcam',
  whatsapp: 'https://wa.me/5516993831794',
  website: 'https://smartdent.com.br',
}

export function formatProductSpecs(product: ProductContext): string {
  const specs: string[] = []
  if (product.technical_specifications) {
    for (const [key, value] of Object.entries(product.technical_specifications)) {
      if (value && value !== 'N/A' && value !== 'null' && value !== 'undefined') {
        specs.push(`• ${key}: ${value}`)
      }
    }
  }
  if (specs.length === 0 && product.features?.length) {
    product.features.slice(0, 8).forEach(f => specs.push(`• ${f}`))
  }
  return specs.length > 0
    ? specs.join('\n')
    : '(Especificações técnicas não cadastradas para este produto)'
}

export function formatImpactMetrics(product: ProductContext): string {
  if (!product.impact_metrics?.length) return '(Sem métricas de impacto cadastradas)'
  return product.impact_metrics
    .filter(m => m.label && m.value)
    .map(m => `${m.label}: ${m.value}${m.unit ? ' ' + m.unit : ''}${m.description ? ' — ' + m.description : ''}`)
    .join('\n')
}

export function formatForbiddenProducts(product: ProductContext): string {
  const f = product.clinical_brain?.forbidden_products
  return f?.length ? f.join(', ') : 'Nenhum'
}

export function formatRequiredProducts(product: ProductContext): string {
  const r = product.clinical_brain?.required_products
  return r?.length ? r.join(', ') : 'Nenhum'
}

export function buildProductBaseContext(
  product: ProductContext,
  company: CompanyContext = DEFAULT_COMPANY
): string {
  const audience = product.target_audience?.join(', ') || 'Cirurgiões-dentistas, clínicos gerais'
  const keywords = product.keywords?.slice(0, 10).join(', ') || '(Keywords não cadastradas)'

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMPRESA: ${company.name} | ${company.sector} | Fundada ${company.founded}
Posicionamento: ${company.positioning}
Tom: técnico-direto, baseado em evidência, sem superlativo vazio
Idioma: Português brasileiro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTO: ${product.name}
CATEGORIA: ${product.category || 'Não informada'}
PREÇO: R$ ${product.price?.toFixed(2) || 'Consulte'}
URL: ${product.url || company.website}
PÚBLICO: ${audience}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESPECIFICAÇÕES TÉCNICAS (usar valores exatos — NUNCA inventar):
${formatProductSpecs(product)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BENEFÍCIOS:
${product.benefits?.slice(0, 6).map((b, i) => `${i + 1}. ${b}`).join('\n') || '(Não cadastrados)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIFERENCIAIS:
${product.competitive_advantages || product.sales_pitch?.slice(0, 300) || '(Não cadastrado)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEYWORDS: ${keywords}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÉTRICAS DE IMPACTO:
${formatImpactMetrics(product)}
`.trim()
}

export function injectClinicalBrainGuard(
  prompt: string,
  product: ProductContext
): string {
  const customRules = product.clinical_brain?.anti_hallucination_rules || []

  const guard = `
╔═══════════════════════════════════════════════════╗
║      REGRAS ANTI-ALUCINAÇÃO — OBRIGATÓRIAS        ║
║ Violação = descarte imediato. Regerar com dados.  ║
╚═══════════════════════════════════════════════════╝

1. SPECS: Usar APENAS especificações do contexto. NUNCA estimar ou inventar.
2. ESTUDOS: NUNCA citar percentuais ou dados clínicos sem fonte no contexto.
3. CONCORRENTES: NUNCA nomear marcas concorrentes.
4. PROMESSAS: NUNCA garantir resultados clínicos não respaldados pelas specs.
5. OMISSÃO: Dado ausente no contexto = omitir. NUNCA estimar.
6. PRODUTOS PROIBIDOS JUNTOS: ${formatForbiddenProducts(product)}
7. PRODUTOS OBRIGATÓRIOS (se relevante): ${formatRequiredProducts(product)}
8. CERTIFICAÇÕES VÁLIDAS: ISO 4049, ANVISA, FDA — apenas se no contexto.
${customRules.map((r, i) => `${i + 9}. ${r}`).join('\n')}

AUTOVALIDAÇÃO antes de retornar:
□ Nenhuma spec inventada
□ Nenhum concorrente nomeado  
□ Nenhum [object Object] no output
□ Comprimento dentro do limite solicitado

`
  return guard + '\n' + prompt
}

export function buildFullPrompt(
  product: ProductContext,
  promptTemplate: string,
  company: CompanyContext = DEFAULT_COMPANY
): string {
  const baseContext = buildProductBaseContext(product, company)
  return injectClinicalBrainGuard(baseContext + '\n\n' + promptTemplate, product)
}

/**
 * Maps a raw product row from the database to ProductContext interface.
 * Use this in edge functions to convert DB data before passing to buildFullPrompt.
 */
export function mapProductToContext(product: any): ProductContext {
  return {
    name: product.name || product.product_name || '',
    category: product.category || product.subcategory || '',
    price: product.price ? parseFloat(product.price) : undefined,
    url: product.url || product.product_url || '',
    description: product.description || product.seo_description || '',
    benefits: Array.isArray(product.benefits) ? product.benefits : [],
    features: Array.isArray(product.features) ? product.features : [],
    target_audience: Array.isArray(product.target_audience) ? product.target_audience : [],
    keywords: Array.isArray(product.keywords) ? product.keywords : [],
    sales_pitch: product.sales_pitch || '',
    technical_specifications: product.technical_specifications || {},
    competitive_advantages: product.competitive_advantages || '',
    impact_metrics: Array.isArray(product.impact_metrics) ? product.impact_metrics : [],
    clinical_brain: product.clinical_brain || {},
  }
}
