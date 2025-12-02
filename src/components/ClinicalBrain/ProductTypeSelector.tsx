import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Layers, Waves, ScanLine, Printer, Monitor, Wrench, FlaskConical, Sun, HelpCircle } from 'lucide-react';
import { PRODUCT_TYPES } from './types';

interface ProductTypeSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  Waves,
  ScanLine,
  Printer,
  Monitor,
  Wrench,
  FlaskConical,
  Sun
};

export default function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
  const selectedType = PRODUCT_TYPES.find(t => t.value === value);
  const SelectedIcon = selectedType ? iconMap[selectedType.icon] : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Tipo de Produto</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Define o tom técnico da IA ao gerar conteúdo. Ex: Resinas terão linguagem de biocompatibilidade, scanners terão foco em precisão digital.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Select
        value={value || ''}
        onValueChange={(v) => onChange(v || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione o tipo do produto">
            {selectedType && SelectedIcon && (
              <div className="flex items-center gap-2">
                <SelectedIcon className="h-4 w-4" />
                <span>{selectedType.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_TYPES.map((type) => {
            const Icon = iconMap[type.icon];
            return (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{type.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
