import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Copy, Check, RefreshCw, MessageSquare, Sparkles, Code, AlignLeft, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductVideosList } from "./ProductVideosList";

interface WhatsAppPromoVariationGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productPrice?: number;
  productPromoPrice?: number;
  productCurrency?: string;
}

export function WhatsAppPromoVariationGenerator({
  isOpen,
  onClose,
  productId,
  productName,
  productPrice,
  productPromoPrice,
  productCurrency = 'BRL'
}: WhatsAppPromoVariationGeneratorProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'text' | 'html'>('edit');
  const [isEdited, setIsEdited] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value?: number) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: productCurrency
    }).format(value);
  };

  const calculateSavings = () => {
    if (!productPrice || !productPromoPrice) return 0;
    return productPrice - productPromoPrice;
  };

  const calculateDiscountPercentage = () => {
    if (!productPrice || !productPromoPrice || productPrice === 0) return 0;
    return Math.round(((productPrice - productPromoPrice) / productPrice) * 100);
  };

  const handleVideoInsert = (text: string) => {
    setMessage(prev => {
      const newMessage = prev ? `${prev}\n\n${text}` : text;
      setIsEdited(true);
      return newMessage;
    });
    toast({
      title: "Vídeo inserido",
      description: "Link do vídeo foi adicionado à mensagem",
    });
  };

  const generatePromoMessage = async () => {
    setIsGenerating(true);
    try {
      // Buscar dados do produto
      const { data: product, error: productError } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Produto não encontrado');
      }

      // Buscar melhor depoimento disponível
      const { data: testimonials } = await supabase
        .from('video_testimonials')
        .select('testimonial_text, client_name, profession, sentiment_score')
        .eq('approved', true)
        .order('sentiment_score', { ascending: false })
        .limit(3);

      const bestTestimonial = testimonials?.[0];
      const savings = calculateSavings();
      const discountPercent = calculateDiscountPercentage();

      // Gerar mensagem usando edge function
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'whatsapp_promo_variation',
          productId,
          priceInfo: {
            price: productPrice,
            promo_price: productPromoPrice,
            savings,
            discount_percent: discountPercent,
            currency: productCurrency
          }
        }
      });

      if (error) throw error;

      setMessage(data.content);
      setIsEdited(false);
      
      toast({
        title: "Mensagem gerada!",
        description: "Mensagem promocional criada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao gerar mensagem:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDatabase = async () => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('whatsapp_messages')
        .eq('id', productId)
        .single();

      const whatsappData = existingData?.whatsapp_messages as any;
      const existingMessages = whatsappData?.messages || [];

      const newMessage = {
        id: crypto.randomUUID(),
        content: message,
        generated_at: new Date().toISOString(),
        editable: true,
        type: 'promo_variation'
      };

      const updatedData = {
        whatsapp_messages: {
          messages: [newMessage, ...existingMessages].slice(0, 10),
          last_generated: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('products_repository')
        .update(updatedData)
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: "Mensagem salva no histórico do produto",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a mensagem",
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para área de transferência",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem",
      });
    }
  };

  const copyHTMLVersion = async () => {
    const htmlVersion = message.replace(/\n/g, '<br>');
    try {
      await navigator.clipboard.writeText(htmlVersion);
      toast({
        title: "HTML Copiado!",
        description: "Versão HTML copiada para área de transferência",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar a versão HTML",
      });
    }
  };

  const renderMessage = () => {
    if (viewMode === 'html') {
      return <div dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br>') }} />;
    }
    return message;
  };

  const savings = calculateSavings();
  const discountPercent = calculateDiscountPercentage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gerador WhatsApp Promo - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da Promoção */}
          <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">De:</p>
                <p className="text-lg font-semibold line-through text-muted-foreground">
                  {formatCurrency(productPrice)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Economia</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(savings)}
                </p>
                <p className="text-xs text-orange-700">
                  {discountPercent}% OFF
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Por:</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(productPromoPrice)}
                </p>
              </div>
            </div>
          </Card>

          {/* Botões de ação */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={generatePromoMessage} 
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Mensagem Promo
                </>
              )}
            </Button>
            
            {message && (
              <>
                <Button onClick={saveToDatabase} variant="outline">
                  Salvar
                </Button>
                <Button onClick={copyToClipboard} variant="outline">
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>

          {/* Abas de visualização */}
          {message && (
            <div className="flex gap-2 border-b">
              <Button
                variant={viewMode === 'edit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('edit')}
              >
                <AlignLeft className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant={viewMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('text')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Texto
              </Button>
              <Button
                variant={viewMode === 'html' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('html')}
              >
                <Code className="h-4 w-4 mr-2" />
                HTML
              </Button>
            </div>
          )}

          {/* Editor/Visualizador */}
          {message && (
            <div className="space-y-2">
              {viewMode === 'edit' ? (
                <Textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setIsEdited(true);
                  }}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="A mensagem aparecerá aqui..."
                />
              ) : (
                <Card className="p-4 min-h-[300px] whitespace-pre-wrap font-sans">
                  {renderMessage()}
                </Card>
              )}
              {isEdited && (
                <p className="text-xs text-amber-600">
                  ⚠️ Mensagem editada manualmente - salve para preservar as alterações
                </p>
              )}
            </div>
          )}

          {/* Biblioteca de Vídeos */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Video className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Biblioteca de Vídeos do Produto</h3>
            </div>
            <ProductVideosList 
              productId={productId}
              onInsert={handleVideoInsert}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
