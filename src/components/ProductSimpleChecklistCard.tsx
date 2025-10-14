import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Package, Search, Tag, Image, FileText, Sparkles, Video, MousePointer, ShoppingCart, Pencil } from 'lucide-react';
import { detectProductConfiguration, countConfiguredItems } from '@/lib/product-config-detector';

interface Props {
  product: any;
  onEdit?: (id: string) => void;
}

const CATEGORY_CONFIG = {
  basic: {
    emoji: '📦',
    label: 'DADOS BÁSICOS',
    icon: Package,
    fields: {
      name: 'Nome do Produto',
      description: 'Descrição (min 50 chars)',
      price: 'Preço',
      category: 'Categoria',
      subcategory: 'Subcategoria',
      main_image: 'Imagem Principal',
      gallery_min: 'Galeria (min 3 imagens)',
    }
  },
  seo: {
    emoji: '🎯',
    label: 'SEO & CATEGORIZAÇÃO',
    icon: Search,
    fields: {
      seo_title: 'Título SEO',
      seo_description: 'Descrição SEO',
      canonical_url: 'URL Canônica',
      slug: 'Slug/URL amigável',
      has_keywords: 'Keywords configuradas',
      has_target_audience: 'Público-alvo definido',
    }
  },
  keywords: {
    emoji: '🔑',
    label: 'KEYWORDS & PÚBLICO',
    icon: Tag,
    fields: {
      primary_keywords: 'Keywords primárias (min 3)',
      market_keywords: 'Market keywords (min 2)',
      search_intent: 'Search intent keywords',
      audience_segmented: 'Público segmentado (min 2)',
    }
  },
  images: {
    emoji: '🎨',
    label: 'IMAGENS & GALERIA',
    icon: Image,
    fields: {
      main_image_url: 'Imagem principal configurada',
      gallery_count: 'Galeria com 3+ imagens',
      all_images_have_alt: 'Todas imagens com alt text',
    }
  },
  specs: {
    emoji: '📊',
    label: 'ESPECIFICAÇÕES TÉCNICAS',
    icon: FileText,
    fields: {
      technical_specs_min: 'Especificações técnicas (min 5)',
      faq_min: 'FAQ (min 3 perguntas)',
      dimensions: 'Dimensões (A×L×P)',
      weight: 'Peso',
      material: 'Material',
    }
  },
  ai_content: {
    emoji: '🤖',
    label: 'CONTEÚDO AI',
    icon: Sparkles,
    fields: {
      benefits: 'Benefícios (min 3)',
      features: 'Características (min 3)',
      ai_keywords: 'Keywords geradas por AI',
      ai_category: 'Categoria gerada por AI',
      sales_pitch: 'Sales Pitch',
      tags: 'Tags (min 2)',
    }
  },
  videos: {
    emoji: '🎬',
    label: 'VÍDEOS',
    icon: Video,
    fields: {
      youtube_videos: 'Vídeos YouTube',
      instagram_videos: 'Vídeos Instagram',
      technical_videos: 'Vídeos Técnicos',
      testimonial_videos: 'Vídeos de Depoimentos',
    }
  },
  ctas: {
    emoji: '🔗',
    label: 'CTAs & RECURSOS',
    icon: MousePointer,
    fields: {
      product_url: 'URL do Produto',
      resource_cta1: 'CTA Recurso 1',
      resource_cta2: 'CTA Recurso 2',
      resource_cta3: 'CTA Recurso 3',
    }
  },
  merchant: {
    emoji: '🏪',
    label: 'GOOGLE MERCHANT',
    icon: ShoppingCart,
    fields: {
      gtin: 'GTIN/EAN',
      mpn: 'MPN',
      brand: 'Marca',
      google_category: 'Categoria Google',
    }
  },
};

const getCategoryBgColor = (configured: number, total: number) => {
  const pct = (configured / total) * 100;
  if (pct >= 80) return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
  if (pct >= 50) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900';
  return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
};

export function ProductSimpleChecklistCard({ product, onEdit }: Props) {
  const status = detectProductConfiguration(product);
  const counts = countConfiguredItems(status);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{product.name}</h3>
          <p className="text-sm text-muted-foreground">
            {product.category || 'Sem categoria'} {product.subcategory && `› ${product.subcategory}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={counts.percentage >= 80 ? 'default' : counts.percentage >= 50 ? 'secondary' : 'destructive'}>
            {counts.configured}/{counts.total} itens
          </Badge>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(product.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <Progress value={counts.percentage} className="h-2 mb-6" />

      <div className="space-y-3">
        {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
          const categoryData = status[categoryKey as keyof typeof status];
          const categoryStats = counts.byCategory[categoryKey];
          const bgColor = getCategoryBgColor(categoryStats.configured, categoryStats.total);

          return (
            <div key={categoryKey} className={`border rounded-lg p-4 ${bgColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{config.emoji}</span>
                <span className="font-semibold text-sm">{config.label}</span>
                <Badge variant="outline" className="ml-auto">
                  {categoryStats.configured}/{categoryStats.total}
                </Badge>
              </div>

              <div className="space-y-1.5">
                {Object.entries(config.fields).map(([fieldKey, fieldLabel]) => {
                  const isConfigured = categoryData[fieldKey as keyof typeof categoryData];
                  
                  return (
                    <div key={fieldKey} className="flex items-center gap-2">
                      {isConfigured ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${isConfigured ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {fieldLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
