import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";

interface SystemStatus {
  products: {
    total: number;
    withVideos: number;
    withBenefits: number;
    withKeywords: number;
    withFeatures: number;
    aiGenerated: number;
  };
  videos: {
    totalYouTube: number;
    totalInstagram: number;
    withCaptions: number;
  };
  reviews: {
    approved: number;
    manual: number;
  };
  testimonials: {
    total: number;
    approved: number;
  };
  blogPosts: {
    total: number;
    published: number;
  };
}

export function SystemDataStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {
      // Get products data
      const { data: products } = await supabase
        .from('products_repository')
        .select('youtube_videos, instagram_videos, benefits, keywords, features, ai_generated_benefits, ai_generated_keywords, video_captions')
        .eq('approved', true);

      // Get reviews data
      const { data: approvedReviews } = await supabase
        .from('approved_reviews')
        .select('id');

      const { data: manualReviews } = await supabase
        .from('manual_reviews')
        .select('id')
        .eq('approved', true);

      // Get testimonials data
      const { data: testimonials } = await supabase
        .from('video_testimonials')
        .select('id, approved');

      // Get blog posts data
      const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('id, status');

      // Calculate statistics
      const productsStats = {
        total: products?.length || 0,
        withVideos: products?.filter(p => 
          (Array.isArray(p.youtube_videos) && p.youtube_videos.length > 0) || 
          (Array.isArray(p.instagram_videos) && p.instagram_videos.length > 0)
        ).length || 0,
        withBenefits: products?.filter(p => Array.isArray(p.benefits) && p.benefits.length > 0).length || 0,
        withKeywords: products?.filter(p => Array.isArray(p.keywords) && p.keywords.length > 0).length || 0,
        withFeatures: products?.filter(p => Array.isArray(p.features) && p.features.length > 0).length || 0,
        aiGenerated: products?.filter(p => p.ai_generated_benefits || p.ai_generated_keywords).length || 0,
      };

      const videosStats = {
        totalYouTube: products?.reduce((acc, p) => acc + (Array.isArray(p.youtube_videos) ? p.youtube_videos.length : 0), 0) || 0,
        totalInstagram: products?.reduce((acc, p) => acc + (Array.isArray(p.instagram_videos) ? p.instagram_videos.length : 0), 0) || 0,
        withCaptions: products?.filter(p => p.video_captions && typeof p.video_captions === 'object' && Object.keys(p.video_captions).length > 0).length || 0,
      };

      const reviewsStats = {
        approved: approvedReviews?.length || 0,
        manual: manualReviews?.length || 0,
      };

      const testimonialsStats = {
        total: testimonials?.length || 0,
        approved: testimonials?.filter(t => t.approved).length || 0,
      };

      const blogPostsStats = {
        total: blogPosts?.length || 0,
        published: blogPosts?.filter(bp => bp.status === 'published').length || 0,
      };

      setStatus({
        products: productsStats,
        videos: videosStats,
        reviews: reviewsStats,
        testimonials: testimonialsStats,
        blogPosts: blogPostsStats,
      });

    } catch (error) {
      console.error('Error loading system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const getStatusIcon = (current: number, total: number, threshold: number = 0.7) => {
    if (total === 0) return <XCircle className="h-4 w-4 text-muted-foreground" />;
    const ratio = current / total;
    if (ratio >= threshold) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (ratio >= 0.3) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getPercentage = (current: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((current / total) * 100)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Carregando status do sistema...</span>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Erro ao carregar status do sistema</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Status do Sistema de Dados
          <Button variant="outline" size="sm" onClick={loadSystemStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Products Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Produtos ({status.products.total})</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Com vídeos:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.products.withVideos, status.products.total)}
                <Badge variant="outline">
                  {status.products.withVideos}/{status.products.total}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Com benefícios:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.products.withBenefits, status.products.total)}
                <Badge variant="outline">
                  {status.products.withBenefits}/{status.products.total}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Com keywords:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.products.withKeywords, status.products.total)}
                <Badge variant="outline">
                  {status.products.withKeywords}/{status.products.total}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>IA gerada:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.products.aiGenerated, status.products.total)}
                <Badge variant="outline">
                  {status.products.aiGenerated}/{status.products.total}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Vídeos</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>YouTube:</span>
              <Badge variant="secondary">{status.videos.totalYouTube}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Instagram:</span>
              <Badge variant="secondary">{status.videos.totalInstagram}</Badge>
            </div>
            <div className="flex items-center justify-between col-span-2">
              <span>Com legendas extraídas:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.videos.withCaptions, status.products.withVideos)}
                <Badge variant="outline">
                  {status.videos.withCaptions}/{status.products.withVideos}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews & Social Proof */}
        <div className="space-y-2">
          <h4 className="font-medium">Prova Social</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Reviews aprovados:</span>
              <Badge variant="secondary">{status.reviews.approved}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Reviews manuais:</span>
              <Badge variant="secondary">{status.reviews.manual}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Depoimentos:</span>
              <Badge variant="secondary">{status.testimonials.approved}/{status.testimonials.total}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Blog posts:</span>
              <Badge variant="secondary">{status.blogPosts.published}/{status.blogPosts.total}</Badge>
            </div>
          </div>
        </div>

        {/* Overall Health Score */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Saúde dos Dados:</span>
            <div className="flex items-center gap-2">
              {(() => {
                const totalChecks = 6;
                let passedChecks = 0;
                
                if (status.products.withVideos / status.products.total >= 0.5) passedChecks++;
                if (status.products.withBenefits / status.products.total >= 0.7) passedChecks++;
                if (status.products.withKeywords / status.products.total >= 0.7) passedChecks++;
                if (status.videos.withCaptions / Math.max(status.products.withVideos, 1) >= 0.3) passedChecks++;
                if (status.reviews.approved + status.reviews.manual >= 5) passedChecks++;
                if (status.testimonials.approved >= 3) passedChecks++;
                
                const healthScore = Math.round((passedChecks / totalChecks) * 100);
                
                return (
                  <>
                    {healthScore >= 70 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : healthScore >= 40 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Badge variant={healthScore >= 70 ? "default" : healthScore >= 40 ? "secondary" : "destructive"}>
                      {healthScore}%
                    </Badge>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}