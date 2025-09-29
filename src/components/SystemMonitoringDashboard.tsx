import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, TrendingUp, Activity, Users, Clock, AlertTriangle } from 'lucide-react';
import { useSystemMonitoring } from '@/hooks/useSystemMonitoring';

export const SystemMonitoringDashboard = () => {
  const { events, metrics, loading, resolveEvent, loadRecentEvents } = useSystemMonitoring();

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse" />
              <span>Carregando métricas do sistema...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
              {getHealthIcon(metrics.systemHealth)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{metrics.systemHealth}</div>
              <p className="text-xs text-muted-foreground">
                Baseado nos últimos eventos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                Últimas 24 horas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <Activity className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Últimas 24 horas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitoramento</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ativo</div>
              <p className="text-xs text-muted-foreground">
                Sistema monitorado 24/7
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Eventos Recentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Eventos Recentes</CardTitle>
              <CardDescription>
                Últimos eventos do sistema (últimas 24 horas)
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => loadRecentEvents()}
              disabled={loading}
            >
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum evento registrado nas últimas 24 horas</p>
              </div>
            ) : (
              events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={getSeverityColor(event.severity) as any}>
                      {event.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">
                        {event.component_name} - {event.event_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </p>
                      {event.event_data.warnings && (
                        <div className="mt-1">
                          {(event.event_data.warnings as string[]).map((warning, idx) => (
                            <p key={idx} className="text-xs text-yellow-600">
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.tags.length > 0 && (
                      <div className="flex gap-1">
                        {event.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {!event.resolved && event.severity !== 'info' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveEvent(event.id)}
                        className="text-xs"
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};