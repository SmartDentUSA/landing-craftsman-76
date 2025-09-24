import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Star, DollarSign, Eye, EyeOff, RefreshCw, RotateCcw, Edit, Trash2, Plus, Building2, VideoIcon, Download, FileDown, CheckCircle } from "lucide-react";
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
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
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
  youtube_videos?: Video[];
  instagram_videos?: Video[];
  technical_videos?: Video[];
  testimonial_videos?: Video[];
  video_captions?: any;
  original_data?: any;
  // Landing Page Section controls
  show_in_resources?: boolean;
  selected?: boolean;
  // Resource CTAs
  resource_cta1?: { label: string; url: string; visible: boolean };
  resource_cta2?: { label: string; url: string; visible: boolean };
  resource_cta3?: { label: string; url: string; visible: boolean };
  // Offer discount CTA
  offer_discount_cta?: { label: string; url: string; visible: boolean };
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
  const [activeTab, setActiveTab] = useState("products");
  const [manualReviews, setManualReviews] = useState<ManualReview[]>([]);
  const [exportingData, setExportingData] = useState(false);
  const [showUnapproved, setShowUnapproved] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { migrateExistingOffers, syncOffersToRepository } = useProductSync();
  const { getLandingPage } = useLandingPages();
  const { refreshAllCategories } = useCategoryContext();

  // Function to load manual reviews
  const loadManualReviews = async () => {
    try {
      console.log(`[DEBUG] Carregando reviews manuais para landingPageId: ${landingPageId}`);
      const { loadManualReviews: loadReviews } = useLandingPages.getState();
      const reviews = await loadReviews(landingPageId);
      console.log(`[DEBUG] Reviews carregadas:`, reviews);
      setManualReviews(reviews);
    } catch (error) {
      console.error('Erro ao carregar reviews manuais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar reviews manuais",
        variant: "destructive"
      });
    }
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
      await Promise.all([
        loadProducts(),
        loadManualReviews(),
        loadCompanyProfile()
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
      console.log('Category data updated, refreshing product list...');
      await loadProducts();
    };

    // This effect will run when categories context changes
    handleCategoryUpdate();
  }, [refreshAllCategories]);

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
    try {
      console.log('[DEBUG] Carregando produtos do repositório...');
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .eq('approved', showUnapproved ? false : true)
        .order('display_order', { ascending: true });

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
        currency: data.currency || 'BRL',
        category: data.category || '',
        subcategory: data.subcategory || '',
        image_url: data.image_url || '',
        product_url: data.product_url || '',
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
        youtube_videos: Array.isArray(data.youtube_videos) ? data.youtube_videos as unknown as Video[] : [],
        instagram_videos: Array.isArray(data.instagram_videos) ? data.instagram_videos as unknown as Video[] : [],
        technical_videos: Array.isArray(data.technical_videos) ? data.technical_videos as unknown as Video[] : [],
        testimonial_videos: Array.isArray(data.testimonial_videos) ? data.testimonial_videos as unknown as Video[] : [],
        video_captions: data.video_captions || {},
        original_data: data.original_data || null,
        // Landing page sections and CTAs
        selected: data.selected ?? false,
        show_in_resources: data.show_in_resources ?? false,
        resource_cta1: (data as any).resource_cta1 || { label: '', url: '', visible: false },
        resource_cta2: (data as any).resource_cta2 || { label: '', url: '', visible: false },
        resource_cta3: (data as any).resource_cta3 || { label: '', url: '', visible: false },
        offer_discount_cta: (data as any).offer_discount_cta || { label: 'Comprar com Desconto', url: '', visible: false }
      }));
      
      setProducts(formattedProducts);

      // Auto-select products marked for AI generation
      const aiProducts = formattedProducts.filter(p => p.use_in_ai_generation);
      setSelectedProductIds(new Set(aiProducts.map(p => p.id)));

    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos do repositório",
        variant: "destructive"
      });
    } finally {
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

  // Initialize open categories on first load
  useEffect(() => {
    if (products.length > 0 && openCategories.size === 0) {
      const categories = getUniqueCategories();
      // Open the first few categories by default
      const initialOpen = new Set(categories.slice(0, 3));
      if (filteredProducts.some(p => !p.category)) {
        initialOpen.add('Sem categoria');
      }
      setOpenCategories(initialOpen);
    }
  }, [products]);

  const formatPrice = (price?: number, currency?: string) => {
    if (price === 0) return "Pedir orçamento";
    if (!price) return "Gratuito";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(price);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
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
      console.log('[DEBUG] Deletando produto:', productId);
      const { error } = await supabase
        .from('products_repository')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('[DEBUG] Erro ao deletar produto:', error);
        throw error;
      }

      setProducts(prev => prev.filter(p => p.id !== productId));
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });

      toast({
        title: "Sucesso",
        description: "Produto deletado com sucesso",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar produto",
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

  const handleExportCSV = async (type: 'products' | 'reviews' | 'testimonials' | 'kols' | 'all') => {
    setExportingData(true);
    try {
      console.log(`📊 Iniciando exportação CSV: ${type}`);
      
      const { data, error } = await supabase.functions.invoke('export-repository-csv', {
        body: { 
          type, 
          landingPageId: landingPageId === 'repository' ? undefined : landingPageId 
        }
      });

      if (error) throw error;

      // Create and download the file
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${type}_repository_${timestamp}.csv`;
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: `CSV ${type} exportado com sucesso!`,
      });
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar CSV. Tente novamente.",
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
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Perfil da Empresa
                  </DialogTitle>
                </DialogHeader>
                <CompanyProfileManager 
                  onProfileChange={onCompanyProfileChange}
                />
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
                    onClick={() => handleExportCSV('products')}
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
                        Exportar
                      </>
                    )}
                  </Button>
                  
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
            <TabsTrigger value="kols">KOLs</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <div className="space-y-4">
              <ProductRepositoryCSVImporter onImportComplete={() => loadProducts()} />
              
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

          <TabsContent value="reviews" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Reviews management functionality</p>
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
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={editingProduct}
        onSave={handleSaveProduct}
      />
    </Card>
  );
}