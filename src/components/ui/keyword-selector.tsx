import React, { useState, useEffect } from "react";
import { X, Plus, Sparkles, Tag, TrendingUp, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ========================================
// 🎯 INTERFACES E TIPOS
// ========================================

export interface Keyword {
  id: string;
  keyword: string;
  type: "product" | "intent" | "market" | "bot" | "contextual" | "brand";
  role?: "primary" | "secondary" | "related" | "trigger" | "negative";
  category?: string;
  subcategory?: string;
  usage_count: number;
  is_active: boolean;
  is_ai_generated: boolean;
  confidence_score: number;
}

export interface KeywordSelectorProps {
  /** Array de UUIDs das keywords selecionadas */
  value: string[];
  
  /** Callback quando a seleção muda */
  onChange: (keywordIds: string[]) => void;
  
  /** Contexto de uso (afeta sugestões e filtros) */
  context?: "product" | "category" | "blog" | "company";
  
  /** Filtrar apenas keywords de tipos específicos */
  types?: Keyword["type"][];
  
  /** Número máximo de seleções permitidas */
  maxSelections?: number;
  
  /** Mostrar sugestões inteligentes baseadas em contexto */
  showSuggestions?: boolean;
  
  /** Permitir criação de novas keywords inline */
  allowCreate?: boolean;
  
  /** Dados contextuais para melhorar sugestões */
  contextData?: {
    name?: string;
    description?: string;
    category?: string;
    subcategory?: string;
  };
  
  /** Label do campo */
  label?: string;
  
  /** Texto de ajuda */
  helperText?: string;
  
  /** Desabilitar o seletor */
  disabled?: boolean;
  
  /** Classe CSS customizada */
  className?: string;
}

// ========================================
// 🎨 CONFIGURAÇÕES VISUAIS POR TIPO
// ========================================

const KEYWORD_TYPE_CONFIG = {
  product: {
    icon: Tag,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    label: "Produto",
  },
  intent: {
    icon: Search,
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    label: "Intenção",
  },
  market: {
    icon: TrendingUp,
    color: "bg-green-500/10 text-green-700 dark:text-green-400",
    label: "Mercado",
  },
  bot: {
    icon: Sparkles,
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    label: "Bot",
  },
  contextual: {
    icon: Tag,
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    label: "Contextual",
  },
  brand: {
    icon: Tag,
    color: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
    label: "Marca",
  },
} as const;

// ========================================
// 🧩 COMPONENTE PRINCIPAL
// ========================================

export function KeywordSelector({
  value = [],
  onChange,
  context = "product",
  types,
  maxSelections,
  showSuggestions = true,
  allowCreate = true,
  contextData,
  label = "Keywords",
  helperText,
  disabled = false,
  className,
}: KeywordSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  const [suggestions, setSuggestions] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);

  // ========================================
  // 📥 CARREGAR KEYWORDS DO REPOSITÓRIO
  // ========================================
  
  useEffect(() => {
    loadKeywords();
    if (showSuggestions && contextData) {
      loadSuggestions();
    }
  }, [types, context]);

  /**
   * Carrega keywords do repositório central
   * 🔄 SUBSTITUI: múltiplas queries fragmentadas por 1 única query
   */
  const loadKeywords = async () => {
    setLoading(true);
    try {
      // 🎯 MOCK: Em produção, usar useKeywordsRepository hook
      const mockKeywords: Keyword[] = [
        {
          id: "1",
          keyword: "scanner 3d",
          type: "product",
          role: "primary",
          category: "equipamentos",
          usage_count: 45,
          is_active: true,
          is_ai_generated: false,
          confidence_score: 1.0,
        },
        {
          id: "2",
          keyword: "implante dentário",
          type: "product",
          role: "primary",
          category: "materiais",
          usage_count: 38,
          is_active: true,
          is_ai_generated: false,
          confidence_score: 1.0,
        },
        {
          id: "3",
          keyword: "comprar scanner",
          type: "intent",
          role: "secondary",
          usage_count: 22,
          is_active: true,
          is_ai_generated: true,
          confidence_score: 0.92,
        },
        {
          id: "4",
          keyword: "tecnologia odontológica",
          type: "market",
          role: "related",
          category: "tecnologia",
          usage_count: 15,
          is_active: true,
          is_ai_generated: false,
          confidence_score: 1.0,
        },
        {
          id: "5",
          keyword: "quanto custa",
          type: "bot",
          role: "trigger",
          usage_count: 50,
          is_active: true,
          is_ai_generated: false,
          confidence_score: 1.0,
        },
      ];

      // Filtrar por tipos se especificado
      const filtered = types
        ? mockKeywords.filter((kw) => types.includes(kw.type))
        : mockKeywords;

      setAllKeywords(filtered);
    } catch (error) {
      console.error("Erro ao carregar keywords:", error);
      toast.error("Erro ao carregar keywords");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carrega sugestões inteligentes baseadas em contexto
   * 🤖 FUTURO: Integrar com IA para sugestões semânticas
   */
  const loadSuggestions = async () => {
    if (!contextData) return;

    try {
      // 🎯 MOCK: Em produção, chamar edge function de sugestões IA
      const mockSuggestions: Keyword[] = [
        {
          id: "s1",
          keyword: "scanner intraoral",
          type: "product",
          role: "related",
          usage_count: 12,
          is_active: true,
          is_ai_generated: true,
          confidence_score: 0.88,
        },
        {
          id: "s2",
          keyword: "tecnologia CAD/CAM",
          type: "market",
          role: "related",
          usage_count: 8,
          is_active: true,
          is_ai_generated: true,
          confidence_score: 0.85,
        },
      ];

      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error("Erro ao carregar sugestões:", error);
    }
  };

  // ========================================
  // 🎯 HANDLERS
  // ========================================

  const selectedKeywords = allKeywords.filter((kw) => value.includes(kw.id));
  const availableKeywords = allKeywords.filter((kw) => !value.includes(kw.id));

  const handleSelect = (keywordId: string) => {
    if (maxSelections && value.length >= maxSelections) {
      toast.warning(`Máximo de ${maxSelections} keywords atingido`);
      return;
    }

    onChange([...value, keywordId]);
    setSearchQuery("");
  };

  const handleRemove = (keywordId: string) => {
    onChange(value.filter((id) => id !== keywordId));
  };

  const handleCreateNew = async () => {
    if (!allowCreate || !searchQuery.trim()) return;

    try {
      // 🎯 MOCK: Em produção, chamar useKeywordsRepository.addKeyword()
      const newKeyword: Keyword = {
        id: `new-${Date.now()}`,
        keyword: searchQuery.trim().toLowerCase(),
        type: types?.[0] || "product",
        role: "primary",
        usage_count: 0,
        is_active: true,
        is_ai_generated: false,
        confidence_score: 1.0,
      };

      setAllKeywords([...allKeywords, newKeyword]);
      handleSelect(newKeyword.id);
      toast.success("Keyword criada com sucesso");
      setSearchQuery("");
    } catch (error) {
      console.error("Erro ao criar keyword:", error);
      toast.error("Erro ao criar keyword");
    }
  };

  const handleApplySuggestion = (suggestionId: string) => {
    handleSelect(suggestionId);
    setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
    toast.success("Sugestão aplicada");
  };

  // Filtrar keywords por busca
  const filteredKeywords = availableKeywords.filter((kw) =>
    kw.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canCreateNew =
    allowCreate &&
    searchQuery.trim() &&
    !allKeywords.some(
      (kw) => kw.keyword.toLowerCase() === searchQuery.trim().toLowerCase()
    );

  // ========================================
  // 🎨 RENDER
  // ========================================

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label}
          {maxSelections && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({value.length}/{maxSelections})
            </span>
          )}
        </Label>
        
        {showSuggestions && suggestions.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {suggestions.length} sugestões
          </Badge>
        )}
      </div>

      {/* Sugestões Inteligentes */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Sugestões baseadas em IA
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <KeywordChip
                key={suggestion.id}
                keyword={suggestion}
                onRemove={() => {}}
                onClick={() => handleApplySuggestion(suggestion.id)}
                isSuggestion
              />
            ))}
          </div>
        </div>
      )}

      {/* Keywords Selecionadas */}
      {selectedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-background min-h-[60px]">
          {selectedKeywords.map((keyword) => (
            <KeywordChip
              key={keyword.id}
              keyword={keyword}
              onRemove={() => handleRemove(keyword.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Seletor */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || (maxSelections ? value.length >= maxSelections : false)}
          >
            <span className="text-muted-foreground">
              {maxSelections && value.length >= maxSelections
                ? "Limite atingido"
                : "Adicionar keywords..."}
            </span>
            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar keywords..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {canCreateNew ? (
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={handleCreateNew}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar "{searchQuery}"
                    </Button>
                  </div>
                ) : (
                  "Nenhuma keyword encontrada"
                )}
              </CommandEmpty>

              {filteredKeywords.length > 0 && (
                <>
                  {/* Agrupar por tipo */}
                  {Object.entries(
                    filteredKeywords.reduce((acc, kw) => {
                      if (!acc[kw.type]) acc[kw.type] = [];
                      acc[kw.type].push(kw);
                      return acc;
                    }, {} as Record<string, Keyword[]>)
                  ).map(([type, keywords]) => (
                    <CommandGroup key={type} heading={KEYWORD_TYPE_CONFIG[type as Keyword["type"]].label}>
                      {keywords.map((keyword) => (
                        <CommandItem
                          key={keyword.id}
                          value={keyword.keyword}
                          onSelect={() => handleSelect(keyword.id)}
                        >
                          <KeywordLabel keyword={keyword} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}

                  {canCreateNew && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem onSelect={handleCreateNew}>
                          <Plus className="mr-2 h-4 w-4" />
                          Criar "{searchQuery}"
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Helper Text */}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

// ========================================
// 🎨 COMPONENTES AUXILIARES
// ========================================

interface KeywordChipProps {
  keyword: Keyword;
  onRemove: () => void;
  onClick?: () => void;
  disabled?: boolean;
  isSuggestion?: boolean;
}

function KeywordChip({
  keyword,
  onRemove,
  onClick,
  disabled,
  isSuggestion,
}: KeywordChipProps) {
  const config = KEYWORD_TYPE_CONFIG[keyword.type];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isSuggestion ? "outline" : "secondary"}
            className={cn(
              "group gap-1.5 pr-1",
              isSuggestion && "border-dashed cursor-pointer hover:bg-accent",
              !isSuggestion && config.color
            )}
            onClick={isSuggestion ? onClick : undefined}
          >
            <Icon className="h-3 w-3" />
            <span>{keyword.keyword}</span>
            {keyword.is_ai_generated && !isSuggestion && (
              <Sparkles className="h-3 w-3 opacity-50" />
            )}
            {!isSuggestion && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                disabled={disabled}
                className="ml-1 rounded-sm opacity-70 hover:opacity-100 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {isSuggestion && <Plus className="h-3 w-3 opacity-50" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <div className="font-medium">{keyword.keyword}</div>
            <div className="text-muted-foreground">
              Tipo: {config.label} {keyword.role && `• ${keyword.role}`}
            </div>
            {keyword.category && (
              <div className="text-muted-foreground">
                Categoria: {keyword.category}
              </div>
            )}
            <div className="text-muted-foreground">
              Usado {keyword.usage_count}x
            </div>
            {keyword.is_ai_generated && (
              <div className="text-muted-foreground">
                Confiança IA: {(keyword.confidence_score * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function KeywordLabel({ keyword }: { keyword: Keyword }) {
  const config = KEYWORD_TYPE_CONFIG[keyword.type];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.color)} />
        <span>{keyword.keyword}</span>
        {keyword.is_ai_generated && (
          <Sparkles className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {keyword.category && (
          <span className="px-1.5 py-0.5 rounded bg-muted">
            {keyword.category}
          </span>
        )}
        <span>{keyword.usage_count}x</span>
      </div>
    </div>
  );
}
