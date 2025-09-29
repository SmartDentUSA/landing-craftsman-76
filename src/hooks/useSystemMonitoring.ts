import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MonitoringEvent {
  id: string;
  event_type: string;
  component_name: string;
  event_data: Record<string, any>;
  performance_data: Record<string, any>;
  user_id?: string;
  session_id?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
  tags: string[];
}

export interface SystemMetrics {
  totalEvents: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export const useSystemMonitoring = () => {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadRecentEvents = async (hours: number = 24) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_monitoring')
        .select('*')
        .gte('timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const processedEvents = (data || []).map(item => ({
        ...item,
        event_data: typeof item.event_data === 'object' && item.event_data !== null 
          ? item.event_data as Record<string, any>
          : {},
        performance_data: typeof item.performance_data === 'object' && item.performance_data !== null 
          ? item.performance_data as Record<string, any>
          : {},
        tags: Array.isArray(item.tags) 
          ? item.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        severity: item.severity as 'info' | 'warning' | 'error' | 'critical'
      })) as MonitoringEvent[];
      
      setEvents(processedEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar os eventos de monitoramento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async () => {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Total de eventos nas últimas 24h
      const { count: totalEvents } = await supabase
        .from('system_monitoring')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', last24h);

      // Eventos de erro
      const { count: errorEvents } = await supabase
        .from('system_monitoring')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', last24h)
        .in('severity', ['error', 'critical']);

      const errorRate = totalEvents ? (errorEvents || 0) / totalEvents : 0;
      
      // Determinar health do sistema
      let systemHealth: SystemMetrics['systemHealth'] = 'excellent';
      if (errorRate > 0.1) systemHealth = 'critical';
      else if (errorRate > 0.05) systemHealth = 'warning';
      else if (errorRate > 0.01) systemHealth = 'good';

      setMetrics({
        totalEvents: totalEvents || 0,
        errorRate: errorRate * 100,
        avgResponseTime: 0, // Será calculado quando tivermos dados de performance
        activeUsers: 0, // Será implementado com sessões
        systemHealth
      });
    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
    }
  };

  const logEvent = async (
    eventType: string,
    componentName: string,
    eventData: Record<string, any> = {},
    severity: MonitoringEvent['severity'] = 'info',
    tags: string[] = []
  ) => {
    try {
      const { error } = await supabase
        .from('system_monitoring')
        .insert({
          event_type: eventType,
          component_name: componentName,
          event_data: eventData,
          severity,
          tags,
          session_id: sessionStorage.getItem('session_id') || undefined
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao registrar evento:', error);
    }
  };

  const resolveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('system_monitoring')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, resolved: true } : event
      ));
    } catch (error) {
      console.error('Erro ao resolver evento:', error);
      toast({
        title: "Erro ao resolver evento",
        description: "Não foi possível marcar o evento como resolvido.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadRecentEvents();
    calculateMetrics();
    
    // Atualizar métricas a cada 5 minutos
    const interval = setInterval(() => {
      calculateMetrics();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    events,
    metrics,
    loading,
    loadRecentEvents,
    calculateMetrics,
    logEvent,
    resolveEvent
  };
};