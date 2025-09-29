import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProductSchemaData {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  offer_discount_cta?: any;
  category?: string;
  subcategory?: string;
  sales_pitch?: string;
  // ✨ NOVOS CAMPOS PARA SCHEMA COMPLETO
  features?: string[];
  benefits?: string[];
  target_audience?: string[];
  tags?: string[];
  video_captions?: any;
  resource_cta1?: any;
  resource_cta2?: any;
  resource_cta3?: any;
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
  // ✨ NOVO CAMPO: Technical Specifications
  technical_specifications?: Array<{ label: string; value: string }>;
}

interface SchemaResult {
  jsonLD: object;
  formatted: string;
  preview: string;
}

export const useProductSchemaGenerator = () => {
  const { toast } = useToast();

  const generateProductSchema = useCallback((products: ProductSchemaData[], pageTitle: string, pageDescription: string): SchemaResult => {
    if (!products || products.length === 0) {
      const basicSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": pageTitle,
        "description": pageDescription,
        "url": window.location.href,
        "mainEntity": {
          "@type": "Organization",
          "name": pageTitle.split(' ')[0] || "Nossa Empresa",
          "description": pageDescription
        }
      };

      return {
        jsonLD: basicSchema,
        formatted: JSON.stringify(basicSchema, null, 2),
        preview: "Schema básico da página (sem produtos)"
      };
    }

    // Determinar o tipo de schema baseado na quantidade de produtos
    const isMultipleProducts = products.length > 1;
    
    if (isMultipleProducts) {
      // ItemList schema para múltiplos produtos
      const itemListSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": pageTitle,
        "description": pageDescription,
        "url": window.location.href,
        "numberOfItems": products.length,
        "itemListElement": products.map((product, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": generateSingleProductSchema(product)
        }))
      };

      return {
        jsonLD: itemListSchema,
        formatted: JSON.stringify(itemListSchema, null, 2),
        preview: `Lista de ${products.length} produtos/serviços`
      };
    } else {
      // Product schema para produto único
      const singleProductSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        ...generateSingleProductSchema(products[0])
      };

      return {
        jsonLD: singleProductSchema,
        formatted: JSON.stringify(singleProductSchema, null, 2),
        preview: `Produto único: ${products[0].name}`
      };
    }
  }, []);

  const generateSingleProductSchema = useCallback((product: ProductSchemaData) => {
    const baseSchema: any = {
      "@type": "Product",
      "name": product.name,
      "description": product.description || product.sales_pitch || `${product.name} - Solução de qualidade`,
      "category": product.category || "Produtos e Serviços"
    };

    // ✨ NOVOS CAMPOS: Adicionar features e technical specifications como PropertyValue
    const additionalProperties: any[] = [];
    
    // Features
    if (product.features && Array.isArray(product.features) && product.features.length > 0) {
      additionalProperties.push(...product.features.map((feature: string) => ({
        "@type": "PropertyValue",
        "name": "Feature",
        "value": feature
      })));
    }
    
    // ✨ NOVO: Technical Specifications
    if (product.technical_specifications && Array.isArray(product.technical_specifications) && product.technical_specifications.length > 0) {
      additionalProperties.push(...product.technical_specifications.map((spec: any) => ({
        "@type": "PropertyValue",
        "name": spec.label || "Specification",
        "value": spec.value || ""
      })));
    }
    
    // Adicionar todas as propriedades adicionais ao schema
    if (additionalProperties.length > 0) {
      baseSchema.additionalProperty = additionalProperties;
    }

    // ✨ Adicionar benefits como hasEnergyConsumptionDetails ou similar
    if (product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0) {
      baseSchema.description += ` Benefícios: ${product.benefits.join(', ')}.`;
    }

    // ✨ Adicionar target_audience como audience
    if (product.target_audience && Array.isArray(product.target_audience) && product.target_audience.length > 0) {
      baseSchema.audience = {
        "@type": "Audience",
        "audienceType": product.target_audience.join(', ')
      };
    }

    // Adicionar preço se disponível
    if (product.price && product.price > 0) {
      baseSchema.offers = {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": product.currency || "BRL",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +1 ano
      };

      // Adicionar offer especial se houver desconto
      if (product.offer_discount_cta?.visible && product.offer_discount_cta?.url) {
        baseSchema.offers.url = product.offer_discount_cta.url;
        if (product.offer_discount_cta.label) {
          baseSchema.offers.description = product.offer_discount_cta.label;
        }
      }
    }

    // Adicionar imagem se disponível
    if (product.image_url) {
      baseSchema.image = product.image_url;
    }

    // Adicionar categoria hierárquica
    if (product.subcategory) {
      baseSchema.category = `${product.category} > ${product.subcategory}`;
    }

    // Adicionar identificador único
    baseSchema.identifier = product.id;

    return baseSchema;
  }, []);

  const generateFAQSchema = useCallback((faqItems: { question: string; answer: string }[]): SchemaResult => {
    if (!faqItems || faqItems.length === 0) {
      return {
        jsonLD: {},
        formatted: '',
        preview: 'Nenhuma FAQ disponível'
      };
    }

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    return {
      jsonLD: faqSchema,
      formatted: JSON.stringify(faqSchema, null, 2),
      preview: `FAQ com ${faqItems.length} perguntas`
    };
  }, []);

  const combineSchemas = useCallback((schemas: object[]): SchemaResult => {
    if (schemas.length === 0) {
      return {
        jsonLD: {},
        formatted: '',
        preview: 'Nenhum schema disponível'
      };
    }

    if (schemas.length === 1) {
      return {
        jsonLD: schemas[0],
        formatted: JSON.stringify(schemas[0], null, 2),
        preview: 'Schema único'
      };
    }

    // Combinar múltiplos schemas em um array
    const combinedSchema = schemas;

    return {
      jsonLD: combinedSchema,
      formatted: JSON.stringify(combinedSchema, null, 2),
      preview: `${schemas.length} schemas combinados`
    };
  }, []);

  const validateSchema = useCallback((schema: object): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    try {
      // Validações básicas
      if (!schema || typeof schema !== 'object') {
        errors.push('Schema deve ser um objeto válido');
        return { isValid: false, errors };
      }

      const schemaObj = schema as any;

      if (!schemaObj['@context']) {
        errors.push('Schema deve ter @context definido');
      }

      if (!schemaObj['@type']) {
        errors.push('Schema deve ter @type definido');
      }

      // Validações específicas por tipo
      if (schemaObj['@type'] === 'Product') {
        if (!schemaObj.name) {
          errors.push('Produto deve ter nome definido');
        }
      }

      if (schemaObj['@type'] === 'ItemList') {
        if (!schemaObj.itemListElement || !Array.isArray(schemaObj.itemListElement)) {
          errors.push('ItemList deve ter itemListElement como array');
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      errors.push(`Erro na validação: ${error}`);
      return { isValid: false, errors };
    }
  }, []);

  return {
    generateProductSchema,
    generateFAQSchema,
    combineSchemas,
    validateSchema
  };
};