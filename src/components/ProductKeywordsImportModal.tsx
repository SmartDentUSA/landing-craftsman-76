import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLinksRepository } from "@/hooks/useLinksRepository";
import { Search, Package, Target, TrendingUp, Bot, ExternalLink, Globe, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ProductKeyword {
  keyword: string;
  occurrences: number;
  selectedUrl?: string;
  selected: boolean;
}

interface Product {
  id: string;
  name: string;
  keywords: any;
  search_intent_keywords: any;
  market_keywords: any;
  bot_trigger_words: any;
}

interface ProductKeywordsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogContent: string;
  onImportKeywords: (keywordUrlPairs: Record<string, string>) => void;
  showAllKeywords?: boolean; // Nova prop para mostrar todas as keywords independente de ocorrências
}

export function ProductKeywordsImportModal({
  open,
  onOpenChange,
  blogContent,
  onImportKeywords,
  showAllKeywords = false
}: ProductKeywordsImportModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [keywordsByType, setKeywordsByType] = useState<{
    keywords: ProductKeyword[];
    search_intent_keywords: ProductKeyword[];
    market_keywords: ProductKeyword[];
    bot_trigger_words: ProductKeyword[];
  }>({
    keywords: [],
    search_intent_keywords: [],
    market_keywords: [],
    bot_trigger_words: []
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(true); // Default true para mostrar todas as keywords
  
  const { allLinks } = useLinksRepository();

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, keywords, search_intent_keywords, market_keywords, bot_trigger_words')
        .eq('approved', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const countOccurrences = (keyword: string): number => {
    if (!blogContent) return 0;
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
    const matches = blogContent.match(regex);
    return matches ? matches.length : 0;
  };

  const processKeywords = (keywords: string[], type: keyof typeof keywordsByType, forceShowAll = false): ProductKeyword[] => {
    const effectiveShowAll = showAllKeywords || forceShowAll;
    return keywords
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => {
        const occurrences = effectiveShowAll ? 1 : countOccurrences(keyword.trim()); // Se effectiveShowAll for true, simula 1 ocorrência
        return {
          keyword: keyword.trim(),
          occurrences,
          selected: effectiveShowAll ? false : occurrences > 0, // Se effectiveShowAll, deixa desmarcado por padrão
          selectedUrl: ''
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences);
  };

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setKeywordsByType({
          keywords: processKeywords(Array.isArray(product.keywords) ? product.keywords : [], 'keywords', showAll),
          search_intent_keywords: processKeywords(Array.isArray(product.search_intent_keywords) ? product.search_intent_keywords : [], 'search_intent_keywords', showAll),
          market_keywords: processKeywords(Array.isArray(product.market_keywords) ? product.market_keywords : [], 'market_keywords', showAll),
          bot_trigger_words: processKeywords(Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : [], 'bot_trigger_words', showAll)
        });
      }
    }
  }, [selectedProductId, blogContent, showAll]);

  const updateKeywordSelection = (type: keyof typeof keywordsByType, keyword: string, field: 'selected' | 'selectedUrl', value: boolean | string) => {
    setKeywordsByType(prev => ({
      ...prev,
      [type]: prev[type].map(kw => 
        kw.keyword === keyword 
          ? { ...kw, [field]: value }
          : kw
      )
    }));
  };

  const getSelectedKeywordsCount = () => {
    return Object.values(keywordsByType).reduce((total, keywords) => 
      total + keywords.filter(kw => kw.selected && kw.selectedUrl).length, 0
    );
  };

  const handleImport = () => {
    const keywordUrlPairs: Record<string, string> = {};
    
    Object.values(keywordsByType).forEach(keywords => {
      keywords.forEach(kw => {
        if (kw.selected && kw.selectedUrl && (showAllKeywords || kw.occurrences > 0)) {
          keywordUrlPairs[kw.keyword.toLowerCase()] = kw.selectedUrl;
        }
      });
    });

    if (Object.keys(keywordUrlPairs).length === 0) {
      toast.error('Selecione pelo menos uma palavra-chave com URL');
      return;
    }

    onImportKeywords(keywordUrlPairs);
    onOpenChange(false);
    toast.success(`${Object.keys(keywordUrlPairs).length} palavras-chave importadas com sucesso`);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderKeywordTab = (type: keyof typeof keywordsByType, title: string, icon: React.ReactNode) => {
    const keywords = keywordsByType[type];
    const shouldShowAll = showAllKeywords || showAll;
    const filteredKeywords = shouldShowAll ? keywords : keywords.filter(kw => kw.occurrences > 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredKeywords.length} disponíveis
          </Badge>
        </div>

        {filteredKeywords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              {shouldShowAll ? 'Nenhuma palavra-chave cadastrada para este produto' : 'Nenhuma palavra-chave encontrada no conteúdo'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKeywords.map((kw) => (
              <div key={kw.keyword} className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  checked={kw.selected}
                  onCheckedChange={(checked) => 
                    updateKeywordSelection(type, kw.keyword, 'selected', checked as boolean)
                  }
                />
                
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{kw.keyword}</span>
                      {!shouldShowAll && (
                        <Badge variant="outline" className="text-xs">
                          {kw.occurrences}× no texto
                        </Badge>
                      )}
                    </div>
                  
                  {kw.selected && (
                    <Select
                      value={kw.selectedUrl}
                      onValueChange={(value) => 
                        updateKeywordSelection(type, kw.keyword, 'selectedUrl', value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar URL de destino..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allLinks.filter(link => link.url && link.url.trim() !== '').map((link) => (
                          <SelectItem key={link.id} value={link.url}>
                            <div className="flex items-center gap-2">
                              {link.type === 'internal' ? (
                                <Globe className="h-3 w-3 text-blue-500" />
                              ) : (
                                <ExternalLink className="h-3 w-3 text-green-500" />
                              )}
                              <span className="truncate">{link.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {link.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Importar Keywords dos Produtos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Produto */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Produto</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar produto..." />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle para mostrar todas as keywords */}
          {selectedProductId && (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Mostrar todas as keywords</span>
                </div>
                <Switch 
                  checked={showAll} 
                  onCheckedChange={setShowAll}
                />
              </div>

              {!showAll && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Filtrando apenas keywords que aparecem no conteúdo do blog
                </p>
              )}
            </>
          )}

          {/* Keywords por Categoria */}
          {selectedProductId && (
            <div className="border rounded-lg mt-4">
              <Tabs defaultValue="keywords" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="keywords" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    Principais
                  </TabsTrigger>
                  <TabsTrigger value="search_intent" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    Intenção
                  </TabsTrigger>
                  <TabsTrigger value="market" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Mercado
                  </TabsTrigger>
                  <TabsTrigger value="bot_trigger" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    Bot
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <ScrollArea className="h-[400px]">
                    <TabsContent value="keywords" className="mt-0">
                      {renderKeywordTab('keywords', 'Keywords Principais', <Package className="h-4 w-4" />)}
                    </TabsContent>

                    <TabsContent value="search_intent" className="mt-0">
                      {renderKeywordTab('search_intent_keywords', 'Intenção de Busca', <Target className="h-4 w-4" />)}
                    </TabsContent>

                    <TabsContent value="market" className="mt-0">
                      {renderKeywordTab('market_keywords', 'Mercado', <TrendingUp className="h-4 w-4" />)}
                    </TabsContent>

                    <TabsContent value="bot_trigger" className="mt-0">
                      {renderKeywordTab('bot_trigger_words', 'Bot Triggers', <Bot className="h-4 w-4" />)}
                    </TabsContent>
                  </ScrollArea>
                </div>
              </Tabs>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {getSelectedKeywordsCount()} palavras-chave selecionadas
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={getSelectedKeywordsCount() === 0}
              >
                Importar {getSelectedKeywordsCount()} Keywords
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}