import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, Sparkles, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
  individual_blog_content?: {
    commercial?: string;
    technical?: string;
    generated_at?: string;
  };
}

interface ProductBlogGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onBlogGenerated: () => void;
}

export const ProductBlogGeneratorModal = ({
  open,
  onOpenChange,
  product,
  onBlogGenerated
}: ProductBlogGeneratorModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<'commercial' | 'technical'>('commercial');
  const { toast } = useToast();

  const hasExistingBlog = (type: 'commercial' | 'technical') => {
    return product.individual_blog_content?.[type] != null;
  };

  const getLastGenerated = () => {
    if (product.individual_blog_content?.generated_at) {
      return new Date(product.individual_blog_content.generated_at).toLocaleString('pt-BR');
    }
    return null;
  };

  const handleGenerateBlog = async () => {
    if (!product.id) return;

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-product-blog', {
        body: {
          productId: product.id,
          blogType: selectedType
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Blog gerado com sucesso!",
        description: `Blog ${selectedType} criado para ${product.name}`,
      });

      onBlogGenerated();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao gerar blog:', error);
      toast({
        title: "Erro ao gerar blog",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const blogTypeConfig = {
    commercial: {
      title: "Blog Comercial",
      description: "Foco em vendas, benefícios e call-to-actions",
      color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
      icon: <Sparkles className="h-4 w-4" />
    },
    technical: {
      title: "Blog Técnico", 
      description: "Foco em especificações, funcionamento e aplicações",
      color: "bg-blue-500/10 text-blue-700 border-blue-200",
      icon: <Settings className="h-4 w-4" />
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Blog IA - {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informação sobre configuração de dados */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                Os dados utilizados na geração são configurados na aba <strong>"Prompts IA"</strong>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Tipo de Blog */}
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as 'commercial' | 'technical')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="commercial" className="flex items-center gap-2">
                {blogTypeConfig.commercial.icon}
                Blog Comercial
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                {blogTypeConfig.technical.icon}
                Blog Técnico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="commercial" className="space-y-4">
              <Card className={blogTypeConfig.commercial.color}>
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2">{blogTypeConfig.commercial.title}</h3>
                  <p className="text-sm mb-3">{blogTypeConfig.commercial.description}</p>
                  <div className="text-xs">
                    <strong>Variáveis utilizadas:</strong> Nome, benefícios, keywords, CTAs, preço
                  </div>
                  {hasExistingBlog('commercial') && (
                    <Badge variant="outline" className="mt-2">
                      ✓ Blog já existe
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <Card className={blogTypeConfig.technical.color}>
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2">{blogTypeConfig.technical.title}</h3>
                  <p className="text-sm mb-3">{blogTypeConfig.technical.description}</p>
                  <div className="text-xs">
                    <strong>Variáveis utilizadas:</strong> Nome, características, especificações, categoria
                  </div>
                  {hasExistingBlog('technical') && (
                    <Badge variant="outline" className="mt-2">
                      ✓ Blog já existe
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Status dos Blogs Existentes */}
          {getLastGenerated() && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Última geração: {getLastGenerated()}
                </div>
                <div className="flex gap-2 mt-2">
                  {hasExistingBlog('commercial') && (
                    <Badge variant="outline" className="text-xs">Blog Comercial ✓</Badge>
                  )}
                  {hasExistingBlog('technical') && (
                    <Badge variant="outline" className="text-xs">Blog Técnico ✓</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateBlog}
              disabled={isGenerating}
              className="min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Blog {blogTypeConfig[selectedType].title.split(' ')[1]}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};