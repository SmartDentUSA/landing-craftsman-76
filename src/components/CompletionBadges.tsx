import { Badge } from "@/components/ui/badge";
import { ScoreBreakdown } from './ProductScoreCalculator';
import { 
  Tag, 
  Users, 
  FileText, 
  Star, 
  Search, 
  TrendingUp, 
  Image, 
  Video,
  ShoppingCart,
  Hash
} from 'lucide-react';

interface Product {
  keywords?: string[];
  target_audience?: string[];
  features?: string[];
  benefits?: string[];
  search_intent_keywords?: string[];
  market_keywords?: string[];
  image_url?: string;
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  product_url?: string;
  tags?: string[];
}

interface CompletionBadgesProps {
  product: Product;
  score: ScoreBreakdown;
  compact?: boolean;
}

export function CompletionBadges({ product, score, compact = false }: CompletionBadgesProps) {
  const badges = [
    {
      icon: Tag,
      label: 'Keywords',
      count: product.keywords?.length || 0,
      present: (product.keywords?.length || 0) > 0
    },
    {
      icon: Users,
      label: 'Público',
      count: product.target_audience?.length || 0,
      present: (product.target_audience?.length || 0) > 0
    },
    {
      icon: FileText,
      label: 'Features',
      count: product.features?.length || 0,
      present: (product.features?.length || 0) > 0
    },
    {
      icon: Star,
      label: 'Benefícios',
      count: product.benefits?.length || 0,
      present: (product.benefits?.length || 0) > 0
    },
    {
      icon: Search,
      label: 'SEO Intent',
      count: product.search_intent_keywords?.length || 0,
      present: (product.search_intent_keywords?.length || 0) > 0
    },
    {
      icon: TrendingUp,
      label: 'Marketing',
      count: product.market_keywords?.length || 0,
      present: (product.market_keywords?.length || 0) > 0
    },
    {
      icon: Image,
      label: 'Imagem',
      count: product.image_url ? 1 : 0,
      present: !!product.image_url
    },
    {
      icon: Video,
      label: 'Vídeos',
      count: (product.youtube_videos?.length || 0) + 
            (product.instagram_videos?.length || 0) + 
            (product.technical_videos?.length || 0) + 
            (product.testimonial_videos?.length || 0),
      present: ((product.youtube_videos?.length || 0) + 
               (product.instagram_videos?.length || 0) + 
               (product.technical_videos?.length || 0) + 
               (product.testimonial_videos?.length || 0)) > 0
    },
    {
      icon: ShoppingCart,
      label: 'URL Produto',
      count: product.product_url ? 1 : 0,
      present: !!product.product_url
    },
    {
      icon: Hash,
      label: 'Tags',
      count: product.tags?.length || 0,
      present: (product.tags?.length || 0) > 0
    }
  ];

  if (compact) {
    // Versão compacta - apenas ícones com contadores
    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div 
              key={index}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                badge.present 
                  ? 'bg-success/10 text-success border border-success/20' 
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{badge.count}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Versão completa - badges com labels
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <Badge 
            key={index}
            variant={badge.present ? "success" : "secondary"}
            className="text-xs gap-1"
          >
            <Icon className="h-3 w-3" />
            {badge.label} {badge.count > 0 && `(${badge.count})`}
          </Badge>
        );
      })}
    </div>
  );
}