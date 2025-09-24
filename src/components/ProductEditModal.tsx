import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { Save, Trash2, Plus, X, Sparkles, Download, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VideoSection } from "@/components/VideoSection";
import { CaptionExtractor } from "@/components/CaptionExtractor";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { useCallback } from 'react';

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
  instagram_videos?: Video[];
  youtube_videos?: Video[];
  testimonial_videos?: Video[];
  technical_videos?: Video[];
  video_captions?: any;
  original_data?: any;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function ProductEditModal({ isOpen, onClose, product, onSave, onDelete }: ProductEditModalProps) {
  const { categories, getSubcategoriesForCategory, refreshCategories } = useProductCategories();
  const { getConfigByCategory } = useCategoryConfig();
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
    instagram_videos: [],
    youtube_videos: [],
    testimonial_videos: [],
    technical_videos: []
  });
  const [benefits, setBenefits] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [marketKeywords, setMarketKeywords] = useState<string[]>([]);
  const [searchIntentKeywords, setSearchIntentKeywords] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Video states
  const [instagramVideos, setInstagramVideos] = useState<Video[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<Video[]>([]);
  const [testimonialVideos, setTestimonialVideos] = useState<Video[]>([]);
  const [technicalVideos, setTechnicalVideos] = useState<Video[]>([]);
  
  // Caption states
  const [videoCaptions, setVideoCaptions] = useState<any>({});
  
  const { toast } = useToast();

  // Função para carregar configurações padrão de categoria
  const loadCategoryDefaults = useCallback((category: string, subcategory: string) => {
    const config = getConfigByCategory(category, subcategory);
    if (config) {
      // Auto-preencher apenas campos vazios para não sobrescrever dados já inseridos
      const updates: Partial<Product> = {};
      
      if (config.target_audience.length > 0 && (!targetAudience || targetAudience.length === 0)) {
        setTargetAudience(config.target_audience);
      }
      
      if (config.keywords.length > 0 && (!formData.keywords || formData.keywords.length === 0)) {
        updates.keywords = config.keywords;
      }
      
      if (config.market_keywords.length > 0 && (!marketKeywords || marketKeywords.length === 0)) {
        setMarketKeywords(config.market_keywords);
      }
      
      if (config.search_intent_keywords.length > 0 && (!searchIntentKeywords || searchIntentKeywords.length === 0)) {
        setSearchIntentKeywords(config.search_intent_keywords);
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
      
      toast({
        title: "Campos preenchidos automaticamente",
        description: "Dados padrão da categoria foram aplicados aos campos vazios"
      });
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
        technical_videos: product.technical_videos || []
      });
      setBenefits(product.benefits || []);
      setFeatures(product.features || []);
      setTargetAudience(product.target_audience || []);
      setMarketKeywords(product.market_keywords || []);
      setSearchIntentKeywords(product.search_intent_keywords || []);
      setInstagramVideos(product.instagram_videos || []);
      setYoutubeVideos(product.youtube_videos || []);
      setTestimonialVideos(product.testimonial_videos || []);
      setTechnicalVideos(product.technical_videos || []);
      setVideoCaptions(product.video_captions || {});
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
        instagram_videos: [],
        youtube_videos: [],
        testimonial_videos: [],
        technical_videos: []
      });
      setBenefits([]);
      setFeatures([]);
      setTargetAudience([]);
      setMarketKeywords([]);
      setSearchIntentKeywords([]);
      setInstagramVideos([]);
      setYoutubeVideos([]);
      setTestimonialVideos([]);
      setTechnicalVideos([]);
      setVideoCaptions({});
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
  const addVideo = (type: 'instagram' | 'youtube' | 'testimonial' | 'technical', url: string, description: string) => {
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
    }
  };

  const removeVideo = (type: 'instagram' | 'youtube' | 'testimonial' | 'technical', index: number) => {
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

  const extractProductDataFromUrl = async () => {
    if (!formData.product_url?.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma URL válida para importar os dados",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-product-data', {
        body: {
          url: formData.product_url
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const extractedData = data.data;
        
        // Mapear dados extraídos para o formulário
        const updates: Partial<Product> = {};
        
        if (extractedData.name && !formData.name?.trim()) {
          updates.name = extractedData.name;
        }
        
        if (extractedData.description && !formData.description?.trim()) {
          updates.description = extractedData.description;
        }
        
        if (extractedData.price) {
          const priceValue = parseFloat(extractedData.price.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(priceValue) && priceValue > 0) {
            updates.price = priceValue;
          }
        }
        
        if (extractedData.image && !formData.image_url?.trim()) {
          updates.image_url = extractedData.image;
        }
        
        // Combinar installmentText com sales_pitch existente
        if (extractedData.installmentText) {
          const currentSalesPitch = formData.sales_pitch || '';
          const newSalesPitch = currentSalesPitch ? 
            `${currentSalesPitch}\n\n${extractedData.installmentText}` : 
            extractedData.installmentText;
          updates.sales_pitch = newSalesPitch;
        }

        // Aplicar atualizações
        setFormData(prev => ({ ...prev, ...updates }));

        toast({
          title: "Sucesso",
          description: "Dados da loja integrada importados com sucesso!"
        });
      } else {
        throw new Error(data?.error || 'Erro ao extrair dados do produto');
      }
    } catch (error) {
      console.error('Error extracting product data:', error);
      toast({
        title: "Erro",
        description: "Erro ao importar dados. Verifique a URL e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    console.log('[DEBUG] Iniciando salvamento do produto...');
    console.log('[DEBUG] Dados do formulário:', formData);
    
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
        currency: formData.currency || 'BRL',
        category: formData.category,
        subcategory: formData.subcategory,
        image_url: formData.image_url,
        product_url: formData.product_url,
        source_type: 'manual', // Garantir que source_type seja definido
        target_audience: targetAudience,
        instagram_videos: instagramVideos as any,
        youtube_videos: youtubeVideos as any,
        testimonial_videos: testimonialVideos as any,
        technical_videos: technicalVideos as any,
        use_in_ai_generation: formData.use_in_ai_generation,
        approved: formData.approved,
        keywords: formData.keywords || [],
        market_keywords: marketKeywords,
        search_intent_keywords: searchIntentKeywords,
        benefits: benefits,
        features: features,
        updated_at: new Date().toISOString()
      };

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
      onSave(result.data);
      onClose();
      
      toast({
        title: "Sucesso",
        description: `Produto ${isEditing ? 'atualizado' : 'criado'} com sucesso!`
      });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Produto' : 'Adicionar Produto'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                <PopoverContent className="w-full p-0">
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
                      {categories.map((category) => (
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
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
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
                <PopoverContent className="w-full p-0">
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
                      {formData.category && getSubcategoriesForCategory(formData.category).map((subcategory) => (
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
                  <img 
                    src={formData.image_url} 
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product_url">URL do Produto</Label>
            <div className="flex gap-2">
              <Input
                id="product_url"
                type="url"
                value={formData.product_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, product_url: e.target.value }))}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={extractProductDataFromUrl}
                disabled={importing || !formData.product_url?.trim()}
                className="shrink-0"
              >
                {importing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Importar dados da loja integrada
                  </>
                )}
              </Button>
            </div>
          </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_audience">Público-Alvo</Label>
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