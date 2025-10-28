import { useState, useEffect, useRef } from "react";
import { OptimizedImage } from '@/components/OptimizedImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput, TagInputHandle } from "@/components/ui/tag-input";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { Save, Trash2, Plus, X, Sparkles, Download, Check, ChevronsUpDown, FileText, Package, AlertCircle, Info, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VideoSection } from "@/components/VideoSection";
import { CaptionExtractor } from "@/components/CaptionExtractor";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { useCategoryContext } from '@/contexts/CategoryContext';
import { useCompanyTargetAudience } from '@/hooks/useCompanyTargetAudience';
import { useCallback } from 'react';
import { ProductAISmartMerge } from './ProductAISmartMerge';
import { FAQEditor } from './FAQEditor';
import { ProductLojaIntegradaImporter } from './ProductLojaIntegradaImporter';
import { VariationCard } from './VariationCard';
import { GalleryImageUploader } from './GalleryImageUploader';
import { ProductEcommerceGenerator } from './ProductEcommerceGenerator';

interface Video {
  url: string;
  description: string;
}

interface Tutorial {
  id: string;
  course_name: string;
  course_url: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sales_pitch?: string;
  price?: number;
  promo_price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  image_alt?: string;
  image_supabase_path?: string;
  product_url?: string;
  target_audience?: string[];
  use_in_ai_generation: boolean;
  approved: boolean;
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
  benefits?: string[];
  features?: string[];
  tags?: string[];
  bot_trigger_words?: string[];
  instagram_videos?: Video[];
  youtube_videos?: Video[];
  testimonial_videos?: Video[];
  technical_videos?: Video[];
  tiktok_videos?: Video[];
  tutorial_resources?: {
    tutorials: Tutorial[];
  };
  video_captions?: any;
  original_data?: any;
  images_gallery?: Array<{ url: string; alt: string; order: number; is_main: boolean; supabase_path?: string }>;
  // Google Merchant Center fields
  gtin?: string;
  ean?: string;
  mpn?: string;
  brand?: string;
  color?: string;
  size?: string;
  material?: string;
  google_product_category?: string;
  condition?: string;
  availability?: string;
  // Physical specifications
  variations?: { name: string; price?: number; stock?: number; color?: string; size?: string }[];
  package_size?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  store_category?: string;
  // SEO Avançado
  seo_title_override?: string;
  seo_description_override?: string;
  slug?: string;
  // Estoque & Logística
  stock_quantity?: number;
  stock_managed?: boolean;
  min_order_quantity?: number;
  max_order_quantity?: number;
  multiple_order_quantity?: number;
  unit_measure?: string;
  shipping_time?: string;
  free_shipping?: boolean;
  shipping_type?: string;
  // Status & Flags de Controle
  active?: boolean;
  featured?: boolean;
  launch?: boolean;
  promotion?: boolean;
  showcase?: boolean;
  // Fiscais
  ncm?: string;
  fiscal_class?: string;
  tax_situation?: string;
  fiscal_origin?: string;
  // Landing Page Section controls
  show_in_resources?: boolean;
  selected?: boolean;
  // Resource CTAs
  resource_cta1?: { label: string; url: string; visible: boolean };
  resource_cta2?: { label: string; url: string; visible: boolean };
  resource_cta3?: { label: string; url: string; visible: boolean };
  // Resource descriptions
  resource_descriptions?: { cta1: string; cta2: string; cta3: string };
  // Offer discount CTA
  offer_discount_cta?: { label: string; url: string; visible: boolean };
  // FAQ
  faq?: Array<{ question: string; answer: string }>;
  // Technical Specifications
  technical_specifications?: Array<{ label: string; value: string }>;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function ProductEditModal({ isOpen, onClose, product, onSave, onDelete }: ProductEditModalProps) {
  console.log('ProductEditModal rendering...');
  
  const categoryContext = useCategoryContext();
  console.log('CategoryContext:', categoryContext);
  
  const { unifiedCategories, getUnifiedSubcategoriesForCategory } = categoryContext;
  console.log('unifiedCategories:', unifiedCategories);
  
  const { getConfigByCategory } = useCategoryConfig();
  const { targetAudience: companyTargetAudience } = useCompanyTargetAudience();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    sales_pitch: '',
    price: 0,
    currency: 'BRL',
    category: '',
    subcategory: '',
    image_url: '',
    product_url: '',
    target_audience: [],
    use_in_ai_generation: true,
    approved: true,
        keywords: [],
        market_keywords: [],
        search_intent_keywords: [],
        benefits: [],
        features: [],
        bot_trigger_words: [],
    instagram_videos: [],
    youtube_videos: [],
    testimonial_videos: [],
    technical_videos: [],
    // Landing Page Section controls
    show_in_resources: false,
    selected: false,
    // Resource CTAs
    resource_cta1: { label: '', url: '', visible: false },
    resource_cta2: { label: '', url: '', visible: false },
    resource_cta3: { label: '', url: '', visible: false },
    // Resource descriptions
    resource_descriptions: { cta1: '', cta2: '', cta3: '' },
    // Offer discount CTA
    offer_discount_cta: { label: 'Comprar com Desconto', url: '', visible: false },
    // FAQ
    faq: [],
    // Technical Specifications
    technical_specifications: []
  });
  const [promoPrice, setPromoPrice] = useState<number | undefined>(undefined);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [marketKeywords, setMarketKeywords] = useState<string[]>([]);
  const [searchIntentKeywords, setSearchIntentKeywords] = useState<string[]>([]);
  const [botTriggerWords, setBotTriggerWords] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [overwriteData, setOverwriteData] = useState(false);
  const [generatingSEO, setGeneratingSEO] = useState(false);
  const [generatingFAQs, setGeneratingFAQs] = useState(false);
  const [showEcommerceModal, setShowEcommerceModal] = useState(false);
  
  // Images gallery state
  const [imagesGallery, setImagesGallery] = useState<Array<{ url: string; alt: string; order: number; is_main: boolean }>>([]);
  
  // Physical specifications state
  const [variations, setVariations] = useState<{ name: string; price?: number; stock?: number; color?: string; size?: string }[]>([]);
  const [packageSize, setPackageSize] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  
  const botTagRef = useRef<TagInputHandle>(null);
  const faqEditorRef = useRef<{ blurAllEditors: () => void }>(null);
  
  // Video states
  const [instagramVideos, setInstagramVideos] = useState<Video[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<Video[]>([]);
  const [testimonialVideos, setTestimonialVideos] = useState<Video[]>([]);
  const [technicalVideos, setTechnicalVideos] = useState<Video[]>([]);
  const [tiktokVideos, setTiktokVideos] = useState<Video[]>([]);
  
  // Tutorial states
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [editingTutorialId, setEditingTutorialId] = useState<string | null>(null);
  const [editTutorialName, setEditTutorialName] = useState('');
  const [editTutorialUrl, setEditTutorialUrl] = useState('');
  
  // Caption states
  const [videoCaptions, setVideoCaptions] = useState<any>({});
  
  const { toast } = useToast();

  // Função para carregar configurações padrão de categoria
  const loadCategoryDefaults = useCallback((category: string, subcategory: string) => {
    // Tenta buscar configuração específica (categoria + subcategoria)
    let config = getConfigByCategory(category, subcategory);
    
    // Se não encontrar configuração específica, tenta buscar apenas por categoria
    if (!config && category) {
      const generalConfigs = getConfigByCategory(category, '');
      config = generalConfigs;
    }
    
    if (config) {
      console.log('Aplicando configuração:', config);
      // Auto-preencher apenas campos vazios para não sobrescrever dados já inseridos
      const updates: Partial<Product> = {};
      let fieldsUpdated = [];
      
      if (config.target_audience.length > 0 && (!targetAudience || targetAudience.length === 0)) {
        setTargetAudience(config.target_audience);
        fieldsUpdated.push('Público-Alvo');
      }
      
      if (config.keywords.length > 0 && (!formData.keywords || formData.keywords.length === 0)) {
        updates.keywords = config.keywords;
        fieldsUpdated.push('Keywords');
      }
      
      if (config.market_keywords.length > 0 && (!marketKeywords || marketKeywords.length === 0)) {
        setMarketKeywords(config.market_keywords);
        fieldsUpdated.push('Keywords de Mercado');
      }
      
      if (config.search_intent_keywords.length > 0 && (!searchIntentKeywords || searchIntentKeywords.length === 0)) {
        setSearchIntentKeywords(config.search_intent_keywords);
        fieldsUpdated.push('Keywords de Intenção de Busca');
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
      
      if (fieldsUpdated.length > 0) {
        toast({
          title: "Campos preenchidos automaticamente",
          description: `${fieldsUpdated.join(', ')} foram aplicados da configuração da categoria`
        });
      }
    } else {
      console.log('Nenhuma configuração encontrada para:', { category, subcategory });
    }
  }, [getConfigByCategory, targetAudience, formData.keywords, marketKeywords, searchIntentKeywords, toast]);

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        keywords: product.keywords || [],
        market_keywords: product.market_keywords || [],
        search_intent_keywords: product.search_intent_keywords || [],
        benefits: product.benefits || [],
        features: product.features || [],
        instagram_videos: product.instagram_videos || [],
        youtube_videos: product.youtube_videos || [],
        testimonial_videos: product.testimonial_videos || [],
        technical_videos: product.technical_videos || [],
        // Landing Page Section controls
        show_in_resources: product.show_in_resources || false,
        selected: product.selected || false,
        // Resource CTAs
        resource_cta1: product.resource_cta1 || { label: '', url: '', visible: false },
        resource_cta2: product.resource_cta2 || { label: '', url: '', visible: false },
        resource_cta3: product.resource_cta3 || { label: '', url: '', visible: false },
        // Resource descriptions
        resource_descriptions: product.resource_descriptions || { cta1: '', cta2: '', cta3: '' },
        // Offer discount CTA
        offer_discount_cta: product.offer_discount_cta || { label: 'Comprar com Desconto', url: '', visible: false },
        // FAQ
        faq: product.faq || [],
        // Technical Specifications
      technical_specifications: product.technical_specifications || [],
      tutorial_resources: product.tutorial_resources || { tutorials: [] }
    });
      setBenefits(product.benefits || []);
      setFeatures(product.features || []);
      setTargetAudience(product.target_audience || []);
      setMarketKeywords(product.market_keywords || []);
      setSearchIntentKeywords(product.search_intent_keywords || []);
      setBotTriggerWords(product.bot_trigger_words || []);
      setInstagramVideos(product.instagram_videos || []);
      setYoutubeVideos(product.youtube_videos || []);
      setTestimonialVideos(product.testimonial_videos || []);
      setTechnicalVideos(product.technical_videos || []);
      setTiktokVideos(product.tiktok_videos || []);
      setTutorials(product.tutorial_resources?.tutorials || []);
      setVideoCaptions(product.video_captions || {});
      setPromoPrice((product as any).promo_price);
      
      // Physical specifications
      setVariations(product.variations || []);
      setPackageSize(product.package_size || '');
      setWeight(product.weight?.toString() || '');
      setHeight(product.height?.toString() || '');
      setWidth(product.width?.toString() || '');
      setDepth(product.depth?.toString() || '');
      setStoreCategory(product.store_category || '');
      
      // Images gallery
      setImagesGallery((product as any).images_gallery || []);
    } else {
      setFormData({
        name: '',
        description: '',
        sales_pitch: '',
        price: 0,
        currency: 'BRL',
        category: '',
        subcategory: '',
        image_url: '',
        product_url: '',
        target_audience: [],
        use_in_ai_generation: true,
        approved: true,
        keywords: [],
        market_keywords: [],
        search_intent_keywords: [],
        benefits: [],
        features: [],
        bot_trigger_words: [],
        instagram_videos: [],
        youtube_videos: [],
        testimonial_videos: [],
        technical_videos: [],
        // Landing Page Section controls
        show_in_resources: false,
        selected: false,
        // Resource CTAs
        resource_cta1: { label: '', url: '', visible: false },
        resource_cta2: { label: '', url: '', visible: false },
        resource_cta3: { label: '', url: '', visible: false },
        // Resource descriptions
        resource_descriptions: { cta1: '', cta2: '', cta3: '' },
        // Offer discount CTA
        offer_discount_cta: { label: 'Comprar com Desconto', url: '', visible: false }
      });
      setBenefits([]);
      setFeatures([]);
      // Auto-preencher com público-alvo da empresa para novos produtos
      setTargetAudience(companyTargetAudience.length > 0 ? companyTargetAudience : []);
      setMarketKeywords([]);
      setSearchIntentKeywords([]);
      setBotTriggerWords([]);
      setInstagramVideos([]);
      setYoutubeVideos([]);
      setTestimonialVideos([]);
      setTechnicalVideos([]);
      setVideoCaptions({});
      
      // Reset physical specifications
      setVariations([]);
      setPackageSize('');
      setWeight('');
      setHeight('');
      setWidth('');
      setDepth('');
      setStoreCategory('');
      setPromoPrice(undefined);
      
      // Reset images gallery
      setImagesGallery([]);
    }
  }, [product]);

  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }));
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      const updatedBenefits = [...benefits, newBenefit.trim()];
      setBenefits(updatedBenefits);
      setFormData(prev => ({ ...prev, benefits: updatedBenefits }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    const updatedBenefits = benefits.filter((_, i) => i !== index);
    setBenefits(updatedBenefits);
    setFormData(prev => ({ ...prev, benefits: updatedBenefits }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const updatedFeatures = [...features, newFeature.trim()];
      setFeatures(updatedFeatures);
      setFormData(prev => ({ ...prev, features: updatedFeatures }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
    setFormData(prev => ({ ...prev, features: updatedFeatures }));
  };

  const generateSEOWithAI = async () => {
    setGeneratingSEO(true);
    
    try {
      // Preparar contexto do produto para a IA
      const productContext = `
Nome: ${formData.name}
Descrição: ${formData.description || 'N/A'}
Pitch de Vendas: ${formData.sales_pitch || 'N/A'}
Categoria: ${formData.category || 'N/A'}
Subcategoria: ${formData.subcategory || 'N/A'}
Benefícios: ${benefits.join(', ') || 'N/A'}
Características: ${features.join(', ') || 'N/A'}
Público-alvo: ${targetAudience.join(', ') || 'N/A'}
Keywords: ${formData.keywords?.join(', ') || 'N/A'}
Preço: ${formData.currency || 'BRL'} ${formData.price || 'N/A'}
      `.trim();

      // Gerar Título SEO
      const titleResponse = await supabase.functions.invoke('ai-seo-generator', {
        body: {
          type: 'seo_title',
          content: productContext,
          speed: 'fast'
        }
      });

      if (titleResponse.error) throw titleResponse.error;

      // Gerar Meta Description
      const descResponse = await supabase.functions.invoke('ai-seo-generator', {
        body: {
          type: 'meta_description',
          content: productContext,
          speed: 'fast'
        }
      });

      if (descResponse.error) throw descResponse.error;

      // Usar URL da Loja Integrada como slug, ou gerar fallback
      const slug = formData.product_url || formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const newSeoData = {
        seo_title_override: titleResponse.data?.content || '',
        seo_description_override: descResponse.data?.content || '',
        slug: slug
      };

      console.log('✅ [SEO DEBUG] SEO gerado com IA:', newSeoData);

      // Atualizar formulário
      setFormData(prev => ({
        ...prev,
        ...newSeoData
      }));

      // Auto-save no banco de dados
      if (product?.id) {
        const { error: saveError } = await supabase
          .from('products_repository')
          .update({
            seo_title_override: newSeoData.seo_title_override,
            seo_description_override: newSeoData.seo_description_override,
            slug: newSeoData.slug,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (saveError) {
          console.error('❌ Erro ao salvar SEO automaticamente:', saveError);
          toast({
            title: "⚠️ SEO gerado mas não salvo",
            description: "Conteúdo gerado com sucesso, mas não foi possível salvar automaticamente. Clique em Atualizar para salvar manualmente.",
            variant: "destructive"
          });
          return;
        }

        console.log('✅ SEO atualizado e salvo:', {
          title: titleResponse.data?.content,
          description: descResponse.data?.content,
          slug
        });

        toast({
          title: "✅ SEO Gerado e Salvo!",
          description: formData.product_url 
            ? "Título, descrição e URL foram salvos automaticamente"
            : "Título, descrição e slug foram salvos automaticamente"
        });
      } else {
        console.log('✅ SEO atualizado (novo produto):', {
          title: titleResponse.data?.content,
          description: descResponse.data?.content,
          slug
        });

        toast({
          title: "SEO gerado com sucesso!",
          description: "Será salvo quando você criar o produto"
        });
      }

    } catch (error) {
      console.error('Erro ao gerar SEO:', error);
      toast({
        title: "Erro ao gerar SEO",
        description: "Não foi possível gerar o conteúdo SEO automaticamente",
        variant: "destructive"
      });
    } finally {
      setGeneratingSEO(false);
    }
  };

  // Video management functions
  const addVideo = (type: 'instagram' | 'youtube' | 'testimonial' | 'technical' | 'tiktok', url: string, description: string) => {
    if (!url.trim()) return;

    const newVideo: Video = { url: url.trim(), description: description.trim() };
    
    switch (type) {
      case 'instagram':
        if (instagramVideos.length >= 5) {
          toast({
            title: "Limite atingido",
            description: "Máximo de 5 vídeos Instagram permitidos",
            variant: "destructive"
          });
          return;
        }
        const updatedInstagram = [...instagramVideos, newVideo];
        setInstagramVideos(updatedInstagram);
        setFormData(prev => ({ ...prev, instagram_videos: updatedInstagram }));
        break;
        
      case 'youtube':
        if (youtubeVideos.length >= 5) {
          toast({
            title: "Limite atingido",
            description: "Máximo de 5 vídeos YouTube permitidos",
            variant: "destructive"
          });
          return;
        }
        const updatedYoutube = [...youtubeVideos, newVideo];
        setYoutubeVideos(updatedYoutube);
        setFormData(prev => ({ ...prev, youtube_videos: updatedYoutube }));
        break;
        
      case 'testimonial':
        if (testimonialVideos.length >= 5) {
          toast({
            title: "Limite atingido",
            description: "Máximo de 5 vídeos de depoimento permitidos",
            variant: "destructive"
          });
          return;
        }
        const updatedTestimonial = [...testimonialVideos, newVideo];
        setTestimonialVideos(updatedTestimonial);
        setFormData(prev => ({ ...prev, testimonial_videos: updatedTestimonial }));
        break;
        
      case 'technical':
        if (technicalVideos.length >= 5) {
          toast({
            title: "Limite atingido",
            description: "Máximo de 5 vídeos técnicos permitidos",
            variant: "destructive"
          });
          return;
        }
        const updatedTechnical = [...technicalVideos, newVideo];
        setTechnicalVideos(updatedTechnical);
        setFormData(prev => ({ ...prev, technical_videos: updatedTechnical }));
        break;
        
      case 'tiktok':
        if (tiktokVideos.length >= 5) {
          toast({
            title: "Limite atingido",
            description: "Máximo de 5 vídeos TikTok permitidos",
            variant: "destructive"
          });
          return;
        }
        const updatedTiktok = [...tiktokVideos, newVideo];
        setTiktokVideos(updatedTiktok);
        setFormData(prev => ({ ...prev, tiktok_videos: updatedTiktok }));
        break;
    }
  };

  const editVideo = (type: 'instagram' | 'youtube' | 'testimonial' | 'technical' | 'tiktok', index: number, url: string, description: string) => {
    const newVideo: Video = { url, description };
    
    switch (type) {
      case 'instagram':
        const updatedInstagram = [...instagramVideos];
        updatedInstagram[index] = newVideo;
        setInstagramVideos(updatedInstagram);
        setFormData(prev => ({ ...prev, instagram_videos: updatedInstagram }));
        break;
        
      case 'youtube':
        const updatedYoutube = [...youtubeVideos];
        updatedYoutube[index] = newVideo;
        setYoutubeVideos(updatedYoutube);
        setFormData(prev => ({ ...prev, youtube_videos: updatedYoutube }));
        break;
        
      case 'testimonial':
        const updatedTestimonial = [...testimonialVideos];
        updatedTestimonial[index] = newVideo;
        setTestimonialVideos(updatedTestimonial);
        setFormData(prev => ({ ...prev, testimonial_videos: updatedTestimonial }));
        break;
        
      case 'technical':
        const updatedTechnical = [...technicalVideos];
        updatedTechnical[index] = newVideo;
        setTechnicalVideos(updatedTechnical);
        setFormData(prev => ({ ...prev, technical_videos: updatedTechnical }));
        break;
        
      case 'tiktok':
        const updatedTiktok = [...tiktokVideos];
        updatedTiktok[index] = newVideo;
        setTiktokVideos(updatedTiktok);
        setFormData(prev => ({ ...prev, tiktok_videos: updatedTiktok }));
        break;
    }

    toast({
      title: "Vídeo atualizado",
      description: "As alterações foram salvas com sucesso"
    });
  };

  const removeVideo = (type: 'instagram' | 'youtube' | 'testimonial' | 'technical' | 'tiktok', index: number) => {
    switch (type) {
      case 'instagram':
        const updatedInstagram = instagramVideos.filter((_, i) => i !== index);
        setInstagramVideos(updatedInstagram);
        setFormData(prev => ({ ...prev, instagram_videos: updatedInstagram }));
        break;
        
      case 'youtube':
        const updatedYoutube = youtubeVideos.filter((_, i) => i !== index);
        setYoutubeVideos(updatedYoutube);
        setFormData(prev => ({ ...prev, youtube_videos: updatedYoutube }));
        break;
        
      case 'testimonial':
        const updatedTestimonial = testimonialVideos.filter((_, i) => i !== index);
        setTestimonialVideos(updatedTestimonial);
        setFormData(prev => ({ ...prev, testimonial_videos: updatedTestimonial }));
        break;
        
      case 'technical':
        const updatedTechnical = technicalVideos.filter((_, i) => i !== index);
        setTechnicalVideos(updatedTechnical);
        setFormData(prev => ({ ...prev, technical_videos: updatedTechnical }));
        break;
        
      case 'tiktok':
        const updatedTiktok = tiktokVideos.filter((_, i) => i !== index);
        setTiktokVideos(updatedTiktok);
        setFormData(prev => ({ ...prev, tiktok_videos: updatedTiktok }));
        break;
    }
  };

  const addTutorial = (courseName: string, courseUrl: string) => {
    if (!courseName.trim() || !courseUrl.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome do curso e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validar URL básica
    try {
      new URL(courseUrl);
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida",
        variant: "destructive",
      });
      return;
    }

    const newTutorial: Tutorial = {
      id: crypto.randomUUID(),
      course_name: courseName,
      course_url: courseUrl,
      created_at: new Date().toISOString(),
    };

    const updated = [...tutorials, newTutorial];
    setTutorials(updated);
    setFormData(prev => ({ 
      ...prev, 
      tutorial_resources: { tutorials: updated } 
    }));

    toast({
      title: "Tutorial adicionado",
      description: `"${courseName}" foi adicionado com sucesso`,
    });
  };

  const editTutorial = (tutorialId: string, courseName: string, courseUrl: string) => {
    if (!courseName.trim() || !courseUrl.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome do curso e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(courseUrl);
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida",
        variant: "destructive",
      });
      return;
    }

    const updated = tutorials.map(t => 
      t.id === tutorialId 
        ? { ...t, course_name: courseName, course_url: courseUrl }
        : t
    );
    setTutorials(updated);
    setFormData(prev => ({ 
      ...prev, 
      tutorial_resources: { tutorials: updated } 
    }));

    toast({
      title: "Tutorial atualizado",
      description: `"${courseName}" foi atualizado com sucesso`,
    });
  };

  const removeTutorial = (tutorialId: string) => {
    const updated = tutorials.filter(t => t.id !== tutorialId);
    setTutorials(updated);
    setFormData(prev => ({ 
      ...prev, 
      tutorial_resources: { tutorials: updated } 
    }));
  };

  // Caption management function - ✅ FASE 2: Sincronizar estado imediatamente
  const handleCaptionsExtracted = (videoType: string, captions: any[]) => {
    const updatedCaptions = {
      ...videoCaptions,
      [videoType]: captions
    };
    setVideoCaptions(updatedCaptions);
  };

  const generateKeywordsWithAI = async () => {
    // Check if we have enough content to generate keywords
    const hasContent = formData.description?.trim() || 
                      benefits.length > 0 || 
                      features.length > 0 || 
                      formData.name?.trim();

    if (!hasContent) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos nome, descrição, benefícios ou recursos para gerar keywords",
        variant: "destructive"
      });
      return;
    }

    setGeneratingKeywords(true);
    try {
      // Prepare content for AI
      const contentParts = [];
      
      if (formData.name?.trim()) {
        contentParts.push(`Produto: ${formData.name}`);
      }
      
      if (formData.description?.trim()) {
        contentParts.push(`Descrição: ${formData.description}`);
      }
      
      if (benefits.length > 0) {
        contentParts.push(`Benefícios: ${benefits.join(', ')}`);
      }
      
      if (features.length > 0) {
        contentParts.push(`Recursos: ${features.join(', ')}`);
      }

      const content = contentParts.join('\n\n');

      const { data, error } = await supabase.functions.invoke('ai-seo-generator', {
        body: {
          type: 'keywords',
          content: content
        }
      });

      if (error) throw error;

      if (data?.success && data?.content) {
        // Parse the keywords response
        let newKeywords: string[] = [];
        
        if (typeof data.content === 'object') {
          // Combine all keyword types
          const keywordData = data.content;
          newKeywords = [
            ...(keywordData.primary || []),
            ...(keywordData.secondary || []),
            ...(keywordData.lsi || []),
            ...(keywordData.long_tail || [])
          ];
        } else if (Array.isArray(data.content)) {
          newKeywords = data.content;
        }

        // Filter out duplicates and merge with existing keywords
        const existingKeywords = formData.keywords || [];
        const uniqueNewKeywords = newKeywords.filter(
          keyword => !existingKeywords.includes(keyword)
        );

        const updatedKeywords = [...existingKeywords, ...uniqueNewKeywords];
        setFormData(prev => ({ ...prev, keywords: updatedKeywords }));

        // Auto-save no banco de dados
        if (product?.id) {
          const { error: saveError } = await supabase
            .from('products_repository')
            .update({
              keywords: updatedKeywords,
              ai_generated_keywords: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (saveError) {
            console.error('❌ Erro ao salvar keywords automaticamente:', saveError);
            toast({
              title: "⚠️ Keywords geradas mas não salvas",
              description: "Keywords geradas com sucesso, mas não foi possível salvar automaticamente. Clique em Atualizar para salvar manualmente.",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "✅ Keywords Geradas e Salvas!",
            description: `${uniqueNewKeywords.length} novas keywords foram salvas automaticamente`
          });
        } else {
          toast({
            title: "Sucesso",
            description: `${uniqueNewKeywords.length} novas keywords geradas! Serão salvas quando você criar o produto`
          });
        }
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (error) {
      console.error('Error generating keywords:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar keywords com IA. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setGeneratingKeywords(false);
    }
  };

  const handleSave = async () => {
    // ✅ FORÇAR BLUR de todos os editores FAQ antes de salvar
    faqEditorRef.current?.blurAllEditors();
    
    // Aguardar microtask para garantir sincronização
    await new Promise(resolve => setTimeout(resolve, 0));
    
    console.log('[DEBUG] Iniciando salvamento do produto...');
    console.log('[DEBUG] Dados do formulário:', formData);
    console.log('[DEBUG] botTriggerWords state:', botTriggerWords);
    
    // 🔍 DEBUG: Log detalhado dos FAQs antes de salvar
    console.log('🔍 [FAQ DEBUG] FAQs no momento do salvamento:', {
      faq: formData.faq,
      length: formData.faq?.length || 0,
      items: formData.faq?.map((f, i) => ({
        index: i,
        question: f.question?.substring(0, 50) || '(vazio)',
        answer: f.answer?.substring(0, 50) || '(vazio)',
        questionLength: f.question?.length || 0,
        answerLength: f.answer?.length || 0
      }))
    });
    
    // ⚠️ VALIDAÇÃO: Verificar FAQs incompletos
    const incompleteFaqs = formData.faq?.filter(item => 
      !item.question?.trim() || !item.answer?.trim()
    );

    if (incompleteFaqs && incompleteFaqs.length > 0) {
      toast({
        title: "⚠️ FAQs Incompletos",
        description: `${incompleteFaqs.length} FAQ(s) sem pergunta ou resposta serão removidos ao salvar.`,
      });
    }
    
    // ✨ FASE 3: Validação de variações para Google Merchant
    if (variations.length > 0) {
      const invalidVariations = variations.filter(v => 
        !v.name || 
        (v.price === undefined || v.price === null) || 
        (v.stock === undefined || v.stock === null)
      );
      
      if (invalidVariations.length > 0) {
        toast({
          title: "⚠️ Variações Incompletas",
          description: `${invalidVariations.length} variação(ões) sem nome, preço ou estoque. Complete todos os campos para exportar no Google Shopping.`,
          variant: "destructive"
        });
        // NÃO BLOQUEIA O SALVAMENTO, apenas avisa
      }
    }
    
    // Capturar texto pendente do TagInput e consolidar palavras gatilho
    const pendingBotWord = botTagRef.current?.getPendingValue()?.trim();
    console.log('[DEBUG] Palavra pendente no input:', pendingBotWord);
    
    const consolidatedBotWords = [...botTriggerWords];
    if (pendingBotWord && !consolidatedBotWords.includes(pendingBotWord)) {
      consolidatedBotWords.push(pendingBotWord);
    }
    
    // Limitar e validar palavras gatilho (segurança)
    const finalBotWords = consolidatedBotWords
      .filter(word => word && word.trim().length > 0)
      .map(word => word.trim().substring(0, 50)) // Max 50 chars por palavra
      .slice(0, 50); // Max 50 palavras
    
    console.log('[DEBUG] Palavras gatilho finais:', finalBotWords);
    
    if (!formData.name?.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      console.log('🔍 [SEO DEBUG] Valores ANTES de salvar:', {
        seo_title_override: formData.seo_title_override,
        seo_description_override: formData.seo_description_override,
        slug: formData.slug,
        product_url: formData.product_url
      });
      
      console.log('🔍 [FAQ DEBUG] FAQ antes de salvar:', formData.faq);
      console.log('🔍 [FAQ DEBUG] FAQ length:', formData.faq?.length || 0);
      console.log('🔍 [FAQ DEBUG] FAQ é array?', Array.isArray(formData.faq));

      const dataToSave = {
        name: formData.name!,
        description: formData.description,
        sales_pitch: formData.sales_pitch,
        price: formData.price,
        promo_price: promoPrice,
        currency: formData.currency || 'BRL',
        category: formData.category,
        subcategory: formData.subcategory,
        image_url: formData.image_url,
        images_gallery: imagesGallery.length > 0 ? imagesGallery : [],
        product_url: formData.product_url,
        source_type: 'manual', // Garantir que source_type seja definido
        target_audience: targetAudience,
        instagram_videos: instagramVideos as any,
        youtube_videos: youtubeVideos as any,
        testimonial_videos: testimonialVideos as any,
        technical_videos: technicalVideos as any,
        tiktok_videos: tiktokVideos as any,
        tutorial_resources: (tutorials.length > 0 ? { tutorials } : { tutorials: [] }) as any,
        video_captions: videoCaptions, // ✅ FASE 1: Salvar video_captions editadas
        use_in_ai_generation: formData.use_in_ai_generation,
        approved: formData.approved,
        keywords: formData.keywords || [],
        market_keywords: marketKeywords,
        search_intent_keywords: searchIntentKeywords,
        benefits: benefits,
        features: features,
        bot_trigger_words: finalBotWords,
        // Google Merchant Center fields
        gtin: formData.gtin,
        ean: formData.ean,
        mpn: formData.mpn,
        brand: formData.brand,
        color: formData.color,
        size: formData.size,
        material: formData.material,
        google_product_category: formData.google_product_category,
        condition: formData.condition || 'new',
        availability: formData.availability || 'in stock',
        // SEO avançado - garantir que campos sejam salvos (mesmo vazios)
        seo_title_override: formData.seo_title_override || '',
        seo_description_override: formData.seo_description_override || '',
        slug: formData.slug || '',
        // Estoque & logística
        stock_quantity: formData.stock_quantity,
        stock_managed: formData.stock_managed ?? false,
        min_order_quantity: formData.min_order_quantity,
        max_order_quantity: formData.max_order_quantity,
        multiple_order_quantity: formData.multiple_order_quantity,
        unit_measure: formData.unit_measure,
        shipping_time: formData.shipping_time,
        free_shipping: formData.free_shipping ?? false,
        shipping_type: formData.shipping_type,
        // Status flags
        active: formData.active ?? true,
        featured: formData.featured ?? false,
        launch: formData.launch ?? false,
        promotion: formData.promotion ?? false,
        showcase: formData.showcase ?? false,
        // Fiscais
        ncm: formData.ncm,
        fiscal_class: formData.fiscal_class,
        tax_situation: formData.tax_situation,
        fiscal_origin: formData.fiscal_origin,
        // Physical specifications
        variations: variations.length > 0 ? variations : [],
        package_size: packageSize || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        width: width ? parseFloat(width) : null,
        depth: depth ? parseFloat(depth) : null,
        store_category: storeCategory || null,
        // Landing Page Section controls
        show_in_resources: formData.show_in_resources,
        selected: formData.selected,
        // Resource CTAs
        resource_cta1: formData.resource_cta1,
        resource_cta2: formData.resource_cta2,
        resource_cta3: formData.resource_cta3,
        // Offer Discount CTA
        offer_discount_cta: formData.offer_discount_cta,
        // FAQ - com validação e log detalhado
        faq: Array.isArray(formData.faq) ? formData.faq.filter(item => 
          item.question?.trim() && item.answer?.trim()
        ) : [],
        // Technical Specifications
        technical_specifications: formData.technical_specifications || [],
        // Resource Descriptions
        resource_descriptions: formData.resource_descriptions,
        updated_at: new Date().toISOString()
      };

      console.log('[DEBUG] Dados que serão salvos:', dataToSave);
      console.log('[DEBUG] bot_trigger_words especificamente:', dataToSave.bot_trigger_words);
      console.log('🔍 [FAQ DEBUG] FAQ no dataToSave:', dataToSave.faq);
      console.log('🔍 [FAQ DEBUG] FAQ filtrado length:', dataToSave.faq?.length || 0);

      let result;
      if (isEditing) {
        result = await supabase
          .from('products_repository')
          .update(dataToSave)
          .eq('id', product.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('products_repository')
          .insert(dataToSave)
          .select()
          .single();
      }

      console.log('[DEBUG] Resultado da operação no Supabase:', result);
      
      if (result.error) {
        console.error('[DEBUG] Erro no Supabase:', result.error);
        throw result.error;
      }

      console.log('[DEBUG] Produto salvo com sucesso:', result.data);
      console.log('✅ [SEO DEBUG] Produto salvo! Campos SEO:', {
        seo_title_override: result.data.seo_title_override,
        seo_description_override: result.data.seo_description_override,
        slug: result.data.slug
      });
      console.log('✅ [FAQ DEBUG] Produto salvo! FAQ retornado:', result.data.faq);
      console.log('✅ [FAQ DEBUG] FAQ retornado length:', result.data.faq?.length || 0);
      
      const seoFieldsFilled = !!(result.data.seo_title_override || result.data.seo_description_override || result.data.slug);
      
      toast({
        title: "Sucesso",
        description: `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!${seoFieldsFilled ? ' (incluindo campos SEO)' : ''}`,
      });

      onSave(result.data);
      onClose();
    } catch (error) {
      console.error('[DEBUG] Error saving product:', error);
      
      // Verificar se é um erro de permissão RLS
      if (error.message?.includes('new row violates row-level security') || 
          error.message?.includes('permission denied') ||
          error.message?.includes('insufficient privilege') ||
          error.code === 'PGRST301' || 
          error.code === '42501') {
        toast({
          title: "Erro de Permissão",
          description: `Você precisa estar logado como administrador para ${isEditing ? 'atualizar' : 'criar'} produtos. Faça login em /auth com privilégios de admin.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: `Erro ao ${isEditing ? 'atualizar' : 'criar'} produto: ${error.message}`,
          variant: "destructive"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFAQs = async () => {
    // Validação de campos obrigatórios
    if (!formData.name || !formData.description) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha o nome e descrição do produto antes de gerar FAQs.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingFAQs(true);
    try {
      console.log('[ProductEditModal] Gerando FAQs para:', formData.name);
      
    const { data, error } = await supabase.functions.invoke('generate-product-faqs', {
      body: { 
        product: {
          name: formData.name,
          description: formData.description,
          sales_pitch: formData.sales_pitch,
          keywords: formData.keywords,
          benefits: formData.benefits,
          features: formData.features,
          product_url: formData.product_url || formData.slug || null,
        }
      }
    });

      if (error) {
        console.error('[ProductEditModal] Erro ao gerar FAQs:', error);
        throw error;
      }

      console.log('[ProductEditModal] FAQs gerados:', data.faqs.length);

      // Adicionar FAQs gerados ao final dos existentes
      const newFaqs = [...(formData.faq || []), ...data.faqs];
      setFormData(prev => ({ ...prev, faq: newFaqs }));

      toast({
        title: "✅ FAQs Gerados com Sucesso!",
        description: `${data.faqs.length} FAQs foram adicionados ao produto. Total: ${newFaqs.length} FAQs`,
      });

    } catch (error) {
      console.error('[ProductEditModal] Erro ao gerar FAQs:', error);
      toast({
        title: "❌ Erro ao gerar FAQs",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingFAQs(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !onDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('products_repository')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      onDelete(product.id);
      onClose();
      
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!"
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Adicionar Produto'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Seção de importação da Loja Integrada */}
          {(!isEditing || formData.product_url) && (
            <ProductLojaIntegradaImporter
              productUrl={formData.product_url}
              mode="callback"
              overwriteData={overwriteData}
              currentFormData={{
                ...formData,
                promo_price: promoPrice,
                images_gallery: imagesGallery,
                variations,
                weight: weight ? parseFloat(weight) : undefined,
                height: height ? parseFloat(height) : undefined,
                width: width ? parseFloat(width) : undefined,
                depth: depth ? parseFloat(depth) : undefined,
                package_size: packageSize,
                store_category: storeCategory
              }}
              onImportSuccess={(importedData) => {
                try {
                  if (!importedData || typeof importedData !== 'object') {
                    throw new Error('Dados importados inválidos');
                  }
                  if (!importedData.name || typeof importedData.name !== 'string') {
                    throw new Error('Nome do produto é obrigatório');
                  }

                  console.log('📦 Dados importados:', importedData);

                  // Mesclar diretamente no formData
                  setFormData(prev => ({
                    ...prev,
                    ...importedData,
                    // Garantir defaults se vierem null
                    condition: importedData.condition || 'new',
                    availability: importedData.availability || 'in stock',
                    currency: importedData.currency || 'BRL',
                  }));

                  // Estados controlados
                  if (importedData.promo_price !== undefined) setPromoPrice(importedData.promo_price);
                  if (importedData.images_gallery) setImagesGallery(importedData.images_gallery);
                  if (importedData.variations) setVariations(importedData.variations);
                  if (importedData.weight) setWeight(importedData.weight.toString());
                  if (importedData.height) setHeight(importedData.height.toString());
                  if (importedData.width) setWidth(importedData.width.toString());
                  if (importedData.depth) setDepth(importedData.depth.toString());
                  if (importedData.package_size) setPackageSize(importedData.package_size);
                  if (importedData.store_category) setStoreCategory(importedData.store_category);

                  toast({
                    title: "Campos preenchidos",
                    description: "Os dados foram importados. Revise e edite conforme necessário antes de salvar.",
                  });
                } catch (error) {
                  console.error('❌ Erro ao processar dados importados:', error);
                  toast({
                    title: "Erro ao processar dados",
                    description: error instanceof Error ? error.message : "Erro desconhecido ao processar dados importados",
                    variant: "destructive"
                  });
                }
              }}
              onImportError={(error) => {
                console.error('Erro na importação:', error);
                toast({
                  title: "Erro na importação",
                  description: error,
                  variant: "destructive"
                });
              }}
            />
          )}

          {/* Overwrite Toggle */}
          {(!isEditing || formData.product_url) && (
            <div className="flex items-center space-x-2 pt-1">
              <Switch
                id="overwrite-data"
                checked={overwriteData}
                onCheckedChange={setOverwriteData}
              />
              <Label htmlFor="overwrite-data" className="text-sm font-normal cursor-pointer">
                Sobrescrever dados existentes ao importar
              </Label>
            </div>
          )}
          {(!isEditing || formData.product_url) && overwriteData !== undefined && (
            <p className="text-xs text-muted-foreground">
              {overwriteData 
                ? "⚠️ Todos os campos serão substituídos pelos dados importados" 
                : "✓ Apenas campos vazios serão preenchidos"}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between"
                  >
                    {formData.category || "Selecione ou digite nova categoria..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-50 bg-popover border">
                  <Command>
                    <CommandInput 
                      placeholder="Digite para buscar ou criar categoria..." 
                      value={formData.category || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    />
                    <CommandEmpty>
                      <div className="p-2 text-sm">
                        Pressione Enter para criar "{formData.category}"
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {unifiedCategories.map((category) => (
                        <CommandItem
                          key={category}
                          value={category}
                          onSelect={(currentValue) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              category: currentValue,
                              subcategory: '' // Reset subcategoria quando mudar categoria
                            }));
                            setCategoryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.category === category ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {category}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do produto"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales_pitch">Discurso Comercial / Pitch de Vendas</Label>
            <Textarea
              id="sales_pitch"
              value={formData.sales_pitch || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, sales_pitch: e.target.value }))}
              placeholder="Descreva os pontos de venda únicos, benefícios principais, abordagem comercial, diferenciais competitivos..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Este texto será usado pela IA para gerar conteúdo mais comercial e persuasivo em blogs, SEO e anúncios.
            </p>
          </div>

          {/* SEO & URL Amigável Section */}
          <Card className="p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">SEO & URL Amigável</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateSEOWithAI}
                disabled={generatingSEO || !formData.name}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {generatingSEO ? 'Gerando...' : 'Gerar por IA'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_title_override" className="flex items-center gap-2">
                Título SEO
                {formData.seo_title_override && (
                  <span className="text-xs text-green-600 dark:text-green-400">● Preenchido</span>
                )}
              </Label>
              <Input
                id="seo_title_override"
                value={formData.seo_title_override || ""}
                onChange={(e) => {
                  console.log('📝 [SEO DEBUG] Título SEO alterado:', e.target.value);
                  setFormData(prev => ({ ...prev, seo_title_override: e.target.value }));
                }}
                placeholder="Título otimizado para SEO (até 60 caracteres)"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Máximo 60 caracteres • Atual: {(formData.seo_title_override || "").length}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_description_override" className="flex items-center gap-2">
                Descrição SEO
                {formData.seo_description_override && (
                  <span className="text-xs text-green-600 dark:text-green-400">● Preenchido</span>
                )}
              </Label>
              <Textarea
                id="seo_description_override"
                value={formData.seo_description_override || ""}
                onChange={(e) => {
                  console.log('📝 [SEO DEBUG] Meta Description alterada:', e.target.value);
                  setFormData(prev => ({ ...prev, seo_description_override: e.target.value }));
                }}
                placeholder="Meta descrição (até 160 caracteres)"
                maxLength={160}
                rows={2}
              />
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs",
                  (formData.seo_description_override?.length || 0) >= 120 && (formData.seo_description_override?.length || 0) <= 160
                    ? "text-success"
                    : "text-muted-foreground"
                )}>
                  {formData.seo_description_override?.length || 0}/160
                </span>
                {(formData.seo_description_override?.length || 0) >= 120 && (formData.seo_description_override?.length || 0) <= 160 && (
                  <Badge variant="outline" className="text-success">Tamanho ideal</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="flex items-center gap-2">
                URL do Produto (Loja Integrada)
                {formData.slug && (
                  <span className="text-xs text-green-600 dark:text-green-400">● Preenchido</span>
                )}
              </Label>
              <Input
                id="slug"
                value={formData.slug || ""}
                onChange={(e) => {
                  console.log('📝 [SEO DEBUG] Slug/URL alterado:', e.target.value);
                  setFormData(prev => ({ 
                    ...prev, 
                    slug: e.target.value
                  }));
                }}
                placeholder="https://minhaloja.com.br/nome-do-produto"
              />
              <p className="text-xs text-muted-foreground">
                URL completa da Loja Integrada (usada para canonical e links)
              </p>
            </div>
          </Card>

          {/* Linha 1: Preço e Moeda (grid-cols-2) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço de venda *</Label>
              <Input
                id="price"
                type="text"
                value={formData.price || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.,]/g, '');
                  setFormData(prev => ({ ...prev, price: value ? parseFloat(value.replace(',', '.')) : 0 }));
                }}
                placeholder="1859.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Preço Promocional (sem badge) */}
          <div className="space-y-2">
            <Label htmlFor="promo_price">Preço Promocional (Opcional)</Label>
            <Input
              id="promo_price"
              type="text"
              step="0.01"
              value={promoPrice || ''}
              onChange={(e) => setPromoPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00 - Deixe vazio se não houver promoção"
            />
            <p className="text-xs text-muted-foreground">
              💡 Quando preenchido, gera automaticamente mensagens "De/Por" no WhatsApp
            </p>
          </div>

          {/* Linha 3: Preview da Promoção (condicional) */}
          {promoPrice && promoPrice > 0 && formData.price && promoPrice < formData.price && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs">
                  Promoção Ativa ({Math.round(((formData.price - promoPrice) / formData.price) * 100)}% OFF)
                </Badge>
              </div>
              <div className="text-sm flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">De:</span>
                  <span className="line-through font-medium">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: formData.currency || 'BRL' 
                    }).format(formData.price)}
                  </span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">Por:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: formData.currency || 'BRL' 
                    }).format(promoPrice)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Popover open={subcategoryOpen} onOpenChange={setSubcategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={subcategoryOpen}
                    className="w-full justify-between"
                    disabled={!formData.category}
                  >
                    {formData.subcategory || "Selecione ou digite nova subcategoria..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-50 bg-popover border">
                  <Command>
                    <CommandInput 
                      placeholder="Digite para buscar ou criar subcategoria..." 
                      value={formData.subcategory || ''}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value }))}
                    />
                    <CommandEmpty>
                      <div className="p-2 text-sm">
                        Pressione Enter para criar "{formData.subcategory}"
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {formData.category && getUnifiedSubcategoriesForCategory(formData.category).map((subcategory) => (
                        <CommandItem
                          key={subcategory}
                          value={subcategory}
                          onSelect={(currentValue) => {
                            setFormData(prev => ({ ...prev, subcategory: currentValue }));
                            setSubcategoryOpen(false);
                            
                            // Auto-preencher com configurações da categoria se disponível
                            if (formData.category && currentValue) {
                              loadCategoryDefaults(formData.category, currentValue);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.subcategory === subcategory ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {subcategory}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {!formData.category && (
                <p className="text-sm text-muted-foreground">Selecione uma categoria primeiro</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Imagem Principal do Produto</Label>
              <ImageUploader
                value={{
                  mode: formData.image_supabase_path ? 'supabase' : 'url',
                  src: formData.image_url || '',
                  supabase_path: formData.image_supabase_path,
                  alt: formData.image_alt || '',
                  scale: 1.0
                }}
                onChange={(imageData) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    image_url: imageData.src,
                    image_supabase_path: imageData.supabase_path,
                    image_alt: imageData.alt
                  }));
                }}
                placeholder="URL da imagem do produto"
                proportionInfo="Recomendado: 800x800px (quadrado) ou 1200x1200px para alta qualidade"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 <strong>Dica SEO:</strong> O nome do arquivo será usado automaticamente como alt text. 
                Use nomes descritivos como "Scanner_Intraoral_3D_Alta_Precisao.png"
              </p>
            </div>

            {/* Galeria de Imagens */}
            <div>
              <GalleryImageUploader
                images={imagesGallery}
                onChange={(newImages) => setImagesGallery(newImages)}
                maxImages={10}
              />
            </div>
          </div>

          {/* REMOVIDO: Duplicação do importer */}

          {/* Video Collections */}
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Coleções de Vídeos</h3>
            
            {/* Instagram Videos */}
            <VideoSection
              title="Vídeos Instagram"
              videos={instagramVideos}
              onAdd={(url, description) => addVideo('instagram', url, description)}
              onRemove={(index) => removeVideo('instagram', index)}
              onEdit={(index, url, description) => editVideo('instagram', index, url, description)}
              maxVideos={5}
            />

            {/* YouTube Videos */}
            <div className="space-y-4">
              <VideoSection
                title="Vídeos YouTube"
                videos={youtubeVideos}
                onAdd={(url, description) => {
                  console.log('Adding YouTube video:', { url, description });
                  addVideo('youtube', url, description);
                }}
                onRemove={(index) => removeVideo('youtube', index)}
                onEdit={(index, url, description) => editVideo('youtube', index, url, description)}
                maxVideos={5}
              />
              
              {isEditing && (
                <CaptionExtractor
                  productId={product!.id}
                  videoType="youtube_videos"
                  videos={youtubeVideos}
                  existingCaptions={videoCaptions.youtube_videos || []}
                  onCaptionsExtracted={(captions) => handleCaptionsExtracted('youtube_videos', captions)}
                  defaultOpen={youtubeVideos.length > 0}
                />
              )}
            </div>

            {/* Testimonial Videos */}
            <div className="space-y-4">
              <VideoSection
                title="Vídeos Depoimentos"
                videos={testimonialVideos}
                onAdd={(url, description) => addVideo('testimonial', url, description)}
                onRemove={(index) => removeVideo('testimonial', index)}
                onEdit={(index, url, description) => editVideo('testimonial', index, url, description)}
                maxVideos={5}
              />
              
              {isEditing && (
                <CaptionExtractor
                  productId={product!.id}
                  videoType="testimonial_videos"
                  videos={testimonialVideos}
                  existingCaptions={videoCaptions.testimonial_videos || []}
                  onCaptionsExtracted={(captions) => handleCaptionsExtracted('testimonial_videos', captions)}
                  defaultOpen={testimonialVideos.length > 0}
                />
              )}
            </div>

            {/* Technical Videos */}
            <div className="space-y-4">
              <VideoSection
                title="Explicações Técnicas"
                videos={technicalVideos}
                onAdd={(url, description) => addVideo('technical', url, description)}
                onRemove={(index) => removeVideo('technical', index)}
                onEdit={(index, url, description) => editVideo('technical', index, url, description)}
                maxVideos={5}
              />
              
              {isEditing && (
                <CaptionExtractor
                  productId={product!.id}
                  videoType="technical_videos"
                  videos={technicalVideos}
                  existingCaptions={videoCaptions.technical_videos || []}
                  onCaptionsExtracted={(captions) => handleCaptionsExtracted('technical_videos', captions)}
                  defaultOpen={technicalVideos.length > 0}
                />
              )}
            </div>

            {/* TikTok Videos */}
            <VideoSection
              title="Vídeos TikTok"
              videos={tiktokVideos}
              onAdd={(url, description) => addVideo('tiktok', url, description)}
              onRemove={(index) => removeVideo('tiktok', index)}
              onEdit={(index, url, description) => editVideo('tiktok', index, url, description)}
              maxVideos={5}
            />

            {/* Tutorial Resources */}
            <Card className="p-4 border-2 border-purple-200 bg-purple-50/30">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-900">
                    🎓 Tutoriais do Produto
                  </h3>
                </div>

                {/* Lista de tutoriais existentes */}
                {tutorials.length > 0 && (
                  <div className="space-y-2">
                    {tutorials.map((tutorial) => (
                      <Card key={tutorial.id} className="p-3 bg-white">
                        {editingTutorialId === tutorial.id ? (
                          // Modo de edição
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Nome do Curso/Tutorial</Label>
                              <Input
                                value={editTutorialName}
                                onChange={(e) => setEditTutorialName(e.target.value)}
                                placeholder="Ex: Como configurar o equipamento"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>URL do Curso</Label>
                              <Input
                                value={editTutorialUrl}
                                onChange={(e) => setEditTutorialUrl(e.target.value)}
                                placeholder="https://meuplataforma.com/curso"
                                type="url"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  editTutorial(tutorial.id, editTutorialName, editTutorialUrl);
                                  setEditingTutorialId(null);
                                }}
                                disabled={!editTutorialName.trim() || !editTutorialUrl.trim()}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingTutorialId(null);
                                  setEditTutorialName('');
                                  setEditTutorialUrl('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Modo de visualização
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {tutorial.course_name}
                              </p>
                              <a 
                                href={tutorial.course_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate block"
                              >
                                {tutorial.course_url}
                              </a>
                              <p className="text-xs text-muted-foreground mt-1">
                                Adicionado em {new Date(tutorial.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTutorialId(tutorial.id);
                                  setEditTutorialName(tutorial.course_name);
                                  setEditTutorialUrl(tutorial.course_url);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTutorial(tutorial.id)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}

                {/* Form para adicionar novo tutorial */}
                <Card className="p-4 bg-white/50 border-dashed">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nome do Curso/Tutorial</Label>
                      <Input
                        placeholder="Ex: Como configurar o equipamento"
                        id="new-tutorial-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL do Curso</Label>
                      <Input
                        placeholder="https://meuplataforma.com/curso"
                        type="url"
                        id="new-tutorial-url"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const nameInput = document.getElementById('new-tutorial-name') as HTMLInputElement;
                        const urlInput = document.getElementById('new-tutorial-url') as HTMLInputElement;
                        if (nameInput && urlInput) {
                          addTutorial(nameInput.value, urlInput.value);
                          nameInput.value = '';
                          urlInput.value = '';
                        }
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Tutorial
                    </Button>
                  </div>
                </Card>
              </div>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target_audience">Público-Alvo</Label>
              {!product && companyTargetAudience.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                        <Info className="h-3 w-3" />
                        Auto-preenchido
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-sm">
                        Preenchido automaticamente com o público-alvo configurado no Perfil da Empresa
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <TagInput
              value={targetAudience}
              onChange={setTargetAudience}
              placeholder="Digite um público-alvo e pressione Enter"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Keywords</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateKeywordsWithAI}
                disabled={generatingKeywords}
                className="gap-2"
              >
                {generatingKeywords ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Gerar com IA
              </Button>
            </div>
            <TagInput
              value={formData.keywords || []}
              onChange={(keywords) => setFormData(prev => ({ ...prev, keywords }))}
              placeholder="Adicione keywords"
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords de Mercado</Label>
            <p className="text-xs text-muted-foreground">
              Termos relacionados ao seu nicho e concorrência para melhorar relevância SEO
            </p>
            <TagInput
              value={marketKeywords}
              onChange={setMarketKeywords}
              placeholder="Ex: odontologia estética, clareamento dental, implantes"
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords de Intenção de Busca</Label>
            <p className="text-xs text-muted-foreground">
              Termos que seus clientes pesquisam quando têm intenção de compra
            </p>
            <TagInput
              value={searchIntentKeywords}
              onChange={setSearchIntentKeywords}
              placeholder="Ex: preço de implante, melhor dentista, tratamento ortodôntico"
            />
          </div>

          {/* AI Smart Merge System */}
          {isEditing && product && (
            <ProductAISmartMerge
              productId={product.id || ''}
              currentData={{
                keywords: formData.keywords || [],
                benefits: formData.benefits || [],
                features: formData.features || [],
                ai_generated_keywords: (product as any).ai_generated_keywords || false,
                ai_generated_benefits: (product as any).ai_generated_benefits || false
              }}
              onDataUpdated={(updatedData) => {
                setFormData(prev => ({
                  ...prev,
                  keywords: updatedData.keywords || [],
                  benefits: updatedData.benefits || [],
                  features: updatedData.features || [],
                }));
                setBenefits(updatedData.benefits || []);
                setFeatures(updatedData.features || []);
              }}
            />
          )}

          <div className="space-y-2">
            <Label>Benefícios</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder="Adicionar benefício"
                onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
              />
              <Button onClick={addBenefit} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {benefits.map((benefit, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {benefit}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeBenefit(index)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recursos</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Adicionar recurso"
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button onClick={addFeature} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFeature(index)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot_trigger_words">Palavras Gatilho BOT</Label>
            <TagInput
              ref={botTagRef}
              value={botTriggerWords}
              onChange={setBotTriggerWords}
              placeholder="Digite palavras gatilho (ex: QUERO, INTERESSE) e pressione Enter"
            />
            <p className="text-sm text-muted-foreground">
              Palavras que serão inseridas automaticamente nas copies do Instagram e WhatsApp para incentivar interação. 
              Ex: "Comente 'QUERO' e receba mais informações"
            </p>
          </div>

          {/* FAQ Section */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  FAQ do Produto
                </h3>
                <p className="text-sm text-muted-foreground">
                  Perguntas frequentes específicas deste produto que aparecerão com schema estruturado nos buscadores.
                </p>
              </div>
              
              <Button
                onClick={handleGenerateFAQs}
                disabled={generatingFAQs || !formData.name || !formData.description}
                variant="outline"
                className="gap-2"
                type="button"
              >
                {generatingFAQs ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Gerando FAQs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar 10 FAQs com IA
                  </>
                )}
              </Button>
            </div>
            
            <FAQEditor
              ref={faqEditorRef}
              faqs={formData.faq || []}
              onChange={(faqs) => setFormData(prev => ({ ...prev, faq: faqs }))}
              placeholder={{
                question: "Ex: Como funciona este produto?",
                answer: "Digite a resposta com formatação rica..."
              }}
            />
          </div>

          {/* E-commerce HTML Generator */}
          {formData.id && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Descrição E-commerce</h3>
                <Badge variant="secondary">IA</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Gere uma descrição HTML completa para e-commerce com benefícios IA, especificações técnicas, FAQ, vídeos e CTAs.
              </p>
              <Button 
                onClick={() => setShowEcommerceModal(true)}
                variant="outline"
                className="w-full"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Abrir Gerador E-commerce
              </Button>
            </div>
          )}
          
          {/* Modal E-commerce */}
          {showEcommerceModal && (
            <ProductEcommerceGenerator 
              productId={formData.id}
              isOpen={true}
              onClose={() => setShowEcommerceModal(false)}
            />
          )}

          {/* Physical Specifications */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Especificações Físicas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex: 2.5"
                />
              </div>
              
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="package_size" className="flex items-center gap-2">
                    Tamanho da Embalagem
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                  id="package_size"
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value)}
                  placeholder="Ex: Caixa Média - Input manual"
                />
              </div>
            </TooltipProvider>
            </div>

            {/* Estoque & Logística Section */}
            <Card className="p-4 space-y-3 bg-muted/20 mt-4">
              <h3 className="text-sm font-medium">Estoque & Logística</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                    placeholder="Ex: 100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_order_quantity">Mínimo por Pedido</Label>
                  <Input
                    id="min_order_quantity"
                    type="number"
                    value={formData.min_order_quantity || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_quantity: Number(e.target.value) }))}
                    placeholder="Ex: 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_order_quantity">Máximo por Pedido</Label>
                  <Input
                    id="max_order_quantity"
                    type="number"
                    value={formData.max_order_quantity || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_order_quantity: Number(e.target.value) }))}
                    placeholder="Ex: 500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_time">Prazo de Entrega</Label>
                  <Input
                    id="shipping_time"
                    value={formData.shipping_time || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_time: e.target.value }))}
                    placeholder="Ex: 5 dias úteis"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="free_shipping"
                    checked={formData.free_shipping || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, free_shipping: checked }))}
                  />
                  <Label htmlFor="free_shipping">Frete Grátis</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="stock_managed"
                    checked={formData.stock_managed || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, stock_managed: checked }))}
                  />
                  <Label htmlFor="stock_managed">Controlar Estoque</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_measure">Unidade de Medida</Label>
                <Input
                  id="unit_measure"
                  value={formData.unit_measure || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_measure: e.target.value }))}
                  placeholder="Ex: unidade, caixa, kg, metro, m²..."
                />
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ex: 30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="width">Largura (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Ex: 20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="depth">Profundidade (cm)</Label>
                <Input
                  id="depth"
                  type="number"
                  step="0.1"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  placeholder="Ex: 15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store_category">Categoria da Loja</Label>
              <Input
                id="store_category"
                value={storeCategory}
                onChange={(e) => setStoreCategory(e.target.value)}
                placeholder="Categoria original da Loja Integrada"
              />
            </div>

            {/* Product Variations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Variações do Produto</Label>
                  {variations.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Total: {variations.length} variações
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setVariations([...variations, { 
                      name: 'Variação Exemplo', 
                      price: 99.90, 
                      stock: 10, 
                      color: 'Azul', 
                      size: 'M' 
                    }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Exemplo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariations([...variations, { name: '', price: undefined, stock: undefined, color: '', size: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Variação
                  </Button>
                </div>
              </div>
              
              {variations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Nenhuma variação cadastrada</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Adicione variações do produto para gerenciar diferentes cores, tamanhos, 
                          preços e estoques em cards individuais organizados.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => setVariations([{ 
                            name: 'Variação Exemplo', 
                            price: 99.90, 
                            stock: 10, 
                            color: 'Azul', 
                            size: 'M' 
                          }])}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ver Exemplo de Card
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setVariations([{ name: '', price: undefined, stock: undefined, color: '', size: '' }])}
                        >
                          Criar Variação Vazia
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variations.map((variation, index) => (
                    <VariationCard
                      key={index}
                      variation={variation}
                      index={index}
                      onUpdate={(idx, field, value) => {
                        const newVariations = [...variations];
                        newVariations[idx] = { ...newVariations[idx], [field]: value };
                        setVariations(newVariations);
                      }}
                      onRemove={(idx) => {
                        setVariations(variations.filter((_, i) => i !== idx));
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Google Merchant Center Data */}
          <div className="space-y-4 border-t pt-6 bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-1 5v5h5v2h-5v5h-2v-5H4v-2h5V7h2z"/>
                  </svg>
                  Dados Google Merchant Center
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <Badge variant="outline" className="mr-2">Importado da API</Badge> MPN, Marca, Condição, Disponibilidade
                  <br />
                  <Badge variant="secondary" className="mr-2 mt-1">Input Manual</Badge> GTIN, EAN, Cor, Tamanho, Material, Categoria Google
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                SEO Otimizado
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* GTIN - Manual Input */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="gtin" className="flex items-center gap-2">
                    GTIN
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                    id="gtin"
                    type="text"
                    value={formData.gtin || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, gtin: e.target.value }))}
                    placeholder="7891234567890 - Input manual"
                    className="font-mono"
                  />
                </div>
              </TooltipProvider>

              {/* EAN - Manual Input */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="ean" className="flex items-center gap-2">
                    EAN
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                    id="ean"
                    type="text"
                    value={(formData as any).ean || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ean: e.target.value } as any))}
                    placeholder="5901234123457 - Input manual"
                    className="font-mono"
                  />
                </div>
              </TooltipProvider>

              {/* MPN - Auto from API */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="mpn" className="flex items-center gap-2">
                    MPN
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Check className="h-3 w-3 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo importado automaticamente da Loja Integrada</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">Auto</Badge>
                  </Label>
                  <Input
                    id="mpn"
                    type="text"
                    value={formData.mpn || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, mpn: e.target.value }))}
                    placeholder="PROD-12345"
                    className="font-mono"
                  />
                </div>
              </TooltipProvider>

              {/* Marca - Auto from API */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="brand" className="flex items-center gap-2">
                    Marca
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Check className="h-3 w-3 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo importado automaticamente da Loja Integrada</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">Auto</Badge>
                  </Label>
                  <Input
                    id="brand"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Ex: Apple, Samsung, Nike"
                  />
                </div>
              </TooltipProvider>

              {/* Cor - Manual Input */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="color" className="flex items-center gap-2">
                    Cor
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                    id="color"
                    value={formData.color || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="Ex: Azul, Vermelho - Input manual"
                  />
                </div>
              </TooltipProvider>

              {/* Tamanho - Manual Input */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="size" className="flex items-center gap-2">
                    Tamanho
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                    id="size"
                    value={formData.size || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                    placeholder="Ex: M, G, 42 - Input manual"
                  />
                </div>
              </TooltipProvider>

              {/* Material - Manual Input */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="material" className="flex items-center gap-2">
                    Material
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                    id="material"
                    value={formData.material || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    placeholder="Ex: Algodão, Plástico - Input manual"
                  />
                </div>
              </TooltipProvider>

              {/* Categoria Google - Manual Input */}
              <TooltipProvider>
                <div className="space-y-2">
                  <Label htmlFor="google_product_category" className="flex items-center gap-2">
                    Categoria Google
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Campo não disponível na API da Loja Integrada</p>
                        <p className="text-xs font-semibold">Requer input manual</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Manual</Badge>
                  </Label>
                  <Input
                    id="google_product_category"
                    value={formData.google_product_category || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, google_product_category: e.target.value }))}
                    placeholder="Ex: Eletrônicos - Input manual"
                  />
                </div>
              </TooltipProvider>

              {/* Condição */}
              <div className="space-y-2">
                <Label htmlFor="condition">Condição</Label>
                <Select
                  value={formData.condition || 'new'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Selecione a condição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="used">Usado</SelectItem>
                    <SelectItem value="refurbished">Recondicionado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Disponibilidade */}
              <div className="space-y-2">
                <Label htmlFor="availability">Disponibilidade</Label>
                <Select
                  value={formData.availability || 'in stock'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}
                >
                  <SelectTrigger id="availability">
                    <SelectValue placeholder="Selecione a disponibilidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in stock">Em Estoque</SelectItem>
                    <SelectItem value="out of stock">Fora de Estoque</SelectItem>
                    <SelectItem value="preorder">Pré-venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-900">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Dica:</strong> Estes dados são importados automaticamente da Loja Integrada quando você clica em "Importar Dados". 
                Produtos com GTIN, MPN e Marca têm melhor ranqueamento no Google Shopping e Google Merchant Center.
              </p>
            </div>
          </div>

          {/* Landing Page Sections Configuration */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Configurações de Seções da Landing Page</h3>
            
            {/* Section Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show_in_resources"
                  checked={formData.show_in_resources}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_resources: checked }))}
                />
                <Label htmlFor="show_in_resources">Mostrar na seção "Recursos e Downloads"</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="selected"
                  checked={formData.selected}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, selected: checked }))}
                />
                <Label htmlFor="selected">Mostrar na seção "Ofertas"</Label>
              </div>
            </div>

            {/* Resource CTAs Configuration */}
            {formData.show_in_resources && (
              <div className="space-y-4 bg-muted/20 p-4 rounded-lg">
                <h4 className="font-medium">Botões CTA para Recursos</h4>
                
                {/* CTA 1 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Switch
                      id="cta1_visible"
                      checked={formData.resource_cta1?.visible}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        resource_cta1: { ...prev.resource_cta1!, visible: checked }
                      }))}
                    />
                    <Label htmlFor="cta1_visible" className="font-medium">CTA 1</Label>
                  </div>
                  {formData.resource_cta1?.visible && (
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      <Input
                        placeholder="Texto do botão"
                        value={formData.resource_cta1?.label || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          resource_cta1: { ...prev.resource_cta1!, label: e.target.value }
                        }))}
                      />
                       <Input
                        placeholder="URL do link"
                        value={formData.resource_cta1?.url || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          resource_cta1: { ...prev.resource_cta1!, url: e.target.value }
                        }))}
                      />
                      <div className="col-span-2">
                        <Textarea
                          placeholder="Descrição do recurso (para SEO e Google Ads)"
                          value={formData.resource_descriptions?.cta1 || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            resource_descriptions: { ...prev.resource_descriptions!, cta1: e.target.value }
                          }))}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA 2 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Switch
                      id="cta2_visible"
                      checked={formData.resource_cta2?.visible}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        resource_cta2: { ...prev.resource_cta2!, visible: checked }
                      }))}
                    />
                    <Label htmlFor="cta2_visible" className="font-medium">CTA 2</Label>
                  </div>
                  {formData.resource_cta2?.visible && (
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      <Input
                        placeholder="Texto do botão"
                        value={formData.resource_cta2?.label || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          resource_cta2: { ...prev.resource_cta2!, label: e.target.value }
                        }))}
                      />
                       <Input
                        placeholder="URL do link"
                        value={formData.resource_cta2?.url || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          resource_cta2: { ...prev.resource_cta2!, url: e.target.value }
                        }))}
                      />
                      <div className="col-span-2">
                        <Textarea
                          placeholder="Descrição do recurso (para SEO e Google Ads)"
                          value={formData.resource_descriptions?.cta2 || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            resource_descriptions: { ...prev.resource_descriptions!, cta2: e.target.value }
                          }))}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA 3 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Switch
                      id="cta3_visible"
                      checked={formData.resource_cta3?.visible}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        resource_cta3: { ...prev.resource_cta3!, visible: checked }
                      }))}
                    />
                    <Label htmlFor="cta3_visible" className="font-medium">CTA 3</Label>
                  </div>
                  {formData.resource_cta3?.visible && (
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      <Input
                        placeholder="Texto do botão"
                        value={formData.resource_cta3?.label || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          resource_cta3: { ...prev.resource_cta3!, label: e.target.value }
                        }))}
                      />
                       <Input
                        placeholder="URL do link"
                        value={formData.resource_cta3?.url || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          resource_cta3: { ...prev.resource_cta3!, url: e.target.value }
                        }))}
                      />
                      <div className="col-span-2">
                        <Textarea
                          placeholder="Descrição do recurso (para SEO e Google Ads)"
                          value={formData.resource_descriptions?.cta3 || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            resource_descriptions: { ...prev.resource_descriptions!, cta3: e.target.value }
                          }))}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Offer Discount CTA Configuration */}
            {formData.selected && (
              <div className="space-y-4 bg-muted/20 p-4 rounded-lg">
                <h4 className="font-medium">CTA Desconto para Ofertas Especiais</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Switch
                      id="offer_discount_cta_visible"
                      checked={formData.offer_discount_cta?.visible}
                      onCheckedChange={(checked) => setFormData(prev => ({ 
                        ...prev, 
                        offer_discount_cta: { ...prev.offer_discount_cta!, visible: checked }
                      }))}
                    />
                    <Label htmlFor="offer_discount_cta_visible" className="font-medium">Ativar CTA Desconto</Label>
                  </div>
                  {formData.offer_discount_cta?.visible && (
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      <Input
                        placeholder="Texto do botão (ex: Comprar com Desconto)"
                        value={formData.offer_discount_cta?.label || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          offer_discount_cta: { ...prev.offer_discount_cta!, label: e.target.value }
                        }))}
                      />
                      <Input
                        placeholder="URL de atendimento específico"
                        value={formData.offer_discount_cta?.url || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          offer_discount_cta: { ...prev.offer_discount_cta!, url: e.target.value }
                        }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status & Flags Section */}
          <Card className="p-4 space-y-3 bg-muted/20">
            <h3 className="text-sm font-medium">Status & Flags de Controle</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active ?? true}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active" className="flex items-center gap-2">
                  Ativo
                  {formData.active && <Badge variant="outline" className="text-success">Ativo</Badge>}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured ?? false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                />
                <Label htmlFor="featured">Em Destaque</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="launch"
                  checked={formData.launch ?? false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, launch: checked }))}
                />
                <Label htmlFor="launch">Lançamento</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="promotion"
                  checked={formData.promotion ?? false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, promotion: checked }))}
                />
                <Label htmlFor="promotion">Promoção</Label>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="use_in_ai"
                checked={formData.use_in_ai_generation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_in_ai_generation: checked }))}
              />
              <Label htmlFor="use_in_ai">Usar na geração de IA</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="approved"
                checked={formData.approved}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, approved: checked }))}
              />
              <Label htmlFor="approved">Aprovado</Label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {isEditing && onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2"
                >
                  {deleting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Excluir
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}