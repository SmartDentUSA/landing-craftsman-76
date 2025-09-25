import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, FileText, Sparkles } from "lucide-react";
import { ProductBlogCuratorPanel } from "./ProductBlogCuratorPanel";
import { useToast } from "@/hooks/use-toast";

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
  const [activeProductBlogsCount, setActiveProductBlogsCount] = useState(0);
  const { toast } = useToast();

  const handlePreferencesChange = (preferences: BlogConsolidationPreferences) => {
    setBlogPreferences(preferences);
    localStorage.setItem('blogConsolidationPreferences', JSON.stringify(preferences));
    
    // Calcular blogs ativos
    const activeBlogsCount = Object.values(preferences).reduce((count, pref) => {
      return count + (pref.useCommercial ? 1 : 0) + (pref.useTechnical ? 1 : 0);
    }, 0);
    
    setActiveProductBlogsCount(activeBlogsCount);
  };

  const getConsolidationStatus = () => {
    if (!selectedProductIds.length) {
      return {
        status: 'warning',
        message: 'Selecione produtos no repositório para gerar blog contextual',
        progress: 0
      };
    }

    if (!blogGenerated) {
      return {
        status: 'pending',
        message: 'Clique em "Gerar Blog com IA" para criar o conteúdo',
        progress: 25
      };
    }

    if (activeProductBlogsCount === 0) {
      return {
        status: 'info',
        message: 'Configure blogs de produtos para incluir no consolidado',
        progress: 50
      };
    }

    return {
      status: 'complete',
      message: `Blog pronto para consolidação com ${activeProductBlogsCount} blogs de produtos`,
      progress: 100
    };
  };

  const consolidationStatus = getConsolidationStatus();

  return (
    <div className="space-y-6">
      {/* Status da Consolidação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Status da Consolidação de Blogs
          </CardTitle>
          <CardDescription>
            Acompanhe o progresso da consolidação dos seus blogs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {consolidationStatus.status === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {consolidationStatus.status === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
            {consolidationStatus.status === 'pending' && <Sparkles className="h-5 w-5 text-blue-500" />}
            {consolidationStatus.status === 'info' && <FileText className="h-5 w-5 text-blue-500" />}
            
            <span className="text-sm font-medium">{consolidationStatus.message}</span>
          </div>
          
          <Progress value={consolidationStatus.progress} className="w-full" />
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{selectedProductIds.length}</div>
              <div className="text-muted-foreground">Produtos Selecionados</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{blogGenerated ? 1 : 0}</div>
              <div className="text-muted-foreground">Blog da Landing Page</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{activeProductBlogsCount}</div>
              <div className="text-muted-foreground">Blogs de Produtos</div>
            </div>
          </div>

          {!blogGenerated && selectedProductIds.length > 0 && (
            <Button 
              onClick={onGenerateBlog} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? "Gerando..." : "Gerar Blog com IA"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Curadoria de Blogs dos Produtos */}
      {selectedProductIds.length > 0 && (
        <ProductBlogCuratorPanel
          selectedProductIds={selectedProductIds}
          onPreferencesChange={handlePreferencesChange}
        />
      )}
    </div>
  );
}