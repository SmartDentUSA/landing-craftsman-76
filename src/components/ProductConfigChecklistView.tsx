import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, XCircle, Package, Search, Tag, Image, FileText, Sparkles, Video, MousePointer, ShoppingCart } from 'lucide-react';
import { detectProductConfiguration, countConfiguredItems } from '@/lib/product-config-detector';
import { useState } from 'react';

interface Props {
  product: any;
}

export function ProductConfigChecklistView({ product }: Props) {
  const status = detectProductConfiguration(product);
  const counts = countConfiguredItems(status);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    seo: false,
    keywords: false,
    images: false,
    specs: false,
    ai_content: false,
    videos: false,
    ctas: false,
    merchant: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      basic: Package,
      seo: Search,
      keywords: Tag,
      images: Image,
      specs: FileText,
      ai_content: Sparkles,
      videos: Video,
      ctas: MousePointer,
      merchant: ShoppingCart,
    };
    return icons[category] || Package;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      basic: 'Dados Básicos',
      seo: 'SEO & Categorização',
      keywords: 'Keywords & Público',
      images: 'Imagens & Galeria',
      specs: 'Especificações Técnicas',
      ai_content: 'Conteúdo AI',
      videos: 'Vídeos',
      ctas: 'CTAs & Recursos',
      merchant: 'Google Merchant',
    };
    return labels[category] || category;
  };

  const getFieldLabel = (category: string, field: string) => {
    const labels: Record<string, Record<string, string>> = {
      basic: {
        name: 'Nome do Produto',
        description: 'Descrição (min 50 chars)',
        price: 'Preço',
        category: 'Categoria',
        subcategory: 'Subcategoria',
        main_image: 'Imagem Principal',
        gallery_min: 'Galeria (min 3 imagens)',
      },
      seo: {
        seo_title: 'Título SEO',
        seo_description: 'Descrição SEO',
        canonical_url: 'URL Canônica',
        slug: 'Slug/URL amigável',
        has_keywords: 'Keywords configuradas',
        has_target_audience: 'Público-alvo definido',
      },
      keywords: {
        primary_keywords: 'Keywords primárias (min 3)',
        market_keywords: 'Market keywords (min 2)',
        search_intent: 'Search intent keywords',
        audience_segmented: 'Público segmentado (min 2)',
      },
      images: {
        main_image_url: 'Imagem principal configurada',
        gallery_count: 'Galeria com 3+ imagens',
        all_images_have_alt: 'Todas imagens com alt text',
      },
      specs: {
        technical_specs_min: 'Especificações técnicas (min 5)',
        faq_min: 'FAQ (min 3 perguntas)',
        dimensions: 'Dimensões (A×L×P)',
        weight: 'Peso',
        material: 'Material',
      },
      ai_content: {
        benefits: 'Benefícios (min 3)',
        features: 'Características (min 3)',
        ai_keywords: 'Keywords geradas por AI',
        ai_category: 'Categoria gerada por AI',
        sales_pitch: 'Sales Pitch',
        tags: 'Tags (min 2)',
      },
      videos: {
        youtube_videos: 'Vídeos YouTube',
        instagram_videos: 'Vídeos Instagram',
        technical_videos: 'Vídeos Técnicos',
        testimonial_videos: 'Vídeos de Depoimentos',
      },
      ctas: {
        product_url: 'URL do Produto',
        resource_cta1: 'CTA Recurso 1',
        resource_cta2: 'CTA Recurso 2',
        resource_cta3: 'CTA Recurso 3',
      },
      merchant: {
        gtin: 'GTIN/EAN',
        mpn: 'MPN',
        brand: 'Marca',
        google_category: 'Categoria Google',
      },
    };
    return labels[category]?.[field] || field;
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{product.name}</h3>
          <p className="text-sm text-muted-foreground">
            Categoria: {product.category || 'Não definida'} 
            {product.subcategory && ` › ${product.subcategory}`}
          </p>
        </div>
        <Badge variant={counts.percentage >= 80 ? 'default' : counts.percentage >= 50 ? 'secondary' : 'destructive'}>
          {counts.configured}/{counts.total} itens
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Completude</span>
          <span className="text-muted-foreground">{counts.percentage}%</span>
        </div>
        <Progress value={counts.percentage} className="h-2" />
      </div>

      <div className="space-y-2">
        {Object.entries(status).map(([category, fields]) => {
          const Icon = getCategoryIcon(category);
          const categoryCount = counts.byCategory[category];
          const isExpanded = expandedSections[category];

          return (
            <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleSection(category)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{getCategoryLabel(category)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {categoryCount.configured}/{categoryCount.total}
                    </Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2">
                <div className="ml-7 space-y-1 border-l-2 border-border pl-4 py-2">
                  {Object.entries(fields).map(([field, configured]) => (
                    <div key={field} className="flex items-center gap-2 text-sm py-1">
                      {configured ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={configured ? 'text-foreground' : 'text-muted-foreground'}>
                        {getFieldLabel(category, field)}
                      </span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}
