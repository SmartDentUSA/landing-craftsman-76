import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CategoryFormData {
  id?: string;
  categoria: string;
  subcategoria: string;
  publico_alvo: string;
  palavras_chave: string[];
}

interface ConfigCardProps {
  config: CategoryFormData;
  isSelected: boolean;
  completenessPercentage: number;
  onToggleSelection: (id: string) => void;
  onEdit: (config: CategoryFormData) => void;
  onDelete: (id: string) => void;
}

function InlineCompletenessIndicator({ percentage }: { percentage: number }) {
  const getVariant = (p: number): "default" | "secondary" | "destructive" | "outline" => {
    if (p >= 90) return "default";
    if (p >= 70) return "secondary";
    if (p >= 50) return "outline";
    return "destructive";
  };

  const getLabel = (p: number) => {
    if (p >= 90) return "Completo";
    if (p >= 70) return "Bom";
    if (p >= 50) return "Regular";
    return "Crítico";
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-bold">{percentage}%</span>
      <Badge variant={getVariant(percentage)} className="text-xs">
        {getLabel(percentage)}
      </Badge>
    </div>
  );
}

export function ConfigCard({
  config,
  isSelected,
  completenessPercentage,
  onToggleSelection,
  onEdit,
  onDelete,
}: ConfigCardProps) {
  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (config.id) {
      onToggleSelection(config.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(config);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (config.id) {
      onDelete(config.id);
    }
  };

  return (
    <Card
      className={cn(
        "group relative transition-all duration-200 hover:shadow-md p-4 cursor-pointer border-border/20 shadow-soft",
        isSelected && "ring-2 ring-primary shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5" onClick={handleCheckboxChange}>
          <Checkbox checked={isSelected} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">
                {config.subcategoria}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {config.publico_alvo}
              </p>
              {config.palavras_chave?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {config.palavras_chave.slice(0, 3).map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {config.palavras_chave.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{config.palavras_chave.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Completeness indicator */}
            <div className="flex-shrink-0">
              <InlineCompletenessIndicator percentage={completenessPercentage} />
            </div>
          </div>
        </div>

        {/* Action buttons - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}