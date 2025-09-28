import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoogleAdsProductTab } from './GoogleAdsProductTab';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAdsCampaignConfig } from '@/types/google-ads';

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
  benefits?: string[];
  features?: string[];
  sales_pitch?: string;
  technical_videos?: any[];
  testimonial_videos?: any[];
  youtube_videos?: any[];
  instagram_videos?: any[];
  product_url?: string;
}

interface ProductGoogleAdsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export function ProductGoogleAdsModal({
  open,
  onOpenChange,
  product
}: ProductGoogleAdsModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfigUpdate = async (config: GoogleAdsCampaignConfig) => {
    if (!config.enabled) return;

    setIsLoading(true);
    try {
      // Save product campaign configuration
      const { error } = await supabase
        .from('google_ads_campaigns')
        .upsert({
          product_id: product.id,
          campaign_type: 'product',
          config: config as any
        });

      if (error) {
        console.error('Error saving product campaign:', error);
      }
    } catch (error) {
      console.error('Error updating campaign config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Google Ads Campaign - {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <GoogleAdsProductTab
            product={product}
            onUpdate={handleConfigUpdate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}