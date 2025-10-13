import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductCompletion } from '@/hooks/useProductCompletion';
import { ProductProgressStats } from './ProductProgressStats';
import { ProductProgressCard } from './ProductProgressCard';

export function ProductProgressManager() {
  const navigate = useNavigate();
  
  const { 
    data, 
    isLoading, 
    filters, 
    setFilters, 
    stats, 
    markAsComplete, 
    refresh 
  } = useProductCompletion();

  const handleEditProduct = (id: string) => {
    navigate('/repository', { 
      state: { 
        activeView: 'repository', 
        editProductId: id 
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductProgressStats stats={stats} />

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1.5 block">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome do produto..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>

        <div className="w-40">
          <label className="text-sm font-medium mb-1.5 block">Categoria</label>
          <Select 
            value={filters.category} 
            onValueChange={(v) => setFilters({ ...filters, category: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="equipamento">Equipamento</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="software">Software</SelectItem>
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
              <SelectItem value="complete">Completos</SelectItem>
              <SelectItem value="good">Bons</SelectItem>
              <SelectItem value="regular">Regulares</SelectItem>
              <SelectItem value="critical">Críticos</SelectItem>
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
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="week">Atualizados esta semana</SelectItem>
              <SelectItem value="stale_30">Sem update há 30+ dias</SelectItem>
              <SelectItem value="stale_90">Sem update há 90+ dias</SelectItem>
              <SelectItem value="abandoned">Abandonados (180+ dias)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={filters.hasVideos}
              onCheckedChange={(checked) => 
                setFilters({ ...filters, hasVideos: checked as boolean })
              }
            />
            <label className="text-sm">Com Vídeos</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={filters.seoOptimized}
              onCheckedChange={(checked) => 
                setFilters({ ...filters, seoOptimized: checked as boolean })
              }
            />
            <label className="text-sm">SEO Otimizado</label>
          </div>
        </div>

        <Button variant="outline" size="icon" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Produtos ({data.length})
          </h3>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum produto encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="space-y-3">
            {data.map(product => (
              <ProductProgressCard
                key={product.id}
                product={product}
                onMarkComplete={markAsComplete}
                onEdit={handleEditProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
