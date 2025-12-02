import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { HelpCircle, X, Loader2 } from 'lucide-react';
import { useProductCategories } from '@/hooks/useProductCategories';
import { getIconForCategory, extractCategoryFromProductType } from './icons-map';

interface ProductTypeSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export default function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
  const { categories, getSubcategoriesForCategory, loading } = useProductCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (!value) return null;
    return extractCategoryFromProductType(value);
  });

  // Gerar opções flat com categoria > subcategoria
  const options = useMemo(() => {
    const result: { value: string; label: string; category: string; isSubcategory: boolean }[] = [];
    
    for (const category of categories) {
      // Adicionar a categoria como opção
      result.push({
        value: category,
        label: category,
        category: category,
        isSubcategory: false
      });
      
      // Adicionar subcategorias
      const subcategories = getSubcategoriesForCategory(category);
      for (const sub of subcategories) {
        result.push({
          value: `${category} > ${sub}`,
          label: `${category} > ${sub}`,
          category: category,
          isSubcategory: true
        });
      }
    }
    
    return result;
  }, [categories, getSubcategoriesForCategory]);

  // Encontrar opção selecionada atual
  const selectedOption = options.find(opt => opt.value === value);
  const currentCategory = selectedOption?.category || extractCategoryFromProductType(value);
  const Icon = getIconForCategory(currentCategory);

  const handleSelect = (newValue: string) => {
    if (newValue === '__clear__') {
      onChange(null);
      setSelectedCategory(null);
    } else {
      onChange(newValue);
      const category = extractCategoryFromProductType(newValue);
      setSelectedCategory(category);
    }
  };

  const handleClear = () => {
    onChange(null);
    setSelectedCategory(null);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Tipo de Produto (Clinical Brain)</Label>
        </div>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando categorias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Tipo de Produto (Clinical Brain)</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Define o tom técnico da IA ao gerar conteúdo. Selecione a categoria ou categoria + subcategoria para maior precisão.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex gap-2">
        <Select
          value={value || ''}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione categoria/subcategoria">
              {value && (
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{value}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {categories.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                Nenhuma categoria encontrada
              </div>
            ) : (
              <>
                {options.map((option) => {
                  const OptionIcon = getIconForCategory(option.category);
                  return (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className={option.isSubcategory ? 'pl-8' : 'font-medium'}
                    >
                      <div className="flex items-center gap-2">
                        <OptionIcon className="h-4 w-4 shrink-0" />
                        <span className={option.isSubcategory ? 'text-muted-foreground' : ''}>
                          {option.isSubcategory 
                            ? option.value.split('>')[1]?.trim() 
                            : option.label
                          }
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </>
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

      {value && (
        <p className="text-xs text-muted-foreground">
          Tom de IA será ajustado para: <span className="font-medium">{currentCategory}</span>
        </p>
      )}
    </div>
  );
}
