import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

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

export function LandingPageProgressStats({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Landing Pages</p>
        </CardContent>
      </Card>

      {/* Completude */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Por Completude</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">Completas</span>
            </div>
            <Badge variant="default">{stats.complete}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Boas</span>
            </div>
            <Badge variant="secondary">{stats.good}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Regulares</span>
            </div>
            <Badge variant="outline">{stats.regular}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm">Críticas</span>
            </div>
            <Badge variant="destructive">{stats.critical}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Atividade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Sem update há 30+ dias</span>
            </div>
            <Badge variant="outline" className="bg-orange-50">{stats.stale_30}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-600" />
              <span className="text-sm">Sem update há 90+ dias</span>
            </div>
            <Badge variant="destructive">{stats.stale_90}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.critical > 0 && (
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <strong>{stats.critical}</strong> LPs críticas precisam de atenção urgente
              </div>
            </div>
          )}
          {stats.stale_90 > 0 && (
            <div className="flex items-start gap-2 p-2 bg-orange-50 rounded mt-2">
              <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <strong>{stats.stale_90}</strong> LPs abandonadas há 3+ meses
              </div>
            </div>
          )}
          {stats.critical === 0 && stats.stale_90 === 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Tudo sob controle!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
