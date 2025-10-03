import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppPromoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productPrice: number;
  discountPercentage: number;
  couponCode: string;
}

export function WhatsAppPromoGenerator({
  isOpen,
  onClose,
  productId,
  productName,
  productPrice,
  discountPercentage,
  couponCode,
}: WhatsAppPromoGeneratorProps) {
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const originalPrice = productPrice;
  const discountAmount = (originalPrice * discountPercentage) / 100;
  const finalPrice = originalPrice - discountAmount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

      if (productError) throw productError;

      const benefits = Array.isArray(product.benefits) ? product.benefits.slice(0, 10) : [];
      const productUrl = product.product_url || '';

      // Template manual otimizado
      let promoText = `🔥 OFERTA RELÂMPAGO! 🔥\n\n`;
      promoText += `${productName}\n\n`;
      promoText += `~${formatCurrency(originalPrice)}~\n`;
      promoText += `Por apenas: *${formatCurrency(finalPrice)}*\n`;
      promoText += `💰 Economia de ${discountPercentage}% OFF\n\n`;
      promoText += `Use o cupom: *${couponCode}*\n\n`;

      if (benefits.length > 0) {
        promoText += `✅ PRINCIPAIS BENEFÍCIOS:\n`;
        benefits.forEach((benefit: string) => {
          promoText += `• ${benefit}\n`;
        });
        promoText += `\n`;
      }

      if (productUrl) {
        promoText += `👉 Garanta o seu: ${productUrl}\n\n`;
      }

      promoText += `📦 Válido enquanto durar o estoque dos itens liberados para promoção!\n\n`;
      promoText += `#SmartDent #${product.category?.replace(/\s+/g, '') || 'Produtos'}`;

      setMessage(promoText);

      toast({
        title: 'Mensagem gerada!',
        description: 'Mensagem promocional criada com sucesso',
      });
    } catch (error) {
      console.error('Error generating promo message:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar mensagem',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Mensagem copiada para a área de transferência',
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a mensagem',
      });
    }
  };

  React.useEffect(() => {
    if (isOpen && !message) {
      generatePromoMessage();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Mensagem Promocional WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do Cupom */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Produto:</span>
              <span className="text-sm">{productName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cupom:</span>
              <Badge variant="secondary" className="font-mono">
                {couponCode}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Desconto:</span>
              <Badge variant="outline">{discountPercentage}% OFF</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Preço Original:</span>
              <span className="text-sm line-through text-muted-foreground">
                {formatCurrency(originalPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Preço Final:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(finalPrice)}
              </span>
            </div>
          </div>

          {/* Mensagem Gerada */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem Gerada</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder={isGenerating ? 'Gerando mensagem...' : 'A mensagem aparecerá aqui'}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              {message.length} caracteres • Você pode editar a mensagem antes de copiar
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Button
              onClick={generatePromoMessage}
              disabled={isGenerating}
              variant="outline"
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Nova Mensagem
                </>
              )}
            </Button>

            <Button
              onClick={copyToClipboard}
              disabled={!message || isGenerating}
              className="flex-1"
            >
              {isCopied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mensagem
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
