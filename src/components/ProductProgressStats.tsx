import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle2, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    complete: number;
    good: number;
    regular: number;
    critical: number;
    stale_30: number;
    stale_90: number;
  };
}

export function ProductProgressStats({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Total de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Produtos cadastrados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Status de Completude</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 text-xs">Completo</Badge>
                <span className="text-sm">{stats.complete}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 text-xs">Bom</Badge>
                <span className="text-sm">{stats.good}</span>
              </div>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Regular</Badge>
                <span className="text-sm">{stats.regular}</span>
              </div>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800 text-xs">Crítico</Badge>
                <span className="text-sm">{stats.critical}</span>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">30+ dias sem update</span>
              <Badge variant="outline" className="bg-yellow-50">
                {stats.stale_30}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">90+ dias sem update</span>
              <Badge variant="outline" className="bg-orange-50">
                {stats.stale_90}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {stats.critical > 0 ? 'Ação Necessária' : 'Tudo Certo!'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.critical > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">
                  {stats.critical} produto(s) crítico(s)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Produtos com menos de 50% de completude
              </p>
            </div>
          ) : stats.stale_90 > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-600 font-medium">
                  {stats.stale_90} produto(s) desatualizados
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sem atualização há mais de 90 dias
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  Repositório em dia!
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os produtos estão atualizados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
