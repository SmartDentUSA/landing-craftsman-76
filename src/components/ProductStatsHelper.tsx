import { calculateProductScore } from './ProductScoreCalculator';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
  sales_pitch?: string;
  use_in_ai_generation: boolean;
  approved: boolean;
  keywords?: string[];
  benefits?: string[];
  features?: string[];
  target_audience?: string[];
  search_intent_keywords?: string[];
  market_keywords?: string[];
  tags?: string[];
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
}

export const calculateProductStats = (products: Product[]) => {
  const stats = {
    complete: 0,
    good: 0,
    regular: 0,
    critical: 0,
    total: products.length
  };

  products.forEach(product => {
    const score = calculateProductScore(product);
    
    if (score.percentage >= 90) {
      stats.complete++;
    } else if (score.percentage >= 70) {
      stats.good++;
    } else if (score.percentage >= 50) {
      stats.regular++;
    } else {
      stats.critical++;
    }
  });

  return stats;
};