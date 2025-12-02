// ============================================================================
// ProductTypeSelector v3.0 — Clinical Brain Integration
// Categorias dinâmicas do banco com criticidade, ícones e regras anti-alucinação
// ============================================================================

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  HelpCircle, X, Loader2, Search, AlertTriangle, CheckCircle, Info,
  Layers, ScanLine, Printer, Monitor, Sun, Palette, 
  FlaskConical, Wrench, GraduationCap, Lightbulb, Package
} from 'lucide-react';
import { useProductCategories, CategoryConfigItem } from '@/hooks/useProductCategories';
import { cn } from '@/lib/utils';

// Mapeamento de nomes de ícones para componentes
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Layers': Layers,
  'ScanLine': ScanLine,
  'Printer': Printer,
  'Monitor': Monitor,
  'Sun': Sun,
  'Palette': Palette,
  'FlaskConical': FlaskConical,
  'Wrench': Wrench,
  'GraduationCap': GraduationCap,
  'Lightbulb': Lightbulb,
  'Package': Package,
};

interface ProductTypeSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

// Helper: Obter cor da badge por criticidade
function getCriticalityColor(percent: number): string {
  if (percent >= 35) return 'bg-red-500/20 text-red-600 border-red-500/30';
  if (percent >= 20) return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
  return 'bg-green-500/20 text-green-600 border-green-500/30';
}

// Helper: Obter ícone de criticidade
function getCriticalityIcon(percent: number) {
  if (percent >= 35) return <AlertTriangle className="h-3 w-3" />;
  if (percent >= 20) return <Info className="h-3 w-3" />;
  return <CheckCircle className="h-3 w-3" />;
}

export default function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
  const { categories, configItems, getConfigItemsForCategory, getConfigForProductType, loading } = useProductCategories();
  const [searchTerm, setSearchTerm] = useState('');

  // Configuração atual selecionada
  const currentConfig = useMemo(() => {
    return getConfigForProductType(value);
  }, [value, getConfigForProductType]);

  // Agrupar e filtrar opções por categoria
  const groupedOptions = useMemo(() => {
    const groups: Record<string, CategoryConfigItem[]> = {};
    
    for (const category of categories) {
      const items = getConfigItemsForCategory(category);
      
      // Filtrar por termo de busca
      const filteredItems = searchTerm
        ? items.filter(item => 
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : items;
      
      if (filteredItems.length > 0) {
        groups[category] = filteredItems;
      }
    }
    
    return groups;
  }, [categories, getConfigItemsForCategory, searchTerm]);

  const handleSelect = (newValue: string) => {
    if (newValue === '__clear__') {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  // Obter componente de ícone
  const getIconComponent = (iconName: string) => {
    return ICON_COMPONENTS[iconName] || Package;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Tipo de Produto (Clinical Brain)</Label>
        </div>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando categorias do Clinical Brain...</span>
        </div>
      </div>
    );
  }

  const CurrentIcon = currentConfig ? getIconComponent(currentConfig.icon_name) : Package;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Tipo de Produto (Clinical Brain)</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Define o tom técnico da IA, regras anti-alucinação e criticidade. Categorias vêm do banco de dados.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Selector */}
      <div className="flex gap-2">
        <Select
          value={value || ''}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione categoria > subcategoria">
              {value && currentConfig && (
                <div className="flex items-center gap-2">
                  <CurrentIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{value}</span>
                  <Badge 
                    variant="outline" 
                    className={cn("ml-auto text-[10px] px-1.5 py-0", getCriticalityColor(currentConfig.criticality_percent))}
                  >
                    {currentConfig.criticality_percent}%
                  </Badge>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {/* Campo de busca */}
            <div className="p-2 border-b sticky top-0 bg-popover z-10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {Object.keys(groupedOptions).length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria configurada'}
              </div>
            ) : (
              Object.entries(groupedOptions).map(([category, items]) => {
                const categoryIcon = getIconComponent(items[0]?.icon_name || 'Package');
                const CategoryIcon = categoryIcon;
                
                return (
                  <div key={category} className="mb-1">
                    {/* Cabeçalho da categoria */}
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                      <CategoryIcon className="h-3.5 w-3.5" />
                      {category}
                    </div>
                    
                    {/* Subcategorias */}
                    {items.map((item) => {
                      const productTypeValue = `${item.category} > ${item.subcategory}`;
                      const ItemIcon = getIconComponent(item.icon_name);
                      
                      return (
                        <SelectItem 
                          key={item.id} 
                          value={productTypeValue}
                          className="pl-6"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{item.subcategory}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-[10px] px-1.5 py-0 gap-0.5", getCriticalityColor(item.criticality_percent))}
                                  >
                                    {getCriticalityIcon(item.criticality_percent)}
                                    {item.criticality_percent}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-medium">Criticidade: {item.criticality_percent}%</p>
                                    {item.clinical_tone && (
                                      <p><span className="text-muted-foreground">Tom:</span> {item.clinical_tone}</p>
                                    )}
                                    {item.anti_hallucination_rules?.always_require?.length ? (
                                      <p><span className="text-muted-foreground">Requisitos:</span> {item.anti_hallucination_rules.always_require.slice(0, 2).join(', ')}</p>
                                    ) : null}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </div>
                );
              })
            )}
          </SelectContent>
        </Select>
        
        {value && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleClear}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Limpar seleção</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Info da seleção atual */}
      {currentConfig && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clinical Brain Ativo</span>
            <Badge 
              variant="outline" 
              className={cn("text-xs gap-1", getCriticalityColor(currentConfig.criticality_percent))}
            >
              {getCriticalityIcon(currentConfig.criticality_percent)}
              Criticidade {currentConfig.criticality_percent}%
            </Badge>
          </div>
          
          {currentConfig.clinical_tone && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Tom de voz:</span> {currentConfig.clinical_tone}
            </p>
          )}
          
          {currentConfig.anti_hallucination_rules && (
            <div className="text-xs space-y-1">
              {currentConfig.anti_hallucination_rules.always_require?.length ? (
                <p className="text-green-600">
                  <span className="font-medium">✓ Sempre mencionar:</span> {currentConfig.anti_hallucination_rules.always_require.join(', ')}
                </p>
              ) : null}
              {currentConfig.anti_hallucination_rules.never_claim?.length ? (
                <p className="text-red-600">
                  <span className="font-medium">✗ Nunca afirmar:</span> {currentConfig.anti_hallucination_rules.never_claim.slice(0, 2).join(', ')}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
