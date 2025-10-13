import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKeywordsRepository } from '@/hooks/useKeywordsRepository';
import { BarChart3, Tag, TrendingUp, Clock } from 'lucide-react';

export function KeywordStatsDisplay() {
  const { keywords, isLoading } = useKeywordsRepository();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const statsByType = {
    primary: keywords.filter(k => k.keyword_type === 'primary').length,
    secondary: keywords.filter(k => k.keyword_type === 'secondary').length,
    long_tail: keywords.filter(k => k.keyword_type === 'long_tail').length,
    negative: keywords.filter(k => k.keyword_type === 'negative').length,
  };

  const statsByIntent = {
    informational: keywords.filter(k => k.search_intent === 'informational').length,
    commercial: keywords.filter(k => k.search_intent === 'commercial').length,
    transactional: keywords.filter(k => k.search_intent === 'transactional').length,
    navigational: keywords.filter(k => k.search_intent === 'navigational').length,
  };

  const topUsed = [...keywords]
    .filter(k => k.usage_count && k.usage_count > 0)
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 10);

  const recentlyUsed = [...keywords]
    .filter(k => k.last_used_at)
    .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Keywords por Tipo
          </CardTitle>
          <CardDescription>Classificação semântica das keywords</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{statsByType.primary}</div>
              <Badge variant="default">Primárias</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{statsByType.secondary}</div>
              <Badge variant="secondary">Secundárias</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{statsByType.long_tail}</div>
              <Badge variant="outline">Long Tail</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{statsByType.negative}</div>
              <Badge variant="destructive">Negativas</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Intenção de Busca
          </CardTitle>
          <CardDescription>Distribuição por intenção comercial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statsByIntent).map(([intent, count]) => (
              <div key={intent} className="flex items-center justify-between">
                <span className="capitalize text-sm">{intent}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${(count / keywords.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {topUsed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top 10 Mais Usadas
            </CardTitle>
            <CardDescription>Keywords com maior frequência de uso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topUsed.map((keyword, index) => (
                <div key={keyword.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">#{index + 1}</span>
                  <span className="flex-1 text-sm truncate">{keyword.name}</span>
                  <Badge variant="outline">{keyword.usage_count}x</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recentlyUsed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Usadas Recentemente
            </CardTitle>
            <CardDescription>Últimas keywords aplicadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentlyUsed.map(keyword => (
                <div key={keyword.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{keyword.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(keyword.last_used_at!).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
