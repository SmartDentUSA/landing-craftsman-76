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
import { Save, Trash2, Plus, X, Sparkles, Download, Check, ChevronsUpDown, FileText, Package, AlertCircle, Info } from "lucide-react";
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

interface Video {
  url: string;
  description: string;
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
  video_captions?: any;
  original_data?: any;
  images_gallery?: Array<{ url: string; alt: string; order: number; is_main: boolean }>;
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
    faq: []
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
  
  // Video states
  const [instagramVideos, setInstagramVideos] = useState<Video[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<Video[]>([]);
  const [testimonialVideos, setTestimonialVideos] = useState<Video[]>([]);
  const [technicalVideos, setTechnicalVideos] = useState<Video[]>([]);
  const [tiktokVideos, setTiktokVideos] = useState<Video[]>([]);
  
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
        faq: product.faq || []
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

  // Caption management function
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

        toast({
          title: "Sucesso",
          description: `${uniqueNewKeywords.length} novas keywords geradas com IA!`
        });
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
    console.log('[DEBUG] Iniciando salvamento do produto...');
    console.log('[DEBUG] Dados do formulário:', formData);
    console.log('[DEBUG] botTriggerWords state:', botTriggerWords);
    
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
        // FAQ
        faq: formData.faq,
        // Resource Descriptions
        resource_descriptions: formData.resource_descriptions,
        updated_at: new Date().toISOString()
      };

      console.log('[DEBUG] Dados que serão salvos:', dataToSave);
      console.log('[DEBUG] bot_trigger_words especificamente:', dataToSave.bot_trigger_words);

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
      
      toast({
        title: "Sucesso",
        description: `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso! Configurações salvas.`,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="promo_price">Preço promocional</Label>
              <Input
                id="promo_price"
                type="text"
                step="0.01"
                value={promoPrice || ''}
                onChange={(e) => setPromoPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
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

          <div className="space-y-2">
            <Label>Imagem do Produto</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={formData.image_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="URL da imagem do produto"
                className="flex-1"
              />
              {formData.image_url && (
                 <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                   <OptimizedImage 
                     src={formData.image_url} 
                     alt="Preview"
                     className="w-full h-full object-cover"
                     width={48}
                     height={48}
                     priority={false}
                   />
                 </div>
              )}
            </div>
            
            {/* ✨ Galeria de Imagens Importadas */}
            {imagesGallery.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Galeria Importada ({imagesGallery.length} imagens)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImagesGallery([])}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                  {imagesGallery.map((img, index) => (
                    <div 
                      key={index} 
                      className="relative rounded-md overflow-hidden bg-muted aspect-square group"
                    >
                      <OptimizedImage 
                        src={img.url} 
                        alt={img.alt || `Imagem ${index + 1}`}
                        className="w-full h-full object-cover"
                        width={80}
                        height={80}
                        priority={false}
                      />
                      {img.is_main && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1 py-0.5 rounded">
                          Principal
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute bottom-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const newGallery = imagesGallery.filter((_, i) => i !== index);
                          setImagesGallery(newGallery);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                maxVideos={5}
              />
              
              {isEditing && (
                <CaptionExtractor
                  productId={product!.id}
                  videoType="youtube_videos"
                  videos={youtubeVideos}
                  existingCaptions={videoCaptions.youtube_videos || []}
                  onCaptionsExtracted={(captions) => handleCaptionsExtracted('youtube_videos', captions)}
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
                maxVideos={5}
              />
              
              {isEditing && (
                <CaptionExtractor
                  productId={product!.id}
                  videoType="testimonial_videos"
                  videos={testimonialVideos}
                  existingCaptions={videoCaptions.testimonial_videos || []}
                  onCaptionsExtracted={(captions) => handleCaptionsExtracted('testimonial_videos', captions)}
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
                maxVideos={5}
              />
              
              {isEditing && (
                <CaptionExtractor
                  productId={product!.id}
                  videoType="technical_videos"
                  videos={technicalVideos}
                  existingCaptions={videoCaptions.technical_videos || []}
                  onCaptionsExtracted={(captions) => handleCaptionsExtracted('technical_videos', captions)}
                />
              )}
            </div>

            {/* TikTok Videos */}
            <VideoSection
              title="Vídeos TikTok"
              videos={tiktokVideos}
              onAdd={(url, description) => addVideo('tiktok', url, description)}
              onRemove={(index) => removeVideo('tiktok', index)}
              maxVideos={5}
            />
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
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              FAQ do Produto
            </h3>
            <p className="text-sm text-muted-foreground">
              Perguntas frequentes específicas deste produto que aparecerão com schema estruturado nos buscadores.
            </p>
            
            <FAQEditor
              faqs={formData.faq || []}
              onChange={(faqs) => setFormData(prev => ({ ...prev, faq: faqs }))}
              placeholder={{
                question: "Ex: Como funciona este produto?",
                answer: "Digite a resposta com formatação rica..."
              }}
            />
          </div>

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