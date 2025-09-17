import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Upload, Globe, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageDebugPreview } from '@/components/ImageDebugPreview';
import Papa from 'papaparse';

interface ProductData {
  name: string;
  price: string;
  description: string;
  image?: string;
  available?: boolean;
  youtube_url?: string;
  instagram_url?: string;
}

interface ParsedProduct {
  url: string;
  youtube_url?: string;
  instagram_url?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  data?: ProductData;
  error?: string;
}

interface ProductCSVUploaderProps {
  onProductsUpdate: (products: Array<{
    name: string;
    description: string;
    price: string;
    currency: string;
    availability: string;
    valid_through: string;
    productUrl: string;
    youtube_url?: string;
    instagram_url?: string;
    sourceType: 'imported';
    lastUpdated: string;
  }>) => void;
}

export const ProductCSVUploader: React.FC<ProductCSVUploaderProps> = ({ onProductsUpdate }) => {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<ParsedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = () => {
    const csvContent = 'Link da oferta loja integrada,Vídeo youtube,Video instagram\nhttps://minhaloja.lojaintegrada.com.br/produto/produto-exemplo-1,https://www.youtube.com/watch?v=exemplo1,https://www.instagram.com/p/exemplo1\nhttps://minhaloja.lojaintegrada.com.br/produto/produto-exemplo-2,https://www.youtube.com/watch?v=exemplo2,\nhttps://minhaloja.lojaintegrada.com.br/produto/produto-exemplo-3,,https://www.instagram.com/p/exemplo3';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-produtos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (csvText: string): ParsedProduct[] => {
    try {
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ','
      });

      if (parsed.errors && parsed.errors.length > 0) {
        console.warn('Avisos do CSV:', parsed.errors);
      }

      const products: ParsedProduct[] = [];
      
      if (parsed.data) {
        parsed.data.forEach((row: Record<string, string>, index: number) => {
        const urlFields = ['Link da oferta loja integrada', 'URL do Produto', 'url_produto', 'url', 'link', 'product_url'];
        const youtubeFields = ['Vídeo youtube', 'youtube', 'youtube_url', 'video_youtube'];
        const instagramFields = ['Video instagram', 'instagram', 'instagram_url', 'video_instagram'];
        
        let productUrl = '';
        let youtubeUrl = '';
        let instagramUrl = '';
        
        // Buscar URL do produto em diferentes campos possíveis
        for (const field of urlFields) {
          if (row[field] && typeof row[field] === 'string') {
            productUrl = row[field].trim();
            break;
          }
        }

        // Buscar URL do YouTube
        for (const field of youtubeFields) {
          if (row[field] && typeof row[field] === 'string') {
            youtubeUrl = row[field].trim();
            break;
          }
        }

        // Buscar URL do Instagram
        for (const field of instagramFields) {
          if (row[field] && typeof row[field] === 'string') {
            instagramUrl = row[field].trim();
            break;
          }
        }

        // Tentar primeira coluna se não encontrar campo nomeado
        if (!productUrl && typeof row[Object.keys(row)[0]] === 'string') {
          productUrl = row[Object.keys(row)[0]].trim();
        }

        if (productUrl) {
          // Validar se é uma URL válida
          try {
            new URL(productUrl);
            const product: ParsedProduct = {
              url: productUrl,
              status: 'pending'
            };
            
            // Adicionar URLs de vídeo se válidas
            if (youtubeUrl) {
              try {
                new URL(youtubeUrl);
                product.youtube_url = youtubeUrl;
              } catch {
                console.warn(`URL do YouTube inválida na linha ${index + 2}:`, youtubeUrl);
              }
            }
            
            if (instagramUrl) {
              try {
                new URL(instagramUrl);
                product.instagram_url = instagramUrl;
              } catch {
                console.warn(`URL do Instagram inválida na linha ${index + 2}:`, instagramUrl);
              }
            }
            
            products.push(product);
          } catch {
            console.warn(`URL inválida na linha ${index + 2}:`, productUrl);
          }
        }
        });
      }

      return products;
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      return [];
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const products = parseCSV(csvText);
        
        if (products.length === 0) {
          toast({
            title: "Nenhum produto encontrado",
            description: "Verifique se o CSV contém URLs válidas na primeira coluna ou em uma coluna 'URL do Produto'",
            variant: "destructive",
          });
          return;
        }

        if (products.length > 50) {
          toast({
            title: "Muitos produtos",
            description: "Por favor, limite a importação a 50 produtos por vez",
            variant: "destructive",
          });
          return;
        }

        setPreviewData(products);
        toast({
          title: "CSV carregado",
          description: `${products.length} produto(s) encontrado(s) para importação`,
        });
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        toast({
          title: "Erro ao processar arquivo",
          description: "Verifique se o arquivo CSV está no formato correto",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const extractAllProducts = async () => {
    if (previewData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const updatedProducts = [...previewData];
    const successfulProducts: any[] = [];

    try {
      for (let i = 0; i < updatedProducts.length; i++) {
        const product = updatedProducts[i];
        
        // Atualizar status para processing
        updatedProducts[i] = { ...product, status: 'processing' };
        setPreviewData([...updatedProducts]);

        try {
          const { data: result, error } = await supabase.functions.invoke('extract-product-data', {
            body: { url: product.url }
          });

          if (error) throw error;

          if (result.success && result.data) {
            const productData = result.data;
            
            updatedProducts[i] = {
              ...product,
              status: 'success',
              data: productData
            };

            // Preparar dados do produto para o formato esperado
            const productForImport: any = {
              name: productData.name || 'Produto Importado',
              description: productData.description || '',
              price: productData.price || '0',
              currency: 'BRL',
              availability: productData.available !== false ? 'InStock' : 'OutOfStock',
              valid_through: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              productUrl: product.url,
              sourceType: 'imported' as const,
              lastUpdated: new Date().toISOString()
            };
            
            // Adicionar URLs de vídeo se disponíveis
            if (product.youtube_url) {
              productForImport.youtube_url = product.youtube_url;
            }
            if (product.instagram_url) {
              productForImport.instagram_url = product.instagram_url;
            }
            
            successfulProducts.push(productForImport);
          } else {
            updatedProducts[i] = {
              ...product,
              status: 'error',
              error: result.error || 'Erro ao extrair dados'
            };
          }
        } catch (error) {
          console.error('Erro ao extrair produto:', error);
          updatedProducts[i] = {
            ...product,
            status: 'error',
            error: 'Erro na requisição'
          };
        }

        // Atualizar preview e progresso
        setPreviewData([...updatedProducts]);
        setProgress(((i + 1) / updatedProducts.length) * 100);

        // Delay para evitar sobrecarga da API
        if (i < updatedProducts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (successfulProducts.length > 0) {
        onProductsUpdate(successfulProducts);
        toast({
          title: "Importação concluída",
          description: `${successfulProducts.length} produto(s) importado(s) com sucesso`,
        });
      } else {
        toast({
          title: "Nenhum produto importado",
          description: "Não foi possível extrair dados de nenhum produto",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const clearPreview = () => {
    setPreviewData([]);
    setProgress(0);
  };

  const getStatusIcon = (status: ParsedProduct['status']) => {
    switch (status) {
      case 'pending':
        return <Globe className="w-4 h-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: ParsedProduct['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Aguardando</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-primary text-primary">Processando</Badge>;
      case 'success':
        return <Badge variant="outline" className="border-success text-success">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importação em Massa de Produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="cursor-pointer"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            disabled={isProcessing}
            className="shrink-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Faça upload de um arquivo CSV com as colunas: "Link da oferta loja integrada", "Vídeo youtube", "Video instagram".
          As colunas de vídeo são opcionais e ajudam a melhorar o SEO dos produtos.
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da importação</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {previewData.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Produtos para Importação ({previewData.length})</h4>
              <div className="flex gap-2">
                {!isProcessing && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearPreview}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpar
                    </Button>
                    <Button
                      type="button"
                      onClick={extractAllProducts}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importar Todos
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-4">
              {previewData.map((product, index) => (
                <div key={index} className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(product.status)}
                    {product.data?.image && (
                      <ImageDebugPreview
                        src={product.data.image}
                        alt={product.data?.name || 'Produto'}
                        size={40}
                        debugLabel={`Pré ${index + 1}`}
                      />
                    )}
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium truncate">
                         {product.data?.name || new URL(product.url).hostname}
                       </div>
                       {product.data && (
                         <div className="text-xs text-muted-foreground line-clamp-2">
                           {product.data.price && `Preço: ${product.data.price}`}
                           {product.data.description && ` • ${product.data.description}`}
                         </div>
                       )}
                       {(product.youtube_url || product.instagram_url) && (
                         <div className="flex gap-2 mt-1">
                           {product.youtube_url && (
                             <Badge variant="outline" className="text-xs">
                               YouTube
                             </Badge>
                           )}
                           {product.instagram_url && (
                             <Badge variant="outline" className="text-xs">
                               Instagram
                             </Badge>
                           )}
                         </div>
                       )}
                       {product.error && (
                         <div className="text-xs text-destructive line-clamp-2">
                           {product.error}
                         </div>
                       )}
                     </div>
                  </div>
                  {getStatusBadge(product.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};