import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Percent, Tag, CheckCircle, XCircle } from 'lucide-react';
import { useCoupons } from '@/hooks/useCoupons';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function CouponsManager() {
  const { coupons, loading, createCoupon, updateCoupon, deleteCoupon, refetch } = useCoupons();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [allowPromotions, setAllowPromotions] = useState(true);

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, price, category, subcategory')
        .eq('approved', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!selectedProductId || !couponCode || discountPercentage <= 0) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos corretamente',
      });
      return;
    }

    await createCoupon(selectedProductId, couponCode, discountPercentage, allowPromotions);
    
    // Reset form
    setSelectedProductId('');
    setCouponCode('');
    setDiscountPercentage(10);
    setAllowPromotions(true);
  };

  const handleTogglePromotion = async (coupon: any) => {
    await updateCoupon(
      coupon.id,
      coupon.coupon_code,
      coupon.discount_percentage,
      !coupon.allow_promotions
    );
  };

  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product?.name || 'Produto não encontrado';
  };

  const getAvailableProducts = () => {
    const usedProductIds = coupons.map((c) => c.product_id);
    return products.filter((p) => !usedProductIds.includes(p.id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gerenciador de Cupons Promocionais
          </CardTitle>
          <CardDescription>
            Configure cupons de desconto para produtos e habilite mensagens promocionais no WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulário de Criação */}
          <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold text-sm">Criar Novo Cupom</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="product-select">Produto</Label>
              <select
                id="product-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={loadingProducts}
              >
                <option value="">Selecione um produto...</option>
                {getAvailableProducts().map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.category}/{product.subcategory}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-code">Código do Cupom</Label>
                <Input
                  id="coupon-code"
                  placeholder="ex: PROMO10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow-promotions"
                checked={allowPromotions}
                onCheckedChange={(checked) => setAllowPromotions(checked as boolean)}
              />
              <Label htmlFor="allow-promotions" className="cursor-pointer">
                Liberar para promoções WhatsApp
              </Label>
            </div>

            <Button onClick={handleCreateCoupon} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Cupom
            </Button>
          </div>

          {/* Lista de Cupons */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Cupons Cadastrados ({coupons.length})</h3>
            
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando cupons...</p>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado ainda</p>
            ) : (
              <div className="space-y-2">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {coupon.coupon_code}
                        </Badge>
                        <Badge variant="outline">
                          <Percent className="h-3 w-3 mr-1" />
                          {coupon.discount_percentage}% OFF
                        </Badge>
                        {coupon.allow_promotions ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Promo ON
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Promo OFF
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getProductName(coupon.product_id)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={coupon.allow_promotions ? 'outline' : 'default'}
                        onClick={() => handleTogglePromotion(coupon)}
                      >
                        {coupon.allow_promotions ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCoupon(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
