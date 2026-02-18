import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ProductScoreIndicator } from './ProductScoreIndicator';
import { CompletionBadges } from './CompletionBadges';
import { ProductTechnicalSpecsModal } from './ProductTechnicalSpecsModal';
import { calculateProductScore } from './ProductScoreCalculator';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit, 
  Trash2, 
  ArrowRight,
  Package,
  Check,
  X,
  Download,
  ShoppingCart,
  FileText,
  MessageCircle,
  PlayCircle,
  Settings,
  Instagram,
  Target,
  Database,
  ExternalLink
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ProductBlogGeneratorModal } from "./ProductBlogGeneratorModal";
import { TechnicalSpecsPreview } from './TechnicalSpecsPreview';
import { WhatsAppMessageGenerator } from "./WhatsAppMessageGenerator";
import { WhatsAppSequenceGenerator } from "./WhatsAppSequenceGenerator";
import { YouTubeDescriptionGenerator } from "./YouTubeDescriptionGenerator";
import { InstagramCopyGenerator } from "./InstagramCopyGenerator";
import { TikTokContentGenerator } from "./TikTokContentGenerator";
import { ProductGoogleAdsModal } from "./google-ads/ProductGoogleAdsModal";
import { TikTokIcon } from "./icons/TikTokIcon";
import { WhatsAppPromoGenerator } from "./WhatsAppPromoGenerator";
import { WhatsAppPromoVariationGenerator } from "./WhatsAppPromoVariationGenerator";
import { ProductEcommerceGenerator } from "./ProductEcommerceGenerator";
import { useCoupons } from "@/hooks/useCoupons";
import { useProductSEOExtractor } from "@/hooks/useProductSEOExtractor";


interface TechnicalDocument {
  id: string;
  origem: 'catalog_documents' | 'resin_documents';
  nome: string;
  descricao?: string;
  nome_arquivo: string;
  url_download: string;
  tamanho_bytes: number;
  ordem_exibicao?: number;
  ativo: boolean;
  metadata_sistema_b: {
    produto_slug?: string;
    resina_slug?: string;
    url_pagina?: string;
  };
  sincronizado_em: string;
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
  images_gallery?: Array<{ url: string; alt?: string }>;
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
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  tiktok_videos?: any[];
  faq?: Array<{ question: string; answer: string }>;
  technical_documents?: TechnicalDocument[];
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
  individual_blog_content?: {
    commercial?: string;
    technical?: string;
    generated_at?: string;
  };
  technical_specifications?: TechnicalSpec[];
  ecommerce_html?: {
    html_content: string;
    generated_at: string;
    last_edited_at?: string;
    generated_benefits: string[];
    generation_options: {
      includeBenefits: boolean;
      includeFAQ: boolean;
      includeVideoCollections: boolean;
      faqLimit: number;
    };
    ai_model_used: string;
    version: number;
  } | null;
  original_data?: {
    li_product_id?: string;
    [key: string]: any;
  };
}

interface TechnicalSpec {
  label: string;
  value: string;
}

interface ModernProductCardProps {
  product: Product;
  isSelected: boolean;
  onToggleSelection: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onProductUpdate?: () => void;
}

export function ModernProductCard({
  product,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  onProductUpdate
}: ModernProductCardProps) {
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showWhatsAppSequenceModal, setShowWhatsAppSequenceModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showGoogleAdsModal, setShowGoogleAdsModal] = useState(false);
  const [showTechnicalSpecs, setShowTechnicalSpecs] = useState(false);
  const [showWhatsAppPromoModal, setShowWhatsAppPromoModal] = useState(false);
  const [showWhatsAppPromoVariationModal, setShowWhatsAppPromoVariationModal] = useState(false);
  const [showEcommerceModal, setShowEcommerceModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExtractingMerchant, setIsExtractingMerchant] = useState(false);
  const { toast } = useToast();
  const { getCouponByProductId } = useCoupons();
  const { extractAndSaveProductSEO } = useProductSEOExtractor();
  const score = calculateProductScore(product);
  const productCoupon = getCouponByProductId(product.id);

  const handleSaveTechnicalSpecs = async (specs: any[]) => {
    try {
      console.log('Saving technical specs:', specs, 'for product:', product.id);
      
      const { error } = await supabase
        .from('products_repository')
        .update({ technical_specifications: specs })
        .eq('id', product.id);

      if (error) throw error;

      // Update local product state immediately
      const updatedProduct = { ...product, technical_specifications: specs };
      console.log('Technical specs saved successfully, triggering update');

      toast({
        title: "Especificações atualizadas",
        description: "As especificações técnicas foram salvas com sucesso",
      });
      
      // Force refresh of the product data
      if (onProductUpdate) {
        console.log('Calling onProductUpdate to refresh data');
        onProductUpdate();
      }
    } catch (error) {
      console.error('Error saving technical specs:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as especificações técnicas",
      });
    }
  };
  
  const formatPrice = (price?: number, currency?: string) => {
    if (price === 0) return "Pedir orçamento";
    if (!price) return "Gratuito";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(price);
  };

  const categoryPath = product.category 
    ? `${product.category}${product.subcategory ? ` > ${product.subcategory}` : ''}`
    : 'Categoria não definida';

  const handleExportAIPlaybook = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-product-ai-playbook', {
        body: { productId: product.id, format: 'both' }
      });

      if (error) throw error;

      // Create and download JSON file
      if (data.json) {
        const jsonBlob = new Blob([JSON.stringify(data.json, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `${data.metadata.filename_base}.json`;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);
        URL.revokeObjectURL(jsonUrl);
      }

      // Create and download TXT file
      if (data.txt) {
        const txtBlob = new Blob([data.txt], { type: 'text/plain' });
        const txtUrl = URL.createObjectURL(txtBlob);
        const txtLink = document.createElement('a');
        txtLink.href = txtUrl;
        txtLink.download = `${data.metadata.filename_base}.txt`;
        document.body.appendChild(txtLink);
        txtLink.click();
        document.body.removeChild(txtLink);
        URL.revokeObjectURL(txtUrl);
      }

      toast({
        title: "Export concluído",
        description: "Arquivos AI Playbook baixados com sucesso",
      });

    } catch (error) {
      console.error('Error exporting AI playbook:', error);
      toast({
        variant: "destructive",
        title: "Erro no export",
        description: "Não foi possível exportar o playbook do produto",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExtractGoogleMerchant = async () => {
    if (!product.product_url) {
      toast({
        variant: "destructive",
        title: "URL não configurada",
        description: "Configure a URL do produto antes de extrair dados Google Merchant",
      });
      return;
    }

    setIsExtractingMerchant(true);
    try {
      const result = await extractAndSaveProductSEO(product.id, product.product_url);
      
      if (result.success && result.extractedCount && result.extractedCount > 0) {
        toast({
          title: "✅ Dados extraídos com sucesso",
          description: `${result.extractedCount} campos Google Merchant foram atualizados`,
        });
        
        // Refresh product data
        if (onProductUpdate) {
          onProductUpdate();
        }
      }
    } catch (error) {
      console.error('Error extracting Google Merchant data:', error);
    } finally {
      setIsExtractingMerchant(false);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "group relative transition-all duration-200 hover:shadow-md hover:scale-[1.01] p-5",
          isSelected && "ring-2 ring-primary shadow-lg",
          score.percentage < 50 && "border-destructive/20",
          score.percentage >= 90 && "border-success/20"
        )}
      >
      <div className="flex items-center gap-5">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(product.id)}
          className="flex-shrink-0"
        />

        {/* Imagem - aumentada para 80px */}
        {(() => {
          const effectiveImageUrl = product.image_url || 
            (Array.isArray(product.images_gallery) && product.images_gallery.length > 0 
              ? product.images_gallery[0]?.url 
              : null);
          
          return effectiveImageUrl ? (
            <OptimizedImage
              src={effectiveImageUrl}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-md flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-md bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
          );
        })()}

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 flex-1">
              {product.name}
            </h3>
            {product.variations && Array.isArray(product.variations) && product.variations.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs shrink-0 cursor-help">
                      {product.variations.length} variações
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-xs mb-2">Variações:</p>
                      {product.variations.slice(0, 6).map((v, i) => (
                        <p key={i} className="text-xs">• {v.name}</p>
                      ))}
                      {product.variations.length > 6 && (
                        <p className="text-xs text-muted-foreground mt-1">+{product.variations.length - 6} mais</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {product.technical_documents && product.technical_documents.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1 ml-2 shrink-0 cursor-help">
                      <FileText className="h-3 w-3" />
                      {product.technical_documents.length} {product.technical_documents.length === 1 ? 'Doc' : 'Docs'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-xs mb-2">Documentos Técnicos Sistema B:</p>
                      {product.technical_documents.slice(0, 3).map(doc => (
                        <p key={doc.id} className="text-xs">• {doc.nome}</p>
                      ))}
                      {product.technical_documents.length > 3 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          +{product.technical_documents.length - 3} mais...
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
            {categoryPath}
          </p>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
              {product.description}
            </p>
          )}
          {/* Badge de ID da Loja Integrada */}
          {product.original_data?.li_product_id && (
            <div className="mt-2.5">
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 h-5"
                title="ID do Produto na Loja Integrada"
              >
                LI: {product.original_data.li_product_id}
              </Badge>
            </div>
          )}
        </div>

        {/* Separador visual */}
        <div className="h-16 w-px bg-border/30 flex-shrink-0" />

        {/* Score compacto */}
        <div className="flex-shrink-0">
          <div className={cn(
            "rounded-lg p-2 transition-all",
            score.percentage >= 90 && "bg-success/10",
            score.percentage >= 50 && score.percentage < 90 && "bg-warning/10",
            score.percentage < 50 && "bg-destructive/10"
          )}>
            <ProductScoreIndicator score={score} size="md" />
          </div>
        </div>

        {/* Separador visual */}
        <div className="h-16 w-px bg-border/30 flex-shrink-0" />

        {/* Preço (se disponível) */}
        {(product.price !== undefined && product.price !== null) && (
          <div className="flex-shrink-0">
            {product.promo_price && product.promo_price > 0 && product.promo_price < product.price ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-primary">
                    {formatPrice(product.promo_price, product.currency)}
                  </span>
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                    Oferta
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground/70 line-through font-medium">
                  {formatPrice(product.price, product.currency)}
                </span>
              </div>
            ) : (
              <span className="font-semibold text-lg">
                {formatPrice(product.price, product.currency)}
              </span>
            )}
          </div>
        )}

        {/* Separador visual */}
        <div className="h-16 w-px bg-border/30 flex-shrink-0" />

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0">
          <TooltipProvider>
          {product.product_url && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar/Atualizar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExtractGoogleMerchant}
                    disabled={isExtractingMerchant}
                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Extrair Dados Google Merchant</TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportAIPlaybook}
                disabled={isExporting}
                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
              >
                <Database className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar AI Playbook</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGoogleAdsModal(true)}
                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
              >
                <Target className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Google Ads</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBlogModal(true)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar Blog IA</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWhatsAppModal(true)}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar Mensagem WhatsApp</TooltipContent>
          </Tooltip>
          {productCoupon && productCoupon.allow_promotions && product.price && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWhatsAppPromoModal(true)}
                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center">%</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mensagem Promocional com Cupom</TooltipContent>
            </Tooltip>
          )}
          {product.promo_price && product.promo_price > 0 && product.price && product.promo_price < product.price && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWhatsAppPromoVariationModal(true)}
                  className="h-8 w-8 p-0 text-orange-700 hover:text-orange-800 relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 bg-orange-700 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">💰</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp Promo (De/Por)</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWhatsAppSequenceModal(true)}
                className="h-8 w-8 p-0 text-green-700 hover:text-green-800 relative"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-green-700 text-white text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center">7</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sequência 7 Mensagens</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowYouTubeModal(true)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <PlayCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar YouTube</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstagramModal(true)}
                className="h-8 w-8 p-0 text-pink-600 hover:text-pink-700"
              >
                <Instagram className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar Copy Instagram</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTikTokModal(true)}
                className="h-8 w-8 p-0 text-gray-900 hover:text-black"
              >
                <TikTokIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gerar Conteúdo TikTok</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(product)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar Produto</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTechnicalSpecs(true)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Especificações Técnicas</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEcommerceModal(true)}
                className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descrição E-commerce</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(product.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir Produto</TooltipContent>
          </Tooltip>
          </TooltipProvider>
        </div>
      </div>

    </Card>

      {/* Modal de Geração de Blog */}
      <ProductBlogGeneratorModal
        open={showBlogModal}
        onOpenChange={setShowBlogModal}
        product={product}
        onBlogGenerated={() => {
          onProductUpdate?.();
          // Modal não fecha automaticamente para mostrar resultado
        }}
      />

      {/* Modal de Geração WhatsApp */}
      <WhatsAppMessageGenerator
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        productId={product.id}
        productName={product.name}
      />

      {/* Modal de Sequência WhatsApp */}
      <WhatsAppSequenceGenerator
        productId={product.id}
        productName={product.name}
        isOpen={showWhatsAppSequenceModal}
        onClose={() => setShowWhatsAppSequenceModal(false)}
      />

      {/* Modal de Geração YouTube */}
      <YouTubeDescriptionGenerator
        isOpen={showYouTubeModal}
        onClose={() => setShowYouTubeModal(false)}
        productId={product.id}
        productName={product.name}
      />

      {/* Modal de Geração Instagram */}
      <InstagramCopyGenerator
        isOpen={showInstagramModal}
        onClose={() => setShowInstagramModal(false)}
        productId={product.id}
        productName={product.name}
        productPrice={product.price}
        productCategory={product.category}
        productImages={[
          ...(product.image_url ? [{ url: product.image_url, alt: product.name }] : []),
          ...(Array.isArray(product.images_gallery) ? product.images_gallery : [])
        ]}
        productUrl={product.product_url}
        productBenefits={product.benefits}
        productFeatures={product.features}
        technicalSpecs={product.technical_specifications}
        productSalesPitch={product.sales_pitch}
      />

      {/* Modal de Geração TikTok */}
      <TikTokContentGenerator
        productId={product.id}
        productName={product.name}
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
        onProductUpdate={onProductUpdate}
      />

      {/* Modal de Google Ads */}
      <ProductGoogleAdsModal
        open={showGoogleAdsModal}
        onOpenChange={setShowGoogleAdsModal}
        product={product}
      />

      {/* Modal de Especificações Técnicas */}
      <ProductTechnicalSpecsModal
        isOpen={showTechnicalSpecs}
        onClose={() => setShowTechnicalSpecs(false)}
        productId={product.id}
        productName={product.name}
        initialSpecs={product.technical_specifications || []}
        onSave={handleSaveTechnicalSpecs}
      />

      {/* Modal WhatsApp Promo Variação (De/Por) */}
      <WhatsAppPromoVariationGenerator
        isOpen={showWhatsAppPromoVariationModal}
        onClose={() => setShowWhatsAppPromoVariationModal(false)}
        productId={product.id}
        productName={product.name}
        productPrice={product.price}
        productPromoPrice={product.promo_price}
        productCurrency={product.currency}
      />

      {/* Modal de Mensagem Promocional WhatsApp */}
      {productCoupon && productCoupon.allow_promotions && product.price && (
        <WhatsAppPromoGenerator
          isOpen={showWhatsAppPromoModal}
          onClose={() => setShowWhatsAppPromoModal(false)}
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          discountPercentage={productCoupon.discount_percentage}
          couponCode={productCoupon.coupon_code}
        />
      )}

      {/* Modal de Descrição E-commerce */}
            <ProductEcommerceGenerator
              productId={product.id}
              liProductId={product.original_data?.li_product_id}
              isOpen={showEcommerceModal}
              onClose={() => setShowEcommerceModal(false)}
              onUpdate={onProductUpdate}
            />
    </>
  );
}