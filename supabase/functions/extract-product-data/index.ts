import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductData {
  name: string;
  price: string;
  description: string;
  image?: string;
  available?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL é obrigatória');
    }

    // Validar se é URL da Loja Integrada
    if (!url.includes('lojaintegrada.com.br') && !url.includes('loja.com.br')) {
      throw new Error('URL deve ser de uma loja da Loja Integrada');
    }

    console.log('Extraindo dados da URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar a URL: ${response.status}`);
    }

    const html = await response.text();
    
    // Extrair dados do HTML usando regex simples
    const productData: ProductData = {
      name: '',
      price: '',
      description: '',
      image: '',
      available: true
    };

    // Extrair nome do produto
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/property="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) {
      productData.name = titleMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extrair preço
    const priceMatch = html.match(/R\$\s*[\d.,]+/gi);
    if (priceMatch && priceMatch.length > 0) {
      // Pegar o primeiro preço encontrado
      productData.price = priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.');
    }

    // Extrair descrição
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                     html.match(/property="og:description"\s+content="([^"]+)"/i);
    if (descMatch) {
      productData.description = descMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extrair imagem principal
    const imgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                    html.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
    if (imgMatch) {
      productData.image = imgMatch[1];
    }

    // Verificar disponibilidade
    const unavailableKeywords = ['indisponível', 'esgotado', 'fora de estoque', 'sem estoque'];
    const isUnavailable = unavailableKeywords.some(keyword => 
      html.toLowerCase().includes(keyword)
    );
    productData.available = !isUnavailable;

    console.log('Dados extraídos:', productData);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
        extracted_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao extrair dados do produto:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao extrair dados do produto',
        extracted_at: new Date().toISOString()
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});