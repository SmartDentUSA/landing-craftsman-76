import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Clock,
  Edit,
  FileText,
  Image,
  Video,
  Target,
  Lightbulb,
  ShoppingCart,
  Link as LinkIcon,
  Tag
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProductWithCompletion } from '@/hooks/useProductCompletion';

interface Props {
  product: ProductWithCompletion;
  onMarkComplete: (id: string, complete: boolean) => void;
  onEdit: (id: string) => void;
}

export function ProductProgressCard({ product, onMarkComplete, onEdit }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completion } = product;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'regular': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgeColor = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'bg-green-100 text-green-800';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800';
    if (days <= 90) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const timeAgo = formatDistance(product.updated_at, new Date(), { 
    addSuffix: true, 
    locale: ptBR 
  });

  const sections = [
    { key: 'basic_info', label: 'Dados Básicos', icon: FileText },
    { key: 'seo_categories', label: 'SEO & Categorização', icon: Target },
    { key: 'keywords_audience', label: 'Keywords & Público', icon: Tag },
    { key: 'images_gallery', label: 'Imagens & Galeria', icon: Image },
    { key: 'technical_specs', label: 'Especificações Técnicas', icon: Lightbulb },
    { key: 'ai_content', label: 'Conteúdo AI-Gerado', icon: Lightbulb },
    { key: 'videos', label: 'Vídeos', icon: Video },
    { key: 'ctas_resources', label: 'CTAs & Recursos', icon: LinkIcon },
    { key: 'google_merchant', label: 'Google Merchant Center', icon: ShoppingCart },
  ];

  const totalScore = Object.values(completion.score_details)
    .filter(v => typeof v === 'object' && 'score' in v)
    .reduce((sum, v: any) => sum + v.score, 0);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              
              {product.image_url && (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              
              <div>
                <h3 className="font-semibold text-lg">{product.name}</h3>
                {product.category && (
                  <p className="text-xs text-muted-foreground">
                    {product.category} {product.subcategory && `› ${product.subcategory}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-14">
              <Badge className={getStatusColor(completion.completion_status)}>
                {completion.completion_score}% - {completion.completion_status.toUpperCase()}
              </Badge>

              <Badge variant="outline" className={getAgeColor(product.updated_at)}>
                <Clock className="h-3 w-3 mr-1" />
                {timeAgo}
              </Badge>

              {product.price && (
                <Badge variant="secondary">
                  R$ {product.price.toFixed(2)}
                </Badge>
              )}

              {completion.marked_complete && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Realizado
                </Badge>
              )}
            </div>

            <div className="mt-3 ml-14">
              <Progress value={completion.completion_score} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {completion.completion_score}% completo ({totalScore}/120 pontos)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(product.id, !completion.marked_complete)}
            >
              {completion.marked_complete ? 'Desmarcar' : 'Marcar Realizado'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onEdit(product.id)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map(section => {
                const sectionData = completion.score_details[section.key as keyof typeof completion.score_details];
                if (typeof sectionData !== 'object' || !('score' in sectionData)) return null;

                const percentage = Math.round((sectionData.score / sectionData.max) * 100);
                const Icon = section.icon;

                return (
                  <div key={section.key} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{section.label}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {sectionData.score}/{sectionData.max}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                  </div>
                );
              })}
            </div>

            {completion.missing_fields.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Campos Faltantes ({completion.missing_fields.length})</h4>
                <div className="space-y-1">
                  {completion.missing_fields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Checkbox disabled checked={false} />
                      <span className="text-muted-foreground">{field}</span>
                      {completion.required_fields.includes(field) && (
                        <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 text-xs text-muted-foreground">
              <p>🔄 Última atualização: {product.updated_at.toLocaleString('pt-BR')} ({timeAgo})</p>
              <p>🔢 Última atualização de score: {new Date(completion.last_calculated_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
