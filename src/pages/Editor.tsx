import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleAdsTab } from "@/components/google-ads/GoogleAdsTab";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/ui/tag-input";
import { ArrowLeft, Save, Eye, Code, Copy, Settings, Plus, Trash2, Edit, Download, Globe, Mail, Instagram, Facebook, Youtube, Twitter, Linkedin, Users, Laptop, Tag, Folder, Star, DollarSign, Monitor, Loader2, Wand2, Lightbulb, FileText, Link, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ReviewModerationModal } from "@/components/ReviewModerationModal";
import VideoTestimonialsSection from "@/components/VideoTestimonialsSection";
const CSVReviewUploader: any = lazy(() => import("@/components/CSVReviewUploader").then(m => ({ default: (m as any).CSVReviewUploader ?? (m as any).default })));
import { ProductCSVUploader } from "@/components/ProductCSVUploader";
import { ImageDebugPreview } from "@/components/ImageDebugPreview";
import { useToast } from "@/hooks/use-toast";
import useLandingPages from "@/hooks/useLandingPages"; // Default export
import { ImageUploader } from "@/components/ImageUploader";
import { generateHTML, generateEmailHTML, generateBlogHTML } from "@/lib/template-engine";
import { generateSafeHTML, generateSafeEmailHTML, getEmbedConfig } from "@/lib/selflux-engine";
import { supabase } from "@/integrations/supabase/client";

// Interface de dados de imagem para o novo sistema
interface ImageData {
  mode: 'url' | 'cloudflare';
  src: string;
  cf_id?: string;
  variant?: 'w-480' | 'w-768' | 'w-1200';
  alt: string;
  scale: number;
  href?: string;
}

interface MenuItem {
  label: string;
  href: string;
}

interface Solution {
  text: string;
  image: ImageData;
  containerScale?: number; // Escala do container (0.3-2.0) - padrão 1.0
}

interface FAQ {
  question: string;
  answer: string;
}

// Estrutura completa de dados SEO e Social
interface SEOData {
  domain: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  meta_robots: string;
  og_title: string;
  og_description: string;
  og_image: ImageData;
  og_type: string;
  og_site_name: string;
  twitter_card: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: ImageData;
  twitter_site: string;
  twitter_creator: string;
  hreflang: Array<{ lang: string; url: string }>;
  hreflang_auto: boolean;
  publish_date: string;
  lastmod: string;
  faq_enable: boolean;
  // Novos campos para SEO inteligente com IA
  seo_hidden_content?: string;
  ai_keywords?: any;
  seo_generated_by_ai?: boolean;
  ai_seo_enabled?: boolean;
  export_panel_enabled?: boolean;
  intelligent_links?: { [keyword: string]: string };
}

// Schema e Offers para JSON-LD
interface SchemaData {
  software_app: {
    name: string;
    category: string;
    rating_value: string;
    rating_count: string;
    price: string;
    price_currency: string;
    operating_system: string;
    application_category: string;
  };
  google_reviews: {
    url: string;
    auto_extract: boolean;
    last_extracted: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    error_message?: string;
    place_id?: string;
  };
  manual_reviews?: Array<{
    id: string;
    author_name: string;
    rating: number;
    review_text: string;
    approved: boolean;
  }>;
  offers: Array<{
    name: string;
    description: string;
    price: string;
    currency: string;
    availability: string;
    valid_through: string;
    productUrl?: string;
    youtube_url?: string;
    instagram_url?: string;
    image?: string;
    sourceType?: 'manual' | 'imported';
    lastUpdated?: string;
    selected?: boolean;
    original_price?: string;
    installment_price?: string;
    discount_percentage?: number;
    rating?: string;
    rating_count?: number;
    // Novos campos para seção de recursos
    show_in_resources?: boolean;
    resource_cta1?: { label: string; url: string; visible: boolean };
    resource_cta2?: { label: string; url: string; visible: boolean };
    resource_cta3?: { label: string; url: string; visible: boolean };
  }>;
  breadcrumb: Array<{ name: string; url: string }>;
}

// Marca e Confiança
interface BrandData {
  legal_name: string;
  same_as: Array<{ platform: string; url: string }>;
  policies: {
    privacy_url: string;
    terms_url: string;
    security_url: string;
    cookies_url: string;
  };
}

interface EmailData {
  // Configurações de visibilidade das seções
  sections?: {
    header: { enabled: boolean };
    content: { enabled: boolean };
    ctas: { enabled: boolean };
    highlights: { enabled: boolean };
    benefits: { enabled: boolean };
    main_image: { enabled: boolean };
    solutions: { enabled: boolean };
    footer: { enabled: boolean };
  };
  assunto_email: string;
  preheader_texto: string;
  url_site: string;
  logo_src: ImageData;
  logo_alt: string;
  selo: string;
  titulo_principal: string;
  show_solutions_in_email?: boolean;
  solutions_title?: string;
  solutions_list?: Array<{
    title: string;
    description: string;
    image: ImageData;
  }>;
  subtitulo: string;
  cta_href: string;
  cta_label: string;
  cta_subcopy: string;
  bloco1_titulo: string;
  bloco1_texto: string;
  bloco2_titulo: string;
  bloco2_texto: string;
  beneficio_1: string;
  beneficio_2: string;
  beneficio_3: string;
  imagem_href: string;
  imagem_src: ImageData;
  imagem_alt: string;
  cta2_href: string;
  cta2_label: string;
  brand_name: string;
  endereco_completo: string;
  link_suporte: string;
  link_descadastro: string;
  link_preferencias: string;
}

interface LandingPageData {
  name: string;
  status: 'draft' | 'approved';
  template: string;
  
  // Configuração de incorporação SelFlux
  embed?: {
    mode: 'default' | 'selflux';
    namespace: string;
  };
  
  // SEO & Social
  seo: SEOData;
  
  // Schema & Offers
  schema: SchemaData;
  
  // Marca & Confiança
  brand: BrandData;
  
  // Dados principais (compatibilidade)
  seo_title: string;
  seo_description: string;
  logo_url: ImageData;
  logo_alt: string;
  menu: MenuItem[];
  banner: {
    badge_text: string;
    title: string;
    subtitle: string;
    cta_primary: { label: string; href: string; visible?: boolean };
    cta_secondary: { label: string; href: string; visible?: boolean };
    images: Array<ImageData>;
  };
  solutions_title: string;
  solutions: Solution[];
  desktop_info: {
    title: string;
    text: string;
    visible_desktop: boolean;
    visible_mobile: boolean;
    show_table: boolean;
    table_title: string;
    table_headers: string[];
    table_data: Array<{ [key: string]: string }>;
  };
  resources_section: {
    visible_desktop: boolean;
    visible_mobile: boolean;
    title: string;
    subtitle?: string;
  };
  offers_section: {
    visible_desktop: boolean;
    visible_mobile: boolean;
    title: string;
    subtitle?: string;
  };
  advisory: {
    title: string;
    paragraph: string;
    visible_desktop: boolean;
    visible_mobile: boolean;
    cta: { label: string; href: string };
    image: ImageData;
  };
  solutions_section: {
    visible_desktop: boolean;
    visible_mobile: boolean;
  };
  faq_section: {
    visible_desktop: boolean;
    visible_mobile: boolean;
  };
  faq_title: string;
  faq: FAQ[];
  cta_final: {
    title: string;
    paragraph: string;
    primary: { label: string; href: string; visible?: boolean };
    secondary: { label: string; href: string; visible?: boolean };
  };
  footer_links_title: string;
  footer: {
    locations: Array<{ title: string; address: string }>;
    links: Array<{ label: string; href: string }>;
    social: Array<{ platform: string; href: string; icon_src: string; icon_alt: string }>;
  };
  email: EmailData;
}

// Função para criar ImageData padrão
const createImageData = (src: string = '', alt: string = ''): ImageData => ({
  mode: 'url',
  src,
  cf_id: undefined,
  variant: 'w-768',
  alt,
  scale: 1.0
});

// Opções de redes sociais com ícones fixos
const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'email', label: 'E-mail', icon: Mail },
];

// Função para resolver URLs das imagens antes do preview
const beforePreview = (data: LandingPageData): LandingPageData => {
  // TODO: Implementar resolução automática de URLs Cloudflare
  // Substituir ACCOUNT_HASH_PLACEHOLDER pela hash real
  const resolveImageSrc = (image: ImageData | undefined): ImageData => {
    if (!image || !image.mode) {
      return createImageData('', '');
    }
    
    if (image.mode === 'cloudflare' && image.cf_id) {
      const accountHash = localStorage.getItem('cloudflareAccountHash') || 'ACCOUNT_HASH_PLACEHOLDER';
      return {
        ...image,
        src: `https://imagedelivery.net/${accountHash}/${image.cf_id}/${image.variant || 'w-768'}`
      };
    }
    return image;
  };

  // Aplicar resolução em todas as imagens
  const processedData = { ...data };
  processedData.logo_url = resolveImageSrc(data.logo_url);
  processedData.banner.images = data.banner.images.map(resolveImageSrc);
  processedData.solutions = data.solutions.map(s => ({ ...s, image: resolveImageSrc(s.image) }));
  processedData.advisory.image = resolveImageSrc(data.advisory.image);
  processedData.email.logo_src = resolveImageSrc(data.email.logo_src);
  processedData.email.imagem_src = resolveImageSrc(data.email.imagem_src);
  processedData.seo.og_image = resolveImageSrc(data.seo.og_image);
  processedData.seo.twitter_image = resolveImageSrc(data.seo.twitter_image);

  // Sincronizar campos SEO na preparação para preview
  if (processedData.seo_title && processedData.seo_title !== processedData.seo.seo_title) {
    processedData.seo.seo_title = processedData.seo_title;
  }
  if (processedData.seo.seo_title && processedData.seo.seo_title !== processedData.seo_title) {
    processedData.seo_title = processedData.seo.seo_title;
  }
  
  console.info('🎯 Preview preparado com:', {
    seo_title: processedData.seo_title,
    seo_seo_title: processedData.seo.seo_title,
    domain: processedData.seo.domain,
    canonical_url: processedData.seo.canonical_url,
    manual_reviews: processedData.schema?.manual_reviews?.length || 0
  });

  return processedData;
};

// 🔧 FUNÇÃO SCORE SEO APRIMORADA - Inclui validações críticas
const computeSEOScore = (data: LandingPageData) => {
  let score = 0;
  const breakdown: Array<{ item: string; status: 'ok' | 'pending'; points: number; message?: string }> = [];
  
  // 1. Título SEO (20 pts)
  const titleLength = (data.seo_title || '').length;
  if (titleLength >= 1 && titleLength <= 60) {
    score += 20;
    breakdown.push({ item: 'Título SEO', status: 'ok', points: 20 });
  } else {
    breakdown.push({ 
      item: 'Título SEO', 
      status: 'pending', 
      points: 20, 
      message: titleLength === 0 ? 'Defina um título SEO' : 'Ajuste o título para ≤60 caracteres' 
    });
  }
  
  // 2. Descrição SEO (20 pts)
  const descLength = (data.seo_description || '').length;
  if (descLength >= 1 && descLength <= 160) {
    score += 20;
    breakdown.push({ item: 'Descrição SEO', status: 'ok', points: 20 });
  } else {
    breakdown.push({ 
      item: 'Descrição SEO', 
      status: 'pending', 
      points: 20, 
      message: descLength === 0 ? 'Defina uma descrição SEO' : 'Ajuste a descrição para ≤160 caracteres' 
    });
  }
  
  // 3. URL Canônica (15 pts) - 🔧 Validação balanceada
  let canonicalValid = false;
  let canonicalMessage = 'Informe a URL canônica (deve começar com https://)';
  
  if (data.seo.canonical_url) {
    const url = data.seo.canonical_url.trim();
    if (url.startsWith('https://') && !url.includes('https://https://')) {
      canonicalValid = true;
    } else if (url.includes('https://https://')) {
      canonicalMessage = 'URL canônica com protocolo duplicado';
    } else {
      canonicalMessage = 'URL canônica deve começar com https://';
    }
  }
  
  if (canonicalValid) {
    score += 15;
    breakdown.push({ item: 'URL Canônica', status: 'ok', points: 15 });
  } else {
    breakdown.push({ 
      item: 'URL Canônica', 
      status: 'pending', 
      points: 15, 
      message: canonicalMessage 
    });
  }
  
  // 4. Imagem OG (15 pts) - 🔧 Validação mais flexível
  let ogImageValid = false;
  let ogImageMessage = 'Configure uma imagem para Open Graph';
  
  if (data.seo.og_image?.src) {
    const ogSrc = data.seo.og_image.src.trim();
    if (ogSrc.includes('via.placeholder.com') || ogSrc.includes('placeholder.com')) {
      ogImageMessage = 'Recomendamos substituir por uma imagem específica da marca';
    } else if (ogSrc !== '') {
      ogImageValid = true;
    }
  }
  
  if (ogImageValid) {
    score += 15;
    breakdown.push({ item: 'Imagem OG', status: 'ok', points: 15 });
  } else {
    breakdown.push({ 
      item: 'Imagem OG', 
      status: 'pending', 
      points: 15,
      message: ogImageMessage
    });
  }
  
  // 5. OG Title/Description (10 pts) - 🔧 Validação aprimorada
  const ogTitleValid = data.seo.og_title && data.seo.og_title.trim() !== '';
  const ogDescValid = data.seo.og_description && data.seo.og_description.trim() !== '';
  
  if (ogTitleValid && ogDescValid) {
    score += 10;
    breakdown.push({ item: 'OG Title/Description', status: 'ok', points: 10 });
  } else {
    const missing = [];
    if (!ogTitleValid) missing.push('título');
    if (!ogDescValid) missing.push('descrição');
    breakdown.push({ 
      item: 'OG Title/Description', 
      status: 'pending', 
      points: 10, 
      message: `Complete ${missing.join(' e ')} do Open Graph` 
    });
  }
  
  // 6. Twitter Card (5 pts) - 🔧 Validação aprimorada
  const validTwitterCards = ['summary', 'summary_large_image', 'app', 'player'];
  const twitterCardValid = data.seo.twitter_card && 
                          data.seo.twitter_card.trim() !== '' && 
                          validTwitterCards.includes(data.seo.twitter_card);
  
  if (twitterCardValid) {
    score += 5;
    breakdown.push({ item: 'Twitter Card', status: 'ok', points: 5 });
  } else {
    breakdown.push({ 
      item: 'Twitter Card', 
      status: 'pending', 
      points: 5, 
      message: 'Defina tipo válido de Twitter Card (summary_large_image recomendado)' 
    });
  }
  
  // 7. Meta Robots (5 pts) - 🔧 Validação mais flexível
  const validRobotValues = ['index', 'noindex', 'follow', 'nofollow', 'index, follow', 'noindex, nofollow'];
  let robotsValid = false;
  let robotsMessage = 'Configure diretrizes para robôs (opcional)';
  
  if (data.seo.meta_robots) {
    const robotsValue = data.seo.meta_robots.trim();
    if (robotsValue === '') {
      robotsValid = true; // Aceita vazio - usará fallback
      robotsMessage = 'Usará padrão: "index, follow"';
    } else if (validRobotValues.some(valid => robotsValue.includes(valid))) {
      robotsValid = true;
    } else {
      robotsMessage = 'Use valores válidos: index, follow, noindex, nofollow';
    }
  } else {
    robotsValid = true; // Aceita não configurado
    robotsMessage = 'Usará padrão: "index, follow"';
  }
  
  if (robotsValid) {
    score += 5;
    breakdown.push({ item: 'Meta Robots', status: 'ok', points: 5 });
  } else {
    breakdown.push({ 
      item: 'Meta Robots', 
      status: 'pending', 
      points: 5, 
      message: robotsMessage 
    });
  }
  
  // 8. H1 (Banner Title) (5 pts)
  const h1Valid = data.banner.title && data.banner.title.trim() !== '';
  if (h1Valid) {
    score += 5;
    breakdown.push({ item: 'H1 (Título Principal)', status: 'ok', points: 5 });
  } else {
    breakdown.push({ 
      item: 'H1 (Título Principal)', 
      status: 'pending', 
      points: 5, 
      message: 'Defina o título principal do banner' 
    });
  }
  
  // 9. FAQ habilitado (5 pts)
  const faqValid = data.seo.faq_enable && data.faq && data.faq.length > 0;
  if (faqValid) {
    score += 5;
    breakdown.push({ item: 'FAQ Schema', status: 'ok', points: 5 });
  } else {
    breakdown.push({ 
      item: 'FAQ Schema', 
      status: 'pending', 
      points: 5, 
      message: 'Habilite FAQ com pelo menos uma pergunta' 
    });
  }
  
  return { score, breakdown, percentage: Math.round(score) };
};

// Função de análise de conteúdo para automação SEO
const analyzeContent = (data: LandingPageData) => {
  // Incluir conteúdo de FAQ na análise
  const faqContent = data.faq?.map(faq => `${faq.question} ${faq.answer}`).join(' ') || '';
  const content = `${data.banner.title} ${data.banner.subtitle} ${data.solutions_title} ${data.solutions.map(s => s.text).join(' ')} ${data.desktop_info.text} ${data.advisory.title} ${data.advisory.paragraph} ${faqContent}`;
  
  // Extrair palavras-chave principais
  const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  const keywords = Object.entries(wordCount)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([word]) => word);
    
  return { keywords, content };
};

// Função de auto-geração de meta descriptions
const generateMetaDescription = (data: LandingPageData, customKeywords?: string[]): string => {
  const { keywords } = analyzeContent(data);
  const finalKeywords = customKeywords && customKeywords.length > 0 ? customKeywords : keywords;
  const mainKeyword = finalKeywords[0] || 'tecnologia';
  
  if (data.banner.subtitle.length <= 150) {
    return data.banner.subtitle;
  }
  
  const shortDesc = `${data.banner.title.split(':')[0]} - ${finalKeywords.slice(0, 3).join(', ')} com qualidade profissional e resultados garantidos.`;
  return shortDesc.length <= 160 ? shortDesc : shortDesc.substring(0, 157) + '...';
};

// Função de auto-geração de títulos SEO
const generateSEOTitle = (data: LandingPageData, customKeywords?: string[]): string => {
  const { keywords } = analyzeContent(data);
  const finalKeywords = customKeywords && customKeywords.length > 0 ? customKeywords : keywords;
  const mainKeyword = finalKeywords[0] || 'tecnologia';
  
  const baseTitle = data.banner.title.split(':')[0] || data.banner.title;
  const titleWithKeyword = `${baseTitle} - ${mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1)} Profissional`;
  
  return titleWithKeyword.length <= 60 ? titleWithKeyword : baseTitle;
};

// Função de auto-geração de alt-text para imagens
const generateImageAltText = (image: ImageData, context: string): string => {
  if (image.alt && image.alt !== '') return image.alt;
  
  const contextWords = context.toLowerCase().split(' ').slice(0, 3).join(' ');
  return `Imagem ${contextWords} - Smart Dent tecnologia odontológica`;
};

// 🔧 FUNÇÃO SANITIZAÇÃO APRIMORADA - Evita URLs duplicadas
const sanitizeDomain = (domain: string): string => {
  if (!domain) return '';
  
  // Log para debugging
  console.log('🔧 Editor - Sanitizando domain:', domain);
  
  let cleaned = domain
    .trim()
    .replace(/^https?:\/\/+/g, '') // Remove protocolos múltiplos
    .replace(/^www\.+/g, '') // Remove www múltiplos
    .replace(/\/+$/g, '') // Remove barras finais
    .replace(/\/+/g, '/'); // Normaliza barras múltiplas
  
  // Detectar e corrigir duplicações específicas
  if (cleaned.includes('https://')) {
    console.warn('⚠️ Editor - Domain contém protocolo residual:', cleaned);
    cleaned = cleaned.replace(/https?:\/\/+/g, '');
  }
  
  console.log('✅ Editor - Domain sanitizado:', cleaned);
  return cleaned;
};

// 🔧 FUNÇÃO CANONICAL URL APRIMORADA - Evita duplicações
const generateCanonicalUrl = (domain: string, slug: string): string => {
  const cleanDomain = sanitizeDomain(domain);
  const cleanSlug = slug?.replace(/^\//, '') || '';
  
  const canonical = `https://${cleanDomain}/${cleanSlug}`;
  console.log('🔧 Editor - Canonical URL gerada:', canonical);
  
  // Validação final para evitar duplicações
  if (canonical.includes('https://https://')) {
    console.error('❌ Editor - Canonical URL duplicada detectada:', canonical);
    return canonical.replace(/https:\/\/https:\/\/+/g, 'https://');
  }
  
  return canonical;
};

// Função onSave para herança e autocompletar com automação
const onSave = (data: LandingPageData): LandingPageData => {
  const processedData = { ...data };
  
  // Automação SEO se habilitada
  if (data.seo.hreflang_auto) {
    // Auto-gerar meta description se vazia
    if (!processedData.seo_description || processedData.seo_description === 'Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.') {
      processedData.seo_description = generateMetaDescription(data);
    }
    
    // Auto-gerar SEO title se padrão
    if (!processedData.seo_title || processedData.seo_title === 'Smart Dent - Sistema de Gestão Odontológica') {
      processedData.seo_title = generateSEOTitle(data);
    }
    
    // Auto-gerar alt-text para imagens principais
    processedData.banner.images = processedData.banner.images.map((img, idx) => ({
      ...img,
      alt: generateImageAltText(img, `banner imagem ${idx + 1} ${data.banner.title}`)
    }));
    
    processedData.solutions = processedData.solutions.map((solution, idx) => ({
      ...solution,
      image: {
        ...solution.image,
        alt: generateImageAltText(solution.image, `solução ${idx + 1} ${solution.text.substring(0, 30)}`)
      }
    }));
  }
  
  // 🎯 CORREÇÃO 1: Meta Robots - Garantir valor padrão se vazio
  if (!processedData.seo.meta_robots || processedData.seo.meta_robots.trim() === '') {
    processedData.seo.meta_robots = 'index, follow';
  }
  
  // 🎯 CORREÇÃO 2: URL Canônica - Evitar duplicação de https://
  if (!processedData.seo.canonical_url && processedData.seo.domain && processedData.seo_title) {
    const slug = processedData.seo_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    processedData.seo.canonical_url = generateCanonicalUrl(processedData.seo.domain, slug);
  } else if (processedData.seo.canonical_url && processedData.seo.domain) {
    // Sanitizar URL canônica existente para evitar duplicação
    const urlParts = processedData.seo.canonical_url.split('/');
    const slug = urlParts[urlParts.length - 1] || '';
    processedData.seo.canonical_url = generateCanonicalUrl(processedData.seo.domain, slug);
  }
  
  // 🎯 CORREÇÃO 3: Tags Sociais - Implementar fallbacks automáticos
  // Open Graph fallbacks
  if (!processedData.seo.og_title || processedData.seo.og_title.trim() === '') {
    processedData.seo.og_title = processedData.seo_title || processedData.seo.seo_title || '';
  }
  if (!processedData.seo.og_description || processedData.seo.og_description.trim() === '') {
    processedData.seo.og_description = processedData.seo_description || '';
  }
  if (!processedData.seo.og_type || processedData.seo.og_type.trim() === '') {
    processedData.seo.og_type = 'website';
  }
  if (!processedData.seo.og_site_name || processedData.seo.og_site_name.trim() === '') {
    processedData.seo.og_site_name = processedData.brand?.legal_name || '';
  }
  
  // Twitter Cards fallbacks
  if (!processedData.seo.twitter_card || processedData.seo.twitter_card.trim() === '') {
    processedData.seo.twitter_card = 'summary_large_image';
  }
  if (!processedData.seo.twitter_title || processedData.seo.twitter_title.trim() === '') {
    processedData.seo.twitter_title = processedData.seo.og_title || processedData.seo_title || '';
  }
  if (!processedData.seo.twitter_description || processedData.seo.twitter_description.trim() === '') {
    processedData.seo.twitter_description = processedData.seo.og_description || processedData.seo_description || '';
  }
  if (!processedData.seo.twitter_image.src || processedData.seo.twitter_image.src.trim() === '') {
    processedData.seo.twitter_image = processedData.seo.og_image || { 
      mode: 'url' as const,
      src: '', 
      alt: '', 
      scale: 1 
    };
  }
  
  // Sincronizar campos SEO principais
  if (processedData.seo_title && processedData.seo_title !== processedData.seo.seo_title) {
    processedData.seo.seo_title = processedData.seo_title;
  }
  if (processedData.seo.seo_title && processedData.seo.seo_title !== processedData.seo_title) {
    processedData.seo_title = processedData.seo.seo_title;
  }
  
  // 🎯 CORREÇÃO 4: Schema Markup - Garantir que hreflang_auto está habilitado
  // (A geração do schema já está implementada no template-engine.ts)
  
  // 🎯 CORREÇÃO 5: Fallback automático para imagem OG - Priorizar Soluções 1
  if (!processedData.seo.og_image.src) {
    // 1ª prioridade: Imagem da Soluções 1
    if (processedData.solutions && processedData.solutions.length > 0 && processedData.solutions[0].image.src) {
      processedData.seo.og_image = {
        ...processedData.solutions[0].image,
        alt: 'Imagem OG - ' + processedData.solutions[0].text.substring(0, 50)
      };
      console.info('✅ Imagem OG definida automaticamente usando Soluções 1');
    }
    // 2ª prioridade: Fallback para banner (caso não haja soluções)
    else if (processedData.banner.images && processedData.banner.images.length > 0) {
      processedData.seo.og_image = {
        ...processedData.banner.images[0],
        alt: 'Imagem OG - ' + processedData.banner.title
      };
      console.info('✅ Imagem OG definida automaticamente usando primeira imagem do banner (fallback)');
    }
  }
  
  // Validações e avisos
  if (processedData.seo_title && processedData.seo_title.length > 60) {
    console.warn('⚠️ SEO Title muito longo (>60 caracteres)');
  }
  if (processedData.seo_description && processedData.seo_description.length > 160) {
    console.warn('⚠️ SEO Description muito longa (>160 caracteres)');
  }
  
  // Log das correções aplicadas
  console.info('✅ SEO Fixes Applied:', {
    meta_robots: processedData.seo.meta_robots,
    canonical_url: processedData.seo.canonical_url,
    og_fallbacks: !!processedData.seo.og_title,
    twitter_fallbacks: !!processedData.seo.twitter_title,
    schema_auto: processedData.seo.hreflang_auto
  });
  
  return processedData;
};

// Função onApprove para lastmod e sitemap
const onApprove = (data: LandingPageData): LandingPageData => {
  const processedData = { ...data };
  
  // Atualizar lastmod
  processedData.seo.lastmod = new Date().toISOString();
  
  // TODO: Enfileirar sitemap:update
  console.log('Sitemap update enfileirado para:', processedData.name);
  
  return processedData;
};

const EditorContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const { getLandingPage, updateLandingPage, addLandingPage } = useLandingPages();
  const [extractingProduct, setExtractingProduct] = useState<number | null>(null);
  const [editingOffer, setEditingOffer] = useState<number | null>(null);
  
  // Estados para campos editáveis da Automação SEO
  const [autoKeywords, setAutoKeywords] = useState<string[]>([]);

  // Helper functions for keywords management
  const parseKeywords = (keywords: any): string[] => {
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === 'string') {
      return keywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    return [];
  };

  const stringifyKeywords = (keywords: string[]): string => {
    return keywords.join(', ');
  };

  // Handle navigation issues - redirect to valid ID if undefined
  useEffect(() => {
    if (id === 'undefined' || !id) {
      // Try to get first available landing page
      const landingPages = Object.keys(localStorage).filter(key => 
        key.startsWith('landing_page_') && !key.includes('undefined')
      );
      
      if (landingPages.length > 0) {
        const firstValidId = landingPages[0].replace('landing_page_', '');
        navigate(`/editor/${firstValidId}`, { replace: true });
        return;
      } else {
        toast({
          title: "ID inválido",
          description: "Redirecionando para o dashboard...",
          variant: "destructive"
        });
        navigate('/dashboard', { replace: true });
        return;
      }
    }
  }, [id, navigate, toast]);
  const [autoMetaDesc, setAutoMetaDesc] = useState('');
  const [autoSeoTitle, setAutoSeoTitle] = useState('');
  const [aiLoading, setAiLoading] = useState({ hidden: false, keywords: false, meta: false, title: false, faqKeywords: false, blog: false });
  
  const [previewTab, setPreviewTab] = useState('landing-preview');
  const [blogPostData, setBlogPostData] = useState<any>(null);
  const [generatingBlog, setGeneratingBlog] = useState(false);
  
  // Função para aplicar valores automáticos aos campos principais
  const applyAutoSEOValues = () => {
    setData(prev => ({
      ...prev,
      seo_title: autoSeoTitle || generateSEOTitle(data),
      seo_description: autoMetaDesc || generateMetaDescription(data),
      seo: {
        ...prev.seo,
        seo_title: autoSeoTitle || generateSEOTitle(data),
        seo_description: autoMetaDesc || generateMetaDescription(data)
      }
    }));
    toast({
      title: "Valores SEO aplicados",
      description: "Os valores gerados automaticamente foram aplicados aos campos principais.",
    });
  };
  
  // Função para regenerar valores baseado nas palavras-chave editadas
  const regenerateAutoValues = () => {
    const { keywords } = analyzeContent(data);
    const finalKeywords = autoKeywords.length > 0 ? autoKeywords : keywords;
    
    // Regenerar meta description e title usando as palavras-chave editadas
    const newMetaDesc = generateMetaDescription(data, finalKeywords);
    const newSeoTitle = generateSEOTitle(data, finalKeywords);
    
    setAutoMetaDesc(newMetaDesc);
    setAutoSeoTitle(newSeoTitle);
    
    toast({
      title: "Conteúdo regenerado",
      description: "Meta description e título SEO foram regenerados com base nas suas palavras-chave.",
    });
  };
  
  const { breadcrumbs } = useBreadcrumbs();
  const [data, setData] = useState<LandingPageData>({
    name: 'Smart Dent Campanha Q1',
    status: 'draft',
    template: 'Smart Dent Base v1',
    seo_title: 'Smart Dent - Sistema de Gestão Odontológica',
    seo_description: 'Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.',
    
    // Configuração de incorporação
    embed: {
      mode: 'selflux',
      namespace: 'sd'
    },
    
    // SEO & Social
    seo: {
      domain: 'www.smartdent.com.br',
      seo_title: 'Smart Dent - Sistema de Gestão Odontológica',
      seo_description: 'Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.',
      canonical_url: '',
      meta_robots: 'index, follow',
      og_title: '',
      og_description: '',
      og_image: createImageData(),
      og_type: 'website',
      og_site_name: 'Smart Dent',
      twitter_card: 'summary_large_image',
      twitter_title: '',
      twitter_description: '',
      twitter_image: createImageData(),
      twitter_site: '@smartdent',
      twitter_creator: '@smartdent',
      hreflang: [],
      hreflang_auto: false,
      publish_date: new Date().toISOString(),
      lastmod: new Date().toISOString(),
      faq_enable: true,
      intelligent_links: {}
    },
    
    // Schema & Offers
    schema: {
      software_app: {
        name: 'Smart Dent',
        category: 'HealthApplication',
        rating_value: '4.8',
        rating_count: '150',
        price: '0',
        price_currency: 'BRL',
        operating_system: 'Web',
        application_category: 'HealthApplication'
      },
      google_reviews: {
        url: '',
        auto_extract: false,
        last_extracted: '',
        status: 'idle'
      },
      offers: [],
      breadcrumb: []
    },
    
    // Marca & Confiança
    brand: {
      legal_name: 'Smart Dent Tecnologia Ltda',
      same_as: [],
      policies: {
        privacy_url: '',
        terms_url: '',
        security_url: '',
        cookies_url: ''
      }
    },
    
    logo_url: createImageData('https://via.placeholder.com/140x40?text=LOGO', 'Smart Dent Logo'),
    logo_alt: 'Smart Dent Logo',
    menu: [
      { label: 'Institucional', href: 'https://smartdent.com.br/institucional' },
      { label: 'Resinas', href: 'https://smartdent.com.br/resinas3d' },
      { label: 'Scanner intraoral', href: 'https://smartdent.com.br/odontologia-digital-scanners-intraorais' },
      { label: 'Contato', href: 'https://smartdent.com.br/#institucional' }
    ],
    banner: {
      badge_text: 'Smart Dent 16 anos de inovação',
      title: 'Odontologia Digital: simples, eficiente e lucrativa',
      subtitle: 'A Smart Dent é uma referência em odontologia digital no Brasil, combinando tecnologia avançada, automação eficiente e qualidade.',
      cta_primary: { label: 'Falar com comercial', href: 'https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es' },
      cta_secondary: { label: 'Loja online', href: 'https://loja.smartdent.com.br/' },
      images: [
        createImageData('https://via.placeholder.com/200x300?text=Imagem1', 'Pessoa sorrindo'),
        createImageData('https://via.placeholder.com/200x300?text=Imagem2', 'Equipamento odontológico'),
        createImageData('https://via.placeholder.com/200x300?text=Imagem3', 'Consultório moderno')
      ]
    },
    solutions_title: 'Soluções de alto padrão para inovar sua clínica',
    solutions: [
      { 
        text: 'Resinas 3D: material biocompatível com alta resistência e acabamento superior para restaurações duradouras.',
        image: createImageData('https://via.placeholder.com/200x150?text=Resinas', 'Resinas 3D de alta qualidade'),
        containerScale: 1.0
      },
      { 
        text: 'Scanner intraoral: precisão milimétrica para diagnósticos certeiros e tratamentos mais eficazes.',
        image: createImageData('https://via.placeholder.com/200x150?text=Scanner', 'Scanner intraoral de última geração'),
        containerScale: 1.0
      }
    ],
    desktop_info: {
      title: 'Excelência em Odontologia Digital',
      text: 'Com mais de 10 anos de experiência no mercado, a Smart Dent se consolidou como referência em soluções tecnológicas para clínicas odontológicas. Nossa missão é democratizar o acesso à tecnologia de ponta, oferecendo equipamentos, materiais e consultoria especializada para profissionais que buscam excelência.',
      visible_desktop: true,
      visible_mobile: true,
      show_table: false,
      table_title: 'Especificações Técnicas',
      table_headers: ['Propriedade', 'Requisito', 'Resultado', 'Padrão ISO'],
      table_data: [
        { 'Propriedade': 'Performance', 'Requisito': 'Alta', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 9001' },
        { 'Propriedade': 'Segurança', 'Requisito': 'Máxima', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 27001' },
        { 'Propriedade': 'Qualidade', 'Requisito': 'Premium', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 14001' }
      ]
    },
    offers_section: {
      visible_desktop: true,
      visible_mobile: true,
      title: 'Ofertas Especiais',
      subtitle: 'Produtos em destaque com preços promocionais'
    },
    resources_section: {
      visible_desktop: false,
      visible_mobile: false,
      title: 'Recursos e Downloads',
      subtitle: 'Materiais técnicos e informações dos produtos'
    },
    advisory: {
      title: 'Consultoria personalizada para o seu negócio',
      paragraph: 'Nossa equipe de especialistas oferece consultoria completa para implementação de odontologia digital em clínicas de todos os portes.',
      visible_desktop: true,
      visible_mobile: true,
      cta: { label: 'Agendar consultoria', href: 'https://smartdent.com.br/consultoria' },
      image: createImageData('https://via.placeholder.com/400x300?text=Consultoria', 'Equipe de consultores especializados')
    },
    solutions_section: {
      visible_desktop: true,
      visible_mobile: true
    },
    faq_section: {
      visible_desktop: true,
      visible_mobile: true
    },
    faq_title: 'Perguntas frequentes',
    faq: [
      {
        question: 'Como funciona a garantia dos equipamentos?',
        answer: 'Todos os equipamentos possuem garantia de 2 anos contra defeitos de fabricação, além do suporte técnico especializado.'
      },
      {
        question: 'Vocês oferecem treinamento?',
        answer: 'Sim, oferecemos treinamento completo para toda a equipe, incluindo certificação em odontologia digital.'
      }
    ],
    cta_final: {
      title: 'Pronto para revolucionar sua clínica?',
      paragraph: 'Entre em contato conosco e descubra como a Smart Dent pode transformar seu consultório com tecnologia de ponta.',
      primary: { label: 'Falar com especialista', href: 'https://wa.me/5516993831794' },
      secondary: { label: 'Ver produtos', href: 'https://loja.smartdent.com.br/' }
    },
    footer_links_title: 'Encontre-nos',
    footer: {
      locations: [
        { title: 'Ribeirão Preto - SP', address: 'Rua Exemplo, 123 - Centro' },
        { title: 'São Paulo - SP', address: 'Av. Paulista, 456 - Bela Vista' }
      ],
      links: [
        { label: 'Sobre nós', href: 'https://smartdent.com.br/sobre' },
        { label: 'Produtos', href: 'https://loja.smartdent.com.br/' },
        { label: 'Contato', href: 'https://smartdent.com.br/contato' },
        { label: 'Política de Privacidade', href: 'https://smartdent.com.br/privacidade' }
      ],
      social: [
        { platform: 'instagram', href: 'https://instagram.com/smartdent', icon_src: '', icon_alt: 'Instagram Smart Dent' },
        { platform: 'facebook', href: 'https://facebook.com/smartdent', icon_src: '', icon_alt: 'Facebook Smart Dent' }
      ]
    },
    email: {
      // Configurações de visibilidade das seções
      sections: {
        header: { enabled: true },
        content: { enabled: true },
        ctas: { enabled: true },
        highlights: { enabled: true },
        benefits: { enabled: true },
        main_image: { enabled: true },
        solutions: { enabled: false },
        footer: { enabled: true }
      },
      // Campos do email existentes
      assunto_email: 'Novidades Smart Dent - Odontologia Digital',
      preheader_texto: 'Conheça as últimas inovações em tecnologia odontológica',
      url_site: 'https://smartdent.com.br',
      logo_src: createImageData('https://via.placeholder.com/140x40?text=LOGO', 'Smart Dent Logo'),
      logo_alt: 'Smart Dent Logo',
      selo: 'LÍDER EM INOVAÇÃO',
      titulo_principal: 'Transforme sua clínica com tecnologia de ponta',
      subtitulo: 'Descubra as soluções que estão revolucionando a odontologia no Brasil',
      cta_href: 'https://smartdent.com.br/produtos',
      cta_label: 'Ver Produtos',
      cta_subcopy: 'Acesso imediato ao catálogo completo',
      bloco1_titulo: 'Resinas 3D Premium',
      bloco1_texto: 'Material biocompatível com resistência superior',
      bloco2_titulo: 'Scanner Intraoral',
      bloco2_texto: 'Precisão milimétrica para diagnósticos certeiros',
      beneficio_1: '98% de satisfação dos clientes',
      beneficio_2: '16 anos de experiência no mercado',
      beneficio_3: 'Suporte técnico especializado',
      imagem_href: 'https://smartdent.com.br/produtos',
      imagem_src: createImageData('https://via.placeholder.com/300x200?text=Produto', 'Equipamentos Smart Dent'),
      imagem_alt: 'Equipamentos Smart Dent',
      cta2_href: 'https://wa.me/5516993831794',
      cta2_label: 'Falar com Especialista',
      brand_name: 'Smart Dent',
      endereco_completo: 'Rua Exemplo, 123 - Centro, Ribeirão Preto - SP',
      link_suporte: 'https://smartdent.com.br/suporte',
      link_descadastro: 'https://smartdent.com.br/descadastro',
      link_preferencias: 'https://smartdent.com.br/preferencias',
      // Campos de compatibilidade
      show_solutions_in_email: false,
      solutions_title: 'Nossos Serviços'
    }
  });

  // Gerar HTML baseado nos dados processados
  const generatedHTML = useMemo(() => {
    const processedData = beforePreview(data);
    const embedConfig = getEmbedConfig(data);
    
    console.log('🎯 Current embed config:', data.embed);
    console.log('🎯 Processed embed config:', embedConfig);
    
    // Usar generateSafeHTML se for modo SelFlux
    if (embedConfig.mode === 'selflux') {
      console.log('🚀 Editor: Using SelFlux mode with config:', embedConfig);
      return generateSafeHTML({
        ...processedData,
        // Converter ImageData para formato compatível com template
        logo_url: processedData.logo_url.src,
        banner: {
          ...processedData.banner,
          images: processedData.banner.images.map(img => ({
            image: {
              src: img.src,
              alt: img.alt,
              scale: img.scale,
              href: img.href
            }
          }))
        },
        solutions: processedData.solutions.map((s, index) => {
          // Auto-generate size and sizeType based on index for asymmetric grid layout
          let size = "control-item-medium";
          let sizeType = "medium";
          
          if (index === 0) {
            size = "control-item-large";
            sizeType = "large";
          } else if (index < 6) {
            size = "control-item-medium";
            sizeType = "medium";
          } else {
            size = "control-item-small";
            sizeType = "small";
          }
          
          return {
            ...s,
            image: {
              src: s.image.src,
              alt: s.image.alt,
              scale: s.image.scale
            },
            size,
            sizeType
          };
        }),
        advisory: {
          ...processedData.advisory,
          image: {
            src: processedData.advisory.image.src,
            alt: processedData.advisory.image.alt,
            scale: processedData.advisory.image.scale
          }
        }
      }, embedConfig);
    }
    
    // Modo padrão
    console.log('🚀 Editor: Using default mode');
    return generateHTML({
      ...processedData,
      // Converter ImageData para formato compatível com template
      logo_url: processedData.logo_url.src,
      banner: {
        ...processedData.banner,
        images: processedData.banner.images.map(img => ({
          src: img.src,
          alt: img.alt,
          scale: img.scale,
          href: img.href
        }))
      },
      solutions: processedData.solutions.map((s, index) => {
        // Auto-generate size and sizeType based on index for asymmetric grid layout
        let size = "control-item-medium";
        let sizeType = "medium";
        
        if (index === 0) {
          size = "control-item-large";
          sizeType = "large";
        } else if (index < 6) {
          size = "control-item-medium";
          sizeType = "medium";
        } else {
          size = "control-item-small";
          sizeType = "small";
        }
        
        return {
          ...s,
          image: {
            src: s.image.src,
            alt: s.image.alt,
            scale: s.image.scale
          },
          size,
          sizeType
        };
      }),
      advisory: {
        ...processedData.advisory,
        image: {
          src: processedData.advisory.image.src,
          alt: processedData.advisory.image.alt,
          scale: processedData.advisory.image.scale
        }
      }
    });
  }, [data]);

  // Função para gerar blog post usando IA
  const generateBlogPost = async (fastMode = false) => {
    setGeneratingBlog(true);
    
    // Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      toast({
        title: "Timeout",
        description: "Geração demorou muito. Tente o modo rápido ou verifique sua conexão.",
        variant: "destructive"
      });
      setGeneratingBlog(false);
    }, 60000); // 60 segundos

    try {
      // Mensagem de progresso
      const progressToast = toast({
        title: "Gerando blog...",
        description: fastMode ? "Modo rápido com conteúdo da landing page" : "Usando todo conteúdo da landing page",
      });

      // Coletar todo o conteúdo da landing page
      const fullContent = {
        banner: {
          title: data.banner.title,
          subtitle: data.banner.subtitle
        },
        solutions: {
          title: data.solutions_title,
          items: data.solutions.map((s, index) => ({
            text: s.text,
            image: s.image,
            isFirstSolution: index === 0 // Para usar como capa
          }))
        },
        faq: {
          title: data.faq_title,
          items: data.faq.map(f => ({
            question: f.question,
            answer: f.answer
          }))
        },
        seo: {
          hidden_content: data.seo.seo_hidden_content,
          description: data.seo_description
        }
      };

      // Gerar conteúdo do blog usando IA com todo o conteúdo da landing page
      const { data: blogContentResult, error: blogError } = await supabase.functions.invoke('ai-seo-generator', {
        body: {
          type: 'blog_content',
          content: data.seo.seo_hidden_content?.trim() || data.seo_description?.trim() || data.banner.title,
          title: data.seo_title || data.banner.title,
          fullLandingPageContent: fullContent,
          speed: fastMode ? 'fast' : 'detailed'
        },
      });

      if (blogError) throw blogError;

      const blogData = {
        title: blogContentResult.title || `${data.banner.title} - Guia Completo`,
        content: blogContentResult.content || '',
        meta_description: blogContentResult.meta_description || data.seo_description,
        keywords: blogContentResult.keywords || [],
        created_at: new Date().toISOString(),
        landing_page_id: parseInt(id!),
        landing_page_title: data.banner.title,
        landing_page_url: data.seo.canonical_url,
        cover_image: data.solutions[0]?.image, // Usar primeira solução como capa
        content_images: data.solutions.slice(1, 5).map(s => s.image).filter(Boolean), // Soluções 2-5
      };

      setBlogPostData(blogData);
      setPreviewTab('blog-preview');
      toast({ title: "Sucesso!", description: "Blog post gerado com sucesso!" });
    } catch (error) {
      console.error('Erro ao gerar blog post:', error);
      toast({ title: "Erro", description: "Erro ao gerar blog post. Tente novamente." });
    } finally {
      clearTimeout(timeoutId);
      setGeneratingBlog(false);
    }
  };

  const generatedEmailHTML = useMemo(() => {
    const processedData = beforePreview(data);
    const embedConfig = getEmbedConfig({ embed: data.embed });
    
    console.log("🔄 Regenerando email HTML...", {
      timestamp: Date.now(),
      show_solutions: processedData.email.show_solutions_in_email,
      solutions_count: processedData.solutions?.length || 0,
      solutions_with_images: processedData.solutions?.filter(s => s.image?.src).length || 0
    });
    
    // Validar soluções quando habilitadas
    if (processedData.email.show_solutions_in_email && (!processedData.solutions || processedData.solutions.length === 0)) {
      console.warn("⚠️ Soluções habilitadas no email mas nenhuma solução encontrada");
    }
    
    // Usar generateSafeEmailHTML se for modo SelFlux
    if (embedConfig.mode === 'selflux') {
      return generateSafeEmailHTML({
        ...processedData.email,
        logo_src: processedData.email.logo_src.src,
        imagem_src: processedData.email.imagem_src.src,
        imagem_alt: processedData.email.imagem_src.alt
      }, embedConfig);
    }
    
    // Corrigir mapeamento das soluções para o email
    const solutionsList = processedData.solutions?.map((solution: any, index: number) => ({
      title: solution.title || `Solução ${index + 1}`,
      description: solution.text || solution.description || '',
      image_src: solution.image?.src || '',
      image_alt: solution.image?.alt || solution.title || `Solução ${index + 1}`
    })) || [];
    
    console.log("📧 Dados do email processados:", {
      solutions_enabled: processedData.email.show_solutions_in_email,
      solutions_count: solutionsList.length,
      solutions_preview: solutionsList.map(s => ({ 
        title: s.title, 
        has_image: !!s.image_src,
        image_url: s.image_src ? s.image_src.substring(0, 50) + '...' : 'sem imagem'
      }))
    });
    
    // Validar se há soluções com imagens quando habilitado
    const validSolutions = solutionsList.filter(s => s.image_src);
    if (processedData.email.show_solutions_in_email && validSolutions.length === 0) {
      console.warn("⚠️ Cards de soluções habilitados mas nenhuma solução tem imagem válida");
    }
    
    // Modo padrão - incluir soluções no email
    return generateEmailHTML({
      ...processedData.email,
      logo_src: processedData.email.logo_src.src,
      imagem_src: processedData.email.imagem_src.src,
      imagem_alt: processedData.email.imagem_src.alt,
      show_solutions_in_email: processedData.email.sections?.solutions?.enabled || processedData.email.show_solutions_in_email || false,
      solutions_title: processedData.email.solutions_title || "Nossos Serviços",
      solutions_list: solutionsList
    });
  }, [
    // Campos principais do email
    data.email.assunto_email,
    data.email.preheader_texto,
    data.email.url_site,
    data.email.logo_src.src,
    data.email.logo_alt,
    data.email.selo,
    data.email.titulo_principal,
    data.email.subtitulo,
    data.email.cta_label,
    data.email.cta_href,
    data.email.cta_subcopy,
    data.email.bloco1_titulo,
    data.email.bloco1_texto,
    data.email.bloco2_titulo,
    data.email.bloco2_texto,
    data.email.beneficio_1,
    data.email.beneficio_2,
    data.email.beneficio_3,
    data.email.imagem_href,
    data.email.imagem_src.src,
    data.email.imagem_src.alt,
    data.email.cta2_label,
    data.email.cta2_href,
    data.email.brand_name,
    data.email.endereco_completo,
    data.email.link_suporte,
    data.email.link_descadastro,
    data.email.link_preferencias,
    // Campos de soluções
    data.email.sections?.solutions?.enabled,
    data.email.show_solutions_in_email,
    data.email.solutions_title,
    JSON.stringify(data.solutions),
    // Outros campos relevantes
    data.brand.legal_name,
    data.seo.domain,
    data.embed?.mode
  ]);

  // Gerar HTML do blog post
  const generatedBlogHTML = useMemo(() => {
    if (!blogPostData) return '<div style="padding: 2rem; text-align: center; color: #666;">Clique em "🚀 Gerar Blog" para visualizar o blog post</div>';

    try {
      return generateBlogHTML(blogPostData, data);
    } catch (error) {
      console.error('Erro ao gerar HTML do blog:', error);
      return '<div style="padding: 2rem; text-align: center; color: #f00;">Erro ao gerar preview do blog</div>';
    }
  }, [blogPostData, data]);

  // Calcular score SEO de forma eficiente com useMemo
  const seoScore = useMemo(() => computeSEOScore(data), [
    data.seo_title,
    data.seo_description,
    data.seo.canonical_url,
    data.seo.og_image.src,
    data.seo.og_title,
    data.seo.og_description,
    data.seo.twitter_card,
    data.seo.meta_robots,
    data.banner.title,
    data.seo.faq_enable,
    data.faq?.length
  ]);

  useEffect(() => {
    if (id) {
      const landingPage = getLandingPage(id);
      if (landingPage) {
        // Se há dados estruturados, usar direto mas garantir campos obrigatórios
        if (landingPage.data && typeof landingPage.data === 'object') {
          const loadedData = { ...landingPage.data, template: landingPage.template } as LandingPageData;
          
          // Garantir que todos os campos obrigatórios existam (defaults seguros)
          if (!loadedData.desktop_info) {
            loadedData.desktop_info = { 
              title: '', 
              text: '', 
              visible_desktop: false,
              visible_mobile: false, 
              show_table: false, 
              table_title: 'Especificações Técnicas',
              table_headers: ['Propriedade', 'Requisito', 'Resultado', 'Padrão ISO'],
              table_data: [
                { 'Propriedade': 'Performance', 'Requisito': 'Alta', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 9001' },
                { 'Propriedade': 'Segurança', 'Requisito': 'Máxima', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 27001' },
                { 'Propriedade': 'Qualidade', 'Requisito': 'Premium', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 14001' }
              ]
            };
          }
          if (!loadedData.offers_section) {
            loadedData.offers_section = {
              visible_desktop: true,
              visible_mobile: true,
              title: 'Ofertas Especiais',
              subtitle: 'Produtos em destaque com preços promocionais'
            };
          }
          if (!loadedData.resources_section) {
            loadedData.resources_section = {
              visible_desktop: false,
              visible_mobile: false,
              title: 'Recursos e Downloads',
              subtitle: 'Materiais técnicos e informações dos produtos'
            };
          }
          
          // Garantir que todos os campos ImageData existem
          if (!loadedData.logo_url || typeof (loadedData.logo_url as any) === 'string') {
            loadedData.logo_url = createImageData(typeof (loadedData.logo_url as any) === 'string' ? (loadedData.logo_url as any) : '', loadedData.logo_alt || '');
          }
          if (!loadedData.seo?.og_image) {
            loadedData.seo = { ...loadedData.seo, og_image: createImageData() } as any;
          }
          if (!loadedData.seo?.twitter_image) {
            loadedData.seo = { ...loadedData.seo, twitter_image: createImageData() } as any;
          }
          if (!loadedData.email?.logo_src) {
            loadedData.email = { ...loadedData.email, logo_src: createImageData() } as any;
          }
          if (!loadedData.email?.imagem_src) {
            loadedData.email = { ...loadedData.email, imagem_src: createImageData() } as any;
          }
          
          // Garantir campos SEO específicos
          if (!loadedData.seo?.intelligent_links) {
            loadedData.seo = { ...loadedData.seo, intelligent_links: {} } as any;
          }
          if (!loadedData.seo?.ai_keywords) {
            loadedData.seo = { ...loadedData.seo, ai_keywords: '' } as any;
          }
          
          // Garantir bloco google_reviews para compatibilidade retroativa
          if (!loadedData.schema) {
            loadedData.schema = {
              software_app: {
                name: 'Smart Dent',
                category: 'HealthApplication',
                rating_value: '4.8',
                rating_count: '150',
                price: '0',
                price_currency: 'BRL',
                operating_system: 'Web',
                application_category: 'HealthApplication'
              },
              offers: [],
              breadcrumb: [],
              google_reviews: { url: '', auto_extract: false, last_extracted: '', status: 'idle' }
            } as any;
          } else if (!(loadedData as any).schema.google_reviews) {
            loadedData.schema = {
              ...(loadedData.schema as any),
              google_reviews: { url: '', auto_extract: false, last_extracted: '', status: 'idle' }
            } as any;
          }
          
          // Garantir bloco banner para evitar undefined.title
          if (!loadedData.banner) {
            loadedData.banner = {
              badge_text: '',
              title: '',
              subtitle: '',
              cta_primary: { label: '', href: '' },
              cta_secondary: { label: '', href: '' },
              images: [createImageData()]
            } as any;
          } else {
            loadedData.banner = {
              ...loadedData.banner,
              badge_text: loadedData.banner.badge_text || '',
              title: loadedData.banner.title || '',
              subtitle: loadedData.banner.subtitle || '',
              cta_primary: loadedData.banner.cta_primary || { label: '', href: '' },
              cta_secondary: loadedData.banner.cta_secondary || { label: '', href: '' },
              images: Array.isArray(loadedData.banner.images) && loadedData.banner.images.length ? loadedData.banner.images : [createImageData()]
            } as any;
          }
          
          setData(loadedData);
        } else {
          // Migrar dados antigos para novo formato se necessário
          const migratedData: any = { ...landingPage.data || {} };
          if (typeof migratedData.logo_url === 'string') {
            migratedData.logo_url = createImageData(migratedData.logo_url, migratedData.logo_alt || '');
          }
          if (!migratedData.desktop_info) {
            migratedData.desktop_info = { 
              title: '', 
              text: '', 
              visible_desktop: false,
              visible_mobile: false, 
              show_table: false, 
              table_title: 'Especificações Técnicas',
              table_headers: ['Propriedade', 'Requisito', 'Resultado', 'Padrão ISO'],
              table_data: [
                { 'Propriedade': 'Performance', 'Requisito': 'Alta', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 9001' },
                { 'Propriedade': 'Segurança', 'Requisito': 'Máxima', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 27001' },
                { 'Propriedade': 'Qualidade', 'Requisito': 'Premium', 'Resultado': 'Aprovado', 'Padrão ISO': 'ISO 14001' }
              ]
            };
          }
          if (!migratedData.offers_section) {
            migratedData.offers_section = {
              visible_desktop: true,
              visible_mobile: true,
              title: 'Ofertas Especiais',
              subtitle: 'Produtos em destaque com preços promocionais'
            };
          }
          if (!migratedData.resources_section) {
            migratedData.resources_section = {
              visible_desktop: false,
              visible_mobile: false,
              title: 'Recursos e Downloads',
              subtitle: 'Materiais técnicos e informações dos produtos'
            };
          }
          // Garantir bloco schema/google_reviews ao migrar
          if (!migratedData.schema) {
            migratedData.schema = {
              software_app: {
                name: 'Smart Dent',
                category: 'HealthApplication',
                rating_value: '4.8',
                rating_count: '150',
                price: '0',
                price_currency: 'BRL',
                operating_system: 'Web',
                application_category: 'HealthApplication'
              },
              offers: [],
              breadcrumb: [],
              google_reviews: { url: '', auto_extract: false, last_extracted: '', status: 'idle' }
            } as any;
          } else if (!migratedData.schema.google_reviews) {
            migratedData.schema.google_reviews = { url: '', auto_extract: false, last_extracted: '', status: 'idle' };
          }
          
          // Garantir bloco banner
          if (!migratedData.banner) {
            migratedData.banner = {
              badge_text: '',
              title: '',
              subtitle: '',
              cta_primary: { label: '', href: '' },
              cta_secondary: { label: '', href: '' },
              images: [createImageData()]
            } as any;
          } else {
            migratedData.banner = {
              ...migratedData.banner,
              badge_text: migratedData.banner.badge_text || '',
              title: migratedData.banner.title || '',
              subtitle: migratedData.banner.subtitle || '',
              cta_primary: migratedData.banner.cta_primary || { label: '', href: '' },
              cta_secondary: migratedData.banner.cta_secondary || { label: '', href: '' },
              images: Array.isArray(migratedData.banner.images) && migratedData.banner.images.length ? migratedData.banner.images : [createImageData()]
            } as any;
          }
          setData({
            ...data,
            ...migratedData,
            name: landingPage.name,
            status: landingPage.status,
            template: landingPage.template
          });
        }
      }
    }
  }, [id, getLandingPage]);

  const handleSave = () => {
    const processedData = onSave(data);
    
    const storeData = {
      name: processedData.name,
      status: processedData.status,
      template: processedData.template,
      data: processedData
    };
    
    if (id) {
      updateLandingPage(id, storeData);
      toast({
        title: "Alterações salvas",
        description: "Landing page atualizada com sucesso!",
      });
    } else {
      const newId = addLandingPage(storeData);
      navigate(`/editor/${newId}`);
      toast({
        title: "Landing page criada",
        description: "Nova landing page salva com sucesso!",
      });
    }
  };

  const extractProductData = async (index: number) => {
    const offer = data.schema.offers[index];
    if (!offer.productUrl) {
      toast({
        title: "URL necessária",
        description: "Por favor, insira a URL do produto primeiro",
        variant: "destructive",
      });
      return;
    }

    setExtractingProduct(index);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('extract-product-data', {
        body: { url: offer.productUrl }
      });

      if (error) throw error;

      if (result.success) {
        const productData = result.data;
        const newOffers = [...data.schema.offers];
        
        // Atualizar dados extraídos
        const originalPrice = productData.originalPrice;
        const promoPrice = productData.promoPrice || productData.price;
        const installmentText = productData.installmentText;
        
        // Calcular desconto automaticamente
        let discountPercentage = newOffers[index].discount_percentage || '';
        if (originalPrice && promoPrice) {
          const original = parseFloat(originalPrice.replace(/[^\d,]/g, '').replace(',', '.'));
          const promo = parseFloat(promoPrice.replace(/[^\d,]/g, '').replace(',', '.'));
          if (original > promo) {
            discountPercentage = Math.round(((original - promo) / original) * 100);
          }
        }
        
        newOffers[index] = {
          ...newOffers[index],
          name: productData.name || newOffers[index].name,
          price: promoPrice || newOffers[index].price,
          original_price: originalPrice || newOffers[index].original_price,
          installment_price: installmentText || newOffers[index].installment_price,
          discount_percentage: typeof discountPercentage === 'number' ? discountPercentage : (newOffers[index].discount_percentage || 0),
          description: productData.description || newOffers[index].description,
          image: productData.image || newOffers[index].image,
          sourceType: 'imported',
          lastUpdated: new Date().toISOString()
        };
        
        setData(prev => ({
          ...prev,
          schema: { ...prev.schema, offers: newOffers }
        }));
        
        toast({
          title: "Importação concluída!",
          description: "Dados do produto importados com sucesso!",
        });
      } else {
        throw new Error(result.error || 'Erro ao extrair dados do produto');
      }
    } catch (error) {
      console.error('Erro ao extrair dados do produto:', error);
      toast({
        title: "Erro na importação",
        description: error.message || 'Erro ao extrair dados do produto. Verifique a URL e tente novamente.',
        variant: "destructive",
      });
    } finally {
      setExtractingProduct(null);
    }
  };

  const handleApprove = () => {
    const processedData = onApprove(onSave(data));
    processedData.status = 'approved';
    
    const storeData = {
      name: processedData.name,
      status: processedData.status,
      template: processedData.template,
      data: processedData
    };
    
    if (id) {
      updateLandingPage(id, storeData);
    } else {
      const newId = addLandingPage(storeData);
      navigate(`/editor/${newId}`);
    }
    
    setData(processedData);
    toast({
      title: "Landing page aprovada",
      description: "Status alterado para aprovado e lastmod atualizado!",
    });
  };

  const handleUnapprove = () => {
    const processedData = { ...data };
    processedData.status = 'draft';
    
    const storeData = {
      name: processedData.name,
      status: processedData.status,
      template: processedData.template,
      data: processedData
    };
    
    if (id) {
      updateLandingPage(id, storeData);
    }
    
    setData(processedData);
    toast({
      title: "Landing page desaprovada",
      description: "Status alterado para rascunho!",
    });
  };

  const handlePreview = () => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(generatedHTML);
      newWindow.document.close();
    }
  };

  const handleViewCode = () => {
    const isEmailTab = previewTab === 'email-preview';
    const htmlToPass = isEmailTab ? generatedEmailHTML : generatedHTML;
    const nameToPass = isEmailTab ? `${data.name} - Email Marketing` : data.name;
    
    navigate('/code-view', { 
      state: { 
        html: htmlToPass,
        landingName: nameToPass, 
        editorId: id,
        embedConfig: data.embed // Passa config de embed para CodeView
      } 
    });
  };

  const handleCopyCode = async () => {
    const htmlToUse = previewTab === 'landing-preview' ? generatedHTML : generatedEmailHTML;
    console.log('📋 Copying HTML, length:', htmlToUse?.length);
    console.log('📋 HTML preview:', htmlToUse?.substring(0, 500));
    
    try {
      await navigator.clipboard.writeText(htmlToUse);
      toast({
        title: "Código copiado!",
        description: `Código ${previewTab === 'landing-preview' ? 'da landing page' : 'do email'} copiado para a área de transferência.`,
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código para a área de transferência.",
        variant: "destructive",
      });
    }
  };

  // Debug function - temporary
  const handleTestSelFlux = () => {
    console.log('🧪 Testing SelFlux generation...');
    console.log('🧪 Current data.embed:', data.embed);
    
    if (!data.embed || data.embed.mode !== 'selflux') {
      console.log('❌ SelFlux mode not active!');
      toast({
        title: "Atenção!",
        description: "Modo SelFlux não está ativo. Ative em 'Modo de Incorporação'.",
        variant: "destructive",
      });
      return;
    }
    
    const testConfig = { mode: 'selflux' as const, namespace: data.embed.namespace || 'sd' };
    const testHTML = generateSafeHTML(data, testConfig);
    console.log('🧪 Generated SelFlux HTML:', testHTML.substring(0, 1000));
    
    toast({
      title: "Teste SelFlux",
      description: "HTML SelFlux gerado. Verifique o console para detalhes.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <BreadcrumbNavigation />
      </div>
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{data.name}</h1>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  Status:
                  <Badge variant={data.status === 'approved' ? 'default' : 'secondary'}>
                    {data.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {data.status === 'approved' ? (
                <Button variant="outline" onClick={handleUnapprove} size="sm">
                  Desaprovar
                </Button>
              ) : (
                <Button onClick={handleApprove} size="sm">
                  Aprovar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Editor Panel */}
        <div className="w-1/2 overflow-y-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Globais do Cloudflare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Configure suas credenciais do Cloudflare para upload de imagens
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/cloudflare-settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Abrir Configurações
              </Button>
            </CardContent>
          </Card>

          <Tabs defaultValue="landing-page" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="landing-page">Conteúdo</TabsTrigger>
              <TabsTrigger value="seo-social">SEO & Social</TabsTrigger>
              <TabsTrigger value="schema-offers">Schema & Offers</TabsTrigger>
              <TabsTrigger value="brand-trust">Marca & Confiança</TabsTrigger>
              <TabsTrigger value="email">Email Marketing</TabsTrigger>
            </TabsList>

            {/* Aba Conteúdo (Landing Page) */}
            <TabsContent value="landing-page" className="space-y-4">
              <Accordion type="single" collapsible defaultValue="banner">
                
                {/* Nome da Página */}
                <AccordionItem value="page-name">
                  <AccordionTrigger>Nome da Página</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Nome da Landing Page</Label>
                      <Input
                        value={data.name}
                        onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Digite o nome da página"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Este nome aparecerá no dashboard e será usado para gerar URLs automáticas
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* SEO Básico */}
                <AccordionItem value="seo">
                  <AccordionTrigger>SEO Básico</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Título SEO</Label>
                      <Input
                        value={data.seo_title}
                        onChange={(e) => setData(prev => ({ ...prev, seo_title: e.target.value }))}
                        placeholder="Título otimizado para SEO"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {data.seo_title.length}/60 caracteres
                      </p>
                    </div>
                    <div>
                      <Label>Descrição SEO</Label>
                      <Textarea
                        value={data.seo_description}
                        onChange={(e) => setData(prev => ({ ...prev, seo_description: e.target.value }))}
                        placeholder="Descrição otimizada para SEO"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {data.seo_description.length}/160 caracteres
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Modo de Incorporação SelFlux */}
                <AccordionItem value="embed">
                  <AccordionTrigger>Modo de Incorporação</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label htmlFor="embed-mode">Modo de Incorporação</Label>
                      <Select
                        value={data.embed?.mode || 'default'}
                        onValueChange={(value: 'default' | 'selflux') => setData({
                          ...data,
                          embed: {
                            ...data.embed,
                            mode: value,
                            namespace: data.embed?.namespace || 'sd'
                          }
                        })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão (Web normal)</SelectItem>
                          <SelectItem value="selflux">SelFlux (CSS isolado)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        Escolha "SelFlux" se for colar o HTML dentro de outro sistema como SelFlux
                      </p>
                    </div>
                    
                    {data.embed?.mode === 'selflux' && (
                      <div>
                        <Label htmlFor="namespace">Namespace (Prefixo das Classes)</Label>
                        <Input
                          id="namespace"
                          value={data.embed?.namespace || 'sd'}
                          onChange={(e) => setData({
                            ...data,
                            embed: {
                              ...data.embed,
                              mode: 'selflux',
                              namespace: e.target.value || 'sd'
                            }
                          })}
                          className="mt-1"
                          placeholder="sd"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Prefixo para todas as classes CSS (ex: "sd" gera classes como "sd-c", "sd-btn")
                        </p>
                      </div>
                    )}
                    
                    {data.embed?.mode === 'selflux' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Modo SelFlux Ativo</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• CSS será isolado com wrapper .{data.embed?.namespace || 'sd'}-root</li>
                          <li>• Classes genéricas renomeadas para evitar conflitos</li>
                          <li>• Imagens Cloudflare resolvidas automaticamente</li>
                          <li>• HTML pronto para colar no SelFlux</li>
                        </ul>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Header */}
                <AccordionItem value="header">
                  <AccordionTrigger>Header</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Logo</Label>
                      <ImageUploader
                        value={data.logo_url}
                        onChange={(imageData) => setData(prev => ({ ...prev, logo_url: imageData }))}
                        placeholder="URL do logo"
                      />
                    </div>
                    
                    <div>
                      <Label>Menu de Navegação</Label>
                      {data.menu.map((item, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            placeholder="Label"
                            value={item.label}
                            onChange={(e) => {
                              const newMenu = [...data.menu];
                              newMenu[index].label = e.target.value;
                              setData(prev => ({ ...prev, menu: newMenu }));
                            }}
                          />
                          <Input
                            placeholder="URL"
                            value={item.href}
                            onChange={(e) => {
                              const newMenu = [...data.menu];
                              newMenu[index].href = e.target.value;
                              setData(prev => ({ ...prev, menu: newMenu }));
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newMenu = data.menu.filter((_, i) => i !== index);
                              setData(prev => ({ ...prev, menu: newMenu }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            menu: [...prev.menu, { label: '', href: '' }]
                          }));
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Banner */}
                <AccordionItem value="banner">
                  <AccordionTrigger>Banner Principal</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Badge do Banner</Label>
                      <Input
                        value={data.banner.badge_text}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          banner: { ...prev.banner, badge_text: e.target.value }
                        }))}
                        placeholder="Texto do badge"
                      />
                    </div>
                    
                    <div>
                      <Label>Título Principal</Label>
                      <Textarea
                        value={data.banner.title}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          banner: { ...prev.banner, title: e.target.value }
                        }))}
                        placeholder="Título principal do banner"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label>Subtítulo</Label>
                      <Textarea
                        value={data.banner.subtitle}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          banner: { ...prev.banner, subtitle: e.target.value }
                        }))}
                        placeholder="Subtítulo do banner"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label>CTAs do Banner</Label>
                      <div className="space-y-4 mt-2">
                        {/* CTA Primário */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={data.banner.cta_primary.visible !== false}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                banner: {
                                  ...prev.banner,
                                  cta_primary: { ...prev.banner.cta_primary, visible: checked }
                                }
                              }))}
                            />
                            <Label className="font-medium">CTA Primário</Label>
                          </div>
                          
                          {data.banner.cta_primary.visible !== false && (
                            <div className="grid grid-cols-2 gap-4 ml-6">
                              <div>
                                <Label>Label</Label>
                                <Input
                                  value={data.banner.cta_primary.label}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    banner: {
                                      ...prev.banner,
                                      cta_primary: { ...prev.banner.cta_primary, label: e.target.value }
                                    }
                                  }))}
                                  placeholder="Texto do botão primário"
                                />
                              </div>
                              <div>
                                <Label>URL</Label>
                                <Input
                                  value={data.banner.cta_primary.href}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    banner: {
                                      ...prev.banner,
                                      cta_primary: { ...prev.banner.cta_primary, href: e.target.value }
                                    }
                                  }))}
                                  placeholder="URL do botão primário"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* CTA Secundário */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={data.banner.cta_secondary.visible !== false}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                banner: {
                                  ...prev.banner,
                                  cta_secondary: { ...prev.banner.cta_secondary, visible: checked }
                                }
                              }))}
                            />
                            <Label className="font-medium">CTA Secundário</Label>
                          </div>
                          
                          {data.banner.cta_secondary.visible !== false && (
                            <div className="grid grid-cols-2 gap-4 ml-6">
                              <div>
                                <Label>Label</Label>
                                <Input
                                  value={data.banner.cta_secondary.label}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    banner: {
                                      ...prev.banner,
                                      cta_secondary: { ...prev.banner.cta_secondary, label: e.target.value }
                                    }
                                  }))}
                                  placeholder="Texto do botão secundário"
                                />
                              </div>
                              <div>
                                <Label>URL</Label>
                                <Input
                                  value={data.banner.cta_secondary.href}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    banner: {
                                      ...prev.banner,
                                      cta_secondary: { ...prev.banner.cta_secondary, href: e.target.value }
                                    }
                                  }))}
                                  placeholder="URL do botão secundário"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Imagens do Banner</Label>
                        <span className="text-sm text-muted-foreground">
                          {data.banner.images.length}/3 imagens
                        </span>
                      </div>
                      {data.banner.images.map((image, index) => (
                        <div key={index} className="mt-4 p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <Label>Imagem {index + 1} do Banner</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newImages = data.banner.images.filter((_, i) => i !== index);
                                setData(prev => ({
                                  ...prev,
                                  banner: { ...prev.banner, images: newImages }
                                }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <ImageUploader
                            value={image}
                            onChange={(imageData) => {
                              const newImages = [...data.banner.images];
                              newImages[index] = imageData;
                              setData(prev => ({
                                ...prev,
                                banner: { ...prev.banner, images: newImages }
                              }));
                            }}
                            placeholder={`URL da imagem ${index + 1} do banner`}
                            proportionInfo="200px (largura) x 300px (altura) - Proporção: 16:9"
                          />
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            banner: {
                              ...prev.banner,
                              images: [...prev.banner.images, createImageData()]
                            }
                          }));
                        }}
                        className="mt-2"
                        disabled={data.banner.images.length >= 3}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {data.banner.images.length >= 3 ? "Máximo de 3 imagens atingido" : "Adicionar Imagem"}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Soluções */}
                <AccordionItem value="solutions">
                  <AccordionTrigger>Soluções</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          Visibilidade da Seção
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.solutions_section?.visible_desktop ?? true}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                solutions_section: { 
                                  ...prev.solutions_section!, 
                                  visible_desktop: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no desktop</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.solutions_section?.visible_mobile ?? true}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                solutions_section: { 
                                  ...prev.solutions_section!, 
                                  visible_mobile: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no mobile</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {((data.solutions_section?.visible_desktop ?? false) || (data.solutions_section?.visible_mobile ?? false)) && (
                      <>
                    <div>
                      <Label>Título da Seção</Label>
                      <Input
                        value={data.solutions_title}
                        onChange={(e) => setData(prev => ({ ...prev, solutions_title: e.target.value }))}
                        placeholder="Título da seção de soluções"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {data.solutions.length}/5 soluções
                      </span>
                    </div>
                    
                    {data.solutions.map((solution, index) => {
                      // Determinar a proporção baseada no índice
                      const getProportionInfo = (idx: number) => {
                        if (idx <= 2) {
                          // Imagens 1-3 (índices 0-2) - Container fixo 220px altura
                          return "480x720px ou 768x1152px ou 1200x1800px - Proporção vertical 2:3 (mais altas que largas). Use uma das variantes do Cloudflare: 480px, 768px ou 1200px de largura";
                        } else {
                          // Imagens 4-5 (índices 3-4) - Container com altura flexível  
                          return "480x320px ou 768x512px ou 1200x800px - Proporção horizontal 3:2 (mais largas que altas). Use uma das variantes do Cloudflare: 480px, 768px ou 1200px de largura";
                        }
                      };

                      return (
                        <div key={index} className="p-4 border rounded-lg space-y-4">
                          <div className="flex justify-between items-center">
                            <Label>Solução {index + 1}</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newSolutions = data.solutions.filter((_, i) => i !== index);
                                setData(prev => ({ ...prev, solutions: newSolutions }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <Label>Texto</Label>
                            <Textarea
                              value={solution.text}
                              onChange={(e) => {
                                const newSolutions = [...data.solutions];
                                newSolutions[index].text = e.target.value;
                                setData(prev => ({ ...prev, solutions: newSolutions }));
                              }}
                              placeholder="Descrição da solução"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>Imagem da Solução {index + 1}</Label>
                            <ImageUploader
                              value={solution.image}
                              onChange={(imageData) => {
                                const newSolutions = [...data.solutions];
                                newSolutions[index].image = imageData;
                                setData(prev => ({ ...prev, solutions: newSolutions }));
                              }}
                              placeholder={`URL da imagem da solução ${index + 1}`}
                              proportionInfo={getProportionInfo(index)}
                            />
                          </div>
                          <div>
                            <Label>Proporção do Container (Desktop)</Label>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Mínimo (0.3)</span>
                                <span>Normal (1.0)</span>
                                <span>Destaque (2.0)</span>
                              </div>
                              <Slider
                                value={[solution.containerScale || 1.0]}
                                onValueChange={(value) => {
                                  const newSolutions = [...data.solutions];
                                  newSolutions[index].containerScale = value[0];
                                  setData(prev => ({ ...prev, solutions: newSolutions }));
                                }}
                                min={0.3}
                                max={2.0}
                                step={0.1}
                                className="w-full"
                              />
                              <div className="text-sm text-muted-foreground">
                                Atual: {(solution.containerScale || 1.0).toFixed(1)}x
                                {!solution.image.src && solution.containerScale && solution.containerScale > 0.6 && (
                                  <span className="text-orange-600 ml-2">
                                    ⚠️ Sugestão: Use escala menor (≤0.5) para containers sem imagem
                                  </span>
                                )}
                                {solution.image.src && solution.containerScale && solution.containerScale < 0.7 && (
                                  <span className="text-blue-600 ml-2">
                                    💡 Sugestão: Use escala maior (≥0.8) para destacar conteúdo com imagem
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          solutions: [...prev.solutions, { text: '', image: createImageData(), containerScale: 1.0 }]
                        }));
                      }}
                      disabled={data.solutions.length >= 5}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {data.solutions.length >= 5 ? "Máximo de 5 soluções atingido" : "Adicionar Solução"}
                    </Button>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Informações Desktop */}
                <AccordionItem value="desktop-info">
                  <AccordionTrigger>Informações Desktop</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                     <div className="space-y-3">
                       <div className="flex items-center space-x-2">
                         <Switch
                           checked={data.desktop_info?.visible_desktop ?? false}
                           onCheckedChange={(checked) => setData(prev => ({
                             ...prev,
                             desktop_info: { 
                               ...(prev.desktop_info || { 
                                 title: '', 
                                 text: '', 
                                 visible_desktop: false,
                                 visible_mobile: false, 
                                 show_table: false, 
                                 table_title: 'Especificações Técnicas',
                                 table_headers: ['Propriedade', 'Requisito', 'Resultado', 'Padrão ISO'],
                                 table_data: []
                               }), 
                               visible_desktop: checked 
                             }
                           }))}
                         />
                         <Label className="font-medium">Visível no desktop</Label>
                       </div>
                       
                       <div className="flex items-center space-x-2">
                         <Switch
                           checked={data.desktop_info?.visible_mobile ?? false}
                           onCheckedChange={(checked) => setData(prev => ({
                             ...prev,
                             desktop_info: { 
                               ...(prev.desktop_info || { 
                                 title: '', 
                                 text: '', 
                                 visible_desktop: false,
                                 visible_mobile: false, 
                                 show_table: false, 
                                 table_title: 'Especificações Técnicas',
                                 table_headers: ['Propriedade', 'Requisito', 'Resultado', 'Padrão ISO'],
                                 table_data: []
                               }), 
                               visible_mobile: checked 
                             }
                           }))}
                         />
                         <Label className="font-medium">Visível no mobile</Label>
                       </div>
                     </div>
                    
                    {((data.desktop_info?.visible_desktop ?? false) || (data.desktop_info?.visible_mobile ?? false)) && (
                      <>
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={data.desktop_info?.title ?? ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              desktop_info: { ...prev.desktop_info!, title: e.target.value }
                            }))}
                            placeholder="Título da seção desktop"
                          />
                        </div>
                        
                        <div>
                          <Label>Texto</Label>
                          <Textarea
                            value={data.desktop_info?.text ?? ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              desktop_info: { ...prev.desktop_info!, text: e.target.value }
                            }))}
                            placeholder="Texto descritivo para preencher a página"
                            rows={4}
                          />
                        </div>

                        <Separator />

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={data.desktop_info?.show_table ?? false}
                            onCheckedChange={(checked) => setData(prev => ({
                              ...prev,
                              desktop_info: { ...prev.desktop_info!, show_table: checked }
                            }))}
                          />
                          <Label className="font-medium">Mostrar tabela</Label>
                        </div>

                        {(data.desktop_info?.show_table ?? false) && (
                          <>
                            <div>
                              <Label>Título da Tabela</Label>
                              <Input
                                value={data.desktop_info?.table_title ?? ''}
                                onChange={(e) => setData(prev => ({
                                  ...prev,
                                  desktop_info: { ...prev.desktop_info!, table_title: e.target.value }
                                }))}
                                placeholder="Título da tabela"
                              />
                            </div>

                            <div>
                              <Label className="font-medium">Cabeçalhos da Tabela</Label>
                              <div className="space-y-2">
                                {(data.desktop_info?.table_headers ?? []).map((header, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <Input
                                      value={header}
                                      onChange={(e) => {
                                        const newHeaders = [...(data.desktop_info?.table_headers ?? [])];
                                        newHeaders[index] = e.target.value;
                                        setData(prev => ({
                                          ...prev,
                                          desktop_info: { ...prev.desktop_info!, table_headers: newHeaders }
                                        }));
                                      }}
                                      placeholder={`Cabeçalho ${index + 1}`}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newHeaders = (data.desktop_info?.table_headers ?? []).filter((_, i) => i !== index);
                                        const newData = (data.desktop_info?.table_data ?? []).map(row => {
                                          const newRow = { ...row };
                                          delete newRow[header];
                                          return newRow;
                                        });
                                        setData(prev => ({
                                          ...prev,
                                          desktop_info: { 
                                            ...prev.desktop_info!, 
                                            table_headers: newHeaders,
                                            table_data: newData
                                          }
                                        }));
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newHeaders = [...(data.desktop_info?.table_headers ?? []), `Coluna ${(data.desktop_info?.table_headers?.length ?? 0) + 1}`];
                                    setData(prev => ({
                                      ...prev,
                                      desktop_info: { ...prev.desktop_info!, table_headers: newHeaders }
                                    }));
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar Coluna
                                </Button>
                              </div>
                            </div>

                            <div>
                              <Label className="font-medium">Dados da Tabela</Label>
                              <div className="space-y-3">
                                {(data.desktop_info?.table_data ?? []).map((row, rowIndex) => (
                                  <Card key={rowIndex}>
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">Linha {rowIndex + 1}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newData = (data.desktop_info?.table_data ?? []).filter((_, i) => i !== rowIndex);
                                            setData(prev => ({
                                              ...prev,
                                              desktop_info: { ...prev.desktop_info!, table_data: newData }
                                            }));
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {(data.desktop_info?.table_headers ?? []).map((header, colIndex) => (
                                          <div key={colIndex}>
                                            <Label className="text-xs">{header}</Label>
                                            <Input
                                              value={row[header] ?? ''}
                                              onChange={(e) => {
                                                const newData = [...(data.desktop_info?.table_data ?? [])];
                                                newData[rowIndex] = { ...newData[rowIndex], [header]: e.target.value };
                                                setData(prev => ({
                                                  ...prev,
                                                  desktop_info: { ...prev.desktop_info!, table_data: newData }
                                                }));
                                              }}
                                              placeholder={`Valor para ${header}`}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newRow: { [key: string]: string } = {};
                                    (data.desktop_info?.table_headers ?? []).forEach(header => {
                                      newRow[header] = '';
                                    });
                                    const newData = [...(data.desktop_info?.table_data ?? []), newRow];
                                    setData(prev => ({
                                      ...prev,
                                      desktop_info: { ...prev.desktop_info!, table_data: newData }
                                    }));
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar Linha
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </AccordionContent>
                 </AccordionItem>

                 {/* Ofertas na Landing Page */}
                 {data.schema?.offers && data.schema.offers.length > 0 && (
                   <AccordionItem value="offers-section">
                     <AccordionTrigger>
                       <div className="flex items-center gap-2">
                         <Tag className="h-4 w-4" />
                         Ofertas na Landing Page
                         <Badge variant="secondary">{data.schema.offers.length}</Badge>
                       </div>
                     </AccordionTrigger>
                     <AccordionContent className="space-y-4">
                       <div className="space-y-3">
                         <div className="flex items-center space-x-2">
                           <Switch
                             checked={data.offers_section?.visible_desktop ?? false}
                             onCheckedChange={(checked) => setData(prev => ({
                               ...prev,
                               offers_section: { 
                                 ...(prev.offers_section || { 
                                   visible_desktop: false,
                                   visible_mobile: false, 
                                   title: 'Ofertas Especiais',
                                   subtitle: 'Produtos em destaque com preços promocionais'
                                 }), 
                                 visible_desktop: checked 
                               }
                             }))}
                           />
                           <Label className="font-medium">Visível no desktop</Label>
                         </div>
                         
                         <div className="flex items-center space-x-2">
                           <Switch
                             checked={data.offers_section?.visible_mobile ?? false}
                             onCheckedChange={(checked) => setData(prev => ({
                               ...prev,
                               offers_section: { 
                                 ...(prev.offers_section || { 
                                   visible_desktop: false,
                                   visible_mobile: false,
                                   title: 'Ofertas Especiais',
                                   subtitle: 'Produtos em destaque com preços promocionais'
                                 }), 
                                 visible_mobile: checked 
                               }
                             }))}
                           />
                           <Label className="font-medium">Visível no mobile</Label>
                         </div>
                       </div>
                       
                       {((data.offers_section?.visible_desktop ?? false) || (data.offers_section?.visible_mobile ?? false)) && (
                         <>
                           <div>
                             <Label>Título da Seção</Label>
                             <Input
                               value={data.offers_section?.title ?? ''}
                               onChange={(e) => setData(prev => ({
                                 ...prev,
                                 offers_section: { ...prev.offers_section!, title: e.target.value }
                               }))}
                               placeholder="Ex: Ofertas Especiais"
                             />
                           </div>
                           
                           <div>
                             <Label>Subtítulo (opcional)</Label>
                             <Input
                               value={data.offers_section?.subtitle ?? ''}
                               onChange={(e) => setData(prev => ({
                                 ...prev,
                                 offers_section: { ...prev.offers_section!, subtitle: e.target.value }
                               }))}
                               placeholder="Ex: Produtos em destaque com preços promocionais"
                             />
                           </div>
                         </>
                       )}
                     </AccordionContent>
                   </AccordionItem>
                  )}

                  {/* Recursos e Downloads na Landing Page */}
                  {data.schema?.offers && data.schema.offers.filter(offer => offer.show_in_resources).length > 0 && (
                    <AccordionItem value="resources-section">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          Recursos e Downloads
                          <Badge variant="secondary">{data.schema.offers.filter(offer => offer.show_in_resources).length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={data.resources_section?.visible_desktop ?? false}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                resources_section: { 
                                  ...(prev.resources_section || { 
                                    visible_desktop: false,
                                    visible_mobile: false, 
                                    title: 'Recursos e Downloads',
                                    subtitle: 'Materiais técnicos e informações dos produtos'
                                  }), 
                                  visible_desktop: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no desktop</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={data.resources_section?.visible_mobile ?? false}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                resources_section: { 
                                  ...(prev.resources_section || { 
                                    visible_desktop: false,
                                    visible_mobile: false, 
                                    title: 'Recursos e Downloads',
                                    subtitle: 'Materiais técnicos e informações dos produtos'
                                  }), 
                                  visible_mobile: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no mobile</Label>
                          </div>
                        </div>
                        
                        {((data.resources_section?.visible_desktop ?? false) || (data.resources_section?.visible_mobile ?? false)) && (
                          <>
                            <div>
                              <Label>Título da Seção</Label>
                              <Input
                                value={data.resources_section?.title ?? ''}
                                onChange={(e) => setData(prev => ({
                                  ...prev,
                                  resources_section: { ...prev.resources_section!, title: e.target.value }
                                }))}
                                placeholder="Ex: Recursos e Downloads"
                              />
                            </div>
                            
                            <div>
                              <Label>Subtítulo (opcional)</Label>
                              <Input
                                value={data.resources_section?.subtitle ?? ''}
                                onChange={(e) => setData(prev => ({
                                  ...prev,
                                  resources_section: { ...prev.resources_section!, subtitle: e.target.value }
                                }))}
                                placeholder="Ex: Materiais técnicos e informações dos produtos"
                              />
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Consultoria */}
                 <AccordionItem value="advisory">
                  <AccordionTrigger>Consultoria</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          Visibilidade da Seção
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.advisory?.visible_desktop ?? true}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                advisory: { 
                                  ...prev.advisory, 
                                  visible_desktop: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no desktop</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.advisory?.visible_mobile ?? true}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                advisory: { 
                                  ...prev.advisory, 
                                  visible_mobile: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no mobile</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {((data.advisory?.visible_desktop ?? false) || (data.advisory?.visible_mobile ?? false)) && (
                      <>
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={data.advisory.title}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          advisory: { ...prev.advisory, title: e.target.value }
                        }))}
                        placeholder="Título da seção de consultoria"
                      />
                    </div>
                    
                    <div>
                      <Label>Parágrafo</Label>
                      <Textarea
                        value={data.advisory.paragraph}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          advisory: { ...prev.advisory, paragraph: e.target.value }
                        }))}
                        placeholder="Descrição da consultoria"
                        rows={4}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CTA - Label</Label>
                        <Input
                          value={data.advisory.cta.label}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            advisory: {
                              ...prev.advisory,
                              cta: { ...prev.advisory.cta, label: e.target.value }
                            }
                          }))}
                          placeholder="Texto do botão"
                        />
                      </div>
                      <div>
                        <Label>CTA - URL</Label>
                        <Input
                          value={data.advisory.cta.href}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            advisory: {
                              ...prev.advisory,
                              cta: { ...prev.advisory.cta, href: e.target.value }
                            }
                          }))}
                          placeholder="URL do botão"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Imagem</Label>
                      <ImageUploader
                        value={data.advisory.image}
                        onChange={(imageData) => setData(prev => ({
                          ...prev,
                          advisory: { ...prev.advisory, image: imageData }
                        }))}
                        placeholder="URL da imagem da consultoria"
                      />
                    </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* FAQ */}
                <AccordionItem value="faq">
                  <AccordionTrigger>FAQ</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          Visibilidade da Seção
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.faq_section?.visible_desktop ?? true}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                faq_section: { 
                                  ...prev.faq_section!, 
                                  visible_desktop: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no desktop</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.faq_section?.visible_mobile ?? true}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                faq_section: { 
                                  ...prev.faq_section!, 
                                  visible_mobile: checked 
                                }
                              }))}
                            />
                            <Label className="font-medium">Visível no mobile</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {((data.faq_section?.visible_desktop ?? false) || (data.faq_section?.visible_mobile ?? false)) && (
                      <>
                    <div>
                      <Label>Título da Seção</Label>
                      <Input
                        value={data.faq_title}
                        onChange={(e) => setData(prev => ({ ...prev, faq_title: e.target.value }))}
                        placeholder="Título da seção de FAQ"
                      />
                    </div>
                    
                    {data.faq.map((faqItem, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                          <Label>FAQ {index + 1}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFaq = data.faq.filter((_, i) => i !== index);
                              setData(prev => ({ ...prev, faq: newFaq }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <Label>Pergunta</Label>
                          <Input
                            value={faqItem.question}
                            onChange={(e) => {
                              const newFaq = [...data.faq];
                              newFaq[index].question = e.target.value;
                              setData(prev => ({ ...prev, faq: newFaq }));
                            }}
                            placeholder="Pergunta"
                          />
                        </div>
                        <div>
                          <Label>Resposta</Label>
                          <Textarea
                            value={faqItem.answer}
                            onChange={(e) => {
                              const newFaq = [...data.faq];
                              newFaq[index].answer = e.target.value;
                              setData(prev => ({ ...prev, faq: newFaq }));
                            }}
                            placeholder="Resposta"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          faq: [...prev.faq, { question: '', answer: '' }]
                        }));
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar FAQ
                    </Button>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* CTA Final */}
                <AccordionItem value="cta-final">
                  <AccordionTrigger>CTA Final</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={data.cta_final.title}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          cta_final: { ...prev.cta_final, title: e.target.value }
                        }))}
                        placeholder="Título do CTA final"
                      />
                    </div>
                    
                    <div>
                      <Label>Parágrafo</Label>
                      <Textarea
                        value={data.cta_final.paragraph}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          cta_final: { ...prev.cta_final, paragraph: e.target.value }
                        }))}
                        placeholder="Descrição do CTA final"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label>CTAs da Seção Final</Label>
                      <div className="space-y-4 mt-2">
                        {/* CTA Primário */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={data.cta_final.primary.visible !== false}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                cta_final: {
                                  ...prev.cta_final,
                                  primary: { ...prev.cta_final.primary, visible: checked }
                                }
                              }))}
                            />
                            <Label className="font-medium">CTA Primário</Label>
                          </div>
                          
                          {data.cta_final.primary.visible !== false && (
                            <div className="grid grid-cols-2 gap-4 ml-6">
                              <div>
                                <Label>Label</Label>
                                <Input
                                  value={data.cta_final.primary.label}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    cta_final: {
                                      ...prev.cta_final,
                                      primary: { ...prev.cta_final.primary, label: e.target.value }
                                    }
                                  }))}
                                  placeholder="Texto do botão primário"
                                />
                              </div>
                              <div>
                                <Label>URL</Label>
                                <Input
                                  value={data.cta_final.primary.href}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    cta_final: {
                                      ...prev.cta_final,
                                      primary: { ...prev.cta_final.primary, href: e.target.value }
                                    }
                                  }))}
                                  placeholder="URL do botão primário"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* CTA Secundário */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={data.cta_final.secondary.visible !== false}
                              onCheckedChange={(checked) => setData(prev => ({
                                ...prev,
                                cta_final: {
                                  ...prev.cta_final,
                                  secondary: { ...prev.cta_final.secondary, visible: checked }
                                }
                              }))}
                            />
                            <Label className="font-medium">CTA Secundário</Label>
                          </div>
                          
                          {data.cta_final.secondary.visible !== false && (
                            <div className="grid grid-cols-2 gap-4 ml-6">
                              <div>
                                <Label>Label</Label>
                                <Input
                                  value={data.cta_final.secondary.label}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    cta_final: {
                                      ...prev.cta_final,
                                      secondary: { ...prev.cta_final.secondary, label: e.target.value }
                                    }
                                  }))}
                                  placeholder="Texto do botão secundário"
                                />
                              </div>
                              <div>
                                <Label>URL</Label>
                                <Input
                                  value={data.cta_final.secondary.href}
                                  onChange={(e) => setData(prev => ({
                                    ...prev,
                                    cta_final: {
                                      ...prev.cta_final,
                                      secondary: { ...prev.cta_final.secondary, href: e.target.value }
                                    }
                                  }))}
                                  placeholder="URL do botão secundário"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Footer */}
                <AccordionItem value="footer">
                  <AccordionTrigger>Footer</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Título dos Links</Label>
                      <Input
                        value={data.footer_links_title}
                        onChange={(e) => setData(prev => ({ ...prev, footer_links_title: e.target.value }))}
                        placeholder="Título da seção de links"
                      />
                    </div>
                    
                    <div>
                      <Label>Localizações</Label>
                      {data.footer.locations.map((location, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            placeholder="Título"
                            value={location.title}
                            onChange={(e) => {
                              const newLocations = [...data.footer.locations];
                              newLocations[index].title = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, locations: newLocations }
                              }));
                            }}
                          />
                          <Input
                            placeholder="Endereço"
                            value={location.address}
                            onChange={(e) => {
                              const newLocations = [...data.footer.locations];
                              newLocations[index].address = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, locations: newLocations }
                              }));
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newLocations = data.footer.locations.filter((_, i) => i !== index);
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, locations: newLocations }
                              }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              locations: [...prev.footer.locations, { title: '', address: '' }]
                            }
                          }));
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Localização
                      </Button>
                    </div>
                    
                    <div>
                      <Label>Links do Footer</Label>
                      {data.footer.links.map((link, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            placeholder="Label"
                            value={link.label}
                            onChange={(e) => {
                              const newLinks = [...data.footer.links];
                              newLinks[index].label = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, links: newLinks }
                              }));
                            }}
                          />
                          <Input
                            placeholder="URL"
                            value={link.href}
                            onChange={(e) => {
                              const newLinks = [...data.footer.links];
                              newLinks[index].href = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, links: newLinks }
                              }));
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newLinks = data.footer.links.filter((_, i) => i !== index);
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, links: newLinks }
                              }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              links: [...prev.footer.links, { label: '', href: '' }]
                            }
                          }));
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Link
                      </Button>
                    </div>
                    
                    <div>
                      <Label>Redes Sociais</Label>
                      {data.footer.social.map((social, index) => (
                        <div key={index} className="flex gap-2 mt-2 items-center">
                          <Select
                            value={social.platform}
                            onValueChange={(value) => {
                              const newSocial = [...data.footer.social];
                              const platform = SOCIAL_PLATFORMS.find(p => p.value === value);
                              newSocial[index] = {
                                ...newSocial[index],
                                platform: value,
                                icon_alt: `${platform?.label} Link`
                              };
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, social: newSocial }
                              }));
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Rede social" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOCIAL_PLATFORMS.map((platform) => (
                                <SelectItem key={platform.value} value={platform.value}>
                                  <div className="flex items-center gap-2">
                                    <platform.icon className="h-4 w-4" />
                                    {platform.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="URL"
                            value={social.href}
                            onChange={(e) => {
                              const newSocial = [...data.footer.social];
                              newSocial[index].href = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, social: newSocial }
                              }));
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSocial = data.footer.social.filter((_, i) => i !== index);
                              setData(prev => ({
                                ...prev,
                                footer: { ...prev.footer, social: newSocial }
                              }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              social: [...prev.footer.social, { platform: 'instagram', href: '', icon_src: '', icon_alt: '' }]
                            }
                          }));
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Rede Social
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            {/* Aba SEO & Social */}
            <TabsContent value="seo-social" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>SEO & Social Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible defaultValue="basic-seo">
                    
                     {/* SEO Básico */}
                    <AccordionItem value="basic-seo">
                      <AccordionTrigger>SEO Básico</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                           <Label>Domínio a ser utilizado</Label>
                           <Input
                             value={data.seo.domain}
                             onChange={(e) => {
                               setData(prev => ({
                                 ...prev,
                                 seo: { 
                                   ...prev.seo, 
                                   domain: e.target.value,
                                   // Auto-generate canonical URL when domain changes
                                   canonical_url: e.target.value && prev.seo.seo_title ? 
                                     `https://${e.target.value}/${prev.seo.seo_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` :
                                     prev.seo.canonical_url
                                 }
                               }));
                             }}
                             placeholder="exemplo.com.br"
                           />
                          {data.seo.domain && data.seo.seo_title && (
                            <p className="text-xs text-gray-500 mt-1">
                              URL Canônica: https://{data.seo.domain}/{data.seo.seo_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                            </p>
                          )}
                        </div>
                        
                        <div>
                           <Label>Título SEO</Label>
                           <Input
                             value={data.seo.seo_title}
                             onChange={(e) => {
                               setData(prev => ({
                                 ...prev,
                                 seo: { 
                                   ...prev.seo, 
                                   seo_title: e.target.value,
                                   // Auto-generate canonical URL when title changes
                                   canonical_url: prev.seo.domain && e.target.value ? 
                                     `https://${prev.seo.domain}/${e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` :
                                     prev.seo.canonical_url
                                 }
                               }));
                             }}
                             placeholder="Título otimizado para SEO"
                           />
                           <p className="text-xs text-gray-500 mt-1">
                             {data.seo.seo_title.length}/60 caracteres
                           </p>
                        </div>
                        
                        <div>
                          <Label>Descrição SEO</Label>
                          <Textarea
                            value={data.seo.seo_description}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, seo_description: e.target.value }
                            }))}
                            placeholder="Descrição otimizada para SEO"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label>URL Canônica</Label>
                          <Input
                            value={data.seo.canonical_url}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, canonical_url: e.target.value }
                            }))}
                            placeholder="https://exemplo.com/pagina"
                          />
                        </div>
                        
                        <div>
                          <Label>Meta Robots</Label>
                          <Select
                            value={data.seo.meta_robots}
                            onValueChange={(value) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, meta_robots: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="index, follow">index, follow</SelectItem>
                              <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                              <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                              <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Painel de Automação SEO com IA */}
                        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <Label className="text-sm font-semibold text-blue-900">SEO Inteligente com IA</Label>
                              <p className="text-xs text-blue-700 mt-1">
                                Use inteligência artificial para gerar conteúdo SEO otimizado automaticamente
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-gray-600">Exportação</Label>
                                <Switch
                                  checked={data.seo.export_panel_enabled || false}
                                  onCheckedChange={(checked) => setData(prev => ({
                                    ...prev,
                                    seo: { ...prev.seo, export_panel_enabled: checked }
                                  }))}
                                />
                              </div>
                              <Switch
                                checked={data.seo.ai_seo_enabled || false}
                                onCheckedChange={(checked) => setData(prev => ({
                                  ...prev,
                                  seo: { ...prev.seo, ai_seo_enabled: checked }
                                }))}
                              />
                            </div>
                          </div>

                           {data.seo.ai_seo_enabled && (
                             <div className="space-y-4">
                                {/* Conteúdo Oculto SEO com IA */}
                                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                 <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center gap-2">
                                     <Label className="text-xs font-medium text-purple-700">🎯 Conteúdo Oculto SEO</Label>
                                     <div className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                                       Base para IA
                                     </div>
                                   </div>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     disabled={aiLoading.hidden}
                                     onClick={async () => {
                                       if (aiLoading.hidden) return;
                                       setAiLoading(prev => ({ ...prev, hidden: true }));
                                       try {
                                         const contentRaw = data.seo.seo_hidden_content || `${data.banner.title} ${data.banner.subtitle} ${data.advisory.paragraph}`;
                                         const content = (contentRaw || '').trim();
                                         if (!content) {
                                           toast({ title: "Informe o contexto", description: "Adicione detalhes no campo 'Conteúdo Oculto SEO' para a IA trabalhar melhor.", variant: "destructive" });
                                           return;
                                         }
                                         
                                         const { data: result, error } = await supabase.functions.invoke('ai-seo-generator', {
                                           body: { type: 'hidden_content', content }
                                         });
                                         
                                         if (error) throw error;
                                         if (result?.content) {
                                           setData(prev => ({
                                             ...prev,
                                             seo: { ...prev.seo, seo_hidden_content: result.content }
                                           }));
                                           toast({ title: "✨ Conteúdo gerado!", description: "Conteúdo oculto SEO criado com sucesso." });
                                         }
                                       } catch (error) {
                                         console.error('Erro ao gerar conteúdo oculto:', error);
                                         toast({ title: "Erro", description: "Falha ao gerar conteúdo oculto", variant: "destructive" });
                                       } finally {
                                         setAiLoading(prev => ({ ...prev, hidden: false }));
                                       }
                                     }}
                                   >
                                     {aiLoading.hidden ? (
                                       <>
                                         <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                         Gerando...
                                       </>
                                     ) : (
                                       <>
                                         <Wand2 className="w-3 h-3 mr-1" />
                                         Gerar IA
                                       </>
                                     )}
                                   </Button>
                                 </div>
                                 <Textarea
                                   placeholder="Ex: Nossa empresa oferece soluções digitais para e-commerce, marketing digital, SEO..."
                                   value={data.seo.seo_hidden_content}
                                   onChange={(e) => setData(prev => ({
                                     ...prev,
                                     seo: { ...prev.seo, seo_hidden_content: e.target.value }
                                   }))}
                                   className="text-xs min-h-[60px] text-purple-700 bg-white/50"
                                 />
                               </div>

                               {/* Geração de Keywords baseada no FAQ */}
                               <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                 <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center gap-2">
                                     <Label className="text-xs font-medium text-green-700">📋 Keywords do FAQ</Label>
                                     <div className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                                       SEO Inteligente
                                     </div>
                                   </div>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     disabled={aiLoading.faqKeywords || !data.faq?.length}
                                     onClick={async () => {
                                       if (aiLoading.faqKeywords || !data.faq?.length) return;
                                       setAiLoading(prev => ({ ...prev, faqKeywords: true }));
                                       try {
                                         // Extrair perguntas e respostas do FAQ
                                         const faqContent = data.faq.map(item => 
                                           `P: ${item.question}\nR: ${item.answer}`
                                         ).join('\n\n');
                                         
                                         if (!faqContent.trim()) {
                                           toast({ title: "FAQ vazio", description: "Adicione perguntas e respostas no FAQ primeiro.", variant: "destructive" });
                                           return;
                                         }
                                         
                                         const { data: result, error } = await supabase.functions.invoke('ai-seo-generator', {
                                           body: { 
                                             type: 'faq_keywords', 
                                             content: faqContent,
                                             context: `${data.banner.title} ${data.banner.subtitle}`
                                           }
                                         });
                                         
                                         if (error) throw error;
                                         if (result?.content) {
                                            // Combinar keywords existentes com as novas do FAQ
                                            const existingKeywords = data.seo.ai_keywords || '';
                                            const newKeywords = existingKeywords ? 
                                              `${existingKeywords}, ${result.content}` : 
                                              result.content;
                                            
                                            setData(prev => ({
                                              ...prev,
                                              seo: { ...prev.seo, ai_keywords: newKeywords }
                                            }));
                                           toast({ 
                                             title: "✨ Keywords do FAQ geradas!", 
                                             description: `${data.faq.length} perguntas analisadas com sucesso.` 
                                           });
                                         }
                                       } catch (error) {
                                         console.error('Erro ao gerar keywords do FAQ:', error);
                                         toast({ title: "Erro", description: "Falha ao gerar keywords do FAQ", variant: "destructive" });
                                       } finally {
                                         setAiLoading(prev => ({ ...prev, faqKeywords: false }));
                                       }
                                     }}
                                   >
                                     {aiLoading.faqKeywords ? (
                                       <>
                                         <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                         Analisando FAQ...
                                       </>
                                     ) : (
                                       <>
                                         <Lightbulb className="w-3 h-3 mr-1" />
                                         Gerar Keywords
                                       </>
                                     )}
                                   </Button>
                                 </div>
                                  <div className="text-xs text-green-700 bg-white/50 p-2 rounded border mb-2">
                                    {data.faq?.length ? (
                                      <span>✅ {data.faq.length} perguntas no FAQ prontas para análise</span>
                                    ) : (
                                      <span>⚠️ Adicione perguntas no FAQ primeiro</span>
                                    )}
                                  </div>
                                  
                                 {/* Campo para visualizar/editar keywords geradas */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-green-700">Keywords do FAQ</Label>
                                        <div className="flex items-center gap-1">
                                          <div className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                                            {parseKeywords(data.seo.ai_keywords).length} keywords
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setData(prev => ({
                                                ...prev,
                                                seo: { ...prev.seo, ai_keywords: '' }
                                              }));
                                              toast({ 
                                                title: "Keywords limpos", 
                                                description: "Todas as keywords foram removidas." 
                                              });
                                            }}
                                            className="h-6 px-2 text-xs text-red-500 hover:text-red-700"
                                            title="Limpar todos os keywords"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      <TagInput
                                        value={parseKeywords(data.seo.ai_keywords)}
                                        onChange={(keywords) => setData(prev => ({
                                          ...prev,
                                          seo: { ...prev.seo, ai_keywords: stringifyKeywords(keywords) }
                                        }))}
                                        placeholder="Digite uma keyword e pressione Enter..."
                                        className="text-xs text-green-700 bg-white/50"
                                      />
                                      <div className="text-xs text-green-600 bg-white/50 p-2 rounded border">
                                        💡 Dica: Digite uma palavra-chave e pressione Enter para adicionar. Clique no X para remover.
                                      </div>
                                    </div>
                                </div>

                                {/* Links Inteligentes (Palavras-chave → URL) */}
                                <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs font-medium text-cyan-700">🔗 Links Inteligentes</Label>
                                      <div className="text-xs bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full font-medium">
                                        SEO Contextual
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                         onClick={() => {
                                           if (!id || id === 'undefined') {
                                             toast({
                                               title: "ID inválido",
                                               description: "Salve a landing page primeiro antes de acessar o gerador de blog.",
                                               variant: "destructive"
                                             });
                                             return;
                                           }
                                           navigate(`/blog-generator/${id}`);
                                         }}
                                        className="text-xs"
                                      >
                                        <FileText className="w-3 h-3 mr-1" />
                                        Gerador de Blog
                                      </Button>
                                      
                                      {/* Import FAQ Keywords Button */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={parseKeywords(data.seo.ai_keywords).length === 0}
                                        onClick={() => {
                                          const faqKeywords = parseKeywords(data.seo.ai_keywords);
                                          if (faqKeywords.length === 0) {
                                            toast({
                                              title: "Nenhuma keyword encontrada",
                                              description: "Gere keywords do FAQ primeiro.",
                                              variant: "destructive"
                                            });
                                            return;
                                          }
                                          
                                          const currentLinks = data.seo.intelligent_links || {};
                                          const newLinks = { ...currentLinks };
                                          let importedCount = 0;
                                          
                                          // Import each FAQ keyword as a new intelligent link with empty URL
                                          faqKeywords.forEach(keyword => {
                                            const trimmedKeyword = keyword.trim();
                                            if (trimmedKeyword && !newLinks[trimmedKeyword]) {
                                              newLinks[trimmedKeyword] = "";
                                              importedCount++;
                                            }
                                          });
                                          
                                          if (importedCount > 0) {
                                            setData(prev => ({
                                              ...prev,
                                              seo: { ...prev.seo, intelligent_links: newLinks }
                                            }));
                                            toast({ 
                                              title: `🔗 ${importedCount} keywords importadas!`, 
                                              description: "Configure as URLs para cada palavra-chave importada." 
                                            });
                                          } else {
                                            toast({ 
                                              title: "Nenhuma keyword nova", 
                                              description: "Todas as keywords do FAQ já estão nos Links Inteligentes." 
                                            });
                                          }
                                        }}
                                        className="text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                                        title={`Importar ${parseKeywords(data.seo.ai_keywords).length} keywords do FAQ`}
                                      >
                                        <Tag className="w-3 h-3 mr-1" />
                                        Importar Keywords ({parseKeywords(data.seo.ai_keywords).length})
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                         onClick={() => {
                                           // Ensure intelligent_links exists before spreading
                                           const currentLinks = data.seo.intelligent_links || {};
                                           const newLinks = { ...currentLinks };
                                           // Generate unique key using timestamp to avoid conflicts
                                           const uniqueKey = `nova-palavra-${Date.now()}`;
                                           newLinks[uniqueKey] = "";
                                           setData(prev => ({
                                             ...prev,
                                             seo: { ...prev.seo, intelligent_links: newLinks }
                                           }));
                                           toast({ 
                                             title: "Link adicionado", 
                                             description: "Configure a palavra-chave e URL do novo link." 
                                           });
                                         }}
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Adicionar
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                     {Object.entries(data.seo.intelligent_links || {}).filter(([keyword]) => keyword.trim() !== '').map(([keyword, url], index) => (
                                       <div key={keyword} className="flex gap-2 items-center p-2 border rounded bg-white/50 hover:bg-white/80 transition-colors">
                                         <div className="flex-1 grid grid-cols-2 gap-2">
                                           <Input
                                             placeholder="Ex: scanner intraoral"
                                             value={keyword}
                                             onChange={(e) => {
                                               const newValue = e.target.value;
                                               const newLinks = { ...data.seo.intelligent_links };
                                               
                                               // Only update if the new value is different and not empty
                                               if (newValue !== keyword) {
                                                 delete newLinks[keyword];
                                                 if (newValue.trim()) {
                                                   newLinks[newValue] = url;
                                                 }
                                                 setData(prev => ({
                                                   ...prev,
                                                   seo: { ...prev.seo, intelligent_links: newLinks }
                                                 }));
                                               }
                                             }}
                                             className="text-xs focus:ring-2 focus:ring-cyan-500"
                                           />
                                           <Input
                                             placeholder="Ex: /produtos/scanner-intraoral"
                                             value={url}
                                             onChange={(e) => {
                                               const newLinks = { ...data.seo.intelligent_links };
                                               newLinks[keyword] = e.target.value;
                                               setData(prev => ({
                                                 ...prev,
                                                 seo: { ...prev.seo, intelligent_links: newLinks }
                                               }));
                                             }}
                                             className="text-xs focus:ring-2 focus:ring-cyan-500"
                                           />
                                         </div>
                                         <Button
                                           onClick={() => {
                                             const newLinks = { ...data.seo.intelligent_links };
                                             delete newLinks[keyword];
                                             setData(prev => ({
                                               ...prev,
                                               seo: { ...prev.seo, intelligent_links: newLinks }
                                             }));
                                             toast({ 
                                               title: "Link removido", 
                                               description: `Link "${keyword}" foi removido com sucesso.` 
                                             });
                                           }}
                                           size="sm"
                                           variant="ghost"
                                           className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 transition-colors"
                                           title="Remover este link"
                                         >
                                           <Trash2 className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     ))}

                                    {Object.keys(data.seo.intelligent_links || {}).length === 0 && (
                                      <div className="text-center py-4 text-cyan-600 bg-white/50 rounded border">
                                        <Link className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                        <p className="text-xs">Nenhum link configurado</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Template Smartdent */}
                                  <div className="mt-3 pt-2 border-t">
                                    <Button
                                      onClick={() => {
                                        const smartdentLinks = {
                                          "scanner intraoral": "/produtos/scanner-intraoral",
                                          "odontologia digital": "/servicos/odontologia-digital",
                                          "fluxo digital": "/servicos/fluxo-digital",
                                          "implantodontia digital": "/servicos/implantodontia",
                                          "prótese digital": "/servicos/protese-digital",
                                          "treinamento": "/treinamentos",
                                          "capacitação": "/treinamentos/capacitacao",
                                          "BLZ Scanner": "/produtos/blz-scanner",
                                        };
                                        setData(prev => ({
                                          ...prev,
                                          seo: { 
                                            ...prev.seo, 
                                            intelligent_links: { ...(prev.seo.intelligent_links || {}), ...smartdentLinks }
                                          }
                                        }));
                                        toast({ 
                                          title: "Template aplicado!", 
                                          description: "Links Smartdent adicionados com sucesso." 
                                        });
                                      }}
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs"
                                    >
                                      Template Smartdent
                                    </Button>
                                  </div>

                                  <div className="bg-cyan-50 border border-cyan-200 rounded p-2 mt-2">
                                    <div className="flex items-center gap-1 text-cyan-800 text-xs font-medium mb-1">
                                      <Sparkles className="h-3 w-3" />
                                      Como funciona
                                    </div>
                                    <p className="text-cyan-700 text-xs">
                                      Links são sincronizados com o Gerador de Blog e usados contextualmente pela IA.
                                    </p>
                                  </div>
                                </div>

                                {/* Geração de Blog baseado no conteúdo */}
                               <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                                 <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center gap-2">
                                     <Label className="text-xs font-medium text-orange-700">📰 Blog Post IA</Label>
                                     <div className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                       Novo
                                     </div>
                                   </div>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     disabled={aiLoading.blog}
                                      onClick={async () => {
                                        if (aiLoading.blog) return;
                                        setAiLoading(prev => ({ ...prev, blog: true }));
                                        try {
                                          // Validar dados básicos
                                          if (!data.banner.title?.trim()) {
                                            toast({ title: "Conteúdo insuficiente", description: "Preencha o título principal do banner.", variant: "destructive" });
                                            return;
                                          }
                                          if (!data.banner.subtitle?.trim()) {
                                            toast({ title: "Conteúdo insuficiente", description: "Preencha o subtítulo do banner.", variant: "destructive" });
                                            return;
                                          }
                                          if (!data.advisory.paragraph?.trim()) {
                                            toast({ title: "Conteúdo insuficiente", description: "Preencha o parágrafo da seção consultoria.", variant: "destructive" });
                                            return;
                                          }

                                          // Preparar conteúdo completo da landing page
                                          const fullLandingPageContent = {
                                            banner: {
                                              title: data.banner.title,
                                              subtitle: data.banner.subtitle
                                            },
                                            solutions: {
                                              title: data.solutions_title,
                                              items: data.solutions.map(solution => ({
                                                text: solution.text,
                                                image: solution.image,
                                                isFirstSolution: data.solutions.indexOf(solution) === 0
                                              }))
                                            },
                                            faq: {
                                              title: data.faq_title,
                                              items: data.faq.map(faq => ({
                                                question: faq.question,
                                                answer: faq.answer
                                              }))
                                            }
                                          };

                                          // Preparar conteúdo simplificado
                                          const content = `${data.banner.title} ${data.banner.subtitle} ${data.advisory.paragraph}`;
                                          
                                          console.log('🤖 Enviando dados para IA:', {
                                            type: 'blog_content',
                                            content,
                                            title: data.banner.title,
                                            fullLandingPageContent
                                          });

                                          const { data: result, error } = await supabase.functions.invoke('ai-seo-generator', {
                                            body: { 
                                              type: 'blog_content', 
                                              content,
                                              title: data.banner.title,
                                              fullLandingPageContent
                                            }
                                          });
                                          
                                          console.log('🤖 Resposta da IA:', { result, error });
                                          
                                          if (error) {
                                            console.error('Erro na function:', error);
                                            throw new Error(`Erro da function: ${error.message || 'Erro desconhecido'}`);
                                          }
                                          
                                          if (!result) {
                                            throw new Error('Nenhum resultado retornado pela IA');
                                          }
                                          
                                          if (!result.success) {
                                            throw new Error(result.error || 'Falha na geração do conteúdo');
                                          }
                                          
                                          if (result?.content) {
                                            // Redirecionar para a página de blog com o conteúdo
                                            navigate(`/blog-generator/${id}`, { 
                                              state: { generatedContent: result.content }
                                            });
                                          } else {
                                            throw new Error('Conteúdo não gerado pela IA');
                                          }
                                        } catch (error) {
                                          console.error('❌ Erro ao gerar blog:', error);
                                          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                                          toast({ 
                                            title: "Erro na geração do blog", 
                                            description: errorMessage, 
                                            variant: "destructive" 
                                          });
                                        } finally {
                                          setAiLoading(prev => ({ ...prev, blog: false }));
                                        }
                                      }}
                                   >
                                     {aiLoading.blog ? (
                                       <>
                                         <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                         Criando...
                                       </>
                                     ) : (
                                       <>
                                         <FileText className="w-3 h-3 mr-1" />
                                         Criar Blog
                                       </>
                                     )}
                                   </Button>
                                 </div>
                                 <div className="text-xs text-orange-700 bg-white/50 p-2 rounded border">
                                   Gera um blog post completo baseado no conteúdo da landing page
                                 </div>
                               </div>
                             </div>
                           )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Open Graph */}
                    <AccordionItem value="open-graph">
                      <AccordionTrigger>Open Graph (Facebook, LinkedIn)</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label>OG Title</Label>
                          <Input
                            value={data.seo.og_title}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, og_title: e.target.value }
                            }))}
                            placeholder="Título para redes sociais (deixe vazio para herdar do SEO)"
                          />
                        </div>
                        
                        <div>
                          <Label>OG Description</Label>
                          <Textarea
                            value={data.seo.og_description}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, og_description: e.target.value }
                            }))}
                            placeholder="Descrição para redes sociais (deixe vazio para herdar do SEO)"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label>OG Image</Label>
                          <ImageUploader
                            value={data.seo.og_image}
                            onChange={(imageData) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, og_image: imageData }
                            }))}
                            placeholder="Imagem para compartilhamento (1200x630px recomendado)"
                          />
                        </div>
                        
                        <div>
                          <Label>OG Type</Label>
                          <Select
                            value={data.seo.og_type}
                            onValueChange={(value) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, og_type: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="profile">Profile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>OG Site Name</Label>
                          <Input
                            value={data.seo.og_site_name}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, og_site_name: e.target.value }
                            }))}
                            placeholder="Nome do site"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Twitter Cards */}
                    <AccordionItem value="twitter-cards">
                      <AccordionTrigger>Twitter Cards</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label>Twitter Card Type</Label>
                          <Select
                            value={data.seo.twitter_card}
                            onValueChange={(value) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, twitter_card: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="summary">Summary</SelectItem>
                              <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                              <SelectItem value="app">App</SelectItem>
                              <SelectItem value="player">Player</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Twitter Title</Label>
                          <Input
                            value={data.seo.twitter_title}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, twitter_title: e.target.value }
                            }))}
                            placeholder="Título para Twitter (deixe vazio para herdar do SEO)"
                          />
                        </div>
                        
                        <div>
                          <Label>Twitter Description</Label>
                          <Textarea
                            value={data.seo.twitter_description}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, twitter_description: e.target.value }
                            }))}
                            placeholder="Descrição para Twitter (deixe vazio para herdar do SEO)"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label>Twitter Image</Label>
                          <ImageUploader
                            value={data.seo.twitter_image}
                            onChange={(imageData) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, twitter_image: imageData }
                            }))}
                            placeholder="Imagem para Twitter"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Twitter Site</Label>
                            <Input
                              value={data.seo.twitter_site}
                              onChange={(e) => setData(prev => ({
                                ...prev,
                                seo: { ...prev.seo, twitter_site: e.target.value }
                              }))}
                              placeholder="@seusite"
                            />
                          </div>
                          <div>
                            <Label>Twitter Creator</Label>
                            <Input
                              value={data.seo.twitter_creator}
                              onChange={(e) => setData(prev => ({
                                ...prev,
                                seo: { ...prev.seo, twitter_creator: e.target.value }
                              }))}
                              placeholder="@seucriador"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                     {/* Hreflang */}
                    <AccordionItem value="hreflang">
                      <AccordionTrigger>Hreflang (Multi-idioma)</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        
                        {/* Toggle para geração automática */}
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">Gerar Hreflang Automaticamente</Label>
                            <p className="text-xs text-gray-600">
                              Cria automaticamente variantes para pt-BR, pt-PT, en-US, es-ES baseadas no domínio configurado
                            </p>
                          </div>
                          <Switch
                            checked={data.seo.hreflang_auto}
                            onCheckedChange={(checked) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, hreflang_auto: checked }
                            }))}
                          />
                        </div>

                        {/* Preview das URLs automáticas */}
                        {data.seo.hreflang_auto && data.name && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <Label className="text-xs font-medium text-gray-700">Preview das URLs geradas:</Label>
                            <div className="mt-2 space-y-1 text-xs">
                              {(() => {
                                const slug = (data.seo.seo_title || data.name)
                                  .toLowerCase()
                                  .normalize('NFD')
                                  .replace(/[\u0300-\u036f]/g, '')
                                  .replace(/[^a-z0-9\s-]/g, '')
                                  .replace(/\s+/g, '-')
                                  .replace(/-+/g, '-')
                                  .replace(/^-|-$/g, '');
                                const domain = data.seo.domain || 'www.smartdent.com.br';
                                return [
                                  { lang: 'pt-BR', url: `https://${domain}/${slug}` },
                                  { lang: 'pt-PT', url: `https://${domain}/pt/${slug}` },
                                  { lang: 'en-US', url: `https://${domain}/en/${slug}` },
                                  { lang: 'es-ES', url: `https://${domain}/es/${slug}` },
                                  { lang: 'x-default', url: `https://${domain}/${slug}` }
                                ].map(item => (
                                  <div key={item.lang} className="flex justify-between">
                                    <span className="font-mono text-blue-600">{item.lang}:</span>
                                    <span className="text-gray-600">{item.url}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}

                         {/* Configuração manual (quando automático está desabilitado) */}
                        {!data.seo.hreflang_auto && (
                          <>
                            <div className="text-sm text-gray-600 p-3 bg-yellow-50 rounded-lg">
                              Configure manualmente as variantes de idioma ou ative a geração automática acima.
                            </div>
                            {data.seo.hreflang.map((hreflang, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Idioma (ex: pt-BR)"
                              value={hreflang.lang}
                              onChange={(e) => {
                                const newHreflang = [...data.seo.hreflang];
                                newHreflang[index].lang = e.target.value;
                                setData(prev => ({
                                  ...prev,
                                  seo: { ...prev.seo, hreflang: newHreflang }
                                }));
                              }}
                              className="w-32"
                            />
                            <Input
                              placeholder="URL"
                              value={hreflang.url}
                              onChange={(e) => {
                                const newHreflang = [...data.seo.hreflang];
                                newHreflang[index].url = e.target.value;
                                setData(prev => ({
                                  ...prev,
                                  seo: { ...prev.seo, hreflang: newHreflang }
                                }));
                              }}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newHreflang = data.seo.hreflang.filter((_, i) => i !== index);
                                setData(prev => ({
                                  ...prev,
                                  seo: { ...prev.seo, hreflang: newHreflang }
                                }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setData(prev => ({
                                  ...prev,
                                  seo: {
                                    ...prev.seo,
                                    hreflang: [...prev.seo.hreflang, { lang: '', url: '' }]
                                  }
                                }));
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Idioma
                            </Button>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Datas e FAQ */}
                    <AccordionItem value="dates-faq">
                      <AccordionTrigger>Datas e FAQ</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label>Data de Publicação</Label>
                          <Input
                            type="datetime-local"
                            value={data.seo.publish_date ? data.seo.publish_date.slice(0, 16) : ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, publish_date: e.target.value ? new Date(e.target.value).toISOString() : '' }
                            }))}
                          />
                        </div>
                        
                        <div>
                          <Label>Última Modificação</Label>
                          <Input
                            type="datetime-local"
                            value={data.seo.lastmod ? data.seo.lastmod.slice(0, 16) : ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, lastmod: e.target.value ? new Date(e.target.value).toISOString() : '' }
                            }))}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="faq-enable"
                            checked={data.seo.faq_enable}
                            onCheckedChange={(checked) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, faq_enable: checked }
                            }))}
                          />
                          <Label htmlFor="faq-enable">Habilitar Schema FAQ</Label>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Schema & Offers */}
            <TabsContent value="schema-offers" className="space-y-6">
              
              {/* Schema Software Application Card */}
              {false && (
              <Card className="border-l-4 border-l-primary/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Laptop className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Software Application Schema</CardTitle>
                      <p className="text-sm text-muted-foreground">Configure os dados estruturados da sua aplicação</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Nome da Aplicação
                      </Label>
                      <Input
                        value={data.schema.software_app.name}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, name: e.target.value }
                          }
                        }))}
                        placeholder="Nome do software"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        Categoria
                      </Label>
                      <Select
                        value={data.schema.software_app.category}
                        onValueChange={(value) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, category: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HealthApplication">Health Application</SelectItem>
                          <SelectItem value="BusinessApplication">Business Application</SelectItem>
                          <SelectItem value="WebApplication">Web Application</SelectItem>
                          <SelectItem value="MobileApplication">Mobile Application</SelectItem>
                          <SelectItem value="DesktopApplication">Desktop Application</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Avaliações e Preço */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        Avaliação (0-5)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={data.schema.software_app.rating_value}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, rating_value: e.target.value }
                          }
                        }))}
                        placeholder="4.8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Avaliações
                      </Label>
                      <Input
                        type="number"
                        value={data.schema.software_app.rating_count}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, rating_count: e.target.value }
                          }
                        }))}
                        placeholder="150"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        Preço
                      </Label>
                      <Input
                        value={data.schema.software_app.price}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, price: e.target.value }
                          }
                        }))}
                        placeholder="0 (para gratuito)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Moeda
                      </Label>
                      <Select
                        value={data.schema.software_app.price_currency}
                        onValueChange={(value) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, price_currency: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">BRL (Real)</SelectItem>
                          <SelectItem value="USD">USD (Dólar)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Sistema e Categoria */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Sistema Operacional
                      </Label>
                      <Input
                        value={data.schema.software_app.operating_system}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, operating_system: e.target.value }
                          }
                        }))}
                        placeholder="Web, Windows, macOS, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Categoria da Aplicação
                      </Label>
                      <Input
                        value={data.schema.software_app.application_category}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            software_app: { ...prev.schema.software_app, application_category: e.target.value }
                          }
                        }))}
                        placeholder="HealthApplication"
                      />
                    </div>
                  </div>
                 </CardContent>
              </Card>
              )}

              {/* Google Reviews Extraction Card */}
              {false && (
              <Card className="border-l-4 border-l-blue-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Star className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Reviews do Google</CardTitle>
                      <p className="text-sm text-muted-foreground">Extraia automaticamente avaliações do Google</p>
                    </div>
                    {data.schema.google_reviews?.status === 'success' && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✅ Ativo
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="google-reviews-url" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Link das Avaliações Google
                    </Label>
                    <Input
                      id="google-reviews-url"
                      value={data.schema.google_reviews?.url ?? ''}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        schema: {
                          ...prev.schema,
                          google_reviews: {
                            ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                            url: e.target.value
                          }
                        }
                      }))}
                      placeholder="https://www.google.com/maps/place/..."
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!(data.schema.google_reviews?.url) || data.schema.google_reviews?.status === 'loading'}
                      onClick={async () => {
                        setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            google_reviews: {
                              ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                              status: 'loading'
                            }
                          }
                        }));

                        try {
                          const { supabase } = await import("@/integrations/supabase/client");
                          const { data: result, error } = await supabase.functions.invoke('extract-google-reviews', {
                            body: { url: data.schema.google_reviews?.url }
                          });

                          if (error) throw error;

                          if (result.success) {
                            setData(prev => ({
                              ...prev,
                              schema: {
                                ...prev.schema,
                                software_app: {
                                  ...prev.schema.software_app,
                                  rating_value: result.data.rating.toString(),
                                  rating_count: result.data.reviewCount.toString()
                                },
                                google_reviews: {
                                  ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                                  status: 'success',
                                  last_extracted: result.extracted_at,
                                  auto_extract: true
                                }
                              }
                            }));
                            toast({
                              title: "✅ Reviews extraídas!",
                              description: `Nota: ${result.data.rating}/5 (${result.data.reviewCount} avaliações)`
                            });
                          } else {
                            throw new Error(result.error);
                          }
                        } catch (error: any) {
                          setData(prev => ({
                            ...prev,
                            schema: {
                              ...prev.schema,
                              google_reviews: {
                                ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                                status: 'error',
                                error_message: error.message
                              }
                            }
                          }));
                          toast({
                            title: "❌ Erro na extração",
                            description: error.message,
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      {data.schema.google_reviews?.status === 'loading' ? 'Extraindo...' : 'Extrair Automaticamente'}
                    </Button>

                    <ReviewModerationModal
                      placeId={data.schema.google_reviews?.place_id || 
                        (data.schema.google_reviews?.url ? 
                          (data.schema.google_reviews.url.match(/cid=([^&]+)/)?.[1] || 
                           `generated_${Math.abs(data.schema.google_reviews.url.split('').reduce((a, b) => {
                             a = ((a << 5) - a) + b.charCodeAt(0);
                             return a & a;
                           }, 0))}`) : '')
                      }
                      landingPageId={id || 'default'}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!(data.schema.google_reviews?.url)}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Moderar Reviews
                      </Button>
                    </ReviewModerationModal>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!(data.schema.google_reviews?.url)}
                      onClick={async () => {
                        setData(prev => ({
                          ...prev,
                          schema: {
                            ...prev.schema,
                            google_reviews: {
                              ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                              status: 'loading'
                            }
                          }
                        }));

                        try {
                          const { supabase } = await import("@/integrations/supabase/client");
                          const { data: result, error } = await supabase.functions.invoke('extract-google-reviews', {
                            body: { 
                              url: data.schema.google_reviews?.url,
                              extract_individual_reviews: true
                            }
                          });

                          if (error) throw error;

                          if (result.success) {
                            setData(prev => ({
                              ...prev,
                              schema: {
                                ...prev.schema,
                                google_reviews: {
                                  ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                                  status: 'success',
                                  last_extracted: result.extracted_at,
                                  auto_extract: true,
                                  place_id: result.data?.place_id
                                }
                              }
                            }));
                            toast({
                              title: "✅ Reviews extraídas com sucesso!",
                              description: `${result.data.reviews_extracted} reviews salvas de ${result.data.total_found} encontradas`
                            });
                          } else {
                            throw new Error(result.error);
                          }
                        } catch (error: any) {
                          setData(prev => ({
                            ...prev,
                            schema: {
                              ...prev.schema,
                              google_reviews: {
                                ...(prev.schema.google_reviews ?? { url: '', auto_extract: false, last_extracted: '', status: 'idle' as const }),
                                status: 'error',
                                error_message: error.message
                              }
                            }
                          }));
                          toast({
                            title: "❌ Erro na extração individual",
                            description: error.message,
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Extrair Reviews Individuais
                    </Button>
                  </div>

                  {data.schema.google_reviews?.status === 'success' && data.schema.google_reviews?.last_extracted && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 font-medium">
                        Extraído em: {new Date(data.schema.google_reviews.last_extracted).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  
                  {data.schema.google_reviews?.status === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-700 font-medium">
                        ❌ {data.schema.google_reviews?.error_message}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Manual Reviews Upload Card */}
              <Card className="border-l-4 border-l-purple-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Reviews Manuais</CardTitle>
                      <p className="text-sm text-muted-foreground">Adicione reviews personalizadas via CSV</p>
                    </div>
                    {data.schema.manual_reviews && data.schema.manual_reviews.length > 0 && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {data.schema.manual_reviews.length} reviews
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando uploader…</div>}>
                    <CSVReviewUploader
                      reviews={data.schema.manual_reviews || []}
                      onReviewsUpdate={(reviews) => setData(prev => ({
                        ...prev,
                        schema: {
                          ...prev.schema,
                          manual_reviews: reviews
                        }
                      }))}
                    />
                  </Suspense>
                </CardContent>
              </Card>

              {/* Video Testimonials Section */}
              <VideoTestimonialsSection landingPageId={id || 'default'} />

              {/* Ofertas Card */}
              <Card className="border-l-4 border-l-orange-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Ofertas de Produtos</CardTitle>
                        <p className="text-sm text-muted-foreground">Configure ofertas estruturadas para SEO</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {data.schema.offers.length} ofertas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Importação em Massa via CSV */}
                  <ProductCSVUploader 
                    onProductsUpdate={(importedProducts) => {
                      // Processar dados dos produtos importados para incluir estrutura de preços
                      const processedProducts = importedProducts.map(product => ({
                        ...product,
                        selected: true,
                        original_price: product.originalPrice || '',
                        installment_price: product.installmentText || '',
                        discount_percentage: product.originalPrice && product.price 
                          ? Math.round(((parseFloat(product.originalPrice) - parseFloat(product.price)) / parseFloat(product.originalPrice)) * 100)
                          : 0,
                        sourceType: 'imported' as const,
                        lastUpdated: new Date().toISOString(),
                        currency: 'R$',
                        availability: product.available ? 'InStock' : 'OutOfStock',
                        valid_through: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
                      }));
                      
                      setData(prev => ({
                        ...prev,
                        schema: {
                          ...prev.schema,
                          offers: [...prev.schema.offers, ...processedProducts]
                        }
                      }));
                      toast({
                        title: "Produtos importados",
                        description: `${importedProducts.length} produto(s) adicionado(s) às ofertas`,
                      });
                    }}
                  />
                  
                  <Separator />
                  
                   {data.schema.offers.length > 0 && (
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <h4 className="font-medium">Ofertas Configuradas</h4>
                         <div className="flex items-center gap-3">
                           <Badge variant="secondary" className="text-xs">
                             {data.schema.offers.filter(offer => offer.selected !== false).length} de {data.schema.offers.length} selecionadas
                           </Badge>
                           <div className="flex gap-1">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 const newOffers = data.schema.offers.map(offer => ({ ...offer, selected: true }));
                                 setData(prev => ({
                                   ...prev,
                                   schema: { ...prev.schema, offers: newOffers }
                                 }));
                               }}
                               className="h-7 px-2 text-xs"
                             >
                               Todas
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 const newOffers = data.schema.offers.map(offer => ({ ...offer, selected: false }));
                                 setData(prev => ({
                                   ...prev,
                                   schema: { ...prev.schema, offers: newOffers }
                                 }));
                               }}
                               className="h-7 px-2 text-xs"
                             >
                               Nenhuma
                             </Button>
                           </div>
                         </div>
                       </div>
                       <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-4">
                          {data.schema.offers.map((offer, index) => (
                           <div key={index} className="p-3 border rounded-lg bg-muted/50 space-y-3">
                             {editingOffer === index ? (
                               // Edit mode
                               <div className="space-y-3">
                                 <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-semibold text-xs">
                                     {index + 1}
                                   </div>
                                   <Input
                                     value={offer.name || ''}
                                     onChange={(e) => {
                                       const newOffers = [...data.schema.offers];
                                       newOffers[index] = { ...newOffers[index], name: e.target.value };
                                       setData(prev => ({
                                         ...prev,
                                         schema: { ...prev.schema, offers: newOffers }
                                       }));
                                     }}
                                     placeholder="Nome da oferta"
                                     className="text-sm h-8"
                                   />
                                 </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <Input
                                        value={offer.price || ''}
                                        onChange={(e) => {
                                          const newOffers = [...data.schema.offers];
                                          newOffers[index] = { ...newOffers[index], price: e.target.value };
                                          setData(prev => ({
                                            ...prev,
                                            schema: { ...prev.schema, offers: newOffers }
                                          }));
                                        }}
                                        placeholder="Preço Promocional"
                                        className="text-sm h-8"
                                      />
                                      <Input
                                        value={offer.original_price || ''}
                                        onChange={(e) => {
                                          const newOffers = [...data.schema.offers];
                                          newOffers[index] = { ...newOffers[index], original_price: e.target.value };
                                          setData(prev => ({
                                            ...prev,
                                            schema: { ...prev.schema, offers: newOffers }
                                          }));
                                        }}
                                        placeholder="Preço Original"
                                        className="text-sm h-8"
                                      />
                                      <Input
                                        value={offer.installment_price || ''}
                                        onChange={(e) => {
                                          const newOffers = [...data.schema.offers];
                                          newOffers[index] = { ...newOffers[index], installment_price: e.target.value };
                                          setData(prev => ({
                                            ...prev,
                                            schema: { ...prev.schema, offers: newOffers }
                                          }));
                                        }}
                                        placeholder="Parcelamento"
                                        className="text-sm h-8"
                                      />
                                     <div className="flex gap-1">
                                       <Input
                                         value={offer.productUrl || ''}
                                         onChange={(e) => {
                                           const newOffers = [...data.schema.offers];
                                           newOffers[index] = { ...newOffers[index], productUrl: e.target.value };
                                           setData(prev => ({
                                             ...prev,
                                             schema: { ...prev.schema, offers: newOffers }
                                           }));
                                         }}
                                         onBlur={(e) => {
                                           const url = e.target.value.trim();
                                           if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                                             const normalizedUrl = `https://${url}`;
                                             const newOffers = [...data.schema.offers];
                                             newOffers[index] = { ...newOffers[index], productUrl: normalizedUrl };
                                             setData(prev => ({
                                               ...prev,
                                               schema: { ...prev.schema, offers: newOffers }
                                             }));
                                           }
                                         }}
                                         placeholder="URL do produto"
                                         className="text-sm h-8"
                                       />
                                       {offer.productUrl && offer.productUrl.trim() && (
                                         <Button
                                           variant="outline"
                                           size="sm"
                                           onClick={() => extractProductData(index)}
                                           disabled={extractingProduct === index}
                                           className="h-8 px-2 text-xs"
                                           title="Importar dados da Loja Integrada"
                                         >
                                           {extractingProduct === index ? (
                                             <Loader2 className="h-3 w-3 animate-spin" />
                                           ) : (
                                             <Download className="h-3 w-3" />
                                           )}
                                         </Button>
                                       )}
                                     </div>
                                   </div>
                                   <Input
                                     value={offer.image || ''}
                                     onChange={(e) => {
                                       const newOffers = [...data.schema.offers];
                                       newOffers[index] = { ...newOffers[index], image: e.target.value };
                                       setData(prev => ({
                                         ...prev,
                                         schema: { ...prev.schema, offers: newOffers }
                                       }));
                                     }}
                                     placeholder="URL da imagem"
                                     className="text-sm h-8"
                                   />
                                   <div className="grid grid-cols-2 gap-2">
                                     <Input
                                       value={offer.youtube_url || ''}
                                       onChange={(e) => {
                                         const newOffers = [...data.schema.offers];
                                         newOffers[index] = { ...newOffers[index], youtube_url: e.target.value };
                                         setData(prev => ({
                                           ...prev,
                                           schema: { ...prev.schema, offers: newOffers }
                                         }));
                                       }}
                                       placeholder="Vídeo YouTube"
                                       className="text-sm h-8"
                                     />
                                     <Input
                                       value={offer.instagram_url || ''}
                                       onChange={(e) => {
                                         const newOffers = [...data.schema.offers];
                                         newOffers[index] = { ...newOffers[index], instagram_url: e.target.value };
                                         setData(prev => ({
                                           ...prev,
                                           schema: { ...prev.schema, offers: newOffers }
                                         }));
                                       }}
                                       placeholder="Vídeo Instagram"
                                       className="text-sm h-8"
                                     />
                                   </div>
                                  <Textarea
                                    value={offer.description || ''}
                                    onChange={(e) => {
                                      const newOffers = [...data.schema.offers];
                                      newOffers[index] = { ...newOffers[index], description: e.target.value };
                                      setData(prev => ({
                                        ...prev,
                                        schema: { ...prev.schema, offers: newOffers }
                                      }));
                                    }}
                                    placeholder="Descrição da oferta"
                                    className="text-sm min-h-[60px]"
                                  />
                                  
                                  {/* Seção de Recursos e Downloads */}
                                  <div className="border-t pt-3 space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={offer.show_in_resources || false}
                                        onCheckedChange={(checked) => {
                                          const newOffers = [...data.schema.offers];
                                          newOffers[index] = { 
                                            ...newOffers[index], 
                                            show_in_resources: !!checked,
                                            resource_cta1: newOffers[index].resource_cta1 || { label: '', url: '', visible: false },
                                            resource_cta2: newOffers[index].resource_cta2 || { label: '', url: '', visible: false },
                                            resource_cta3: newOffers[index].resource_cta3 || { label: '', url: '', visible: false }
                                          };
                                          setData(prev => ({
                                            ...prev,
                                            schema: { ...prev.schema, offers: newOffers }
                                          }));
                                        }}
                                      />
                                      <Label className="text-sm font-medium">Exibir em Recursos/Downloads</Label>
                                    </div>
                                    
                                    {offer.show_in_resources && (
                                      <div className="space-y-3 bg-muted/30 p-3 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Configure até 3 botões CTA para este produto na seção de recursos:</p>
                                        
                                        {/* CTA 1 */}
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              checked={offer.resource_cta1?.visible || false}
                                              onCheckedChange={(checked) => {
                                                const newOffers = [...data.schema.offers];
                                                newOffers[index] = { 
                                                  ...newOffers[index], 
                                                  resource_cta1: { 
                                                    ...newOffers[index].resource_cta1, 
                                                    visible: !!checked 
                                                  }
                                                };
                                                setData(prev => ({
                                                  ...prev,
                                                  schema: { ...prev.schema, offers: newOffers }
                                                }));
                                              }}
                                            />
                                            <Label className="text-xs">CTA 1 Ativo</Label>
                                          </div>
                                          {offer.resource_cta1?.visible && (
                                            <div className="grid grid-cols-2 gap-2">
                                              <Input
                                                value={offer.resource_cta1?.label || ''}
                                                onChange={(e) => {
                                                  const newOffers = [...data.schema.offers];
                                                  newOffers[index] = { 
                                                    ...newOffers[index], 
                                                    resource_cta1: { 
                                                      ...newOffers[index].resource_cta1, 
                                                      label: e.target.value 
                                                    }
                                                  };
                                                  setData(prev => ({
                                                    ...prev,
                                                    schema: { ...prev.schema, offers: newOffers }
                                                  }));
                                                }}
                                                placeholder="Ex: Baixar Catálogo"
                                                className="text-xs h-7"
                                              />
                                              <Input
                                                value={offer.resource_cta1?.url || ''}
                                                onChange={(e) => {
                                                  const newOffers = [...data.schema.offers];
                                                  newOffers[index] = { 
                                                    ...newOffers[index], 
                                                    resource_cta1: { 
                                                      ...newOffers[index].resource_cta1, 
                                                      url: e.target.value 
                                                    }
                                                  };
                                                  setData(prev => ({
                                                    ...prev,
                                                    schema: { ...prev.schema, offers: newOffers }
                                                  }));
                                                }}
                                                placeholder="URL do link"
                                                className="text-xs h-7"
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {/* CTA 2 */}
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              checked={offer.resource_cta2?.visible || false}
                                              onCheckedChange={(checked) => {
                                                const newOffers = [...data.schema.offers];
                                                newOffers[index] = { 
                                                  ...newOffers[index], 
                                                  resource_cta2: { 
                                                    ...newOffers[index].resource_cta2, 
                                                    visible: !!checked 
                                                  }
                                                };
                                                setData(prev => ({
                                                  ...prev,
                                                  schema: { ...prev.schema, offers: newOffers }
                                                }));
                                              }}
                                            />
                                            <Label className="text-xs">CTA 2 Ativo</Label>
                                          </div>
                                          {offer.resource_cta2?.visible && (
                                            <div className="grid grid-cols-2 gap-2">
                                              <Input
                                                value={offer.resource_cta2?.label || ''}
                                                onChange={(e) => {
                                                  const newOffers = [...data.schema.offers];
                                                  newOffers[index] = { 
                                                    ...newOffers[index], 
                                                    resource_cta2: { 
                                                      ...newOffers[index].resource_cta2, 
                                                      label: e.target.value 
                                                    }
                                                  };
                                                  setData(prev => ({
                                                    ...prev,
                                                    schema: { ...prev.schema, offers: newOffers }
                                                  }));
                                                }}
                                                placeholder="Ex: Manual Técnico"
                                                className="text-xs h-7"
                                              />
                                              <Input
                                                value={offer.resource_cta2?.url || ''}
                                                onChange={(e) => {
                                                  const newOffers = [...data.schema.offers];
                                                  newOffers[index] = { 
                                                    ...newOffers[index], 
                                                    resource_cta2: { 
                                                      ...newOffers[index].resource_cta2, 
                                                      url: e.target.value 
                                                    }
                                                  };
                                                  setData(prev => ({
                                                    ...prev,
                                                    schema: { ...prev.schema, offers: newOffers }
                                                  }));
                                                }}
                                                placeholder="URL do link"
                                                className="text-xs h-7"
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {/* CTA 3 */}
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              checked={offer.resource_cta3?.visible || false}
                                              onCheckedChange={(checked) => {
                                                const newOffers = [...data.schema.offers];
                                                newOffers[index] = { 
                                                  ...newOffers[index], 
                                                  resource_cta3: { 
                                                    ...newOffers[index].resource_cta3, 
                                                    visible: !!checked 
                                                  }
                                                };
                                                setData(prev => ({
                                                  ...prev,
                                                  schema: { ...prev.schema, offers: newOffers }
                                                }));
                                              }}
                                            />
                                            <Label className="text-xs">CTA 3 Ativo</Label>
                                          </div>
                                          {offer.resource_cta3?.visible && (
                                            <div className="grid grid-cols-2 gap-2">
                                              <Input
                                                value={offer.resource_cta3?.label || ''}
                                                onChange={(e) => {
                                                  const newOffers = [...data.schema.offers];
                                                  newOffers[index] = { 
                                                    ...newOffers[index], 
                                                    resource_cta3: { 
                                                      ...newOffers[index].resource_cta3, 
                                                      label: e.target.value 
                                                    }
                                                  };
                                                  setData(prev => ({
                                                    ...prev,
                                                    schema: { ...prev.schema, offers: newOffers }
                                                  }));
                                                }}
                                                placeholder="Ex: Ver Produto"
                                                className="text-xs h-7"
                                              />
                                              <Input
                                                value={offer.resource_cta3?.url || ''}
                                                onChange={(e) => {
                                                  const newOffers = [...data.schema.offers];
                                                  newOffers[index] = { 
                                                    ...newOffers[index], 
                                                    resource_cta3: { 
                                                      ...newOffers[index].resource_cta3, 
                                                      url: e.target.value 
                                                    }
                                                  };
                                                  setData(prev => ({
                                                    ...prev,
                                                    schema: { ...prev.schema, offers: newOffers }
                                                  }));
                                                }}
                                                placeholder="URL do link"
                                                className="text-xs h-7"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex justify-end gap-2">
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setEditingOffer(null)}
                                   >
                                     Cancelar
                                   </Button>
                                   <Button
                                     variant="default"
                                     size="sm"
                                     onClick={() => setEditingOffer(null)}
                                   >
                                     Salvar
                                   </Button>
                                 </div>
                               </div>
                             ) : (
                                 // View mode
                                 <div className="flex items-center justify-between gap-3">
                                   <div className="flex items-center gap-3 flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                       <Checkbox
                                         checked={offer.selected !== false}
                                         onCheckedChange={(checked) => {
                                           const newOffers = [...data.schema.offers];
                                           newOffers[index] = { ...newOffers[index], selected: !!checked };
                                           setData(prev => ({
                                             ...prev,
                                             schema: { ...prev.schema, offers: newOffers }
                                           }));
                                         }}
                                         className="w-4 h-4"
                                       />
                                       <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-semibold text-xs">
                                         {index + 1}
                                       </div>
                                     </div>
                                    {offer.image && (
                                      <ImageDebugPreview
                                        src={offer.image}
                                        alt={offer.name || 'Produto'}
                                        size={48}
                                        debugLabel={`Oferta ${index + 1}`}
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                     <div className="text-sm font-medium truncate">
                                       {offer.name || `Oferta ${index + 1}`}
                                     </div>
                                       <div className="text-xs text-muted-foreground line-clamp-2">
                                         <div className="flex flex-wrap items-center gap-1">
                                           {offer.price && (
                                             <span className="font-medium text-foreground">R$ {offer.price}</span>
                                           )}
                                           {offer.original_price && offer.original_price !== offer.price && (
                                             <span className="line-through text-muted-foreground">R$ {offer.original_price}</span>
                                           )}
                                           {offer.discount_percentage && (
                                             <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">-{offer.discount_percentage}%</span>
                                           )}
                                         </div>
                                         {offer.installment_price && (
                                           <div className="text-xs text-muted-foreground mt-1">{offer.installment_price}</div>
                                         )}
                                         {offer.description && (
                                           <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{offer.description}</div>
                                         )}
                                         {offer.productUrl && !offer.name && (
                                           <div className="text-xs text-muted-foreground mt-1">
                                             {(() => {
                                               try {
                                                 return new URL(offer.productUrl).hostname;
                                               } catch {
                                                 return offer.productUrl.replace(/^https?:\/\//, '').split('/')[0];
                                               }
                                             })()}
                                           </div>
                                         )}
                                       </div>
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {offer.sourceType === 'imported' && (
                                          <Badge variant="secondary" className="text-xs">
                                            Importado {offer.lastUpdated && `• ${new Date(offer.lastUpdated).toLocaleDateString('pt-BR')}`}
                                          </Badge>
                                        )}
                                        {offer.youtube_url && (
                                          <Badge variant="outline" className="text-xs">
                                            📺 YouTube
                                          </Badge>
                                        )}
                                        {offer.instagram_url && (
                                          <Badge variant="outline" className="text-xs">
                                            📱 Instagram
                                          </Badge>
                                        )}
                                      </div>
                                   </div>
                                 </div>
                             <div className="flex items-center gap-2">
                               {extractingProduct === index && (
                                 <Badge variant="outline" className="text-xs">
                                   ⏳ Importando...
                                 </Badge>
                               )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingOffer(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                 {offer.productUrl && offer.productUrl.trim() && (
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => {
                                       console.log('Clicando em importar para URL:', offer.productUrl);
                                       extractProductData(index);
                                     }}
                                     disabled={extractingProduct === index}
                                     className="h-8 w-8 p-0"
                                     title="Importar dados da Loja Integrada"
                                   >
                                     <Download className="h-4 w-4" />
                                   </Button>
                                 )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOffers = data.schema.offers.filter((_, i) => i !== index);
                                    setData(prev => ({
                                      ...prev,
                                      schema: { ...prev.schema, offers: newOffers }
                                    }));
                                  }}
                                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                         ))}
                        </div>
                      </div>
                    )}
                   
                   <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setData(prev => ({
                        ...prev,
                        schema: {
                          ...prev.schema,
                           offers: [...prev.schema.offers, {
                             name: '',
                             description: '',
                             price: '',
                             currency: 'BRL',
                             availability: 'InStock',
                             valid_through: '',
                             productUrl: '',
                             youtube_url: '',
                             instagram_url: '',
                             sourceType: 'manual' as const,
                             lastUpdated: undefined
                           }]
                        }
                      }));
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Nova Oferta
                  </Button>
                </CardContent>
              </Card>

              {/* Breadcrumb Card */}
              <Card className="border-l-4 border-l-indigo-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Folder className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Breadcrumb Navigation</CardTitle>
                        <p className="text-sm text-muted-foreground">Configure a navegação estruturada</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {data.schema.breadcrumb.length} itens
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const autoBreadcrumb = breadcrumbs.map(item => ({
                            name: item.label,
                            url: item.href
                          }));
                          setData(prev => ({
                            ...prev,
                            schema: { ...prev.schema, breadcrumb: autoBreadcrumb }
                          }));
                          toast({
                            title: "Breadcrumb automático gerado!",
                            description: `${autoBreadcrumb.length} itens de navegação foram criados automaticamente.`,
                          });
                        }}
                      >
                        🤖 Gerar Automático
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.schema.breadcrumb.map((crumb, index) => (
                    <div key={index} className="flex gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome da página"
                          value={crumb.name}
                          onChange={(e) => {
                            const newBreadcrumb = [...data.schema.breadcrumb];
                            newBreadcrumb[index].name = e.target.value;
                            setData(prev => ({
                              ...prev,
                              schema: { ...prev.schema, breadcrumb: newBreadcrumb }
                            }));
                          }}
                        />
                        <Input
                          placeholder="URL da página"
                          value={crumb.url}
                          onChange={(e) => {
                            const newBreadcrumb = [...data.schema.breadcrumb];
                            newBreadcrumb[index].url = e.target.value;
                            setData(prev => ({
                              ...prev,
                              schema: { ...prev.schema, breadcrumb: newBreadcrumb }
                            }));
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newBreadcrumb = data.schema.breadcrumb.filter((_, i) => i !== index);
                          setData(prev => ({
                            ...prev,
                            schema: { ...prev.schema, breadcrumb: newBreadcrumb }
                          }));
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setData(prev => ({
                        ...prev,
                        schema: {
                          ...prev.schema,
                          breadcrumb: [...prev.schema.breadcrumb, { name: '', url: '' }]
                        }
                      }));
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item do Breadcrumb
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Marca & Confiança */}
            <TabsContent value="brand-trust" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Marca & Confiança</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible defaultValue="brand-info">
                    
                    {/* Informações da Marca */}
                    <AccordionItem value="brand-info">
                      <AccordionTrigger>Informações da Marca</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label>Nome Legal da Empresa</Label>
                          <Input
                            value={data.brand.legal_name}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              brand: { ...prev.brand, legal_name: e.target.value }
                            }))}
                            placeholder="Exemplo Tecnologia Ltda"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* SameAs (Presença Digital) */}
                    <AccordionItem value="same-as">
                      <AccordionTrigger>Presença Digital (SameAs)</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {data.brand.same_as.map((sameAs, index) => (
                          <div key={index} className="flex gap-2">
                            <Select
                              value={sameAs.platform}
                              onValueChange={(value) => {
                                const newSameAs = [...data.brand.same_as];
                                newSameAs[index].platform = value;
                                setData(prev => ({
                                  ...prev,
                                  brand: { ...prev.brand, same_as: newSameAs }
                                }));
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Plataforma" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="twitter">Twitter</SelectItem>
                                <SelectItem value="youtube">YouTube</SelectItem>
                                <SelectItem value="wikipedia">Wikipedia</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="URL completa"
                              value={sameAs.url}
                              onChange={(e) => {
                                const newSameAs = [...data.brand.same_as];
                                newSameAs[index].url = e.target.value;
                                setData(prev => ({
                                  ...prev,
                                  brand: { ...prev.brand, same_as: newSameAs }
                                }));
                              }}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newSameAs = data.brand.same_as.filter((_, i) => i !== index);
                                setData(prev => ({
                                  ...prev,
                                  brand: { ...prev.brand, same_as: newSameAs }
                                }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setData(prev => ({
                              ...prev,
                              brand: {
                                ...prev.brand,
                                same_as: [...prev.brand.same_as, { platform: '', url: '' }]
                              }
                            }));
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Presença Digital
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Políticas */}
                    <AccordionItem value="policies">
                      <AccordionTrigger>Políticas e Documentos</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label>Política de Privacidade</Label>
                          <Input
                            value={data.brand.policies.privacy_url}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              brand: {
                                ...prev.brand,
                                policies: { ...prev.brand.policies, privacy_url: e.target.value }
                              }
                            }))}
                            placeholder="https://exemplo.com/privacidade"
                          />
                        </div>
                        
                        <div>
                          <Label>Termos de Uso</Label>
                          <Input
                            value={data.brand.policies.terms_url}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              brand: {
                                ...prev.brand,
                                policies: { ...prev.brand.policies, terms_url: e.target.value }
                              }
                            }))}
                            placeholder="https://exemplo.com/termos"
                          />
                        </div>
                        
                        <div>
                          <Label>Política de Segurança</Label>
                          <Input
                            value={data.brand.policies.security_url}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              brand: {
                                ...prev.brand,
                                policies: { ...prev.brand.policies, security_url: e.target.value }
                              }
                            }))}
                            placeholder="https://exemplo.com/seguranca"
                          />
                        </div>
                        
                        <div>
                          <Label>Política de Cookies</Label>
                          <Input
                            value={data.brand.policies.cookies_url}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              brand: {
                                ...prev.brand,
                                policies: { ...prev.brand.policies, cookies_url: e.target.value }
                              }
                            }))}
                            placeholder="https://exemplo.com/cookies"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Email Marketing */}
            <TabsContent value="email" className="space-y-4">
              {/* Controles Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Controles de Seções do Email
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allEnabled = Object.values(
                            data.email.sections || {
                              header: { enabled: true },
                              content: { enabled: true },
                              ctas: { enabled: true },
                              highlights: { enabled: true },
                              benefits: { enabled: true },
                              main_image: { enabled: true },
                              solutions: { enabled: false },
                              footer: { enabled: true }
                            }
                          ).every((section: any) => section.enabled);
                          setData(prev => ({
                            ...prev,
                            email: {
                              ...prev.email,
                              sections: {
                                header: { enabled: !allEnabled },
                                content: { enabled: !allEnabled },
                                ctas: { enabled: !allEnabled },
                                highlights: { enabled: !allEnabled },
                                benefits: { enabled: !allEnabled },
                                main_image: { enabled: !allEnabled },
                                solutions: { enabled: !allEnabled },
                                footer: { enabled: !allEnabled }
                              }
                            }
                          }));
                        }}
                      >
                        {Object.values(
                          data.email.sections || {
                            header: { enabled: true },
                            content: { enabled: true },
                            ctas: { enabled: true },
                            highlights: { enabled: true },
                            benefits: { enabled: true },
                            main_image: { enabled: true },
                            solutions: { enabled: false },
                            footer: { enabled: true }
                          }
                        ).every((section: any) => section.enabled) ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'header', label: 'Cabeçalho', description: 'Logo, selo, título' },
                      { key: 'content', label: 'Conteúdo', description: 'Título principal, subtítulo' },
                      { key: 'ctas', label: 'CTAs', description: 'Botões de ação' },
                      { key: 'highlights', label: 'Destaques', description: 'Blocos informativos' },
                      { key: 'benefits', label: 'Benefícios', description: 'Lista de vantagens' },
                      { key: 'main_image', label: 'Imagem Principal', description: 'Imagem com link' },
                      { key: 'solutions', label: 'Cards de Soluções', description: 'Produtos/serviços' },
                      { key: 'footer', label: 'Rodapé', description: 'Endereço, links' }
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Switch
                          checked={data.email.sections?.[key as any]?.enabled ?? false}
                          onCheckedChange={(checked) => setData(prev => ({
                            ...prev,
                            email: {
                              ...prev.email,
                              sections: {
                                ...(prev.email.sections ?? {
                                  header: { enabled: true },
                                  content: { enabled: true },
                                  ctas: { enabled: true },
                                  highlights: { enabled: true },
                                  benefits: { enabled: true },
                                  main_image: { enabled: true },
                                  solutions: { enabled: false },
                                  footer: { enabled: true }
                                }),
                                [key]: { enabled: checked }
                              }
                            }
                          }))}
                        />
                        <div className="flex-1">
                          <Label className="font-medium">{label}</Label>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Seções ativas:</strong> {Object.values(
                        data.email.sections || {
                          header: { enabled: true },
                          content: { enabled: true },
                          ctas: { enabled: true },
                          highlights: { enabled: true },
                          benefits: { enabled: true },
                          main_image: { enabled: true },
                          solutions: { enabled: false },
                          footer: { enabled: true }
                        }
                      ).filter((s: any) => s.enabled).length} de 8
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Accordion type="single" collapsible defaultValue="email-header">
                
                 {/* Header do Email */}
                <AccordionItem value="email-header">
                  <AccordionTrigger className="flex items-center gap-2">
                    Header do Email
                    {!((data.email.sections?.header?.enabled) ?? true) && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Assunto do Email</Label>
                      <Input
                        value={data.email.assunto_email}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, assunto_email: e.target.value }
                        }))}
                        placeholder="Assunto atrativo para o email"
                      />
                    </div>
                    
                    <div>
                      <Label>Preheader</Label>
                      <Input
                        value={data.email.preheader_texto}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, preheader_texto: e.target.value }
                        }))}
                        placeholder="Texto de preview que aparece após o assunto"
                      />
                    </div>
                    
                    <div>
                      <Label>URL do Site</Label>
                      <Input
                        value={data.email.url_site}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, url_site: e.target.value }
                        }))}
                        placeholder="https://seusite.com"
                      />
                    </div>
                    
                    <div>
                      <Label>Logo do Email</Label>
                      <ImageUploader
                        value={data.email.logo_src}
                        onChange={(imageData) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, logo_src: imageData }
                        }))}
                        placeholder="Logo para o cabeçalho do email"
                      />
                    </div>
                    
                    <div>
                      <Label>Selo/Badge</Label>
                      <Input
                        value={data.email.selo}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, selo: e.target.value }
                        }))}
                        placeholder="Ex: LÍDER EM INOVAÇÃO"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Conteúdo Principal */}
                <AccordionItem value="email-content">
                  <AccordionTrigger className="flex items-center gap-2">
                    Conteúdo Principal
                    {!((data.email.sections?.content?.enabled) ?? true) && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Título Principal</Label>
                      <Input
                        value={data.email.titulo_principal}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, titulo_principal: e.target.value }
                        }))}
                        placeholder="Título chamativo do email"
                      />
                    </div>
                    
                    <div>
                      <Label>Subtítulo</Label>
                      <Textarea
                        value={data.email.subtitulo}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, subtitulo: e.target.value }
                        }))}
                        placeholder="Subtítulo explicativo"
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* CTAs */}
                <AccordionItem value="email-ctas">
                  <AccordionTrigger className="flex items-center gap-2">
                    CTAs do Email
                    {!((data.email.sections?.ctas?.enabled) ?? true) && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">CTA Primário</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Label do CTA</Label>
                          <Input
                            value={data.email.cta_label}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              email: { ...prev.email, cta_label: e.target.value }
                            }))}
                            placeholder="Ver Produtos"
                          />
                        </div>
                        <div>
                          <Label>URL do CTA</Label>
                          <Input
                            value={data.email.cta_href}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              email: { ...prev.email, cta_href: e.target.value }
                            }))}
                            placeholder="https://exemplo.com/produtos"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Subcopy do CTA</Label>
                        <Input
                          value={data.email.cta_subcopy}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, cta_subcopy: e.target.value }
                          }))}
                          placeholder="Acesso imediato ao catálogo completo"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">CTA Secundário</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Label do CTA 2</Label>
                          <Input
                            value={data.email.cta2_label}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              email: { ...prev.email, cta2_label: e.target.value }
                            }))}
                            placeholder="Falar com Especialista"
                          />
                        </div>
                        <div>
                          <Label>URL do CTA 2</Label>
                          <Input
                            value={data.email.cta2_href}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              email: { ...prev.email, cta2_href: e.target.value }
                            }))}
                            placeholder="https://wa.me/..."
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Destaques */}
                <AccordionItem value="email-highlights">
                  <AccordionTrigger className="flex items-center gap-2">
                    Destaques
                    {!((data.email.sections?.highlights?.enabled) ?? true) && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Bloco 1 - Título</Label>
                        <Input
                          value={data.email.bloco1_titulo}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, bloco1_titulo: e.target.value }
                          }))}
                          placeholder="Título do primeiro destaque"
                        />
                      </div>
                      <div>
                        <Label>Bloco 1 - Texto</Label>
                        <Input
                          value={data.email.bloco1_texto}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, bloco1_texto: e.target.value }
                          }))}
                          placeholder="Descrição do primeiro destaque"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Bloco 2 - Título</Label>
                        <Input
                          value={data.email.bloco2_titulo}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, bloco2_titulo: e.target.value }
                          }))}
                          placeholder="Título do segundo destaque"
                        />
                      </div>
                      <div>
                        <Label>Bloco 2 - Texto</Label>
                        <Input
                          value={data.email.bloco2_texto}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, bloco2_texto: e.target.value }
                          }))}
                          placeholder="Descrição do segundo destaque"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Benefícios */}
                <AccordionItem value="email-benefits">
                  <AccordionTrigger className="flex items-center gap-2">
                    Benefícios
                    {!data.email.sections?.benefits?.enabled && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Benefício 1</Label>
                      <Input
                        value={data.email.beneficio_1}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, beneficio_1: e.target.value }
                        }))}
                        placeholder="Primeiro benefício principal"
                      />
                    </div>
                    
                    <div>
                      <Label>Benefício 2</Label>
                      <Input
                        value={data.email.beneficio_2}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, beneficio_2: e.target.value }
                        }))}
                        placeholder="Segundo benefício principal"
                      />
                    </div>
                    
                    <div>
                      <Label>Benefício 3</Label>
                      <Input
                        value={data.email.beneficio_3}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, beneficio_3: e.target.value }
                        }))}
                        placeholder="Terceiro benefício principal"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Imagem do Email */}
                <AccordionItem value="email-image">
                  <AccordionTrigger className="flex items-center gap-2">
                    Imagem Principal
                    {!data.email.sections?.main_image?.enabled && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>URL de Destino da Imagem</Label>
                      <Input
                        value={data.email.imagem_href}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, imagem_href: e.target.value }
                        }))}
                        placeholder="Para onde a imagem deve levar quando clicada"
                      />
                    </div>
                    
                    <div>
                      <Label>Imagem do Email</Label>
                      <ImageUploader
                        value={data.email.imagem_src}
                        onChange={(imageData) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, imagem_src: imageData }
                        }))}
                        placeholder="Imagem principal do email"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Cards de Soluções */}
                <AccordionItem value="email-solutions">
                  <AccordionTrigger className="flex items-center gap-2">
                    Cards de Soluções
                    {!data.email.sections?.solutions?.enabled && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={data.email.sections?.solutions?.enabled || data.email.show_solutions_in_email || false}
                        onCheckedChange={(checked) => setData(prev => ({
                          ...prev,
                          email: { 
                            ...prev.email, 
                            sections: {
                              ...(prev.email.sections ?? {
                                header: { enabled: true },
                                content: { enabled: true },
                                ctas: { enabled: true },
                                highlights: { enabled: true },
                                benefits: { enabled: true },
                                main_image: { enabled: true },
                                solutions: { enabled: false },
                                footer: { enabled: true }
                              }),
                              solutions: { enabled: checked }
                            },
                            show_solutions_in_email: checked 
                          }
                        }))}
                      />
                      <Label>Incluir cards de soluções no email</Label>
                    </div>
                    
                    {(data.email.sections?.solutions?.enabled || data.email.show_solutions_in_email) && (
                      <div>
                        <Label>Título da Seção</Label>
                        <Input
                          value={data.email.solutions_title || "Nossos Serviços"}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, solutions_title: e.target.value }
                          }))}
                          placeholder="Título para a seção de soluções no email"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Os cards utilizarão as soluções configuradas na aba "Conteúdo"
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Footer */}
                <AccordionItem value="email-footer">
                  <AccordionTrigger className="flex items-center gap-2">
                    Footer do Email
                    {!data.email.sections?.footer?.enabled && (
                      <Badge variant="secondary" className="text-xs">Desabilitado</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Nome da Marca</Label>
                      <Input
                        value={data.email.brand_name}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, brand_name: e.target.value }
                        }))}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    
                    <div>
                      <Label>Endereço Completo</Label>
                      <Input
                        value={data.email.endereco_completo}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          email: { ...prev.email, endereco_completo: e.target.value }
                        }))}
                        placeholder="Endereço completo da empresa"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Link de Suporte</Label>
                        <Input
                          value={data.email.link_suporte}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, link_suporte: e.target.value }
                          }))}
                          placeholder="https://exemplo.com/suporte"
                        />
                      </div>
                      <div>
                        <Label>Link de Descadastro</Label>
                        <Input
                          value={data.email.link_descadastro}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, link_descadastro: e.target.value }
                          }))}
                          placeholder="https://exemplo.com/descadastro"
                        />
                      </div>
                      <div>
                        <Label>Link de Preferências</Label>
                        <Input
                          value={data.email.link_preferencias}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            email: { ...prev.email, link_preferencias: e.target.value }
                          }))}
                          placeholder="https://exemplo.com/preferencias"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
          </Tabs>
        </div>

        {/* Export Professional Panel */}
        {data.seo.export_panel_enabled && (
          <div className="w-1/2 bg-gradient-to-br from-green-50 to-blue-50 border-l">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-green-800 mb-4">🚀 Exportação Profissional</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                  onClick={() => {
                    const completeHTML = generateHTML(beforePreview(onSave(data)));
                    navigator.clipboard.writeText(completeHTML);
                    toast({ title: "HTML Completo Copiado!", description: "Código pronto para editor web" });
                  }}
                >
                  <Code className="h-4 w-4 mr-2" />
                  HTML Completo
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                  onClick={() => {
                    const processedData = beforePreview(onSave(data));
                    const schemaData = {
                      "@context": "https://schema.org",
                      "@graph": [
                        {
                          "@type": "SoftwareApplication",
                          "name": processedData.schema.software_app.name,
                          "applicationCategory": processedData.schema.software_app.application_category,
                          "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": processedData.schema.software_app.rating_value,
                            "ratingCount": processedData.schema.software_app.rating_count
                          }
                        },
                        ...(processedData.faq.length > 0 ? [{
                          "@type": "FAQPage",
                          "mainEntity": processedData.faq.map(faq => ({
                            "@type": "Question",
                            "name": faq.question,
                            "acceptedAnswer": {
                              "@type": "Answer",
                              "text": faq.answer
                            }
                          }))
                        }] : [])
                      ]
                    };
                    navigator.clipboard.writeText(JSON.stringify(schemaData, null, 2));
                    toast({ title: "Schema Markup Copiado!", description: "Dados estruturados JSON-LD prontos" });
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Schema JSON-LD
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                  onClick={() => {
                    const processedData = beforePreview(onSave(data));
                    const metaTags = `
<!-- SEO Meta Tags -->
<title>${processedData.seo_title}</title>
<meta name="description" content="${processedData.seo_description}">
<meta name="robots" content="${processedData.seo.meta_robots}">
<link rel="canonical" href="${processedData.seo.canonical_url}">

<!-- Open Graph -->
<meta property="og:title" content="${processedData.seo.og_title || processedData.seo_title}">
<meta property="og:description" content="${processedData.seo.og_description || processedData.seo_description}">
<meta property="og:type" content="${processedData.seo.og_type}">
<meta property="og:image" content="${processedData.seo.og_image.src}">

<!-- Twitter Cards -->
<meta name="twitter:card" content="${processedData.seo.twitter_card}">
<meta name="twitter:title" content="${processedData.seo.twitter_title || processedData.seo_title}">
<meta name="twitter:description" content="${processedData.seo.twitter_description || processedData.seo_description}">
<meta name="twitter:image" content="${processedData.seo.twitter_image.src || processedData.seo.og_image.src}">`;
                    navigator.clipboard.writeText(metaTags);
                    toast({ title: "Meta Tags Copiadas!", description: "Código para <head> do seu site" });
                  }}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Meta Tags
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-red-50 hover:bg-red-100 border-red-200"
                  onClick={() => {
                    const processedData = beforePreview(onSave(data));
                    const gtmCode = `
<!-- Google Tag Manager - Data Layer -->
<script>
dataLayer = [{
  'page_title': '${processedData.seo_title}',
  'page_type': 'landing_page',
  'content_group1': '${processedData.template}',
  'custom_map': {
    'dimension1': '${processedData.name}',
    'dimension2': '${processedData.status}'
  }
}];
</script>`;
                    navigator.clipboard.writeText(gtmCode);
                    toast({ title: "GTM Code Copiado!", description: "Código para Google Tag Manager" });
                  }}
                >
                  📊 GTM Code
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                  onClick={async () => {
                    try {
                      const processedData = beforePreview(onSave(data));
                      const html = generateHTML(processedData);
                      
                      const response = await supabase.functions.invoke('validate-schema', {
                        body: { 
                          html, 
                          url: processedData.seo.canonical_url || 'https://seudominio.com' 
                        }
                      });
                      
                      if (response.error) {
                        toast({ 
                          title: "Erro na Validação", 
                          description: "Falha ao validar schema markup",
                          variant: "destructive" 
                        });
                        return;
                      }
                      
                      const result = response.data;
                      if (result.isValid) {
                        toast({ 
                          title: "✅ Schema Válido!", 
                          description: `${result.warnings.join('. ')}` 
                        });
                      } else {
                        toast({ 
                          title: "⚠️ Problemas no Schema", 
                          description: result.errors.slice(0, 2).join('. '),
                          variant: "destructive" 
                        });
                      }
                    } catch (error) {
                      toast({ 
                        title: "Erro", 
                        description: "Falha ao validar schema",
                        variant: "destructive" 
                      });
                    }
                  }}
                >
                  🔍 Validar Schema
                </Button>
              </div>
              
              {/* SEO Score Resumo Avançado */}
              <div className="mt-4 p-3 bg-white rounded-lg border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Otimização SEO:</span>
                  {(() => {
                    const { score, percentage } = computeSEOScore(data);
                    return (
                      <span className={`font-bold ${percentage >= 75 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {percentage}% 
                        {percentage >= 75 ? ' ✅ Excelente' : percentage >= 50 ? ' ⚠️ Bom' : ' ❌ Precisa melhorar'}
                      </span>
                    );
                  })()}
                </div>
                
                {/* Resumo rápido do que falta */}
                {(() => {
                  const { breakdown } = computeSEOScore(data);
                  const pendingItems = breakdown.filter(item => item.status === 'pending');
                  
                  if (pendingItems.length > 0) {
                    return (
                      <div className="text-xs text-amber-700">
                        <p className="font-medium">Para 100%: {pendingItems.slice(0, 3).map(item => item.item).join(', ')}{pendingItems.length > 3 ? ` +${pendingItems.length - 3} itens` : ''}</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-xs text-green-700 font-medium">
                      🎉 SEO 100% otimizado! Todos os critérios atendidos.
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Preview Panel */}
        <div className={`${data.seo.hreflang_auto ? 'w-1/2' : 'w-1/2'} bg-gray-100 flex flex-col`}>
          <div className="p-4 bg-white border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Preview em Tempo Real</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Nova Aba
                </Button>
                <Button variant="outline" size="sm" onClick={handleViewCode}>
                  <Code className="h-4 w-4 mr-2" />
                  Ver Código
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleTestSelFlux} className="bg-orange-100 hover:bg-orange-200">
                  🧪 Test SelFlux
                </Button>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="landing-preview" className="flex-1 flex flex-col" value={previewTab} onValueChange={setPreviewTab}>
            <TabsList className="mx-4 mt-4 grid w-auto grid-cols-3">
              <TabsTrigger value="landing-preview">Landing Page</TabsTrigger>
              <TabsTrigger value="email-preview">Email Marketing</TabsTrigger>
              <TabsTrigger value="blog-preview">Blog Post</TabsTrigger>
            </TabsList>
            
            <TabsContent value="landing-preview" className="flex-1 p-4">
              <div className="h-full border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={generatedHTML}
                  className="w-full h-full"
                  title="Landing Page Preview"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="email-preview" className="flex-1 p-4">
              <div className="h-full border rounded-lg overflow-hidden">
                <iframe
                  key={`email-${generatedEmailHTML.length}-${Date.now()}`}
                  srcDoc={generatedEmailHTML}
                  className="w-full h-full"
                  title="Email Preview"
                />
              </div>
            </TabsContent>

            <TabsContent value="blog-preview" className="flex-1 p-4">
              <div className="h-full flex flex-col">
                {!blogPostData && (
                  <div className="flex-1 flex items-center justify-center border rounded-lg">
                    <div className="text-center space-y-4">
                      <p className="text-muted-foreground">
                        Gere um blog post baseado na sua landing page
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => generateBlogPost()} 
                          disabled={generatingBlog}
                          className="gap-2"
                        >
                          {generatingBlog ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            '🚀'
                          )}
                          {generatingBlog ? 'Gerando...' : 'Gerar Blog'}
                        </Button>
                        <Button 
                          onClick={() => generateBlogPost(true)} 
                          disabled={generatingBlog}
                          variant="outline"
                          className="gap-2"
                        >
                          ⚡ Rápido
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {blogPostData && (
                  <div className="h-full flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Preview do Blog Post</h3>
                       <div className="flex gap-2">
                        <Button 
                          onClick={() => generateBlogPost()} 
                          disabled={generatingBlog}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          {generatingBlog ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            '🔄'
                          )}
                          Regenerar
                        </Button>
                        <Button 
                          onClick={() => generateBlogPost(true)} 
                          disabled={generatingBlog}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          ⚡ Rápido
                        </Button>
                        <Button 
                          onClick={() => navigate(`/blog-generator/${id}`, { 
                            state: { 
                              blogData: blogPostData, 
                              landingPageData: data,
                              fromEditor: true 
                            } 
                          })} 
                          variant="default"
                          size="sm"
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                       </div>
                    </div>
                    
                    <div className="flex-1 border rounded-lg overflow-hidden">
                      <iframe
                        key={`blog-${Date.now()}`}
                        srcDoc={generatedBlogHTML}
                        className="w-full h-full"
                        title="Blog Post Preview"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const Editor = () => {
  return (
    <ProtectedRoute requiredRole="admin">
      <EditorContent />
    </ProtectedRoute>
  );
};

export default Editor;