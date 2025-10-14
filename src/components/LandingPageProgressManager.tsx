import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { useLandingPageCompletion } from '@/hooks/useLandingPageCompletion';
import { LandingPageProgressStats } from './LandingPageProgressStats';
import { LandingPageProgressCard } from './LandingPageProgressCard';
import { useNavigate } from 'react-router-dom';

export function LandingPageProgressManager() {
  const { 
    data, 
    isLoading, 
    filters, 
    setFilters, 
    stats, 
    markAsComplete, 
    refresh 
  } = useLandingPageCompletion();
  
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LandingPageProgressStats stats={stats} />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1.5 block">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome da landing page..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>

        <div className="w-40">
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <Select 
            value={filters.status} 
            onValueChange={(v) => setFilters({ ...filters, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="text-sm font-medium mb-1.5 block">Completude</label>
          <Select 
            value={filters.completion} 
            onValueChange={(v) => setFilters({ ...filters, completion: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="complete">Completas</SelectItem>
              <SelectItem value="good">Boas</SelectItem>
              <SelectItem value="regular">Regulares</SelectItem>
              <SelectItem value="critical">Críticas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-52">
          <label className="text-sm font-medium mb-1.5 block">Atividade</label>
          <Select 
            value={filters.activity} 
            onValueChange={(v) => setFilters({ ...filters, activity: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="week">Atualizadas esta semana</SelectItem>
              <SelectItem value="stale_30">Sem update há 30+ dias</SelectItem>
              <SelectItem value="stale_90">Sem update há 90+ dias</SelectItem>
              <SelectItem value="abandoned">Abandonadas (180+ dias)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={filters.hasProducts}
              onCheckedChange={(checked) => 
                setFilters({ ...filters, hasProducts: checked as boolean })
              }
            />
            <label className="text-sm">Com Produtos</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={filters.hasBlog}
              onCheckedChange={(checked) => 
                setFilters({ ...filters, hasBlog: checked as boolean })
              }
            />
            <label className="text-sm">Com Blog</label>
          </div>
        </div>

        <Button variant="outline" size="icon" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Landing Pages ({data.length})
          </h3>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma landing page encontrada com os filtros aplicados.
          </div>
        ) : (
          <div className="space-y-3">
            {data.map(lp => (
              <LandingPageProgressCard
                key={lp.id}
                landingPage={lp}
                onMarkComplete={markAsComplete}
                onEdit={(id) => navigate(`/?id=${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
