import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Pencil, Bug } from 'lucide-react';
import { detectProductConfiguration, countConfiguredItems } from '@/lib/product-config-detector';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
      description: 'Descrição (mínimo 50 caracteres)',
      price: 'Preço',
      category: 'Categoria',
      subcategory: 'Subcategoria',
      main_image: 'Imagem Principal',
      gallery_min: 'Galeria (mínimo 3 imagens)',
    }
  },
  seo: {
    emoji: '🔍',
    label: 'SEO',
    fields: {
      seo_title: 'Título SEO customizado',
      seo_description: 'Meta descrição customizada',
      canonical_url: 'URL canônica',
      slug: 'URL amigável (slug)',
      has_keywords: 'Palavras-chave configuradas',
      has_target_audience: 'Público-alvo definido',
    }
  },
  keywords: {
    emoji: '🎯',
    label: 'PALAVRAS-CHAVE',
    fields: {
      primary_keywords: 'Palavras-chave principais (mínimo 3)',
      market_keywords: 'Palavras-chave de mercado (mínimo 2)',
      search_intent: 'Palavras-chave de intenção',
      audience_segmented: 'Público segmentado (mínimo 2)',
    }
  },
  images: {
    emoji: '🎨',
    label: 'IMAGENS',
    fields: {
      main_image_url: 'Imagem principal configurada',
      gallery_count: 'Galeria com 3 ou mais imagens',
      all_images_have_alt: 'Todas imagens com texto alternativo',
    }
  },
  specs: {
    emoji: '📋',
    label: 'ESPECIFICAÇÕES',
    fields: {
      technical_specs_min: 'Especificações técnicas (mínimo 5)',
      faq_min: 'Perguntas frequentes (mínimo 3)',
      dimensions: 'Dimensões (Altura × Largura × Profundidade)',
      weight: 'Peso',
      material: 'Material',
    }
  },
  ai_content: {
    emoji: '🤖',
    label: 'CONTEÚDO GERADO',
    fields: {
      benefits: 'Lista de benefícios (mínimo 3)',
      features: 'Lista de características (mínimo 3)',
      ai_keywords: 'Palavras-chave geradas automaticamente',
      ai_category: 'Categoria sugerida automaticamente',
      sales_pitch: 'Texto de venda',
      tags: 'Etiquetas (mínimo 2)',
    }
  },
  videos: {
    emoji: '🎥',
    label: 'VÍDEOS',
    fields: {
      youtube_videos: 'Vídeos do YouTube',
      instagram_videos: 'Vídeos do Instagram',
      technical_videos: 'Vídeos técnicos',
      testimonial_videos: 'Vídeos de depoimentos',
    }
  },
  ctas: {
    emoji: '🔗',
    label: 'LINKS E RECURSOS',
    fields: {
      product_url: 'Link do produto',
      resource_cta1: 'Recurso 1',
      resource_cta2: 'Recurso 2',
      resource_cta3: 'Recurso 3',
    }
  },
  merchant: {
    emoji: '🏪',
    label: 'GOOGLE MERCHANT',
    fields: {
      gtin: 'Código GTIN/EAN',
      mpn: 'Código MPN',
      brand: 'Marca',
      google_category: 'Categoria Google',
    }
  },
  ecommerce: {
    emoji: '💰',
    label: 'LOJA ONLINE',
    fields: {
      promo_price: 'Preço promocional',
      stock_managed: 'Controle de estoque ativo',
      stock_quantity: 'Quantidade disponível',
      min_order_quantity: 'Pedido mínimo',
      max_order_quantity: 'Pedido máximo',
      free_shipping: 'Frete grátis',
      ean: 'Código de barras (EAN)',
      ncm: 'Código fiscal (NCM)',
    }
  },
  social_content: {
    emoji: '📱',
    label: 'REDES SOCIAIS',
    fields: {
      whatsapp_messages: 'Mensagens para WhatsApp',
      whatsapp_sequences: 'Fluxos de conversa WhatsApp',
      instagram_copies: 'Textos para Instagram',
      youtube_descriptions: 'Descrições de vídeos',
      tiktok_content: 'Scripts para TikTok',
    }
  },
  additional_content: {
    emoji: '📚',
    label: 'MATERIAIS EXTRAS',
    fields: {
      individual_blog: 'Artigo de blog próprio',
      tutorial_resources: 'Tutoriais e guias',
      bot_trigger_words: 'Palavras-chave para chatbot',
    }
  },
  cs_messages: {
    emoji: '💬',
    label: 'ATENDIMENTO AO CLIENTE',
    fields: {
      has_cs_messages: 'Tem mensagens automáticas',
      has_active_cs_messages: 'Tem mensagens ativas',
      cs_messages_count: 'Pelo menos 3 mensagens ativas',
    }
  },
  aftersales_messages: {
    emoji: '🎁',
    label: 'PÓS-VENDA',
    fields: {
      has_aftersales_messages: 'Tem mensagens pós-compra',
      has_active_aftersales_messages: 'Tem mensagens ativas',
      aftersales_messages_count: 'Pelo menos 3 mensagens ativas',
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
  const { data: csMessages = [] } = useQuery({
    queryKey: ['cs-messages', product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('cs_messages')
        .select('*')
        .eq('product_id', product.id);
      return data || [];
    },
  });

  const { data: aftersalesMessages = [] } = useQuery({
    queryKey: ['aftersales-messages', product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('aftersales_messages')
        .select('*')
        .eq('product_id', product.id);
      return data || [];
    },
  });

  const status = detectProductConfiguration(product, csMessages, aftersalesMessages);
  const counts = countConfiguredItems(status);

  const debugProduct = () => {
    console.log('🐛 DEBUG - Product Raw Data:', product);
    console.log('🐛 DEBUG - CS Messages:', csMessages);
    console.log('🐛 DEBUG - Aftersales Messages:', aftersalesMessages);
    console.log('🐛 DEBUG - Detection Status:', status);
    console.log('🐛 DEBUG - Counts:', counts);
  };

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{product.name}</h3>
          <p className="text-sm text-muted-foreground">
            {product.category || 'Sem categoria'} {product.subcategory && `› ${product.subcategory}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={counts.percentage >= 80 ? 'default' : counts.percentage >= 50 ? 'secondary' : 'destructive'}>
            {counts.configured}/{counts.total}
          </Badge>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(product.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={debugProduct} title="Debug no console">
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={counts.percentage} className="h-2 mb-6" />

      {/* Simple Checklist - ALL OPEN */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
          const categoryData = status[categoryKey as keyof typeof status];
          const categoryStats = counts.byCategory[categoryKey];
          
          if (!categoryData || !categoryStats) return null;

          const bgColor = getCategoryBgColor(categoryStats.configured, categoryStats.total);

          return (
            <div key={categoryKey} className="space-y-2">
              {/* Category Header */}
              <div className="flex items-center gap-2 py-2">
                <span className="text-xl">{config.emoji}</span>
                <span className="font-semibold text-sm flex-1">{config.label}</span>
                <Badge variant="outline" className="text-xs">
                  {categoryStats.configured}/{categoryStats.total}
                </Badge>
              </div>

              {/* Fields List */}
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
            </div>
          );
        })}
      </div>
    </Card>
  );
}
