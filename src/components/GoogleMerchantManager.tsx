import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Download, RefreshCw, ExternalLink, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const GoogleMerchantManager = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedStats, setFeedStats] = useState<any>(null);
  const { toast } = useToast();

  const generateFeed = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-merchant-feed');
      
      if (error) throw error;

      // Criar blob e download
      const blob = new Blob([data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'google-merchant-feed.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Feed XML gerado com sucesso!",
        description: "O arquivo foi baixado automaticamente.",
      });

      // Buscar estatísticas dos produtos
      await fetchFeedStats();

    } catch (error) {
      console.error('Erro ao gerar feed:', error);
      toast({
        title: "Erro ao gerar feed",
        description: "Verifique se existem produtos aprovados no repositório.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchFeedStats = async () => {
    try {
      // Buscar produtos aprovados com campos SEO
      const { data: products } = await supabase
        .from('products_repository')
        .select(`
          id, name, price, image_url, gtin, mpn, brand, 
          google_product_category, condition, availability, 
          seo_enhanced
        `)
        .eq('approved', true);

      const { data: company } = await supabase
        .from('company_profile')
        .select('company_name, website_url')
        .single();

      // ✨ ESTATÍSTICAS GOOGLE MERCHANT COMPLETAS
      const seoEnhancedProducts = products?.filter(p => p.seo_enhanced) || [];
      const productsWithGTIN = products?.filter(p => p.gtin) || [];
      const productsWithBrand = products?.filter(p => p.brand) || [];
      const productsWithMPN = products?.filter(p => p.mpn) || [];

      setFeedStats({
        totalProducts: products?.length || 0,
        productsWithImages: products?.filter(p => p.image_url).length || 0,
        productsWithPrices: products?.filter(p => p.price).length || 0,
        // ✨ NOVAS ESTATÍSTICAS SEO
        seoEnhancedProducts: seoEnhancedProducts.length,
        productsWithGTIN: productsWithGTIN.length,
        productsWithBrand: productsWithBrand.length,
        productsWithMPN: productsWithMPN.length,
        seoCompletionRate: products?.length ? Math.round((seoEnhancedProducts.length / products.length) * 100) : 0,
        companyName: company?.company_name || 'Não configurado',
        websiteUrl: company?.website_url || 'Não configurado'
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const openGoogleMerchantCenter = () => {
    window.open('https://merchants.google.com/', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Google Merchant Center</h2>
          <p className="text-muted-foreground">
            Gerencie seu feed de produtos para Google Shopping
          </p>
        </div>
        <Button onClick={openGoogleMerchantCenter} variant="outline">
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir Merchant Center
        </Button>
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="feed">Feed XML</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="help">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Gerar Feed XML
              </CardTitle>
              <CardDescription>
                Gere um feed XML compatível com Google Merchant Center contendo todos os produtos aprovados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  O feed será gerado com base nos produtos aprovados no repositório. 
                  Certifique-se de que os produtos tenham preços e imagens configurados.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button 
                  onClick={generateFeed} 
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isGenerating ? 'Gerando...' : 'Gerar e Baixar Feed XML'}
                </Button>

                <Button 
                  onClick={fetchFeedStats} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar Estatísticas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas do Feed</CardTitle>
              <CardDescription>
                Informações sobre os produtos que serão incluídos no feed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{feedStats.totalProducts}</div>
                      <div className="text-sm text-muted-foreground">Produtos Aprovados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{feedStats.productsWithImages}</div>
                      <div className="text-sm text-muted-foreground">Com Imagens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{feedStats.productsWithPrices}</div>
                      <div className="text-sm text-muted-foreground">Com Preços</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{feedStats.seoCompletionRate}%</div>
                      <div className="text-sm text-muted-foreground">SEO Completo</div>
                    </div>
                  </div>

                  {/* ✨ ESTATÍSTICAS GOOGLE MERCHANT */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Otimização Google Merchant
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-emerald-600">{feedStats.seoEnhancedProducts}</div>
                        <div className="text-xs text-gray-600">SEO Aprimorado</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-indigo-600">{feedStats.productsWithGTIN}</div>
                        <div className="text-xs text-gray-600">Com GTIN</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-pink-600">{feedStats.productsWithBrand}</div>
                        <div className="text-xs text-gray-600">Com Marca</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-teal-600">{feedStats.productsWithMPN}</div>
                        <div className="text-xs text-gray-600">Com MPN</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Clique em "Atualizar Estatísticas" para ver os dados</p>
                </div>
              )}
            </CardContent>
          </Card>

          {feedStats && (
            <Card>
              <CardHeader>
                <CardTitle>Configuração da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome da Empresa:</span>
                  <span className="font-medium">{feedStats.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Website:</span>
                  <span className="font-medium">{feedStats.websiteUrl}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Como Configurar no Google Merchant Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">1</Badge>
                  Acesse o Google Merchant Center
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                  Acesse <a href="https://merchants.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">merchants.google.com</a> e faça login com sua conta Google.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">2</Badge>
                  Configure seu Feed
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                  Vá em "Produtos" → "Feeds" → "Adicionar feed" e configure um feed programado.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">3</Badge>
                  Upload do Arquivo XML
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                  Faça upload do arquivo XML gerado ou configure uma URL para busca automática.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">4</Badge>
                  Verificação e Aprovação
                </h3>
                <p className="text-sm text-muted-foreground ml-8">
                  Aguarde a verificação dos produtos. Corrija eventuais erros reportados pelo Merchant Center.
                </p>
              </div>

              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Dica:</strong> Mantenha os dados dos produtos sempre atualizados no repositório. 
                  Regenere o feed periodicamente para manter as informações sincronizadas.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campos Incluídos no Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Campos Obrigatórios:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• ID do produto</li>
                    <li>• Título</li>
                    <li>• Descrição</li>
                    <li>• Link do produto</li>
                    <li>• Link da imagem</li>
                    <li>• Disponibilidade</li>
                    <li>• Preço</li>
                    <li>• Marca</li>
                    <li>• Condição</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campos SEO Automáticos:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• GTIN/EAN (extraído automaticamente)</li>
                    <li>• MPN/SKU (extraído automaticamente)</li>
                    <li>• Marca (extraída automaticamente)</li>
                    <li>• Cor (extraída automaticamente)</li>
                    <li>• Tamanho (extraído automaticamente)</li>
                    <li>• Material (extraído automaticamente)</li>
                    <li>• Categoria Google (mapeada automaticamente)</li>
                    <li>• Condição e Disponibilidade (detectadas automaticamente)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};