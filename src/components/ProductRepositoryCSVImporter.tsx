import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as Papa from 'papaparse';

interface ImportPreviewProduct {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
  tags?: any[];
  keywords?: any[];
  features?: any[];
  benefits?: any[];
  search_intent_keywords?: any[];
  market_keywords?: any[];
  target_audience?: any[];
  sales_pitch?: string;
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  video_captions?: any;
  ai_generated_category?: boolean;
  ai_generated_keywords?: boolean;
  ai_generated_benefits?: boolean;
  use_in_ai_generation?: boolean;
  approved?: boolean;
  display_order?: number;
  source_type?: string;
  source_landing_page_id?: string;
  original_data?: any;
  action: 'create' | 'update';
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
}

interface ImportOperationLog {
  name: string;
  id?: string;
  action: 'insert' | 'update';
  status: 'success' | 'error';
  error?: string;
  matched_by?: string;
}

interface ImportResult {
  logs: ImportOperationLog[];
}

interface ProductRepositoryCSVImporterProps {
  onImportComplete: (result?: ImportResult) => void;
}

const ProductRepositoryCSVImporter: React.FC<ProductRepositoryCSVImporterProps> = ({
  onImportComplete
}) => {
  const [previewData, setPreviewData] = useState<ImportPreviewProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<ImportOperationLog[]>([]);
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

  const parseJsonField = (value: any): any => {
    if (!value || value === '' || value === '[object Object]') return null;
    
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        // Tentar como array separado por ponto e vírgula primeiro
        if (value.includes(';')) {
          return value.split(';').map((item: string) => item.trim()).filter(Boolean);
        }
        // Se não tiver ponto e vírgula, tentar vírgula (mais flexível)
        if (value.includes(',') && !value.startsWith('[')) {
          return value.split(',').map((item: string) => item.trim()).filter(Boolean);
        }
        return value;
      }
    }
    
    return value;
  };

  const validateAndFixData = (parsedData: any[]): { data: any[], warnings: string[] } => {
    const warnings: string[] = [];
    const fixedData = parsedData.map((row, index) => {
      const fixed = { ...row };
      
      // Detectar URLs trocadas (image_url com https e product_url sem)
      if (fixed.image_url && fixed.product_url) {
        const imageIsUrl = fixed.image_url.startsWith('http');
        const productIsUrl = fixed.product_url.startsWith('http');
        
        // Se image_url não é URL mas product_url é, provavelmente estão trocados
        if (!imageIsUrl && productIsUrl && fixed.image_url.length > 10) {
          warnings.push(`Linha ${index + 1}: URLs possivelmente trocadas - corrigindo automaticamente`);
          const temp = fixed.image_url;
          fixed.image_url = fixed.product_url;
          fixed.product_url = temp;
        }
      }
      
      // Ignorar campos de timestamp problemáticos
      if (fixed.created_at && (fixed.created_at.includes(',') || fixed.created_at === '[object Object]')) {
        delete fixed.created_at;
        warnings.push(`Linha ${index + 1}: Campo created_at inválido removido`);
      }
      if (fixed.updated_at && (fixed.updated_at.includes(',') || fixed.updated_at === '[object Object]')) {
        delete fixed.updated_at;
        warnings.push(`Linha ${index + 1}: Campo updated_at inválido removido`);
      }
      
      return fixed;
    });
    
    return { data: fixedData, warnings };
  };

  const parseCSV = (csvText: string): ImportPreviewProduct[] => {
    console.log('🔍 Iniciando parse do CSV...');
    
    // Usar Papa.parse diretamente para preservar campos com vírgulas e quebras de linha entre aspas
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      quoteChar: '"',
      escapeChar: '"',
      delimitersToGuess: [',', ';', '\t', '|']
    });

    console.log('📊 Resultado do parse:', result);

    if (result.errors.length > 0) {
      console.error('❌ Erros no parse:', result.errors);
      toast({
        title: "Erro ao processar CSV",
        description: `Erro: ${result.errors[0].message}`,
        variant: "destructive"
      });
      return [];
    }

    const csvHeaders = Object.keys(result.data[0] || {});
    console.log('📋 Headers encontrados:', csvHeaders);
    
    // Verificar headers essenciais (flexível)
    const essentialHeaders = ['name'];
    const missingEssential = essentialHeaders.filter(header => !csvHeaders.includes(header));
    
    if (missingEssential.length > 0) {
      toast({
        title: "Headers obrigatórios ausentes",
        description: `Headers obrigatórios: ${missingEssential.join(', ')}`,
        variant: "destructive"
      });
      return [];
    }

    // Validar e corrigir dados
    const { data: validatedData, warnings } = validateAndFixData(result.data);
    
    // Mostrar avisos se houver
    if (warnings.length > 0) {
      toast({
        title: "Correções automáticas aplicadas",
        description: `${warnings.length} problema(s) corrigido(s). Verifique o preview.`,
        variant: "default"
      });
      console.log('⚠️ Avisos de validação:', warnings);
    }

    return validatedData.map((row: any, index: number) => {
      console.log(`🔄 Processando linha ${index + 1}:`, row);
      
      const processedRow = {
        id: row.id && row.id.trim() !== '' ? row.id.trim() : undefined,
        name: row.name || 'Sem nome',
        description: row.description && row.description !== '[object Object]' ? row.description : undefined,
        price: row.price ? parseFloat(row.price.toString()) : undefined,
        currency: row.currency || 'BRL',
        category: row.category,
        subcategory: row.subcategory,
        image_url: row.image_url,
        product_url: row.product_url,
        tags: parseJsonField(row.tags) || [],
        keywords: parseJsonField(row.keywords) || [],
        features: parseJsonField(row.features) || [],
        benefits: parseJsonField(row.benefits) || [],
        search_intent_keywords: parseJsonField(row.search_intent_keywords) || [],
        market_keywords: parseJsonField(row.market_keywords) || [],
        target_audience: parseJsonField(row.target_audience) || [],
        sales_pitch: row.sales_pitch,
        youtube_videos: parseJsonField(row.youtube_videos) || [],
        instagram_videos: parseJsonField(row.instagram_videos) || [],
        technical_videos: parseJsonField(row.technical_videos) || [],
        testimonial_videos: parseJsonField(row.testimonial_videos) || [],
        video_captions: parseJsonField(row.video_captions) || {},
        ai_generated_category: row.ai_generated_category === 'Sim' || row.ai_generated_category === 'true' || row.ai_generated_category === true,
        ai_generated_keywords: row.ai_generated_keywords === 'Sim' || row.ai_generated_keywords === 'true' || row.ai_generated_keywords === true,
        ai_generated_benefits: row.ai_generated_benefits === 'Sim' || row.ai_generated_benefits === 'true' || row.ai_generated_benefits === true,
        use_in_ai_generation: row.use_in_ai_generation !== 'Não' && row.use_in_ai_generation !== 'false' && row.use_in_ai_generation !== false,
        approved: row.approved !== 'Não' && row.approved !== 'false' && row.approved !== false,
        display_order: (row.display_order !== undefined && row.display_order !== null && !isNaN(Number(row.display_order))) ? Number(row.display_order) : undefined,
        source_type: row.source_type || 'csv_import',
        source_landing_page_id: row.source_landing_page_id,
        original_data: parseJsonField(row.original_data),
        action: (row.id && row.id.trim() !== '') ? 'update' as const : 'create' as const,
        status: 'pending' as const
      };

      console.log(`✅ Linha processada ${index + 1}:`, processedRow);
      return processedRow;
    });
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

    console.log('🚀 Iniciando importação de', previewData.length, 'produtos');
    setImporting(true);
    setProgress(0);

    try {
      const csvData = previewData.map(product => {
        const { action, status, errorMessage, ...productData } = product;
        console.log('📦 Produto para importação:', productData);
        return productData;
      });

      console.log('📤 Enviando dados para edge function:', { products: csvData, type: 'products' });

      const { data, error } = await supabase.functions.invoke('import-repository-csv', {
        body: { 
          products: csvData,
          type: 'products'
        }
      });

      console.log('📥 Resposta da edge function:', { data, error });

      if (error) throw error;

      setProgress(100);
      
      // Mensagens mais detalhadas
      let resultMessage = '';
      let toastVariant: "default" | "destructive" = "default";
      
      if (data.errors > 0) {
        resultMessage = `⚠️ ${data.imported} criados, ${data.updated} atualizados, ${data.errors} erros`;
        toastVariant = "destructive";
      } else if (data.imported > 0 && data.updated > 0) {
        resultMessage = `✅ ${data.imported} criados, ${data.updated} atualizados`;
      } else if (data.imported > 0) {
        resultMessage = `✅ ${data.imported} produtos criados`;
      } else if (data.updated > 0) {
        resultMessage = `✅ ${data.updated} produtos atualizados`;
      } else {
        resultMessage = '⚠️ Nenhum produto foi processado';
        toastVariant = "destructive";
      }

      toast({
        title: "Importação concluída",
        description: resultMessage,
        variant: toastVariant
      });

      // Mostrar detalhes dos erros se houver
      if (data.errorDetails && data.errorDetails.length > 0) {
        console.error('❌ Detalhes dos erros:', data.errorDetails);
        toast({
          title: `${data.errors} erros encontrados`,
          description: data.errorDetails.slice(0, 3).join('; ') + (data.errorDetails.length > 3 ? '...' : ''),
          variant: "destructive"
        });
      }

      // Exibir log visível e atualizar lista
      if (data.logs) {
        setImportLogs(data.logs as ImportOperationLog[]);
      }

      onImportComplete({ logs: (data.logs as ImportOperationLog[]) || [] });
      clearPreview();
    } catch (error) {
      console.error('❌ Erro na importação:', error);
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => onImportComplete()}
          className="gap-1 text-xs px-2 py-1 h-7"
        >
          Atualizar lista
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

      {importLogs.length > 0 && (
        <div className="space-y-2 mt-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Resultado da Importação</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportLogs([])}
              className="text-xs px-2 py-1 h-6"
            >
              Limpar
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-green-50 rounded border">
              <div className="font-medium text-green-700">
                {importLogs.filter(log => log.action === 'insert' && log.status === 'success').length}
              </div>
              <div className="text-green-600">Criados</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded border">
              <div className="font-medium text-blue-700">
                {importLogs.filter(log => log.action === 'update' && log.status === 'success').length}
              </div>
              <div className="text-blue-600">Atualizados</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded border">
              <div className="font-medium text-red-700">
                {importLogs.filter(log => log.status === 'error').length}
              </div>
              <div className="text-red-600">Erros</div>
            </div>
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-1">
            {importLogs.slice(0, 10).map((log, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded text-xs border ${
                  log.status === 'success' 
                    ? log.action === 'insert' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{log.name}</div>
                  {log.matched_by && (
                    <div className="text-xs text-muted-foreground">
                      Localizado por: {log.matched_by === 'id' ? 'ID' : log.matched_by === 'product_url' ? 'URL' : 'Nome'}
                    </div>
                  )}
                  {log.error && (
                    <div className="text-xs text-red-600 truncate">{log.error}</div>
                  )}
                </div>
                <div className="ml-2">
                  {log.status === 'success' ? (
                    <Badge 
                      variant={log.action === 'insert' ? 'default' : 'secondary'} 
                      className="text-xs px-1 py-0"
                    >
                      {log.action === 'insert' ? 'Criado' : 'Atualizado'}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      <AlertCircle className="h-2 w-2 mr-1" />
                      Erro
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {importLogs.length > 10 && (
              <div className="text-center text-xs text-muted-foreground py-1">
                ... e mais {importLogs.length - 10} resultados
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductRepositoryCSVImporter;