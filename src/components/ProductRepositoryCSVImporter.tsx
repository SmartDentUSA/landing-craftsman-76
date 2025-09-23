import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface ImportPreviewProduct {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  action: 'create' | 'update';
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
}

interface ProductRepositoryCSVImporterProps {
  onImportComplete: () => void;
}

const ProductRepositoryCSVImporter: React.FC<ProductRepositoryCSVImporterProps> = ({
  onImportComplete
}) => {
  const [previewData, setPreviewData] = useState<ImportPreviewProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const expectedHeaders = [
    'id', 'name', 'description', 'price', 'currency', 'category', 'subcategory',
    'image_url', 'product_url', 'tags', 'keywords', 'features', 'benefits',
    'search_intent_keywords', 'market_keywords', 'target_audience', 'sales_pitch',
    'youtube_videos', 'instagram_videos', 'technical_videos', 'testimonial_videos',
    'video_captions', 'ai_generated_category', 'ai_generated_keywords', 
    'ai_generated_benefits', 'use_in_ai_generation', 'approved', 'display_order',
    'source_type', 'source_landing_page_id', 'original_data', 'created_at', 'updated_at'
  ];

  const downloadTemplate = () => {
    const csvContent = expectedHeaders.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-produtos-repositorio.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (csvText: string): ImportPreviewProduct[] => {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (result.errors.length > 0) {
      toast({
        title: "Erro ao processar CSV",
        description: `Erro: ${result.errors[0].message}`,
        variant: "destructive"
      });
      return [];
    }

    // Validar headers
    const csvHeaders = Object.keys(result.data[0] || {});
    const missingHeaders = expectedHeaders.filter(header => !csvHeaders.includes(header));
    
    if (missingHeaders.length > 0) {
      toast({
        title: "Headers incorretos",
        description: `Headers obrigatórios ausentes: ${missingHeaders.slice(0, 3).join(', ')}${missingHeaders.length > 3 ? '...' : ''}`,
        variant: "destructive"
      });
      return [];
    }

    return result.data.map((row: any) => ({
      id: row.id,
      name: row.name || 'Sem nome',
      description: row.description,
      price: row.price ? parseFloat(row.price) : undefined,
      category: row.category,
      action: row.id ? 'update' : 'create',
      status: 'pending'
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsedProducts = parseCSV(csvText);
      
      if (parsedProducts.length > 0) {
        setPreviewData(parsedProducts);
        toast({
          title: "CSV processado",
          description: `${parsedProducts.length} produtos encontrados para importação.`
        });
      }
    };
    reader.readAsText(file);
  };

  const importProducts = async () => {
    if (previewData.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      const csvData = previewData.map(product => {
        const { action, status, errorMessage, ...productData } = product;
        return productData;
      });

      const { data, error } = await supabase.functions.invoke('import-repository-csv', {
        body: { 
          products: csvData,
          type: 'products'
        }
      });

      if (error) throw error;

      setProgress(100);
      toast({
        title: "Importação concluída",
        description: `${data.imported} produtos importados com sucesso.`
      });

      onImportComplete();
      clearPreview();
    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const clearPreview = () => {
    setPreviewData([]);
    setProgress(0);
  };

  const getStatusIcon = (action: 'create' | 'update') => {
    if (action === 'create') {
      return <Badge variant="default" className="gap-1"><Upload className="h-3 w-3" />Criar</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Atualizar</Badge>;
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Produtos CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Template
          </Button>
        </div>

        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Importando produtos...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {previewData.length > 0 && !importing && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Preview da Importação</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearPreview}
                >
                  Limpar
                </Button>
                <Button
                  onClick={importProducts}
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar {previewData.length} Produtos
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md">
              <div className="space-y-2 p-3">
                {previewData.slice(0, 10).map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-sm bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.category} • {product.price ? `R$ ${product.price}` : 'Sem preço'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(product.action)}
                    </div>
                  </div>
                ))}
                {previewData.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    ... e mais {previewData.length - 10} produtos
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Use o template para garantir o formato correto
          </div>
          <div>• Produtos com ID serão atualizados, sem ID serão criados</div>
          <div>• Arrays JSON devem estar no formato: ["item1","item2"]</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductRepositoryCSVImporter;