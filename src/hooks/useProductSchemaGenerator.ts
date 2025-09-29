import { useCallback } from 'react';

// Interface para dados do produto usado no schema
interface ProductSchemaData {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  product_url?: string;
  price?: number;
  currency?: string;
  features?: string[];
  technical_specifications?: Array<{ property: string; value: string }>;
  target_audience?: string[];
  brand?: string;
  faq?: Array<{ question: string; answer: string }>;
}

// Interface para resultado do schema
interface SchemaResult {
  jsonLD: any;
  formatted: string;
  preview: string;
}

export const useProductSchemaGenerator = () => {
  // Função para gerar schema de múltiplos produtos
  const generateProductSchema = useCallback((products: ProductSchemaData[], pageTitle: string, pageDescription: string): SchemaResult => {
    if (!products || products.length === 0) {
      return {
        jsonLD: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": pageTitle || "Página",
          "description": pageDescription || "Descrição da página"
        },
        formatted: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": pageTitle || "Página",
          "description": pageDescription || "Descrição da página"
        }, null, 2),
        preview: 'Schema WebPage (sem produtos)'
      };
    }

    if (products.length === 1) {
      const product = products[0];
      const productSchema = generateSingleProductSchema(product);
      
      // Se o produto tem FAQ, combinar com schema FAQ
      if (product.faq && product.faq.length > 0) {
        const faqSchema = generateFAQSchema(product.faq);
        return combineSchemas([productSchema.jsonLD, faqSchema.jsonLD]);
      }
      
      return productSchema;
    }

    // Múltiplos produtos - criar ItemList
    const itemListSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": pageTitle || "Lista de Produtos",
      "description": pageDescription || "Lista de produtos disponíveis",
      "numberOfItems": products.length,
      "itemListElement": products.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": generateSingleProductSchema(product).jsonLD
      }))
    };

    // Coletar todos os FAQs dos produtos para criar um schema FAQ combinado
    const allFaqs = products
      .filter(product => product.faq && product.faq.length > 0)
      .flatMap(product => product.faq || []);

    if (allFaqs.length > 0) {
      const faqSchema = generateFAQSchema(allFaqs);
      return combineSchemas([itemListSchema, faqSchema.jsonLD]);
    }

    return {
      jsonLD: itemListSchema,
      formatted: JSON.stringify(itemListSchema, null, 2),
      preview: `ItemList com ${products.length} produtos`
    };
  }, []);

  // Função para gerar schema de produto individual
  const generateSingleProductSchema = useCallback((product: ProductSchemaData): SchemaResult => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description || `Produto ${product.name}`,
      ...(product.image_url && { "image": product.image_url }),
      ...(product.product_url && { "url": product.product_url }),
      ...(product.brand && { "brand": { "@type": "Brand", "name": product.brand } }),
      ...(product.features && product.features.length > 0 && {
        "additionalProperty": product.features.map(feature => ({
          "@type": "PropertyValue",
          "name": "Característica",
          "value": feature
        }))
      }),
      ...(product.technical_specifications && product.technical_specifications.length > 0 && {
        "additionalProperty": product.technical_specifications.map(spec => ({
          "@type": "PropertyValue",
          "name": spec.property,
          "value": spec.value
        }))
      }),
      ...(product.price && {
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": product.currency || "BRL",
          "availability": "https://schema.org/InStock"
        }
      }),
      ...(product.target_audience && product.target_audience.length > 0 && {
        "audience": {
          "@type": "Audience",
          "audienceType": product.target_audience.join(", ")
        }
      })
    };

    return {
      jsonLD: schema,
      formatted: JSON.stringify(schema, null, 2),
      preview: `Produto: ${product.name}`
    };
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