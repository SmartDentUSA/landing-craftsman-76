import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductSEOData {
  // Dados básicos
  name: string;
  description: string;
  price?: number;
  currency?: string;
  image_url?: string;
  
  // ✨ GOOGLE MERCHANT FIELDS
  gtin?: string;
  mpn?: string;
  brand?: string;
  google_product_category?: string;
  condition?: string;
  availability?: string;
  color?: string;
  size?: string;
  material?: string;
  age_group?: string;
  gender?: string;
  
  // ✨ SEO ENHANCEMENT FIELDS
  seo_title_override?: string;
  seo_description_override?: string;
  canonical_url?: string;
  seo_enhanced?: boolean;
}

export const useProductSEOExtractor = () => {
  const { toast } = useToast();

  // Extrair dados de uma URL e salvar no produto
  const extractAndSaveProductSEO = useCallback(async (productId: string, productUrl: string) => {
    try {
      console.log('🔍 Extraindo dados SEO do produto:', { productId, productUrl });

      // Chamar edge function para extração
      const { data: extractedData, error: extractError } = await supabase.functions.invoke('extract-product-data', {
        body: { url: productUrl }
      });

      if (extractError) {
        throw new Error(`Erro na extração: ${extractError.message}`);
      }

      if (!extractedData?.success || !extractedData?.data) {
        throw new Error('Dados não extraídos com sucesso');
      }

      const extracted = extractedData.data;
      console.log('✅ Dados extraídos:', extracted);

      // Preparar dados para update
      const seoUpdateData: Partial<ProductSEOData> = {
        gtin: extracted.gtin || null,
        mpn: extracted.mpn || null,
        brand: extracted.brand || null,
        google_product_category: extracted.google_product_category || null,
        condition: extracted.condition || 'new',
        availability: extracted.availability || 'in stock',
        color: extracted.color || null,
        size: extracted.size || null,
        material: extracted.material || null,
        age_group: extracted.age_group || null,
        gender: extracted.gender || null,
        seo_enhanced: true
      };

      // Atualizar produto no banco
      const { error: updateError } = await supabase
        .from('products_repository')
        .update(seoUpdateData)
        .eq('id', productId);

      if (updateError) {
        throw new Error(`Erro ao salvar: ${updateError.message}`);
      }

      toast({
        title: "✅ SEO Aprimorado!",
        description: `Dados Google Merchant extraídos e salvos: ${Object.keys(seoUpdateData).filter(k => seoUpdateData[k as keyof typeof seoUpdateData]).length} campos preenchidos`
      });

      return {
        success: true,
        data: seoUpdateData,
        extractedCount: Object.keys(seoUpdateData).filter(k => seoUpdateData[k as keyof typeof seoUpdateData]).length
      };

    } catch (error) {
      console.error('❌ Erro na extração SEO:', error);
      toast({
        title: "❌ Erro na Extração",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [toast]);

  // Verificar status SEO de um produto
  const checkProductSEOStatus = useCallback(async (productId: string) => {
    try {
      const { data: product, error } = await supabase
        .from('products_repository')
        .select('gtin, mpn, brand, google_product_category, condition, availability, color, size, material, seo_enhanced')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const seoScore = [
        product.gtin,
        product.mpn, 
        product.brand,
        product.google_product_category,
        product.condition,
        product.availability
      ].filter(Boolean).length;

      return {
        seoScore,
        maxScore: 6,
        percentage: Math.round((seoScore / 6) * 100),
        isEnhanced: product.seo_enhanced || false,
        missingFields: [
          !product.gtin && 'GTIN',
          !product.mpn && 'MPN',
          !product.brand && 'Marca',
          !product.google_product_category && 'Categoria Google',
          !product.condition && 'Condição',
          !product.availability && 'Disponibilidade'
        ].filter(Boolean)
      };
    } catch (error) {
      console.error('Erro ao verificar status SEO:', error);
      return null;
    }
  }, []);

  // Gerar schema específico para produto com dados Google Merchant
  const generateProductMerchantSchema = useCallback((product: ProductSEOData) => {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.seo_description_override || product.description
    };

    // ✨ IDENTIFICADORES ÚNICOS OBRIGATÓRIOS
    if (product.gtin) {
      schema.gtin = product.gtin;
    }
    if (product.mpn) {
      schema.mpn = product.mpn;
    }

    // ✨ DADOS COMERCIAIS
    if (product.price) {
      schema.offers = {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": product.currency || "BRL",
        "availability": `https://schema.org/${product.availability === 'in stock' ? 'InStock' : 'OutOfStock'}`,
        "itemCondition": `https://schema.org/${product.condition === 'new' ? 'NewCondition' : 'UsedCondition'}`
      };
    }

    // ✨ ATRIBUTOS FÍSICOS
    if (product.brand) schema.brand = { "@type": "Brand", "name": product.brand };
    if (product.color) schema.color = product.color;
    if (product.size) schema.size = product.size;
    if (product.material) schema.material = product.material;
    if (product.google_product_category) schema.category = product.google_product_category;

    // ✨ IMAGEM
    if (product.image_url) schema.image = product.image_url;

    return schema;
  }, []);

  return {
    extractAndSaveProductSEO,
    checkProductSEOStatus,
    generateProductMerchantSchema
  };
};