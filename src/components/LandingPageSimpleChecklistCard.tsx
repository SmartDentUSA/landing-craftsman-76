import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, XCircle, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import type { LandingPageWithCompletion } from '@/hooks/useLandingPageCompletion';
import { detectLandingPageConfiguration, countConfiguredItems } from '@/lib/landing-page-config-detector';
import { useState, useMemo } from 'react';

interface Props {
  landingPage: LandingPageWithCompletion;
  onEdit?: (id: string) => void;
}

const CATEGORY_CONFIG = {
  basic: {
    emoji: '📦',
    label: 'DADOS BÁSICOS',
    fields: {
      name: 'Nome da Landing Page',
      status: 'Status definido',
      template: 'Template configurado',
      recent_update: 'Atualizado nos últimos 30 dias',
      has_products: 'Produtos vinculados',
      has_blog: 'Blog gerado',
      has_embed: 'Código embed configurado',
    }
  },
  banner: {
    emoji: '🎨',
    label: 'BANNER/HERO',
    fields: {
      title: 'Título do Banner',
      subtitle: 'Subtítulo do Banner',
      badge: 'Texto do Badge',
      cta_primary_label: 'CTA Primário - Label',
      cta_primary_href: 'CTA Primário - URL',
      cta_secondary_label: 'CTA Secundário - Label',
      cta_secondary_href: 'CTA Secundário - URL',
      images_count: 'Imagens (mínimo 2)',
      images_alt: 'Alt text de todas as imagens',
    }
  },
  seo: {
    emoji: '🎯',
    label: 'SEO & META TAGS',
    fields: {
      title_length: 'SEO Title (50-60 caracteres)',
      description_length: 'SEO Description (150-160 chars)',
      canonical_url: 'URL Canônica',
      keywords_count: 'Keywords (mínimo 3)',
      og_title: 'Open Graph - Title',
      og_description: 'Open Graph - Description',
      og_image: 'Open Graph - Image',
      twitter_title: 'Twitter Card - Title',
      twitter_description: 'Twitter Card - Description',
      twitter_image: 'Twitter Card - Image',
      schema_org: 'Structured Data (Schema.org)',
      robots_meta: 'Robots Meta Tag',
    }
  },
  video: {
    emoji: '🎬',
    label: 'VÍDEO EXPLICATIVO',
    fields: {
      selected: 'Vídeo selecionado',
      valid_url: 'URL do vídeo válida',
      title: 'Título do vídeo',
      description: 'Descrição do vídeo',
    }
  },
  solutions: {
    emoji: '💡',
    label: 'SOLUÇÕES (3 BLOCOS)',
    fields: {
      count_min: 'Quantidade (mínimo 3)',
      all_titles: 'Todas com títulos',
      all_texts: 'Todas com textos descritivos',
      all_images: 'Todas com imagens',
      display_order: 'Ordem de exibição definida',
    }
  },
  desktop_info: {
    emoji: '💻',
    label: 'DESKTOP INFO',
    fields: {
      title: 'Título da seção',
      text_length: 'Texto descritivo (min 100 chars)',
      has_table: 'Tabela de especificações',
      table_headers: 'Headers da tabela',
      visibility: 'Visibilidade desktop/mobile',
    }
  },
  advisory: {
    emoji: '💬',
    label: 'CONSULTORIA',
    fields: {
      title: 'Título da seção',
      paragraph: 'Parágrafo descritivo',
      image: 'Imagem da consultoria',
      cta: 'CTA da consultoria',
      visibility: 'Visibilidade desktop/mobile',
    }
  },
  faq: {
    emoji: '❓',
    label: 'FAQ',
    fields: {
      title: 'Título da seção FAQ',
      count_min: 'Perguntas (mínimo 5)',
      has_schema: 'Estrutura Schema FAQ',
      visibility: 'Visibilidade desktop/mobile',
    }
  },
  cta_final: {
    emoji: '🎯',
    label: 'CTA FINAL',
    fields: {
      title: 'Título do CTA Final',
      paragraph: 'Parágrafo de conversão',
      primary_configured: 'CTA primário configurado',
      secondary_configured: 'CTA secundário configurado',
    }
  },
  footer: {
    emoji: '👣',
    label: 'FOOTER',
    fields: {
      institutional_links: 'Links institucionais',
      policy_links: 'Links de políticas',
      legal_name: 'Nome legal da empresa',
    }
  },
  email: {
    emoji: '📧',
    label: 'TEMPLATE EMAIL',
    fields: {
      subject: 'Assunto do email',
      main_title: 'Título principal',
      primary_cta: 'CTA primário',
      image: 'Imagem do email',
      address: 'Endereço completo',
      unsubscribe_link: 'Link de descadastro',
      logo: 'Logo do email',
    }
  },
  resources: {
    emoji: '🎁',
    label: 'RECURSOS & OFERTAS',
    fields: {
      offers_configured: 'Ofertas configuradas',
      prices_availability: 'Preços e disponibilidade',
      offer_urls: 'URLs das ofertas',
    }
  },
};

const getCategoryBgColor = (configured: number, total: number) => {
  const pct = (configured / total) * 100;
  if (pct >= 80) return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
  if (pct >= 50) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900';
  return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
};

export function LandingPageSimpleChecklistCard({ landingPage, onEdit }: Props) {
  const status = detectLandingPageConfiguration(landingPage);
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
          <h3 className="text-lg font-semibold truncate">{landingPage.name}</h3>
          <p className="text-sm text-muted-foreground">
            Status: {landingPage.status}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={counts.percentage >= 80 ? 'default' : counts.percentage >= 50 ? 'secondary' : 'destructive'}>
            {counts.configured}/{counts.total} itens
          </Badge>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(landingPage.id)}>
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
