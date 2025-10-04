import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Package, Globe, ShoppingCart } from "lucide-react";
import { ProductBlogCuratorPanel } from "./ProductBlogCuratorPanel";

interface BlogConsolidationInterfaceProps {
  landingPageId: string;
  selectedProductIds: string[];
  onGenerateBlog: () => void;
  isGenerating: boolean;
  blogGenerated: boolean;
}

interface BlogConsolidationPreferences {
  [productId: string]: {
    useCommercial: boolean;
    useTechnical: boolean;
  };
}

export function BlogConsolidationInterface({ 
  landingPageId, 
  selectedProductIds, 
  onGenerateBlog, 
  isGenerating,
  blogGenerated 
}: BlogConsolidationInterfaceProps) {
  const [blogPreferences, setBlogPreferences] = useState<BlogConsolidationPreferences>({});
  const [selectedDomain, setSelectedDomain] = useState<'dentala.com.br' | 'eodonto.com.br'>('dentala.com.br');

  const handlePreferencesChange = (preferences: BlogConsolidationPreferences) => {
    setBlogPreferences(preferences);
    localStorage.setItem('blogConsolidationPreferences', JSON.stringify(preferences));
  };

  return (
    <div className="space-y-6">
      {/* Header com seletor de domínio */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciamento de Blogs dos Produtos
          </CardTitle>
          <CardDescription>
            Gere e gerencie blogs individuais para cada produto selecionado
          </CardDescription>
          
          <div className="flex items-center gap-3 pt-4">
            <Label>Domínio do Blog Estratégico:</Label>
            <Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dentala.com.br">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Dentala
                  </div>
                </SelectItem>
                <SelectItem value="eodonto.com.br">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Eodonto
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="flex items-center gap-2">
              <Package className="h-3 w-3" />
              {selectedProductIds.length} produto{selectedProductIds.length !== 1 ? 's' : ''} selecionado{selectedProductIds.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Painel Principal */}
      {selectedProductIds.length > 0 ? (
        <ProductBlogCuratorPanel
          selectedProductIds={selectedProductIds}
          onPreferencesChange={handlePreferencesChange}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum Produto Selecionado</h3>
            <p className="text-sm text-muted-foreground text-center">
              Selecione produtos no repositório para começar a gerar blogs individuais
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}