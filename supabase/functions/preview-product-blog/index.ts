import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  renderProductBlogTemplate,
  type TemplateData,
  type ProductTemplateData,
  type CompanyTemplateData
} from '../_shared/mustache-template-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreviewRequest {
  productId: string;
  blogType: 'commercial' | 'technical';
}

// Helper para gerar slug
function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper para extrair vídeos do produto
function extractProductVideos(product: any): Array<{ url: string; title?: string; thumbnail?: string; duration?: string }> {
  const videos: Array<{ url: string; title?: string; thumbnail?: string; duration?: string }> = [];
  
  if (Array.isArray(product.youtube_videos)) {
    product.youtube_videos.forEach((v: any) => {
      const url = typeof v === 'string' ? v : v.url;
      if (url) {
        videos.push({
          url,
          title: typeof v === 'object' ? v.title : undefined,
          thumbnail: typeof v === 'object' ? v.thumbnail : undefined,
          duration: typeof v === 'object' ? v.duration : undefined
        });
      }
    });
  }
  
  if (Array.isArray(product.technical_videos)) {
    product.technical_videos.forEach((v: any) => {
      const url = typeof v === 'string' ? v : v.url;
      if (url && !videos.some(existing => existing.url === url)) {
        videos.push({
          url,
          title: typeof v === 'object' ? v.title : undefined,
          thumbnail: typeof v === 'object' ? v.thumbnail : undefined,
          duration: typeof v === 'object' ? v.duration : undefined
        });
      }
    });
  }
  
  return videos.slice(0, 6);
}

// Helper para extrair perfis sociais
function extractSocialProfiles(companyProfile: any): string[] {
  const profiles: string[] = [];
  
  if (companyProfile?.instagram_profile) {
    profiles.push(companyProfile.instagram_profile.startsWith('http') 
      ? companyProfile.instagram_profile 
      : `https://instagram.com/${companyProfile.instagram_profile.replace('@', '')}`);
  }
  
  if (companyProfile?.youtube_channel) {
    profiles.push(companyProfile.youtube_channel.startsWith('http')
      ? companyProfile.youtube_channel
      : `https://youtube.com/${companyProfile.youtube_channel}`);
  }
  
  if (companyProfile?.social_media_links) {
    const links = companyProfile.social_media_links;
    if (links.facebook) profiles.push(links.facebook);
    if (links.linkedin) profiles.push(links.linkedin);
    if (links.twitter) profiles.push(links.twitter);
    if (links.tiktok) profiles.push(links.tiktok);
  }
  
  return profiles;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, blogType } = await req.json() as PreviewRequest;
    
    if (!productId || !blogType) {
      return new Response(
        JSON.stringify({ error: 'productId e blogType são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[preview-product-blog] Generating preview for product ${productId}, type ${blogType}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('[preview-product-blog] Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch company profile
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    // Get blog content from individual_blog_content
    const blogContent = product.individual_blog_content as any;
    if (!blogContent || !blogContent[blogType]) {
      return new Response(
        JSON.stringify({ error: `Blog ${blogType} não encontrado para este produto` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build template data
    const productData: ProductTemplateData = {
      id: product.id,
      name: product.name,
      slug: product.slug || slugify(product.name),
      description: product.description || '',
      sales_pitch: product.sales_pitch,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      image_url: product.image_url,
      images_gallery: Array.isArray(product.images_gallery) 
        ? product.images_gallery.map((img: any) => ({
            url: typeof img === 'string' ? img : img.url,
            alt: typeof img === 'object' ? img.alt : product.name,
            is_main: typeof img === 'object' ? img.is_main : false
          }))
        : [],
      price: product.price,
      promo_price: product.promo_price,
      currency: product.currency || 'BRL',
      gtin: product.gtin,
      mpn: product.mpn,
      ean: product.ean,
      availability: product.availability || 'in_stock',
      features: Array.isArray(product.features) 
        ? product.features.map((f: any) => typeof f === 'string' ? f : f.text || f.name) 
        : [],
      benefits: Array.isArray(product.benefits) 
        ? product.benefits.map((b: any) => typeof b === 'string' ? b : b.text || b.name) 
        : [],
      applications: product.applications 
        ? product.applications.split('\n').filter((a: string) => a.trim()) 
        : [],
      target_audience: Array.isArray(product.target_audience) 
        ? product.target_audience.map((t: any) => typeof t === 'string' ? t : t.segment) 
        : [],
      technical_specifications: Array.isArray(product.technical_specifications)
        ? product.technical_specifications.map((spec: any) => ({
            key: spec.key || spec.label || spec.name || '',
            value: spec.value || ''
          }))
        : [],
      faq: Array.isArray(blogContent.faqs) 
        ? blogContent.faqs.map((faq: any) => ({
            question: faq.question,
            answer: faq.answer
          }))
        : [],
      videos: extractProductVideos(product),
      keywords: Array.isArray(product.keywords) 
        ? product.keywords.map((k: any) => typeof k === 'string' ? k : k.keyword || k.term)
        : [],
      canonical_url: product.canonical_url,
      product_url: product.product_url,
    };

    const companyData: CompanyTemplateData = {
      company_name: companyProfile?.company_name || 'Empresa',
      company_description: companyProfile?.company_description,
      company_logo_url: companyProfile?.company_logo_url,
      website_url: companyProfile?.website_url,
      contact_email: companyProfile?.contact_email,
      contact_phone: companyProfile?.contact_phone,
      street_address: companyProfile?.street_address,
      city: companyProfile?.city,
      state: companyProfile?.state,
      postal_code: companyProfile?.postal_code,
      country: companyProfile?.country || 'BR',
      latitude: companyProfile?.latitude,
      longitude: companyProfile?.longitude,
      social_profiles: extractSocialProfiles(companyProfile),
      founded_year: companyProfile?.founded_year,
      founder_name: companyProfile?.founder_name,
      google_aggregate_rating: companyProfile?.google_aggregate_rating as any,
      tracking_pixels: companyProfile?.tracking_pixels as any,
    };

    const templateData: TemplateData = {
      product: productData,
      company: companyData,
      blogType: blogType,
      generatedAt: new Date().toISOString(),
    };

    // Generate HTML using the Mustache template engine
    const html = renderProductBlogTemplate(templateData);

    console.log(`[preview-product-blog] Generated HTML preview: ${html.length} chars`);

    // Return HTML directly
    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8' 
      }
    });

  } catch (error) {
    console.error('[preview-product-blog] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
