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
  MessageSquare,
  HelpCircle,
  Mail,
  Footprints,
  Target,
  Lightbulb,
  Monitor,
  Gift
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LandingPageWithCompletion } from '@/hooks/useLandingPageCompletion';

interface Props {
  landingPage: LandingPageWithCompletion;
  onMarkComplete: (id: string, complete: boolean) => void;
  onEdit: (id: string) => void;
}

export function LandingPageProgressCard({ landingPage, onMarkComplete, onEdit }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completion } = landingPage;

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

  const timeAgo = formatDistance(landingPage.last_modified, new Date(), { 
    addSuffix: true, 
    locale: ptBR 
  });

  const sections = [
    { key: 'basic_info', label: 'Informações Básicas', icon: FileText },
    { key: 'seo', label: 'SEO & Meta Tags', icon: Target },
    { key: 'hero', label: 'Hero Section', icon: Image },
    { key: 'video', label: 'Vídeo Explicativo', icon: Video },
    { key: 'solutions', label: 'Soluções', icon: Lightbulb },
    { key: 'desktop_info', label: 'Desktop Info', icon: Monitor },
    { key: 'resources', label: 'Recursos & Ofertas', icon: Gift },
    { key: 'advisory', label: 'Consultoria', icon: MessageSquare },
    { key: 'faq', label: 'FAQ', icon: HelpCircle },
    { key: 'cta_final', label: 'CTA Final', icon: Target },
    { key: 'footer', label: 'Footer', icon: Footprints },
    { key: 'email', label: 'Template Email', icon: Mail },
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
              <h3 className="font-semibold text-lg">{landingPage.name}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-8">
              <Badge className={getStatusColor(completion.completion_status)}>
                {completion.completion_score}% - {completion.completion_status.toUpperCase()}
              </Badge>

              <Badge variant="outline" className={getAgeColor(landingPage.last_modified)}>
                <Clock className="h-3 w-3 mr-1" />
                {timeAgo}
              </Badge>

              <Badge variant="outline">
                {landingPage.status}
              </Badge>

              {completion.score_details.linked_products.count > 0 && (
                <Badge variant="secondary">
                  {completion.score_details.linked_products.count} produto(s)
                </Badge>
              )}

              {completion.score_details.has_blog && (
                <Badge variant="default">
                  <FileText className="h-3 w-3 mr-1" />
                  Blog publicado
                </Badge>
              )}

              {completion.marked_complete && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Realizado
                </Badge>
              )}
            </div>

            <div className="mt-3 ml-8">
              <Progress value={completion.completion_score} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {completion.completion_score}% completo ({totalScore}/165 pontos)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(landingPage.id, !completion.marked_complete)}
            >
              {completion.marked_complete ? 'Desmarcar' : 'Marcar Realizado'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onEdit(landingPage.id)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p>📅 Criado em: {landingPage.last_modified.toLocaleDateString('pt-BR')}</p>
              <p>🔄 Última edição: {landingPage.last_modified.toLocaleString('pt-BR')} ({timeAgo})</p>
              <p>🔢 Última atualização de score: {new Date(completion.last_calculated_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
