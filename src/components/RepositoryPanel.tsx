import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Star, DollarSign, Eye, EyeOff, RefreshCw, RotateCcw, Edit, Trash2, Plus, Building2, VideoIcon, Download, FileDown, CheckCircle, Brain, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProductSync } from "@/hooks/useProductSync";
import useLandingPages from "@/hooks/useLandingPages";
import { ProductEditModal } from "@/components/ProductEditModal";
import { CompanyProfileManager } from "@/components/CompanyProfileManager";

import { CSVReviewUploader } from "@/components/CSVReviewUploader";
import VideoTestimonialsSection from "@/components/VideoTestimonialsSection";
import { KOLManager } from "@/components/KOLManager";
import ProductRepositoryCSVImporter from "@/components/ProductRepositoryCSVImporter";
import { useCategoryContext } from '@/contexts/CategoryContext';
import { ModernProductCard } from './ModernProductCard';
import { ScoreFilters } from './ScoreFilters';
import { calculateProductScore } from './ProductScoreCalculator';
import { calculateProductStats } from './ProductStatsHelper';
import { CategorySection } from './CategorySection';

interface Video {
  url: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  promo_price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
  // SEO fields
  seo_title_override?: string;
  seo_description_override?: string;
  slug?: string;
  canonical_url?: string;
  sales_pitch?: string;
  use_in_ai_generation: boolean;
  approved: boolean;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
  target_audience?: string[];
  search_intent_keywords?: string[];
  market_keywords?: string[];
  tags?: string[];
  bot_trigger_words?: string[];
  youtube_videos?: Video[];
  instagram_videos?: Video[];
  technical_videos?: Video[];
  testimonial_videos?: Video[];
  video_captions?: any;
  original_data?: any;
  images_gallery?: Array<{ url: string; alt: string; order: number; is_main: boolean }>;
  technical_specifications?: Array<{ label: string; value: string }>;
  faq?: Array<{ question: string; answer: string }>;
  // Google Merchant fields
  gtin?: string;
  ean?: string;
  mpn?: string;
  brand?: string;
  // Physical specifications
  variations?: { name: string; price?: number; stock?: number; color?: string; size?: string }[];
  // Landing Page Section controls
  show_in_resources?: boolean;
  selected?: boolean;
  // Resource CTAs
  resource_cta1?: { label: string; url: string; visible: boolean };
  resource_cta2?: { label: string; url: string; visible: boolean };
  resource_cta3?: { label: string; url: string; visible: boolean };
  // Offer discount CTA
  offer_discount_cta?: { label: string; url: string; visible: boolean };
  // Blog content gerado por IA
  individual_blog_content?: {
    commercial?: string | null;
    technical?: string | null;
    generated_at?: string | null;
  };
  // Wikidata
  wikidata_item_id?: string | null;
}

interface ManualReview {
  id: string;
  author_name: string;
  rating: number;
  review_text: string;
  approved: boolean;
}

interface RepositoryPanelProps {
  landingPageId: string;
  onProductSelectionChange: (selectedProducts: Product[]) => void;
  className?: string;
  onSyncTriggered?: () => void;
  onCompanyProfileChange?: (profile: any) => void;
}

// Colunas LEVES para o grid/listagem — sem JSONB pesados.
const PRODUCT_REPOSITORY_LIST_COLUMNS = [
  'id', 'name', 'description', 'price', 'promo_price', 'currency',
  'category', 'subcategory', 'image_url', 'product_url',
  'use_in_ai_generation', 'approved', 'display_order',
  'show_in_resources', 'selected', 'brand', 'gtin', 'ean', 'mpn',
  'wikidata_item_id', 'technical_specifications', 'original_data',
].join(', ');

const PRODUCT_REPOSITORY_EDIT_COLUMNS = [
  PRODUCT_REPOSITORY_LIST_COLUMNS, 'applications', 'processing_instructions', 'image_alt', 'images_gallery', 'color', 'size', 'material',
  'google_product_category', 'condition', 'availability', 'package_size', 'weight', 'height',
  'width', 'depth', 'store_category', 'stock_quantity', 'stock_managed', 'min_order_quantity',
  'max_order_quantity', 'multiple_order_quantity', 'unit_measure', 'shipping_time', 'free_shipping',
  'shipping_type', 'active', 'featured', 'launch', 'promotion', 'showcase', 'ncm', 'fiscal_class',
  'tax_situation', 'fiscal_origin', 'resource_descriptions', 'technical_documents',
  'document_transcriptions', 'workflow_stages', 'competitor_comparison', 'tutorial_resources',
  'tiktok_videos', 'forbidden_products', 'required_products', 'anti_hallucination_rules',
  'product_type', 'clinical_brain_status', 'clinical_brain_validation_notes'
].join(', ');

const PRODUCTS_QUERY_TIMEOUT_MS = 15000;

const withRepositoryTimeout = <T,>(promise: PromiseLike<T>, message: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    globalThis.setTimeout(() => reject(new Error(message)), PRODUCTS_QUERY_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]);
};

export function RepositoryPanel({ 
  landingPageId, 
  onProductSelectionChange, 
  className,
  onSyncTriggered,
  onCompanyProfileChange 
}: RepositoryPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'testimonials' | 'kols'>("products");
  const [exportingData, setExportingData] = useState(false);
  const [showUnapproved, setShowUnapproved] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [kbCacheInfo, setKbCacheInfo] = useState<{ updated_at: string; products_count: number; expires_at: string } | null>(null);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const { toast } = useToast();
  const { migrateExistingOffers, syncOffersToRepository } = useProductSync();
  const { getLandingPage } = useLandingPages();
  const { refreshAllCategories } = useCategoryContext();
  const productsLoadedSuccessfullyRef = useRef(false);
  const productsLoadingRef = useRef(false);

  // Load KB cache status
  const loadKBCacheStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_cache')
        .select('updated_at, products_count, expires_at')
        .eq('format', 'rag')
        .single();

      if (!error && data) {
        setKbCacheInfo({
          updated_at: data.updated_at,
          products_count: data.products_count || 0,
          expires_at: data.expires_at
        });
      }
    } catch (error) {
      console.error('Error loading KB cache status:', error);
    }
  };

  // Refresh KB cache manually
  const handleRefreshKBCache = async () => {
    setRefreshingCache(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-knowledge-base');
      
      if (error) throw error;

      await loadKBCacheStatus();
      
      toast({
        title: "✅ Cache Atualizado",
        description: `Knowledge Base atualizada com ${data?.products_count || 0} produtos.`,
      });
    } catch (error: any) {
      console.error('Error refreshing KB cache:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cache da Knowledge Base.",
        variant: "destructive"
      });
    } finally {
      setRefreshingCache(false);
    }
  };

  // Check if cache is expired (> 3 hours)
  const isCacheExpired = () => {
    if (!kbCacheInfo?.updated_at) return true;
    const updatedAt = new Date(kbCacheInfo.updated_at);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return updatedAt < threeHoursAgo;
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins}min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return date.toLocaleDateString('pt-BR');
  };


  // Function to load company profile data
  const loadCompanyProfile = async () => {
    try {
      console.log(`[DEBUG] Carregando perfil da empresa`);
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil da empresa:', error);
      } else if (data) {
        console.log(`[DEBUG] Perfil da empresa carregado:`, data);
        onCompanyProfileChange?.(data);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil da empresa:', error);
    }
  };

  // Function to refresh all data
  const refreshAllData = async () => {
    setLoading(true);
    try {
      // loadProducts já tem withRepositoryTimeout interno na própria query.
      // Não envelopar de novo aqui para evitar timeout duplicado.
      await Promise.allSettled([
        loadProducts(),
        loadCompanyProfile(),
        loadKBCacheStatus(),
      ]);
      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all data on component mount and when landingPageId changes
  useEffect(() => {
    if (landingPageId) {
      refreshAllData();
    }
  }, [landingPageId]);

  // Listen for category changes and refresh data automatically
  useEffect(() => {
    const handleCategoryUpdate = async () => {
      if (productsLoadedSuccessfullyRef.current || productsLoadingRef.current) {
        console.log('Category data updated, product list already loaded; skipping refresh.');
        return;
      }

      console.log('Category data updated, refreshing product list...');
      await loadProducts();
    };

    // This effect will run when categories context changes
    handleCategoryUpdate();
  }, [refreshAllCategories]);

  // Realtime updates for products_repository
  useEffect(() => {
    const channel = supabase
      .channel('products-repository-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products_repository' }, () => {
        console.log('[Realtime] products_repository changed – refreshing list');
        loadProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter(product => {
        if (!product.price) return priceFilter === "free";
        if (priceFilter === "free") return product.price === 0;
        if (priceFilter === "low") return product.price > 0 && product.price <= 100;
        if (priceFilter === "medium") return product.price > 100 && product.price <= 500;
        if (priceFilter === "high") return product.price > 500;
        return true;
      });
    }

    // Score filter
    if (scoreFilter !== "all") {
      filtered = filtered.filter(product => {
        const score = calculateProductScore(product);
        if (scoreFilter === "complete") return score.percentage >= 90;
        if (scoreFilter === "good") return score.percentage >= 70 && score.percentage < 90;
        if (scoreFilter === "regular") return score.percentage >= 50 && score.percentage < 70;
        if (scoreFilter === "critical") return score.percentage < 50;
        return true;
      });
    }

    // Field filter
    if (fieldFilter !== "all") {
      filtered = filtered.filter(product => {
        const score = calculateProductScore(product);
        return score.missingFields.some(field => {
          if (fieldFilter === "image") return field === "Imagem";
          if (fieldFilter === "description") return field === "Descrição";
          if (fieldFilter === "keywords") return field === "Palavras-chave";
          if (fieldFilter === "benefits") return field === "Benefícios";
          if (fieldFilter === "features") return field === "Características";
          if (fieldFilter === "target_audience") return field === "Público-alvo";
          if (fieldFilter === "sales_pitch") return field === "Pitch de Vendas";
          if (fieldFilter === "videos") return field === "Vídeos";
          if (fieldFilter === "product_url") return field === "URL do Produto";
          if (fieldFilter === "price") return field === "Preço";
          return false;
        });
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, priceFilter, scoreFilter, fieldFilter]);

  // Update selection callback
  useEffect(() => {
    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
    onProductSelectionChange(selectedProducts);
  }, [selectedProductIds, products, onProductSelectionChange]);

  const loadProducts = async () => {
    if (productsLoadingRef.current) {
      console.log('[DEBUG] Carregamento de produtos já em andamento; ignorando nova chamada.');
      return;
    }

    productsLoadingRef.current = true;
    try {
      console.log('[DEBUG] Carregando produtos do repositório...');
      const query = supabase
        .from('products_repository')
        .select(PRODUCT_REPOSITORY_LIST_COLUMNS)
        .eq('approved', showUnapproved ? false : true)
        .order('display_order', { ascending: true });

      const { data, error } = await withRepositoryTimeout(query, 'Tempo limite ao carregar produtos do repositório') as { data: any[] | null; error: any };

      if (error) {
        console.error('[DEBUG] Erro ao carregar produtos:', error);
        throw error;
      }

      console.log('[DEBUG] Produtos carregados:', data);

      const formattedProducts: Product[] = (data || []).map(data => ({
        id: data.id,
        name: data.name,
        description: data.description || '',
        price: data.price || 0,
        promo_price: data.promo_price || undefined,
        gtin: data.gtin || undefined,
        ean: data.ean || undefined,
        mpn: data.mpn || undefined,
        brand: data.brand || undefined,
        variations: Array.isArray(data.variations) ? data.variations as unknown as { name: string; price?: number; stock?: number; color?: string; size?: string }[] : undefined,
        currency: data.currency || 'BRL',
        category: data.category || '',
        subcategory: data.subcategory || '',
        image_url: data.image_url || '',
        product_url: data.product_url || '',
        seo_title_override: data.seo_title_override || undefined,
        seo_description_override: data.seo_description_override || undefined,
        slug: data.slug || '',
        canonical_url: data.canonical_url || '',
        sales_pitch: data.sales_pitch || '',
        use_in_ai_generation: data.use_in_ai_generation ?? true,
        approved: data.approved ?? true,
        keywords: Array.isArray(data.keywords) ? data.keywords.map(k => String(k)) : [],
        benefits: Array.isArray(data.benefits) ? data.benefits.map(b => String(b)) : [],
        features: Array.isArray(data.features) ? data.features.map(f => String(f)) : [],
        target_audience: Array.isArray(data.target_audience) ? data.target_audience.map(t => String(t)) : [],
        search_intent_keywords: Array.isArray(data.search_intent_keywords) ? data.search_intent_keywords.map(s => String(s)) : [],
        market_keywords: Array.isArray(data.market_keywords) ? data.market_keywords.map(m => String(m)) : [],
        tags: Array.isArray(data.tags) ? data.tags.map(t => String(t)) : [],
        bot_trigger_words: Array.isArray(data.bot_trigger_words) ? data.bot_trigger_words.map(b => String(b)) : [],
        youtube_videos: Array.isArray(data.youtube_videos) ? data.youtube_videos as unknown as Video[] : [],
        instagram_videos: Array.isArray(data.instagram_videos) ? data.instagram_videos as unknown as Video[] : [],
        technical_videos: Array.isArray(data.technical_videos) ? data.technical_videos as unknown as Video[] : [],
        testimonial_videos: Array.isArray(data.testimonial_videos) ? data.testimonial_videos as unknown as Video[] : [],
        video_captions: data.video_captions || {},
        original_data: data.original_data || null,
        images_gallery: Array.isArray(data.images_gallery) ? data.images_gallery as unknown as Array<{ url: string; alt: string; order: number; is_main: boolean }> : [],
        technical_specifications: Array.isArray(data.technical_specifications) 
          ? (data.technical_specifications as Array<{ label: string; value: string }>)
          : [],
        faq: Array.isArray(data.faq) 
          ? (data.faq as Array<{ question: string; answer: string }>) 
          : [],
        // Landing page sections and CTAs
        selected: data.selected ?? false,
        show_in_resources: data.show_in_resources ?? false,
        resource_cta1: (data as any).resource_cta1 || { label: '', url: '', visible: false },
        resource_cta2: (data as any).resource_cta2 || { label: '', url: '', visible: false },
        resource_cta3: (data as any).resource_cta3 || { label: '', url: '', visible: false },
        offer_discount_cta: (data as any).offer_discount_cta || { label: 'Comprar com Desconto', url: '', visible: false },
        // Blog content gerado por IA
        individual_blog_content: (data.individual_blog_content as any) || { commercial: null, technical: null, generated_at: null }
      }));
      
      setProducts(formattedProducts);

      // Auto-open all categories initially to avoid hidden data, including 'Sem categoria'
      const initialCategories = new Set(
        (formattedProducts || []).map(p => (p.category && p.category.trim().length > 0 ? p.category : 'Sem categoria'))
      );
      setOpenCategories(initialCategories);

      // Auto-select products marked for AI generation
      const aiProducts = formattedProducts.filter(p => p.use_in_ai_generation);
      setSelectedProductIds(new Set(aiProducts.map(p => p.id)));
      productsLoadedSuccessfullyRef.current = true;

    } catch (error: any) {
      // Log detalhado para diferenciar timeout × RLS × coluna inexistente
      console.error('[REPOSITORY_LOAD_FAIL]', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      toast({
        title: "Erro ao carregar produtos do repositório",
        description: error?.message || "Falha desconhecida ao consultar products_repository.",
        variant: "destructive"
      });
    } finally {
      productsLoadingRef.current = false;
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleAllProducts = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return categories.sort();
  };

  // Group products by category
  const groupProductsByCategory = () => {
    const grouped: { [key: string]: Product[] } = {};
    
    filteredProducts.forEach(product => {
      const category = product.category || 'Sem categoria';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    // Sort categories by product count (descending) and then alphabetically
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sem categoria') return 1;
      if (b === 'Sem categoria') return -1;
      if (grouped[b].length !== grouped[a].length) {
        return grouped[b].length - grouped[a].length;
      }
      return a.localeCompare(b);
    });

    const result: { category: string; products: Product[] }[] = [];
    sortedCategories.forEach(category => {
      result.push({ category, products: grouped[category] });
    });

    return result;
  };

  const toggleCategoryOpen = (category: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleCategorySelection = (category: string) => {
    const categoryProducts = filteredProducts.filter(p => (p.category || 'Sem categoria') === category);
    const categoryProductIds = categoryProducts.map(p => p.id);
    const selectedInCategory = categoryProductIds.filter(id => selectedProductIds.has(id));
    
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      
      if (selectedInCategory.length === categoryProductIds.length) {
        // All selected, unselect all
        categoryProductIds.forEach(id => newSet.delete(id));
      } else {
        // Some or none selected, select all
        categoryProductIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  };


  const formatPrice = (price?: number, currency?: string) => {
    if (price === 0) return "Pedir orçamento";
    if (!price) return "Gratuito";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(price);
  };

  const handleEditProduct = async (product: Product) => {
    const query = supabase
      .from('products_repository')
      .select(PRODUCT_REPOSITORY_EDIT_COLUMNS)
      .eq('id', product.id)
      .single();

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Tempo limite ao carregar produto')), PRODUCTS_QUERY_TIMEOUT_MS);
    });

    const { data: freshProduct, error } = await Promise.race([query, timeout]) as { data: any; error: any };

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o produto",
        variant: "destructive"
      });
      return;
    }

    setEditingProduct(freshProduct as unknown as Product);
    setIsEditModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = (savedProduct: Product) => {
    console.log('[DEBUG] Produto salvo no modal, atualizando lista...');
    setProducts(prev => {
      const existing = prev.find(p => p.id === savedProduct.id);
      if (existing) {
        return prev.map(p => p.id === savedProduct.id ? savedProduct : p);
      } else {
        return [...prev, savedProduct];
      }
    });
    // Recarregar produtos para garantir dados atualizados
    loadProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      console.log('[DEBUG] Verificando permissões antes de deletar produto:', productId);
      
      // Verificar se usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[DEBUG] Erro ao obter usuário:', userError);
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para deletar produtos. Faça login novamente.",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar se usuário é admin
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (roleError) {
        console.error('[DEBUG] Erro ao verificar role:', roleError);
        toast({
          title: "Erro de permissão",
          description: `Não foi possível verificar suas permissões. ${roleError.message}`,
          variant: "destructive"
        });
        return;
      }
      
      if (!isAdmin) {
        console.warn('[DEBUG] Usuário não é admin:', user.email);
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão de administrador para deletar produtos. Entre em contato com o suporte.",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar campanhas associadas (feedback ao usuário)
      const { data: campaigns } = await supabase
        .from('google_ads_campaigns')
        .select('id, config')
        .eq('product_id', productId);

      // Confirmação informativa
      const message = campaigns && campaigns.length > 0
        ? `Este produto tem ${campaigns.length} campanha(s) do Google Ads. Ao deletá-lo, essas campanhas também serão removidas permanentemente. Deseja continuar?`
        : 'Tem certeza que deseja deletar este produto?';
      
      const confirmed = window.confirm(message);
      if (!confirmed) return;
      
      console.log('[DEBUG] Permissões OK. Deletando produto:', productId);
      const { error } = await supabase
        .from('products_repository')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('[DEBUG] Erro ao deletar produto:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        
        toast({
          title: "Erro ao deletar",
          description: error.message || "Erro desconhecido ao deletar produto",
          variant: "destructive"
        });
        return;
      }

      // Atualizar UI apenas se deleção foi bem-sucedida
      setProducts(prev => prev.filter(p => p.id !== productId));
      
      toast({
        title: "Sucesso",
        description: campaigns && campaigns.length > 0
          ? `Produto e ${campaigns.length} campanha(s) deletados`
          : "Produto deletado com sucesso",
      });
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });

      toast({
        title: "Sucesso",
        description: "Produto deletado com sucesso",
      });
    } catch (error: any) {
      console.error('[DEBUG] Erro fatal ao deletar produto:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro desconhecido ao deletar produto",
        variant: "destructive"
      });
    }
  };

  const handleSyncOffers = async () => {
    if (!landingPageId) return;

    setIsSyncing(true);
    try {
      // Get current landing page data
      const landingPage = getLandingPage(landingPageId);
      if (!landingPage?.data?.schema?.offers) {
        // Try to migrate existing data first
        await migrateExistingOffers(landingPageId);
      } else {
        // Sync current offers
        await syncOffersToRepository(landingPageId, landingPage.data.schema.offers);
      }
      
      // Reload products after sync
      await loadProducts();
      onSyncTriggered?.();
      
    } catch (error) {
      console.error('Error syncing offers:', error);
      toast({
        title: "Erro",
        description: "Erro ao sincronizar ofertas",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportKnowledgeBase = async () => {
    setExportingData(true);
    try {
      console.log('📊 Iniciando exportação Knowledge Base completa...');
      
      const { data, error } = await supabase.functions.invoke('knowledge-base', {
        body: { 
          format: 'json',
          include_company: true,
          include_categories: true,
          include_links: true,
          include_products: true,
          include_video_testimonials: true,
          include_google_reviews: true,
          include_kols: true,
          approved_only: true,
          limit: 1000
        }
      });

      if (error) throw error;

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `knowledge_base_complete_${timestamp}.json`;
      
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const stats = {
        hasCompany: !!data?.company_profile,
        totalCategories: data?.categories_config?.length || 0,
        totalLinks: data?.external_links?.length || 0,
        totalProducts: data?.products?.length || 0,
        totalTestimonials: data?.video_testimonials?.length || 0,
        totalReviews: data?.google_reviews?.length || 0,
        totalKOLs: data?.key_opinion_leaders?.length || 0,
        totalFields: data?.total_fields || 'N/A'
      };

      console.log('✅ Exportação completa:', stats);

      toast({
        title: "✅ Knowledge Base Exportada",
        description: `${stats.totalProducts} produtos, ${stats.totalTestimonials} depoimentos, ${stats.totalReviews} reviews | ${stats.totalFields} campos totais`,
      });

    } catch (error) {
      console.error('❌ Erro na exportação Knowledge Base:', error);
      toast({
        title: "Erro na Exportação",
        description: "Erro ao exportar Knowledge Base. Verifique os logs.",
        variant: "destructive"
      });
    } finally {
      setExportingData(false);
    }
  };

  const handleExportForLLM = async () => {
    setExportingData(true);
    try {
      console.log('🤖 Exportando Knowledge Base otimizada para LLMs...');
      
      const { data, error } = await supabase.functions.invoke('knowledge-base', {
        body: { 
          format: 'rag',
          include_company: true,
          include_categories: true,
          include_links: true,
          include_products: true,
          include_video_testimonials: true,
          include_google_reviews: true,
          include_kols: true,
          include_spin_solutions: true,
          approved_only: true,
          limit: 200
        }
      });

      if (error) throw error;

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `knowledge_base_llm_optimized_${timestamp}.json`;
      
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const stats = {
        totalProducts: data?.data?.products?.length || 0,
        format: data?.format || 'rag_optimized',
        optimizations: data?.optimization_notes?.length || 0
      };

      console.log('✅ Exportação LLM completa:', stats);

      toast({
        title: "✅ Knowledge Base para LLMs Exportada",
        description: `${stats.totalProducts} produtos otimizados para RAG/LLMs. HTML removido, campos limpos.`,
      });

    } catch (error) {
      console.error('❌ Erro na exportação LLM:', error);
      toast({
        title: "Erro na Exportação",
        description: "Erro ao exportar para LLMs. Verifique os logs.",
        variant: "destructive"
      });
    } finally {
      setExportingData(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Carregando dados...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Repositório Central de Dados
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Perfil da Empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col sm:max-w-[95vw]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Perfil da Empresa
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <CompanyProfileManager 
                    onProfileChange={onCompanyProfileChange}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {activeTab === "products" && (
            <div className="space-y-4">
              {/* Modern Score Filters */}
              <ScoreFilters
                scoreFilter={scoreFilter}
                onScoreFilterChange={setScoreFilter}
                fieldFilter={fieldFilter}
                onFieldFilterChange={setFieldFilter}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                categories={getUniqueCategories()}
                productCounts={calculateProductStats(products)}
                onClearFilters={() => {
                  setScoreFilter("all");
                  setFieldFilter("all");
                  setCategoryFilter("all");
                  setPriceFilter("all");
                  setSearchTerm("");
                }}
              />
              
              {/* Toggle and Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={showUnapproved}
                      onCheckedChange={(checked) => {
                        setShowUnapproved(checked as boolean);
                        loadProducts();
                      }}
                      className="h-3 w-3"
                    />
                    Mostrar não aprovados
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllProducts}
                    className="gap-2"
                  >
                    {selectedProductIds.size === filteredProducts.length ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {selectedProductIds.size === filteredProducts.length ? 'Desmarcar' : 'Selecionar'} Todos
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshAllData}
                    disabled={loading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncOffers}
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportKnowledgeBase}
                    disabled={exportingData}
                    className="gap-2"
                  >
                    {exportingData ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        Exportar KB
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleExportForLLM}
                      disabled={exportingData}
                      className="gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      {exportingData ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Exportando...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          Exportar para LLMs
                        </>
                      )}
                    </Button>
                    
                    {/* Cache Status Indicator */}
                    <div className="flex items-center gap-1.5 text-xs">
                      {kbCacheInfo ? (
                        <>
                          {isCacheExpired() ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-green-500" />
                          )}
                          <span className={isCacheExpired() ? 'text-amber-600' : 'text-muted-foreground'}>
                            {formatTimeAgo(kbCacheInfo.updated_at)}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sem cache</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshKBCache}
                        disabled={refreshingCache}
                        className="h-6 w-6 p-0"
                        title="Atualizar cache KB"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingCache ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleAddProduct}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <div>
                  {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                </div>
                <div>
                  {selectedProductIds.size} selecionado{selectedProductIds.size !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'products' | 'testimonials' | 'kols')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
              <TabsTrigger value="kols">KOLs</TabsTrigger>
            </TabsList>

          <TabsContent value="products" className="mt-4">
            <div className="space-y-4">
              {/* Import Methods */}
              <div className="grid grid-cols-1 gap-4">
                <ProductRepositoryCSVImporter onImportComplete={() => loadProducts()} />
              </div>
              
              <div className="space-y-4">
                {groupProductsByCategory().map(({ category, products }) => (
                  <CategorySection
                    key={category}
                    category={category}
                    products={products}
                    selectedProductIds={selectedProductIds}
                    isOpen={openCategories.has(category)}
                    onToggleOpen={() => toggleCategoryOpen(category)}
                    onToggleSelection={toggleProductSelection}
                    onToggleCategorySelection={() => toggleCategorySelection(category)}
                    onEditProduct={handleEditProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onProductUpdate={loadProducts}
                  />
                ))}
                
                {filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Nenhum produto encontrado</p>
                    <p className="text-sm">Ajuste os filtros ou adicione novos produtos ao repositório</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="testimonials" className="mt-4">
            <VideoTestimonialsSection landingPageId={landingPageId} />
          </TabsContent>

          <TabsContent value="kols" className="mt-4">
            <KOLManager />
          </TabsContent>

        </Tabs>
      </CardContent>

      {/* Product Edit Modal */}
      <ProductEditModal
        key={editingProduct?.id ?? 'new'}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={editingProduct}
        onSave={handleSaveProduct}
      />
    </Card>
  );
}