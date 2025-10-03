import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, CheckCircle, Zap, Edit } from 'lucide-react';
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
  const [originalMessage, setOriginalMessage] = useState('');
  const [isEdited, setIsEdited] = useState(false);
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

  const fetchBestTestimonial = async (productCategory: string, productName: string) => {
    try {
      const { data: testimonials, error } = await supabase
        .from('video_testimonials')
        .select('*')
        .eq('approved', true)
        .order('sentiment_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      if (!testimonials || testimonials.length === 0) return null;

      // Prioridade 1: Depoimento que menciona o nome do produto
      const nameMatch = testimonials.find(t => 
        t.testimonial_text?.toLowerCase().includes(productName.toLowerCase())
      );
      if (nameMatch) return nameMatch;

      // Prioridade 2: Depoimento da mesma categoria (via landing_page_id)
      const categoryMatch = testimonials.find(t => {
        // Aqui assumimos que landing_page_id pode conter a categoria
        return t.landing_page_id?.toLowerCase().includes(productCategory?.toLowerCase());
      });
      if (categoryMatch) return categoryMatch;

      // Prioridade 3: Melhor sentiment_score geral
      return testimonials[0];
    } catch (error) {
      console.error('Error fetching testimonial:', error);
      return null;
    }
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

      // Buscar melhor depoimento real
      const testimonial = await fetchBestTestimonial(product.category, product.name);

      // Template manual otimizado
      let promoText = `🔥 OFERTA RELÂMPAGO! 🔥\n\n`;
      promoText += `${productName}\n\n`;
      promoText += `~${formatCurrency(originalPrice)}~\n`;
      promoText += `Por apenas: *${formatCurrency(finalPrice)}*\n`;
      promoText += `💰 Economia de ${discountPercentage}% OFF\n\n`;
      promoText += `Use o cupom: *${couponCode}*\n\n`;

      // Seção de Prova Social (se houver depoimento real)
      if (testimonial) {
        const testimonialText = testimonial.testimonial_text?.slice(0, 150) || '';
        const location = testimonial.location || '';
        const state = testimonial.state || '';
        const profession = testimonial.profession || testimonial.specialty || '';
        
        promoText += `⭐ PROVA SOCIAL:\n`;
        promoText += `"${testimonialText}${testimonialText.length === 150 ? '...' : ''}"\n\n`;
        
        let attribution = `- ${testimonial.client_name}`;
        if (profession) attribution += `, ${profession}`;
        if (location && state) attribution += ` - ${location}, ${state}`;
        else if (location) attribution += ` - ${location}`;
        else if (state) attribution += ` - ${state}`;
        
        promoText += `${attribution}\n`;
        
        if (testimonial.youtube_url) {
          promoText += `🎥 Assista ao depoimento completo: ${testimonial.youtube_url}\n`;
        }
        promoText += `\n`;
      }

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
      setOriginalMessage(promoText);
      setIsEdited(false);

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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                Mensagem Gerada
                {isEdited && (
                  <Badge variant="secondary" className="text-xs">
                    <Edit className="h-3 w-3 mr-1" />
                    Editada
                  </Badge>
                )}
              </label>
            </div>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setIsEdited(e.target.value !== originalMessage);
              }}
              className="min-h-[400px] font-mono text-sm focus:ring-2 focus:ring-primary"
              placeholder={isGenerating ? 'Gerando mensagem...' : 'A mensagem aparecerá aqui'}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Edit className="h-3 w-3" />
              {message.length} caracteres • Edite a mensagem livremente antes de copiar
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
