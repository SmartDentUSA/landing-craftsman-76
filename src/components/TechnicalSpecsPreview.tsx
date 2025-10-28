import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, ExternalLink } from 'lucide-react';

// Helper para detectar URLs válidas
const isValidUrl = (text: string): boolean => {
  if (!text) return false;
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  return urlPattern.test(text) || text.startsWith('http://') || text.startsWith('https://');
};

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
                <div className="text-xs text-muted-foreground truncate flex-1" title={spec.value}>
                  {isValidUrl(spec.value) ? (
                    <a 
                      href={spec.value.startsWith('http') ? spec.value : `https://${spec.value}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {spec.value}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    spec.value
                  )}
                </div>
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