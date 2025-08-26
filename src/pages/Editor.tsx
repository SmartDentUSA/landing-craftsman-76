import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Eye, Code, Copy, Settings, Plus, Trash2, Globe, Mail, Instagram, Facebook, Youtube, Twitter, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useLandingPages from "@/hooks/useLandingPages"; // Default export
import { ImageUploader } from "@/components/ImageUploader";
import { generateHTML, generateEmailHTML } from "@/lib/template-engine";
import { generateSafeHTML, generateSafeEmailHTML, getEmbedConfig } from "@/lib/selflux-engine";

// Interface de dados de imagem para o novo sistema
interface ImageData {
  mode: 'url' | 'cloudflare';
  src: string;
  cf_id?: string;
  variant?: 'w-480' | 'w-768' | 'w-1200';
  alt: string;
  scale: number;
}

interface MenuItem {
  label: string;
  href: string;
}

interface Solution {
  text: string;
  image: ImageData;
}

interface FAQ {
  question: string;
  answer: string;
}

// Estrutura completa de dados SEO e Social
interface SEOData {
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
  publish_date: string;
  lastmod: string;
  faq_enable: boolean;
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
  offers: Array<{
    name: string;
    description: string;
    price: string;
    currency: string;
    availability: string;
    valid_through: string;
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
  assunto_email: string;
  preheader_texto: string;
  url_site: string;
  logo_src: ImageData;
  logo_alt: string;
  selo: string;
  titulo_principal: string;
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
  advisory: {
    title: string;
    paragraph: string;
    cta: { label: string; href: string };
    image: ImageData;
  };
  faq_title: string;
  faq: FAQ[];
  cta_final: {
    title: string;
    paragraph: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
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

  return processedData;
};

// Função onSave para herança e autocompletar
const onSave = (data: LandingPageData): LandingPageData => {
  const processedData = { ...data };
  
  // Herdar og_* de seo_* se vazios
  if (!processedData.seo.og_title) processedData.seo.og_title = processedData.seo_title;
  if (!processedData.seo.og_description) processedData.seo.og_description = processedData.seo_description;
  if (!processedData.seo.twitter_title) processedData.seo.twitter_title = processedData.seo_title;
  if (!processedData.seo.twitter_description) processedData.seo.twitter_description = processedData.seo_description;
  
  // Autocompletar canonical_url se vazio
  if (!processedData.seo.canonical_url && window.location.hostname !== 'localhost') {
    const slug = processedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    processedData.seo.canonical_url = `https://${window.location.hostname}/${slug}`;
  }
  
  // Validações e avisos
  if (processedData.seo_title.length > 60) {
    console.warn('SEO Title muito longo (>60 caracteres)');
  }
  if (processedData.seo_description.length > 160) {
    console.warn('SEO Description muito longa (>160 caracteres)');
  }
  
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

const Editor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const { getLandingPage, updateLandingPage, addLandingPage } = useLandingPages();
  
  const [previewTab, setPreviewTab] = useState('landing-preview');
  const [data, setData] = useState<LandingPageData>({
    name: 'Smart Dent Campanha Q1',
    status: 'draft',
    template: 'Smart Dent Base v1',
    seo_title: 'Smart Dent - Sistema de Gestão Odontológica',
    seo_description: 'Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.',
    
    // Configuração de incorporação
    embed: {
      mode: 'default',
      namespace: 'sd'
    },
    
    // SEO & Social
    seo: {
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
      publish_date: new Date().toISOString(),
      lastmod: new Date().toISOString(),
      faq_enable: true
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
        image: createImageData('https://via.placeholder.com/200x150?text=Resinas', 'Resinas 3D de alta qualidade')
      },
      { 
        text: 'Scanner intraoral: precisão milimétrica para diagnósticos certeiros e tratamentos mais eficazes.',
        image: createImageData('https://via.placeholder.com/200x150?text=Scanner', 'Scanner intraoral de última geração')
      }
    ],
    advisory: {
      title: 'Consultoria personalizada para o seu negócio',
      paragraph: 'Nossa equipe de especialistas oferece consultoria completa para implementação de odontologia digital em clínicas de todos os portes.',
      cta: { label: 'Agendar consultoria', href: 'https://smartdent.com.br/consultoria' },
      image: createImageData('https://via.placeholder.com/400x300?text=Consultoria', 'Equipe de consultores especializados')
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
      link_preferencias: 'https://smartdent.com.br/preferencias'
    }
  });

  // Gerar HTML baseado nos dados processados
  const generatedHTML = useMemo(() => {
    const processedData = beforePreview(data);
    const embedConfig = getEmbedConfig({ embed: data.embed });
    
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
            src: img.src,
            alt: img.alt,
            scale: img.scale
          }))
        },
        solutions: processedData.solutions.map(s => ({
          ...s,
          image: {
            src: s.image.src,
            alt: s.image.alt,
            scale: s.image.scale
          }
        })),
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
          scale: img.scale
        }))
      },
      solutions: processedData.solutions.map(s => ({
        ...s,
        image: {
          src: s.image.src,
          alt: s.image.alt,
          scale: s.image.scale
        }
      })),
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

  const generatedEmailHTML = useMemo(() => {
    const processedData = beforePreview(data);
    const embedConfig = getEmbedConfig({ embed: data.embed });
    
    // Usar generateSafeEmailHTML se for modo SelFlux
    if (embedConfig.mode === 'selflux') {
      return generateSafeEmailHTML({
        ...processedData.email,
        logo_src: processedData.email.logo_src.src,
        imagem_src: processedData.email.imagem_src.src,
        imagem_alt: processedData.email.imagem_src.alt
      }, embedConfig);
    }
    
    // Modo padrão
    return generateEmailHTML({
      ...processedData.email,
      logo_src: processedData.email.logo_src.src,
      imagem_src: processedData.email.imagem_src.src,
      imagem_alt: processedData.email.imagem_src.alt
    });
  }, [data]);

  useEffect(() => {
    if (id) {
      const landingPage = getLandingPage(id);
      if (landingPage) {
        // Se há dados estruturados, usar direto mas garantir campos obrigatórios
        if (landingPage.data && typeof landingPage.data === 'object') {
          const loadedData = { ...landingPage.data, template: landingPage.template };
          
          // Garantir que todos os campos ImageData existem
          if (!loadedData.logo_url || typeof loadedData.logo_url === 'string') {
            loadedData.logo_url = createImageData(typeof loadedData.logo_url === 'string' ? loadedData.logo_url : '', loadedData.logo_alt || '');
          }
          if (!loadedData.seo?.og_image) {
            loadedData.seo = { ...loadedData.seo, og_image: createImageData() };
          }
          if (!loadedData.seo?.twitter_image) {
            loadedData.seo = { ...loadedData.seo, twitter_image: createImageData() };
          }
          if (!loadedData.email?.logo_src) {
            loadedData.email = { ...loadedData.email, logo_src: createImageData() };
          }
          if (!loadedData.email?.imagem_src) {
            loadedData.email = { ...loadedData.email, imagem_src: createImageData() };
          }
          
          setData(loadedData);
        } else {
          // Migrar dados antigos para novo formato se necessário
          const migratedData = { ...landingPage.data || {} };
          if (typeof migratedData.logo_url === 'string') {
            migratedData.logo_url = createImageData(migratedData.logo_url, migratedData.logo_alt || '');
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
                <p className="text-sm text-gray-500">
                  Status: <Badge variant={data.status === 'approved' ? 'default' : 'secondary'}>
                    {data.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                  </Badge>
                </p>
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
              <Button onClick={handleApprove} size="sm">
                Aprovar
              </Button>
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
              <Accordion type="single" collapsible defaultValue="seo">
                
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CTA Primário - Label</Label>
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
                        <Label>CTA Primário - URL</Label>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CTA Secundário - Label</Label>
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
                        <Label>CTA Secundário - URL</Label>
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
                    
                    <div>
                      <Label>Imagens do Banner</Label>
                      {data.banner.images.map((image, index) => (
                        <div key={index} className="mt-4 p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <Label>Imagem {index + 1}</Label>
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
                            placeholder={`URL da imagem ${index + 1}`}
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
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Imagem
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Soluções */}
                <AccordionItem value="solutions">
                  <AccordionTrigger>Soluções</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label>Título da Seção</Label>
                      <Input
                        value={data.solutions_title}
                        onChange={(e) => setData(prev => ({ ...prev, solutions_title: e.target.value }))}
                        placeholder="Título da seção de soluções"
                      />
                    </div>
                    
                    {data.solutions.map((solution, index) => (
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
                          <Label>Imagem</Label>
                          <ImageUploader
                            value={solution.image}
                            onChange={(imageData) => {
                              const newSolutions = [...data.solutions];
                              newSolutions[index].image = imageData;
                              setData(prev => ({ ...prev, solutions: newSolutions }));
                            }}
                            placeholder="URL da imagem da solução"
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
                          solutions: [...prev.solutions, { text: '', image: createImageData() }]
                        }));
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Solução
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Consultoria */}
                <AccordionItem value="advisory">
                  <AccordionTrigger>Consultoria</AccordionTrigger>
                  <AccordionContent className="space-y-4">
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
                  </AccordionContent>
                </AccordionItem>

                {/* FAQ */}
                <AccordionItem value="faq">
                  <AccordionTrigger>FAQ</AccordionTrigger>
                  <AccordionContent className="space-y-4">
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CTA Primário - Label</Label>
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
                        <Label>CTA Primário - URL</Label>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CTA Secundário - Label</Label>
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
                        <Label>CTA Secundário - URL</Label>
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
                          <Label>Título SEO</Label>
                          <Input
                            value={data.seo.seo_title}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              seo: { ...prev.seo, seo_title: e.target.value }
                            }))}
                            placeholder="Título otimizado para SEO"
                          />
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
            <TabsContent value="schema-offers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Schema & Ofertas (JSON-LD)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible defaultValue="software-app">
                    
                    {/* Software Application */}
                    <AccordionItem value="software-app">
                      <AccordionTrigger>Software Application</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nome da Aplicação</Label>
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
                          <div>
                            <Label>Categoria</Label>
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
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Avaliação (0-5)</Label>
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
                          <div>
                            <Label>Número de Avaliações</Label>
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
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Preço</Label>
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
                          <div>
                            <Label>Moeda</Label>
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
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Sistema Operacional</Label>
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
                          <div>
                            <Label>Categoria da Aplicação</Label>
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
                      </AccordionContent>
                    </AccordionItem>

                    {/* Ofertas */}
                    <AccordionItem value="offers">
                      <AccordionTrigger>Ofertas</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {data.schema.offers.map((offer, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-4">
                            <div className="flex justify-between items-center">
                              <Label>Oferta {index + 1}</Label>
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
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div>
                              <Label>Nome da Oferta</Label>
                              <Input
                                value={offer.name}
                                onChange={(e) => {
                                  const newOffers = [...data.schema.offers];
                                  newOffers[index].name = e.target.value;
                                  setData(prev => ({
                                    ...prev,
                                    schema: { ...prev.schema, offers: newOffers }
                                  }));
                                }}
                                placeholder="Nome da oferta"
                              />
                            </div>
                            
                            <div>
                              <Label>Descrição</Label>
                              <Textarea
                                value={offer.description}
                                onChange={(e) => {
                                  const newOffers = [...data.schema.offers];
                                  newOffers[index].description = e.target.value;
                                  setData(prev => ({
                                    ...prev,
                                    schema: { ...prev.schema, offers: newOffers }
                                  }));
                                }}
                                placeholder="Descrição da oferta"
                                rows={2}
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label>Preço</Label>
                                <Input
                                  value={offer.price}
                                  onChange={(e) => {
                                    const newOffers = [...data.schema.offers];
                                    newOffers[index].price = e.target.value;
                                    setData(prev => ({
                                      ...prev,
                                      schema: { ...prev.schema, offers: newOffers }
                                    }));
                                  }}
                                  placeholder="199.90"
                                />
                              </div>
                              <div>
                                <Label>Moeda</Label>
                                <Select
                                  value={offer.currency}
                                  onValueChange={(value) => {
                                    const newOffers = [...data.schema.offers];
                                    newOffers[index].currency = value;
                                    setData(prev => ({
                                      ...prev,
                                      schema: { ...prev.schema, offers: newOffers }
                                    }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="BRL">BRL</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Disponibilidade</Label>
                                <Select
                                  value={offer.availability}
                                  onValueChange={(value) => {
                                    const newOffers = [...data.schema.offers];
                                    newOffers[index].availability = value;
                                    setData(prev => ({
                                      ...prev,
                                      schema: { ...prev.schema, offers: newOffers }
                                    }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="InStock">Em Estoque</SelectItem>
                                    <SelectItem value="OutOfStock">Fora de Estoque</SelectItem>
                                    <SelectItem value="PreOrder">Pré-venda</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <Label>Válido Até</Label>
                              <Input
                                type="date"
                                value={offer.valid_through}
                                onChange={(e) => {
                                  const newOffers = [...data.schema.offers];
                                  newOffers[index].valid_through = e.target.value;
                                  setData(prev => ({
                                    ...prev,
                                    schema: { ...prev.schema, offers: newOffers }
                                  }));
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
                              schema: {
                                ...prev.schema,
                                offers: [...prev.schema.offers, {
                                  name: '',
                                  description: '',
                                  price: '',
                                  currency: 'BRL',
                                  availability: 'InStock',
                                  valid_through: ''
                                }]
                              }
                            }));
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Oferta
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Breadcrumb */}
                    <AccordionItem value="breadcrumb">
                      <AccordionTrigger>Breadcrumb</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {data.schema.breadcrumb.map((crumb, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Nome"
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
                              placeholder="URL"
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
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Item
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
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
              <Accordion type="single" collapsible defaultValue="email-header">
                
                {/* Header do Email */}
                <AccordionItem value="email-header">
                  <AccordionTrigger>Header do Email</AccordionTrigger>
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
                  <AccordionTrigger>Conteúdo Principal</AccordionTrigger>
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
                  <AccordionTrigger>CTAs do Email</AccordionTrigger>
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
                  <AccordionTrigger>Destaques</AccordionTrigger>
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
                  <AccordionTrigger>Benefícios</AccordionTrigger>
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
                  <AccordionTrigger>Imagem do Email</AccordionTrigger>
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

                {/* Footer */}
                <AccordionItem value="email-footer">
                  <AccordionTrigger>Footer do Email</AccordionTrigger>
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

        {/* Preview Panel */}
        <div className="w-1/2 bg-gray-100 flex flex-col">
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
            <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
              <TabsTrigger value="landing-preview">Landing Page</TabsTrigger>
              <TabsTrigger value="email-preview">Email Marketing</TabsTrigger>
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
                  srcDoc={generatedEmailHTML}
                  className="w-full h-full"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Editor;