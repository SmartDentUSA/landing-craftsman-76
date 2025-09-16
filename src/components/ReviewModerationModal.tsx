import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Star, Check, X, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RawReview {
  id: string;
  place_id: string;
  author_name: string;
  rating: number;
  review_text: string;
  review_date: string;
  relative_time: string;
  profile_photo_url: string;
  approved_reviews?: any[];
}

interface ApprovedReview {
  id: string;
  display_order: number;
  notes: string;
  raw_reviews: {
    author_name: string;
    rating: number;
    review_text: string;
    review_date: string;
  };
}

interface ReviewModerationModalProps {
  placeId: string;
  landingPageId: string;
  children: React.ReactNode;
}

export const ReviewModerationModal: React.FC<ReviewModerationModalProps> = ({
  placeId,
  landingPageId,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<RawReview[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<ApprovedReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'schema'>('pending');
  const [schema, setSchema] = useState<any>(null);
  const { toast } = useToast();

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('moderate-reviews', {
        body: { action: 'get_pending', place_id: placeId }
      });

      if (error) throw error;

      if (data.success) {
        setPendingReviews(data.data || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading pending reviews:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar reviews pendentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedReviews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-reviews', {
        body: { action: 'get_approved', landing_page_id: landingPageId }
      });

      if (error) throw error;

      if (data.success) {
        setApprovedReviews(data.data || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading approved reviews:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar reviews aprovadas",
        variant: "destructive"
      });
    }
  };

  const generateSchema = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-reviews', {
        body: { action: 'generate_schema', landing_page_id: landingPageId }
      });

      if (error) throw error;

      if (data.success) {
        setSchema(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating schema:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar schema",
        variant: "destructive"
      });
    }
  };

  const approveReview = async (reviewId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-reviews', {
        body: {
          action: 'approve',
          review_id: reviewId,
          landing_page_id: landingPageId,
          display_order: approvedReviews.length
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Review aprovada com sucesso",
        });
        
        // Refresh lists
        loadPendingReviews();
        loadApprovedReviews();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error approving review:', error);
      toast({
        title: "Erro",
        description: "Falha ao aprovar review",
        variant: "destructive"
      });
    }
  };

  const rejectReview = async (reviewId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-reviews', {
        body: { action: 'reject', review_id: reviewId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Review rejeitada",
        });
        
        // Remove from pending list
        setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
      toast({
        title: "Erro",
        description: "Falha ao rejeitar review",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  useEffect(() => {
    if (isOpen) {
      loadPendingReviews();
      loadApprovedReviews();
    }
  }, [isOpen, placeId, landingPageId]);

  useEffect(() => {
    if (activeTab === 'schema') {
      generateSchema();
    }
  }, [activeTab, landingPageId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Moderação de Reviews</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex space-x-1 border-b">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pending')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            Pendentes ({pendingReviews.length})
          </Button>
          <Button
            variant={activeTab === 'approved' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('approved')}
            className="rounded-none"
          >
            Aprovadas ({approvedReviews.length})
          </Button>
          <Button
            variant={activeTab === 'schema' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('schema')}
            className="rounded-none"
          >
            Schema JSON-LD
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Pending Reviews Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">Carregando reviews...</div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma review pendente encontrada
                </div>
              ) : (
                pendingReviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{review.author_name}</span>
                        <div className="flex">{renderStars(review.rating)}</div>
                        <Badge variant="outline">{review.relative_time}</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => approveReview(review.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectReview(review.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground">{review.review_text}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Approved Reviews Tab */}
          {activeTab === 'approved' && (
            <div className="space-y-4">
              {approvedReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma review aprovada ainda
                </div>
              ) : (
                approvedReviews.map((approved, index) => (
                  <div key={approved.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">#{index + 1}</Badge>
                        <span className="font-medium">{approved.raw_reviews.author_name}</span>
                        <div className="flex">{renderStars(approved.raw_reviews.rating)}</div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Aprovada
                      </Badge>
                    </div>
                    {approved.raw_reviews.review_text && (
                      <p className="text-sm text-muted-foreground">{approved.raw_reviews.review_text}</p>
                    )}
                    {approved.notes && (
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        Nota: {approved.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Schema Tab */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              {schema ? (
                <div>
                  {schema.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{schema.stats.avgRating}</div>
                        <div className="text-sm text-blue-600">Avaliação Média</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{schema.stats.totalReviews}</div>
                        <div className="text-sm text-green-600">Total de Reviews</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {schema.stats.ratingsDistribution[5]}
                        </div>
                        <div className="text-sm text-yellow-600">5 Estrelas</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {schema.stats.ratingsDistribution[4]}
                        </div>
                        <div className="text-sm text-purple-600">4 Estrelas</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Schema JSON-LD Gerado</h3>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(schema.schema, null, 2));
                        toast({
                          title: "Copiado!",
                          description: "Schema copiado para área de transferência",
                        });
                      }}
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Copiar Schema
                    </Button>
                  </div>

                  <Textarea
                    value={JSON.stringify(schema.schema, null, 2)}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando schema...
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};