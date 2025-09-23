import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';
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
      return <Badge variant="default" className="text-xs px-1 py-0"><Upload className="h-2 w-2 mr-1" />Criar</Badge>;
    }
    return <Badge variant="secondary" className="text-xs px-1 py-0"><CheckCircle className="h-2 w-2 mr-1" />Atualizar</Badge>;
  };

  return (
    <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Importar CSV</span>
      </div>
      
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="gap-1 text-xs px-2 py-1 h-7"
        >
          <Download className="h-3 w-3" />
          Template
        </Button>
      </div>

      {importing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Importando...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full h-1" />
        </div>
      )}

      {previewData.length > 0 && !importing && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium">{previewData.length} produtos</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={clearPreview}
                className="text-xs px-2 py-1 h-6"
              >
                Limpar
              </Button>
              <Button
                onClick={importProducts}
                size="sm"
                className="gap-1 text-xs px-2 py-1 h-6"
              >
                <Upload className="h-3 w-3" />
                Importar
              </Button>
            </div>
          </div>
          
          <div className="max-h-24 overflow-y-auto space-y-1">
            {previewData.slice(0, 3).map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded bg-background text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {product.category} • {product.price ? `R$ ${product.price}` : 'Sem preço'}
                  </div>
                </div>
                <div className="ml-2">
                  {getStatusIcon(product.action)}
                </div>
              </div>
            ))}
            {previewData.length > 3 && (
              <div className="text-center text-xs text-muted-foreground py-1">
                ... e mais {previewData.length - 3} produtos
              </div>
            )}
          </div>
        </div>
      )}

      {previewData.length === 0 && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <AlertCircle className="h-3 w-3" />
            Use o template para formato correto
          </div>
          <div>• Com ID: atualiza | Sem ID: cria novo</div>
        </div>
      )}
    </div>
  );
};

export default ProductRepositoryCSVImporter;