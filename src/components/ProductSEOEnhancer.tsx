import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Search, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useProductSEOExtractor } from '@/hooks/useProductSEOExtractor';
import { useToast } from '@/hooks/use-toast';

interface ProductSEOEnhancerProps {
  product: {
    id: string;
    name: string;
    product_url?: string;
    gtin?: string;
    mpn?: string;
    brand?: string;
    seo_enhanced?: boolean;
  };
  onEnhancementComplete?: () => void;
}

export const ProductSEOEnhancer: React.FC<ProductSEOEnhancerProps> = ({ 
  product, 
  onEnhancementComplete 
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [seoStatus, setSeoStatus] = useState<any>(null);
  const { extractAndSaveProductSEO, checkProductSEOStatus } = useProductSEOExtractor();
  const { toast } = useToast();

  // Verificar status SEO ao carregar
  useEffect(() => {
    const loadSEOStatus = async () => {
      const status = await checkProductSEOStatus(product.id);
      setSeoStatus(status);
    };
    loadSEOStatus();
  }, [product.id, checkProductSEOStatus]);

  // Processar enhancement automático
  const handleEnhancement = async () => {
    if (!product.product_url) {
      toast({
        title: "⚠️ URL Necessária",
        description: "É necessário uma URL do produto para extrair os dados SEO",
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(true);
    try {
      const result = await extractAndSaveProductSEO(product.id, product.product_url);
      
      if (result.success) {
        // Recarregar status
        const newStatus = await checkProductSEOStatus(product.id);
        setSeoStatus(newStatus);
        onEnhancementComplete?.();
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  if (!seoStatus) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-muted-foreground">Verificando SEO...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (seoStatus.percentage >= 80) return "text-green-600";
    if (seoStatus.percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = () => {
    if (seoStatus.percentage >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (seoStatus.percentage >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Search className="h-4 w-4" />
          Status SEO Google Merchant
          {seoStatus.isEnhanced && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Aprimorado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completude SEO</span>
            <span className={`text-sm font-bold ${getStatusColor()}`}>
              {seoStatus.percentage}%
            </span>
          </div>
          <Progress value={seoStatus.percentage} className="h-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {getStatusIcon()}
            <span>{seoStatus.seoScore}/{seoStatus.maxScore} campos preenchidos</span>
          </div>
        </div>

        {/* Missing Fields */}
        {seoStatus.missingFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Campos Ausentes:</h4>
            <div className="flex flex-wrap gap-1">
              {seoStatus.missingFields.map((field: string) => (
                <Badge key={field} variant="outline" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2">
          {product.product_url ? (
            <Button
              onClick={handleEnhancement}
              disabled={isEnhancing}
              size="sm"
              className="w-full"
              variant={seoStatus.percentage >= 80 ? "outline" : "default"}
            >
              {isEnhancing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Extraindo Dados...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {seoStatus.percentage >= 80 ? 'Reatualizar SEO' : 'Aprimorar SEO'}
                </>
              )}
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                URL do produto necessária para extração
              </p>
              <Button size="sm" variant="outline" disabled className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Adicionar URL
              </Button>
            </div>
          )}
        </div>

        {/* SEO Preview */}
        {seoStatus.percentage >= 50 && (
          <div className="pt-2 border-t border-muted">
            <p className="text-xs text-green-600 font-medium">
              ✅ Produto otimizado para Google Shopping e busca orgânica
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};