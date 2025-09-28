import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ProductScoreIndicator } from './ProductScoreIndicator';
import { CompletionBadges } from './CompletionBadges';
import { calculateProductScore } from './ProductScoreCalculator';
import { cn } from "@/lib/utils";
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
  Instagram
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ProductBlogGeneratorModal } from "./ProductBlogGeneratorModal";
import { WhatsAppMessageGenerator } from "./WhatsAppMessageGenerator";
import { YouTubeDescriptionGenerator } from "./YouTubeDescriptionGenerator";
import { InstagramCopyGenerator } from "./InstagramCopyGenerator";
import { TikTokContentGenerator } from "./TikTokContentGenerator";
import { useState } from "react";

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
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  tiktok_videos?: any[];
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
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const score = calculateProductScore(product);
  
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

  return (
    <Card 
      className={cn(
        "group relative transition-all duration-200 hover:shadow-md p-4",
        isSelected && "ring-2 ring-primary shadow-lg",
        score.percentage < 50 && "border-destructive/20",
        score.percentage >= 90 && "border-success/20"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(product.id)}
          className="flex-shrink-0"
        />

        {/* Imagem pequena */}
        {product.image_url ? (
          <OptimizedImage
            src={product.image_url}
            alt={product.name}
            className="w-12 h-12 object-cover rounded-md flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight truncate">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {categoryPath}
          </p>
          {product.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {product.description}
            </p>
          )}
          <div className="mt-1 space-y-1">
            <CompletionBadges product={product} score={score} compact={true} />
            
            {/* Status and Section Badges */}
            <div className="flex flex-wrap gap-1">
              {/* Approval Status */}
              <Badge 
                variant={product.approved ? "default" : "destructive"}
                className="text-xs px-1.5 py-0.5 h-5"
              >
                {product.approved ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Aprovado
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Pendente
                  </>
                )}
              </Badge>

              {/* Landing Page Sections */}
              {product.show_in_resources && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                  <Download className="h-3 w-3 mr-1" />
                  Recursos
                </Badge>
              )}
              
              {product.selected && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Ofertas
                </Badge>
              )}
              
              {/* Blog Status */}
              {(product.individual_blog_content?.commercial || product.individual_blog_content?.technical) && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                  <FileText className="h-3 w-3 mr-1" />
                  {product.individual_blog_content?.commercial && product.individual_blog_content?.technical 
                    ? '2 Blogs' 
                    : '1 Blog'}
                </Badge>
              )}
              
              {/* Active CTAs Count */}
              {product.show_in_resources && (
                (() => {
                  const activeCTAs = [
                    product.resource_cta1?.visible,
                    product.resource_cta2?.visible,
                    product.resource_cta3?.visible
                  ].filter(Boolean).length;
                  
                  return activeCTAs > 0 ? (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                      {activeCTAs} CTA{activeCTAs > 1 ? 's' : ''}
                    </Badge>
                  ) : null;
                })()
              )}
            </div>
          </div>
        </div>

        {/* Score compacto */}
        <div className="flex-shrink-0">
          <ProductScoreIndicator score={score} size="sm" />
        </div>

        {/* Preço (se disponível) */}
        {(product.price !== undefined && product.price !== null) && (
          <div className="flex-shrink-0 text-sm font-medium">
            {formatPrice(product.price, product.currency)}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBlogModal(true)}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
            title="Gerar Blog IA"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWhatsAppModal(true)}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            title="Gerar WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowYouTubeModal(true)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            title="Gerar YouTube"
          >
            <PlayCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstagramModal(true)}
            className="h-8 w-8 p-0 text-pink-600 hover:text-pink-700"
            title="Gerar Copy Instagram"
          >
            <Instagram className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTikTokModal(true)}
            className="h-8 w-8 p-0 text-gray-900 hover:text-black"
            title="Gerar Conteúdo TikTok"
          >
            <span className="text-lg font-bold">🎵</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(product)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
      />

      {/* Modal de Geração TikTok */}
      <TikTokContentGenerator
        productId={product.id}
        productName={product.name}
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
      />
    </Card>
  );
}