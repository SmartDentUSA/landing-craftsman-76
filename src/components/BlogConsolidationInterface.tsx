import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Package } from "lucide-react";
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

  const handlePreferencesChange = (preferences: BlogConsolidationPreferences) => {
    setBlogPreferences(preferences);
    localStorage.setItem('blogConsolidationPreferences', JSON.stringify(preferences));
  };

  return (
    <div className="space-y-6">
      {/* Header Simplificado */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciamento de Blogs dos Produtos
          </CardTitle>
          <CardDescription>
            Gere e gerencie blogs individuais para cada produto selecionado
          </CardDescription>
          
          <div className="flex items-center gap-3 pt-2">
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