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
  Package
} from 'lucide-react';

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
}

interface ModernProductCardProps {
  product: Product;
  isSelected: boolean;
  onToggleSelection: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function ModernProductCard({
  product,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete
}: ModernProductCardProps) {
  const score = calculateProductScore(product);
  
  const formatPrice = (price?: number, currency?: string) => {
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
          <div className="mt-1">
            <CompletionBadges product={product} score={score} compact={true} />
          </div>
        </div>

        {/* Score compacto */}
        <div className="flex-shrink-0">
          <ProductScoreIndicator score={score} size="sm" />
        </div>

        {/* Preço (se disponível) */}
        {product.price && (
          <div className="flex-shrink-0 text-sm font-medium">
            {formatPrice(product.price, product.currency)}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
    </Card>
  );
}