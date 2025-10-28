import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, CheckCircle, Zap, Edit, Save, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ContentViewToggle } from '@/components/ui/content-view-toggle';
import { useLinksRepository } from '@/hooks/useLinksRepository';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'text' | 'html'>('edit');
  const { toast } = useToast();
  const { allLinks, isLoading: linksLoading } = useLinksRepository();

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

  const saveToDatabase = async () => {
    setIsSaving(true);
    try {
      const { data: product, error: fetchError } = await supabase
        .from('products_repository')
        .select('whatsapp_messages')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      const whatsappData = product?.whatsapp_messages as any;
      const currentMessages = whatsappData?.messages || [];
      const updatedMessages = [
        {
          id: crypto.randomUUID(),
          content: message,
          generated_at: new Date().toISOString(),
          type: 'promo',
          editable: true
        },
        ...currentMessages
      ];

      const { error: updateError } = await supabase
        .from('products_repository')
        .update({ 
          whatsapp_messages: { 
            messages: updatedMessages,
            last_generated: new Date().toISOString()
          }
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      toast({
        title: 'Salvo!',
        description: 'Mensagem promocional salva no banco de dados',
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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

  const copyHTMLVersion = async () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promoção WhatsApp - ${productName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f0f0f0;
    }
    .whatsapp-container {
      background: #25d366;
      border-radius: 15px;
      padding: 20px;
      color: white;
    }
    .whatsapp-message {
      background: #dcf8c6;
      color: #000;
      padding: 15px;
      border-radius: 12px;
      white-space: pre-wrap;
      font-size: 16px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="whatsapp-container">
    <div class="whatsapp-message">${message}</div>
  </div>
</body>
</html>`;

    try {
      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: 'HTML Copiado!',
        description: 'Versão HTML da mensagem copiada',
      });
    } catch (error) {
      console.error('Erro ao copiar HTML:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o HTML',
        variant: 'destructive',
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
          <div className="space-y-3">
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
              <ContentViewToggle mode={viewMode} onModeChange={setViewMode} />
            </div>

            {/* Modo Editar */}
            {viewMode === 'edit' && (
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
            )}

            {/* Modo Texto */}
            {viewMode === 'text' && (
              <div className="min-h-[400px] w-full rounded-md border border-input bg-muted px-3 py-2">
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {message || 'Nenhuma mensagem gerada ainda'}
                </div>
              </div>
            )}

            {/* Modo HTML */}
            {viewMode === 'html' && (
              <div className="min-h-[400px] w-full rounded-md border border-input bg-background p-4">
                <div className="max-w-[600px] mx-auto">
                  <div className="bg-[#25d366] rounded-2xl p-5">
                    <div className="bg-[#dcf8c6] text-black p-4 rounded-xl whitespace-pre-wrap font-sans text-base leading-relaxed shadow-md">
                      {message || 'Nenhuma mensagem gerada ainda'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Edit className="h-3 w-3" />
                {message.length} caracteres
              </p>
              {viewMode === 'edit' && (
                <Button
                  onClick={saveToDatabase}
                  disabled={isSaving || !message}
                  size="sm"
                  variant="outline"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar no Banco
                </Button>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
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
                  Copiar Texto
                </>
              )}
            </Button>

            <Button
              onClick={copyHTMLVersion}
              disabled={!message || isGenerating}
              variant="outline"
              className="flex-1"
            >
              <Code className="h-4 w-4 mr-2" />
              Copiar HTML
            </Button>
            
            <Button
              onClick={generatePromoMessage}
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Nova
                </>
              )}
            </Button>
          </div>

          {/* Seção de Links Disponíveis */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="text-sm font-semibold mb-2">Links Disponíveis</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Use estes links para personalizar suas mensagens promocionais.
            </p>
            
            {linksLoading ? (
              <div className="text-xs text-muted-foreground">Carregando links...</div>
            ) : allLinks.length > 0 ? (
              <ScrollArea className="h-24 w-full border rounded-md p-2 bg-background">
                <div className="space-y-1.5">
                  {allLinks.map((link) => (
                    <div key={link.id} className="text-xs border-b pb-1.5 last:border-0">
                      <div className="font-medium">{link.name}</div>
                      <div className="text-muted-foreground break-all text-[10px]">{link.url}</div>
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {link.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-xs text-muted-foreground">
                Nenhum link disponível. Configure links no repositório.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
