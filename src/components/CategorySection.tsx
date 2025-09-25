import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Package, Star } from 'lucide-react';
import { ModernProductCard } from './ModernProductCard';
import { calculateProductScore } from './ProductScoreCalculator';

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
  video_captions?: any;
  original_data?: any;
}

interface CategorySectionProps {
  category: string;
  products: Product[];
  selectedProductIds: Set<string>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleSelection: (productId: string) => void;
  onToggleCategorySelection: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onProductUpdate?: () => void;
}

export function CategorySection({
  category,
  products,
  selectedProductIds,
  isOpen,
  onToggleOpen,
  onToggleSelection,
  onToggleCategorySelection,
  onEditProduct,
  onDeleteProduct,
  onProductUpdate
}: CategorySectionProps) {
  const categoryIcon = category === 'Sem categoria' ? Package : Star;
  const selectedCount = products.filter(p => selectedProductIds.has(p.id)).length;
  const isAllSelected = products.length > 0 && selectedCount === products.length;
  const isSomeSelected = selectedCount > 0 && selectedCount < products.length;
  
  const averageScore = products.length > 0 
    ? products.reduce((sum, product) => sum + calculateProductScore(product).percentage, 0) / products.length
    : 0;

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    if (score >= 50) return 'outline';
    return 'destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Completo';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Regular';
    return 'Crítico';
  };

  return (
    <Card className="overflow-hidden border-border/20 shadow-soft">
      <Collapsible open={isOpen} onOpenChange={onToggleOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el && 'indeterminate' in el) {
                        (el as any).indeterminate = isSomeSelected;
                      }
                    }}
                    onCheckedChange={() => onToggleCategorySelection()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {React.createElement(categoryIcon, { className: "h-5 w-5 text-muted-foreground" })}
                  <h3 className="font-semibold text-lg">
                    {category || 'Sem categoria'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {products.length} produto{products.length !== 1 ? 's' : ''}
                </Badge>
                {selectedCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant={getScoreBadgeVariant(averageScore)} className="text-xs">
                  {getScoreLabel(averageScore)} ({Math.round(averageScore)}%)
                </Badge>
              </div>
            </div>
            <ChevronDown 
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t border-border/20">
          <div className="p-4 space-y-4">
            {products.map((product) => (
              <ModernProductCard
                key={product.id}
                product={product}
                isSelected={selectedProductIds.has(product.id)}
                onToggleSelection={() => onToggleSelection(product.id)}
                onEdit={() => onEditProduct(product)}
                onDelete={() => onDeleteProduct(product.id)}
                onProductUpdate={onProductUpdate}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}