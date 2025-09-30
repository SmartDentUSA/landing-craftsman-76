import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, DollarSign, Package, Palette, Ruler } from "lucide-react";

interface Variation {
  name: string;
  price?: number;
  stock?: number;
  color?: string;
  size?: string;
}

interface VariationCardProps {
  variation: Variation;
  index: number;
  onUpdate: (index: number, field: keyof Variation, value: string | number) => void;
  onRemove: (index: number) => void;
}

export function VariationCard({ variation, index, onUpdate, onRemove }: VariationCardProps) {
  const getStockBadge = () => {
    const stock = variation.stock || 0;
    if (stock === 0) return <Badge variant="destructive">Sem Estoque</Badge>;
    if (stock < 5) return <Badge variant="warning">Estoque Baixo</Badge>;
    return <Badge variant="success">Em Estoque</Badge>;
  };

  const getPriceBadge = () => {
    if (variation.price && variation.price > 0) {
      return <Badge variant="default">Com Preço</Badge>;
    }
    return null;
  };

  return (
    <Card className="hover:shadow-medium transition-smooth">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{variation.name || `Variação ${index + 1}`}</CardTitle>
            <CardDescription className="mt-1">
              <div className="flex gap-2 mt-2">
                {getStockBadge()}
                {getPriceBadge()}
              </div>
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preço */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Preço
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={variation.price || ''}
              onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Estoque */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Estoque
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={variation.stock || ''}
              onChange={(e) => onUpdate(index, 'stock', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Cor
            </Label>
            <Input
              placeholder="Ex: Azul, Vermelho"
              value={variation.color || ''}
              onChange={(e) => onUpdate(index, 'color', e.target.value)}
            />
          </div>

          {/* Tamanho */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              Tamanho
            </Label>
            <Input
              placeholder="Ex: P, M, G"
              value={variation.size || ''}
              onChange={(e) => onUpdate(index, 'size', e.target.value)}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        Última atualização: agora
      </CardFooter>
    </Card>
  );
}
