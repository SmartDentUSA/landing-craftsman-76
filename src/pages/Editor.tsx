import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { RotateCcw, RotateCw } from "lucide-react";
import { BannerSection } from "@/components/editor/BannerSection";
import { SolutionsSection } from "@/components/editor/SolutionsSection";
import { SEOSection } from "@/components/editor/SEOSection";
import { KOLSection } from "@/components/editor/KOLSection";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleAdsTab } from "@/components/google-ads/GoogleAdsTab";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/ui/tag-input";
import { ArrowLeft, Save, Eye, Code, Copy, Settings, Plus, Trash2, Edit, Download, Globe, Mail, Instagram, Facebook, Youtube, Twitter, Linkedin, Users, Laptop, Tag, Folder, Star, DollarSign, Monitor, Loader2, Wand2, Lightbulb, FileText, Link, Sparkles, VideoIcon, Zap, ExternalLink, CheckCircle, Search } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProductLinkModal } from "@/components/ProductLinkModal";
import { BlogEditorSection } from "@/components/BlogEditorSection";
import { StrategicBlogPreview } from "@/components/StrategicBlogPreview";
import { Checkbox } from "@/components/ui/checkbox";
import { ReviewModerationModal } from "@/components/ReviewModerationModal";
import VideoTestimonialsSection from "@/components/VideoTestimonialsSection";
const CSVReviewUploader: any = lazy(() => import("@/components/CSVReviewUploader").then(m => ({ default: (m as any).CSVReviewUploader ?? (m as any).default })));
import { ProductCSVUploader } from "@/components/ProductCSVUploader";
import { ImageDebugPreview } from "@/components/ImageDebugPreview";
import { RepositoryPanel } from "@/components/RepositoryPanel";
import { ProductSelector } from "@/components/ProductSelector";
import { SelectedProductsPanel } from "@/components/SelectedProductsPanel";
import { CompanyProfileManager } from "@/components/CompanyProfileManager";
import { useToast } from "@/hooks/use-toast";
import { useLandingPagesSupabase } from "@/hooks/useLandingPagesSupabase";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/ImageUploader";
import { useProductSync } from "@/hooks/useProductSync";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { useDebounce } from "@/hooks/useDebounce";
import { useDesktopInfoAutoSave } from "@/hooks/useDesktopInfoAutoSave";
import { useExplanatoryVideoAutoSave } from "@/hooks/useExplanatoryVideoAutoSave";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { generateHTML, generateEmailHTML, generateBlogHTML, generatePreviewHTML } from "@/lib/template-engine";
import { supabase } from "@/integrations/supabase/client";
import { useAutoFooterPopulation } from "@/hooks/useAutoFooterPopulation";
import { validateMetaDescription, validateCanonicalURL } from "@/lib/seo-validators";
import { generateBlogHTML as generateSEOBlogHTML } from '@/services/seo/blogHTMLGenerator';


// ✅ PATCH 0.2: Estados para Blogs Estratégicos (Dentala + Eodonto)
interface BlogPost {
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
}

// SelFlux mode completely removed - using only standard template engine

// Interface de dados de imagem - migrado de Cloudflare para Supabase Storage
interface ImageData {
  mode: 'url' | 'supabase';
  src: string;
  supabase_path?: string;
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
  manual_reviews_enabled?: boolean;
  video_testimonials_enabled?: boolean;
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
  // 🆕 Novos campos para Reviews Schema
  reviews_enabled?: boolean;
  local_business_enabled?: boolean;
  all_reviews?: Array<{
    type: 'google' | 'manual' | 'video';
    author_name: string;
    rating: number;
    review_text?: string;
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
    sourceType?: 'manual' | 'imported' | 'repository';
    lastUpdated?: string;
    selected?: boolean;
    original_price?: string;
    installment_price?: string;
    discount_percentage?: number;
    rating?: string;
    rating_count?: number;
    show_in_resources?: boolean;
    resource_cta1?: { label: string; url: string; visible: boolean };
    resource_cta2?: { label: string; url: string; visible: boolean };
    resource_cta3?: { label: string; url: string; visible: boolean };
    product_id?: string;
    technical_videos?: Array<{ url: string; description: string }>;
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
  explanatory_video_section: {
    visible_desktop: boolean;
    visible_mobile: boolean;
    selected_video: {
      url: string;
      title: string;
      product_name: string;
      product_id: string;
    } | null;
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
  author_kol_id?: string; // ID do KOL que assina o blog estratégico
}

// Função para criar ImageData padrão
const createImageData = (src: string = '', alt: string = ''): ImageData => ({
  mode: 'url',
  src,
  supabase_path: undefined,
  alt,
  scale: 1.0
});

/**
 * Garante que os dados da landing page tenham todos os campos obrigatórios
 * Previne erros "Cannot read properties of undefined"
 */
const ensureLandingPageDefaults = (data: Partial<LandingPageData>): LandingPageData => {
  // Schema SEMPRE deve existir com estrutura mínima
  const schema: SchemaData = {
    software_app: data.schema?.software_app || {
      name: 'Smart Dent',
      category: 'HealthApplication',
      rating_value: '4.8',
      rating_count: '150',
      price: '0',
      price_currency: 'BRL',
      operating_system: 'Web',
      application_category: 'HealthApplication'
    },
    google_reviews: data.schema?.google_reviews || {
      url: '',
      auto_extract: false,
      last_extracted: '',
      status: 'idle'
    },
    offers: data.schema?.offers || [],
    breadcrumb: data.schema?.breadcrumb || []
  };

  // Banner sempre deve existir
  const banner = {
    badge_text: data.banner?.badge_text || '',
    title: data.banner?.title || '',
    subtitle: data.banner?.subtitle || '',
    cta_primary: data.banner?.cta_primary || { label: '', href: '' },
    cta_secondary: data.banner?.cta_secondary || { label: '', href: '' },
    images: Array.isArray(data.banner?.images) && data.banner.images.length > 0 
      ? data.banner.images 
      : [createImageData()]
  };

  // Email sempre deve existir
  const email: EmailData = {
    sections: data.email?.sections || {
      header: { enabled: true },
      content: { enabled: true },
      ctas: { enabled: true },
      highlights: { enabled: true },
      benefits: { enabled: true },
      main_image: { enabled: true },
      solutions: { enabled: false },
      footer: { enabled: true }
    },
    assunto_email: data.email?.assunto_email || '',
    preheader_texto: data.email?.preheader_texto || '',
    url_site: data.email?.url_site || '',
    logo_src: data.email?.logo_src || createImageData(),
    imagem_src: data.email?.imagem_src || createImageData(),
    logo_alt: data.email?.logo_alt || '',
    selo: data.email?.selo || '',
    titulo_principal: data.email?.titulo_principal || '',
    subtitulo: data.email?.subtitulo || '',
    cta_href: data.email?.cta_href || '',
    cta_label: data.email?.cta_label || '',
    cta_subcopy: data.email?.cta_subcopy || '',
    bloco1_titulo: data.email?.bloco1_titulo || '',
    bloco1_texto: data.email?.bloco1_texto || '',
    bloco2_titulo: data.email?.bloco2_titulo || '',
    bloco2_texto: data.email?.bloco2_texto || '',
    beneficio_1: data.email?.beneficio_1 || '',
    beneficio_2: data.email?.beneficio_2 || '',
    beneficio_3: data.email?.beneficio_3 || '',
    imagem_href: data.email?.imagem_href || '',
    imagem_alt: data.email?.imagem_alt || '',
    cta2_href: data.email?.cta2_href || '',
    cta2_label: data.email?.cta2_label || '',
    brand_name: data.email?.brand_name || '',
    endereco_completo: data.email?.endereco_completo || '',
    link_suporte: data.email?.link_suporte || '',
    link_descadastro: data.email?.link_descadastro || '',
    link_preferencias: data.email?.link_preferencias || '',
    show_solutions_in_email: data.email?.show_solutions_in_email || false,
    solutions_title: data.email?.solutions_title || 'Nossos Serviços'
  };

  // Seções de visibilidade
  const desktop_info = data.desktop_info || {
    title: '',
    text: '',
    visible_desktop: false,
    visible_mobile: false,
    show_table: false,
    table_title: 'Especificações Técnicas',
    table_headers: ['Propriedade', 'Requisito', 'Resultado', 'Padrão ISO'],
    table_data: []
  };

  const advisory = {
    title: data.advisory?.title || '',
    paragraph: data.advisory?.paragraph || '',
    visible_desktop: data.advisory?.visible_desktop !== false,
    visible_mobile: data.advisory?.visible_mobile !== false,
    cta: data.advisory?.cta || { label: '', href: '' },
    image: data.advisory?.image || createImageData()
  };

  const cta_final = {
    title: data.cta_final?.title || '',
    paragraph: data.cta_final?.paragraph || '',
    primary: data.cta_final?.primary || { label: '', href: '', visible: true },
    secondary: data.cta_final?.secondary || { label: '', href: '', visible: false }
  };

  // Retornar objeto completo e seguro
  return {
    name: data.name || 'Nova Landing Page',
    status: data.status || 'draft',
    template: data.template || 'Smart Dent Base v1',
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
    logo_url: data.logo_url || createImageData(),
    logo_alt: data.logo_alt || '',
    menu: data.menu || [],
    banner,
    explanatory_video_section: data.explanatory_video_section || {
      visible_desktop: false,
      visible_mobile: false,
      selected_video: null
    },
    solutions_title: data.solutions_title || 'Nossas Soluções',
    solutions: data.solutions || [],
    desktop_info,
    resources_section: data.resources_section || {
      visible_desktop: true,
      visible_mobile: true,
      title: 'Recursos e Downloads',
      subtitle: ''
    },
    offers_section: data.offers_section || {
      visible_desktop: true,
      visible_mobile: true,
      title: 'Ofertas Especiais',
      subtitle: ''
    },
    advisory,
    solutions_section: data.solutions_section || {
      visible_desktop: true,
      visible_mobile: true
    },
    faq_section: data.faq_section || {
      visible_desktop: true,
      visible_mobile: true
    },
    faq_title: data.faq_title || 'Perguntas Frequentes',
    faq: data.faq || [],
    cta_final,
    footer_links_title: data.footer_links_title || 'Links Úteis',
    footer: data.footer || {
      locations: [],
      links: [],
      social: []
    },
    email,
    seo: {
      domain: data.seo?.domain || '',
      seo_title: data.seo?.seo_title || data.seo_title || '',
      seo_description: data.seo?.seo_description || data.seo_description || '',
      canonical_url: data.seo?.canonical_url || '',
      meta_robots: data.seo?.meta_robots || 'index, follow',
      og_title: data.seo?.og_title || '',
      og_description: data.seo?.og_description || '',
      og_image: data.seo?.og_image || createImageData(),
      og_type: data.seo?.og_type || 'website',
      og_site_name: data.seo?.og_site_name || '',
      twitter_card: data.seo?.twitter_card || 'summary_large_image',
      twitter_title: data.seo?.twitter_title || '',
      twitter_description: data.seo?.twitter_description || '',
      twitter_image: data.seo?.twitter_image || createImageData(),
      twitter_site: data.seo?.twitter_site || '',
      twitter_creator: data.seo?.twitter_creator || '',
      hreflang: data.seo?.hreflang || [],
      hreflang_auto: data.seo?.hreflang_auto || false,
      publish_date: data.seo?.publish_date || new Date().toISOString(),
      lastmod: data.seo?.lastmod || new Date().toISOString(),
      faq_enable: data.seo?.faq_enable !== false,
      intelligent_links: data.seo?.intelligent_links || {}
    },
    schema,
    brand: data.brand || {
      legal_name: '',
      same_as: [],
      policies: {
        privacy_url: '',
        terms_url: '',
        security_url: '',
        cookies_url: ''
      }
    }
  } as LandingPageData;
};

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
  const resolveImageSrc = (image: ImageData | undefined): ImageData => {
    if (!image || !image.mode) {
      console.log('🚨 Warning: Undefined or invalid image object, creating default:', image);
      return createImageData('', '');
    }
    
    // Imagens Supabase ou URL já possuem src completo
    return image;
  };

// Aplicar resolução em todas as imagens
  const processedData = { ...data };
  
  console.log('🔍 beforePreview: Validating data structure', {
    hasBanner: !!data.banner,
    hasAdvisory: !!data.advisory,
    hasEmail: !!data.email,
    hasSeo: !!data.seo,
    hasFooter: !!data.footer,
    solutionsLength: data.solutions?.length || 0
  });
  
  // Garantir que objetos pai existem antes de definir propriedades
  if (!processedData.banner) {
    processedData.banner = {
      badge_text: '',
      title: '',
      subtitle: '',
      cta_primary: { label: '', href: '' },
      cta_secondary: { label: '', href: '' },
      images: []
    };
  }
  if (!processedData.advisory) {
    processedData.advisory = {
      title: '',
      paragraph: '',
      visible_desktop: true,
      visible_mobile: true,
      cta: { label: '', href: '' },
      image: createImageData('', '')
    };
  }
  if (!processedData.email) {
    console.log('⚠️ processedData.email não existe, criando objeto padrão');
    processedData.email = {
      show_solutions_in_email: false,
      solutions_title: "Nossos Serviços",
      assunto_email: "",
      preheader_texto: "",
      url_site: "",
      logo_src: createImageData('', ''),
      imagem_src: createImageData('', ''),
      logo_alt: "",
      sections: {
        header: { enabled: false },
        content: { enabled: false },
        ctas: { enabled: false },
        highlights: { enabled: false },
        benefits: { enabled: false },
        main_image: { enabled: false },
        solutions: { enabled: false },
        footer: { enabled: false }
      }
    } as any;
  }
  if (!processedData.seo) {
    processedData.seo = {} as any; // Usar any para evitar erro de tipo extenso
  }
  if (!processedData.footer) {
    processedData.footer = {
      locations: [],
      links: [],
      social: []
    };
  }
  
  // Garantir arrays básicos
  if (!processedData.solutions) processedData.solutions = [];
  if (!processedData.banner) {
    processedData.banner = {
      badge_text: '',
      title: '',
      subtitle: '',
      cta_primary: { label: '', href: '' },
      cta_secondary: { label: '', href: '' },
      images: []
    };
  }
  if (!processedData.banner.images) processedData.banner.images = [];
  
  processedData.logo_url = resolveImageSrc(data.logo_url);
  processedData.banner.images = data.banner?.images?.map(resolveImageSrc) || [];
  processedData.solutions = data.solutions?.map(s => ({ 
    ...s, 
    image: resolveImageSrc(s?.image) 
  })) || [];
  processedData.advisory.image = resolveImageSrc(data.advisory?.image);
  
  // Garantir que email e seo existem antes de definir propriedades
  if (!processedData.email.logo_src) processedData.email.logo_src = createImageData('', '');
  if (!processedData.email.imagem_src) processedData.email.imagem_src = createImageData('', '');
  if (!processedData.seo.og_image) processedData.seo.og_image = createImageData('', '');
  if (!processedData.seo.twitter_image) processedData.seo.twitter_image = createImageData('', '');
  
  processedData.email.logo_src = resolveImageSrc(data.email?.logo_src);
  processedData.email.imagem_src = resolveImageSrc(data.email?.imagem_src);
  processedData.seo.og_image = resolveImageSrc(data.seo?.og_image);
  processedData.seo.twitter_image = resolveImageSrc(data.seo?.twitter_image);

  // 🔧 CORREÇÃO: Validação de integridade SEO antes de processar
  const validateSEOIntegrity = (data: any) => {
    const seoFields = ['canonical_url', 'og_title', 'og_description', 'twitter_title', 'twitter_description'];
    const missingSEO = seoFields.filter(field => !data.seo?.[field] || data.seo[field].trim() === '');
    
    if (missingSEO.length > 0) {
      console.warn('⚠️ Campos SEO em falta:', missingSEO);
    }
    
    console.info('🔍 Debug SEO integrity:', {
      hasCanonical: !!data.seo?.canonical_url,
      hasOGTitle: !!data.seo?.og_title,
      hasOGDescription: !!data.seo?.og_description,
      hasTwitterTitle: !!data.seo?.twitter_title,
      hasTwitterDescription: !!data.seo?.twitter_description,
      hreflangAuto: !!data.seo?.hreflang_auto
    });
  };
  
  validateSEOIntegrity(processedData);

  // Sincronizar campos SEO na preparação para preview (preservando dados existentes)
  if (processedData.seo_title && processedData.seo_title !== processedData.seo.seo_title) {
    processedData.seo.seo_title = processedData.seo_title;
  }
  if (processedData.seo.seo_title && processedData.seo.seo_title !== processedData.seo_title) {
    processedData.seo_title = processedData.seo.seo_title;
  }
  
  // Sincronizar descrição SEO (preservando dados existentes)
  if (processedData.seo_description && processedData.seo_description !== processedData.seo.seo_description) {
    processedData.seo.seo_description = processedData.seo_description;
  }
  if (processedData.seo.seo_description && processedData.seo.seo_description !== processedData.seo_description) {
    processedData.seo_description = processedData.seo.seo_description;
  }
  
  console.info('🎯 Preview preparado com:', {
    seo_title: processedData.seo_title,
    seo_seo_title: processedData.seo.seo_title,
    seo_description: processedData.seo_description,
    seo_seo_description: processedData.seo.seo_description,
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
  const bannerTitle = data.banner?.title || '';
  const bannerSubtitle = data.banner?.subtitle || '';
  const solutionsTitle = data.solutions_title || '';
  const solutionsText = (data.solutions || []).map(s => s.text || '').join(' ');
  const desktopText = data.desktop_info?.text || '';
  const advisoryTitle = data.advisory?.title || '';
  const advisoryParagraph = data.advisory?.paragraph || '';
  const content = `${bannerTitle} ${bannerSubtitle} ${solutionsTitle} ${solutionsText} ${desktopText} ${advisoryTitle} ${advisoryParagraph} ${faqContent}`;
  
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
  
  const subtitle = data.banner?.subtitle || '';
  if (subtitle.length <= 150 && subtitle.trim().length > 0) {
    return subtitle;
  }
  
  const title = data.banner?.title || '';
  const baseTitle = title.split(':')[0] || title;
  const shortDesc = `${baseTitle} - ${finalKeywords.slice(0, 3).join(', ')} com qualidade profissional e resultados garantidos.`;
  return shortDesc.length <= 160 ? shortDesc : shortDesc.substring(0, 157) + '...';
};

// Função de auto-geração de títulos SEO
const generateSEOTitle = (data: LandingPageData, customKeywords?: string[]): string => {
  const { keywords } = analyzeContent(data);
  const finalKeywords = customKeywords && customKeywords.length > 0 ? customKeywords : keywords;
  const mainKeyword = (finalKeywords[0] || 'tecnologia').toString();
  
  const rawTitle = data.banner?.title || '';
  const baseTitle = rawTitle.split(':')[0] || rawTitle;
  const titleWithKeyword = `${baseTitle} - ${mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1)} Profissional`;
  
  return titleWithKeyword.length <= 60 ? titleWithKeyword : baseTitle;
};

// Função de auto-geração de alt-text para imagens
const generateImageAltText = (image: ImageData, context: string): string => {
  if (image.alt && image.alt !== '') return image.alt;
  
  const contextWords = context.toLowerCase().split(' ').slice(0, 3).join(' ');
  return `Imagem ${contextWords} - Smart Dent tecnologia odontológica`;
};

// Função para extrair ID do YouTube de uma URL
const extractYouTubeId = (url: string): string => {
  if (!url) return '';
  
  // Padrões de URL do YouTube
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // ID direto
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return '';
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
  if (!processedData.seo?.og_image?.src) {
    // 1ª prioridade: Imagem da Soluções 1
    if (processedData.solutions && processedData.solutions.length > 0 && processedData.solutions[0]?.image?.src) {
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
  const { getLandingPage, updateLandingPage, addLandingPage, landingPages } = useLandingPagesSupabase();
  const { loadProductsByIds, getProductsForTemplate } = useSelectedProducts();
  const { syncOffersToRepository, loadApprovedProductsForAI } = useProductSync();
  const { generateAutoFooter, hasCompanyData } = useAutoFooterPopulation();
  const { saveDesktopInfo, lastSave } = useDesktopInfoAutoSave(updateLandingPage, id);
  const { saveExplanatoryVideo } = useExplanatoryVideoAutoSave(updateLandingPage, id);
  const [productsWithTechnicalVideos, setProductsWithTechnicalVideos] = useState<any[]>([]);
  
  // Debounced auto-save for desktop info
  const debouncedDesktopSave = useDebounce((updatedData: any) => {
    saveDesktopInfo(updatedData);
  }, 1500);
  const [extractingProduct, setExtractingProduct] = useState<number | null>(null);
  const [editingOffer, setEditingOffer] = useState<number | null>(null);
  
  // Estados para modal de link de produto no FAQ
  const [productLinkModalOpen, setProductLinkModalOpen] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  
  // Estados para campos editáveis da Automação SEO
  const [autoKeywords, setAutoKeywords] = useState<string[]>([]);

  // Estados para preview em tempo real
  const [previewVersion, setPreviewVersion] = useState(0);
  const prevHTMLRef = useRef('');
  const autoFooterAppliedRef = useRef(!!sessionStorage.getItem('autoFooterApplied'));
  const dirtyRef = useRef(false);

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

  // Handle navigation issues - redirect to valid ID if undefined or [object Promise]
  useEffect(() => {
    if (id === 'undefined' || !id || id === '[object Promise]') {
      // Try to get first available landing page from Supabase
      if (landingPages && landingPages.length > 0) {
        const firstValidPage = landingPages[0];
        navigate(`/editor/${firstValidPage.id}`, { replace: true });
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
  }, [id, navigate, toast, landingPages]);
  
  const [autoMetaDesc, setAutoMetaDesc] = useState('');
  const [autoSeoTitle, setAutoSeoTitle] = useState('');
  const [aiLoading, setAiLoading] = useState({ hidden: false, keywords: false, meta: false, title: false, faqKeywords: false, blog: false });
  
  const [previewTab, setPreviewTab] = useState('landing-preview');
  const [blogPostData, setBlogPostData] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [generatingBlog, setGeneratingBlog] = useState(false);
  const [isImportingFromRepo, setIsImportingFromRepo] = useState(false);
  
  // Novo sistema centralizado de produtos
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Carregar vídeos técnicos dos produtos selecionados
  useEffect(() => {
    const loadTechnicalVideos = async () => {
      if (!selectedProductIds || selectedProductIds.length === 0) {
        setProductsWithTechnicalVideos([]);
        return;
      }

      try {
        const { data: products, error } = await supabase
          .from('products_repository')
          .select('id, name, technical_videos')
          .in('id', selectedProductIds)
          .eq('approved', true);

        if (error) throw error;

        // Filtrar apenas produtos que têm vídeos técnicos
        const withVideos = (products || []).filter(
          (p: any) => p.technical_videos && Array.isArray(p.technical_videos) && p.technical_videos.length > 0
        );

        setProductsWithTechnicalVideos(withVideos);
        console.log('🎬 [TECHNICAL VIDEOS] Produtos carregados:', withVideos);
      } catch (error) {
        console.error('❌ Erro ao carregar vídeos técnicos:', error);
        setProductsWithTechnicalVideos([]);
      }
    };

    loadTechnicalVideos();
  }, [selectedProductIds]);
  
  // ✅ PATCH 0.2: Estados para Blogs Estratégicos
  const [dentalaBlogPost, setDentalaBlogPost] = useState<BlogPost | null>(null);
  const [eodontoBlogPost, setEodontoBlogPost] = useState<BlogPost | null>(null);
  const [strategicBlogRefreshKey, setStrategicBlogRefreshKey] = useState(0);
  
  // State for debounced name input
  const [localName, setLocalName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Debounced name update
  const debouncedNameUpdate = useDebounce((name: string) => {
    setData(prev => ({ ...prev, name }));
    setIsEditingName(false);
    // Marcar como editado para prevenir sobrescrita do backend
    dirtyRef.current = true;
    console.info('✏️ Nome sendo digitado, preservando edição local:', name);
  }, 300);

  
  // Sincronização automática entre produtos selecionados e schema.offers
  useEffect(() => {
    const syncSelectedProductsToOffers = async () => {
      if (selectedProductIds.length > 0) {
        try {
          console.log('🔄 Sincronizando produtos selecionados para offers:', selectedProductIds);
          
          // Buscar produtos do repositório baseado nos IDs selecionados
          const { data: repoProducts, error } = await supabase
            .from('products_repository')
            .select('*')
            .in('id', selectedProductIds)
            .eq('approved', true);

          if (error) throw error;

          if (repoProducts && repoProducts.length > 0) {
            // Converter produtos do repositório para formato offers
            const newOffers = repoProducts.map(product => ({
              // Identificação e metadados principais
              id: product.id,
              name: product.name,
              description: product.description || '',
              price: product.price?.toString() || '',
              currency: product.currency || 'BRL',
              availability: 'InStock',
              valid_through: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              productUrl: product.product_url || '',
              image: product.image_url || '',
              category: product.category || undefined,
              subcategory: product.subcategory || undefined,

              // Origem e controle
              sourceType: 'repository' as const,
              lastUpdated: new Date().toISOString(),
              selected: product.selected || false,

              // Conteúdos de vídeo e tutoriais
              youtube_videos: product.youtube_videos || [],
              instagram_videos: product.instagram_videos || [],
              testimonial_videos: product.testimonial_videos || [],
              technical_videos: (Array.isArray(product.technical_videos)
                ? (product.technical_videos as any[]).map((v: any) =>
                    typeof v === 'string'
                      ? { url: v, description: '' }
                      : { url: v.url ?? '', description: v.description ?? v.title ?? '' }
                  )
                : []) as Array<{ url: string; description: string }>,
              tiktok_videos: product.tiktok_videos || [],
              tutorial_resources: product.tutorial_resources || { tutorials: [] },
              video_captions: product.video_captions || {},

              // CTAs e recursos
              show_in_resources: product.show_in_resources || false,
              resource_cta1: (product.resource_cta1 as any) || { label: '', url: '', visible: false },
              resource_cta2: (product.resource_cta2 as any) || { label: '', url: '', visible: false },
              resource_cta3: (product.resource_cta3 as any) || { label: '', url: '', visible: false },
              offer_discount_cta: (product.offer_discount_cta as any) || { label: 'Comprar com Desconto', url: '', visible: false },
            }));

            console.info('🎬 Offers (id, techVideos):', newOffers.map(o => ({ id: o.id, tech: o.technical_videos?.length || 0 })));

            // Atualizar data.schema.offers - substituir completamente para garantir sincronização
            setData(prev => ({
              ...prev,
              schema: {
                ...prev.schema,
                offers: newOffers // Sempre usar os produtos mais recentes
              }
            }));

            console.log('✅ Produtos sincronizados para offers:', newOffers.length);
          }
        } catch (error) {
          console.error('❌ Erro ao sincronizar produtos:', error);
        }
      } else {
        // Se não há produtos selecionados, limpar as offers
        setData(prev => ({
          ...prev,
          schema: {
            ...prev.schema,
            offers: []
          }
        }));
      }
    };

    syncSelectedProductsToOffers();
  }, [selectedProductIds]);

  // Carregar produtos selecionados da landing page quando carregar
  useEffect(() => {
    if (id) {
      const landingPage = getLandingPage(id);
      if (landingPage?.selected_product_ids) {
        setSelectedProductIds(landingPage.selected_product_ids);
        console.log('🔄 Produtos selecionados carregados da landing page:', landingPage.selected_product_ids);
      }
    }
  }, [id, landingPages, getLandingPage]);

  // ✅ PATCH 0.2: Carregar Blogs Estratégicos do Banco
  useEffect(() => {
    const loadStrategicBlogs = async () => {
      if (!id) return;

      try {
        console.log('🔍 [Editor] Carregando blogs estratégicos para landing page:', id);

        const { data: blogs, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('landing_page_id', id);

        if (error) {
          console.error('❌ [Editor] Erro ao carregar blogs:', error);
          return;
        }

        console.log('📊 [Editor] Blogs carregados do banco:', {
          total: blogs?.length || 0,
          blogs: blogs?.map((b: any) => ({
            id: b.id?.substring(0, 8),
            title: b.title?.substring(0, 40),
            domains: b.published_domains,
            contentLength: b.content?.length || 0,
            status: b.status
          }))
        });

        /**
         * Verifica se um domínio está presente no array published_domains
         * Suporta comparação flexível (com/sem www, http/https)
         */
        const domainMatches = (publishedDomains: unknown, targetDomain: string): boolean => {
          if (!publishedDomains || !Array.isArray(publishedDomains)) {
            console.warn('⚠️ [domainMatches] published_domains inválido:', publishedDomains);
            return false;
          }
          
          const normalize = (domain: string) => domain
            .toLowerCase()
            .replace(/^https?:\/\//, '') // remove protocolo
            .replace(/^www\./, '') // remove www
            .replace(/\/$/, '') // remove trailing slash
            .trim();
          
          const normalizedTarget = normalize(targetDomain);
          
          const matches = (publishedDomains as string[]).some(d => {
            const normalized = normalize(d);
            const isMatch = normalized === normalizedTarget;
            if (isMatch) {
              console.log(`✅ [domainMatches] Match encontrado: "${d}" ≈ "${targetDomain}"`);
            }
            return isMatch;
          });
          
          return matches;
        };

        // Camada 1: Matching por published_domains (método principal)
        let dentalaBlog = blogs?.find((b: any) =>
          domainMatches(b.published_domains, 'dentala.com.br')
        );
        let eodontoBlog = blogs?.find((b: any) =>
          domainMatches(b.published_domains, 'eodonto.com.br')
        );

        // Camada 2: Fallback por título (se published_domains falhar)
        if (!dentalaBlog && blogs?.length > 0) {
          dentalaBlog = blogs.find((b: any) => 
            b.title?.toLowerCase().includes('dentala')
          );
          if (dentalaBlog) {
            console.warn('⚠️ [Editor] Dentala encontrado via fallback de título:', dentalaBlog.title);
          }
        }

        if (!eodontoBlog && blogs?.length > 0) {
          eodontoBlog = blogs.find((b: any) => 
            b.title?.toLowerCase().includes('eodonto')
          );
          if (eodontoBlog) {
            console.warn('⚠️ [Editor] Eodonto encontrado via fallback de título:', eodontoBlog.title);
          }
        }

        // Camada 3: Fallback por índice (última chance se houver exatamente 2 blogs)
        if ((!dentalaBlog || !eodontoBlog) && blogs?.length === 2) {
          console.warn('⚠️ [Editor] Usando fallback de índice (assumindo blog[0]=Dentala, blog[1]=Eodonto)');
          dentalaBlog = dentalaBlog || blogs[0];
          eodontoBlog = eodontoBlog || blogs[1];
        }

        console.log('🎯 [Editor] Resultado final da busca:', {
          dentalaEncontrado: !!dentalaBlog,
          dentalaTitle: dentalaBlog?.title?.substring(0, 50),
          dentalaDomains: dentalaBlog?.published_domains,
          eodontoEncontrado: !!eodontoBlog,
          eodontoTitle: eodontoBlog?.title?.substring(0, 50),
          eodontoDomains: eodontoBlog?.published_domains
        });

        if (dentalaBlog) {
          setDentalaBlogPost({
            title: dentalaBlog.title || '',
            content: dentalaBlog.content || '',
            meta_description: dentalaBlog.meta_description || '',
            keywords: dentalaBlog.keywords || [],
            status: dentalaBlog.status || 'draft',
          });
        } else {
          setDentalaBlogPost(null);
        }

        if (eodontoBlog) {
          setEodontoBlogPost({
            title: eodontoBlog.title || '',
            content: eodontoBlog.content || '',
            meta_description: eodontoBlog.meta_description || '',
            keywords: eodontoBlog.keywords || [],
            status: eodontoBlog.status || 'draft',
          });
        } else {
          setEodontoBlogPost(null);
        }
      } catch (error: any) {
        console.error('❌ [Editor] Erro fatal ao carregar blogs:', error);
      }
    };

    loadStrategicBlogs();
  }, [id, strategicBlogRefreshKey]); // ⚠️ Recarrega quando refreshKey muda

  // ✅ PATCH 0.2: Handler para Reload de Blogs (chamado por BlogEditorSection)
  const handleStrategicBlogSave = useCallback(async () => {
    console.log('🔄 [Editor] Recarregando blogs estratégicos após save...');
    
    // Incrementar refreshKey para forçar reload do useEffect acima
    setStrategicBlogRefreshKey(prev => prev + 1);
    
    // Aguardar um tick para garantir que o banco commitou
    await new Promise(resolve => setTimeout(resolve, 150));
    
    console.log('✅ [Editor] Blogs recarregados!');
  }, []);

  // Handler para mudanças na seleção de produtos
  const handleProductSelectionChange = useCallback((productIds: string[]) => {
    setSelectedProductIds(productIds);
    if (id) {
      updateLandingPage(id, { selected_product_ids: productIds });
      console.log('✅ Produtos selecionados atualizados na landing page:', productIds);
    }
  }, [id, updateLandingPage]);

  // Monitorar mudanças nas flags dos produtos para atualizar seções
  useEffect(() => {
    const checkProductFlags = async () => {
      if (selectedProductIds.length > 0) {
        try {
          const { data: products, error } = await supabase
            .from('products_repository')
            .select('id, selected, show_in_resources')
            .in('id', selectedProductIds)
            .eq('approved', true);

          if (error) throw error;

          if (products) {
            // Verificar se há produtos com flags ativas
            const hasSelectedProducts = products.some(p => p.selected);
            const hasResourceProducts = products.some(p => p.show_in_resources);
            
            console.log('🔍 Verificação de flags dos produtos:', {
              selectedProducts: hasSelectedProducts,
              resourceProducts: hasResourceProducts,
              totalProducts: products.length
            });
          }
        } catch (error) {
          console.error('❌ Erro ao verificar flags dos produtos:', error);
        }
      }
    };

    checkProductFlags();
  }, [selectedProductIds]);

  // Auto-sync offers to repository when they change (debounced)
  const handleAutoSyncOffers = useCallback(async (newData: LandingPageData) => {
    if (id && newData.schema?.offers) {
      try {
        await syncOffersToRepository(id, newData.schema.offers);
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }
  }, [id, syncOffersToRepository]);

  // Debounced version for real-time updates
  const debouncedAutoSync = useDebounce(handleAutoSyncOffers, 2000);

  // Import products from repository
  const handleImportFromRepository = useCallback(async () => {
    setIsImportingFromRepo(true);
    try {
      console.log('🔍 Carregando produtos do repositório...');
      const repoProducts = await loadApprovedProductsForAI();
      console.log('📦 Produtos encontrados:', repoProducts.length, repoProducts);
      
      if (repoProducts.length === 0) {
        toast({
          title: "Nenhum produto encontrado",
          description: "Não há produtos aprovados no repositório para importar. Verifique se existem produtos marcados para 'uso na geração de IA' no Repositório de Produtos.",
          variant: "destructive",
        });
        return;
      }

      // Map repository products to offer format
      const mappedOffers = repoProducts.map(product => ({
        name: product.name,
        description: product.description,
        price: product.price,
        currency: 'R$',
        availability: 'InStock',
        valid_through: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        productUrl: product.link,
        image: product.image,
        sourceType: 'imported' as const,
        lastUpdated: new Date().toISOString(),
        selected: true,
      }));

      // Deduplicate with existing offers
      const existingNames = new Set(data.schema.offers.map(offer => offer.name.toLowerCase()));
      const existingUrls = new Set(data.schema.offers.map(offer => offer.productUrl?.toLowerCase()).filter(Boolean));
      
      const newOffers = mappedOffers.filter(offer => 
        !existingNames.has(offer.name.toLowerCase()) && 
        (!offer.productUrl || !existingUrls.has(offer.productUrl.toLowerCase()))
      );

      if (newOffers.length === 0) {
        toast({
          title: "Produtos já existem",
          description: "Todos os produtos do repositório já estão nas ofertas.",
        });
        return;
      }

      // Update data with new offers
      setData(prev => {
        const updatedData = {
          ...prev,
          schema: {
            ...prev.schema,
            offers: [...prev.schema.offers, ...newOffers]
          }
        };
        
        // Auto-sync back to repository
        handleAutoSyncOffers(updatedData);
        
        return updatedData;
      });

      toast({
        title: "Produtos importados",
        description: `${newOffers.length} produto(s) adicionado(s) às ofertas.`,
      });

    } catch (error) {
      console.error('Error importing from repository:', error);
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os produtos do repositório.",
        variant: "destructive",
      });
    } finally {
      setIsImportingFromRepo(false);
    }
  }, [loadApprovedProductsForAI, handleAutoSyncOffers, toast]);

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
  
  // ✅ SUBSTITUIR useState por useUndoRedo
  const { 
    current: data, 
    set: setData,
    setReplace,
    undo, 
    redo, 
    canUndo, 
    canRedo,
    historyLength
  } = useUndoRedo<LandingPageData>(ensureLandingPageDefaults({
    name: 'Smart Dent Campanha Q1',
    status: 'draft',
    template: 'Smart Dent Base v1',
    seo_title: 'Smart Dent - Sistema de Gestão Odontológica',
    seo_description: 'Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.',
    
    
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
    }
  }));

  // ✅ Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Optimized handler for desktop info updates  
  const updateDesktopInfo = useCallback((updates: any) => {
    console.time('desktop-info-update');
    const updatedData = {
      ...data,
      desktop_info: { ...data.desktop_info, ...updates }
    };
    
    // Immediate preview update
    setData(updatedData);
    
    // Debounced persistence
    debouncedDesktopSave(updatedData);
    console.timeEnd('desktop-info-update');
  }, [data, debouncedDesktopSave, setData]);

  // Auto-população do footer quando dados da empresa estão disponíveis

  // 🏢 AUTO-POPULAÇÃO DO FOOTER COM DADOS DA EMPRESA
  useEffect(() => {
    if (hasCompanyData && 
        !autoFooterAppliedRef.current &&
        (!(data.footer?.locations?.length) && 
         !(data.footer?.links?.length) && 
         !(data.footer?.social?.length))) {
      
      const autoFooter = generateAutoFooter();
      console.log('🏢 Auto-populando footer com dados da empresa:', autoFooter);
      
      const newData = {
        ...data,
        footer: {
          locations: autoFooter.locations,
          links: autoFooter.links,
          social: autoFooter.social
        }
      };
      
      setData(newData);
      
      // Persistir no Supabase se há ID
      if (id) {
        updateLandingPage(id, { data: newData }).then(() => {
          autoFooterAppliedRef.current = true;
          sessionStorage.setItem('autoFooterApplied', 'true');
          toast({
            title: "Footer auto-populado",
            description: "Dados da empresa foram carregados automaticamente no footer.",
          });
        });
      } else {
        // Fallback para quando não há ID ainda
        autoFooterAppliedRef.current = true;
        sessionStorage.setItem('autoFooterApplied', 'true');
        toast({
          title: "Footer auto-populado", 
          description: "Dados da empresa foram carregados automaticamente no footer.",
        });
      }
    }
  }, [hasCompanyData, data.footer?.locations?.length, data.footer?.links?.length, data.footer?.social?.length, generateAutoFooter, toast]);

  // Generate optimized preview HTML for real-time updates
  const generatedHTML = useMemo(() => {
    console.time('preview-generation');
    const processedData = beforePreview(data);
    
    const previewData = {
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
            src: s.image?.src || '',
            alt: s.image?.alt || '',
            scale: s.image?.scale || 1
          },
          size,
          sizeType
        };
      }),
      advisory: {
        ...processedData.advisory,
        image: {
          src: processedData.advisory?.image?.src || '',
          alt: processedData.advisory?.image?.alt || '',
          scale: processedData.advisory?.image?.scale || 1
        }
      }
    };
    
    console.time('preview-generation');
    const html = generatePreviewHTML(previewData);
    console.timeEnd('preview-generation');
    return html;
  }, [data, data.explanatory_video_section]);

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
      const { data: blogContentResult, error: blogError } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          type: 'blog_content',
          landingPageId: id,
          landingPageData: data,
          contentData: {
            content: data.seo?.seo_hidden_content?.trim() || data.seo_description?.trim() || data.banner?.title,
            title: data.seo_title || data.banner?.title,
            fullLandingPageContent: fullContent
          },
          primaryKeyword: data.banner?.title || 'Conteúdo Especializado',
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
    
    // Garantir que processedData.email existe
    if (!processedData.email) {
      console.error('❌ processedData.email é undefined no generatedEmailHTML');
      return '';
    }
    
    console.log("🔄 Regenerando email HTML...", {
      timestamp: Date.now(),
      show_solutions: processedData.email.show_solutions_in_email,
      solutions_count: processedData.solutions?.length || 0,
      solutions_with_images: (processedData.solutions || []).filter(s => s.image?.src).length
    });
    
    // Validar soluções quando habilitadas
    if (processedData.email.show_solutions_in_email && (!processedData.solutions || processedData.solutions.length === 0)) {
      console.warn("⚠️ Soluções habilitadas no email mas nenhuma solução encontrada");
    }
    
    // Corrigir mapeamento das soluções para o email
    const solutionsList = processedData.solutions?.map((solution: any, index: number) => ({
      title: solution.title || `Solução ${index + 1}`,
      description: solution.text || solution.description || '',
      image_src: solution.image?.src || '',
      image_alt: solution.image?.alt || solution.title || `Solução ${index + 1}`
    })) || [];
    
    // Garantir que solutionsList é um array válido
    if (!Array.isArray(solutionsList)) {
      console.error('❌ solutionsList não é um array válido:', solutionsList);
      return '';
    }
    
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
    data.seo.domain
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

  // Update preview version when generatedHTML changes to force iframe repaint
  useEffect(() => {
    if (generatedHTML !== prevHTMLRef.current) {
      prevHTMLRef.current = generatedHTML;
      setPreviewVersion(v => v + 1);
    }
  }, [generatedHTML]);

  // ✅ Atalhos de teclado para Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (id) {
      const landingPage = getLandingPage(id);
      if (landingPage) {
        // Check if backend data is newer than current state to prevent overwriting local edits
        const backendLastModified = new Date(landingPage.last_modified || 0).getTime();
        const currentLastModified = new Date(data.seo?.lastmod || 0).getTime();
        
        // Only update if backend is newer or if this is the initial load
        if (!dirtyRef.current || backendLastModified > currentLastModified) {
          // Carregar produtos selecionados da landing page
          const selectedIds = landingPage.selected_product_ids || [];
          setSelectedProductIds(selectedIds);
          // Se há dados estruturados, usar direto mas garantir campos obrigatórios
          if (landingPage.data && typeof landingPage.data === 'object') {
            // 🔧 CORREÇÃO CRÍTICA: Incluir name, status e template no loadedData
            const loadedData = { 
              ...landingPage.data, 
              name: isEditingName ? data.name : landingPage.name, // Preservar nome local durante edição
              status: landingPage.status,
              template: landingPage.template 
            } as LandingPageData;
            
            console.info('🔍 Debug loading page data:', {
              hasName: !!loadedData.name,
              pageName: loadedData.name,
              pageStatus: loadedData.status,
              pageTemplate: loadedData.template,
              isEditingName,
              preservingLocalName: isEditingName
            });
          
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
              visible_desktop: true,
              visible_mobile: true,
              title: 'Recursos e Downloads',
              subtitle: 'Materiais técnicos e informações dos produtos'
            };
          }
          if (!loadedData.explanatory_video_section) {
            loadedData.explanatory_video_section = {
              visible_desktop: true,
              visible_mobile: true,
              selected_video: null
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

          // Garantir CTA Final existente
          if (!(loadedData as any).cta_final) {
            (loadedData as any).cta_final = {
              title: '',
              paragraph: '',
              primary: { label: '', href: '', visible: true },
              secondary: { label: '', href: '', visible: false }
            };
          } else {
            (loadedData as any).cta_final = {
              ...((loadedData as any).cta_final),
              title: (loadedData as any).cta_final.title || '',
              paragraph: (loadedData as any).cta_final.paragraph || '',
              primary: {
                label: (loadedData as any).cta_final?.primary?.label || '',
                href: (loadedData as any).cta_final?.primary?.href || '',
                visible: (loadedData as any).cta_final?.primary?.visible !== false
              },
              secondary: {
                label: (loadedData as any).cta_final?.secondary?.label || '',
                href: (loadedData as any).cta_final?.secondary?.href || '',
                visible: (loadedData as any).cta_final?.secondary?.visible === true
              }
            };
          }

          // Garantir bloco advisory existente
          if (!(loadedData as any).advisory) {
            (loadedData as any).advisory = {
              title: '',
              paragraph: '',
              visible_desktop: true,
              visible_mobile: true,
              cta: { label: '', href: '' },
              image: createImageData()
            };
          } else {
            (loadedData as any).advisory = {
              ...((loadedData as any).advisory),
              title: (loadedData as any).advisory.title || '',
              paragraph: (loadedData as any).advisory.paragraph || '',
              visible_desktop: (loadedData as any).advisory.visible_desktop !== false,
              visible_mobile: (loadedData as any).advisory.visible_mobile !== false,
              cta: (loadedData as any).advisory.cta || { label: '', href: '' },
              image: (loadedData as any).advisory.image || createImageData()
            };
          }
          
          // Usar setReplace para não adicionar ao histórico do undo
          const safeData = ensureLandingPageDefaults(loadedData);
          setReplace(safeData);
          console.log('✅ Dados carregados do banco e normalizados:', safeData.name);
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
          // Garantir bloco explanatory_video_section
          if (!migratedData.explanatory_video_section) {
            migratedData.explanatory_video_section = {
              visible_desktop: false,
              visible_mobile: false,
              selected_video: null
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
          
          // Garantir array de soluções
          if (!migratedData.solutions) {
            migratedData.solutions = [];
          }
          
          // Garantir bloco advisory
          if (!migratedData.advisory) {
            migratedData.advisory = {
              title: '',
              paragraph: '',
              visible_desktop: true,
              visible_mobile: true,
              cta: { label: '', href: '' },
              image: createImageData('', '')
            };
          }
          
          // Garantir bloco email
          if (!migratedData.email) {
            migratedData.email = {
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
              assunto_email: '',
              preheader_texto: '',
              url_site: '',
              logo_src: createImageData('', ''),
              selo: '',
              titulo_principal: '',
              subtitulo: '',
              cta_label: '',
              cta_href: '',
              cta_subcopy: '',
              cta2_label: '',
              cta2_href: '',
              bloco1_titulo: '',
              bloco1_texto: '',
              bloco2_titulo: '',
              bloco2_texto: '',
              beneficio_1: '',
              beneficio_2: '',
              beneficio_3: '',
              imagem_href: '',
              imagem_src: createImageData('', ''),
              show_solutions_in_email: false,
              solutions_title: '',
              brand_name: '',
              endereco_completo: '',
              link_suporte: '',
              link_descadastro: '',
              link_preferencias: ''
            } as any;
          }
          
          // Garantir bloco footer
          if (!migratedData.footer) {
            migratedData.footer = {
              locations: [],
              links: [],
              social: []
            };
          }
          
          // Only update name if not currently editing
          if (!isEditingName) {
            setLocalName(landingPage.name);
          }
          
          // Normalizar dados migrados e usar setReplace
          const safeMigratedData = ensureLandingPageDefaults({
            ...migratedData,
            name: isEditingName ? data.name : landingPage.name,
            status: landingPage.status,
            template: landingPage.template
          });
          setReplace(safeMigratedData);
          console.log('✅ Dados migrados e normalizados:', safeMigratedData.name);
          dirtyRef.current = false; // Reset dirty flag after loading
          }
        }
      } else {
        dirtyRef.current = true; // Mark as dirty if we have local changes but no backend match
      }
    } else {
      // Caso seja nova landing page (sem ID), usar dados padrão do estado inicial
      console.log('Nova landing page - usando dados padrão do estado inicial');
      dirtyRef.current = true;
    }
  }, [id, getLandingPage]);

  // Initialize localName when data.name changes (but not when editing)
  useEffect(() => {
    if (!isEditingName && data.name !== localName) {
      setLocalName(data.name);
    }
  }, [data.name, isEditingName, localName]);

  const handleSave = async () => {
    console.log('[DEBUG] Salvando landing page...');
    console.log('[DEBUG] Dados originais:', data);
    console.log('[DEBUG] Desktop info antes do processamento:', data.desktop_info);
    
    const processedData = onSave(data);
    
    console.log('[DEBUG] Dados processados:', processedData);
    console.log('[DEBUG] Desktop info após processamento:', processedData.desktop_info);
    
    const storeData = {
      name: processedData.name,
      status: processedData.status,
      template: processedData.template,
      data: processedData,
      // Salvar IDs dos produtos selecionados se existirem
      selectedProductIds: selectedProductIds || []
    };
    
    console.log('[DEBUG] Dados da store:', storeData);
    
    if (id) {
      await updateLandingPage(id, storeData);
      console.log('[DEBUG] Landing page atualizada com ID:', id);
      toast({
        title: "Alterações salvas",
        description: "Landing page atualizada com sucesso!",
      });
      dirtyRef.current = false; // Reset dirty flag after save
    } else {
      const newId = await addLandingPage(storeData);
      console.log('[DEBUG] Nova landing page criada com ID:', newId);
      navigate(`/editor/${newId}`);
      toast({
        title: "Landing page criada",
        description: "Nova landing page salva com sucesso!",
      });
      dirtyRef.current = false; // Reset dirty flag after save
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

  const handleApprove = async () => {
    const processedData = onApprove(onSave(data));
    processedData.status = 'approved';
    
    const storeData = {
      name: processedData.name,
      status: processedData.status,
      template: processedData.template,
      data: processedData
    };
    
    let landingPageId = id;
    if (id) {
      updateLandingPage(id, storeData);
    } else {
      landingPageId = await addLandingPage(storeData);
      navigate(`/editor/${landingPageId}`);
    }
    
    setData(processedData);
    
    // Automatically publish blog when landing page is approved
    try {
      const landingPageData = getLandingPage(landingPageId);
      const selectedProductIds = landingPageData?.selected_product_ids || [];
      
      console.log('🚀 Iniciando geração automática de blog para landing page:', landingPageId);
      console.log('📦 Produtos selecionados:', selectedProductIds);
      console.log('📄 Dados da landing page:', {
        name: processedData.name,
        seo_title: processedData.seo_title,
        seo_description: processedData.seo_description,
        hasProducts: selectedProductIds && selectedProductIds.length > 0
      });

      const requestBody = {
        type: 'blog_content',
        landingPageId: landingPageId,
        selectedProductIds: selectedProductIds,
        include_offers: true,
        landingPageData: processedData,
        contentData: processedData
      };

      console.log('📡 Enviando request para ai-content-generator:', requestBody);

      const response = await supabase.functions.invoke('ai-content-generator', {
        body: requestBody
      });

      console.log('📥 Response da AI:', response);

      if (response.error) {
        console.error('❌ Erro na chamada da função AI:', response.error);
        throw new Error(`AI Function Error: ${response.error.message || 'Unknown error'}`);
      }

      if (response.data?.content && response.data.content.title && response.data.content.content) {
        console.log('✅ Conteúdo gerado pela AI:', {
          title: response.data.content.title,
          contentLength: response.data.content.content?.length || 0,
          hasKeywords: response.data.content.keywords?.length > 0,
          hasMetaDescription: !!response.data.content.meta_description
        });

        // Validar conteúdo antes de salvar
        const content = response.data.content;
        const validationErrors: string[] = [];
        
        if (!content.title || content.title.length < 10 || content.title.length > 60) {
          validationErrors.push('Título deve ter entre 10 e 60 caracteres');
        }
        
        if (!content.content || content.content.length < 500) {
          validationErrors.push('Conteúdo deve ter pelo menos 500 caracteres');
        }
        
        if (!content.meta_description || content.meta_description.length < 50 || content.meta_description.length > 160) {
          validationErrors.push('Meta description deve ter entre 50 e 160 caracteres');
        }
        
        if (!content.keywords || !Array.isArray(content.keywords) || content.keywords.length < 3) {
          validationErrors.push('Deve ter pelo menos 3 keywords');
        }
        
        if (validationErrors.length > 0) {
          console.warn('⚠️ Conteúdo gerado não atende critérios de qualidade:', validationErrors);
          throw new Error(`Conteúdo inválido: ${validationErrors.join(', ')}`);
        }

        // Upsert blog post in database with proper status
        const blogData = {
          landing_page_id: landingPageId,
          title: content.title,
          content: content.content,
          meta_description: content.meta_description,
          keywords: content.keywords,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('💾 Salvando blog validado como PUBLISHED:', {
          landingPageId,
          title: content.title,
          contentLength: content.content.length,
          keywordsCount: content.keywords?.length
        });

        const { data: upsertResult, error: upsertError } = await supabase
          .from('blog_posts')
          .upsert(blogData, {
            onConflict: 'landing_page_id',
            ignoreDuplicates: false
          })
          .select();

        if (upsertError) {
          console.error('❌ Erro salvando blog:', upsertError);
          throw new Error(`Database Error: ${upsertError.message}`);
        } else {
          console.log('✅ Blog validado e publicado:', {
            landingPageId,
            status: upsertResult?.[0]?.status,
            id: upsertResult?.[0]?.id,
            titleLength: upsertResult?.[0]?.title?.length,
            contentLength: upsertResult?.[0]?.content?.length
          });
          toast({
            title: "Blog publicado",
            description: "Blog SEO gerado e publicado automaticamente!",
          });
        }
      } else {
        console.warn('⚠️ Resposta da AI inválida ou vazia:', response.data);
        
        // Fallback: create basic blog post if AI generation fails
        const fallbackData = {
          landing_page_id: landingPageId,
          title: processedData.seo_title || processedData.name || 'Novo Blog',
          content: `# ${processedData.seo_title || processedData.name}\n\n${processedData.seo_description || 'Conteúdo em desenvolvimento.'}`,
          meta_description: processedData.seo_description || '',
          keywords: [],
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 Criando blog fallback:', fallbackData);

        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('blog_posts')
          .upsert(fallbackData, {
            onConflict: 'landing_page_id',
            ignoreDuplicates: false
          })
          .select();

        if (fallbackError) {
          console.error('❌ Erro salvando blog fallback:', fallbackError);
        } else {
          console.log('📝 Blog fallback PUBLISHED criado:', {
            id: fallbackResult?.[0]?.id,
            status: fallbackResult?.[0]?.status
          });
          toast({
            title: "Blog criado",
            description: "Blog básico criado. Use 'Regenerar Blog' para melhorar o conteúdo.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('💥 Erro completo na geração/publicação do blog:', error);
      toast({
        title: "Erro na geração do blog",
        description: `Falha ao gerar blog: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      // Continue with approval even if blog publication fails
    }
    
    toast({
      title: "Landing page aprovada",
      description: "Status alterado para aprovado!",
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
        editorId: id
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

  // ✅ FASE 1: Função de Validação SEO
  const handleValidateSEO = async () => {
    try {
      // 1. Validar meta description
      const descValidation = validateMetaDescription(data.seo_description || '');
      
      // 2. Validar canonical URL
      const canonicalValidation = await validateCanonicalURL(
        data.seo?.canonical_url || '',
        data.seo?.domain || ''
      );
      
      // 3. Validar schemas (chamar edge function validate-schema)
      const schemasToValidate = [];
      
      if (data.schema?.offers && data.schema.offers.length > 0) {
        schemasToValidate.push({
          "@context": "https://schema.org",
          "@type": "Product",
          "offers": data.schema.offers
        });
      }
      
      // 3. GERAR HTML COMPLETO PARA VALIDAÇÃO DE SCHEMAS
      const htmlForValidation = await generateSEOBlogHTML({
        blogs: [{
          title: data.name,
          content: data.banner?.subtitle || '',
          meta_description: data.seo_description,
          keywords: data.seo?.ai_keywords || []
        }],
        domain: data.seo?.domain || 'eodonto',
        canonicalUrl: data.seo?.canonical_url || '',
        finalTitle: data.seo?.seo_title || data.name,
        finalDescription: data.seo_description || '',
        selectedProducts: selectedProducts || [],
        intelligentLinks: data.seo?.intelligent_links || {},
        schemas: Object.values(data.schema || {}),
        preview: true,
        keywords: data.seo?.ai_keywords || []
      });
      
      // 4. CHAMAR EDGE FUNCTION COM HTML COMPLETO
      let schemaValidation: any = { valid: true };
      
      const { data: validationResult, error } = await supabase.functions.invoke('validate-schema', {
        body: { 
          html: htmlForValidation, 
          url: data.seo?.canonical_url || '' 
        }
      });
      
      if (!error && validationResult) {
        schemaValidation = validationResult;
      } else if (error) {
        console.error('Erro na validação de schemas:', error);
        schemaValidation = { 
          valid: false, 
          errors: [error.message] 
        };
      }
      
      // 5. Verificar produtos selecionados
      const hasProducts = selectedProducts && selectedProducts.length > 0;
      
      // 6. Calcular score geral
      const totalChecks = 4;
      let passedChecks = 0;
      
      if (descValidation.valid) passedChecks++;
      if (canonicalValidation.valid) passedChecks++;
      if (schemaValidation.isValid) passedChecks++;
      if (hasProducts) passedChecks++;
      
      const overallScore = Math.round((passedChecks / totalChecks) * 100);
      
      // 7. Mostrar resultados detalhados
      const resultMessage = `
        ✅ Meta Description: ${descValidation.valid ? 'Válida' : '❌ Inválida'} (Score: ${descValidation.score})
        ${!descValidation.valid ? `\n  Avisos: ${descValidation.warnings.join(', ')}` : ''}
        
        ${canonicalValidation.valid ? '✅' : '❌'} Canonical URL: ${canonicalValidation.valid ? 'Válida' : 'Inválida'}
        ${!canonicalValidation.valid ? `\n  Erros: ${canonicalValidation.errors.join(', ')}` : ''}
        
        ${schemaValidation.isValid ? '✅' : '❌'} Schemas: ${schemaValidation.isValid ? 'Válidos' : 'Com problemas'}
        ${schemaValidation.errors?.length > 0 ? `\n  Erros: ${schemaValidation.errors.join(', ')}` : ''}
        ${schemaValidation.warnings?.length > 0 ? `\n  Avisos: ${schemaValidation.warnings.join(', ')}` : ''}
        
        ${hasProducts ? '✅' : '⚠️'} Produtos: ${hasProducts ? `${selectedProducts.length} selecionados` : 'Nenhum produto selecionado'}
        
        Score Geral: ${overallScore}%
      `;
      
      toast({
        title: overallScore >= 75 ? "✅ Validação SEO Completa" : "⚠️ SEO Precisa de Melhorias",
        description: resultMessage,
        variant: overallScore >= 75 ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Erro ao validar SEO:', error);
      toast({
        title: "❌ Erro na validação",
        description: "Não foi possível validar o SEO. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Debug function - temporary
  const handleTestHTML = async () => {
    console.log('🧪 Testing HTML generation...');
    
    const testHTML = await generateHTML(data);
    console.log('🧪 Generated standard HTML:', testHTML.substring(0, 1000));
    
    toast({
      title: "Teste HTML",
      description: "HTML padrão gerado. Verifique o console para detalhes.",
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
              {/* Undo/Redo Buttons */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={undo} 
                disabled={!canUndo}
                title="Desfazer (Ctrl+Z)"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Desfazer
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={redo} 
                disabled={!canRedo}
                title="Refazer (Ctrl+Y)"
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Refazer
              </Button>
              
              <Badge variant="secondary" className="ml-2">
                {historyLength} versões
              </Badge>
              
              <Button variant="outline" size="sm" onClick={handleValidateSEO}>
                <Search className="h-4 w-4 mr-2" />
                Validar SEO
              </Button>
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
          {/* DESABILITADO: Configurações Globais do Cloudflare removidas temporariamente
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
          */}

          <Tabs defaultValue="landing-page" className="w-full">
            <TabsList className={`grid w-full ${data.status === 'approved' ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="landing-page">Conteúdo</TabsTrigger>
              <TabsTrigger value="seo-social">SEO & Social</TabsTrigger>
              <TabsTrigger value="schema-offers">Schema & Offers</TabsTrigger>
              <TabsTrigger value="author">Autor</TabsTrigger>
              <TabsTrigger value="email">Email Marketing</TabsTrigger>
              {data.status === 'approved' && (
                <TabsTrigger value="google-ads">Google Ads</TabsTrigger>
              )}
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
                        value={isEditingName ? localName : data.name}
                        onChange={(e) => {
                          setLocalName(e.target.value);
                          setIsEditingName(true);
                          debouncedNameUpdate(e.target.value);
                        }}
                        onBlur={async () => {
                          // Persistir nome imediatamente no blur se há ID
                          if (id && localName.trim()) {
                            try {
                              await updateLandingPage(id, { name: localName.trim() });
                              console.info('✅ Nome persistido no blur:', localName.trim());
                            } catch (error) {
                              console.error('❌ Erro ao persistir nome no blur:', error);
                            }
                          }
                        }}
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
                         onChange={(e) => {
                           setData(prev => ({ ...prev, seo_title: e.target.value }));
                           dirtyRef.current = true;
                         }}
                         placeholder="Título otimizado para SEO"
                       />
                       <p className="text-xs text-gray-500 mt-1">
                         {(data.seo_title || '').length}/60 caracteres • Afeta apenas o &lt;title&gt; e metadados, não o título visível da página
                       </p>
                    </div>
                    <div>
                       <Label>Descrição SEO</Label>
                       <Textarea
                         value={data.seo_description}
                         onChange={(e) => {
                           setData(prev => ({ ...prev, seo_description: e.target.value }));
                           dirtyRef.current = true;
                         }}
                         placeholder="Descrição otimizada para SEO"
                         rows={3}
                       />
                      <p className="text-xs text-gray-500 mt-1">
                        {(data.seo_description || '').length}/160 caracteres
                      </p>
                    </div>
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
                      {(data.menu || []).map((item, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            placeholder="Label"
                            value={item.label}
                            onChange={(e) => {
                              const newMenu = [...(data.menu || [])];
                              newMenu[index].label = e.target.value;
                              setData(prev => ({ ...prev, menu: newMenu }));
                            }}
                          />
                          <Input
                            placeholder="URL"
                            value={item.href}
                            onChange={(e) => {
                              const newMenu = [...(data.menu || [])];
                              newMenu[index].href = e.target.value;
                              setData(prev => ({ ...prev, menu: newMenu }));
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newMenu = (data.menu || []).filter((_, i) => i !== index);
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
                            menu: [...(prev.menu || []), { label: '', href: '' }]
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
                    <BannerSection 
                      data={data.banner}
                      onChange={(banner) => setData(prev => ({ ...prev, banner }))}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Vídeo Explicativo do Produto */}
                <AccordionItem value="explanatory-video">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <VideoIcon className="w-4 h-4" />
                      Vídeo Explicativo do Produto
                    </div>
                  </AccordionTrigger>
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
                              checked={data.explanatory_video_section?.visible_desktop ?? true}
                              onCheckedChange={(checked) => {
                                const updatedData = {
                                  ...data,
                                  explanatory_video_section: { 
                                    ...data.explanatory_video_section!, 
                                    visible_desktop: checked 
                                  }
                                };
                                setData(updatedData);
                                saveExplanatoryVideo(updatedData);
                              }}
                            />
                            <Label className="font-medium">Visível no desktop</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={data.explanatory_video_section?.visible_mobile ?? true}
                              onCheckedChange={(checked) => {
                                const updatedData = {
                                  ...data,
                                  explanatory_video_section: { 
                                    ...data.explanatory_video_section!, 
                                    visible_mobile: checked 
                                  }
                                };
                                setData(updatedData);
                                saveExplanatoryVideo(updatedData);
                              }}
                            />
                            <Label className="font-medium">Visível no mobile</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {((data.explanatory_video_section?.visible_desktop ?? false) || (data.explanatory_video_section?.visible_mobile ?? false)) && (
                      <>
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <VideoIcon className="w-4 h-4" />
                              Vídeos Técnicos dos Produtos Selecionados
                            </CardTitle>
                            <CardDescription>
                              Selecione um vídeo técnico dos produtos disponíveis nesta landing page
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {productsWithTechnicalVideos.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <VideoIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Nenhum vídeo técnico disponível nos produtos selecionados</p>
                                <p className="text-xs mt-2">Adicione vídeos técnicos aos produtos no Repositório</p>
                              </div>
                            ) : (
                              <Accordion type="single" collapsible className="w-full">
                                {productsWithTechnicalVideos.map((product: any) => (
                                  <AccordionItem key={product.id} value={product.id}>
                                    <AccordionTrigger>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">🔬</span>
                                        <span className="font-semibold">{product.name}</span>
                                        <Badge variant="secondary">
                                          {product.technical_videos.length} vídeo(s)
                                        </Badge>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-2">
                                        {product.technical_videos.map((video: any, index: number) => {
                                          const isSelected = data.explanatory_video_section?.selected_video?.url === video.url;
                                          return (
                                            <div 
                                              key={index} 
                                              className={`grid grid-cols-[1fr_auto] gap-3 p-3 border rounded-lg transition-colors ${
                                                isSelected ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-background hover:bg-muted/50'
                                              }`}
                                            >
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <p className="font-medium text-xs">{video.description || video.title || 'Vídeo Técnico'}</p>
                                                  {isSelected && (
                                                    <Badge variant="default" className="bg-green-600 text-white">
                                                      <CheckCircle className="w-3 h-3 mr-1" />
                                                      Selecionado
                                                    </Badge>
                                                  )}
                                                </div>
                                                <a 
                                                  href={video.url} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                                >
                                                  Ver vídeo no YouTube ↗
                                                </a>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant={isSelected ? "default" : "outline"}
                                                className={isSelected ? "bg-green-600 hover:bg-green-700" : ""}
                                                onClick={() => {
                                                  const updatedData = {
                                                    ...data,
                                                    explanatory_video_section: {
                                                      ...data.explanatory_video_section!,
                                                      selected_video: {
                                                        url: video.url,
                                                        title: video.description || video.title || product.name,
                                                        product_name: product.name,
                                                        product_id: product.id
                                                      }
                                                    }
                                                  };
                                                  setData(updatedData);
                                                  saveExplanatoryVideo(updatedData);
                                                  toast({
                                                    title: "Vídeo selecionado",
                                                    description: `${video.description || 'Vídeo técnico'} de ${product.name}`,
                                                  });
                                                }}
                                              >
                                                {isSelected ? (
                                                  <>
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                    Selecionado
                                                  </>
                                                ) : (
                                                  "Selecionar"
                                                )}
                                              </Button>
                                            </div>
                                          );
                                        })}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                              </Accordion>
                            )}
                          </CardContent>
                        </Card>

                        {/* Preview do Vídeo Selecionado */}
                        {data.explanatory_video_section?.selected_video && (
                          <Card className="border-green-200 bg-green-50/30">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Vídeo Selecionado
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                              {/* Informações do vídeo */}
                              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded border">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs truncate">
                                    {data.explanatory_video_section.selected_video.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {data.explanatory_video_section.selected_video.product_name}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => {
                                    const updatedData = {
                                      ...data,
                                      explanatory_video_section: {
                                        ...data.explanatory_video_section!,
                                        selected_video: null
                                      }
                                    };
                                    setData(updatedData);
                                    saveExplanatoryVideo(updatedData);
                                    toast({
                                      title: "Vídeo removido",
                                      description: "A seleção foi limpa",
                                    });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              
                              {/* Thumbnail do YouTube */}
                              <div className="relative w-full h-32 rounded overflow-hidden bg-gray-100 group cursor-pointer">
                                <img 
                                  src={`https://img.youtube.com/vi/${extractYouTubeId(data.explanatory_video_section.selected_video.url)}/mqdefault.jpg`}
                                  alt={data.explanatory_video_section.selected_video.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
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
                      <SolutionsSection
                        title={data.solutions_title}
                        solutions={data.solutions}
                        onTitleChange={(title) => setData(prev => ({ ...prev, solutions_title: title }))}
                        onSolutionsChange={(solutions) => setData(prev => ({ ...prev, solutions }))}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Informações Desktop */}
                <AccordionItem value="desktop-info">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      Informações Desktop
                      <AutoSaveIndicator 
                        lastSaved={lastSave}
                        className="ml-auto"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                     <div className="space-y-3">
                       <div className="flex items-center space-x-2">
                          <Switch
                            checked={data.desktop_info?.visible_desktop ?? false}
                            onCheckedChange={(checked) => {
                              console.log('🔧 [DESKTOP-INFO] Alterando visible_desktop:', checked);
                              const updatedData = {
                                ...data,
                                desktop_info: { 
                                  ...(data.desktop_info || { 
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
                              };
                              setData(updatedData);
                              saveDesktopInfo(updatedData);
                            }}
                          />
                          <Label className="font-medium">Visível no desktop</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={data.desktop_info?.visible_mobile ?? false}
                            onCheckedChange={(checked) => {
                              console.log('🔧 [DESKTOP-INFO] Alterando visible_mobile:', checked);
                              const updatedData = {
                                ...data,
                                desktop_info: { 
                                  ...(data.desktop_info || { 
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
                              };
                              setData(updatedData);
                              saveDesktopInfo(updatedData);
                            }}
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
                             onChange={(e) => {
                               const updatedData = {
                                 ...data,
                                 desktop_info: { ...data.desktop_info!, title: e.target.value }
                               };
                               setData(updatedData);
                               saveDesktopInfo(updatedData);
                             }}
                             placeholder="Título da seção desktop"
                           />
                         </div>
                         
                         <div>
                           <Label>Texto</Label>
                           <Textarea
                             value={data.desktop_info?.text ?? ''}
                             onChange={(e) => {
                               const updatedData = {
                                 ...data,
                                 desktop_info: { ...data.desktop_info!, text: e.target.value }
                               };
                               setData(updatedData);
                               saveDesktopInfo(updatedData);
                             }}
                             placeholder="Texto descritivo para preencher a página"
                             rows={4}
                           />
                         </div>

                         <Separator />

                         <div className="flex items-center space-x-2">
                           <Switch
                             checked={data.desktop_info?.show_table ?? false}
                             onCheckedChange={(checked) => {
                               console.log('🔧 [DESKTOP-INFO] Alterando show_table:', checked);
                               const updatedData = {
                                 ...data,
                                 desktop_info: { ...data.desktop_info!, show_table: checked }
                               };
                               setData(updatedData);
                               saveDesktopInfo(updatedData);
                             }}
                           />
                           <Label className="font-medium">Mostrar tabela</Label>
                         </div>

                        {(data.desktop_info?.show_table ?? false) && (
                          <>
                            <div>
                              <Label>Título da Tabela</Label>
                               <Input
                                 value={data.desktop_info?.table_title ?? ''}
                                 onChange={(e) => {
                                   const updatedData = {
                                     ...data,
                                     desktop_info: { ...data.desktop_info!, table_title: e.target.value }
                                   };
                                   setData(updatedData);
                                   saveDesktopInfo(updatedData);
                                 }}
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
                                          const updatedData = {
                                            ...data,
                                            desktop_info: { ...data.desktop_info!, table_headers: newHeaders }
                                          };
                                          setData(updatedData);
                                          saveDesktopInfo(updatedData);
                                          console.log('🔧 [EDITOR] Header atualizado:', { index, new_value: e.target.value, all_headers: newHeaders });
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
                                         const updatedData = {
                                           ...data,
                                           desktop_info: { 
                                             ...data.desktop_info!, 
                                             table_headers: newHeaders,
                                             table_data: newData
                                           }
                                         };
                                         setData(updatedData);
                                         saveDesktopInfo(updatedData);
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
                                     const updatedData = {
                                       ...data,
                                       desktop_info: { ...data.desktop_info!, table_headers: newHeaders }
                                     };
                                     setData(updatedData);
                                     saveDesktopInfo(updatedData);
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
                                             const updatedData = {
                                               ...data,
                                               desktop_info: { ...data.desktop_info!, table_data: newData }
                                             };
                                             setData(updatedData);
                                             saveDesktopInfo(updatedData);
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
                                                console.log(`Atualizando célula [${rowIndex}][${header}] com valor:`, e.target.value);
                                                const newData = [...(data.desktop_info?.table_data ?? [])];
                                                newData[rowIndex] = { ...newData[rowIndex], [header]: e.target.value };
                                                console.log('Dados atualizados da tabela:', newData);
                                                 const updatedData = {
                                                   ...data,
                                                   desktop_info: { ...data.desktop_info!, table_data: newData }
                                                 };
                                                 console.log('Estado atualizado - desktop_info:', updatedData.desktop_info);
                                                 setData(updatedData);
                                                 saveDesktopInfo(updatedData);
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
                                    console.log('Adicionando nova linha à tabela desktop_info');
                                    const newRow: { [key: string]: string } = {};
                                    (data.desktop_info?.table_headers ?? []).forEach(header => {
                                      newRow[header] = '';
                                    });
                                    const newData = [...(data.desktop_info?.table_data ?? []), newRow];
                                    console.log('Nova linha criada:', newRow);
                                    console.log('Novos dados da tabela:', newData);
                                     const updatedData = {
                                       ...data,
                                       desktop_info: { ...data.desktop_info!, table_data: newData }
                                     };
                                     console.log('Estado atualizado - desktop_info:', updatedData.desktop_info);
                                     setData(updatedData);
                                     saveDesktopInfo(updatedData);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar Linha
                                </Button>
                              </div>
                             </div>

                             {/* Preview da Tabela */}
                             {(data.desktop_info?.table_headers?.length ?? 0) > 0 && (data.desktop_info?.table_data?.length ?? 0) > 0 && (
                               <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                 <Label className="font-medium text-sm mb-2 block">Preview da Tabela</Label>
                                 <div className="overflow-x-auto">
                                   <table className="w-full border border-border rounded-md">
                                     <thead className="bg-muted">
                                       <tr>
                                         {(data.desktop_info?.table_headers ?? []).map((header, index) => (
                                           <th key={index} className="border border-border px-3 py-2 text-left text-sm font-medium">
                                             {header}
                                           </th>
                                         ))}
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {(data.desktop_info?.table_data ?? []).map((row, rowIndex) => (
                                         <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                           {(data.desktop_info?.table_headers ?? []).map((header, colIndex) => (
                                             <td key={colIndex} className="border border-border px-3 py-2 text-sm">
                                               {row[header] || '-'}
                                             </td>
                                           ))}
                                         </tr>
                                       ))}
                                     </tbody>
                                   </table>
                                 </div>
                               </div>
                             )}
                           </>
                         )}
                       </>
                     )}
                   </AccordionContent>
                  </AccordionItem>

                  {/* Ofertas na Landing Page */}
                  {((data.schema?.offers && data.schema.offers.length > 0) || selectedProductIds.length > 0) && (
                   <AccordionItem value="offers-section">
                     <AccordionTrigger>
                       <div className="flex items-center gap-2">
                         <Tag className="h-4 w-4" />
                         Ofertas na Landing Page
                         <Badge variant="secondary">{(data.schema?.offers?.length || 0)}</Badge>
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
                   {((data.schema?.offers && data.schema.offers.filter(offer => offer.show_in_resources).length > 0) || selectedProductIds.length > 0) && (
                    <AccordionItem value="resources-section">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          Recursos e Downloads
                          <Badge variant="secondary">{(data.schema?.offers?.filter(offer => offer.show_in_resources).length || 0)}</Badge>
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
                    
                    {(data.faq || []).map((faqItem, index) => (
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
                          <RichTextEditor
                            content={faqItem.answer}
                            onChange={(content) => {
                              const newFaq = [...data.faq];
                              newFaq[index].answer = content;
                              setData(prev => ({ ...prev, faq: newFaq }));
                            }}
                            placeholder="Digite a resposta com formatação rica..."
                            onInsertProductLink={() => {
                              setProductLinkModalOpen(true);
                              setActiveFaqIndex(index);
                            }}
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
                    
                    {hasCompanyData && (((data.footer?.locations?.length || 0) > 0) || ((data.footer?.social?.length || 0) > 0)) && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Auto-populado
                          </Badge>
                          <span className="text-sm text-blue-700">
                            Dados da empresa carregados automaticamente
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label>Localizações</Label>
                      {(data.footer?.locations || []).map((location, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            placeholder="Título"
                            value={location.title}
                            onChange={(e) => {
                              const newLocations = [...(data.footer?.locations || [])];
                              newLocations[index].title = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), locations: newLocations }
                              }));
                            }}
                          />
                          <Input
                            placeholder="Endereço"
                            value={location.address}
                            onChange={(e) => {
                              const newLocations = [...(data.footer?.locations || [])];
                              newLocations[index].address = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), locations: newLocations }
                              }));
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newLocations = (data.footer?.locations || []).filter((_, i) => i !== index);
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), locations: newLocations }
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
                              ...(prev.footer || { locations: [], links: [], social: [] }),
                              locations: [...(prev.footer?.locations || []), { title: '', address: '' }]
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
                      {(data.footer?.links || []).map((link, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            placeholder="Label"
                            value={link.label}
                            onChange={(e) => {
                              const newLinks = [...(data.footer?.links || [])];
                              newLinks[index].label = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), links: newLinks }
                              }));
                            }}
                          />
                          <Input
                            placeholder="URL"
                            value={link.href}
                            onChange={(e) => {
                              const newLinks = [...(data.footer?.links || [])];
                              newLinks[index].href = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), links: newLinks }
                              }));
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newLinks = (data.footer?.links || []).filter((_, i) => i !== index);
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), links: newLinks }
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
                              ...(prev.footer || { locations: [], links: [], social: [] }),
                              links: [...(prev.footer?.links || []), { label: '', href: '' }]
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
                      {(data.footer?.social || []).map((social, index) => (
                        <div key={index} className="flex gap-2 mt-2 items-center">
                          <Select
                            value={social.platform}
                            onValueChange={(value) => {
                              const newSocial = [...(data.footer?.social || [])];
                              const platform = SOCIAL_PLATFORMS.find(p => p.value === value);
                              newSocial[index] = {
                                ...newSocial[index],
                                platform: value,
                                icon_alt: `${platform?.label} Link`
                              };
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), social: newSocial }
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
                              const newSocial = [...(data.footer?.social || [])];
                              newSocial[index].href = e.target.value;
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), social: newSocial }
                              }));
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSocial = (data.footer?.social || []).filter((_, i) => i !== index);
                              setData(prev => ({
                                ...prev,
                                footer: { ...(prev.footer || { locations: [], links: [], social: [] }), social: newSocial }
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
                        <SEOSection
                          data={data.seo}
                          seoTitle={data.seo_title}
                          seoDescription={data.seo_description}
                          landingPageId={id}
                          onChange={(seoData) => setData(prev => ({
                            ...prev,
                            seo: { ...prev.seo, ...seoData }
                          }))}
                          onSEOTitleChange={(title) => setData(prev => ({
                            ...prev,
                            seo_title: title,
                            seo: { ...prev.seo, seo_title: title }
                          }))}
                          onSEODescriptionChange={(description) => setData(prev => ({
                            ...prev,
                            seo_description: description,
                            seo: { ...prev.seo, seo_description: description }
                          }))}
                        />

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
                                 {/* Contexto Adicional SEO com IA */}
                                 <div className="p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs font-medium text-emerald-700">📝 Contexto Adicional SEO</Label>
                                      <div className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                                        Contexto para IA
                                      </div>
                                    </div>
                                    <div className="relative group">
                                      <svg className="w-4 h-4 text-emerald-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-gray-700 z-50">
                                        <div className="font-medium mb-1">Como usar este campo:</div>
                                        <ul className="space-y-1 text-xs">
                                          <li>• Descreva produtos/serviços específicos</li>
                                          <li>• Mencione benefícios únicos da empresa</li>
                                          <li>• Inclua termos técnicos relevantes</li>
                                          <li>• <strong>NÃO</strong> use apenas keywords repetidas</li>
                                        </ul>
                                        <div className="text-emerald-600 font-medium mt-2">
                                          Este contexto ajuda a IA a gerar conteúdo mais preciso e relevante.
                                        </div>
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
                                            toast({ title: "Informe o contexto", description: "Adicione informações no campo 'Contexto Adicional SEO' para a IA trabalhar melhor.", variant: "destructive" });
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
                                           toast({ title: "✨ Contexto gerado!", description: "Contexto adicional SEO criado com sucesso." });
                                         }
                                       } catch (error) {
                                          console.error('Erro ao gerar contexto adicional:', error);
                                          toast({ title: "Erro", description: "Falha ao gerar contexto adicional", variant: "destructive" });
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
                                    placeholder="Ex: Somos especialistas em implantes dentários, ortodontia invisível e harmonização orofacial. Atendemos pacientes com foco em excelência técnica e atendimento humanizado."
                                    value={data.seo.seo_hidden_content}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Validação básica para evitar keyword stuffing
                                      if (value.length > 500) {
                                        toast({ 
                                          title: "Contexto muito longo", 
                                          description: "Mantenha o contexto focado e objetivo (máx. 500 caracteres).", 
                                          variant: "destructive" 
                                        });
                                        return;
                                      }
                                      setData(prev => ({
                                        ...prev,
                                        seo: { ...prev.seo, seo_hidden_content: value }
                                      }));
                                    }}
                                    className="text-xs min-h-[80px] text-emerald-700 bg-white/50"
                                    maxLength={500}
                                  />
                                  <div className="flex justify-between items-center mt-1">
                                    <div className="text-xs text-emerald-600">
                                      ✅ Contexto natural e descritivo
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {data.seo.seo_hidden_content?.length || 0}/500
                                    </div>
                                  </div>
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
                                             description: `${(data.faq?.length || 0)} perguntas analisadas com sucesso.` 
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
                                      <span>✅ {(data.faq?.length || 0)} perguntas no FAQ prontas para análise</span>
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
                            {(data.seo.hreflang || []).map((hreflang, index) => (
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

            {/* Aba Produtos & Ofertas */}
            <TabsContent value="schema-offers" className="space-y-6">
              
              {/* Novo Sistema Centralizado de Produtos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Seletor de Produtos */}
                <ProductSelector
                  landingPageId={id || ''}
                  selectedProductIds={selectedProductIds}
                  onSelectionChange={handleProductSelectionChange}
                />
                
                {/* Produtos Selecionados */}
                <SelectedProductsPanel
                  landingPageId={id || ''}
                  selectedProductIds={selectedProductIds}
                  onOrderChange={(newOrder) => {
                    setSelectedProductIds(newOrder);
                    if (id) {
                      updateLandingPage(id, { selected_product_ids: newOrder });
                    }
                  }}
                  onEditInRepository={(productId) => {
                    setPreviewTab('repository');
                  }}
                />
              </div>
              
              {/* 🆕 Reviews & LocalBusiness Schema */}
              <Card className="border-l-4 border-l-yellow-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Reviews & LocalBusiness Schema</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Gera schema com reviews consolidados (Google + Manuais + Vídeos)
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={data.schema?.reviews_enabled || false}
                      onCheckedChange={(checked) => setData(prev => ({
                        ...prev,
                        schema: { ...prev.schema, reviews_enabled: checked }
                      }))}
                    />
                  </div>
                </CardHeader>
                
                {data.schema?.reviews_enabled && (
                  <CardContent className="space-y-4">
                    {/* Estatísticas de Reviews */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600">Google Aprovados</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {data.schema?.all_reviews?.filter((r: any) => r.type === 'google').length || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600">Reviews Manuais</p>
                        <p className="text-2xl font-bold text-green-600">
                          {data.schema?.all_reviews?.filter((r: any) => r.type === 'manual').length || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-xs text-gray-600">Vídeo Depoimentos</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {data.schema?.all_reviews?.filter((r: any) => r.type === 'video').length || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-gray-600">Média de Rating</p>
                        <p className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
                          {data.schema?.all_reviews && data.schema.all_reviews.length > 0
                            ? (data.schema.all_reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / data.schema.all_reviews.length).toFixed(1)
                            : '0.0'}
                          <Star className="w-4 h-4 fill-current" />
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://search.google.com/test/rich-results', '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Testar Rich Snippets
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                      <p className="font-semibold mb-1">ℹ️ Como funciona:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Consolida reviews de Google, manuais e vídeo depoimentos</li>
                        <li>Gera schema LocalBusiness com AggregateRating</li>
                        <li>Limite de 15 reviews no schema (melhores ratings)</li>
                        <li>Validação automática de tamanho (&lt;100KB)</li>
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
              
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

              {/* SEO Configuration - Reviews Manuais */}
              <Card className="border-l-4 border-l-purple-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Users className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Configuração SEO - Reviews Manuais</CardTitle>
                        <p className="text-sm text-muted-foreground">Configure se reviews manuais aparecem no SEO</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={data.seo.manual_reviews_enabled || false}
                        onCheckedChange={(checked) => setData(prev => ({
                          ...prev,
                          seo: { ...prev.seo, manual_reviews_enabled: !!checked }
                        }))}
                      />
                      <Label className="font-medium">Utilizar no SEO</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-purple-700">
                      Reviews manuais agora são gerenciadas no <strong>Repositório Central</strong>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* SEO Configuration - Depoimentos em Vídeo */}
              <Card className="border-l-4 border-l-green-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <VideoIcon className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Configuração SEO - Depoimentos em Vídeo</CardTitle>
                        <p className="text-sm text-muted-foreground">Configure se depoimentos em vídeo aparecem no SEO</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={data.seo.video_testimonials_enabled || false}
                        onCheckedChange={(checked) => setData(prev => ({
                          ...prev,
                          seo: { ...prev.seo, video_testimonials_enabled: !!checked }
                        }))}
                      />
                      <Label className="font-medium">Utilizar no SEO</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700">
                      Depoimentos em vídeo agora são gerenciados no <strong>Repositório Central</strong>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Ofertas Estruturadas - Agora vem do sistema "Selecionar Produtos" */}
              <Card className="border-l-4 border-l-blue-500/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Ofertas Estruturadas para SEO</CardTitle>
                        <p className="text-sm text-muted-foreground">As ofertas são automaticamente geradas a partir dos produtos selecionados</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-700">
                      Use a seção <strong>"Selecionar Produtos para Ofertas"</strong> para configurar quais produtos aparecem como ofertas estruturadas no SEO
                    </span>
                  </div>
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
                        {(data.schema?.breadcrumb?.length || 0)} itens
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
                  {(data.schema?.breadcrumb || []).map((crumb, index) => (
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

            {/* Aba Autor (KOL) */}
            <TabsContent value="author" className="space-y-4">
              <KOLSection
                selectedKolId={data.author_kol_id}
                onKolChange={(kolId) => {
                  setData(prev => ({ ...prev, author_kol_id: kolId }));
                  dirtyRef.current = true;
                }}
              />
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

            {/* Aba Google Ads */}
            {data.status === 'approved' && (
              <TabsContent value="google-ads" className="space-y-4">
                <GoogleAdsTab 
                  landingPageId={id!}
                  data={data}
                  selectedProductIds={selectedProductIds}
                  onUpdate={(config) => {
                    console.log('Google Ads config updated:', config);
                    // Opcional: salvar config nas landing pages
                  }}
                />
              </TabsContent>
            )}
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
                  onClick={async () => {
                    try {
                      console.log('🔄 Gerando HTML completo...', { 
                        hasData: !!data, 
                        exportEnabled: data.seo.export_panel_enabled 
                      });
                      
                      const processedData = beforePreview(onSave(data));
                      console.log('✅ Dados processados com sucesso');
                      
                      const completeHTML = await generateHTML(processedData);
                      console.log('✅ HTML gerado com sucesso, comprimento:', completeHTML.length);
                      
                      await navigator.clipboard.writeText(completeHTML);
                      console.log('✅ HTML copiado para clipboard');
                      
                      toast({ 
                        title: "HTML Completo Copiado!", 
                        description: "Código pronto para editor web" 
                      });
                    } catch (error) {
                      console.error('❌ Erro ao gerar HTML completo:', error);
                      toast({ 
                        title: "Erro", 
                        description: `Falha ao gerar HTML: ${error.message}`,
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Code className="h-4 w-4 mr-2" />
                  HTML Completo
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                  onClick={async () => {
                    try {
                      console.log('🔄 Gerando Schema JSON-LD...', { 
                        hasData: !!data, 
                        hasFaq: !!data.faq?.length 
                      });
                      
                      const processedData = beforePreview(onSave(data));
                      console.log('✅ Dados processados para schema');
                      
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
                          ...((processedData.faq?.length || 0) > 0 ? [{
                            "@type": "FAQPage",
                            "mainEntity": (processedData.faq || []).map(faq => ({
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
                      
                      console.log('✅ Schema gerado com sucesso');
                      await navigator.clipboard.writeText(JSON.stringify(schemaData, null, 2));
                      console.log('✅ Schema copiado para clipboard');
                      
                      toast({ 
                        title: "Schema Markup Copiado!", 
                        description: "Dados estruturados JSON-LD prontos" 
                      });
                    } catch (error) {
                      console.error('❌ Erro ao gerar Schema:', error);
                      toast({ 
                        title: "Erro", 
                        description: `Falha ao gerar Schema: ${error.message}`,
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Schema JSON-LD
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                  onClick={async () => {
                    try {
                      console.log('🔄 Gerando Meta Tags...', { hasData: !!data });
                      
                      const processedData = beforePreview(onSave(data));
                      console.log('✅ Dados processados para meta tags');
                      
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
                      
                      console.log('✅ Meta tags geradas');
                      await navigator.clipboard.writeText(metaTags);
                      console.log('✅ Meta tags copiadas para clipboard');
                      
                      toast({ 
                        title: "Meta Tags Copiadas!", 
                        description: "Código para <head> do seu site" 
                      });
                    } catch (error) {
                      console.error('❌ Erro ao gerar Meta Tags:', error);
                      toast({ 
                        title: "Erro", 
                        description: `Falha ao gerar Meta Tags: ${error.message}`,
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Meta Tags
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-red-50 hover:bg-red-100 border-red-200"
                  onClick={async () => {
                    try {
                      console.log('🔄 Gerando GTM Code...', { hasData: !!data });
                      
                      const processedData = beforePreview(onSave(data));
                      console.log('✅ Dados processados para GTM');
                      
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
                      
                      console.log('✅ GTM Code gerado');
                      await navigator.clipboard.writeText(gtmCode);
                      console.log('✅ GTM Code copiado para clipboard');
                      
                      toast({ 
                        title: "GTM Code Copiado!", 
                        description: "Código para Google Tag Manager" 
                      });
                    } catch (error) {
                      console.error('❌ Erro ao gerar GTM Code:', error);
                      toast({ 
                        title: "Erro", 
                        description: `Falha ao gerar GTM Code: ${error.message}`,
                        variant: "destructive"
                      });
                    }
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
                      console.log('🔄 Validando Schema...', { hasData: !!data });
                      
                      const processedData = beforePreview(onSave(data));
                      const html = await generateHTML(processedData);
                      
                      console.log('✅ HTML gerado para validação, comprimento:', html.length);
                      
                      const response = await supabase.functions.invoke('validate-schema', {
                        body: { 
                          html, 
                          url: processedData.seo.canonical_url || 'https://seudominio.com' 
                        }
                      });
                      
                      if (response.error) {
                        console.error('❌ Erro na API de validação:', response.error);
                        toast({ 
                          title: "Erro na Validação", 
                          description: "Falha ao validar schema markup",
                          variant: "destructive" 
                        });
                        return;
                      }
                      
                      const result = response.data;
                      console.log('✅ Resultado da validação:', result);
                      
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
                      console.error('❌ Erro ao validar schema:', error);
                      toast({ 
                        title: "Erro", 
                        description: `Falha ao validar schema: ${error.message}`,
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

        {/* Preview Panel with Repository */}
        <div className={`${data.seo.hreflang_auto ? 'w-1/2' : 'w-1/2'} bg-gray-100 flex flex-col`}>
          <div className="p-4 bg-white border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Preview em Tempo Real + Repositório</h2>
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
                <Button variant="outline" size="sm" onClick={handleTestHTML} className="bg-orange-100 hover:bg-orange-200">
                  🧪 Test HTML
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex">
            {/* Preview Area */}
            <div className="flex-1 flex flex-col">
              <Tabs defaultValue="landing-preview" className="flex-1 flex flex-col" value={previewTab} onValueChange={setPreviewTab}>
            <TabsList className="mx-4 mt-4 grid w-auto grid-cols-4">
              <TabsTrigger value="landing-preview">Landing Page</TabsTrigger>
              <TabsTrigger value="email-preview">Email Marketing</TabsTrigger>
              <TabsTrigger value="blog-preview">Blog Post</TabsTrigger>
              <TabsTrigger value="repository">Repositório</TabsTrigger>
            </TabsList>
            
            <TabsContent value="landing-preview" className="flex-1 p-4">
              <div className="h-full border rounded-lg overflow-hidden">
                <iframe
                  key={`landing-${previewVersion}`}
                  srcDoc={generatedHTML}
                  className="w-full h-full"
                  title="Landing Page Preview"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="email-preview" className="flex-1 p-4">
              <div className="h-full border rounded-lg overflow-hidden">
                <iframe
                  key="email-preview"
                  srcDoc={generatedEmailHTML}
                  className="w-full h-full"
                  title="Email Preview"
                />
              </div>
            </TabsContent>

            <TabsContent value="blog-preview" className="flex-1 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Coluna esquerda: Editor Estratégico */}
                <div className="min-h-[60vh] max-h-[calc(100vh-220px)] overflow-y-auto">
                  <BlogEditorSection
                    landingPageId={id || ""}
                    landingPageData={data}
                    selectedProductIds={selectedProductIds}
                    onSave={handleStrategicBlogSave}
                  />
                </div>

                {/* Coluna direita: Preview Consolidado (Dentala + Eodonto) */}
                <div className="min-h-[60vh] max-h-[calc(100vh-220px)] overflow-y-auto">
                  <StrategicBlogPreview
                    dentalaData={dentalaBlogPost}
                    eodontoData={eodontoBlogPost}
                    approvedLandingPages={landingPages?.filter(lp => lp.status === 'approved') || []}
                    selectedProductIds={selectedProductIds}
                    refreshKey={strategicBlogRefreshKey}
                    landingPageId={id || ''}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Repository Tab - Fixed positioning */}
            <TabsContent value="repository" className="flex-1 p-4">
              <div className="h-full flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Repositório de Produtos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie todos os produtos disponíveis para suas landing pages
                  </p>
                </div>
                

                <div className="flex-1">
                <RepositoryPanel
                  landingPageId="repository"
                  onProductSelectionChange={setSelectedProducts}
                  onSyncTriggered={() => {
                    console.log('Products synced successfully');
                  }}
                  onCompanyProfileChange={(profile) => {
                    console.log('Company profile updated:', profile);
                  }}
                  className="h-full border-0 rounded-none"
                  />
                 </div>
               </div>
              </TabsContent>
            </Tabs>
            </div>
          </div>
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