import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ProductScoreIndicator } from './ProductScoreIndicator';
import { CompletionBadges } from './CompletionBadges';
import { calculateProductScore } from './ProductScoreCalculator';
import { 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ArrowRight,
  Package,
  DollarSign,
  ExternalLink
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

  return (
    <Card className={`
      group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1
      ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}
      ${score.percentage < 50 ? 'border-destructive/20' : ''}
      ${score.percentage >= 90 ? 'border-success/20' : ''}
    `}>
      {/* Header with Score */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(product.id)}
              className="mt-1"
            />
            
            <div className="flex-1 min-w-0">
              {/* Product Name + Score */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg leading-tight line-clamp-2 flex-1">
                  {product.name}
                </h3>
                <ProductScoreIndicator score={score} size="md" showDetails />
              </div>
              
              {/* Category Path */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <Package className="h-3 w-3" />
                {product.category && (
                  <>
                    <span>{product.category}</span>
                    {product.subcategory && (
                      <>
                        <ArrowRight className="h-3 w-3" />
                        <span>{product.subcategory}</span>
                      </>
                    )}
                  </>
                )}
                {!product.category && (
                  <span className="text-destructive">Categoria não definida</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Image */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {product.image_url ? (
              <OptimizedImage
                src={product.image_url}
                alt={product.name}
                className="w-20 h-20 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="flex-1 min-w-0">
            {product.description ? (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-destructive/80 italic">
                Descrição não fornecida
              </p>
            )}
          </div>
        </div>

        {/* Completion Badges */}
        <CompletionBadges product={product} score={score} compact />

        {/* Price and URL */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
          
          {product.product_url && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs gap-1"
              onClick={() => window.open(product.product_url, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Ver Produto
            </Button>
          )}
        </div>

        {/* AI Generation Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Usar na IA
          </span>
          <div className="flex items-center gap-2">
            {product.use_in_ai_generation ? (
              <Eye className="h-4 w-4 text-success" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}