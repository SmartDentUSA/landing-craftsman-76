import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, RotateCcw } from 'lucide-react';

interface ScoreFiltersProps {
  scoreFilter: string;
  onScoreFilterChange: (value: string) => void;
  fieldFilter: string;
  onFieldFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
  productCounts: {
    complete: number;
    good: number;
    regular: number;
    critical: number;
    total: number;
  };
  onClearFilters: () => void;
}

export function ScoreFilters({
  scoreFilter,
  onScoreFilterChange,
  fieldFilter,
  onFieldFilterChange,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  productCounts,
  onClearFilters
}: ScoreFiltersProps) {
  
  const missingFieldOptions = [
    { value: 'all', label: 'Todos os Campos' },
    { value: 'image', label: 'Sem Imagem' },
    { value: 'description', label: 'Sem Descrição' },
    { value: 'keywords', label: 'Sem Keywords' },
    { value: 'benefits', label: 'Sem Benefícios' },
    { value: 'features', label: 'Sem Características' },
    { value: 'target_audience', label: 'Sem Público-alvo' },
    { value: 'sales_pitch', label: 'Sem Pitch de Vendas' },
    { value: 'videos', label: 'Sem Vídeos' },
    { value: 'product_url', label: 'Sem URL do Produto' },
    { value: 'price', label: 'Sem Preço' }
  ];

  const hasActiveFilters = scoreFilter !== 'all' || fieldFilter !== 'all' || categoryFilter !== 'all' || searchTerm.trim() !== '';

  return (
    <div className="space-y-4">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-foreground">{productCounts.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-success">{productCounts.complete}</div>
          <div className="text-xs text-success/80">Completos (&ge;90%)</div>
        </div>
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-warning">{productCounts.good}</div>
          <div className="text-xs text-warning/80">Bons (70-89%)</div>
        </div>
        <div className="bg-secondary/50 border rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-secondary-foreground">{productCounts.regular}</div>
          <div className="text-xs text-muted-foreground">Regulares (50-69%)</div>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-destructive">{productCounts.critical}</div>
          <div className="text-xs text-destructive/80">Críticos (&lt;50%)</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select value={scoreFilter} onValueChange={onScoreFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Scores</SelectItem>
            <SelectItem value="complete">Completos (&ge;90%)</SelectItem>
            <SelectItem value="good">Bons (70-89%)</SelectItem>
            <SelectItem value="regular">Regulares (50-69%)</SelectItem>
            <SelectItem value="critical">Críticos (&lt;50%)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fieldFilter} onValueChange={onFieldFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Campos em Falta" />
          </SelectTrigger>
          <SelectContent>
            {missingFieldOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {categories.filter(category => category && category.trim() !== '').map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Limpar Filtros
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {scoreFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              Score: {scoreFilter}
            </Badge>
          )}
          {fieldFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              Campo: {missingFieldOptions.find(opt => opt.value === fieldFilter)?.label}
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              Categoria: {categoryFilter}
            </Badge>
          )}
          {searchTerm.trim() && (
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" />
              Busca: "{searchTerm}"
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}