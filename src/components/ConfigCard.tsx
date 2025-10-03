import React from "react";
import { Edit, Trash2, Target, Hash, TrendingUp, Search, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CategoryFormData {
  id?: string;
  categoria: string;
  subcategoria: string;
  publico_alvo: string;
  palavras_chave: string[]; // Deprecated - mantido para compatibilidade
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
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
        "group relative transition-all duration-200 hover:shadow-md p-4",
        isSelected && "ring-2 ring-primary shadow-lg"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => config.id && onToggleSelection(config.id)}
          className="flex-shrink-0"
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-tight truncate">
                {config.subcategoria}
              </h3>
              
              {/* Público-alvo com ícone */}
              <div className="flex items-center gap-1.5 mt-1">
                <Target className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {config.publico_alvo}
                </span>
              </div>

              {/* Keywords counters */}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {(config.keywords?.length > 0) && (
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {config.keywords.length}
                    </span>
                  </div>
                )}
                {(config.market_keywords?.length > 0) && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {config.market_keywords.length}
                    </span>
                  </div>
                )}
                {(config.search_intent_keywords?.length > 0) && (
                  <div className="flex items-center gap-1">
                    <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {config.search_intent_keywords.length}
                    </span>
                  </div>
                )}
                {/* Fallback para palavras_chave quando os outros campos não existem */}
                {(!config.keywords && !config.market_keywords && !config.search_intent_keywords && config.palavras_chave?.length > 0) && (
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {config.palavras_chave.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Completeness indicator */}
            <div className="flex-shrink-0">
              <InlineCompletenessIndicator percentage={completenessPercentage} />
            </div>
          </div>
        </div>

        {/* Action dropdown menu */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}