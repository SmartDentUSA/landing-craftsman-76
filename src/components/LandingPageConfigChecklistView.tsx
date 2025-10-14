import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  FileText,
  Target,
  Image,
  Video,
  Lightbulb,
  Monitor,
  MessageSquare,
  HelpCircle,
  Mail,
  Footprints,
  Gift,
  MousePointerClick
} from 'lucide-react';
import { useState } from 'react';
import type { LandingPageWithCompletion } from '@/hooks/useLandingPageCompletion';
import { 
  detectLandingPageConfiguration, 
  countConfiguredItems,
  type LandingPageConfigStatus 
} from '@/lib/landing-page-config-detector';

interface Props {
  landingPage: LandingPageWithCompletion;
}

const CATEGORY_CONFIG = {
  basic: { 
    label: 'Informações Básicas', 
    icon: FileText, 
    color: 'text-blue-600',
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
    label: 'Banner/Hero', 
    icon: Image, 
    color: 'text-purple-600',
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
    label: 'SEO & Meta Tags', 
    icon: Target, 
    color: 'text-green-600',
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
    label: 'Vídeo Explicativo', 
    icon: Video, 
    color: 'text-red-600',
    fields: {
      selected: 'Vídeo selecionado',
      valid_url: 'URL do vídeo válida',
      title: 'Título do vídeo',
      description: 'Descrição do vídeo',
    }
  },
  solutions: { 
    label: 'Soluções', 
    icon: Lightbulb, 
    color: 'text-yellow-600',
    fields: {
      count_min: 'Quantidade (mínimo 3)',
      all_titles: 'Todas com títulos',
      all_texts: 'Todas com textos descritivos',
      all_images: 'Todas com imagens',
      display_order: 'Ordem de exibição definida',
    }
  },
  desktop_info: { 
    label: 'Desktop Info', 
    icon: Monitor, 
    color: 'text-cyan-600',
    fields: {
      title: 'Título da seção',
      text_length: 'Texto descritivo (min 100 chars)',
      has_table: 'Tabela de especificações',
      table_headers: 'Headers da tabela',
      visibility: 'Visibilidade desktop/mobile',
    }
  },
  advisory: { 
    label: 'Consultoria', 
    icon: MessageSquare, 
    color: 'text-indigo-600',
    fields: {
      title: 'Título da seção',
      paragraph: 'Parágrafo descritivo',
      image: 'Imagem da consultoria',
      cta: 'CTA da consultoria',
      visibility: 'Visibilidade desktop/mobile',
    }
  },
  faq: { 
    label: 'FAQ', 
    icon: HelpCircle, 
    color: 'text-orange-600',
    fields: {
      title: 'Título da seção FAQ',
      count_min: 'Perguntas (mínimo 5)',
      has_schema: 'Estrutura Schema FAQ',
      visibility: 'Visibilidade desktop/mobile',
    }
  },
  cta_final: { 
    label: 'CTA Final', 
    icon: MousePointerClick, 
    color: 'text-pink-600',
    fields: {
      title: 'Título do CTA Final',
      paragraph: 'Parágrafo de conversão',
      primary_configured: 'CTA primário configurado',
      secondary_configured: 'CTA secundário configurado',
    }
  },
  footer: { 
    label: 'Footer', 
    icon: Footprints, 
    color: 'text-gray-600',
    fields: {
      institutional_links: 'Links institucionais',
      policy_links: 'Links de políticas',
      legal_name: 'Nome legal da empresa',
    }
  },
  email: { 
    label: 'Template Email', 
    icon: Mail, 
    color: 'text-teal-600',
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
    label: 'Recursos & Ofertas', 
    icon: Gift, 
    color: 'text-amber-600',
    fields: {
      offers_configured: 'Ofertas configuradas',
      prices_availability: 'Preços e disponibilidade',
      offer_urls: 'URLs das ofertas',
    }
  },
};

export function LandingPageConfigChecklistView({ landingPage }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const configStatus = detectLandingPageConfiguration(landingPage);
  const summary = countConfiguredItems(configStatus);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{landingPage.name}</CardTitle>
          <Badge 
            variant={summary.percentage >= 90 ? 'default' : 'secondary'}
            className="text-lg px-3 py-1"
          >
            {summary.configured}/{summary.total} itens
          </Badge>
        </div>
        <Progress value={summary.percentage} className="h-2 mt-2" />
        <p className="text-sm text-muted-foreground mt-1">
          {summary.percentage}% configurado
        </p>
      </CardHeader>

      <CardContent className="space-y-2">
        {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
          const categoryData = configStatus[categoryKey as keyof LandingPageConfigStatus];
          const categoryStats = summary.byCategory[categoryKey];
          const Icon = config.icon;

          return (
            <Collapsible
              key={categoryKey}
              open={expandedSections.has(categoryKey)}
              onOpenChange={() => toggleSection(categoryKey)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {categoryStats.configured}/{categoryStats.total}
                    </Badge>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.has(categoryKey) ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-8 mt-2 space-y-1.5">
                  {Object.entries(config.fields).map(([fieldKey, fieldLabel]) => {
                    const isConfigured = categoryData[fieldKey as keyof typeof categoryData];
                    
                    return (
                      <div 
                        key={fieldKey}
                        className="flex items-center gap-2 p-2 rounded hover:bg-accent/50"
                      >
                        {isConfigured ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          isConfigured ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {fieldLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
