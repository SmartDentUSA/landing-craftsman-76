import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, ExternalLink } from 'lucide-react';

interface TechnicalSpec {
  label: string;
  value: string;
}

interface TechnicalSpecsPreviewProps {
  specs: TechnicalSpec[];
  onEdit: () => void;
  onDelete?: (index: number) => void;
  productName: string;
}

// Helper para detectar URLs válidas
const isValidURL = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Componente para renderizar valor (texto ou link)
const ValueCell: React.FC<{ value: string }> = ({ value }) => {
  if (isValidURL(value)) {
    return (
      <a 
        href={value} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline truncate flex-1 cursor-pointer inline-flex items-center gap-1"
        title={value}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">{value}</span>
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
    );
  }
  
  return (
    <div className="text-xs text-muted-foreground truncate flex-1" title={value}>
      {value}
    </div>
  );
};

export const TechnicalSpecsPreview: React.FC<TechnicalSpecsPreviewProps> = ({
  specs,
  onEdit,
  onDelete,
  productName
}) => {
  if (!specs || specs.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground">Especificações Técnicas</div>
          <Button onClick={onEdit} variant="ghost" size="sm" className="h-6 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Nenhuma especificação cadastrada</div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">Especificações Técnicas</div>
          <Badge variant="secondary" className="text-xs h-5">
            {specs.length}
          </Badge>
        </div>
        <Button onClick={onEdit} variant="ghost" size="sm" className="h-6 text-xs">
          <Edit className="h-3 w-3 mr-1" />
          Editar
        </Button>
      </div>
      
      {/* Tabela compacta similar ao construtor de landing page */}
      <div className="border border-border/40 rounded-md overflow-hidden">
        <div className="bg-muted/30 px-3 py-1.5 border-b border-border/40">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
            <div>Especificação</div>
            <div>Valor</div>
          </div>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {specs.map((spec, index) => (
            <div 
              key={index}
              className="grid grid-cols-2 gap-2 px-3 py-1.5 border-b last:border-b-0 border-border/20 hover:bg-muted/20 group"
            >
              <div className="text-xs font-medium truncate" title={spec.label}>
                {spec.label}
              </div>
              <div className="flex items-center justify-between">
                <ValueCell value={spec.value} />
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(index)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-2 p-2 bg-muted/20 rounded-md border border-dashed border-border/40">
        <div className="text-xs text-muted-foreground">
          <strong>SEO:</strong> Incluídas automaticamente no conteúdo gerado
        </div>
      </div>
    </div>
  );
};