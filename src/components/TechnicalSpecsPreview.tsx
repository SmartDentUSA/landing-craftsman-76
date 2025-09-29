import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';

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
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Especificações Técnicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="mb-2">Nenhuma especificação técnica cadastrada</div>
            <Button onClick={onEdit} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Especificações
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Especificações Técnicas
            <Badge variant="secondary" className="ml-2">
              {specs.length} {specs.length === 1 ? 'item' : 'itens'}
            </Badge>
          </CardTitle>
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {specs.map((spec, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{spec.label}</div>
                    <div className="text-sm text-muted-foreground truncate">{spec.value}</div>
                  </div>
                </div>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted/20 rounded-lg border-dashed border">
          <div className="text-xs text-muted-foreground">
            <strong>Integração SEO:</strong> Essas especificações serão incluídas automaticamente 
            na geração de conteúdo para blogs, Google Ads e structured data do produto.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};