import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { detectProductConfiguration, countConfiguredItems } from '@/lib/product-config-detector';
import { useState, useMemo } from 'react';

interface Props {
  product: any;
  onEdit?: (id: string) => void;
}

const CATEGORY_CONFIG = {
  basic: {
    emoji: '📦',
    label: 'DADOS BÁSICOS',
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
    fields: {
      main_image_url: 'Imagem principal configurada',
      gallery_count: 'Galeria com 3+ imagens',
      all_images_have_alt: 'Todas imagens com alt text',
    }
  },
  specs: {
    emoji: '📊',
    label: 'ESPECIFICAÇÕES TÉCNICAS',
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
    fields: {
      gtin: 'GTIN/EAN',
      mpn: 'MPN',
      brand: 'Marca',
      google_category: 'Categoria Google',
    }
  },
  ecommerce: {
    emoji: '💰',
    label: 'E-COMMERCE',
    fields: {
      promo_price: 'Preço promocional',
      stock_managed: 'Controle de estoque ativo',
      stock_quantity: 'Quantidade em estoque',
      min_order_quantity: 'Quantidade mínima',
      max_order_quantity: 'Quantidade máxima',
      free_shipping: 'Frete grátis',
      ean: 'Código EAN',
      ncm: 'Código NCM',
    }
  },
  social_content: {
    emoji: '📱',
    label: 'CONTEÚDO SOCIAL',
    fields: {
      whatsapp_messages: 'Mensagens WhatsApp',
      whatsapp_sequences: 'Sequências WhatsApp',
      instagram_copies: 'Copies Instagram',
      youtube_descriptions: 'Descrições YouTube',
      tiktok_content: 'Conteúdo TikTok',
    }
  },
  additional_content: {
    emoji: '📝',
    label: 'CONTEÚDO ADICIONAL',
    fields: {
      individual_blog: 'Blog individual do produto',
      tutorial_resources: 'Recursos e tutoriais',
      bot_trigger_words: 'Palavras-gatilho para bot',
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

  // Determina qual categoria tem mais pendências para expandir por padrão
  const categoryWithMostPending = useMemo(() => {
    const pending = Object.entries(counts.byCategory).map(([key, stats]) => ({
      key,
      pending: stats.total - stats.configured
    }));
    pending.sort((a, b) => b.pending - a.pending);
    return pending[0]?.key || 'basic';
  }, [counts.byCategory]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([categoryWithMostPending])
  );

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

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

      <div className="space-y-2">
        {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
          const categoryData = status[categoryKey as keyof typeof status];
          const categoryStats = counts.byCategory[categoryKey];
          const bgColor = getCategoryBgColor(categoryStats.configured, categoryStats.total);
          const isExpanded = expandedCategories.has(categoryKey);

          return (
            <Collapsible
              key={categoryKey}
              open={isExpanded}
              onOpenChange={() => toggleCategory(categoryKey)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="text-xl">{config.emoji}</span>
                  <span className="font-semibold text-sm flex-1 text-left">{config.label}</span>
                  <Badge variant="outline">
                    {categoryStats.configured}/{categoryStats.total}
                  </Badge>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2">
                <div className={`border rounded-lg p-3 ${bgColor}`}>
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
                          <span className={`text-xs ${isConfigured ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {fieldLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}
